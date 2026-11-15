import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticatePlayer, gameAuth } from '../server/northward-auth.mjs';

test('客户端声明向北 PID 不能冒充账号，普通匿名 ID 保持兼容', () => {
  assert.throws(() => authenticatePlayer({ pid: 'northward_42', name: '冒充' }, {}));
  assert.equal(authenticatePlayer({ pid: 'anonymous-old-id', name: '游客' }, {}).pid, 'anonymous-old-id');
});

test('入房身份覆盖客户端声明，内部匹配只传递服务端认证上下文', t => {
  const original = gameAuth.identity;
  gameAuth.identity = headers => (headers?.get?.('cookie') ?? headers?.cookie) === 'fixture' ? { uid: '42', nickname: '向北同学' } : null;
  t.after(() => { gameAuth.identity = original; });
  const player = authenticatePlayer({ pid: 'someone-else', name: '假名字' }, { headers: new Headers({ cookie: 'fixture' }) });
  assert.equal(player.pid, 'northward_42');
  assert.equal(player.name, '向北同学');
  assert.equal(JSON.parse(JSON.stringify(player.authContext)).headers.cookie, 'fixture');
});
