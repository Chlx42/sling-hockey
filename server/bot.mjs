// AI 陪练：使用真实 Colyseus 客户端入队、进房，复用共享引擎的分片搜索。
import { M, tn, Vt, N } from '../engine/index.mjs';

let CHUNK = null;
async function chunk() {
  if (!CHUNK) CHUNK = await import('../client/vendor/colyseus-orig.js');
  return CHUNK;
}

const SEARCH_SLICE_MS = 2;
const AIM_INTERVAL_MS = 50;
const debug = (message) => {
  if (process.env.SLING_BOT_DEBUG) console.log(`[bot] ${message}`);
};

class BotRunner {
  constructor(room) {
    this.room = room;
    this.side = 0;
    this.phase = 'wait';
    this.wait = 0.8 + Math.random() * 0.6;
    this.t = 0;
    this.plan = null;
    this.anim = null;
    this.search = null;
    this.searchHandle = null;
    this.stopped = false;
    this.paused = false;
    this.prev = new Map();
    this.speeds = new Map();
    this.snapshotTime = 0;
    this.lastAimAt = -Infinity;
    this.lastTickAt = performance.now();

    room.onStateChange((state) => this.onState(state));
    room.onMessage('evt', (message) => {
      if (this.stopped) return;
      debug(`evt ${JSON.stringify(message)}`);
      if (message.type === 'match_failed') this.leave();
      else if (message.type === 'reject' && ['grab', 'aim', 'shoot'].includes(message.action)) {
        this.rest(0.5, true);
      }
    });
    room.onMessage('shot', (shot) => {
      if (!this.stopped && shot.side === this.side && shot.puckId === this.anim?.puckId) {
        this.rest(0.4 + Math.random() * 0.6);
      }
    });
    // fx/score 由服务器广播，机器人不需要渲染它们。
    room.onMessage('fx', () => {});
    room.onMessage('score', () => {});
    room.onDrop(() => {
      this.paused = true;
      this.rest(0.8);
    });
    room.onReconnect(() => {
      if (this.stopped) return;
      this.paused = false;
      this.prev.clear();
      this.speeds.clear();
      this.snapshotTime = 0;
      this.lastTickAt = performance.now();
      this.rest(0.8, true);
    });
    room.onLeave(() => this.stop());
    this.timer = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.1, Math.max(0, (now - this.lastTickAt) / 1000));
      this.lastTickAt = now;
      this.tick(dt);
    }, 16);
    this.onState(room.state);
  }

  cancelSearch() {
    if (this.searchHandle !== null) clearImmediate(this.searchHandle);
    this.searchHandle = null;
    // tn 的 finally 会释放搜索使用的 Rapier World 和 EventQueue。
    this.search?.return(null);
    this.search = null;
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    clearInterval(this.timer);
    this.cancelSearch();
    this.plan = null;
    this.anim = null;
    this.prev.clear();
    this.speeds.clear();
  }

  leave() {
    if (this.stopped) return;
    this.stop();
    this.room.leave().catch((error) => debug(`离房失败: ${error.message}`));
  }

  rest(wait, drop = false) {
    this.cancelSearch();
    if (drop && !this.paused && this.room.state?.phase === 'playing') {
      const held = this.room.state.pucks.find((p) => p.held === this.side);
      const pending = this.anim && this.room.state.pucks.find((p) => p.id === this.anim.puckId);
      const puck = held || pending;
      // grab 的确认可能仍在路上；drop 与 grab 使用同一有序连接。
      if (puck) this.room.send('drop', { x: puck.x, y: puck.y });
    }
    this.phase = 'wait';
    this.wait = wait;
    this.t = 0;
    this.plan = null;
    this.anim = null;
  }

  onState(state) {
    if (this.stopped || !state) return;
    if (state.phase !== 'playing') {
      this.rest(0.8);
      this.prev.clear();
      this.speeds.clear();
      this.snapshotTime = 0;
      // 一局结束即退出，避免没有真人的房间被机器人连接一直占用。
      if (state.phase === 'over') this.leave();
      return;
    }
    const me = state.players.get(this.room.sessionId);
    if (!me) return;
    this.side = me.side;
    const at = state.serverTime;
    if (!Number.isFinite(at) || at === this.snapshotTime) return;
    const dt = (at - this.snapshotTime) / 1000;
    for (const puck of state.pucks) {
      const previous = this.prev.get(puck.id);
      this.speeds.set(puck.id, previous && dt > 0
        ? Math.hypot(puck.x - previous.x, puck.y - previous.y) / dt : 0);
      this.prev.set(puck.id, { x: puck.x, y: puck.y });
    }
    this.snapshotTime = at;
  }

  grabbable(puck) {
    return !!puck && N(puck.y) === this.side &&
      (puck.held === undefined || puck.held === null || puck.held < 0) &&
      (this.speeds.get(puck.id) || 0) < 5;
  }

  think(state) {
    const pucks = state.pucks.map((p) => ({
      id: p.id, x: p.x, y: p.y, a: p.a, color: p.c,
      held: p.held >= 0 ? p.held : undefined,
    }));
    const usable = new Set(pucks.filter((p) => this.grabbable(p)).map((p) => p.id));
    const clock = { spent: 0, started: 0, running: false };
    this.search = tn(pucks, this.side, Vt.normal, Math.random, {
      canUse: (id) => usable.has(id),
      // 搜索预算只累计实际执行时间，不计 setImmediate 之间的排队等待。
      now: () => clock.spent + (clock.running ? performance.now() - clock.started : 0),
    });
    this.phase = 'think';
    const advance = () => {
      this.searchHandle = null;
      if (this.stopped || this.paused || this.room.state?.phase !== 'playing') {
        this.cancelSearch();
        return;
      }
      clock.started = performance.now();
      clock.running = true;
      try {
        do {
          const result = this.search.next();
          if (result.done) {
            this.search = null;
            this.plan = result.value;
            this.phase = 'plan';
            break;
          }
        } while (performance.now() - clock.started < SEARCH_SLICE_MS);
      } catch (error) {
        debug(`搜索失败: ${error.message}`);
        this.rest(0.5);
      } finally {
        clock.spent += performance.now() - clock.started;
        clock.running = false;
      }
      if (this.search) this.searchHandle = setImmediate(advance);
    };
    this.searchHandle = setImmediate(advance);
  }

  sendAim(aim, force = false) {
    const now = performance.now();
    if (!force && now - this.lastAimAt < AIM_INTERVAL_MS) return;
    this.lastAimAt = now;
    this.room.send('aim', aim);
  }

  tick(dt) {
    if (this.stopped || this.paused) return;
    const state = this.room.state;
    if (!state || state.phase !== 'playing') return;
    this.t += dt;
    if (this.phase === 'wait') {
      if (this.t >= this.wait) this.think(state);
      return;
    }
    if (this.phase === 'think') return;
    if (this.phase === 'plan') {
      const shot = this.plan?.shot;
      const puck = shot && state.pucks.find((p) => p.id === shot.puckId);
      if (!this.grabbable(puck)) return this.rest(0.3);
      this.anim = {
        puckId: shot.puckId,
        from: { x: puck.x, y: puck.y },
        toX: shot.cx,
        toY: M(this.side) + (this.side === 0 ? 0.02 : -0.02),
        px: shot.px, py: shot.py,
        phase: 'move', t: 0,
      };
      this.plan = null;
      this.phase = 'grab';
      this.t = 0;
      this.room.send('grab', { puckId: shot.puckId });
      return;
    }
    if (this.phase === 'grab') {
      const puck = state.pucks.find((p) => p.id === this.anim.puckId);
      if (puck?.held === this.side) {
        this.anim.from = { x: puck.x, y: puck.y };
        this.phase = 'anim';
        this.lastAimAt = -Infinity;
      } else if (this.t > 1) this.rest(0.5, true);
      return;
    }
    if (this.phase === 'shot') {
      if (this.t > 1.5) this.rest(0.5, true);
      return;
    }
    if (this.phase !== 'anim' || !this.anim) return;
    const a = this.anim;
    const held = state.pucks.find((p) => p.id === a.puckId);
    if (held?.held !== this.side) return this.rest(0.5);
    a.t += dt;
    const ease = (x) => 1 - Math.pow(1 - x, 2.2);
    if (a.phase === 'move') {
      const done = a.t >= 0.5;
      const r = ease(Math.min(1, a.t / 0.5));
      this.sendAim({ pull: false, x: a.from.x + (a.toX - a.from.x) * r,
        y: a.from.y + (a.toY - a.from.y) * r, cx: a.toX }, done);
      if (done) { a.phase = 'pull'; a.t = 0; }
    } else if (a.phase === 'pull') {
      const done = a.t >= 0.42;
      const r = ease(Math.min(1, a.t / 0.4));
      this.sendAim({ pull: true, x: a.toX + (a.px - a.toX) * r,
        y: a.toY + (a.py - a.toY) * r, cx: a.toX }, done);
      if (done) { a.phase = 'hold'; a.t = 0; }
    } else if (a.phase === 'hold' && a.t >= 0.12) {
      this.phase = 'shot';
      this.t = 0;
      this.room.send('shoot', { puckId: a.puckId, cx: a.toX, px: a.px, py: a.py });
    }
  }
}

export async function launchBot(name, queueId) {
  const { t: Client } = await chunk();
  const port = Number(process.env.PORT) || 3217;
  const client = new Client(`ws://127.0.0.1:${port}`);
  const pid = 'bot-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const options = { name: name || 'AI 陪练', rank: 1000, pid };
  const queue = queueId
    ? await client.joinById(queueId, options)
    : await client.joinOrCreate('queue', options);
  // 排队连接没有重连席位；断开后结束，避免孤立机器人持续重试。
  queue.reconnection.enabled = false;
  let consuming = false;
  let closed = false;
  let leaving = false;
  const leaveQueue = () => {
    if (closed || leaving) return;
    leaving = true;
    return queue.leave().catch((error) => debug(`离开队列失败: ${error.message}`));
  };
  const timeout = setTimeout(leaveQueue, 20000);
  queue.onMessage('clients', () => {});
  queue.onMessage('evt', (message) => {
    if (message.type === 'match_failed' && !consuming) leaveQueue();
  });
  queue.onMessage('seat', async (seat) => {
    if (consuming || closed || leaving) return;
    consuming = true;
    clearTimeout(timeout);
    queue.send('confirm');
    try {
      const game = await client.consumeSeatReservation(seat);
      new BotRunner(game);
    } catch (error) {
      console.error('[bot] 席位消费失败:', error?.message || error);
    } finally {
      await leaveQueue();
    }
  });
  queue.onLeave(() => {
    closed = true;
    clearTimeout(timeout);
  });
  return queue;
}
