import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createGameAuth } from '../server/northward-session.mjs';

async function fixture(t, exchange) {
  let now = 1000;
  const auth = createGameAuth({ game: 'hockey', sessionPath: '/session',
    exchangeUrl: 'https://api.example.test/exchange', secret: 's'.repeat(40),
    publicOrigin: 'https://games.example.test', now: () => now,
    fetchImpl: exchange,
  });
  const server = createServer((req, res) => auth.handle(req, res, new URL(req.url, 'http://localhost')));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return { auth, url: `http://127.0.0.1:${server.address().port}/session`, expire: () => { now += 8 * 60 * 60 * 1000 + 1; } };
}
const credentials = { code: 'c'.repeat(43), codeVerifier: 'v'.repeat(43), state: 't'.repeat(43) };
const login = (url, extra = {}) => fetch(url, { method: 'POST',
  headers: { Origin: 'https://games.example.test', 'Content-Type': 'application/json', ...extra },
  body: JSON.stringify(credentials),
});

test('登录会话仅保留经兑换验证的资料，过期后失效', async t => {
  const f = await fixture(t, async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.deepEqual(request, { game: 'hockey', ...credentials });
    assert.equal(options.redirect, 'error');
    return { ok: true, json: async () => ({ success: true, data: {
      uid: '42', nickname: '同学', avatar: '/avatar', phone: 'private', accessToken: 'must-not-leak',
    } }) };
  });
  const response = await login(f.url);
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly; Secure; SameSite=Lax/);
  assert.doesNotMatch(cookie, /Domain=/);
  const body = await response.json();
  assert.deepEqual(body.user, { uid: '42', nickname: '同学', avatar: '/avatar' });
  const headers = { cookie: cookie.split(';')[0] };
  assert.equal(f.auth.identity(headers).uid, '42');
  f.expire(); assert.equal(f.auth.identity(headers), null);
});

test('兑换失败先清除旧账号，不能继续用旧会话提交', async t => {
  let success = true;
  const f = await fixture(t, async () => ({ ok: success, json: async () => ({ success: true, data: { uid: '42', nickname: '甲' } }) }));
  const old = await login(f.url);
  const cookie = old.headers.get('set-cookie').split(';')[0];
  success = false;
  const failed = await login(f.url, { Cookie: cookie });
  assert.equal(failed.status, 401);
  assert.equal(f.auth.identity({ cookie }), null);
  assert.match(failed.headers.get('set-cookie'), /Max-Age=0/);
});

test('跨站提交被拒绝，不能改变已有登录会话', async t => {
  const f = await fixture(t, () => { throw new Error('must not exchange'); });
  const response = await login(f.url, { Origin: 'https://evil.example.test' });
  assert.equal(response.status, 403);
});

test('未配置服务凭据时保留游客模式', async () => {
  const auth = createGameAuth({ game: 'hockey', sessionPath: '/session', secret: '' });
  assert.equal(auth.enabled, false);
  assert.equal(auth.identity({ cookie: 'nw_hockey=forged' }), null);
});
