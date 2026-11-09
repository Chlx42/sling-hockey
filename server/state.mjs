// Colyseus 0.18 状态定义：与原版客户端动态解码字段一一对应
// （原版客户端不含预编译 schema 类，服务端握手下发字段规范，客户端动态解码）
import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema';

export class PuckState extends Schema {
  constructor() {
    super();
    this.id = 0;
    this.x = 0;
    this.y = 0;
    this.a = 0;
    this.c = 0;
    this.held = -1; // -1 未被持有，0/1 为持有方
    this.vx = 0;
    this.vy = 0;
    this.av = 0;
    this.launchStep = -1;
    this.launchCx = 0;
    this.launchPx = 0;
    this.launchPy = 0;
    this.launchSide = -1;
    this.bandSide = -1;
    this.bandTangent = 0;
  }
}
type('uint8')(PuckState.prototype, 'id');
type('float32')(PuckState.prototype, 'x');
type('float32')(PuckState.prototype, 'y');
type('float32')(PuckState.prototype, 'a');
type('uint8')(PuckState.prototype, 'c');
type('int8')(PuckState.prototype, 'held');
type('float32')(PuckState.prototype, 'vx');
type('float32')(PuckState.prototype, 'vy');
type('float32')(PuckState.prototype, 'av');
type('int16')(PuckState.prototype, 'launchStep');
type('float32')(PuckState.prototype, 'launchCx');
type('float32')(PuckState.prototype, 'launchPx');
type('float32')(PuckState.prototype, 'launchPy');
type('int8')(PuckState.prototype, 'launchSide');
type('int8')(PuckState.prototype, 'bandSide');
type('float32')(PuckState.prototype, 'bandTangent');

export class AimState extends Schema {
  constructor() {
    super();
    this.active = false;
    this.puckId = 0;
    this.pull = false;
    this.x = 0;
    this.y = 0;
    this.cx = 0;
  }
}
type('boolean')(AimState.prototype, 'active');
type('uint8')(AimState.prototype, 'puckId');
type('boolean')(AimState.prototype, 'pull');
type('number')(AimState.prototype, 'x');
type('number')(AimState.prototype, 'y');
type('number')(AimState.prototype, 'cx');

export class PlayerState extends Schema {
  constructor() {
    super();
    this.name = '';
    this.side = 0;
    this.wins = 0;
    this.rematch = false;
    this.shots = 0;
    this.passes = 0;
    this.connected = true;
    this.reconnectLeft = 0;
    this.inputSeq = 0;
  }
}
type('string')(PlayerState.prototype, 'name');
type('uint8')(PlayerState.prototype, 'side');
type('uint16')(PlayerState.prototype, 'wins');
type('boolean')(PlayerState.prototype, 'rematch');
type('uint16')(PlayerState.prototype, 'shots');
type('uint16')(PlayerState.prototype, 'passes');
type('boolean')(PlayerState.prototype, 'connected');
type('number')(PlayerState.prototype, 'reconnectLeft');
type('uint32')(PlayerState.prototype, 'inputSeq');

export class GameState extends Schema {
  constructor() {
    super();
    this.serverTime = 0;
    this.physicsDelay = 0; // 最后物理子步距发送时间的毫秒数，避免重复传完整 epoch 时间戳。
    this.phase = 'waiting'; // waiting | starting | playing | over
    this.timeLeft = 0; // ×10
    this.matchTime = 0; // ×10
    this.otTime = 0; // ×10
    this.overtime = false;
    this.countdown = 0;
    this.winner = -1;
    this.reason = '';
    this.players = new MapSchema();
    this.pucks = new ArraySchema();
    this.aims = new ArraySchema(new AimState(), new AimState());
  }
}
type('number')(GameState.prototype, 'serverTime');
type('number')(GameState.prototype, 'physicsDelay');
type('string')(GameState.prototype, 'phase');
type('number')(GameState.prototype, 'timeLeft');
type('number')(GameState.prototype, 'matchTime');
type('number')(GameState.prototype, 'otTime');
type('boolean')(GameState.prototype, 'overtime');
type('number')(GameState.prototype, 'countdown');
type('int8')(GameState.prototype, 'winner');
type('string')(GameState.prototype, 'reason');
type({ map: PlayerState })(GameState.prototype, 'players');
type([PuckState])(GameState.prototype, 'pucks');
type([AimState])(GameState.prototype, 'aims');
