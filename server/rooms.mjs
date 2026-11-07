// 对局房间：权威服务器，四态状态机 waiting → starting → playing → over
// 状态字段与原版客户端 Schema 对齐（phase/players[wins,rematch,shots,passes]/matchTime/otTime/countdown…）
import { Rt, Be, ze, rn, Vt, A, M } from '../engine/index.mjs';

const MATCH_TIME = Number(process.env.SLING_MATCH_TIME) || 180;
const OVERTIME = Number(process.env.SLING_OVERTIME) || 60;
const RECONNECT_GRACE_MS = 30_000;
const START_COUNTDOWN = 3;

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newRoomCode(existing) {
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0];
    if (!existing.has(c)) return c;
  }
}

const fin = (v, lo, hi) => {
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
};

let SID_SEQ = 0;

// 服务器 AI 陪练：拟人节奏（等待→思考→抬→移→拉→停→放），复用客户端同款 AI 搜索
class BotController {
  constructor(side) {
    this.side = side;
    this.level = 'normal';
    this.phase = 'wait';
    this.wait = 0.6 + Math.random() * 0.6;
    this.t = 0;
    this.plan = null;
    this.anim = null;
  }

  tick(dt, engine) {
    if (engine.phase !== 'playing') return;
    this.t += dt;
    if (this.phase === 'wait') {
      if (this.t >= this.wait) {
        this.phase = 'think';
        this.t = 0;
        // rn 阻塞约 100-200ms，放到下一轮事件循环，避免卡住 tick
        setTimeout(() => {
          try {
            this.plan = rn(engine.getPucks(), this.side, Vt[this.level], Math.random, {
              canUse: (id) => engine.canGrab(this.side, id) === null,
            });
          } catch { this.plan = null; }
          this.thinkDone = true;
        }, 0);
      }
      return;
    }
    if (this.phase === 'think') {
      if (!this.thinkDone) return;
      this.phase = 'wait';
      this.t = 0;
      this.thinkDone = false;
      const plan = this.plan;
      this.plan = null;
      if (!plan || !plan.shot) { this.wait = 0.5; return; }
      const shot = plan.shot;
      const puck = engine.getPucks().find((p) => p.id === shot.puckId);
      if (!puck || !engine.grab(this.side, shot.puckId).ok) { this.wait = 0.3; return; }
      const bandY = M(this.side);
      this.anim = {
        puckId: shot.puckId,
        from: { x: puck.x, y: puck.y },
        toX: shot.cx,
        toY: bandY + (this.side === 0 ? 0.02 : -0.02),
        px: shot.px,
        py: shot.py,
        phase: 'lift',
        t: 0,
      };
      this.phase = 'anim';
      return;
    }
    if (this.phase === 'anim' && this.anim) {
      const a = this.anim;
      a.t += dt;
      const ease = (x) => 1 - Math.pow(1 - x, 2.2);
      if (a.phase === 'lift') {
        if (a.t >= 0.16) { a.phase = 'move'; a.t = 0; }
      } else if (a.phase === 'move') {
        const r = ease(Math.min(1, a.t / 0.5));
        engine.moveHold(this.side, a.from.x + (a.toX - a.from.x) * r, a.from.y + (a.toY - a.from.y) * r);
        if (a.t >= 0.5) { a.phase = 'pull'; a.t = 0; }
      } else if (a.phase === 'pull') {
        const r = ease(Math.min(1, a.t / 0.4));
        engine.moveHold(this.side, a.toX + (a.px - a.toX) * r, a.toY + (a.py - a.toY) * r);
        if (a.t >= 0.42) { a.phase = 'hold'; a.t = 0; }
      } else if (a.phase === 'hold') {
        if (a.t >= 0.12) {
          engine.shoot(this.side, { puckId: a.puckId, cx: a.toX, px: a.px, py: a.py });
          this.anim = null;
          this.phase = 'wait';
          this.wait = 0.4 + Math.random() * 0.6;
          this.t = 0;
        }
      }
    }
  }
}

const BOT_NAMES = ['退休球王', '冰球保安', '橡皮筋教授', '搓澡大侠', '弹弓师傅', '泡面董事长', '咸鱼教练', '挖掘机公主'];

export class MatchRoom {
  constructor(registry, mode) {
    this.reg = registry;
    this.mode = mode; // 'queue' | 'friend'
    this.code = mode === 'friend' ? newRoomCode(registry.codes) : null;
    if (this.code) registry.codes.add(this.code);
    this.players = new Map(); // sid -> player
    this.engine = new Rt({ matchTime: MATCH_TIME, overtime: OVERTIME });
    this.engine.drainEvents();
    this.phase = 'waiting';
    this.countdown = 0;
    this.createdAt = Date.now();
    this.fxQueue = [];
    this._stThrottle = 0;
  }

  send(sid, msg) {
    const p = this.players.get(sid);
    if (p && p.ws && p.ws.readyState === 1) {
      try { p.ws.send(JSON.stringify(msg)); } catch { /* 忽略发送失败 */ }
    }
  }

  broadcast(msg) {
    for (const sid of this.players.keys()) this.send(sid, msg);
  }

  // ---- 玩家进出 ----
  attach(ws, { name, pid, sid }, { deferState = false } = {}) {
    if (sid && this.players.has(sid)) {
      // 断线重连：恢复席位
      const p = this.players.get(sid);
      p.ws = ws;
      p.alive = true;
      p.leftAt = null;
      this.send(sid, { t: 'hello', sid, serverTime: Date.now(), resumed: true });
      this.broadcastState();
      this.broadcast({ t: 'evt', type: 'opponent_back' });
      return sid;
    }
    if (this.players.size >= 2) return null;
    if (!sid) sid = `s${++SID_SEQ}_${Date.now().toString(36)}`;
    const used = [...this.players.values()].map((p) => p.side);
    const side = used.includes(0) ? 1 : 0;
    const player = { sid, ws, name: String(name || '玩家').slice(0, 24), pid: String(pid || ''), side, alive: true, leftAt: null, rematch: false, wins: 0 };
    this.players.set(sid, player);
    this.send(sid, { t: 'hello', sid, serverTime: Date.now() });
    if (this.players.size === 2) this.startStarting();
    else if (!deferState) this.broadcastState();
    return sid;
  }

  addBot() {
    const used = [...this.players.values()].map((p) => p.side);
    const side = used.includes(0) ? 1 : 0;
    const sid = `bot_${Date.now().toString(36)}`;
    const name = 'AI 陪练·' + BOT_NAMES[(Math.random() * BOT_NAMES.length) | 0];
    this.players.set(sid, { sid, ws: null, name, pid: '', side, alive: true, leftAt: null, rematch: true, wins: 0, isBot: true, bot: new BotController(side) });
    this.startStarting();
    return sid;
  }

  startStarting() {
    this.phase = 'starting';
    this.countdown = START_COUNTDOWN;
    this._stThrottle = 0;
    this.engine.reset(Be());
    this.engine.drainEvents();
    for (const p of this.players.values()) p.rematch = false;
    this.broadcastState();
  }

  onLeave(sid) {
    const p = this.players.get(sid);
    if (!p) return;
    p.alive = false;
    p.leftAt = Date.now();
    p.ws = null;
    if (this.phase === 'playing') {
      this.broadcast({ t: 'evt', type: 'opponent_left' });
      // 30 秒未归判负
      setTimeout(() => {
        const q = this.players.get(sid);
        if (q && !q.alive && this.phase === 'playing') {
          this.engine.forfeit(q.side, 'disconnect');
          this.finish();
        }
      }, RECONNECT_GRACE_MS).unref?.();
    }
    this.broadcastState();
    // 全部离线超过宽限期 → 拆房
    setTimeout(() => {
      const anyAlive = [...this.players.values()].some((q) => q.alive);
      if (!anyAlive) this.reg.destroy(this);
    }, RECONNECT_GRACE_MS).unref?.();
  }

  destroy() {
    if (this.code) this.reg.codes.delete(this.code);
    for (const p of this.players.values()) p.ws = null;
    this.players.clear();
  }

  // ---- 消息处理 ----
  handleMessage(sid, m) {
    const p = this.players.get(sid);
    if (!p || !p.alive) return;
    if (this.phase === 'over' && !['rematch', 'rename', 'ping'].includes(m.t)) return;
    if (this.phase !== 'playing' && ['grab', 'aim', 'shoot', 'drop'].includes(m.t)) {
      this.send(sid, { t: 'evt', type: 'reject', action: m.t, reason: 'not_playing' });
      return;
    }

    switch (m.t) {
      case 'grab': {
        const puckId = m.puckId | 0;
        const r = this.engine.grab(p.side, puckId);
        if (!r.ok) this.send(sid, { t: 'evt', type: 'reject', action: 'grab', reason: r.reason });
        break;
      }
      case 'aim': {
        // 拖动位置或拉弓预览，转发给对手用于显示；数值做边界清洗
        const aim = {
          pull: !!m.pull,
          x: fin(+m.x, -10, 10),
          y: fin(+m.y, -16, 16),
          cx: fin(+m.cx, -8, 8),
          psi: fin(+m.psi, -1.3, 1.3),
        };
        for (const [other, q] of this.players) {
          if (other !== sid && q.alive) this.send(other, { t: 'aim', side: p.side, ...aim });
        }
        if (!aim.pull) this.engine.moveHold(p.side, aim.x, aim.y);
        break;
      }
      case 'shoot': {
        if (!ze(m.cx) || !ze(m.px) || !ze(m.py)) return;
        const r = this.engine.shoot(p.side, { puckId: m.puckId | 0, cx: fin(+m.cx, -8, 8), px: fin(+m.px, -9, 9), py: fin(+m.py, -16, 16) });
        if (!r.ok) this.send(sid, { t: 'evt', type: 'reject', action: 'shoot', reason: r.reason });
        break;
      }
      case 'drop': {
        const r = this.engine.drop(p.side, fin(+m.x, -9, 9), fin(+m.y, -16, 16));
        if (!r.ok) this.send(sid, { t: 'evt', type: 'reject', action: 'drop', reason: r.reason });
        break;
      }
      case 'rematch': {
        if (this.phase !== 'over') return;
        p.rematch = true;
        for (const q of this.players.values()) if (q.isBot) q.rematch = true; // 陪练随时应战
        const all = [...this.players.values()];
        if (this.players.size === 2 && all.every((q) => q.rematch)) {
          for (const q of all) q.side = q.side === 0 ? 1 : 0; // 换边重赛
          this.startStarting();
        } else {
          this.broadcastState();
        }
        break;
      }
      case 'rename': {
        const name = String(m.name || '').trim().slice(0, 24);
        p.name = name || p.name;
        this.send(sid, { t: 'renamed', requestId: m.requestId | 0, name: p.name });
        this.broadcastState();
        break;
      }
      case 'ping':
        this.send(sid, { t: 'pong', ts: m.ts | 0 });
        break;
    }
  }

  // ---- 每帧推进 ----
  tick(dt, snapTick) {
    if (this.phase === 'starting') {
      this.countdown -= dt;
      this._stThrottle -= dt;
      if (this.countdown <= 0) {
        this.phase = 'playing';
        this.broadcastState();
      } else if (this._stThrottle <= 0) {
        this._stThrottle = 0.2;
        this.broadcastState();
      }
      return;
    }
    if (this.phase !== 'playing') return;
    this.engine.update(dt, 24);
    for (const p of this.players.values()) {
      if (p.isBot && p.alive) p.bot.tick(dt, this.engine);
    }
    for (const ev of this.engine.drainEvents()) {
      switch (ev.type) {
        case 'sfx':
          this.fxQueue.push(ev.e);
          break;
        case 'shot':
          this.broadcast({ t: 'shot', side: ev.shot.side, puckId: ev.shot.puckId, cx: ev.shot.cx, px: ev.shot.px, py: ev.shot.py, at: Date.now() });
          break;
        case 'score':
          this.broadcast({ t: 'score', e: ev.e });
          break;
        case 'over':
          this.finish();
          break;
      }
    }
    if (this.phase !== 'playing') return; // finish 可能已切换
    if (snapTick) this.broadcastState();
    if (this.fxQueue.length) {
      this.broadcast({ t: 'fx', e: this.fxQueue });
      this.fxQueue = [];
    }
  }

  broadcastState() {
    const players = [...this.players.values()].filter((p) => p.alive);
    const msg = {
      t: 'st',
      st: Date.now(),
      ph: this.phase,
      tl: Math.round(this.engine.timeLeft * 10),
      mt: Math.round(this.engine.matchTime * 10),
      ot: Math.round(this.engine.overtimeTime * 10),
      ov: this.engine.overtime ? 1 : 0,
      pk: this.engine.pucks.map((p) => [p.id, Math.round(p.x * 10), Math.round(p.y * 10), Math.round(p.a * 100), p.held === undefined ? -1 : p.held]),
      pl: players.map((p) => {
        const left = p.alive || !p.leftAt ? 0 : Math.max(0, Math.ceil((RECONNECT_GRACE_MS - (Date.now() - p.leftAt)) / 1000));
        return [p.sid, p.name, p.side, p.wins | 0, p.rematch ? 1 : 0, this.engine.shots[p.side] | 0, this.engine.passes[p.side] | 0, p.alive ? 1 : 0, left];
      }),
    };
    if (this.phase === 'starting') msg.cd = Math.max(0, Math.ceil(this.countdown));
    if (this.phase === 'over') {
      msg.winner = this.engine.winner;
      msg.reason = this.engine.endReason;
    }
    this.broadcast(msg);
  }

  finish() {
    if (this.phase === 'over') return;
    this.phase = 'over';
    const winner = this.engine.winner;
    for (const p of this.players.values()) {
      if (p.pid) this.reg.onResult?.(p.pid, p.name, winner === p.side);
    }
    if (winner === 0 || winner === 1) {
      for (const p of this.players.values()) {
        if (p.side === winner) p.wins++;
      }
    }
    this.broadcastState();
  }
}

// ---- 房间注册表 + 匹配大厅 ----
export class Registry {
  constructor({ onResult }) {
    this.rooms = new Set();
    this.codes = new Set();
    this.queue = []; // 等待匹配的 {ws, hello}
    this.onResult = onResult;
  }

  connRoom = new Map(); // ws -> {room, sid}

  destroy(room) {
    room.destroy();
    this.rooms.delete(room);
  }

  bind(conn, room, sid) {
    this.connRoom.set(conn, { room, sid });
  }

  attach(ws, hello) {
    if (hello.mode === 'resume') {
      const room = [...this.rooms].find((r) => r.players.has(hello.sid));
      if (!room) {
        ws.send(JSON.stringify({ t: 'evt', type: 'no_room' }));
        return null;
      }
      const sid = room.attach(ws, hello);
      if (sid) this.bind(ws, room, sid);
      return room;
    }
    if (hello.mode === 'join') {
      const target = hello.room ? [...this.rooms].find((r) => r.code === String(hello.room).toUpperCase() && r.phase !== 'over' && r.players.size < 2) : null;
      if (!target) {
        ws.send(JSON.stringify({ t: 'evt', type: 'no_room' }));
        return null;
      }
      const sid = target.attach(ws, hello);
      if (!sid) {
        ws.send(JSON.stringify({ t: 'evt', type: 'no_room' }));
        return null;
      }
      this.bind(ws, target, sid);
      return target;
    }
    if (hello.mode === 'create') {
      const room = new MatchRoom(this, 'friend');
      this.rooms.add(room);
      const sid = room.attach(ws, hello, { deferState: true });
      if (!sid) return null;
      this.bind(ws, room, sid);
      // 先发房间号再发首帧状态：适配器要在 roomId 就绪后进入 waiting
      ws.send(JSON.stringify({ t: 'room', code: room.code }));
      room.broadcastState();
      return room;
    }
    if (hello.mode === 'queue') {
      this.queue.push({ ws, hello });
      this.wsSend(ws, { t: 'queued', count: this.queue.length });
      this.tryMatch();
      return null;
    }
    ws.send(JSON.stringify({ t: 'evt', type: 'bad_hello' }));
    return null;
  }

  wsSend(ws, msg) {
    if (ws.readyState === 1) { try { ws.send(JSON.stringify(msg)); } catch {} }
  }

  tryMatch() {
    while (this.queue.length >= 2) {
      const a = this.queue.shift();
      const b = this.queue.shift();
      if (a.ws.readyState !== 1) { this.queue.unshift(b); continue; }
      if (b.ws.readyState !== 1) { this.queue.push(a); continue; }
      const room = new MatchRoom(this, 'queue');
      this.rooms.add(room);
      const sa = room.attach(a.ws, a.hello, { deferState: true });
      const sb = room.attach(b.ws, b.hello);
      if (sa) this.bind(a.ws, room, sa);
      if (sb) this.bind(b.ws, room, sb);
      this.queue.forEach((q, i) => this.wsSend(q.ws, { t: 'queued', count: i + 1 }));
    }
  }

  onClose(ws) {
    const qi = this.queue.findIndex((q) => q.ws === ws);
    if (qi >= 0) this.queue.splice(qi, 1);
    this.queue.forEach((q, i) => this.wsSend(q.ws, { t: 'queued', count: i + 1 }));
    const ref = this.connRoom.get(ws);
    if (ref) {
      this.connRoom.delete(ws);
      ref.room.onLeave(ref.sid);
    }
  }

  tick(dt, snapTick) {
    // 排队超时 → AI 陪练顶上
    const botAfter = Number(process.env.SLING_BOT_AFTER_MS) || 8000;
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const q = this.queue[i];
      q.waitMs = (q.waitMs || 0) + dt * 1000;
      if (q.waitMs >= botAfter && q.ws.readyState === 1) {
        this.queue.splice(i, 1);
        const room = new MatchRoom(this, 'queue');
        this.rooms.add(room);
        const sid = room.attach(q.ws, q.hello, { deferState: true });
        if (sid) {
          this.bind(q.ws, room, sid);
          room.addBot();
        }
      }
    }
    const qlen = this.queue.length;
    if (qlen !== this._lastQueueLen) {
      this._lastQueueLen = qlen;
      this.queue.forEach((q) => this.wsSend(q.ws, { t: 'queued', count: qlen + 1 }));
    }
    for (const room of [...this.rooms]) {
      room.tick(dt, snapTick);
      if (room.players.size === 0) {
        this.destroy(room);
        continue;
      }
      if (room.phase === 'over') {
        room._idleMs = (room._idleMs || 0) + dt * 1000;
        if (room._idleMs > 90_000) this.destroy(room);
      }
    }
  }
}
