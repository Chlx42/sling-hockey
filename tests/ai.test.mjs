import test from 'node:test';
import assert from 'node:assert/strict';
import { Be, Rt, Vt, rn, tn, k } from '../engine/index.mjs';

const random = (seed) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};

test('极限 AI 在两侧均能通过真实抓取和出手校验并送球过门', () => {
  for (const side of [0, 1]) {
    const game = new Rt({ matchTime: 60, overtime: 0 });
    try {
      const initial = game.count(side);
      const plan = rn(game.getPucks(), side, Vt.extreme, random(42), {
        canUse: (id) => game.canGrab(side, id) === null,
        now: () => 0,
      });
      assert.ok(plan);
      assert.ok(game.grab(side, plan.shot.puckId).ok);
      game.moveHold(side, plan.shot.px, plan.shot.py);
      assert.ok(game.shoot(side, plan.shot).ok);
      for (let step = 0; step < 840; step++) game.update(k);
      assert.ok(game.count(side) < initial, '按真实物理执行后应有净送出');
    } finally {
      game.world.free();
    }
  }
});

test('极限 AI 尊重当前可抓球限制，没有可抓球时不出手', () => {
  const game = new Rt();
  try {
    assert.equal(rn(game.getPucks(), 0, Vt.extreme, random(1), {
      canUse: () => false,
    }), null);
    const plan = rn(game.getPucks(), 0, Vt.extreme, random(1), {
      canUse: (id) => id === 4,
      now: () => 0,
    });
    assert.equal(plan.shot.puckId, 4);
    assert.ok(game.grab(0, plan.shot.puckId).ok);
    assert.ok(game.shoot(0, plan.shot).ok);
  } finally {
    game.world.free();
  }
});

test('极限搜索在计算预算耗尽时收敛，取消后不再继续搜索', () => {
  let elapsed = 0, result, yields = 0;
  const search = tn(Be(), 0, Vt.extreme, random(42), { now: () => elapsed });
  do {
    result = search.next();
    elapsed += 20;
    assert.ok(++yields < 2000, '预算耗尽后必须有界结束');
  } while (!result.done);
  assert.ok(result.value?.shot);
  assert.ok(result.value.evaluated <= 12, '保底候选完成后不再搜索或追加稳健样本');

  const cancelled = tn(Be(), 0, Vt.extreme, random(3));
  assert.equal(cancelled.next().done, false);
  assert.deepEqual(cancelled.return(null), { value: null, done: true });
  assert.equal(cancelled.next().done, true);
});
