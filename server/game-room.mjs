// 对局房间（Colyseus 0.18）：四态状态机 waiting → starting → playing → over
// 状态经 schema 动态解码下发，字段与原版客户端读取点一一对应
import { Room, CloseCode } from 'colyseus';
import { Rt, Be, ze } from '../engine/index.mjs';
import { GameState, PlayerState, PuckState } from './state.mjs';
import * as board from './leaderboard.mjs';

const START_COUNTDOWN = 3;
const RECONNECT_GRACE = 30;
const SEAT_FAIL_GRACE = 15;
const FX_TYPES = ['puck', 'wall', 'divider', 'band', 'launch'];

const fin = (v, lo, hi) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);

export class GameRoom extends Room {
  maxClients = 2;

  onCreate({ mode, matchTime, overtime } = {}) {
    this.mode = mode === 'friend' ? 'friend' : 'queue';
    this.engine = new Rt({ matchTime: matchTime ?? 180, overtime: overtime ?? 60 });
    this.engine.drainEvents();
    this.phase = 'waiting';
    this.countdown = 0;
    this.fxQueue = [];
    this.meta = { players: new Map() };

    this.setState(new GameState());
    this.state.phase = 'waiting';
    this.state.matchTime = Math.round(this.engine.matchTime * 10);
    this.state.otTime = Math.round(this.engine.overtimeTime * 10);
    this.state.winner = -1;
    this.onBeforePatch();
    this.setPatchRate(50); // 20Hz
    this.setSimulationInterval((dt) => this.tick(dt));

    // 队列房预订的席位超时未消费 → 通知已入场者重新匹配
    if (this.mode === 'queue') {
      this.clock.setTimeout(() => {
        if (this.phase === 'waiting' && this.clients.length < 2) {
          this.broadcast('evt', { type: 'match_failed' });
          this.disconnect();
        }
      }, SEAT_FAIL_GRACE * 1000);
    }

    this.onMessage('grab', (client, m) => {
      const p = this.meta.players.get(client.sessionId);
      if (!this.playing(p)) return;
      const r = this.engine.grab(p.side, m.puckId | 0);
      if (!r.ok) return this.reject(client, 'grab', r.reason);
      const hold = this.engine.holds[p.side];
      Object.assign(this.state.aims[p.side], { active: true, puckId: hold.puckId, pull: false, x: hold.x, y: hold.y, cx: hold.x });
    });
    this.onMessage('aim', (client, m) => {
      const p = this.meta.players.get(client.sessionId);
      if (!this.playing(p)) return;
      const hold = this.engine.holds[p.side];
      if (!hold || !ze(m.x) || !ze(m.y) || !ze(m.cx)) return;
      this.engine.moveHold(p.side, m.x, m.y);
      Object.assign(this.state.aims[p.side], { active: true, puckId: hold.puckId, pull: !!m.pull, x: hold.x, y: hold.y, cx: fin(m.cx, -8, 8) });
    });
    this.onMessage('shoot', (client, m) => {
      const p = this.meta.players.get(client.sessionId);
      if (!this.playing(p)) return;
      if (!ze(m.cx) || !ze(m.px) || !ze(m.py)) return;
      const r = this.engine.shoot(p.side, { puckId: m.puckId | 0, cx: fin(+m.cx, -8, 8), px: fin(+m.px, -9, 9), py: fin(+m.py, -16, 16) });
      if (!r.ok) {
        this.engine.drop(p.side);
        this.clearAim(p.side);
        return this.reject(client, 'shoot', r.reason);
      }
      this.clearAim(p.side);
      // 在下一次物理推进之前发送发射锚点，保持客户端插值时间一致。
      this.flushEvents();
    });
    this.onMessage('drop', (client, m) => {
      const p = this.meta.players.get(client.sessionId);
      if (!this.playing(p)) return;
      const r = this.engine.drop(p.side, fin(+m.x, -9, 9), fin(+m.y, -16, 16));
      this.clearAim(p.side);
      if (!r.ok) this.reject(client, 'drop', r.reason);
    });
    this.onMessage('rematch', (client) => {
      if (this.phase !== 'over') return;
      const p = this.meta.players.get(client.sessionId);
      if (!p) return;
      p.state.rematch = true;
      if (this.meta.players.size === 2 && [...this.meta.players.values()].every((q) => q.alive && q.state.rematch)) {
        this.startStarting();
      }
    });
    this.onMessage('rename', (client, m) => {
      const p = this.meta.players.get(client.sessionId);
      if (!p || this.phase !== 'over') return;
      const name = String(m.name || '').trim().slice(0, 24);
      p.state.name = name || p.state.name;
      client.send('renamed', { requestId: m.requestId | 0, name: p.state.name });
    });
  }

  playing(p) {
    return this.phase === 'playing' && !!p?.alive;
  }

  reject(client, action, reason) {
    client.send('evt', { type: 'reject', action, reason });
    if (process.env.SLING_BOT_DEBUG) console.log(`[game] reject sid=${client.sessionId} action=${action} reason=${reason}`);
  }

  clearAim(side) {
    this.state.aims[side].active = false;
    this.state.aims[side].pull = false;
  }

  onJoin(client, { name, pid }) {
    const used = [...this.meta.players.values()].map((p) => p.side);
    const side = used.includes(0) ? 1 : 0;
    const ps = new PlayerState();
    ps.name = String(name || '玩家').slice(0, 24);
    ps.side = side;
    ps.connected = true;
    this.state.players.set(client.sessionId, ps);
    this.meta.players.set(client.sessionId, { side, pid: String(pid || ''), client, state: ps, alive: true, leftAt: null });
    if (this.meta.players.size === 2) this.startStarting();
  }

  async onDrop(client) {
    const p = this.meta.players.get(client.sessionId);
    if (!p || (this.phase !== 'starting' && this.phase !== 'playing')) return;
    p.alive = false;
    p.leftAt = Date.now();
    p.state.connected = false;
    this.engine.drop(p.side);
    this.clearAim(p.side);
    try {
      p.client = await this.allowReconnection(client, RECONNECT_GRACE);
      p.alive = true;
      p.leftAt = null;
      p.state.connected = true;
      p.state.reconnectLeft = 0;
    } catch {
      // Colyseus 在重连失败后调用 onLeave，统一执行判负。
      p.state.reconnectLeft = 0;
    }
  }

  onLeave(client, code) {
    const p = this.meta.players.get(client.sessionId);
    if (!p) return;
    p.alive = false;
    p.leftAt = null;
    p.state.connected = false;
    p.state.reconnectLeft = 0;
    this.clearAim(p.side);
    if (this.phase === 'waiting') {
      this.state.players.delete(client.sessionId);
      this.meta.players.delete(client.sessionId);
    } else if (this.phase === 'playing' || this.phase === 'starting') {
      this.engine.forfeit(p.side, code === CloseCode.CONSENTED ? 'forfeit' : 'disconnect');
      this.flushEvents();
    }
    this.broadcast('evt', { type: 'opponent_left' });
  }

  startStarting() {
    this.lock();
    this.phase = 'starting';
    this.countdown = START_COUNTDOWN;
    this.engine.reset(Be());
    this.engine.drainEvents();
    this.fxQueue.length = 0;
    for (const p of this.meta.players.values()) {
      p.state.rematch = false;
      this.clearAim(p.side);
    }
    this.state.phase = 'starting';
    this.state.countdown = START_COUNTDOWN;
    this.state.winner = -1;
    this.state.reason = '';
    this.onBeforePatch();
  }

  finish() {
    if (this.phase === 'over') return;
    this.phase = 'over';
    const winner = this.engine.winner;
    this.state.phase = 'over';
    this.state.winner = winner;
    this.state.reason = this.engine.endReason;
    for (const p of this.meta.players.values()) {
      this.clearAim(p.side);
      if (this.mode === 'queue' && p.pid && !p.pid.startsWith('bot-')) board.record(p.pid, p.state.name, winner === p.side);
      if (winner === p.side) p.state.wins++;
    }
    this.onBeforePatch();
  }

  tick(dt) {
    dt = Math.min(dt / 1000, 0.05); // Colyseus 回调是毫秒，引擎接收秒。
    // 重连倒计时
    for (const p of this.meta.players.values()) {
      if (!p.alive && p.leftAt !== null && (this.phase === 'starting' || this.phase === 'playing')) {
        const left = Math.max(0, Math.ceil((RECONNECT_GRACE * 1000 - (Date.now() - p.leftAt)) / 1000));
        if (p.state.reconnectLeft !== left) p.state.reconnectLeft = left;
      }
    }
    if (this.phase === 'starting') {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.phase = 'playing';
        this.state.phase = 'playing';
        this.state.countdown = 0;
      } else {
        const cd = Math.max(0, Math.ceil(this.countdown));
        if (this.state.countdown !== cd) this.state.countdown = cd;
      }
      return;
    }
    if (this.phase !== 'playing') return;
    this.engine.update(dt, 24);
    this.flushEvents();
  }

  flushEvents() {
    for (const ev of this.engine.drainEvents()) {
      switch (ev.type) {
        case 'sfx':
          this.fxQueue.push([FX_TYPES.indexOf(ev.e.k), ev.e.x, ev.e.y, ev.e.v, ev.e.s ?? -1]);
          break;
        case 'shot':
          this.broadcast('shot', { ...ev.shot, t: Date.now() });
          break;
        case 'score':
          this.broadcast('score', ev.e);
          break;
        case 'over':
          this.finish();
          break;
      }
    }
    if (this.fxQueue.length) {
      this.broadcast('fx', this.fxQueue);
      this.fxQueue = [];
    }
  }

  onBeforePatch() {
    // 以 20Hz 写入完整快照，时间戳和位置对应同一批状态。
    this.state.serverTime = Date.now();
    this.state.timeLeft = Math.round(this.engine.timeLeft * 10);
    if (this.engine.overtime !== this.state.overtime) {
      this.state.overtime = this.engine.overtime;
      this.broadcast('evt', { type: 'overtime' });
    }
    for (const p of this.meta.players.values()) {
      p.state.shots = this.engine.shots[p.side];
      p.state.passes = this.engine.passes[p.side];
    }
    this.syncPucks();
  }

  onDispose() {
    this.engine.world.free();
  }

  syncPucks() {
    const pucks = this.engine.pucks;
    while (this.state.pucks.length < pucks.length) this.state.pucks.push(new PuckState());
    for (let i = 0; i < pucks.length; i++) {
      const src = pucks[i];
      let dst = this.state.pucks[i];
      if (!dst) dst = this.state.pucks[i] = new PuckState();
      dst.id = src.id;
      dst.x = src.x;
      dst.y = src.y;
      dst.a = src.a;
      dst.c = src.color;
      dst.held = src.held === undefined ? -1 : src.held;
    }
  }
}
