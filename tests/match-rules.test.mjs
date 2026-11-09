import test from 'node:test';
import assert from 'node:assert/strict';
import { Rt, k } from '../engine/index.mjs';

function game(t, counts = [1, 3]) {
  const result = new Rt(), pucks = [];
  for (let side = 0; side < 2; side++)
    for (let i = 0; i < counts[side]; i++)
      pucks.push({ id: pucks.length, x: -6 + i * 3, y: side ? 6 : -6, a: 0, color: side });
  result.reset(pucks);
  result.drainEvents();
  t.after(() => result.world.free());
  return result;
}

test('一分钟有领先或平局都进入两分钟加时，领先不会提前结束', (t) => {
  for (const counts of [[1, 3], [3, 1], [2, 2]]) {
    const match = game(t, counts);
    assert.equal(match.matchTime, 60);
    assert.equal(match.overtimeTime, 120);
    match.time = 60 - k * 1.5;
    match.stepOnce();
    assert.equal(match.overtime, false);
    match.stepOnce();
    assert.equal(match.phase, 'playing');
    assert.equal(match.overtime, true);
    assert.ok(Math.abs(match.timeLeft - 120) < k);
    assert.equal(match.drainEvents().filter((e) => e.type === 'overtime').length, 1);
    match.time = 61;
    match.stepOnce();
    match.time = 63;
    match.stepOnce();
    assert.equal(match.phase, 'playing', '加时领先不能触发金球结算');
    assert.equal(match.drainEvents().filter((e) => e.type === 'overtime').length, 0);
  }
});

test('两分钟加时结束才比较剩余棋子，相同则平局', (t) => {
  for (const [counts, winner] of [[[1, 3], 0], [[3, 1], 1], [[2, 2], -1]]) {
    const match = game(t, counts);
    match.time = 60;
    match.stepOnce();
    match.time = 180 - k * 1.5;
    match.stepOnce();
    assert.equal(match.phase, 'playing');
    match.stepOnce();
    assert.equal(match.phase, 'over');
    assert.equal(match.endReason, 'time');
    assert.equal(match.winner, winner);
  }
});

test('任一阶段最后一枚棋子穿门清空时立即获胜，优先于计时切换', (t) => {
  for (const side of [0, 1]) {
    for (const at of [10, 60 - k * 0.5, 90, 180 - k * 0.5]) {
      const match = game(t, [1, 1]), sign = side ? -1 : 1;
      match.time = at;
      match.overtime = at > 60;
      const body = match.world.find(side).body;
      body.setTranslation({ x: 0, y: -sign * 0.02 }, true);
      body.setLinvel({ x: 0, y: sign * 8 }, true);
      match.syncPucks();
      match.stepOnce();
      assert.equal(match.count(side), 0, '最后一枚棋子实际穿过洞口');
      assert.equal(match.phase, 'over');
      assert.equal(match.winner, side);
      assert.equal(match.endReason, 'clear');
      assert.equal(match.drainEvents().filter((e) => e.type === 'overtime').length, 0);
    }
  }
});
