import test from 'node:test';
import assert from 'node:assert/strict';
import { Rt, xt, Be, k, T, E } from '../engine/index.mjs';

const puck = (id, x, y) => ({ id, x, y, a: 0, color: id % 2 });
function world(t, pucks) {
  const result = new xt(pucks);
  t.after(() => result.free());
  return result;
}
function steps(w, count, events) {
  for (let i = 0; i < count; i++) w.step(events);
}
function kinetic(w) {
  return w.bodies.reduce((sum, { body }) => {
    const v = body.linvel();
    return sum + 0.5 * body.mass() * (v.x * v.x + v.y * v.y) +
      0.5 * body.principalInertia() * body.angvel() ** 2;
  }, 0);
}

test('滑动与旋转持续衰减，保留半秒后的惯性', (t) => {
  const w = world(t, [puck(0, 0, -6)]), body = w.find(0).body;
  body.setLinvel({ x: 8, y: 0 }, true);
  body.setAngvel(4, true);
  let previous = kinetic(w);
  for (let i = 0; i < 60; i++) {
    w.step();
    const energy = kinetic(w);
    assert.ok(energy <= previous + 1e-6, '无外力时不能凭空增加能量');
    previous = energy;
  }
  assert.ok(body.linvel().x > 4.5 && body.linvel().x < 6);
  assert.ok(body.angvel() > 2 && body.angvel() < 4);
  steps(w, 1200);
  assert.ok(w.isSettled());
  assert.equal(w.step(), false, '静止后跳过 WASM 物理求解');
});

test('斜碰围栏将切向动量转换成旋转且不会增能', (t) => {
  const w = world(t, [puck(0, 7, -6)]), body = w.find(0).body;
  body.setLinvel({ x: 12, y: 6 }, true);
  const initial = kinetic(w);
  steps(w, 24);
  assert.ok(body.linvel().x < 0, '法向速度应反弹');
  assert.ok(Math.abs(body.angvel()) > 1, '擦边后应有可见旋转');
  assert.ok(kinetic(w) < initial);
});

test('偏心球碰撞传递动量和旋转', (t) => {
  const w = world(t, [puck(0, -3, -6), puck(1, 0, -5)]);
  w.find(0).body.setLinvel({ x: 18, y: 0 }, true);
  const initial = kinetic(w);
  steps(w, 24);
  assert.ok(w.speedOf(1) > 2, '被撞球应移动');
  assert.ok(w.bodies.some(({ body }) => Math.abs(body.angvel()) > 0.5));
  assert.ok(kinetic(w) < initial);
  const a = w.find(0).body.translation(), b = w.find(1).body.translation();
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 1.97);
});

test('高速 CCD 阻止穿越中央挡板与外墙，洞口仍可通过', (t) => {
  const divider = world(t, [puck(0, 4, -1.8)]);
  divider.find(0).body.setLinvel({ x: 0, y: 400 }, true);
  for (let i = 0; i < 8; i++) {
    divider.step();
    assert.ok(divider.find(0).body.translation().y < -1.35);
  }
  const wall = world(t, [puck(0, 8, -4)]);
  wall.find(0).body.setLinvel({ x: 1000, y: 0 }, true);
  for (let i = 0; i < 8; i++) {
    wall.step();
    assert.ok(Math.abs(wall.find(0).body.translation().x) <= T - 0.97);
  }
  const gate = world(t, [puck(0, 0, -2)]);
  gate.find(0).body.setLinvel({ x: 0, y: 60 }, true);
  steps(gate, 8);
  assert.ok(gate.find(0).body.translation().y > 0);
});

test('十球连续高速碰撞保持有限坐标且最终不重叠', (t) => {
  const w = world(t, Be());
  for (const { body, id } of w.bodies) {
    body.setLinvel({ x: Math.cos(id * 2.4) * 37, y: Math.sin(id * 2.4) * 37 }, true);
  }
  for (let i = 0; i < 1200; i++) {
    w.step();
    if (i % 12 !== 0) continue;
    for (const p of w.snapshot()) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.a));
      assert.ok(Math.abs(p.x) <= T - 0.96 && Math.abs(p.y) <= E - 0.96);
    }
  }
  const result = w.snapshot();
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      assert.ok(Math.hypot(result[i].x - result[j].x, result[i].y - result[j].y) >= 1.97);
    }
  }
});

test('静止时跳过求解但比赛倒计时和结算继续', (t) => {
  const game = new Rt({ matchTime: 0.3, overtime: 0 });
  t.after(() => game.world.free());
  let calls = 0;
  const original = game.world.world.step.bind(game.world.world);
  game.world.world.step = (...args) => { calls++; return original(...args); };
  for (let i = 0; i < 60; i++) game.update(k);
  assert.equal(game.phase, 'over');
  assert.equal(game.endReason, 'time');
  assert.equal(game.winner, -1);
  assert.ok(calls <= 12, `空闲求解次数 ${calls}`);
});

test('休眠棋盘在发射和落到弹力带上时重新唤醒', (t) => {
  const w = world(t, [puck(0, 0, -6)]);
  steps(w, 30);
  assert.equal(w.step(), false);
  w.launch(0, 0, 0, -14, 0);
  assert.equal(w.step(), true);
  assert.ok(w.find(0).body.translation().y > -14);
  w.hold(0);
  assert.equal(w.step(), false);
  w.place(0, 0, -13);
  assert.equal(w.step(), true);
  assert.ok(w.find(0).body.linvel().y > 0, '弹力带势能应将球推回棋盘');
});

test('中途快照能恢复弹射加速，并复用已有碰撞体', (t) => {
  const original = world(t, [puck(0, 0, -6)]);
  original.launch(0, 1, 1.8, -14, 0);
  steps(original, 5);
  const snapshot = original.snapshot();
  assert.ok(snapshot[0].launchStep > 0);
  const predicted = world(t, [puck(0, 0, -6)]);
  const body = predicted.find(0).body;
  predicted.restore(snapshot);
  assert.equal(predicted.find(0).body, body);
  for (let i = 0; i < 40; i++) {
    original.step(); predicted.step();
    const a = original.snapshot()[0], b = predicted.snapshot()[0];
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.002);
    assert.ok(Math.hypot(a.vx - b.vx, a.vy - b.vy) < 0.01);
    assert.equal(a.launchStep, b.launchStep);
  }
});

test('权威持有状态取消预测发射，释放快照恢复速度与旋转', (t) => {
  const w = world(t, [puck(0, 0, -6)]);
  w.launch(0, 0, 0, -14, 0);
  w.restore([{ ...puck(0, 2, -5), held: 0, vx: 0, vy: 0, av: 0, launchStep: -1 }]);
  assert.equal(w.find(0).body.isEnabled(), false);
  assert.equal(w.isLaunching(0), false);
  assert.equal(w.step(), false);
  w.restore([{ ...puck(0, 2, -5), held: -1, vx: 3, vy: 1, av: 2, launchStep: -1 }]);
  assert.equal(w.find(0).body.isEnabled(), true);
  assert.equal(w.step(), true);
  const p = w.snapshot()[0];
  assert.ok(p.x > 2 && p.y > -5 && p.a > 0);
});

test('30Hz 和 60Hz 调度使用相同的120Hz固定物理步', (t) => {
  const games = [new Rt(), new Rt()];
  t.after(() => games.forEach((game) => game.world.free()));
  for (const game of games) {
    assert.equal(game.grab(0, 2).ok, true);
    assert.equal(game.shoot(0, { puckId: 2, cx: 0, px: 0, py: -14 }).ok, true);
  }
  for (let i = 0; i < 120; i++) games[0].update(1 / 60);
  for (let i = 0; i < 60; i++) games[1].update(1 / 30);
  assert.equal(games[0].steps, games[1].steps);
  assert.deepEqual(games[0].world.snapshot(), games[1].world.snapshot());
});

test('洞口圆柱的擦碰音效使用实际接触法向', (t) => {
  const w = world(t, [puck(0, 0, 0)]), events = [];
  w.find(0).body.setLinvel({ x: 20, y: 0 }, true);
  steps(w, 8, events);
  assert.ok(events.some((event) => event.k === 'divider' && event.v > 5),
    '水平撞圆柱也应产生与撞击强度对应的反馈');
});
