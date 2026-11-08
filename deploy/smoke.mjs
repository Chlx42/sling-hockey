// 真实 SDK 联机验证：匹配、预测快照、出手校验、重连、AI 与房间清理。
// 用法：node deploy/smoke.mjs [wsUrl]，请对独立测试服务运行（会写入测试玩家战绩）。
import { t as Client } from '../client/vendor/colyseus-orig.js';
import { ut } from '../engine/index.mjs';

const BASE = process.argv[2] || 'ws://127.0.0.1:3217';
const HTTP = BASE.replace(/^ws/, 'http');
const rooms = new Set();
let pass = 0, fail = 0;
const ok = (condition, name) => {
  condition ? pass++ : fail++;
  console.log(`  ${condition ? '✓' : '✗'} ${name}`);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(condition, name, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await condition();
    if (value) return value;
    await sleep(25);
  }
  throw new Error(`${name} 超时`);
}
function track(room) {
  rooms.add(room);
  room.events = { shot: [], fx: [], evt: [], states: 0 };
  for (const type of ['shot', 'fx', 'evt']) room.onMessage(type, (m) => room.events[type].push(m));
  room.onMessage('score', () => {});
  room.onStateChange(() => room.events.states++);
  room.onLeave(() => rooms.delete(room));
  return room;
}
const health = () => fetch(`${HTTP}/api/health`).then((r) => r.json());
function player(name, suffix) {
  return { client: new Client(BASE), name, pid: `smoke-${suffix.repeat(16)}` };
}
async function joinQueue(p) {
  const queue = await p.client.joinOrCreate('queue', { name: p.name, rank: 1000, pid: p.pid });
  rooms.add(queue);
  queue.reconnection.enabled = false;
  queue.onMessage('clients', () => {});
  queue.onMessage('evt', () => {});
  queue.onLeave(() => rooms.delete(queue));
  const seatPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${p.name} seat 超时`)), 20000);
    queue.onMessage('seat', async (seat) => {
      clearTimeout(timer);
      queue.send('confirm');
      try { resolve(track(await p.client.consumeSeatReservation(seat))); }
      catch (error) { reject(error); }
      finally { await queue.leave(); }
    });
  });
  return { queue, seatPromise };
}

try {
  const initial = await health();
  ok(initial.ok === true, `健康检查（rooms=${initial.rooms}）`);
  const A = player('测试甲', 'A'), B = player('测试乙', 'B');
  const qa = await joinQueue(A), qb = await joinQueue(B);
  const [gameA, gameB] = await Promise.all([qa.seatPromise, qb.seatPromise]);
  ok(gameA.roomId === gameB.roomId, '配对进入同一房间');
  await waitFor(() => gameA.state?.phase === 'starting', 'starting');
  ok(true, '进入 starting');
  ok(gameA.state.players.size === 2 && gameA.state.pucks.length === 10, '动态解码 2 人与 10 球');
  ok(gameA.state.matchTime === 600, '比赛时长正确');
  ok(gameA.state.otTime === 1200, '加时时长正确');
  ok(gameA.state.pucks.every((p) => ['vx', 'vy', 'av', 'launchStep', 'launchCx', 'launchPx', 'launchPy', 'launchSide'].every((field) => Number.isFinite(p[field]))), '完整解码客户端预测所需状态');
  await waitFor(() => gameA.state.phase === 'playing', 'playing');
  ok(Number.isInteger(gameA.state.physicsDelay) && gameA.state.physicsDelay >= 0 && gameA.state.physicsDelay <= 255, '独立同步物理子步距发送时刻的偏移');
  const snapshotStart = gameA.events.states;
  await sleep(1100);
  const snapshots = gameA.events.states - snapshotStart;
  ok(snapshots >= 8 && snapshots <= 13, `权威快照约 10Hz（1.1s 收到 ${snapshots} 次）`);

  const side = gameA.state.players.get(gameA.sessionId).side;
  const puck = gameA.state.pucks.find((p) => p.id === (side === 0 ? 2 : 7));
  gameA.send('grab', { puckId: puck.id });
  await waitFor(() => puck.held === side, 'grab 确认');
  gameA.send('grab', { puckId: side === 0 ? 7 : 2 });
  await waitFor(() => gameA.events.evt.some((e) => e.type === 'reject' && e.reason === 'already_holding'), '非法 grab 拒绝');
  ok(true, '权威抓球校验保留');
  const target = ut(side, puck.id, puck.x, 0, 3.5);
  gameA.send('aim', { pull: false, x: target.px, y: side === 0 ? -10.5 : 10.5, cx: target.cx });
  await sleep(120);
  gameA.send('shoot', { puckId: puck.id, cx: target.cx, px: target.px, py: target.py });
  await waitFor(() => gameA.events.shot.length && gameB.events.shot.length, 'shot');
  const shot = gameA.events.shot[0];
  ok(shot.puckId === gameB.events.shot[0].puckId && shot.t > 0, '双方收到带时间戳的出手事件');
  await waitFor(() => Math.hypot(puck.vx, puck.vy) > 1, '运动快照');
  ok(puck.held === -1, '快照携带实际速度并释放持球状态');

  const token = gameA.reconnectionToken, sessionId = gameA.sessionId;
  gameA.reconnection.enabled = false;
  gameA.connection.close();
  await waitFor(() => gameB.state.players.get(sessionId)?.connected === false, '对手断线状态');
  const rejoined = track(await A.client.reconnect(token));
  await waitFor(() => rejoined.state?.phase === 'playing' && gameB.state.players.get(sessionId)?.connected, '重连同步');
  ok(rejoined.sessionId === sessionId && rejoined.state.pucks.every((p) => Number.isFinite(p.vx)), '重连保留席位并恢复完整预测快照');
  await rejoined.leave();
  await waitFor(() => gameB.state.phase === 'over', '主动离房结算');
  ok(gameB.state.reason === 'forfeit' && gameB.state.winner !== side, '离房正确判负');
  const finishedAt = gameB.events.states;
  await sleep(400);
  ok(gameB.events.states === finishedAt, '结束后无空时间戳补丁');
  await gameB.leave();

  const F1 = player('房主', 'C'), F2 = player('访客', 'D');
  const host = track(await F1.client.create('game', { mode: 'friend', name: F1.name, pid: F1.pid }));
  await waitFor(() => host.state?.phase === 'waiting', '好友 waiting');
  await sleep(150); // 等待创建房间的首次字段补丁完成。
  const idleUpdates = host.events.states;
  await sleep(400);
  ok(host.events.states === idleUpdates, '好友等待时无空时间戳补丁');
  const guest = track(await F2.client.joinById(host.roomId, { name: F2.name, pid: F2.pid }));
  await waitFor(() => guest.state?.phase === 'starting' && host.state.players.size === 2, '好友 starting');
  ok(true, '好友加入后倒计时正常');
  await host.leave(); await guest.leave();

  const qs = await joinQueue(player('陪练测试', 'E'));
  const gameS = await qs.seatPromise, botSeatAt = Date.now();
  await waitFor(() => {
    const botSide = [...(gameS.state?.players?.values() || [])].find((p) => p.name.startsWith('AI 陪练'))?.side;
    return gameS.events.shot.some((shot) => shot.side === botSide);
  }, 'bot shot', 30000);
  ok(true, `AI 陪练完成出手（匹配后 ${((Date.now() - botSeatAt) / 1000).toFixed(1)}s）`);
  await gameS.leave();
  const lb = await fetch(`${HTTP}/api/leaderboard?period=week&limit=5&pid=${A.pid}`).then((r) => r.json());
  ok(lb.me && 'games' in lb.me && 'rate' in lb.me, '排行榜响应完整');
  await waitFor(async () => (await health()).rooms <= initial.rooms, '对局房间释放');
  ok(true, '真人与 AI 离场后房间全部释放');
} catch (error) {
  fail++;
  console.error(error);
} finally {
  await Promise.allSettled([...rooms].map((room) => room.leave()));
}
console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exitCode = fail ? 1 : 0;
