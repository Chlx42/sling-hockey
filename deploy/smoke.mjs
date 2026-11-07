// 烟囱测试：两个合成 WS 客户端走完匹配→对局→校验→断线→重赛全流程（四态状态机协议）
// 用法：node deploy/smoke.mjs [baseUrl]  baseUrl 默认 http://127.0.0.1:3217
import WebSocket from 'ws';
import { ut } from '../engine/index.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:3217';
const WS_URL = BASE.replace(/^http/, 'ws') + '/hockey-ws';
let pass = 0, fail = 0;
const ok = (cond, name) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function client(name) {
  const ws = new WebSocket(WS_URL);
  const c = { name, ws, msgs: [], waiters: [] };
  ws.on('message', (raw) => {
    const m = JSON.parse(raw);
    c.msgs.push(m);
    for (const w of [...c.waiters]) {
      if (w.pred(m)) { c.waiters.splice(c.waiters.indexOf(w), 1); clearTimeout(w.timer); w.resolve(m); }
    }
  });
  ws.on('open', () => { c.open = true; c.openedResolve(); });
  c.opened = new Promise((r) => (c.openedResolve = r));
  c.send = (m) => ws.send(JSON.stringify(m));
  c.waitFor = (pred, ms = 10000) => new Promise((resolve, reject) => {
    const found = c.msgs.find(pred);
    if (found) return resolve(found);
    const w = { pred, resolve, timer: setTimeout(() => {
      c.waiters.splice(c.waiters.indexOf(w), 1);
      reject(new Error(`${name} 等待超时; 已收到: ${c.msgs.map((m) => m.t + (m.ph ? ':' + m.ph : '')).slice(-12).join(',')}`));
    }, ms) };
    c.waiters.push(w);
  });
  c.lastSt = () => [...c.msgs].reverse().find((m) => m.t === 'st');
  return c;
}

const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
ok(health?.ok === true, `健康检查 /api/health（rooms=${health?.rooms} queue=${health?.queue}）`);

// ---- 在线匹配：四态流转 ----
const A = client('A'), B = client('B');
await Promise.all([A.opened, B.opened]);
A.send({ t: 'hello', mode: 'queue', name: '测试甲', pid: 'smoke-AAAAAAAAAAAAAAAA' });
B.send({ t: 'hello', mode: 'queue', name: '测试乙', pid: 'smoke-BBBBBBBBBBBBBBBB' });
const stA1 = await A.waitFor((m) => m.t === 'st' && m.ph === 'starting', 10000);
const stB1 = await B.waitFor((m) => m.t === 'st' && m.ph === 'starting', 10000);
ok(stA1.pl.length === 2, '匹配成功：进入 starting');
ok(new Set(stA1.pl.map((p) => p[2])).size === 2, '双方 side 不同');
ok(typeof stA1.cd === 'number' && stA1.cd >= 0 && stA1.cd <= 3, `versus 倒计时 cd=${stA1.cd}`);
ok(Array.isArray(stA1.pk) && stA1.pk.length === 10, 'starting 状态含 10 枚冰球初始布局');
ok(stA1.mt === 1800, `matchTime ×10 = ${stA1.mt}`);

const stPlay = await A.waitFor((m) => m.t === 'st' && m.ph === 'playing', 10000);
ok(!!stPlay, 'starting → playing 自动流转');

const helloA = A.msgs.find((m) => m.t === 'hello');
const sideA = stA1.pl.find((p) => p[0] === helloA.sid)?.[2] ?? 0;

// ---- 抓球校验（playing 阶段） ----
const snap = A.lastSt();
const myPuck = snap.pk.find(([id, , y10]) => (y10 < 0 ? 0 : 1) === sideA && (sideA === 0 ? id === 2 : id === 7));
A.send({ t: 'grab', puckId: myPuck[0] });
await sleep(250);
ok(!A.msgs.some((m) => m.t === 'evt' && m.type === 'reject' && m.action === 'grab'), `抓取己方冰球 #${myPuck[0]} 被接受`);

A.send({ t: 'grab', puckId: sideA === 0 ? 7 : 2 });
await sleep(250);
ok(A.msgs.some((m) => m.t === 'evt' && m.type === 'reject' && m.reason === 'already_holding'), '抓对方冰球被拒绝（already_holding）');

// ---- 出手 ----
const s = sideA;
const cx = Math.max(-8, Math.min(8, myPuck[1] / 10));
const target = ut(s, myPuck[0], cx, 0, 3.5);
A.send({ t: 'aim', pull: false, x: target.px, y: s === 0 ? -10.5 : 10.5, cx });
await sleep(120);
A.send({ t: 'shoot', puckId: myPuck[0], cx, px: target.px, py: target.py });
const shot = await A.waitFor((m) => m.t === 'shot', 4000);
ok(Math.abs(shot.px - target.px) < 0.3 && shot.at > 0, `服务器广播 shot（px=${shot.px.toFixed(2)}，锚点 at=${shot.at > 0}）`);
const shotB = await B.waitFor((m) => m.t === 'shot', 4000);
ok(shotB.puckId === shot.puckId, '对手也收到 shot');
A.send({ t: 'drop', x: 0, y: s === 0 ? -6 : 6 });

// ---- 快照流动 ----
const n0 = A.msgs.filter((m) => m.t === 'st' && m.ph === 'playing').length;
await sleep(1500);
const n1 = A.msgs.filter((m) => m.t === 'st' && m.ph === 'playing').length;
ok(n1 - n0 >= 10, `快照流速正常（1.5s 收到 ${n1 - n0} 帧 ≈ 12Hz）`);

// ---- 断线 → opponent_left；重连 → opponent_back + 状态恢复 ----
B.ws.close();
const left = await A.waitFor((m) => m.t === 'evt' && m.type === 'opponent_left', 4000);
ok(!!left, '对手断线收到 opponent_left');
await sleep(150);
const B2 = client('B2');
await B2.opened;
const sidB = stA1.pl.find((p) => p[1] === '测试乙')[0];
B2.send({ t: 'hello', mode: 'resume', name: '测试乙', pid: 'smoke-BBBBBBBBBBBBBBBB', sid: sidB });
const back = await A.waitFor((m) => m.t === 'evt' && m.type === 'opponent_back', 4000);
const stResume = await B2.waitFor((m) => m.t === 'st', 4000);
ok(!!back && !!stResume, '重连恢复席位与状态');

// ---- 好友房：waiting → 邀请 → join → starting ----
const F1 = client('F1');
await F1.opened;
F1.send({ t: 'hello', mode: 'create', name: '房主', pid: 'smoke-CCCCCCCCCCCCCCCC' });
const room = await F1.waitFor((m) => m.t === 'room', 4000);
ok(/^[A-Z2-9]{4}$/.test(room.code), `创建好友房，房间号 ${room.code}`);
const stWait = await F1.waitFor((m) => m.t === 'st' && m.ph === 'waiting', 4000);
ok(stWait.pl.length === 1 && stWait.mt === 1800, `waiting 状态（1 人，含初始布局 ${stWait.pk.length} 球）`);
const F2 = client('F2');
await F2.opened;
F2.send({ t: 'hello', mode: 'join', name: '访客', pid: 'smoke-DDDDDDDDDDDDDDDD', room: room.code });
const stF = await F2.waitFor((m) => m.t === 'st' && m.ph === 'starting', 8000);
ok(stF.pl.length === 2, '好友加入 → starting');
const badJoin = client('F3');
await badJoin.opened;
badJoin.send({ t: 'hello', mode: 'join', name: '路人', pid: 'smoke-EEEEEEEEEEEEEEEE', room: 'ZZ99' });
const noRoom = await badJoin.waitFor((m) => m.t === 'evt' && m.type === 'no_room', 4000);
ok(!!noRoom, '无效房间号被拒（no_room）');

// ---- 排行榜（me 含 games/rate） ----
await sleep(300);
const lb = await fetch(`${BASE}/api/leaderboard?period=week&limit=5&pid=smoke-AAAAAAAAAAAAAAAA`).then((r) => r.json());
ok(typeof lb.total === 'number' && Array.isArray(lb.top), `排行榜 API 可用（total=${lb.total}）`);
ok(lb.me && 'games' in lb.me && 'rate' in lb.me, `me 字段完整（games=${lb.me?.games} rate=${lb.me?.rate}）`);

// ---- over 状态结构（disconnect 判负路径） ----
// 复用 A/B 对局：B2 再断开 → 30s 宽限后判负 → A 收到 ph=over + winner/reason
B2.ws.close();
const overA = await A.waitFor((m) => m.t === 'st' && m.ph === 'over', 40000);
ok(typeof overA.winner === 'number' && typeof overA.reason === 'string' && overA.reason === 'disconnect', `over 状态完整（winner=${overA.winner} reason=${overA.reason}）`);
ok(overA.winner === sideA, `断线方判负，胜方 side=${overA.winner}`);
ok(overA.pl.find((p) => p[2] === overA.winner)?.[3] === 1, '胜方 wins +1');

A.ws.close();
console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
