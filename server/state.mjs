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
  }
}
type('uint8')(PuckState.prototype, 'id');
type('number')(PuckState.prototype, 'x');
type('number')(PuckState.prototype, 'y');
type('number')(PuckState.prototype, 'a');
type('uint8')(PuckState.prototype, 'c');
type('int8')(PuckState.prototype, 'held');

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

export class GameState extends Schema {
  constructor() {
    super();
    this.serverTime = 0;
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
