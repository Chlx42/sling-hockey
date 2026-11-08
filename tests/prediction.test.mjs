import { test } from 'node:test';
import assert from 'node:assert/strict';
import { xt, Be, ut, k } from '../engine/index.mjs';
import { LocalPrediction, PredictionClock, MAX_PREDICTION_MS } from '../client/js/prediction.mjs';

const create = () => new LocalPrediction((pucks) => new xt(pucks));

test('快照到达抖动和 RTT 变化不会倒拨时钟或造成一帧追赶', () => {
  const clock = new PredictionClock(), epoch = 1794100000000;
  const delays = [40, 70, 25, 60, 35, 75, 30, 55, 40, 65];
  let packet = 0, previous = null;
  for (let frame = 0; frame < 60; frame++) {
    const now = frame * 1000 / 60;
    while (packet < delays.length && packet * 100 + delays[packet] <= now) {
      clock.receive(epoch + packet * 100, packet * 100 + delays[packet], packet < 6 ? 80 : 120);
      packet++;
    }
    const time = clock.sample(now);
    if (time === null) continue;
    if (previous !== null) {
      assert.ok(time - previous >= 15.8 && time - previous <= 17.6,
        `60fps 时不应倒退、停顿或突然补跑：${time - previous}ms`);
    }
    assert.equal(clock.sample(now), time, '同一帧输入与渲染共用一个时间');
    previous = time;
  }
  const latest = clock.sample(1000);
  clock.receive(epoch, 1000, 200);
  assert.equal(clock.sample(1000), latest, '过期快照不能改变正在播放的时刻');
});

test('断流冻结时钟；网络恢复、服务器暂停和重开分别正确接管', () => {
  const clock = new PredictionClock();
  clock.receive(1000, 40, 80);
  assert.equal(clock.sample(1000), 1250);
  assert.equal(clock.sample(2000), 1250, '冻结期间不积累需要补跑的时间');
  clock.receive(3000, 2040, 80);
  assert.equal(clock.sample(2040), 3080, '网络断流后接管新的权威窗口');
  assert.ok(clock.sample(2056) > 3095, '恢复后继续逐帧推进');

  clock.reset();
  clock.receive(1000, 40, 80);
  clock.sample(1000);
  for (let time = 1100; time <= 2000; time += 100) clock.receive(time, 1040, 80);
  assert.equal(clock.sample(1040), 2080, '积压的连续补丁集中到达，也应接管最新棋盘');
  assert.ok(clock.sample(1056) > 2095);

  clock.reset();
  clock.receive(1000, 40, 80);
  clock.sample(1000);
  clock.receive(1100, 1040, 80); // 服务器暂停后只完成了 100ms 物理。
  const resumed = clock.sample(1040);
  assert.ok(resumed >= 1250 && resumed <= 1292.001, '不得倒退或补算暂停期间的时间');
  assert.ok(clock.sample(1056) - resumed < 17, '服务器恢复后不突进到外推上限');
  clock.receive(4000, 1100, 80, 'starting');
  clock.receive(5000, 2100, 80, 'playing');
  assert.equal(clock.sample(2100), 5080, '新对局使用新的物理起点');
  clock.reset();
  assert.equal(clock.sample(2200), null);
});

test('10Hz 抖动快照下滑行、撞墙和球间碰撞持续贴合同源物理轨迹', () => {
  const epoch = 1794100000000, delays = [40, 70, 25, 60, 35, 75, 30, 55, 40, 65, 35, 40];
  for (const kind of ['slide', 'wall', 'puck']) {
    const pucks = [{ id: 0, x: kind === 'wall' ? 5 : -7, y: -5, a: 0, color: 0 }];
    if (kind === 'puck') pucks.push({ id: 1, x: 0, y: -5, a: 0, color: 1 });
    const source = new xt(pucks), prediction = create(), clock = new PredictionClock();
    const truth = [], packets = [];
    try {
      source.find(0).body.setLinvel({ x: kind === 'slide' ? 18 : 28, y: 0 }, true);
      for (let step = 0; step <= 156; step++) {
        truth.push(source.snapshot());
        if (step % 12 === 0 && step / 12 < delays.length) {
          const at = step / 120 * 1000;
          const snapshot = truth[step].map((p) => {
            const quantized = { ...p };
            for (const key of ['x', 'y', 'a', 'vx', 'vy', 'av'])
              quantized[key] = Math.fround(Math.round(p[key] * 1000) / 1000);
            return quantized;
          });
          packets.push({ time: epoch + at, at: at + delays[step / 12], pucks: snapshot });
        }
        source.step();
      }
      let maxError = 0;
      for (let frame = 0; frame < 72; frame++) {
        const now = frame * 1000 / 60;
        while (packets.length && packets[0].at <= now) {
          const packet = packets.shift();
          clock.receive(packet.time, packet.at, now < 600 ? 80 : 120);
          prediction.receive(packet.pucks, packet.time);
        }
        if (!prediction.enabled) continue;
        const time = clock.sample(now), actual = prediction.sample(time);
        const index = (time - epoch) / (k * 1000), step = Math.floor(index);
        const alpha = index - step;
        for (let i = 0; i < actual.length; i++) {
          const previous = truth[step - 1][i], current = truth[step][i];
          const x = previous.x + (current.x - previous.x) * alpha;
          const y = previous.y + (current.y - previous.y) * alpha;
          maxError = Math.max(maxError, Math.hypot(actual[i].x - x, actual[i].y - y));
        }
      }
      assert.ok(maxError < 0.06, `${kind} 最大轨迹偏差 ${maxError}，不应周期性回跳`);
    } finally { source.free(); prediction.clear(); }
  }
});

test('松手当帧即显示发射位置，ACK晚于最新快照也不重放', () => {
  const source = new xt(Be()), prediction = create();
  try {
    const pucks = source.snapshot();
    pucks[2].held = 0;
    prediction.receive(pucks, 1000);
    prediction.sample(1000);
    const shot = { ...ut(0, 2, 0, 0, 3.5), side: 0 };
    prediction.shoot(shot, 1010);
    const first = prediction.sample(1010)[2];
    assert.equal(first.held, undefined);
    assert.ok(Math.abs(first.y - shot.py) < 0.01);
    prediction.sample(1093);
    const before = prediction.world.snapshot()[2];
    prediction.shoot(shot, 1110, true);
    prediction.sample(1110);
    const after = prediction.world.snapshot()[2];
    assert.ok(after.launchStep > before.launchStep);
    assert.ok(after.y > before.y && after.y < -10, '确认不跳回抓取点或松手点');
    prediction.receive(pucks, 1100);
    assert.equal(prediction.commands.size, 1, '确认之前的快照不能抹掉已确认出手');
  } finally { source.free(); prediction.clear(); }
});

test('本地抓取立即移除旧位置碰撞体，拒绝后恢复权威状态', () => {
  const source = new xt([{ id: 0, x: 0, y: -5, a: 0, color: 0 },
    { id: 1, x: -3, y: -5, a: 0, color: 1 }]);
  const prediction = create();
  try {
    source.find(1).body.setLinvel({ x: 25, y: 0 }, true);
    prediction.receive(source.snapshot(), 1000);
    prediction.sample(1000);
    prediction.hold(0, 0);
    prediction.sample(1150);
    assert.equal(prediction.world.find(0).body.isEnabled(), false);
    assert.ok(prediction.world.find(1).body.translation().x > 0, '应通过被拿走球的原位置');
    prediction.reject();
    prediction.sample(1150);
    assert.equal(prediction.world.find(0).body.isEnabled(), true);
    assert.ok(prediction.world.speedOf(0) > 0, '恢复后仍由真实碰撞传递动量');
  } finally { source.free(); prediction.clear(); }
});

test('浏览器在两个快照间执行真实碰撞，断流后停止外推', () => {
  const source = new xt([{ id: 0, x: 8, y: -5, a: 0, color: 0 }]);
  const prediction = create();
  try {
    source.find(0).body.setLinvel({ x: 30, y: 0 }, true);
    prediction.receive(source.snapshot(), 1000);
    prediction.sample(1200);
    assert.ok(prediction.world.find(0).body.linvel().x < 0, '本地物理应撞墙反弹');
    assert.ok(prediction.render[0].x <= 8.51, '外推不能线性穿墙');
    const frozen = structuredClone(prediction.sample(5000));
    const steps = prediction.steps;
    assert.deepEqual(prediction.sample(10000), frozen);
    assert.equal(prediction.steps, steps);
    assert.ok(steps <= MAX_PREDICTION_MS / (k * 1000) + 1);
  } finally { source.free(); prediction.clear(); }
});

test('快照可恢复正在加速的弹射，预测轨迹与同源权威物理一致', () => {
  const source = new xt(Be());
  const prediction = create();
  try {
    const shot = ut(0, 2, 0, 0.12, 3.5);
    source.launch(2, shot.cx, shot.px, shot.py, 0);
    for (let i = 0; i < 4; i++) source.step();
    prediction.receive(source.snapshot(), 1000);
    prediction.sample(1100);
    for (let i = 0; i < 12; i++) source.step();
    const expected = source.snapshot(), actual = prediction.world.snapshot();
    for (let i = 0; i < expected.length; i++) {
      assert.ok(Math.hypot(actual[i].x - expected[i].x, actual[i].y - expected[i].y) < 0.015);
    }
  } finally { source.free(); prediction.clear(); }
});

test('出手不等网络确认，被拒后回到权威状态，晚到确认不会重放', () => {
  const source = new xt(Be());
  const prediction = create();
  try {
    const pucks = source.snapshot();
    pucks[2].held = 0;
    prediction.receive(pucks, 1000);
    prediction.sample(1000);
    const shot = { ...ut(0, 2, 0, 0, 3.5), side: 0 };
    assert.equal(prediction.shoot(shot, 1000), true);
    prediction.sample(1050);
    const body = prediction.world.find(2).body;
    assert.ok(body.isEnabled());
    assert.ok(body.linvel().y > 0);
    assert.ok(prediction.render[2].y < -10, '应在拖拽松手处立即发射');
    prediction.reject();
    prediction.sample(1060);
    assert.equal(body.isEnabled(), false);
    assert.equal(prediction.render[2].held, 0);
    prediction.receive(source.snapshot(), 1200);
    prediction.shoot(shot, 1100, true);
    assert.equal(prediction.commands.size, 0);
    prediction.sample(1200);
    assert.equal(prediction.world.isLaunching(2), false);
  } finally { source.free(); prediction.clear(); }
});

test('10Hz校正持续收敛，结束及重连释放预测状态，旧协议可退回插值', () => {
  const source = new xt(Be());
  const prediction = create();
  try {
    const shot = ut(0, 2, 0, -0.12, 3.5);
    source.launch(2, shot.cx, shot.px, shot.py, 0);
    for (let frame = 0; frame < 120; frame++) {
      const at = 1000 + frame * 1000 / 60;
      if (frame % 6 === 0) prediction.receive(source.snapshot(), at);
      prediction.sample(at);
      for (const p of prediction.render) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
      source.step(); source.step();
    }
    prediction.receive(source.snapshot(), 3000, 'over');
    const over = structuredClone(prediction.sample(3000));
    assert.deepEqual(prediction.sample(5000), over);
    prediction.clear();
    assert.equal(prediction.world, null);
    assert.equal(prediction.sample(5100), null);
    prediction.receive(Be(), 6000);
    assert.equal(prediction.enabled, false);
  } finally { source.free(); prediction.clear(); }
});
