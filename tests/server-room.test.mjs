import test from 'node:test';
import assert from 'node:assert/strict';
import { Encoder, Decoder } from '@colyseus/schema';
import { GameRoom, SIMULATION_INTERVAL_MS } from '../server/game-room.mjs';
import { GameState, PlayerState } from '../server/state.mjs';
import { Rt, ut, k } from '../engine/index.mjs';

function room(t, phase = 'playing') {
  const result = new GameRoom();
  Object.assign(result, {
    engine: new Rt(), state: new GameState(), phase, fxQueue: [],
    meta: { players: new Map() }, sent: [],
    broadcast(type, value) { this.sent.push({ type, value }); },
    setSimulationInterval() {},
  });
  t.after(() => result.onDispose());
  return result;
}

test('30Hz 房间调度保留 120Hz 固定物理与真实计时', (t) => {
  const r = room(t);
  for (let i = 0; i < 30; i++) r.tick(SIMULATION_INTERVAL_MS);
  assert.ok(Math.abs(r.engine.time - 1) < k);
  assert.equal(r.engine.steps, 120);
  const before = r.engine.steps;
  r.tick(10000);
  assert.equal(r.engine.steps - before, 12, '卡顿补算上限避免堆积');
});

test('网络快照包含量化运动与弹射进度，动态 Schema 完整解码', (t) => {
  const r = room(t), shot = ut(0, 2, 0, 0.12, 3.5);
  // 本地直接推进模拟，不等待墙钟；锚点应位于过去，不能制造未来快照。
  r.physicsEpoch = Date.now() - 100;
  assert.ok(r.engine.grab(0, 2).ok);
  assert.ok(r.engine.shoot(0, shot).ok);
  r.tick(SIMULATION_INTERVAL_MS);
  r.onBeforePatch();
  const encoder = new Encoder(r.state), decoded = new GameState();
  new Decoder(decoded).decode(encoder.encodeAll());
  assert.ok(Math.abs(decoded.serverTime - decoded.physicsDelay - r.lastPhysicsAt) <= 0.5);
  assert.ok(decoded.physicsDelay >= 0 && decoded.physicsDelay <= 255);
  const actual = decoded.pucks[2], expected = r.engine.pucks[2];
  for (const field of ['x', 'y', 'a', 'vx', 'vy', 'av', 'launchCx', 'launchPx', 'launchPy']) {
    assert.ok(Number.isFinite(actual[field]), field);
    assert.ok(Math.abs(actual[field] - expected[field]) < 0.00051, field);
  }
  assert.equal(actual.launchStep, expected.launchStep);
  assert.equal(actual.launchSide, 0);
  assert.ok(actual.launchStep >= 0);
  assert.ok(actual.vy > 0);
  assert.equal(actual.bandSide, 0);
  assert.ok(Math.abs(actual.bandTangent) > 0.001);
  assert.ok(Math.abs(actual.bandTangent - expected.bandTangent) < 1e-6,
    '带内切向形变必须随 Schema 保存，避免恢复后改变接触力');
});

test('等待与结算不发送空时间戳补丁，玩家状态仍正常同步', (t) => {
  for (const phase of ['waiting', 'starting', 'over']) {
    const r = room(t, phase);
    r.onBeforePatch();
    const encoder = new Encoder(r.state);
    encoder.encodeAll(); encoder.discardChanges();
    const before = r.state.serverTime;
    for (let i = 0; i < 10; i++) r.onBeforePatch();
    assert.equal(r.state.serverTime, before);
    assert.equal(encoder.encode().byteLength, 0, phase);
    r.state.countdown = 2;
    assert.ok(encoder.encode().byteLength > 0, '正常字段变化仍可编码');
  }
});

test('碰撞反馈限量批量发送，出手通知不等待快照', (t) => {
  const r = room(t);
  const remoteFx = [], localFx = [];
  for (const [side, local, received] of [[0, false, remoteFx], [1, true, localFx]]) {
    r.meta.players.set(`player-${side}`, {
      side, alive: true, localFx: local, state: new PlayerState(),
      client: { send(type, value) { received.push({ type, value: structuredClone(value) }); } },
    });
  }
  r.engine.emit({ type: 'shot', shot: { side: 0, puckId: 2 } });
  for (let i = 0; i < 80; i++) r.engine.emit({ type: 'sfx', e: { k: 'puck', x: 1, y: 2, v: 3 } });
  r.flushEvents();
  assert.equal(r.sent.length, 1);
  assert.equal(r.sent[0].type, 'shot');
  assert.equal(r.fxQueue.length, 32);
  assert.equal(remoteFx.length, 0, '碰撞反馈等待下一次快照批量发送');
  r.onBeforePatch();
  assert.equal(remoteFx.length, 1);
  assert.equal(remoteFx[0].type, 'fx');
  assert.equal(remoteFx[0].value.length, 32);
  assert.equal(localFx.length, 0, '启用本地碰撞反馈的玩家不接收远端反馈');
  assert.equal(r.fxQueue.length, 0);
  r.onBeforePatch();
  assert.equal(remoteFx.length, 1, '下一次快照不重复发送碰撞反馈');
  assert.equal(localFx.length, 0);
  assert.equal(r.sent.length, 1, '碰撞反馈只向订阅玩家发送，不进行全房间广播');
});

test('结束只结算一次且完整释放 Rapier 世界与事件队列', (t) => {
  const r = room(t);
  r.engine.forfeit(0, 'forfeit');
  r.flushEvents();
  assert.equal(r.phase, 'over');
  assert.equal(r.state.winner, 1);
  const previous = r.state.serverTime;
  r.finish();
  assert.equal(r.state.serverTime, previous);
  r.onDispose();
  assert.equal(r.engine.world.world, null);
  assert.equal(r.engine.world.queue, null);
});
