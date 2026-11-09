import * as n from '@dimforge/rapier2d-compat';
await n.init();
var T = 9.5,
  E = 15.5,
  D = 0.4,
  ye = 1.3,
  be = 11.5,
  xe = 0.12,
  Se = 10.5,
  O = 3.9,
  Ee = 0.4,
  Oe = (68 * Math.PI) / 180,
  MAX_SHOT_SPEED = 28,
  // 桌面接触统一处理滑动与自旋，避免再叠加独立的速度阻尼。
  je = 0,
  Me = 0,
  TABLE_DRAG = 8.5,
  BAND_STIFFNESS = 94,
  BAND_DAMPING = 2.8,
  BAND_TANGENT_STIFFNESS = 94,
  BAND_FRICTION = 0.25,
  DISK_INERTIA = 0.5, // I / m，半径为 1 的均匀圆盘。
  FRICTION_RADIUS = 2 / 3,
  MAX_PREVIEW_STEPS = 120,
  Ne = 0.62,
  Pe = 0.42,
  Fe = 0.35,
  Ie = 0.14,
  Le = 0.22,
  k = 1 / 120;
function A(e) {
  return e === 0 ? 1 : -1;
}
function j(e) {
  return +(e === 0);
}
function M(e) {
  return e === 0 ? -Se : Se;
}
function N(e) {
  return e < 0 ? 0 : 1;
}
function P(e, t) {
  let n = 0;
  for (let r of e) N(r.y) === t && n++;
  return n;
}
function Re(e) {
  let t = M(e),
    n = e === 0 ? -(D + 1) : D + 1;
  return {
    minX: -(T - 1),
    maxX: T - 1,
    minY: Math.min(t, n),
    maxY: Math.max(t, n),
  };
}
function F(e, t, n) {
  return e < t ? t : e > n ? n : e;
}
function ze(e) {
  return typeof e == `number` && Number.isFinite(e);
}
function Be() {
  let e = [-6.4, -3.2, 0, 3.2, 6.4],
    t = [8, 7, 6.4, 7, 8],
    n = [];
  for (let r = 0; r < 5; r++)
    n.push({ id: r, x: e[r], y: -t[r], a: 0, color: r % 2 });
  for (let r = 0; r < 5; r++)
    n.push({ id: 5 + r, x: -e[r], y: t[r], a: Math.PI, color: (r + 1) % 2 });
  return n;
}
function Ve(e, t) {
  return (
    Number.isFinite(e) &&
    Number.isFinite(t) &&
    Math.abs(e) <= 8.55 &&
    Math.abs(t) <= 14.55
  );
}
const L = 1;
function bandSide(y) {
  return y < M(0) ? 0 : y > M(1) ? 1 : -1;
}
// 主动拉带与被动回撞共用同一接触弹性近似。d 是法向压缩，q 是切向
// 弹性形变；单位质量储能为 (Kn*d² + Kt*q²)/2，不按发射/回撞切换刚度。
function bandImpulse(motion, y, contact) {
  const sign = A(contact.side), depth = -sign * (y - M(contact.side));
  if (depth <= 0) return;
  const normalVelocity = sign * motion.y;
  // 隐式弹簧/阻尼同时耗散压入与释放能量；单向接触不能吸住离开的球。
  const normal = Math.max(0, (BAND_STIFFNESS * depth -
    (BAND_DAMPING + BAND_STIFFNESS * k) * normalVelocity) /
    (1 + BAND_DAMPING * k + BAND_STIFFNESS * k * k));
  motion.y += sign * normal * k;
  // 绕带两侧张力的横向合力通过圆心；只有后缘滑移摩擦产生转矩。
  // 联立隐式弹簧与 Coulomb 摩擦，使 q 的储能和最终速度使用同一状态。
  const tangent = -sign, slip = tangent * motion.x - L * motion.w;
  const u = tangent * motion.x, denominator = 1 + BAND_TANGENT_STIFFNESS * k * k;
  const elastic = -BAND_TANGENT_STIFFNESS * k * (contact.tangent + k * u) / denominator;
  const coupling = BAND_TANGENT_STIFFNESS * k * k / denominator;
  const trial = -(slip + elastic) / (1 + L * L / DISK_INERTIA - coupling);
  const limit = BAND_FRICTION * normal * k;
  const friction = F(trial, -limit, limit);
  const impulse = elastic - coupling * friction + friction;
  motion.x += tangent * impulse;
  motion.w -= L * friction / DISK_INERTIA;
  contact.tangent += k * (u + impulse);
}
function tableFriction(motion) {
  // 均匀圆盘接触的椭圆近似：纯平移减速度为 TABLE_DRAG，
  // 纯自旋阻力矩为 (2/3)*摩擦力*半径；混合运动共享摩擦预算。
  const slip = Math.hypot(motion.x, motion.y, FRICTION_RADIUS * motion.w);
  if (slip === 0) return;
  const amount = TABLE_DRAG * k / slip;
  const linear = Math.max(0, 1 - amount);
  const angular = Math.max(0, 1 - amount * FRICTION_RADIUS ** 2 / DISK_INERTIA);
  motion.x *= linear;
  motion.y *= linear;
  motion.w *= angular;
  if (Math.hypot(motion.x, motion.y) < 0.015 && Math.abs(motion.w) < 0.02)
    motion.x = motion.y = motion.w = 0;
}
function launchMotion(plan, limit = MAX_PREVIEW_STEPS) {
  let x = plan.px, y = plan.py, steps = 0;
  const motion = { x: 0, y: 0, w: 0 };
  const contact = { side: plan.side, tangent: -A(plan.side) * (plan.px - plan.cx) };
  // 与实际发射共用受力、滑转摩擦和固定步长，包含斜拉产生的旋转；
  // 有限的纯数值预览不创建 WASM 世界，AI 碰撞候选仍使用完整物理。
  while (steps < limit && bandSide(y) === plan.side) {
    const previousX = x, previousTangent = contact.tangent;
    bandImpulse(motion, y, contact);
    tableFriction(motion);
    x += motion.x * k;
    y += motion.y * k;
    contact.tangent = previousTangent - A(plan.side) * (x - previousX);
    steps++;
    if (motion.x === 0 && motion.y === 0 && motion.w === 0) break;
  }
  return { x, y, vx: motion.x, vy: motion.y, av: motion.w, steps,
    speed: Math.hypot(motion.x, motion.y), released: bandSide(y) !== plan.side };
}
function et(pull) {
  return rt(0, 0, 0, M(0) - F(pull, 0, O)).speed;
}
function tt(side, cx, px, py, preview = true) {
  const dy = M(side) - py, dx = cx - px;
  const pull = Math.hypot(dx, dy);
  if (A(side) * dy <= 1e-6) return null;
  const plan = { side, cx, px, py, dx: dx / pull, dy: dy / pull, pull, dist: pull };
  if (!preview) return plan;
  const exit = launchMotion(plan);
  return Object.assign(plan, { steps: exit.steps, duration: exit.steps * k, exit,
    exitDistance: Math.hypot(exit.x - px, exit.y - py), exitSpeed: exit.speed, speed: exit.speed });
}
function nt(plan, steps) {
  const exit = launchMotion(plan, steps);
  return Math.hypot(exit.x - plan.px, exit.y - plan.py);
}
function rt(side, cx, px, py) {
  const plan = tt(side, cx, px, py);
  if (!plan) return { ok: false, x: px, y: py, vx: 0, vy: 0, speed: 0, steps: 0 };
  return {
    ...plan.exit,
    ok: plan.exit.released && plan.exit.speed >= 3 && A(side) * plan.exit.vy > 0.2 * plan.exit.speed,
  };
}
var it = T - 1,
  at = E - 1,
  z = 2.01;
function ot(e, t, n = e, r = t) {
  return {
    engaged: !1,
    ok: !1,
    cx: e,
    cy: t,
    px: n,
    py: r,
    pull: 0,
    power: 0,
    dirX: 0,
    dirY: 0,
    speed: 0,
    exitX: e,
    exitY: t,
  };
}
function st(e, t, n, r, i) {
  let a = A(e),
    o = r - t,
    s = -a * (i - n);
  if (!(s > 1e-6)) return null;
  let c = Math.atan2(o, s);
  if (Math.abs(c) > Oe) {
    let e = Math.hypot(o, s) * Math.cos(Math.abs(c) - Oe);
    ((o = Math.sign(c) * Math.sin(Oe) * e), (s = Math.cos(Oe) * e));
  }
  let l = Math.hypot(o, s);
  l > 3.9 && ((o *= O / l), (s *= O / l));
  let u = F(t + o, -it, it),
    d = F(n - a * s, -at, at);
  return a * (d - n) < -1e-6 ? { x: u, y: d } : null;
}
function ct(e, t, n, r, i) {
  t = F(t, -8, 8);
  let a = M(e),
    o = st(e, t, a, n, r);
  if (!o) return ot(t, a, F(n, -it, it), a);
  let s = !1;
  for (let n = 0; n < 5; n++) {
    s = !1;
    let n = o.x,
      r = o.y;
    for (let t of i) {
      let i = n - t.x,
        a = r - t.y,
        o = i * i + a * a;
      if (o < z * z - 1e-9) {
        let c = Math.sqrt(o);
        (c < 1e-6
          ? (r = t.y - A(e) * z)
          : ((n = t.x + (i / c) * z), (r = t.y + (a / c) * z)),
          (s = !0));
      }
    }
    if (!s) break;
    if (((o = st(e, t, a, n, r)), !o)) return ot(t, a);
  }
  if (s) {
    for (let e of i)
      if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 < z * z - 0.02)
        return { ...ot(t, a), engaged: !0, px: o.x, py: o.y };
  }
  let c = rt(e, t, o.x, o.y),
    l = Math.hypot(o.x - t, o.y - a),
    u = c.speed;
  return {
    engaged: !0,
    ok: c.ok && l >= 0.4,
    cx: t,
    cy: a,
    px: o.x,
    py: o.y,
    pull: l,
    power: Math.min(1, l / O),
    dirX: u > 1e-6 ? c.vx / u : 0,
    dirY: u > 1e-6 ? c.vy / u : A(e),
    speed: u,
    exitX: c.x,
    exitY: c.y,
  };
}
function lt(e, t) {
  return -A(e) * (t - M(e)) > 0;
}
function ut(e, t, n, r, i) {
  n = F(n, -8, 8);
  let a = M(e),
    o = F(i, 0, O);
  return {
    puckId: t,
    cx: n,
    px: n + Math.sin(r) * o,
    py: a - A(e) * Math.cos(r) * o,
  };
}
var dt = null;
function ft() {
  return ((dt ||= n.init()), dt);
}
var pt = 1,
  mt = 2,
  ht = (e, t) => ((e & 65535) << 16) | (t & 65535),
  gt = ht(pt, 3),
  _t = 3,
  vt = 0,
  yt = be - 1 - 0.05,
  xt = class {
    world = null;
    queue = null;
    bodies = [];
    tags = new Map();
    pre = new Float64Array();
    scratch = { x: 0, y: 0 };
    motion = { x: 0, y: 0, w: 0 };
    constructor(e) {
      this.reset(e);
    }
    get count() {
      return this.bodies.length;
    }
    reset(e) {
      this.free();
      let t = new n.World({ x: 0, y: 0 });
      ((t.timestep = k),
        (t.numSolverIterations = 4),
        (t.maxCcdSubsteps = 2),
        (this.world = t),
        (this.queue = new n.EventQueue(!0)),
        this.tags.clear(),
        this.buildStatic(t));
      let r = [...e].sort((e, t) => e.id - t.id);
      ((this.bodies = r.map((e, n) => this.createPuck(t, e, n))),
        (this.pre = new Float64Array(this.bodies.length * 2)));
    }
    free() {
      (this.queue?.free(),
        this.world?.free(),
        (this.queue = null),
        (this.world = null),
        (this.bodies = []));
    }
    buildStatic(e) {
      let t = _t,
        r = (t, r, i) => {
          t.setRestitution(i)
            .setRestitutionCombineRule(n.CoefficientCombineRule.Min)
            .setFriction(Le)
            .setCollisionGroups(ht(mt, pt));
          let a = e.createCollider(t);
          this.tags.set(a.handle, r);
        };
      (r(
        n.ColliderDesc.cuboid(t, E + 6).setTranslation(-(T + t), 0),
        { kind: `wall`, nx: 1, ny: 0 },
        Pe,
      ),
        r(
          n.ColliderDesc.cuboid(t, E + 6).setTranslation(T + t, 0),
          { kind: `wall`, nx: 1, ny: 0 },
          Pe,
        ),
        r(
          n.ColliderDesc.cuboid(T + 6, t).setTranslation(0, -(E + t)),
          { kind: `wall`, nx: 0, ny: 1 },
          Pe,
        ),
        r(
          n.ColliderDesc.cuboid(T + 6, t).setTranslation(0, E + t),
          { kind: `wall`, nx: 0, ny: 1 },
          Pe,
        ));
      let i = ye + D,
        a = (T + t - i) / 2;
      for (let e of [-1, 1])
        (r(
          n.ColliderDesc.cuboid(a, D).setTranslation(e * (i + a), 0),
          { kind: `divider`, nx: 0, ny: 1 },
          Fe,
        ),
          r(
            n.ColliderDesc.ball(D).setTranslation(e * i, 0),
            { kind: `divider`, nx: 0, ny: 1, roundX: e * i },
            Fe,
          ));
    }
    createPuck(e, t, r) {
      let i = e.createRigidBody(
          n.RigidBodyDesc.dynamic()
            .setTranslation(t.x, t.y)
            .setRotation(t.a)
            .setLinearDamping(je)
            .setAngularDamping(Me)
            .setCcdEnabled(!0)
            .setSoftCcdPrediction(vt),
        ),
        a = e.createCollider(
          n.ColliderDesc.ball(1)
            .setDensity(1)
            .setRestitution(Ne)
            .setRestitutionCombineRule(n.CoefficientCombineRule.Min)
            .setFriction(Ie)
            .setCollisionGroups(gt)
            .setActiveEvents(n.ActiveEvents.COLLISION_EVENTS),
          i,
        );
      return (
        this.tags.set(a.handle, { kind: `puck`, idx: r }),
        {
          id: t.id,
          color: t.color,
          body: i,
          collider: a,
          band: { side: -1, tangent: 0, integrated: false, previousX: 0, previousTangent: 0 },
          launch: null,
          quietSteps: 0,
        }
      );
    }
    find(e) {
      return this.bodies.find((t) => t.id === e);
    }
    launch(e, t, n, r, i) {
      let a = this.find(e);
      if (!a) return;
      (this.endLaunch(a),
        (a.quietSteps = 0),
        a.body.setEnabled(!0),
        a.body.setTranslation({ x: n, y: r }, !0),
        a.body.setLinvel({ x: 0, y: 0 }, !0),
        a.body.setAngvel(0, !0),
        (a.band.side = -1),
        (a.band.tangent = 0));
      let o = tt(i, t, n, r, false);
      if (o) {
        a.launch = { plan: o, step: 0, cx: t, side: i };
        a.band.side = i;
        a.band.tangent = -A(i) * (n - t);
      }
    }
    endLaunch(e) {
      e.launch = null;
    }
    isLaunching(e) {
      return !!this.find(e)?.launch;
    }
    hold(e) {
      let t = this.find(e);
      t &&
        (this.endLaunch(t),
        (t.quietSteps = 0),
        t.body.setLinvel({ x: 0, y: 0 }, !1),
        t.body.setAngvel(0, !1),
        t.body.setEnabled(!1),
        (t.band.side = -1),
        (t.band.tangent = 0));
    }
    place(e, t, n) {
      let r = this.find(e);
      r &&
        (this.endLaunch(r),
        (r.quietSteps = 0),
        r.body.setEnabled(!0),
        r.body.setTranslation({ x: t, y: n }, !0),
        r.body.setLinvel({ x: 0, y: 0 }, !0),
        r.body.setAngvel(0, !0),
        (r.band.side = -1),
        (r.band.tangent = 0));
    }
    restore(pucks) {
      // 网络校正复用已有 WASM 世界，避免每个快照重建碰撞体。
      for (const puck of pucks) {
        const entry = this.find(puck.id);
        if (!entry) continue;
        this.endLaunch(entry);
        entry.quietSteps = 0;
        entry.band.side = -1;
        entry.band.tangent = 0;
        const body = entry.body;
        body.setEnabled(!(puck.held >= 0));
        body.setTranslation({ x: puck.x, y: puck.y }, true);
        body.setRotation(puck.a, true);
        body.setLinvel({ x: puck.vx ?? 0, y: puck.vy ?? 0 }, true);
        body.setAngvel(puck.av ?? 0, true);
        if (!(puck.held >= 0) && (puck.bandSide === 0 || puck.bandSide === 1) &&
            puck.bandSide === bandSide(puck.y) && Number.isFinite(puck.bandTangent)) {
          entry.band.side = puck.bandSide;
          entry.band.tangent = puck.bandTangent;
        }
        if (puck.launchStep >= 0 && !(puck.held >= 0)) {
          const plan = tt(puck.launchSide, puck.launchCx, puck.launchPx, puck.launchPy, false);
          if (plan && lt(puck.launchSide, puck.y)) {
            entry.launch = { plan, step: puck.launchStep,
              cx: puck.launchCx, side: puck.launchSide };
            // 旧快照无切向状态时仅作兼容；新协议始终同步完整接触形变。
            if (entry.band.side < 0) {
              entry.band.side = puck.launchSide;
              entry.band.tangent = -A(puck.launchSide) * (puck.x - puck.launchCx);
            }
          }
        }
        if (!entry.launch && !puck.vx && !puck.vy && !puck.av && Math.abs(puck.y) < yt)
          body.sleep();
      }
    }
    step(e) {
      let t = this.world;
      if (!t || !this.queue) return false;
      // 静止棋盘无需碰撞检测/求解；launch、place 和 restore 会重新唤醒。
      if (!this.bodies.some(({ body, launch }) => body.isEnabled() &&
          (launch || !body.isSleeping())))
        return false;
      const motion = this.motion;
      for (const entry of this.bodies) {
        const body = entry.body;
        entry.band.integrated = false;
        if (!body.isEnabled() || (body.isSleeping() && !entry.launch)) continue;
        const position = body.translation(), velocity = body.linvel();
        motion.x = velocity.x;
        motion.y = velocity.y;
        motion.w = body.angvel();
        const side = bandSide(position.y);
        if (entry.launch && side !== entry.launch.side) this.endLaunch(entry);
        if (entry.band.side !== side) {
          entry.band.side = side;
          entry.band.tangent = 0;
          if (side >= 0 && e) {
            const incoming = -A(side) * motion.y;
            if (incoming > 0.4) e.push({ k: `band`, x: position.x, y: position.y,
              v: incoming, s: side, a: entry.id });
          }
        }
        if (side >= 0) {
          entry.band.integrated = true;
          entry.band.previousX = position.x;
          entry.band.previousTangent = entry.band.tangent;
          bandImpulse(motion, position.y, entry.band);
        }
        tableFriction(motion);
        const elastic = side >= 0;
        body.setLinvel(motion, elastic);
        body.setAngvel(motion.w, elastic);
      }
      if (e)
        for (let index = 0; index < this.bodies.length; index++) {
          const velocity = this.bodies[index].body.linvel();
          this.pre[2 * index] = velocity.x;
          this.pre[2 * index + 1] = velocity.y;
        }
      t.step(this.queue);
      if (e) this.queue.drainCollisionEvents((a, b, started) => {
        if (started) this.onContact(a, b, e);
      });
      for (const entry of this.bodies) {
        const body = entry.body;
        if (entry.band.integrated) {
          // 求解器的接触冲量与桌面摩擦会改变实际滑动，不能用预测位移
          // 更新储能；快照中的 q 始终跟随本步实际的圆心位移。
          entry.band.tangent = entry.band.previousTangent - A(entry.band.side) *
            (body.translation().x - entry.band.previousX);
        }
        if (entry.band.side >= 0 && bandSide(body.translation().y) !== entry.band.side) {
          entry.band.side = -1;
          entry.band.tangent = 0;
        }
        if (entry.launch) {
          // step 只标记发射仍在进行，不让长时间堵球导致协议计数溢出。
          entry.launch.step = Math.min(MAX_PREVIEW_STEPS, entry.launch.step + 1);
          if (!lt(entry.launch.side, body.translation().y)) this.endLaunch(entry);
        }
        if (body.isSleeping() || !body.isEnabled()) continue;
        const velocity = body.linvel();
        // 被桌面静摩擦抵住的轻压带也可休眠；之后的碰撞/抓放/快照会唤醒。
        if (velocity.x === 0 && velocity.y === 0 && body.angvel() === 0) {
          if (++entry.quietSteps >= 12) {
            // 堵住或轻拉后静止也可重新抓取；保留接触储能，下一次碰撞再唤醒。
            this.endLaunch(entry);
            body.sleep();
          }
        } else entry.quietSteps = 0;
      }
      return true;
    }
    onContact(e, t, n) {
      let r = this.tags.get(e),
        i = this.tags.get(t);
      if (!r || !i) return;
      let a = this.pre;
      if (r.kind === `puck` && i.kind === `puck`) {
        let e = r.idx,
          t = i.idx,
          s = this.bodies[e].body.translation(),
          c = this.bodies[t].body.translation(),
          dx = c.x - s.x,
          dy = c.y - s.y,
          distance = Math.hypot(dx, dy),
          o = distance > 1e-6
            ? Math.abs(((a[2 * e] - a[2 * t]) * dx + (a[2 * e + 1] - a[2 * t + 1]) * dy) / distance)
            : 0;
        if (o < 0.3) return;
        n.push({
          k: `puck`,
          x: (s.x + c.x) / 2,
          y: (s.y + c.y) / 2,
          v: o,
          a: this.bodies[e].id,
          b: this.bodies[t].id,
        });
        return;
      }
      let o = r.kind === `puck` ? r : i.kind === `puck` ? i : null,
        s = o === r ? i : r;
      if (!o || o.kind !== `puck` || s.kind === `puck`) return;
      let c = o.idx,
        u = this.bodies[c].body.translation(),
        nx = s.nx, ny = s.ny;
      if (s.roundX !== undefined) {
        const dx = u.x - s.roundX, length = Math.hypot(dx, u.y);
        if (length > 1e-6) { nx = dx / length; ny = u.y / length; }
      }
      let l = Math.abs(a[2 * c] * nx + a[2 * c + 1] * ny);
      if (l < 0.3) return;
      n.push({
        k: s.kind,
        x: u.x,
        y: u.y,
        v: l,
        a: this.bodies[c].id,
        ...(s.kind === `wall` ? { edge: s.nx ? `side` : `end` } : {}),
      });
    }
    isSettled() {
      let e = this.scratch;
      for (let t of this.bodies) {
        let n = t.body;
        if (t.launch) return !1;
        if (n.isSleeping() || !n.isEnabled()) continue;
        let r = n.linvel(e);
        if (r.x * r.x + r.y * r.y > 225e-6 || Math.abs(n.angvel()) > 0.08)
          return !1;
      }
      return !0;
    }
    stopAll() {
      for (let e of this.bodies) {
        let t = e.body;
        (this.endLaunch(e),
          t.setLinvel({ x: 0, y: 0 }, !1),
          t.setAngvel(0, !1));
        let n = t.translation();
        if (!Ve(n.x, n.y)) {
          let e = Number.isFinite(n.x) ? F(n.x, -(T - 1), T - 1) : 0,
            r = Number.isFinite(n.y) ? F(n.y, -(E - 1), E - 1) : -1;
          t.setTranslation({ x: e, y: r }, !1);
        }
      }
    }
    snapshot() {
      const snapshot = [];
      this.readInto(snapshot);
      return snapshot;
    }
    readInto(e, includeMotion = true) {
      for (let t = 0; t < this.bodies.length; t++) {
        let n = this.bodies[t],
          r = n.body.translation(),
          i = e[t];
        ((i ||= e[t] = { id: n.id, x: 0, y: 0, a: 0, color: n.color }),
          (i.id = n.id),
          (i.x = r.x),
          (i.y = r.y),
          (i.a = n.body.rotation()),
          (i.color = n.color));
        if (includeMotion) {
          const velocity = n.body.linvel(), launch = n.launch;
          i.vx = velocity.x;
          i.vy = velocity.y;
          i.av = n.body.angvel();
          i.launchStep = launch?.step ?? -1;
          i.launchCx = launch?.cx ?? 0;
          i.launchPx = launch?.plan.px ?? 0;
          i.launchPy = launch?.plan.py ?? 0;
          i.launchSide = launch?.side ?? -1;
          i.bandSide = n.band.side;
          i.bandTangent = n.band.tangent;
        }
      }
      e.length = this.bodies.length;
    }
    speedOf(e) {
      let t = this.find(e);
      if (!t) return 0;
      let n = t.body.linvel(this.scratch);
      return Math.hypot(n.x, n.y);
    }
  },
  St = {
    straight: {
      name: `直线穿门`,
      points: 10,
      desc: `正面直接穿过洞口`,
      group: `shot`,
    },
    kiss: {
      name: `借力穿门`,
      points: 18,
      desc: `先碰到别的冰球再穿过洞口`,
      group: `shot`,
    },
    bank: {
      name: `回旋镖`,
      points: 25,
      desc: `撞一次侧边围栏后弹进洞口`,
      group: `shot`,
    },
    bank2: {
      name: `九曲回廊`,
      points: 40,
      desc: `连撞两次以上侧边围栏后弹进洞口`,
      group: `shot`,
    },
    carom: {
      name: `隔山打牛`,
      points: 30,
      desc: `撞击另一枚冰球，把它送过洞口`,
      group: `shot`,
    },
    post: {
      name: `擦柱入门`,
      points: 8,
      desc: `擦过洞口两侧的圆柱后穿过`,
      group: `bonus`,
    },
    double: {
      name: `一箭双雕`,
      points: 25,
      desc: `一次出手送出两枚冰球`,
      group: `bonus`,
    },
    combo: {
      name: `连中`,
      points: 5,
      desc: `连续出手都命中：每多一次 +5，最多 +25（3 连中为帽子戏法）`,
      group: `bonus`,
    },
    buzzer: {
      name: `压哨球`,
      points: 15,
      desc: `常规时间最后 5 秒内命中`,
      group: `bonus`,
    },
    golden: {
      name: `加时进球`,
      points: 20,
      desc: `加时赛中命中`,
      group: `bonus`,
    },
    clear: {
      name: `清台一击`,
      points: 20,
      desc: `送出自己半场的最后一枚冰球`,
      group: `bonus`,
    },
    block: {
      name: `铜墙铁壁`,
      points: 15,
      desc: `对手的冰球撞上你的冰球后被弹回去`,
      group: `defense`,
    },
    intercept: {
      name: `半路截杀`,
      points: 15,
      desc: `撞停对手正飞向洞口的冰球`,
      group: `defense`,
    },
    blitz: {
      name: `闪电战`,
      points: 30,
      desc: `开局 60 秒内清空半场获胜`,
      group: `end`,
    },
    comeback: {
      name: `绝地反击`,
      points: 40,
      desc: `曾落后 4 枚以上仍然获胜`,
      group: `end`,
    },
    perfect: {
      name: `百发百中`,
      points: 30,
      desc: `获胜且至少 6 次出手、命中率不低于 80%`,
      group: `end`,
    },
  };
Object.keys(St);
var Ct = { win: 1, draw: 0.75, lose: 0.5, quit: 0 };
function wt(e) {
  return Math.min(25, 5 * (e - 1));
}
function Tt(e, t, n, r) {
  let i =
    n === -1
      ? Ct.draw
      : t === n
        ? Ct.win
        : r === `forfeit` || r === `disconnect`
          ? Ct.quit
          : Ct.lose;
  return Math.floor(e * i);
}
var Et = ye + D + 1 + 0.25,
  Dt = 3,
  Ot = 0.8,
  kt = 6,
  At = 5,
  jt = 60,
  Mt = 4,
  Nt = 6,
  Pt = 0.8,
  Ft = class {
    host;
    score = [0, 0];
    taken = [0, 0];
    bestStreak = [0, 0];
    streak = [0, 0];
    made = [0, 0];
    deficit = [0, 0];
    cleared = [!1, !1];
    flights = new Map();
    pushes = new Map();
    out = [];
    constructor(e) {
      this.host = e;
    }
    reset() {
      for (let e of [0, 1])
        ((this.score[e] =
          this.taken[e] =
          this.bestStreak[e] =
          this.streak[e] =
          this.made[e] =
          this.deficit[e] =
            0),
          (this.cleared[e] = !1));
      (this.flights.clear(), this.pushes.clear(), (this.out = []));
    }
    drain() {
      let e = this.out;
      return ((this.out = []), e);
    }
    shot(e, t) {
      (this.endFlight(t),
        this.pushes.delete(t),
        this.flights.set(t, {
          id: t,
          side: e,
          shot: { side: e, credits: 0 },
          t0: this.host.time,
          walls: 0,
          post: !1,
          kissed: !1,
          crossed: !1,
          touchedAfter: !1,
          credited: !1,
          blocked: !1,
          interceptedBy: -1,
        }));
    }
    grab(e) {
      (this.endFlight(e), this.pushes.delete(e));
    }
    contact(e) {
      if (e.a === void 0) return;
      let t = this.flights.get(e.a);
      if (e.k === `puck` && e.b !== void 0) {
        let n = this.flights.get(e.b);
        (this.touch(t, n),
          this.touch(n, t),
          this.spread(e.a, t, e.b, n),
          this.spread(e.b, n, e.a, t));
      } else
        t &&
          !t.crossed &&
          (e.k === `wall` && e.edge === `side`
            ? t.walls++
            : e.k === `divider` && Math.abs(e.x) < Et && (t.post = !0));
    }
    cross(e, t, n, r) {
      let i = this.flights.get(e),
        a = this.livePush(e);
      if (i && i.side !== t)
        ((i.crossed = !1),
          i.touchedAfter &&
            !i.blocked &&
            ((i.blocked = !0), this.award(t, `block`, n, r)));
      else if (i) {
        if (((i.crossed = !0), (i.touchedAfter = !1), !i.credited)) {
          i.credited = !0;
          let e =
            i.walls >= 2
              ? `bank2`
              : i.walls === 1
                ? `bank`
                : i.kissed
                  ? `kiss`
                  : `straight`;
          this.credit(i.shot, e, n, r, i.post);
        }
      } else
        a &&
          a.side === t &&
          ((a.credited = !0), this.credit(a.shot, `carom`, n, r, !1));
      for (let e of [0, 1])
        this.deficit[e] = Math.max(
          this.deficit[e],
          this.host.count(e) - this.host.count(j(e)),
        );
    }
    tick() {
      let e = this.host;
      for (let t of [...this.flights.values()]) {
        let n = e.time - t.t0;
        (n > kt || (n > 0.5 && e.speedOf(t.id) < Ot)) && this.endFlight(t.id);
      }
      for (let [t, n] of this.pushes)
        e.time - n.t > Dt && this.pushes.delete(t);
    }
    finish(e, t, n) {
      for (let e of [...this.flights.keys()]) this.endFlight(e);
      if (e !== -1) {
        (t === `clear` && this.host.time <= jt && this.award(e, `blitz`, 0, 0),
          this.deficit[e] >= Mt && this.award(e, `comeback`, 0, 0));
        let r = n[e];
        r >= Nt && this.made[e] / r >= Pt && this.award(e, `perfect`, 0, 0);
      }
      for (let n of [0, 1]) this.taken[n] = Tt(this.score[n], n, e, t);
    }
    award(e, t, n, r, i = St[t].points, a) {
      ((this.score[e] += i),
        this.out.push({
          side: e,
          kind: t,
          points: i,
          x: n,
          y: r,
          ...(a === void 0 ? {} : { n: a }),
        }));
    }
    credit(e, t, n, r, i) {
      let a = e.side;
      if (
        (this.award(a, t, n, r),
        i && this.award(a, `post`, n, r),
        e.credits++,
        e.credits === 1)
      ) {
        this.made[a]++;
        let e = ++this.streak[a];
        ((this.bestStreak[a] = Math.max(this.bestStreak[a], e)),
          e >= 2 && this.award(a, `combo`, n, r, wt(e), e));
      } else e.credits === 2 && this.award(a, `double`, n, r);
      let o = this.host;
      (o.overtime
        ? this.award(a, `golden`, n, r)
        : o.timeLeft <= At && this.award(a, `buzzer`, n, r),
        !this.cleared[a] &&
          o.count(a) === 0 &&
          ((this.cleared[a] = !0), this.award(a, `clear`, n, r)));
    }
    touch(e, t) {
      e &&
        (e.crossed
          ? (e.touchedAfter = !0)
          : ((e.kissed = !0),
            t && t.side !== e.side && (e.interceptedBy = t.side)));
    }
    spread(e, t, n, r) {
      let i = t ?? this.livePush(e);
      !i ||
        (r && r.side === i.side) ||
        this.pushes.set(n, {
          side: i.side,
          shot: i.shot,
          t: this.host.time,
          credited: !1,
        });
    }
    livePush(e) {
      let t = this.pushes.get(e);
      return t && !t.credited && this.host.time - t.t <= Dt ? t : void 0;
    }
    endFlight(e) {
      let t = this.flights.get(e);
      if (t) {
        if ((this.flights.delete(e), t.interceptedBy !== -1 && !t.credited)) {
          let n = this.host.positionOf(e) ?? { x: 0, y: 0 };
          this.award(t.interceptedBy, `intercept`, n.x, n.y);
        }
        t.shot.credits === 0 && (this.streak[t.side] = 0);
      }
    }
  },
  It = 2.02;
function Lt(e) {
  let t = E - 1,
    n = D + 1;
  return {
    minX: -(T - 1),
    maxX: T - 1,
    minY: e === 0 ? -t : n,
    maxY: e === 0 ? -n : t,
  };
}
var Rt = class {
  world;
  phase = `playing`;
  time = 0;
  matchTime;
  overtimeTime;
  overtime = !1;
  winner = -1;
  endReason = ``;
  holds = [null, null];
  shots = [0, 0];
  passes = [0, 0];
  prevSide = [];
  lastShot = [-1e9, -1e9];
  acc = 0;
  pucks = [];
  tmp = [];
  events = [];
  sfxBuf = [];
  steps = 0;
  scorer = new Ft(this);
  constructor(e = {}) {
    ((this.matchTime = e.matchTime ?? 60),
      (this.overtimeTime = e.overtime ?? 120),
      (this.pucks = Be()),
      (this.world = new xt(this.pucks)),
      this.syncPucks(true));
  }
  get score() {
    return this.scorer.score;
  }
  reset(e = Be()) {
    ((this.pucks = e
      .map((e) => ({ ...e, held: void 0 }))
      .sort((e, t) => e.id - t.id)),
      this.world.reset(this.pucks),
      (this.phase = `playing`),
      (this.time = 0),
      (this.winner = -1),
      (this.endReason = ``),
      (this.holds[0] = this.holds[1] = null),
      (this.shots[0] = this.shots[1] = 0),
      (this.passes[0] = this.passes[1] = 0),
      (this.prevSide = this.pucks.map((e) => N(e.y))),
      (this.lastShot = [-1e9, -1e9]),
      (this.overtime = !1),
      (this.acc = 0),
      (this.steps = 0),
      (this.events = []),
      this.scorer.reset(),
      this.syncPucks(true),
      this.emit({ type: `start` }));
  }
  get timeLeft() {
    return Math.max(0, this.periodEnd - this.time);
  }
  get periodTime() {
    return this.overtime ? this.overtimeTime : this.matchTime;
  }
  get periodEnd() {
    return this.overtime ? this.matchTime + this.overtimeTime : this.matchTime;
  }
  getPucks() {
    return this.pucks;
  }
  count(e) {
    return P(this.pucks, e);
  }
  speedOf(e) {
    return this.world.speedOf(e);
  }
  positionOf(e) {
    return this.find(e);
  }
  holding(e) {
    return this.holds[e]?.puckId ?? null;
  }
  drainEvents() {
    let e = this.events;
    return ((this.events = []), e);
  }
  emit(e) {
    this.events.push(e);
  }
  find(e) {
    return this.pucks.find((t) => t.id === e);
  }
  canGrab(e, t) {
    if (this.phase !== `playing`) return `not_playing`;
    if (this.holds[e]) return `already_holding`;
    let n = this.find(t);
    return n
      ? n.held === void 0
        ? N(n.y) === e
          ? this.world.isLaunching(t) || this.world.speedOf(t) > 5
            ? `moving`
            : null
          : `not_your_half`
        : `held`
      : `no_puck`;
  }
  grab(e, t) {
    let n = this.canGrab(e, t);
    if (n) return { ok: !1, reason: n };
    let r = this.find(t);
    return (
      this.world.hold(t),
      this.scorer.grab(t),
      (r.held = e),
      (r.vx = r.vy = r.av = 0),
      (r.launchStep = -1),
      (r.bandSide = -1),
      (r.bandTangent = 0),
      (this.holds[e] = { puckId: t, x: r.x, y: r.y }),
      this.emit({ type: `grab`, side: e, puckId: t }),
      { ok: !0 }
    );
  }
  moveHold(e, t, n) {
    let r = this.holds[e];
    if (!r || !ze(t) || !ze(n)) return;
    let i = Lt(e);
    ((r.x = F(t, i.minX, i.maxX)), (r.y = F(n, i.minY, i.maxY)));
    let a = this.find(r.puckId);
    a && ((a.x = r.x), (a.y = r.y));
  }
  drop(e, t, n) {
    let r = this.holds[e];
    if (!r) return { ok: !1, reason: `not_holding` };
    t !== void 0 && n !== void 0 && this.moveHold(e, t, n);
    let i = this.freeSpot(e, r.x, r.y, r.puckId);
    this.world.place(r.puckId, i.x, i.y);
    let a = this.find(r.puckId);
    return (
      (a.x = i.x),
      (a.y = i.y),
      (a.held = void 0),
      (a.vx = a.vy = a.av = 0),
      (a.launchStep = -1),
      (a.bandSide = -1),
      (a.bandTangent = 0),
      (this.holds[e] = null),
      this.emit({ type: `drop`, side: e, puckId: a.id, x: i.x, y: i.y }),
      { ok: !0 }
    );
  }
  freeSpot(e, t, n, r) {
    let i = this.pucks.filter((e) => e.id !== r && e.held === void 0),
      a = Lt(e),
      o = (e, t) => i.every((n) => (n.x - e) ** 2 + (n.y - t) ** 2 >= It * It);
    if (o(t, n)) return { x: t, y: n };
    for (let e = 0.4; e <= 10; e += 0.4)
      for (let r = 0; r < 16; r++) {
        let i = (r / 16) * Math.PI * 2,
          s = F(t + Math.cos(i) * e, a.minX, a.maxX),
          c = F(n + Math.sin(i) * e, a.minY, a.maxY);
        if (o(s, c)) return { x: s, y: c };
      }
    return { x: t, y: n };
  }
  check(e, t) {
    if (this.phase !== `playing`) return { ok: !1, reason: `not_playing` };
    let n = this.holds[e];
    if (!n || n.puckId !== t.puckId) return { ok: !1, reason: `not_holding` };
    if (this.time - this.lastShot[e] < 0.3)
      return { ok: !1, reason: `cooldown` };
    let r = this.pucks.filter((e) => e.id !== t.puckId && e.held === void 0),
      i = ct(e, t.cx, t.px, t.py, r);
    return i.engaged
      ? i.ok
        ? {
            ok: !0,
            shot: {
              side: e,
              puckId: t.puckId,
              cx: i.cx,
              cy: i.cy,
              px: i.px,
              py: i.py,
              dirX: i.dirX,
              dirY: i.dirY,
              power: i.power,
              speed: i.speed,
            },
          }
        : { ok: !1, reason: `too_weak` }
      : { ok: !1, reason: `not_engaged` };
  }
  shoot(e, t) {
    let n = this.check(e, t);
    if (!n.ok) return n;
    let r = n.shot;
    (this.world.launch(r.puckId, r.cx, r.px, r.py, e),
      this.scorer.shot(e, r.puckId));
    let i = this.find(r.puckId);
    return (
      (i.x = r.px),
      (i.y = r.py),
      (i.held = void 0),
      (this.holds[e] = null),
      (this.lastShot[e] = this.time),
      this.shots[e]++,
      this.syncPucks(true),
      this.emit({ type: `shot`, shot: r }),
      this.emit({
        type: `sfx`,
        e: { k: `launch`, x: r.px, y: r.py, v: r.power, s: e },
      }),
      n
    );
  }
  forfeit(e, t) {
    this.phase !== `over` && this.finish(j(e), t);
  }
  update(e, t = 24) {
    if (this.phase !== `playing`) return;
    this.acc += e;
    let n = 0;
    for (; this.acc >= 0.008333333333333333 && n < t;)
      if (((this.acc -= k), n++, this.stepOnce(), this.phase !== `playing`)) {
        this.acc = 0;
        break;
      }
    n >= t && (this.acc = Math.min(this.acc, k));
  }
  stepOnce() {
    let e = this.sfxBuf;
    e.length = 0;
    const moved = this.world.step(e);
    for (let t of e) (this.emit({ type: `sfx`, e: t }), this.scorer.contact(t));
    ((this.time += k),
      moved && this.syncPucks(),
      ++this.steps % 12 == 0 && this.scorer.tick(),
      this.flushScore(),
      this.checkWin());
  }
  flushScore() {
    for (let e of this.scorer.drain()) this.emit({ type: `score`, e });
  }
  syncPucks(includeMotion = false) {
    this.world.readInto(this.tmp, includeMotion);
    for (let e = 0; e < this.pucks.length; e++) {
      let t = this.pucks[e];
      if (t.held !== void 0) continue;
      let n = this.tmp[e];
      ((t.x = n.x), (t.y = n.y), (t.a = n.a));
      if (includeMotion) {
        t.vx = n.vx;
        t.vy = n.vy;
        t.av = n.av;
        t.launchStep = n.launchStep;
        t.launchCx = n.launchCx;
        t.launchPx = n.launchPx;
        t.launchPy = n.launchPy;
        t.launchSide = n.launchSide;
        t.bandSide = n.bandSide;
        t.bandTangent = n.bandTangent;
      }
      let r = N(t.y),
        i = this.prevSide[e];
      (i !== void 0 &&
        r !== i &&
        (this.passes[i]++,
        this.emit({ type: `pass`, puckId: t.id, from: i }),
        this.scorer.cross(t.id, i, t.x, t.y)),
        (this.prevSide[e] = r));
    }
  }
  checkWin() {
    for (let e of [0, 1])
      if (P(this.pucks, e) === 0) {
        this.finish(e, `clear`);
        return;
      }
    if (this.time < this.periodEnd) return;
    if (!this.overtime && this.overtimeTime > 0) {
      this.overtime = !0;
      this.emit({ type: `overtime` });
      return;
    }
    const e = this.count(0), t = this.count(1);
    this.finish(e === t ? -1 : e < t ? 0 : 1, `time`);
  }
  finish(e, t) {
    for (let e of [0, 1]) this.holds[e] && this.drop(e);
    ((this.phase = `over`),
      (this.winner = e),
      (this.endReason = t),
      this.scorer.finish(e, t, this.shots),
      this.flushScore(),
      this.emit({
        type: `over`,
        winner: e,
        reason: t,
        score: [...this.scorer.score],
        taken: [...this.scorer.taken],
      }));
  }
};

function zt(e) {
  let t = 0;
  for (; t <= 1e-12;) t = e();
  let n = e();
  return Math.sqrt(-2 * Math.log(t)) * Math.cos(2 * Math.PI * n);
}
var Bt = Math.PI / 180,
  Vt = {
    easy: {
      label: `简单`,
      angleSigma: 4.8 * Bt,
      powerSigma: 0.12,
      budgetMs: 180,
      robustTop: 2,
      robustSamples: 2,
      sloppiness: 0.2,
    },
    normal: {
      label: `普通`,
      angleSigma: 2.6 * Bt,
      powerSigma: 0.06,
      budgetMs: 320,
      robustTop: 4,
      robustSamples: 3,
      sloppiness: 0.05,
    },
    hard: {
      label: `困难`,
      angleSigma: 1 * Bt,
      powerSigma: 0.03,
      budgetMs: 520,
      robustTop: 6,
      robustSamples: 4,
      sloppiness: 0,
    },
    extreme: {
      label: `极限`,
      angleSigma: 0.12 * Bt,
      powerSigma: 0.006,
      budgetMs: 120,
      robustTop: 3,
      robustSamples: 2,
      sloppiness: 0,
      precise: true,
    },
  },
  Ht = 1.5,
  Ut = Oe,
  Wt = T - 1,
  Gt = 7;
function Kt(e, t, n, r) {
  const shot = ut(e, 0, t, n, r), aim = ct(e, t, shot.px, shot.py, []);
  if (!aim.ok || Math.abs(aim.dirY) < 1e-6) return null;
  const distance = -aim.exitY / aim.dirY;
  return distance > 0 ? aim.exitX + aim.dirX * distance : null;
}
function qt(e, t, n, r) {
  const shot = ut(e, 0, t, n, r), aim = ct(e, t, shot.px, shot.py, []);
  return aim.ok ? Math.atan2(aim.dirX, A(e) * aim.dirY) : null;
}
function Jt(e, t, n, r) {
  let i = 0,
    a = null;
  for (let o = 0; o <= 16; o++) {
    let s = -Ut + (2 * Ut * o) / 16,
      c = Kt(e, t, s, n);
    if (c !== null && a !== null && (a - r) * (c - r) <= 0) {
      let o = i,
        c = s,
        l = a - r;
      for (let i = 0; i < 18; i++) {
        let i = (o + c) / 2,
          a = Kt(e, t, i, n);
        if (a === null) return null;
        (a - r) * l <= 0 ? (c = i) : ((o = i), (l = a - r));
      }
      return (o + c) / 2;
    }
    ((i = s), (a = c));
  }
  return null;
}
function B(e, t) {
  return ut(e, t.puckId, t.cx, t.psi, t.pull);
}
function Yt(e, t, n, r, i) {
  let a = M(t),
    o = r - n,
    s = -a,
    c = Math.hypot(o, s) || 1;
  ((o /= c), (s /= c));
  let l = -1,
    u = 1 / 0,
    d = -1,
    f = 1 / 0;
  for (let r of e) {
    if (N(r.y) !== t || !i(r.id)) continue;
    let e = r.x - n,
      p = r.y - a,
      m = e * o + p * s,
      h = Math.hypot(e, p);
    (h < f && ((f = h), (d = r.id)),
      m > -1 &&
        m < c &&
        Math.abs(e * s - p * o) < 2.1 &&
        m < u &&
        ((u = m), (l = r.id)));
  }
  return l >= 0 ? l : d;
}
function Xt(e, t) {
  let n = P(e, t),
    r = e.length - n,
    i = -100 * n;
  (n === 0 && (i += 1e5), r === 0 && (i -= 1e5));
  for (let n of e)
    Math.abs(n.x) < 2.3 && Math.abs(n.y) < 2 && (i -= N(n.y) === t ? 4 : 8);
  return i;
}
var Zt = 60;
function* Qt(e, t, n, r, yieldSteps = Zt) {
  let i = t.filter((e) => e.id !== r.puckId),
    a = ct(n, r.cx, r.px, r.py, i);
  if (!a.ok) return null;
  (e.reset(t), e.launch(r.puckId, a.cx, a.px, a.py, n));
  let o = Math.ceil(Gt / k),
    s = 0;
  for (let t = 0; t < o; t++) {
    if ((e.step(), e.isSettled())) {
      if (++s >= 8) break;
    } else s = 0;
    (t + 1) % yieldSteps === 0 && (yield t);
  }
  e.stopAll();
  let c = e.snapshot();
  return { score: Xt(c, n), final: c };
}
var $t = globalThis.performance,
  en = () => ($t ? $t.now() : Date.now());
function* tn(e, t, n, r = Math.random, i = {}) {
  let a = i.now ?? en,
    o = e.filter((e) => e.held === void 0).map((e) => ({ ...e })),
    s = (e) => !i.canUse || i.canUse(e);
  if (o.filter((e) => N(e.y) === t && s(e.id)).length === 0) return null;
  let c = new xt(o),
    l = a(),
    u = [],
    d = 0,
    f = function* (e) {
      ((e.cx = F(e.cx, -8, 8)), (e.pull = F(e.pull, Ee, O)));
      let result = yield* Qt(c, o, t, B(t, e), n.precise ? 20 : Zt);
      return (
        d++,
        result ? ((e.score = result.score + (r() - 0.5) * 0.5), u.push(e), e) : null
      );
    };
  try {
    let e = Wt + Wt / Pe,
      i = [],
      p = [0, -1.5, 1.5, -3, 3, -4.5, 4.5, -6, 6, -7.5, 7.5];
    // 极限先比较两种力度，既能快速穿门，也能避免满力撞回己方。
    for (let e of p)
      for (let power of n.precise ? [0.9, 0.65] : [0.82])
        i.push({ cx: e, target: 0, tag: `direct`, pull: power * O });
    for (let t of p)
      (i.push({ cx: t, target: -e, tag: `bankL`, pull: O }),
        i.push({ cx: t, target: e, tag: `bankR`, pull: O }));
    for (let e of i) {
      let r = Jt(t, e.cx, e.pull, e.target);
      if (
        r !== null &&
        (yield* f({
          puckId: Yt(o, t, e.cx, e.target, s),
          cx: e.cx,
          psi: r,
          pull: e.pull,
          tag: e.tag,
          score: -1 / 0,
        }),
        yield d,
        d >= 12 && a() - l > n.budgetMs * 0.55)
      )
        break;
    }
    for (let e = 0; e < (n.precise ? 0 : 5) && a() - l < n.budgetMs * 0.6; e++) {
      let e = (r() * 2 - 1) * 8;
      (yield* f({
        puckId: Yt(o, t, e, 0, s),
        cx: e,
        psi: (r() * 2 - 1) * 0.9,
        pull: (0.5 + r() * 0.5) * O,
        tag: `random`,
        score: -1 / 0,
      }),
        yield d);
    }
    let m = [...u].sort((e, t) => t.score - e.score).slice(0, n.precise ? 3 : 5),
      h = [];
    for (let e of m) {
      for (let t of n.precise ? [-0.01, 0.01, -0.025, 0.025] : [-0.02, 0.02, -0.05, 0.05])
        h.push({ ...e, psi: e.psi + t, tag: e.tag + `~a` });
      for (let t of n.precise ? [-0.08, 0.08] : [-0.15, 0.12])
        h.push({ ...e, pull: e.pull * (1 + t), tag: e.tag + `~p` });
    }
    for (let e of h) {
      if (a() - l > n.budgetMs * (n.precise ? 0.8 : 1)) break;
      (yield* f(e), yield d);
    }
    let g = [...u].sort((e, t) => t.score - e.score),
      _ = g[0];
    if (!_)
      _ = {
        puckId: Yt(o, t, 0, 0, s),
        cx: 0,
        psi: 0,
        pull: 0.8 * O,
        tag: `fallback`,
        score: -1 / 0,
      };
    else if (n.robustTop > 0 && n.robustSamples > 0) {
      let e = -1 / 0;
      for (let i of g.slice(0, n.robustTop)) {
        // 留出稳健性验证的预算；同一候选完成全部样本后才比较均分。
        if (n.precise && a() - l >= n.budgetMs) break;
        let total = i.score,
          s = 1;
        for (let e = 0; e < n.robustSamples; e++) {
          let e = yield* Qt(c, o, t, B(t, nn(t, i, n, r)), n.precise ? 20 : Zt);
          (d++, yield d, (total += e ? e.score : -1e3), s++);
        }
        let average = total / s;
        average > e && ((e = average), (_ = i));
      }
    }
    n.sloppiness > 0 &&
      g.length > 1 &&
      r() < n.sloppiness &&
      (_ =
        g[
          Math.min(
            g.length - 1,
            1 + Math.floor(r() * Math.min(4, g.length - 1)),
          )
        ]);
    let v = B(t, _),
      y = o.filter((e) => e.id !== _.puckId),
      b = (e) => ct(t, e.cx, e.px, e.py, y).ok,
      x = B(t, nn(t, _, n, r));
    for (let e = 0; e < 6 && !b(x); e++) x = B(t, nn(t, _, n, r));
    return (
      b(x) || (x = v),
      { shot: x, intended: v, evaluated: d, bestScore: _.score }
    );
  } finally {
    c.free();
  }
}
function nn(e, t, n, r) {
  let i = 0.01,
    a = qt(e, t.cx, t.psi + i, t.pull),
    o = qt(e, t.cx, t.psi - i, t.pull),
    s = a !== null && o !== null ? (a - o) / (2 * i) : -1;
  Math.abs(s) < 0.05 && (s = s < 0 ? -0.05 : 0.05);
  let c = zt(r) * n.angleSigma;
  return {
    ...t,
    psi: F(t.psi + c / s, -Ut, Ut),
    pull: F(t.pull * (1 + zt(r) * n.powerSigma), Ee, O),
  };
}
function rn(e, t, n, r = Math.random, i = {}) {
  let a = tn(e, t, n, r, i);
  for (;;) {
    let e = a.next();
    if (e.done) return e.value;
  }
}
var Hn = {
  moving: `球还在滑动，等它慢下来`,
  already_holding: `一次只能拿一枚`,
  not_your_half: `只能拿自己半场的冰球`,
  held: `这枚球正被拿着`,
};
export { Rt, xt, Be, N, P, j, A, M, F, ze, Ve, Lt, Re, ct, rt, ut, tt, nt, et, St, Vt, tn, rn, Hn, O, Oe, Ee, k, T, E };
