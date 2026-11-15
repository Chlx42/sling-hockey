import { randomBytes, createHash } from 'node:crypto';

/** 游戏专用会话；主 token 不经过此服务。另一个游戏使用相同交接契约。 */
export function createGameAuth({ game, sessionPath, cookiePath = '/',
  exchangeUrl = process.env.NORTHWARD_EXCHANGE_URL,
  secret = process.env.NORTHWARD_GAME_SECRET,
  publicOrigin = process.env.NORTHWARD_GAME_ORIGIN,
  fetchImpl = fetch, now = Date.now,
} = {}) {
  const sessions = new Map();
  const cookieName = `nw_${game.replaceAll('-', '_')}`;
  const enabled = Boolean(exchangeUrl && secret?.length >= 32 && publicOrigin);
  if (enabled && (new URL(exchangeUrl).protocol !== 'https:' || new URL(publicOrigin).protocol !== 'https:' || new URL(publicOrigin).origin !== publicOrigin)) {
    throw new Error('向北账号交接必须使用 HTTPS');
  }
  const digest = value => createHash('sha256').update(value).digest('hex');
  const supplied = headers => (typeof headers?.get === 'function' ? headers.get('cookie') : headers?.cookie)?.split(';').map(s => s.trim())
    .find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  function identity(headers) {
    const token = supplied(headers);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const key = digest(token), session = sessions.get(key);
    if (!session || session.expiresAt <= now()) { sessions.delete(key); return null; }
    return session.user;
  }
  function clear(request, response) {
    const token = supplied(request.headers);
    if (token) sessions.delete(digest(token));
    response.setHeader('Set-Cookie', `${cookieName}=; Path=${cookiePath}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  }
  function write(response, status, body) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(JSON.stringify(body));
  }
  async function handle(request, response, url) {
    if (url.pathname !== sessionPath) return false;
    response.removeHeader('Access-Control-Allow-Origin');
    response.removeHeader('Access-Control-Allow-Credentials');
    if (request.method === 'GET') {
      write(response, 200, { enabled, user: identity(request.headers) }); return true;
    }
    if (request.headers.origin !== publicOrigin || !['POST', 'DELETE'].includes(request.method)) {
      write(response, 403, { message: '请从游戏页面操作' }); return true;
    }
    clear(request, response);
    if (request.method === 'DELETE') { write(response, 200, { user: null }); return true; }
    if (!enabled) { write(response, 503, { message: '游戏账号尚未启用' }); return true; }
    try {
      if (request.headers['content-type']?.split(';')[0] !== 'application/json') throw new Error();
      // Colyseus 会预读取 JSON；普通 Node HTTP 请求仍按流读取并限制大小。
      let body = request.body;
      if (body === undefined) {
        const chunks = []; let length = 0;
        for await (const chunk of request) {
          length += chunk.length;
          if (length > 4096) throw new Error();
          chunks.push(chunk);
        }
        body = JSON.parse(Buffer.concat(chunks));
      }
      if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body)) > 4096) throw new Error();
      const { code, codeVerifier, state } = body;
      if (![code, codeVerifier, state].every(s => typeof s === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(s))) throw new Error();
      const result = await fetchImpl(exchangeUrl, { method: 'POST', redirect: 'error',
        signal: AbortSignal.timeout(5000),
        headers: { 'Content-Type': 'application/json', 'X-Game-Secret': secret },
        body: JSON.stringify({ game, code, codeVerifier, state }) });
      if (!result.ok) throw new Error();
      const reply = await result.json(), user = reply.data;
      if (reply.success !== true || !user || !/^[0-9]+$/.test(user.uid) || typeof user.nickname !== 'string') throw new Error();
      for (const [key, value] of sessions) if (value.expiresAt <= now()) sessions.delete(key);
      if (sessions.size >= 10000) throw new Error();
      const token = randomBytes(32).toString('hex');
      const profile = { uid: user.uid, nickname: user.nickname, avatar: typeof user.avatar === 'string' ? user.avatar : null };
      sessions.set(digest(token), { user: profile, expiresAt: now() + 8 * 60 * 60 * 1000 });
      response.setHeader('Set-Cookie', `${cookieName}=${token}; Path=${cookiePath}; Max-Age=28800; HttpOnly; Secure; SameSite=Lax`);
      write(response, 200, { enabled: true, user: profile });
    } catch {
      write(response, 401, { message: '账号暂不可用，请重新进入游戏' });
    }
    return true;
  }
  return { handle, identity, enabled };
}
