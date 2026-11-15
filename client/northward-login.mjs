const encode = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');

/** 从广场进入时自动完成握手；普通分享链接保留原来的匿名玩法。 */
export async function prepareNorthward(game, sessionPath) {
  try { return await runHandshake(game, sessionPath); }
  catch {
    const notice = document.createElement('div');
    notice.setAttribute('role', 'alert');
    notice.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-content:center;gap:16px;background:#faf7f0;color:#292524;text-align:center;padding:24px;font-family:system-ui';
    const text = document.createElement('p'); text.textContent = '网络不稳定，暂时无法进入游戏';
    const retry = document.createElement('button'); retry.textContent = '重新加载'; retry.onclick = () => location.reload();
    notice.append(text, retry); document.body.append(notice);
    return new Promise(() => {});
  }
}
async function runHandshake(game, sessionPath) {
  const key = `northward-login:${game}`;
  const url = new URL(location.href), fragment = new URLSearchParams(url.hash.slice(1));
  const callback = fragment.has('nw_state');
  if (callback) {
    history.replaceState(null, '', url.pathname + url.search);
    let pending;
    try { pending = JSON.parse(sessionStorage.getItem(key)); } catch {}
    sessionStorage.removeItem(key);
    if (!pending || pending.state !== fragment.get('nw_state') || Date.now() - pending.startedAt > 120000) {
      const cleared = await fetch(sessionPath, { method: 'DELETE', credentials: 'same-origin', redirect: 'error', signal: AbortSignal.timeout(8000) });
      if (!cleared.ok) throw new Error('会话未清除');
      return null;
    }
    if (pending.returnPath?.startsWith(`/${game}/`)) history.replaceState(null, '', pending.returnPath);
    try {
      const guest = fragment.get('nw_guest') === '1';
      const response = await fetch(sessionPath, { method: guest ? 'DELETE' : 'POST', credentials: 'same-origin', redirect: 'error', signal: AbortSignal.timeout(8000),
        headers: { 'Content-Type': 'application/json' },
        ...(guest ? {} : { body: JSON.stringify({ code: fragment.get('nw_code'), codeVerifier: pending.verifier, state: pending.state }) }) });
      const body = await response.json();
      return response.ok ? body.user : null;
    } catch { return null; }
  }
  const entering = url.searchParams.get('northward') === '1';
  url.searchParams.delete('northward');
  history.replaceState(null, '', url.pathname + url.search + url.hash);
  let current;
  try { current = await (await fetch(sessionPath, { credentials: 'same-origin', redirect: 'error', signal: AbortSignal.timeout(8000) })).json(); }
  catch { return null; }
  if (!entering || !current.enabled) return current.user ?? null;
  // 先清除上一次账号，失败时不误用旧身份。
  const cleared = await fetch(sessionPath, { method: 'DELETE', credentials: 'same-origin', redirect: 'error', signal: AbortSignal.timeout(8000) });
  if (!cleared.ok) throw new Error('会话未清除');
  const verifier = encode(crypto.getRandomValues(new Uint8Array(32)));
  const state = encode(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = encode(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  sessionStorage.setItem(key, JSON.stringify({ verifier, state, startedAt: Date.now(), returnPath: url.pathname + url.search }));
  const launch = new URL('https://northward.zone/games/launch/');
  launch.search = new URLSearchParams({ game, state, challenge }).toString();
  // 原来的好友房和挑战查询参数保持在游戏 URL 内；凭据只经片段交接。
  location.replace(launch.href);
  return new Promise(() => {});
}
