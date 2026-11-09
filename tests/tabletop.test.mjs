import test from 'node:test';
import assert from 'node:assert/strict';
import { xt, rt, ct, ut, M, A, k } from '../engine/index.mjs';

const puck = (id, x, y) => ({ id, x, y, a: 0, color: id % 2 });
function world(t, pucks) {
  const result = new xt(pucks);
  t.after(() => result.free());
  return result;
}
function kinetic(w) {
  return w.bodies.reduce((sum, { body }) => {
    const v = body.linvel();
    return sum + body.mass() * (v.x * v.x + v.y * v.y) / 2 +
      body.principalInertia() * body.angvel() ** 2 / 2;
  }, 0);
}

test('桌面模型：同一压带位置的主动释放与被动回弹完全同源', (t) => {
  const active = world(t, [puck(0, 0, -14.4)]);
  const passive = world(t, [puck(0, 0, -14.4)]);
  active.launch(0, 0, 0, -14.4, 0);
  let exit;
  for (let i = 0; i < 60; i++) {
    active.step(); passive.step();
    const a = active.snapshot()[0], b = passive.snapshot()[0];
    for (const key of ['x', 'y', 'vx', 'vy', 'av', 'bandSide', 'bandTangent'])
      assert.ok(a[key] === b[key], `${key} 不应因主动/被动模式改变`);
    if (a.y >= -10.5) { exit = a; break; }
  }
  assert.ok(exit && exit.vy >= 27 && exit.vy <= 29, '满拉应处于收敛后的速度范围');
});

test('桌面模型：直拉与镜像斜拉的瞄准预览吻合真实离带状态', (t) => {
  for (const side of [0, 1]) for (const dx of [0, -1.2, 1.2]) {
    const x = dx, y = M(side) - A(side) * 3.5;
    const w = world(t, [puck(0, x, y)]);
    const preview = rt(side, 0, x, y);
    assert.ok(preview.ok);
    w.launch(0, 0, x, y, side);
    let steps = 0;
    while (w.isLaunching(0) && steps < 120) { w.step(); steps++; }
    const actual = w.snapshot()[0];
    assert.equal(steps, preview.steps);
    for (const key of ['x', 'y', 'vx', 'vy', 'av'])
      assert.ok(Math.abs(actual[key] - preview[key]) < 0.002, `${side}/${dx} ${key}`);
    if (dx) assert.ok(actual.vx * dx < 0, '横向预拉应保持反向控向');
  }
});

test('桌面模型：带侧滑与自旋共同耗散，不放大回撞能量', (t) => {
  const w = world(t, [puck(0, 0, -10.5)]), body = w.find(0).body;
  body.setLinvel({ x: 5, y: -20 }, true);
  body.setAngvel(3, true);
  const initial = kinetic(w);
  let contacted = false, released = false;
  for (let i = 0; i < 120; i++) {
    w.step();
    const p = w.snapshot()[0];
    contacted ||= p.bandSide === 0;
    if (contacted && p.bandSide === -1 && p.vy > 0) { released = true; break; }
  }
  assert.ok(contacted && released);
  assert.ok(kinetic(w) < initial * 0.6, '完整回撞过程应显著耗散而非增能');
});

test('桌面模型：主动和被动接触快照保留切向形变及旋转', (t) => {
  for (const active of [true, false]) {
    const source = world(t, [puck(0, 0, -6)]);
    if (active) source.launch(0, 0, 1.2, -14, 0);
    else {
      source.place(0, 0, -10.55);
      source.find(0).body.setLinvel({ x: 5, y: -15 }, true);
    }
    for (let i = 0; i < 5; i++) source.step();
    const snapshot = source.snapshot();
    assert.equal(snapshot[0].bandSide, 0);
    assert.ok(Math.abs(snapshot[0].bandTangent) > 0.001);
    const restored = world(t, [puck(0, 0, -6)]);
    restored.restore(snapshot);
    assert.equal(restored.snapshot()[0].bandTangent, snapshot[0].bandTangent);
    for (let i = 0; i < 45; i++) {
      source.step(); restored.step();
      const a = source.snapshot()[0], b = restored.snapshot()[0];
      for (const key of ['x', 'y', 'vx', 'vy', 'av', 'bandTangent'])
        assert.ok(Math.abs(a[key] - b[key]) < 0.002, `${active} ${key}`);
      assert.equal(a.bandSide, b.bandSide);
    }
  }
});

test('桌面模型：木墙回弹遵守恢复系数，不被预测接触提前削弱', (t) => {
  const w = world(t, [puck(0, 7, -6)]), body = w.find(0).body;
  body.setLinvel({ x: 20, y: 0 }, true);
  let hit = false;
  for (let i = 0; i < 30; i++) {
    const incoming = body.linvel().x - 8.5 * k, events = [];
    w.step(events);
    if (events.some((e) => e.k === 'wall')) {
      assert.ok(Math.abs(-body.linvel().x / incoming - 0.42) < 0.015);
      hit = true;
      break;
    }
  }
  assert.ok(hit);
});

test('桌面模型：圆盘正碰传递动量且相对分离速度符合恢复系数', (t) => {
  const w = world(t, [puck(0, -3, -6), puck(1, 0, -6)]);
  w.find(0).body.setLinvel({ x: 20, y: 0 }, true);
  let hit = false;
  for (let i = 0; i < 30; i++) {
    const incoming = w.find(0).body.linvel().x - 8.5 * k, events = [];
    w.step(events);
    if (events.some((e) => e.k === 'puck')) {
      const a = w.find(0).body.linvel().x, b = w.find(1).body.linvel().x;
      assert.ok(Math.abs(a + b - incoming) < 0.002, '同质量圆盘的碰撞动量守恒');
      assert.ok(Math.abs((b - a) / incoming - 0.62) < 0.01);
      assert.ok(a * a + b * b < incoming * incoming);
      hit = true;
      break;
    }
  }
  assert.ok(hit);
});

test('桌面模型：带内碰撞保持总能量耗散并可从碰撞后快照接管', (t) => {
  const initial = [puck(0, 1.2, -14), puck(1, 0.5, -11.6)];
  const source = world(t, initial);
  source.launch(0, 0, 1.2, -14, 0);
  const energy = () => source.snapshot().reduce((sum, p) => {
    const side = p.y < M(0) ? 0 : p.y > M(1) ? 1 : -1;
    const depth = side >= 0 ? -A(side) * (p.y - M(side)) : 0;
    return sum + (p.vx ** 2 + p.vy ** 2 + 0.5 * p.av ** 2 +
      94 * depth ** 2 + 94 * p.bandTangent ** 2) / 2;
  }, 0);
  let previous = energy(), restored = null;
  for (let i = 0; i < 65; i++) {
    const events = [];
    source.step(events);
    const current = energy();
    assert.ok(current <= previous + 0.002, '动能与带储能之和不得因碰撞增大');
    previous = current;
    if (restored) {
      restored.step();
      const actual = source.snapshot(), replay = restored.snapshot();
      for (let index = 0; index < actual.length; index++) {
        for (const key of ['x', 'y', 'vx', 'vy', 'av', 'bandTangent'])
          assert.ok(Math.abs(actual[index][key] - replay[index][key]) < 0.015, `${index}/${key}`);
      }
    } else if (events.some((e) => e.k === 'puck')) {
      const snapshot = source.snapshot();
      assert.ok(snapshot.every((p) => p.bandSide === 0));
      restored = world(t, initial);
      restored.restore(snapshot);
    }
  }
  assert.ok(restored, '必须覆盖带内真实碰撞后的恢复');
});

test('桌面模型：靠边抓带点仍能用斜拉实际穿门', (t) => {
  for (const sign of [-1, 1]) {
    const raw = ut(0, 0, sign * 6, sign * 28 * Math.PI / 180, 3.198);
    const aim = ct(0, raw.cx, raw.px, raw.py, []);
    assert.ok(aim.ok);
    const w = world(t, [puck(0, 0, -6)]);
    w.launch(0, aim.cx, aim.px, aim.py, 0);
    let passed = false;
    for (let i = 0; i < 160; i++) {
      w.step();
      if (w.find(0).body.translation().y > 0) { passed = true; break; }
    }
    assert.ok(passed, `cx=${raw.cx} 应能真实穿过中门`);
  }
});

test('桌面模型：硬 CCD 保留挡板与外墙防穿越', (t) => {
  const divider = world(t, [puck(0, 4, -1.8)]);
  divider.find(0).body.setLinvel({ x: 0, y: 400 }, true);
  const wall = world(t, [puck(0, 8, -4)]);
  wall.find(0).body.setLinvel({ x: 1000, y: 0 }, true);
  for (let i = 0; i < 8; i++) {
    divider.step(); wall.step();
    assert.ok(divider.find(0).body.translation().y < -1.35);
    assert.ok(Math.abs(wall.find(0).body.translation().x) < 8.55);
  }
});

test('桌面模型：低速滑动与轻压带停稳后休眠', (t) => {
  for (const onBand of [false, true]) {
    const w = world(t, [puck(0, 0, onBand ? -10.52 : -6)]);
    if (!onBand) w.find(0).body.setLinvel({ x: 4, y: 0 }, true);
    for (let i = 0; i < 90; i++) w.step();
    assert.equal(w.speedOf(0), 0);
    assert.equal(w.find(0).body.angvel(), 0);
    assert.equal(w.step(), false);
  }
});
