// 展示层预测：只发送操作，位置与胜负始终由服务器决定。
export const MAX_PREDICTION_MS = 250;
const STEP_MS = 1000 / 120;
const FX_MAX_AGE_MS = 50;
const FX_REPEAT_MS = 100;
const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

// 快照和 ping 只校准目标偏差，不能直接改写正在播放的物理时间。
export class PredictionClock {
  constructor() { this.reset(); }

  reset() {
    this.phase = null;
    this.latest = null;
    this.targetOffset = 0;
    this.lead = 0;
    this.time = 0;
    this.at = null;
  }

  receive(time, at, rtt = 0, phase = 'playing') {
    if (!Number.isFinite(time) || !Number.isFinite(at)) return;
    if (this.phase === phase && this.latest !== null && time < this.latest) return;
    // 包含下行快照延迟与本地出手的上行提前量，不能简单换成 RTT / 2。
    const lead = Number.isFinite(rtt) ? Math.max(0, Math.min(MAX_PREDICTION_MS, rtt)) : 0;
    const offset = time + lead - at;
    if (this.at === null || this.phase !== phase) {
      this.time = time + lead;
      this.at = at;
      this.targetOffset = offset;
    } else this.targetOffset += (offset - this.targetOffset) * 0.1;
    this.phase = phase;
    this.latest = time;
    this.lead = lead;
  }

  sample(at) {
    if (this.at === null) return null;
    const elapsed = Math.max(0, at - this.at);
    const next = this.time + elapsed;
    if (this.latest > next) {
      // 断流后权威棋盘已超过可播放的时间；在采样时接管最新状态，
      // 也覆盖 WebSocket 把积压的 10Hz 补丁逐个补发的情况。
      this.time = this.latest + this.lead;
      this.targetOffset = this.time - at;
    } else {
      const error = at + this.targetOffset - next;
      // 正常播放最多调整 5% 速度，避免包抖动或延迟读数更新导致倒退、突进。
      const adjustment = Math.max(-elapsed * 0.05, Math.min(elapsed * 0.05, error));
      this.time = Math.max(this.time,
        Math.min(this.latest + MAX_PREDICTION_MS, next + adjustment));
    }
    // 断流时同时冻结时钟、丢弃积压；恢复后不会连续多秒顶着外推上限。
    this.at = Math.max(this.at, at);
    return this.time;
  }
}

export class LocalPrediction {
  constructor(createWorld, dropSpot = (drop) => ({ x: drop.x, y: drop.y })) {
    this.createWorld = createWorld;
    this.dropSpot = dropSpot;
    this.world = null;
    this.snapshot = null;
    this.commands = new Map();
    this.localHold = null;
    this.current = [];
    this.previous = [];
    this.render = [];
    this.corrections = new Map();
    this.enabled = false;
    this.dirty = false;
    this.time = 0;
    this.lastSample = null;
    this.steps = 0;
    this.stepEvents = [];
    this.feedbackThrough = -Infinity;
    this.lastImpact = new Map();
  }

  receive(pucks, time, phase = 'playing', acknowledgements = {}) {
    this.enabled = pucks.length > 0 && pucks.every((p) =>
      [p.x, p.y, p.a, p.vx, p.vy, p.av, p.bandTangent].every(Number.isFinite) &&
      [-1, 0, 1].includes(p.bandSide));
    if (!this.enabled) {
      this.clear();
      return;
    }
    if (this.snapshot && time < this.snapshot.time && phase === this.snapshot.phase) return;
    if (phase !== 'playing' || phase !== this.snapshot?.phase) {
      this.commands.clear();
      this.localHold = null;
      this.feedbackThrough = -Infinity;
      this.lastImpact.clear();
    }
    this.snapshot = { pucks, time, phase, ...acknowledgements };
    if (this.localHold && this.localHold.seq <= this.snapshot.inputSeq) this.localHold = null;
    for (const [id, command] of this.commands) {
      if (this.includes(command) || (!command.confirmed && time - command.time > 1000)) {
        this.commands.delete(id);
      }
    }
    this.dirty = true;
  }

  includes(command) {
    if (command.local && Number.isInteger(command.shot.seq) &&
        Number.isInteger(this.snapshot.inputSeq)) {
      return command.shot.seq <= this.snapshot.inputSeq;
    }
    const count = this.snapshot.shots?.[command.shot.side];
    if (Number.isInteger(command.shot.shotNumber) && Number.isInteger(count)) {
      return command.shot.shotNumber <= count;
    }
    // 兼容旧快照：同一物理时刻可能先发快照再处理输入，不能用 <= 推断已包含。
    return command.confirmed && command.authoritativeTime < this.snapshot.time;
  }

  shoot(shot, time, confirmed = false) {
    if (!this.enabled || !Number.isFinite(time)) return false;
    if (!confirmed) {
      time = Math.min(time, this.snapshot.time + MAX_PREDICTION_MS);
      if (this.localHold?.id === shot.puckId) this.localHold = null;
    }
    const pending = this.commands.get(shot.puckId);
    if (confirmed && ((pending?.local && pending.shot.side === shot.side && pending.shot.seq > shot.seq) ||
        (this.localHold?.id === shot.puckId && this.localHold.side === shot.side && this.localHold.seq > shot.seq))) {
      return true; // 同一球后续抓放已经开始，较早的确认不能覆盖它。
    }
    if (confirmed && pending?.kind === 'shot' &&
        (shot.seq === undefined || pending.shot.seq === shot.seq)) {
      // ACK 只确认已经执行的本地操作；重放会把球拉回松手点。
      Object.assign(pending, { shot, confirmed: true, authoritativeTime: time });
      if (this.includes(pending)) {
        this.commands.delete(shot.puckId);
        this.dirty = true;
      }
      return true;
    }
    const command = { kind: 'shot', shot, time, confirmed, local: !confirmed,
      authoritativeTime: confirmed ? time : null, applied: false };
    if (confirmed && this.includes(command)) {
      this.commands.delete(shot.puckId);
    } else {
      this.commands.set(shot.puckId, command);
    }
    this.dirty = true;
    return true;
  }

  hold(id, side, seq) {
    if (!this.enabled) return;
    // 快速放下再抓起时，旧的放球预测不能在重建后重新启用碰撞体。
    this.commands.delete(id);
    this.localHold = { id, side, seq };
    this.world?.hold(id);
    this.dirty = true;
  }

  releaseHold(drop, time) {
    this.localHold = null;
    if (this.enabled && drop && Number.isFinite(time)) {
      time = Math.min(time, this.snapshot.time + MAX_PREDICTION_MS);
      this.commands.set(drop.puckId, { kind: 'drop', shot: drop, time,
        confirmed: false, local: true, applied: false });
    }
    this.dirty = true;
  }

  reject(seq) {
    for (const [id, command] of this.commands) {
      if (!command.confirmed && (seq === undefined || command.shot.seq === seq)) this.commands.delete(id);
    }
    this.corrections.clear();
    if (seq === undefined || this.localHold?.seq === seq) this.localHold = null;
    this.dirty = true;
  }

  read(target) {
    this.world.readInto(target);
    for (let i = 0; i < target.length; i++) {
      const puck = target[i];
      puck.held = this.localHold?.id === puck.id ? this.localHold.side
        : this.commands.get(puck.id)?.applied ? undefined
          : this.snapshot.pucks.find((p) => p.id === puck.id)?.held;
    }
  }

  apply(command) {
    const s = command.shot;
    if (command.kind === 'drop') {
      const spot = this.dropSpot(s, this.current);
      this.world.place(s.puckId, spot.x, spot.y);
    } else this.world.launch(s.puckId, s.cx, s.px, s.py, s.side);
    command.applied = true;
    this.read(this.current);
    const index = this.current.findIndex((p) => p.id === s.puckId);
    if (index >= 0) Object.assign(this.previous[index], this.current[index]);
  }

  sample(targetTime, impacts = null) {
    if (!this.enabled || !this.snapshot) return null;
    const snap = this.snapshot;
    const target = snap.time + (snap.phase === 'playing'
      ? Math.max(0, Math.min(MAX_PREDICTION_MS, targetTime - snap.time)) : 0);
    const rebuilding = this.dirty;
    if (rebuilding) {
      this.world ||= this.createWorld(snap.pucks);
      this.world.restore(snap.pucks);
      if (this.localHold) this.world.hold(this.localHold.id);
      this.time = snap.time;
      for (const command of this.commands.values()) command.applied = false;
      this.read(this.current);
      this.previous = this.current.map((p) => ({ ...p }));
      this.dirty = false;
    }
    while (this.time + STEP_MS <= target + 1e-6) {
      for (const command of this.commands.values()) {
        if (!command.applied && command.time <= this.time + STEP_MS) {
          this.apply(command);
        }
      }
      [this.previous, this.current] = [this.current, this.previous];
      const stepTime = this.time + STEP_MS;
      // 快照重放与后台追帧只修正位置，不补播过期的声音/粒子。
      const feedback = impacts && stepTime > this.feedbackThrough + 1e-3 &&
        stepTime >= target - FX_MAX_AGE_MS;
      this.stepEvents.length = 0;
      this.world.step(feedback ? this.stepEvents : undefined);
      this.read(this.current);
      this.time = stepTime;
      if (feedback) {
        for (const event of this.stepEvents) {
          const key = event.k === 'puck'
            ? `puck:${Math.min(event.a, event.b)}:${Math.max(event.a, event.b)}`
            : `${event.k}:${event.a}:${event.s ?? event.edge ?? ''}:${event.k === 'wall'
              ? Math.sign(event.edge === 'side' ? event.x : event.y) : ''}`;
          if (stepTime - (this.lastImpact.get(key) ?? -Infinity) < FX_REPEAT_MS) continue;
          this.lastImpact.set(key, stepTime);
          impacts.push(event);
        }
      }
      this.feedbackThrough = Math.max(this.feedbackThrough, stepTime);
      this.steps++;
    }
    // 松手发生在两个固定子步之间时，也立即显示在松手位置。
    for (const command of this.commands.values()) {
      if (!command.applied && command.time <= target) this.apply(command);
    }
    const alpha = Math.max(0, Math.min(1, (target - this.time) / STEP_MS));
    const dt = this.lastSample === null ? 0 : Math.max(0, targetTime - this.lastSample);
    this.lastSample = targetTime;
    const decay = Math.exp(-dt / 55);
    for (let i = 0; i < this.current.length; i++) {
      const current = this.current[i], previous = this.previous[i] || current;
      const held = current.held;
      const x = held === undefined ? previous.x + (current.x - previous.x) * alpha : current.x;
      const y = held === undefined ? previous.y + (current.y - previous.y) * alpha : current.y;
      const a = previous.a + angleDelta(previous.a, current.a) * alpha;
      const old = this.render[i];
      if (rebuilding) {
        const expectedX = old ? old.x + old.vx * Math.min(dt, 32) / 1000 : x;
        const expectedY = old ? old.y + old.vy * Math.min(dt, 32) / 1000 : y;
        // 只消除细小校正抖动；抓取、重开及较大误差立即服从权威状态。
        if (snap.phase === 'playing' && old?.id === current.id &&
            old.held === undefined && held === undefined &&
            Math.hypot(expectedX - x, expectedY - y) < 0.45) {
          this.corrections.set(current.id, { x: expectedX - x, y: expectedY - y,
            a: angleDelta(a, old.a) });
        } else this.corrections.delete(current.id);
      }
      const correction = this.corrections.get(current.id);
      if (correction) {
        correction.x *= decay;
        correction.y *= decay;
        correction.a *= decay;
      }
      const output = this.render[i] ||= {};
      Object.assign(output, current, { x: x + (correction?.x || 0),
        y: y + (correction?.y || 0), a: a + (correction?.a || 0), held });
    }
    this.render.length = this.current.length;
    return this.render;
  }

  clear() {
    this.world?.free();
    this.world = null;
    this.snapshot = null;
    this.commands.clear();
    this.localHold = null;
    this.corrections.clear();
    this.stepEvents.length = 0;
    this.lastImpact.clear();
    this.feedbackThrough = -Infinity;
    this.current.length = this.previous.length = this.render.length = 0;
    this.enabled = false;
    this.lastSample = null;
  }
}
