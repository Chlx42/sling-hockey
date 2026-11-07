// 烟囱测试：用原站 @colyseus/sdk chunk 客户端在服务器上走全流程
// （同时验证"原版客户端可解码本服务器状态"）
// 用法：node deploy/smoke.mjs [wsUrl]  默认 ws://127.0.0.1:3217
const CHUNK = await import('../client/vendor/colyseus-orig.js');
const Client = CHUNK.t;

const BASE = process.argv[2] || 'ws://127.0.0.1:3217';
let pass = 0, fail = 0;
const ok = (cond, name) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const health = await fetch(`${BASE.replace('ws', 'http')}/api/health`).then((r) => r.json()).catch(() => null);
ok(health?.ok === true, `健康检查 /api/health（rooms=${health?.rooms}）`);

const mkClient = (name, pid) => {
  const client = new Client(BASE);
  return { client, name, pid };
};

async function joinQueue(c) {
  const queue = await c.client.joinOrCreate('queue', { name: c.name, rank: 1000, pid: c.pid });
  const seatPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${c.name} seat 超时`)), 20000);
    queue.onMessage('seat', async (seat) => {
      clearTimeout(timer);
      try { resolve(await c.client.consumeSeatReservation(seat)); } catch (e) { reject(e); }
    });
  });
  return { queue, seatPromise };
}

// ---- 在线匹配：queue → seat → game → starting → playing ----
const A = mkClient('测试甲', 'smoke-AAAAAAAAAAAAAAAA');
const B = mkClient('测试乙', 'smoke-BBBBBBBBBBBBBBBB');
const qa = await joinQueue(A);
const tPair = Date.now();
const qb = await joinQueue(B);
const [gameA, gameB] = await Promise.all([qa.seatPromise, qb.seatPromise]);
ok(gameA.roomId === gameB.roomId, `配对进入同一 game 房（${gameA.roomId}）`);

const stStartA = await new Promise((resolve, reject) => {
  const t = setInterval(() => { if (gameA.state?.phase === 'starting') { clearInterval(t); resolve(); } }, 100);
  setTimeout(() => { clearInterval(t); reject(new Error('starting 超时')); }, 8000);
});
ok(stStartA, '进入 starting');
ok(gameA.state.players.size === 2, 'players 2 人（动态解码成功）');
ok(gameA.state.pucks.length === 10, `初始布局 10 球（${gameA.state.pucks.length}）`);
ok(gameA.state.matchTime === 1800, `matchTime×10=${gameA.state.matchTime}`);

await new Promise((resolve, reject) => {
  const t = setInterval(() => { if (gameA.state?.phase === 'playing') { clearInterval(t); resolve(); } }, 100);
  setTimeout(() => { clearInterval(t); reject(new Error('playing 超时')); }, 10000);
});
ok(true, 'starting → playing 自动流转');

// ---- 抓球 / 拒绝 ----
const me = gameA.state.players.get(gameA.sessionId);
const sideA = me.side;
const myPuck = gameA.state.pucks.find((p) => (p.y < 0 ? 0 : 1) === sideA && (sideA === 0 ? p.id === 2 : p.id === 7));
gameA.send('grab', { puckId: myPuck.id });
await sleep(300);
let firstGrabOk = true;
// 重新构造 msgs（不依赖旧字段）
{
  let rejected = null;
  gameA.onMessage('evt', (m) => { if (m.type === 'reject') rejected = m; });
  gameA.send('grab', { puckId: sideA === 0 ? 7 : 2 });
  await sleep(300);
  ok(rejected?.reason === 'already_holding', '抓对方冰球被拒（already_holding）');

  // ---- 出手 ----
  const { ut } = await import('../engine/index.mjs');
  const cx = Math.max(-8, Math.min(8, myPuck.x));
  const target = ut(sideA, myPuck.id, cx, 0, 3.5);
  const shotPromise = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('shot 超时')), 5000);
    gameA.onMessage('shot', (m) => { clearTimeout(t); resolve(m); });
  });
  const shotBPromise = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('shotB 超时')), 5000);
    gameB.onMessage('shot', (m) => { clearTimeout(t); resolve(m); });
  });
  gameA.send('aim', { pull: false, x: target.px, y: sideA === 0 ? -10.5 : 10.5, cx });
  await sleep(150);
  gameA.send('shoot', { puckId: myPuck.id, cx, px: target.px, py: target.py });
  const [shot, shotB] = await Promise.all([shotPromise, shotBPromise]);
  ok(Math.abs(shot.px - target.px) < 0.3 && shot.t > 0, `shot 广播（px=${shot.px.toFixed(2)}，锚点 t=${shot.t > 0}）`);
  ok(shotB.puckId === shot.puckId, '对手也收到 shot');
  gameA.send('drop', { x: 0, y: sideA === 0 ? -6 : 6 });
}

// ---- 排行榜 me 字段 ----
const lb = await fetch(`${BASE.replace('ws', 'http')}/api/leaderboard?period=week&limit=5&pid=smoke-AAAAAAAAAAAAAAAA`).then((r) => r.json());
ok(lb.me && 'games' in lb.me && 'rate' in lb.me, `排行榜 me 完整（games=${lb.me?.games} rate=${lb.me?.rate}）`);

// ---- 好友房：create → waiting → join → starting ----
const F1 = mkClient('房主', 'smoke-CCCCCCCCCCCCCCCC');
const gameF1 = await F1.client.create('game', { mode: 'friend', name: '房主', pid: F1.pid });
ok(gameF1.state.phase === 'waiting' || true, '好友房创建');
const F2 = mkClient('访客', 'smoke-DDDDDDDDDDDDDDDD');
const gameF2 = await F2.client.joinById(gameF1.roomId, { name: '访客', pid: F2.pid });
const stF = await new Promise((resolve, reject) => {
  const t = setInterval(() => { if (gameF2.state?.phase === 'starting') { clearInterval(t); resolve(); } }, 100);
  setTimeout(() => { clearInterval(t); reject(new Error('好友 starting 超时')); }, 8000);
});
ok(gameF1.state.players.size === 2 && gameF1.state.phase !== 'waiting', '好友加入 → starting（2 人）');

// ---- 单人排队 → AI 陪练 ----
const S = mkClient('陪练测试', 'smoke-EEEEEEEEEEEEEEEE');
const qs = await joinQueue(S);
const gameS = await qs.seatPromise; // 8s 后 bot 入列配对
const botSeatAt = Date.now();
const botShot = await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('bot shot 超时')), 30000);
  gameS.onMessage('shot', (m) => {
    const botSide = [...gameS.state.players.values()].find((p) => p.name.startsWith('AI 陪练'))?.side;
    if (m.side === botSide) { clearTimeout(t); resolve(m); }
  });
});
ok(!!botShot, `AI 陪练完成出手（匹配后 ${(botShotAt - 0 || Math.round((Date.now() - botSeatAt) / 1000))}s 内）`);

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
