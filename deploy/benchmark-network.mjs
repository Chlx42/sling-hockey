// 对同一条 120Hz 物理轨迹比较旧 20Hz 与新 10Hz Schema 增量字节。
// 不含握手、WebSocket 包头或碰撞事件；包含新速度和弹射字段。
import { Schema, ArraySchema, type, Encoder } from '@colyseus/schema';
import { GameRoom } from '../server/game-room.mjs';
import { GameState } from '../server/state.mjs';
import { Rt, ut, k } from '../engine/index.mjs';

class LegacyPuck extends Schema {
  constructor() { super(); Object.assign(this, { id: 0, x: 0, y: 0, a: 0, c: 0, held: -1 }); }
}
for (const [key, value] of Object.entries({ id: 'uint8', x: 'number', y: 'number', a: 'number', c: 'uint8', held: 'int8' })) type(value)(LegacyPuck.prototype, key);
class LegacyState extends Schema {
  constructor() { super(); this.serverTime = 0; this.timeLeft = 0; this.pucks = new ArraySchema(); }
}
type('number')(LegacyState.prototype, 'serverTime');
type('number')(LegacyState.prototype, 'timeLeft');
type([LegacyPuck])(LegacyState.prototype, 'pucks');

function measure(active) {
  const engine = new Rt(), legacy = new LegacyState(), room = new GameRoom();
  Object.assign(room, { engine, state: new GameState(), phase: 'playing', fxQueue: [], meta: { players: new Map() }, broadcast() {} });
  const oldEncoder = new Encoder(legacy), nextEncoder = new Encoder(room.state);
  let oldBytes = 0, nextBytes = 0;
  const writeOld = (at) => {
    legacy.serverTime = at;
    legacy.timeLeft = Math.round(engine.timeLeft * 10);
    while (legacy.pucks.length < engine.pucks.length) legacy.pucks.push(new LegacyPuck());
    for (let i = 0; i < engine.pucks.length; i++) {
      const src = engine.pucks[i];
      Object.assign(legacy.pucks[i], { id: src.id, x: src.x, y: src.y, a: src.a, c: src.color, held: src.held ?? -1 });
    }
  };
  const at = (step) => 1_700_000_000_000 + Math.round(step * k * 1000);
  writeOld(at(0)); room.onBeforePatch(); room.state.serverTime = at(0);
  oldEncoder.encodeAll(); nextEncoder.encodeAll();
  oldEncoder.discardChanges(); nextEncoder.discardChanges();
  try {
    for (let step = 1; step <= 120 * 120; step++) {
      if (active && (step - 1) % 360 === 0) {
        engine.reset();
        const side = Math.floor(step / 360) % 2, id = side === 0 ? 2 : 7;
        engine.grab(side, id);
        engine.shoot(side, ut(side, id, 0, 0.1, 3.5));
      }
      engine.update(k);
      engine.drainEvents();
      if (step % 6 === 0) {
        writeOld(at(step)); oldBytes += oldEncoder.encode().byteLength; oldEncoder.discardChanges();
      }
      if (step % 12 === 0) {
        room.onBeforePatch(); room.state.serverTime = at(step);
        // 让物理时间偏移每包都变化，保守计入 30Hz/10Hz 计时器相位差的增量开销。
        room.state.physicsDelay = (step / 12) % 33;
        nextBytes += nextEncoder.encode().byteLength; nextEncoder.discardChanges();
      }
    }
  } finally { engine.world.free(); }
  return { scenario: active ? '连续弹射（每 3 秒重置并出手）' : '对局静止', seconds: 120,
    oldBytes, nextBytes, reductionPercent: Number(((1 - nextBytes / oldBytes) * 100).toFixed(1)) };
}
console.log(JSON.stringify([measure(false), measure(true)], null, 2));
