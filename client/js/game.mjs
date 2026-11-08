// 弹射冰球 —— 1:1 复刻客户端
// 渲染/UI/音效/AI 控制器逆向移植自 https://bin.hlool.top 公开客户端 bundle（仅供学习研究）
// 规则引擎与服务端逻辑同源（原站把整套服务端打包进了客户端）
// 网络层通过 Colyseus SDK 对接权威服务器
// 重建：python3 deploy/build-game.py
import * as T3 from '../vendor/three-orig.js';
import { islandMenu } from './island-ui.mjs';
import { LocalPrediction } from './prediction.mjs?v=3';
import { n as e, t } from '../vendor/colyseus-orig.js';
import * as n from '@dimforge/rapier2d-compat';
await n.init();
const {A: r,B: i,C: a,D: o,E: s,F: c,I: l,L: u,M: d,N: f,O: p,P: m,R: h,S: g,T: _,V: v,_: y,a: b,b: x,c: S,d: ee,f: C,g: te,h: ne,i: re,j: ie,k: ae,l: w,m: oe,n: se,o: ce,p: le,r: ue,s: de,t: fe,u: pe,v: me,w: he,x: ge,y: _e,z: ve} = T3;

var T = 9.5,
  E = 15.5,
  D = 0.4,
  ye = 1.3,
  be = 11.5,
  xe = 0.12,
  Se = 10.5,
  Ce = 0.25,
  we = 4800,
  Te = 0.6,
  O = 3.9,
  Ee = 0.4,
  De = 0.8,
  Oe = (68 * Math.PI) / 180,
  ke = 1.08,
  MAX_SHOT_SPEED = 44,
  Ae = Math.PI,
  // 滑动阻力与接触摩擦分开：冰面保留惯性，擦边碰撞能传递旋转。
  je = 0.16,
  Me = 0.45,
  Ne = 0.88,
  Pe = 0.78,
  Fe = 0.72,
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
var I = T,
  L = 1,
  He = -be,
  Ue = (2 * I) / (1 + Ce),
  We = 0.02,
  Ge = 0.98;
function Ke(e) {
  return e === 0 ? 1 : -1;
}
function qe(e) {
  return e - L < He;
}
function Je(e) {
  return Math.min(Ge, Math.max(We, (e + I) / (2 * I)));
}
var R = { uLx: 0, uLy: 0, uRx: 0, uRy: 0, lenL: 0, lenR: 0, phi: 0 };
function Ye(e, t, n) {
  let r = e + I,
    i = t - He,
    a = Math.max(Math.hypot(r, i), L * 1.0001),
    o = Math.sqrt(a * a - L * L),
    s = L / a,
    c = o / a;
  ((r /= a), (i /= a));
  let l = r * c + i * s,
    u = -r * s + i * c,
    d = -I + l * o,
    f = He + u * o;
  ((n.uLx = -l),
    (n.uLy = -u),
    (r = e - I),
    (i = t - He),
    (a = Math.max(Math.hypot(r, i), L * 1.0001)));
  let p = Math.sqrt(a * a - L * L);
  ((s = L / a), (c = p / a), (r /= a), (i /= a));
  let m = r * c - i * s,
    h = r * s + i * c,
    g = I + m * p,
    _ = He + h * p;
  ((n.uRx = -m), (n.uRy = -h));
  let v = (d - e) / L,
    y = (f - t) / L,
    b = (g - e) / L,
    x = (_ - t) / L,
    S = Math.max(0, Math.atan2(v * x - y * b, v * b + y * x));
  ((n.phi = S), (n.lenL = o + (L * S) / 2), (n.lenR = p + (L * S) / 2));
}
function Xe(e, t) {
  return we * Math.max(0, e.lenL / (t * Ue) - 1);
}
function Ze(e, t) {
  return we * Math.max(0, e.lenR / ((1 - t) * Ue) - 1);
}
function Qe(e, t) {
  let n = Math.exp(Te * e.phi),
    r = Xe(e, t),
    i = Ze(e, t);
  if (i > n * r) {
    let r = We,
      i = t;
    for (let t = 0; t < 24; t++) {
      let t = (r + i) / 2;
      Ze(e, t) > n * Xe(e, t) ? (i = t) : (r = t);
    }
    return (r + i) / 2;
  }
  if (r > n * i) {
    let r = t,
      i = Ge;
    for (let t = 0; t < 24; t++) {
      let t = (r + i) / 2;
      Xe(e, t) > n * Ze(e, t) ? (r = t) : (i = t);
    }
    return (r + i) / 2;
  }
  return t;
}
function $e(e, t, n, r, i, a, o) {
  let s = Ke(e),
    c = s * t,
    l = s * n;
  if (!qe(l)) return ((a.sigma = null), !1);
  (a.sigma === null && (a.sigma = Je(c)), Ye(c, l, R));
  let u = Qe(R, a.sigma);
  a.sigma = u;
  let d = Xe(R, u),
    f = Ze(R, u),
    p = d * R.uLx + f * R.uRx,
    m = d * R.uLy + f * R.uRy,
    h = Math.hypot(p, m);
  if (h > 1e-9) {
    let e = p / h,
      t = m / h,
      n = s * r * e + s * i * t;
    n < 0 && ((p -= 12 * n * e), (m -= 12 * n * t));
  }
  return ((o.ax = (s * p) / Ae), (o.ay = (s * m) / Ae), !0);
}
function et(e) {
  return MAX_SHOT_SPEED * Math.min(1, Math.max(0, e) / O) ** +ke;
}
function tt(e, t, n, r) {
  let i = Ke(e),
    a = M(e),
    o = i * (n - t),
    s = i * (a - r),
    c = Math.hypot(n - t, r - a),
    l = et(c);
  if (!(s > 1e-6) || l < 1e-6) return null;
  let u = -De * Math.atan2(o, s),
    d = Math.sin(u),
    f = Math.cos(u),
    p = s / f,
    m = l / p,
    h = Math.PI / (2 * m);
  return {
    px: n,
    py: r,
    dx: i * d,
    dy: i * f,
    pull: c,
    dist: p,
    speed: l,
    omega: m,
    duration: h,
    steps: Math.max(1, Math.ceil(h / k - 1e-9)),
  };
}
function nt(e, t) {
  return e.dist * (1 - Math.cos(e.omega * Math.min(t * k, e.duration)));
}
function rt(e, t, n, r) {
  let i = tt(e, t, n, r);
  if (!i) return { ok: !1, x: n, y: r, vx: 0, vy: 0, speed: 0, steps: 0 };
  let a = nt(i, i.steps),
    o = i.dx * i.speed,
    s = i.dy * i.speed,
    c = Ke(e) * s;
  return {
    ok: i.speed >= 3 && c > 0.2 * i.speed,
    x: i.px + i.dx * a,
    y: i.py + i.dy * a,
    vx: o,
    vy: s,
    speed: i.speed,
    steps: i.steps,
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
    power: Math.min(1, u / MAX_SHOT_SPEED),
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
  vt = 0.6,
  yt = be - 1 - 0.05,
  bt = 0.001,
  xt = class {
    world = null;
    queue = null;
    bodies = [];
    tags = new Map();
    pre = new Float64Array();
    scratch = { x: 0, y: 0 };
    acc = { ax: 0, ay: 0 };
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
          band: [{ sigma: null }, { sigma: null }],
          launch: null,
          launching: !1,
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
        (a.band[0].sigma = null),
        (a.band[1].sigma = null));
      let o = tt(i, t, n, r);
      o &&
        ((a.launch = { plan: o, step: 0, tx: n, ty: r, cx: t, side: i }),
        a.body.setLinearDamping(0));
    }
    endLaunch(e) {
      e.launch && ((e.launch = null), e.body.setLinearDamping(je));
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
        (t.band[0].sigma = null),
        (t.band[1].sigma = null));
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
        (r.band[0].sigma = null),
        (r.band[1].sigma = null));
    }
    restore(pucks) {
      // 网络校正复用已有 WASM 世界，避免每个快照重建碰撞体。
      for (const puck of pucks) {
        const entry = this.find(puck.id);
        if (!entry) continue;
        this.endLaunch(entry);
        entry.launching = false;
        entry.quietSteps = 0;
        entry.band[0].sigma = entry.band[1].sigma = null;
        const body = entry.body;
        body.setEnabled(!(puck.held >= 0));
        body.setTranslation({ x: puck.x, y: puck.y }, true);
        body.setRotation(puck.a, true);
        body.setLinvel({ x: puck.vx ?? 0, y: puck.vy ?? 0 }, true);
        body.setAngvel(puck.av ?? 0, true);
        if (puck.launchStep >= 0 && !(puck.held >= 0)) {
          const plan = tt(puck.launchSide, puck.launchCx, puck.launchPx, puck.launchPy);
          if (plan && puck.launchStep < plan.steps) {
            entry.launch = { plan, step: puck.launchStep, tx: puck.x, ty: puck.y,
              cx: puck.launchCx, side: puck.launchSide };
            body.setLinearDamping(0);
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
      if (!this.bodies.some(({ body, launch }) => launch || (body.isEnabled() && !body.isSleeping())))
        return false;
      let n = this.bodies.length,
        r = this.scratch,
        i = this.acc;
      for (let e = 0; e < n; e++) {
        let t = this.bodies[e],
          n = t.launch;
        if (((t.launching = !!n), !n)) continue;
        let r = nt(n.plan, n.step + 1);
        ((n.tx = n.plan.px + n.plan.dx * r),
          (n.ty = n.plan.py + n.plan.dy * r));
        let i = t.body.translation();
        (t.body.setLinvel({ x: (n.tx - i.x) / k, y: (n.ty - i.y) / k }, !0),
          t.body.setAngvel(0, !0));
      }
      for (let t = 0; t < n; t++) {
        let n = this.bodies[t];
        if (!n.body.isEnabled() || n.body.isSleeping() || n.launch) continue;
        let a = n.body.translation();
        if (Math.abs(a.y) < yt) {
          ((n.band[0].sigma = null), (n.band[1].sigma = null));
          continue;
        }
        let o = n.body.linvel(r),
          s = o.x,
          c = o.y,
          l = !1;
        for (let t = 0; t < 2; t++) {
          let r = n.band[t].sigma !== null;
          if ($e(t, a.x, a.y, s, c, n.band[t], i)) {
            if (!r && e) {
              let speed = -A(t) * c;
              speed > 0.4 && e.push({ k: `band`, x: a.x, y: a.y, v: speed, s: t, a: n.id });
            }
            ((s += i.ax * k), (c += i.ay * k), (l = !0));
          }
        }
        l && n.body.setLinvel({ x: s, y: c }, !0);
      }
      if (e)
        for (let e = 0; e < n; e++) {
          let t = this.bodies[e].body.linvel(r);
          ((this.pre[2 * e] = t.x), (this.pre[2 * e + 1] = t.y));
        }
      (t.step(this.queue),
        e &&
          this.queue.drainCollisionEvents((t, n, r) => {
            r && this.onContact(t, n, e);
          }));
      for (let e = 0; e < n; e++) {
        let t = this.bodies[e],
          n = t.launch;
        if (!n) continue;
        n.step++;
        let r = t.body.translation();
        Math.abs(r.x - n.tx) > bt || Math.abs(r.y - n.ty) > bt
          ? this.endLaunch(t)
          : n.step >= n.plan.steps &&
            (t.body.setLinvel(
              { x: n.plan.dx * n.plan.speed, y: n.plan.dy * n.plan.speed },
              !0,
            ),
            this.endLaunch(t));
      }
      // 加快出手，但让低速尾段尽快停稳，避免整盘一直漂移。
      let a = 6 * k,
        o = 0.8 * k;
      for (let e = 0; e < n; e++) {
        let t = this.bodies[e],
          n = t.body;
        if (t.launching) {
          t.launching = !1;
          continue;
        }
        if (n.isSleeping() || !n.isEnabled()) continue;
        let i = n.linvel(r),
          s = Math.sqrt(i.x * i.x + i.y * i.y);
        if (s > 0) {
          let e = s > a ? (s - a) / s : 0;
          n.setLinvel({ x: i.x * e, y: i.y * e }, !1);
        }
        let c = n.angvel();
        if (c !== 0) {
          let e = Math.abs(c);
          n.setAngvel(e > o ? c - Math.sign(c) * o : 0, !1);
        }
        // 连续静止后休眠；带上仍有弹性势能时不能提前停下。
        if (s <= a && Math.abs(c) <= o && t.band[0].sigma === null && t.band[1].sigma === null) {
          if (++t.quietSteps >= 12) n.sleep();
        } else t.quietSteps = 0;
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
      name: `加时金球`,
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
  emptySince = [null, null];
  leadSince = null;
  acc = 0;
  pucks = [];
  tmp = [];
  events = [];
  sfxBuf = [];
  steps = 0;
  scorer = new Ft(this);
  constructor(e = {}) {
    ((this.matchTime = e.matchTime ?? 180),
      (this.overtimeTime = e.overtime ?? 60),
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
      (this.emptySince = [null, null]),
      (this.overtime = !1),
      (this.leadSince = null),
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
        let t = this.emptySince[e];
        if (t === null) this.emptySince[e] = this.time;
        else if (this.time - t >= 0.8) {
          this.finish(e, `clear`);
          return;
        }
      } else this.emptySince[e] = null;
    let e = this.count(0),
      t = this.count(1);
    if (this.overtime) {
      if (e === t) this.leadSince = null;
      else if (this.leadSince === null) this.leadSince = this.time;
      else if (this.time - this.leadSince >= 0.8) {
        this.finish(e < t ? 0 : 1, `overtime`);
        return;
      }
    }
    this.time < this.periodEnd ||
      (e === t
        ? !this.overtime && this.overtimeTime > 0
          ? ((this.overtime = !0),
            (this.leadSince = null),
            this.emit({ type: `overtime` }))
          : this.finish(-1, `time`)
        : this.finish(e < t ? 0 : 1, `time`));
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
  },
  Ht = 1.5,
  Ut = Oe,
  Wt = T - 1,
  Gt = 7;
function Kt(e, t, n, r) {
  let i = ut(e, 0, t, n, r),
    a = rt(e, t, i.px, i.py);
  if (!a.ok || Math.abs(a.vy) < 1e-6) return null;
  let o = -a.y / a.vy;
  return o > 0 ? a.x + a.vx * o : null;
}
function qt(e, t, n, r) {
  let i = ut(e, 0, t, n, r),
    a = rt(e, t, i.px, i.py);
  return a.ok ? Math.atan2(a.vx, A(e) * a.vy) : null;
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
function* Qt(e, t, n, r) {
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
    (t + 1) % Zt === 0 && (yield t);
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
      let n = yield* Qt(c, o, t, B(t, e));
      return (
        d++,
        n ? ((e.score = n.score + (r() - 0.5) * 0.5), u.push(e), e) : null
      );
    };
  try {
    let e = Wt + Wt / Pe,
      i = [],
      p = [0, -1.5, 1.5, -3, 3, -4.5, 4.5, -6, 6, -7.5, 7.5];
    for (let e of p)
      i.push({ cx: e, target: 0, tag: `direct`, pull: 0.82 * O });
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
    for (let e = 0; e < 5 && a() - l < n.budgetMs * 0.6; e++) {
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
    let m = [...u].sort((e, t) => t.score - e.score).slice(0, 5),
      h = [];
    for (let e of m) {
      for (let t of [-0.02, 0.02, -0.05, 0.05])
        h.push({ ...e, psi: e.psi + t, tag: e.tag + `~a` });
      for (let t of [-0.15, 0.12])
        h.push({ ...e, pull: e.pull * (1 + t), tag: e.tag + `~p` });
    }
    for (let e of h) {
      if (a() - l > n.budgetMs) break;
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
        let a = i.score,
          s = 1;
        for (let e = 0; e < n.robustSamples; e++) {
          let e = yield* Qt(c, o, t, B(t, nn(t, i, n, r)));
          (d++, yield d, (a += e ? e.score : -1e3), s++);
        }
        let l = a / s;
        l > e && ((e = l), (_ = i));
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
var an = [
    `七夕帮忙抓人被事主打成了医院vip客户`,
    `骑猪上高速`,
    `弟弟套个橡皮筋和技师解释是超薄`,
    `站在楼顶假装跳，等到人多往下尿`,
    `半夜三更偷偷去厕所调戏绝美蠕动小奶蛆`,
    `AAA情趣寿衣批发`,
    `吃5片伟哥去试镜导演让我演无能的丈夫`,
    `常因昵称不够雷霆而自卑`,
    `打了兄弟一夜发现是M把他法失禁了`,
  ],
  on =
    `扩散性百万甜面包.扩散性百万咸粽子.今晚你不要来.糖伯虎点蚊香.放荡不羁的腿毛.脸滚键盘抬头懵.五品带砖侍卫.一身正气结果漏气.嗝是迷路的屁.退役熬夜选手.在水晶贴瓷砖.一级抬杠选手.山猪口服液.鲁迅漂流记.虾仁不眨眼.犯困嫌疑人.刚进厂就被螺丝打了.把闹钟按出工伤.被窝驻外办事处.冰箱里的临时演员.倒立洗头假装下雨.我的精神状态包邮.在火葬场练习热身.给蚊子办了张饭卡.骑共享单车去登基.给老板画饼被撑到了.在电子厂修炼仙术.月老把我拉进工作群.奈何桥上查酒驾.孟婆汤里加珍珠.阎王夸我命挺硬.棺材板上的按摩椅.在坟头蹦迪扭伤脚.殡仪馆气氛组组长.假牙咬到自己的舌头.把体检报告当成绩单.脑子寄存在快递柜.给财神发了收款码.功德箱支持分期吗.寺庙门口卖假发.佛祖让我先打完这局.熬夜熬出工龄.退休前先睡一觉.简历特长是能活着.绩效全靠做梦完成.上班像被押送过来.工位上长出的蘑菇.工资到账自动隐身.做梦加班申请调休.带薪发呆被评先进.离职申请写成情书.和打印机一起卡纸.蟑螂看了都递烟.蚊子叮我嫌太咸.我和苍蝇互相嫌弃.把苍蝇拍玩成羽毛球.蟑螂恶霸兼房东.蚊香圈里的赛车手.开水烫头烫成泡面.给泡面买了意外险.饭卡余额比命还薄.吃席坐在打包区.为了一口醋包了酒店.饿了先啃两口空气.火锅底料当沐浴露.可乐兑枸杞算养生.在奶茶里发现自己.鸡爪界的心理医生.奶茶续命医保不报.炸鸡的临终关怀员.把辣条吃出仪式感.螺蛳粉香水代言人.给秃顶贴了张罚单.用发际线丈量人生.头发申请提前退休.秃头还要做发型管理.裤腰带勒出了腹肌.腹肌被火锅封印了.袜子失踪案主犯.拖鞋穿出了高定感.给马桶装上电竞椅.厕所里开新闻发布会.放屁申请了专利.肚子在开交响音乐会.打嗝被误认为摩托车.用脚趾抠出三室一厅.社死现场的常驻嘉宾.尴尬到连夜搬去月球.网恋对象是客服机器人.相亲对象只夸我守时.丘比特拿我练了半天.月老的线被我织成秋裤.在恋爱脑里挖野菜.给前任点了不辣的变态辣.爱情的保安临时请假.对方正在输入遗书.弹弓一响全村吃席.球没进先把气势送过去.靠反弹给自己添堵.把球门当收费站.守门守到办理退休.冰球把我当人机打.输了就说鼠标漏电.手速跟不上我的嘴.蓄力半天弹了个寂寞.瞄准靠缘分进球靠做梦.我的球正在绕路.球进不去我先进医院.我的胜率需要打码.这一球包含个人恩怨.对手在玩我在渡劫.全村最后一根橡皮筋.球场保洁兼职球王.橡皮筋工伤鉴定员.发射前先念两句经.反向操作申请了专利.人菜但昵称很有攻击性.嘴硬属于被动技能.暂停一下我去查攻略.把对面笑死也算赢`.split(
      `.`,
    ),
  sn =
    `刚出锅的.正在渡劫的.带薪摸鱼的.欠费停机的.被窝里的.拒绝加班的.半夜营业的.准备退休的.倒立洗头的.假装很忙的.月薪三块的.离家出走的.偷偷练球的.吃席迟到的.忘带脑子的.正在补觉的.医保报销的.被迫营业的.精神抖擞的.刚被退货的.考编失败的.在逃的.返厂维修的.自带音效的.嘴硬心软的.深夜emo的.漏电的.长出腹肌的.躲进冰箱的.沉迷养生的.五险一金的.打卡下班的`.split(
      `.`,
    ),
  cn =
    `脆皮大学生.拖鞋战神.蛆宝.秃头仙人.酸菜鱼.社恐大鹅.退休球王.韭菜精.工位土豆.泡面董事长.蟑螂房东.挖掘机公主.香菜刺客.咸鱼教练.东北夹子.搓澡大侠.奶茶保镖.电子榨菜.睡衣皇帝.马桶骑士.螺蛳粉仙子.窜天猴.弹弓师傅.冰球保安.洗碗冠军.麻辣兔头.炸鸡评委.反弹大师.村口情圣.煎饼刺客.精神小伙.橡皮筋教授`.split(
      `.`,
    ),
  ln =
    `小鱼干.阿杰.橘子汽水.夜猫子.木头人.冰球小王子.一杯奶茶.星河.北方的狼.清风.晚风.糖豆.大白.阿飞.弹弓高手.稳如老狗.快乐小熊.摸鱼达人.今天也要加油.小确幸.慢慢来.不吃香菜.柠檬精.发呆的猫.咸鱼翻身.打工人.晴天.南城.山海.白开水.芝士就是力量.草莓味.路过的风.冰阔落.小飞侠.老街.豆浆油条.一只土拨鼠.月亮不睡.鹿鹿.小野.甜甜圈.可乐加冰.凌晨三点.风起.纸飞机.小透明.奶盖.桃子.西瓜太郎.旺仔.阿狸.花生.小熊软糖.海盐.青柠.橙子.雨后.秋刀鱼.番茄炒蛋.鸭梨山大.岁岁.嘟嘟.面包.暴走萝卜.小火锅.布丁.芒果.球球.一颗星`.split(
      `.`,
    ),
  un = [``, ``, ``, ``, `酱`, `呀`, `君`, `同学`, `哥`, `_`, `~`],
  dn =
    `Leo.Kiki.momo.Alex.joker.Tiger.Coco.Lucky.Sunny.Jack.Nemo.Mia.Kevin.Yoyo.Bobo.Ace.Max.Luna.Neo.Rex.Doudou.xiaoyu.aming.Ken.Zoe.Ray.Milo.Toby.Eric.Ivy`.split(
      `.`,
    ),
  V = (e, t) => e[Math.floor(t() * e.length)];
function fn(e = Math.random, t = ``, n = 20) {
  let r = Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 20,
    i = (e) => Array.from(e.trim()).slice(0, r).join(``);
  for (let n = 0; n < 8; n++) {
    let n = e(),
      r;
    if (n < 0.12) r = V(an, e);
    else if (n < 0.6) r = V(on, e);
    else if (n < 0.85) r = V(sn, e) + V(cn, e);
    else if (n < 0.87) r = `玩家` + Math.floor(1e3 + e() * 9e3);
    else if (n < 0.96) {
      r = V(ln, e);
      let t = e();
      t < 0.18 ? (r += Math.floor(1 + e() * 99)) : t < 0.4 && (r += V(un, e));
    } else {
      r = V(dn, e);
      let t = e();
      t < 0.45
        ? (r += Math.floor(e() * 1e3))
        : t < 0.6
          ? (r = r.toLowerCase())
          : t < 0.7 && (r += `_` + Math.floor(e() * 100));
    }
    if (((r = i(r)), r && r !== t)) return r;
  }
  let a = i(`路人` + Math.floor(1e3 + e() * 9e3));
  return a === t ? i(`球友`) : a;
}
var pn = 0.55;
function mn(e, t, n, r) {
  return {
    side: e,
    puckId: t,
    mode: `hold`,
    x: n,
    y: r,
    cx: 0,
    lift: 0,
    power: 0,
    dirX: 0,
    dirY: 0,
    exitX: n,
    exitY: r,
    ok: !1,
  };
}
function hn(e, t, n, r) {
  let i = t.filter((t) => t.id !== e.puckId && t.held === void 0),
    a = ct(e.side, e.cx, n, r, i);
  ((e.cx = a.cx),
    (e.x = a.engaged ? a.px : F(n, -8.5, 8.5)),
    (e.y = a.engaged ? a.py : a.cy),
    (e.power = a.engaged ? a.power : 0),
    (e.dirX = a.dirX),
    (e.dirY = a.dirY),
    (e.exitX = a.exitX),
    (e.exitY = a.exitY),
    (e.ok = a.ok));
}
function gn(e, t) {
  if (!e) return { held: null, pressing: [], aim: null };
  let n = { id: e.puckId, x: e.x, y: e.y, lift: e.lift };
  if (e.mode === `hold`) return { held: n, pressing: [], aim: null };
  let r =
    e.power > 0.01
      ? {
          cx: e.exitX,
          cy: e.exitY,
          dirX: e.dirX,
          dirY: e.dirY,
          power: e.power,
          mine: t,
        }
      : null;
  return { held: n, pressing: [{ side: e.side, id: e.puckId }], aim: r };
}
var _n = class {
    host;
    aim = null;
    pointerId = null;
    grab = { x: 0, y: 0 };
    dropping = null;
    lastPowerStep = 0;
    offs = [];
    constructor(e) {
      this.host = e;
      let t = e.canvas,
        n = (e, n) => {
          (t.addEventListener(e, n),
            this.offs.push(() => t.removeEventListener(e, n)));
        };
      (n(`pointerdown`, (e) => this.down(e)),
        n(`pointermove`, (e) => this.move(e)),
        n(`pointerup`, (e) => this.up(e)),
        n(`pointercancel`, () => this.cancel()),
        n(`lostpointercapture`, () => {
          this.aim && this.cancel();
        }),
        n(`contextmenu`, (e) => e.preventDefault()));
      let r = (e) => {
        e.key === `Escape` && this.aim && (e.preventDefault(), this.cancel());
      };
      (window.addEventListener(`keydown`, r),
        this.offs.push(() => window.removeEventListener(`keydown`, r)));
    }
    dispose() {
      (this.offs.forEach((e) => e()), (this.host.canvas.style.cursor = ``));
    }
    boardPoint(e) {
      return this.host.scene.pick(
        e.clientX,
        e.clientY,
        this.host.canvas.getBoundingClientRect(),
      );
    }
    down(e) {
      if (e.button === 2) {
        this.cancel();
        return;
      }
      if (this.aim || !this.host.enabled() || e.button !== 0) return;
      let t = this.boardPoint(e);
      if (!t) return;
      let n = this.host.side(),
        r = 1 * (e.pointerType === `mouse` ? 1.3 : 1.75),
        i = null,
        a = r;
      for (let e of this.host.pucks()) {
        if (N(e.y) !== n || e.held !== void 0) continue;
        let r = Math.hypot(e.x - t.x, e.y - t.y);
        r < a && ((a = r), (i = e));
      }
      if (!i) return;
      e.preventDefault();
      let o = this.host.canSelect(i);
      o
        ? this.host.onDenied?.(i, o)
        : (this.host.canvas.setPointerCapture(e.pointerId),
          (this.pointerId = e.pointerId),
          (this.grab = { x: i.x - t.x, y: i.y - t.y }),
          (this.dropping = null),
          (this.aim = mn(n, i.id, i.x, i.y)),
          (this.lastPowerStep = 0),
          (this.host.canvas.style.cursor = `grabbing`),
          this.host.onSelect(this.aim));
    }
    move(e) {
      let t = this.aim;
      if (!t) {
        this.hover(e);
        return;
      }
      if (e.pointerId !== this.pointerId) return;
      if (!this.host.enabled()) {
        this.cancel();
        return;
      }
      let n = this.boardPoint(e);
      if (!n) return;
      ((this.grab.x *= 0.75), (this.grab.y *= 0.75));
      let r = t.side,
        i = n.x + this.grab.x,
        a = n.y + this.grab.y;
      if (lt(r, a)) {
        (t.mode === `hold` && ((t.mode = `pull`), (t.cx = F(t.x, -8, 8))),
          hn(t, this.host.pucks(), i, a));
        let e = Math.floor(t.power * 12);
        e !== this.lastPowerStep &&
          (e > this.lastPowerStep && this.host.onStretch?.(t.power),
          (this.lastPowerStep = e));
      } else {
        ((t.mode = `hold`), (t.power = 0), (t.ok = !1));
        let e = Re(r);
        ((t.x = F(i, e.minX, e.maxX)),
          (t.y = F(a, e.minY, e.maxY)),
          (this.lastPowerStep = 0));
      }
      this.host.onChange?.(t);
    }
    up(e) {
      let t = this.aim;
      t &&
        e.pointerId === this.pointerId &&
        (t.mode === `pull` && t.ok && this.host.enabled()
          ? ((this.aim = null),
            this.release(),
            this.host.onShoot(
              { puckId: t.puckId, cx: t.cx, px: t.x, py: t.y },
              t,
            ))
          : this.cancel());
    }
    release() {
      (this.pointerId !== null &&
        this.host.canvas.hasPointerCapture(this.pointerId) &&
        this.host.canvas.releasePointerCapture(this.pointerId),
        (this.pointerId = null),
        (this.host.canvas.style.cursor = ``));
    }
    hover(e) {
      if (e.pointerType !== `mouse`) return;
      let t = !1;
      if (this.host.enabled()) {
        let n = this.boardPoint(e);
        if (n) {
          let e = this.host.side();
          t = this.host
            .pucks()
            .some(
              (t) =>
                N(t.y) === e &&
                t.held === void 0 &&
                Math.hypot(t.x - n.x, t.y - n.y) < 1.3 &&
                !this.host.canSelect(t),
            );
        }
      }
      this.host.canvas.style.cursor = t ? `grab` : ``;
    }
    cancel() {
      let e = this.aim;
      ((this.aim = null),
        this.release(),
        e &&
          ((this.dropping = {
            id: e.puckId,
            x: e.x,
            y: e.y,
            lift: e.lift,
            t: 0,
          }),
          this.host.onDrop(e)));
    }
    abort() {
      ((this.aim = null), (this.dropping = null), this.release());
    }
    update(e) {
      let t = this.aim;
      if (t) {
        let n = t.mode === `hold` ? pn : 0;
        t.lift += (n - t.lift) * Math.min(1, e * 16);
      }
      this.dropping &&
        ((this.dropping.t += e / 0.14),
        this.dropping.t >= 1 && (this.dropping = null));
    }
    view() {
      if (this.aim) return gn(this.aim, !0);
      let e = this.dropping;
      return e
        ? {
            held: { id: e.id, x: e.x, y: e.y, lift: e.lift * (1 - e.t) },
            pressing: [],
            aim: null,
          }
        : { held: null, pressing: [], aim: null };
    }
    get selectedId() {
      return this.aim?.puckId ?? null;
    }
  },
  vn = {
    easy: { react: [1.8, 3.2], anim: 1.35 },
    normal: { react: [0.9, 1.7], anim: 1 },
    hard: { react: [0.5, 1.1], anim: 0.82 },
  },
  yn = (e) => (e < 0.5 ? 2 * e * e : 1 - (-2 * e + 2) ** 2 / 2),
  bn = class {
    side;
    level;
    host;
    budgetMsPerFrame;
    aim = null;
    phase = `off`;
    gen = null;
    plan = null;
    t = 0;
    wait = 0;
    from = { x: 0, y: 0 };
    tempo;
    constructor(e, t, n, r = 5) {
      ((this.side = e),
        (this.level = t),
        (this.host = n),
        (this.budgetMsPerFrame = r),
        (this.tempo = vn[t]));
    }
    get thinking() {
      return this.phase === `think`;
    }
    get acting() {
      return (
        this.phase === `lift` ||
        this.phase === `move` ||
        this.phase === `pull` ||
        this.phase === `hold`
      );
    }
    start(e = 0.4 + Math.random() * 0.6) {
      (this.stop(), (this.phase = `wait`), (this.wait = e), (this.t = 0));
    }
    stop() {
      (this.gen?.return(null),
        (this.gen = null),
        (this.phase = `off`),
        (this.aim = null));
    }
    rest(e, t = e) {
      ((this.phase = `wait`),
        (this.wait = e + Math.random() * (t - e)),
        (this.t = 0),
        (this.aim = null));
    }
    update(e) {
      this.t += e;
      let t = this.tempo.anim;
      switch (this.phase) {
        case `off`:
          return;
        case `wait`:
          if (this.t >= this.wait) {
            let e = this.host,
              t = Vt[this.level],
              n = e.overtime() ? { ...t, angleSigma: t.angleSigma * Ht } : t;
            ((this.gen = tn(e.pucks(), this.side, n, Math.random, {
              canUse: (t) => e.canGrab(t),
            })),
              (this.plan = null),
              (this.phase = `think`),
              (this.t = 0));
          }
          return;
        case `think`: {
          if (this.gen) {
            let e = performance.now() + this.budgetMsPerFrame;
            for (; performance.now() < e;) {
              let e = this.gen.next();
              if (e.done) {
                ((this.plan = e.value), (this.gen = null));
                break;
              }
            }
          }
          if (this.gen) return;
          let e = this.plan;
          if (!e) return this.rest(0.5);
          let t = this.host.pucks().find((t) => t.id === e.shot.puckId);
          if (!t || !this.host.grab(e.shot.puckId)) return this.rest(0.15, 0.3);
          ((this.from = { x: t.x, y: t.y }),
            (this.aim = mn(this.side, e.shot.puckId, t.x, t.y)),
            (this.aim.cx = e.shot.cx),
            (this.phase = `lift`),
            (this.t = 0));
          return;
        }
        case `lift`: {
          let e = this.aim;
          ((e.lift = pn * yn(Math.min(1, this.t / (0.14 * t)))),
            this.t >= 0.14 * t && this.next(`move`));
          return;
        }
        case `move`: {
          let e = this.aim,
            n = 0.42 * t,
            r = yn(Math.min(1, this.t / n)),
            i = M(this.side) + (this.side === 0 ? 0.02 : -0.02);
          ((e.x = this.from.x + (e.cx - this.from.x) * r),
            (e.y = this.from.y + (i - this.from.y) * r),
            (e.lift = pn * (1 - r * 0.6)),
            this.host.move(e.x, e.y),
            this.t >= n && this.next(`pull`));
          return;
        }
        case `pull`: {
          let n = this.aim;
          n.mode = `pull`;
          let r = 0.46 * t,
            i = 1 - (1 - Math.min(1, this.t / r)) ** 3,
            a = this.plan.shot,
            o = M(this.side);
          (hn(
            n,
            this.host.pucks(),
            a.cx + (a.px - a.cx) * i,
            o + (a.py - o) * i,
          ),
            (n.lift = Math.max(0, n.lift - e * 8)),
            this.host.move(n.x, n.y),
            this.t >= r && this.next(`hold`));
          return;
        }
        case `hold`: {
          if (this.t < 0.12 * t) return;
          let e = this.aim,
            n = this.plan.shot,
            r = e.ok ? { puckId: n.puckId, cx: e.cx, px: e.x, py: e.y } : n;
          (this.host.shoot(r) || this.host.drop(e.x, e.y),
            this.rest(this.tempo.react[0], this.tempo.react[1]));
          return;
        }
      }
    }
    next(e) {
      ((this.phase = e), (this.t = 0));
    }
  },
  xn = `sling.tutorialDone`,
  Sn = 2.8,
  Cn = 2.6,
  wn = (e) => (e < 0.5 ? 2 * e * e : 1 - (-2 * e + 2) ** 2 / 2),
  H = (e, t, n) => F((e - t) / (n - t), 0, 1),
  Tn = class {
    scene;
    ui;
    canvas;
    t = 0;
    target = null;
    done;
    constructor(e, t, n) {
      ((this.scene = e), (this.ui = t), (this.canvas = n));
      let r = null;
      try {
        r = localStorage.getItem(xn);
      } catch {}
      this.done = r === `1`;
    }
    finish() {
      if (!this.done) {
        this.done = !0;
        try {
          localStorage.setItem(xn, `1`);
        } catch {}
        this.hide();
      }
    }
    hide() {
      ((this.t = 0), (this.target = null), this.ui.guideHand(null));
    }
    update(e, t, n, r, i) {
      if (this.done || !t) {
        (this.target !== null || this.t !== 0) && this.hide();
        return;
      }
      let a =
        this.target === null ? void 0 : r.find((e) => e.id === this.target);
      if (!a || !i(a)) {
        let e = M(n);
        ((a = r
          .filter(i)
          .sort(
            (t, n) => Math.hypot(t.x, t.y - e) - Math.hypot(n.x, n.y - e),
          )[0]),
          (this.t = 0),
          (this.target = a ? a.id : null));
      }
      if (!a) {
        this.ui.guideHand(null);
        return;
      }
      this.t = (this.t + e) % Sn;
      let o = this.t,
        s = F(a.x, -8, 8),
        c = M(n),
        l = c - A(n) * Cn,
        u = a.x,
        d = a.y,
        f = 0,
        p = 0;
      if (o < 0.35) ((p = H(o, 0, 0.2)), (f = H(o, 0.15, 0.35)));
      else if (o < 1.15) {
        let e = wn(H(o, 0.35, 1.15));
        ((u = a.x + (s - a.x) * e),
          (d = a.y + (c - a.y) * e),
          (p = 1),
          (f = 1));
      } else if (o < 1.95) {
        let e = wn(H(o, 1.15, 1.85));
        ((u = s), (d = c + (l - c) * e), (p = 1), (f = 1));
      } else
        o < 2.45 &&
          ((u = s),
          (d = l),
          (f = 1 - H(o, 1.95, 2.1)),
          (p = 1 - H(o, 2.15, 2.45)));
      if (p <= 0) {
        this.ui.guideHand(null);
        return;
      }
      let m = this.canvas.getBoundingClientRect(),
        h = (e, t) => {
          let n = this.scene.project(e, t);
          return { x: m.left + n.x, y: m.top + n.y };
        },
        g = h(u, d);
      this.ui.guideHand({
        ...g,
        press: f,
        alpha: p,
        pulling: o >= 1.15 && o < 2.1,
        path: [h(a.x, a.y), h(s, c), h(s, l)],
      });
    }
  },
  En = class {
    pending = new Map();
    count = 0;
    best = 0;
    reset() {
      (this.pending.clear(), (this.count = 0), (this.best = 0));
    }
    shot(e, t) {
      this.pending.set(e, t);
    }
    pass(e, t) {
      let n = this.pending.get(e);
      return n === void 0 || t - n > 3
        ? 0
        : (this.pending.delete(e),
          this.count++,
          (this.best = Math.max(this.best, this.count)),
          this.count);
    }
    update(e) {
      for (let [t, n] of this.pending)
        e - n > 3 && (this.pending.delete(t), (this.count = 0));
    }
  },
  Dn = `sling.settings`,
  On = { guide: !0, overtimeNoGuide: !0 };
function kn() {
  try {
    let e = JSON.parse(localStorage.getItem(Dn) ?? `{}`);
    return {
      guide: typeof e.guide == `boolean` ? e.guide : On.guide,
      overtimeNoGuide:
        typeof e.overtimeNoGuide == `boolean`
          ? e.overtimeNoGuide
          : On.overtimeNoGuide,
    };
  } catch {
    return { ...On };
  }
}
var U = kn();
function An(e) {
  Object.assign(U, e);
  try {
    localStorage.setItem(Dn, JSON.stringify(U));
  } catch {}
}
function jn(e) {
  return U.guide && !(e && U.overtimeNoGuide);
}
function Mn(e) {
  return (
    e.length > 0 && e.every((e) => Number.isFinite(e.x) && Number.isFinite(e.y))
  );
}
var Nn = {
  clear: [`你率先清空了自己的半场`, `对手率先清空了半场`],
  time: [`时间到，你的半场剩余更少`, `时间到，对手的半场剩余更少`],
  overtime: [`加时赛中你率先领先，金球制胜`, `加时赛中对手率先领先`],
  forfeit: [`对手中途离开，判你获胜`, `你中途离开，判负`],
  disconnect: [`对手断线未能重连，判你获胜`, `断线超时，判负`],
};
function Pn(e) {
  return e ? `加时赛结束，双方半场剩余仍然相同` : `时间到，双方半场剩余相同`;
}
function Fn(e, t, n, r) {
  if (r === `time`) (e.ui.flash(`时间到`, `warn`), e.sfx.timeout());
  else if (r === `clear`) {
    let r = n === t;
    e.ui.flash(r ? `清空！` : `对手清空了`, r ? `go` : `warn`);
  } else if (r === `overtime`) {
    let r = n === t;
    e.ui.flash(r ? `金球制胜！` : `对手金球制胜`, r ? `go` : `warn`);
  }
}
function In(e, t) {
  (e.ui.flash(`加时赛`, `warn`), e.sfx.go());
  let n = U.guide && !jn(!0);
  e.ui.toast(`加时 ${t} 秒：先领先的一方获胜${n ? ` · 辅助线已关闭` : ``}`, {
    ms: 2600,
  });
}
function Ln(e, t) {
  return (jn(t) || (e.aims = []), e);
}
function Rn(e) {
  let t = [],
    n = [],
    r = [];
  for (let i of e)
    i &&
      (i.held && t.push(i.held), n.push(...i.pressing), i.aim && r.push(i.aim));
  return { helds: t, pressing: n, aims: r };
}
function zn(e, t, n) {
  let r = e.project(t, n),
    i = e.renderer.domElement.clientWidth || 1;
  return (r.x / i) * 2 - 1;
}
function Bn(e, t, n = !0) {
  if ((t.k !== `launch` && e.scene.impact(t.k, t.x, t.y, t.v), !n)) return;
  let r = zn(e.scene, t.x, t.y);
  t.k === `launch` ? e.sfx.launch(t.v, r) : e.sfx.hit(t.k, t.v, r);
}
function Vn(e) {
  let t = Math.max(0, Math.round(e / 1e3));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, `0`)}`;
}
var Hn = {
    moving: `球还在滑动，等它慢下来`,
    already_holding: `一次只能拿一枚`,
    not_your_half: `只能拿自己半场的冰球`,
    held: `这枚球正被拿着`,
  },
  Un = `实时对战，随时出手！
按住自己半场的冰球 → 压上弹力带往后拉 → 松手发射
先清空自己半场的一方获胜`,
  Wn = class {
    ctx;
    kind;
    engine;
    ai = [null, null];
    input = null;
    human;
    levelLabel;
    opponentName;
    stage = `countdown`;
    countdown = 0;
    lastCount = -1;
    paused = !1;
    overDelay = -1;
    hinted = !1;
    lastOne = [!1, !1];
    wins = [0, 0];
    guide = null;
    streak = new En();
    onKey = (e) => {
      e.key !== `Escape` ||
        e.defaultPrevented ||
        this.kind !== `local` ||
        this.stage === `over` ||
        (this.paused
          ? this.ctx.ui.screen === `dialog` && this.resume()
          : this.onMenu());
    };
    onVisibility = () => {
      document.hidden &&
        this.kind === `local` &&
        this.stage !== `over` &&
        !this.paused &&
        this.onMenu();
    };
    constructor(e, t) {
      if (
        ((this.ctx = e),
        (this.opponentName = `demo` in t ? `` : fn(Math.random, e.ui.name)),
        (this.engine = new Rt(
          `demo` in t ? {} : { matchTime: t.matchTime, overtime: t.overtime },
        )),
        `demo` in t)
      )
        ((this.kind = `demo`),
          (this.human = null),
          (this.levelLabel = ``),
          (this.ai[0] = new bn(0, `normal`, this.aiHost(0), 3)),
          (this.ai[1] = new bn(1, `easy`, this.aiHost(1), 3)));
      else {
        ((this.kind = `local`),
          (this.human = 0),
          (this.levelLabel = Vt[t.level].label),
          (this.ai[1] = new bn(1, t.level, this.aiHost(1))));
        let { scene: n, sfx: r, ui: i } = e;
        ((this.input = new _n({
          scene: n,
          canvas: e.canvas,
          side: () => 0,
          enabled: () => this.stage === `playing` && !this.paused,
          pucks: () => this.engine.getPucks(),
          canSelect: (e) => this.engine.canGrab(0, e.id),
          onSelect: (e) => {
            this.engine.grab(0, e.puckId).ok
              ? (r.select(), r.buzz(8))
              : this.input.abort();
          },
          onChange: (e) => this.engine.moveHold(0, e.x, e.y),
          onShoot: (e) => {
            let t = this.engine.shoot(0, e);
            t.ok
              ? (r.buzz(12 + Math.round(t.shot.power * 16)),
                this.guide?.finish())
              : (this.engine.drop(0, e.px, e.py),
                i.toast(
                  t.reason === `cooldown`
                    ? `出手太快了`
                    : `这一击无效，请重新瞄准`,
                ));
          },
          onDrop: (e) => {
            (this.engine.drop(0, e.x, e.y), r.putBack());
          },
          onDenied: (e, t) => {
            (n.shake(e.id), r.deny(), r.buzz([10, 40, 10]));
            let a = Hn[t];
            a && i.toast(a);
          },
          onStretch: (e) => r.stretch(e),
        })),
          (this.guide = new Tn(n, i, e.canvas)),
          document.addEventListener(`visibilitychange`, this.onVisibility),
          window.addEventListener(`keydown`, this.onKey));
      }
      (e.scene.setViewSide(0),
        (e.scene.onPass = (e, t, n) => this.onPass(e, n)),
        this.start());
    }
    aiHost(e) {
      let t = this.engine;
      return {
        pucks: () => t.getPucks(),
        canGrab: (n) => t.canGrab(e, n) === null,
        grab: (n) => t.grab(e, n).ok,
        move: (n, r) => t.moveHold(e, n, r),
        shoot: (n) => t.shoot(e, n).ok,
        drop: (n, r) => {
          t.drop(e, n, r);
        },
        overtime: () => t.overtime,
      };
    }
    start() {
      if (
        (this.engine.reset(),
        this.engine.drainEvents(),
        this.ai.forEach((e) => e?.stop()),
        this.input?.abort(),
        this.ctx.scene.resetEffects(),
        (this.stage = `countdown`),
        (this.countdown = this.kind === `demo` ? 1.2 : 3.4),
        (this.lastCount = -1),
        (this.overDelay = -1),
        (this.paused = !1),
        (this.lastOne = [!1, !1]),
        this.streak.reset(),
        this.guide?.hide(),
        this.kind === `local`)
      ) {
        let { ui: e } = this.ctx;
        (e.show(null),
          e.setHud(!0),
          e.resetCounts(),
          e.setScore(
            this.wins[0] + this.wins[1] > 0
              ? `${this.wins[0]}:${this.wins[1]}`
              : null,
          ));
      }
    }
    update(e) {
      let { ui: t, sfx: n } = this.ctx;
      if (this.stage === `countdown` && !this.paused) {
        this.countdown -= e;
        let r = Math.ceil(this.countdown - 0.4);
        (this.kind === `local` &&
          r !== this.lastCount &&
          r >= 1 &&
          r <= 3 &&
          (t.flash(String(r)), n.countdown()),
          (this.lastCount = r),
          this.countdown <= 0.4 &&
            ((this.stage = `playing`),
            this.ai.forEach((e) => e?.start()),
            this.kind === `local` &&
              (t.flash(`开始！`, `go`), n.go(), this.hinted || t.hint(Un))));
      }
      if (this.stage === `playing` && !this.paused) {
        this.engine.update(e);
        for (let t of this.ai) t?.update(e);
        this.streak.update(this.engine.time);
      }
      (this.input?.update(e),
        this.guide?.update(
          e,
          this.stage === `playing` &&
            !this.paused &&
            !this.input?.aim &&
            t.screen === null,
          0,
          this.engine.getPucks(),
          (e) => this.engine.canGrab(0, e.id) === null,
        ));
      for (let e of this.engine.drainEvents())
        switch (e.type) {
          case `sfx`:
            Bn(this.ctx, e.e, this.kind === `local`);
            break;
          case `shot`:
            e.shot.side === this.human &&
              (this.streak.shot(e.shot.puckId, this.engine.time),
              this.hinted || ((this.hinted = !0), t.hint(null)));
            break;
          case `overtime`:
            this.kind === `local` && In(this.ctx, this.engine.overtimeTime);
            break;
          case `over`:
            ((this.stage = `over`),
              (this.overDelay = this.kind === `demo` ? 2.5 : 1.1),
              this.input?.abort(),
              this.ai.forEach((e) => e?.stop()),
              (e.winner === 0 || e.winner === 1) && this.wins[e.winner]++,
              this.kind === `local` &&
                (Fn(this.ctx, this.human, e.winner, e.reason),
                t.setPower(null)));
        }
      (this.overDelay >= 0 &&
        ((this.overDelay -= e), this.overDelay < 0 && this.onOver()),
        this.kind === `local` && this.updateHud());
      let r = Rn([
          this.input ? this.input.view() : null,
          ...this.ai.map((e) => (e?.aim ? gn(e.aim, !1) : null)),
        ]),
        i = null;
      return (
        this.human !== null &&
          this.stage === `playing` &&
          !this.paused &&
          !this.input?.aim &&
          (i = new Set(
            this.engine
              .getPucks()
              .filter((e) => this.engine.canGrab(0, e.id) === null)
              .map((e) => e.id),
          )),
        this.kind === `local` && Ln(r, this.engine.overtime),
        {
          pucks: this.engine.getPucks(),
          ...r,
          highlight: i,
          selected: this.input?.selectedId ?? null,
        }
      );
    }
    onPass(e, t) {
      if (this.kind !== `local`) return;
      let { ui: n, sfx: r } = this.ctx;
      if ((r.pass(e === this.human), e === this.human)) {
        let e = this.streak.pass(t, this.engine.time);
        e >= 2 && (n.streak(e), r.combo(e));
      }
      let i = this.engine.count(0),
        a = this.engine.count(1);
      (i === 1 && !this.lastOne[0]
        ? n.flash(`最后一枚！`, `info`)
        : a === 1 && !this.lastOne[1] && n.flash(`AI 只剩最后一枚！`, `warn`),
        (this.lastOne = [i === 1, a === 1]));
    }
    updateHud() {
      let { ui: e } = this.ctx,
        t = this.engine,
        n = this.ai[1];
      (e.setPlayers(
        {
          name: e.name,
          sub: this.input?.aim ? `瞄准中…` : `你`,
          count: t.count(0),
          active: !!this.input?.aim,
        },
        {
          name: this.opponentName,
          sub: n?.acting
            ? `出手中`
            : n?.thinking
              ? `思考中…`
              : `AI · ${this.levelLabel}`,
          count: t.count(1),
          active: !!n?.acting,
        },
      ),
        this.stage === `playing`
          ? e.setClock(t.timeLeft, t.periodTime, { overtime: t.overtime })
          : this.stage === `countdown`
            ? e.setClock(t.matchTime, t.matchTime)
            : e.setClock(null));
      let r = this.input?.aim;
      e.setPower(r && r.mode === `pull` ? r.power : null);
    }
    onOver() {
      if (this.kind === `demo`) {
        this.start();
        return;
      }
      let { ui: e, sfx: t } = this.ctx,
        n = this.engine;
      (e.setClock(null), e.hint(null), e.setPower(null), e.resultNote(``));
      let r = n.winner === this.human,
        i = n.winner === -1,
        a = Nn[n.endReason] ?? [``, ``];
      r ? t.win() : t.lose();
      let o = n.shots[0],
        s = n.passes[0];
      e.showResult({
        outcome: i ? `draw` : r ? `win` : `lose`,
        title: i ? `平局` : r ? `胜利！` : `惜败`,
        subtitle: i ? Pn(n.overtime) : r ? a[0] : a[1],
        stats: [
          [Vn(n.time * 1e3), `用时`],
          [`${s}`, `送出冰球`],
          [o ? `${Math.min(100, Math.round((s / o) * 100))}%` : `—`, `命中率`],
          [String(this.streak.best), `最长连中`],
        ],
        status: `比分 ${this.wins[0]} : ${this.wins[1]}（${this.opponentName} · ${this.levelLabel}）`,
        buttons: [
          { label: `再来一局`, icon: `restart`, onClick: () => this.start() },
          {
            label: `返回主菜单`,
            kind: `ghost`,
            onClick: () => this.ctx.exit(),
          },
        ],
      });
    }
    onMenu() {
      this.kind === `local` &&
        this.stage !== `over` &&
        ((this.paused = !0),
        this.input?.cancel(),
        this.ctx.ui.showDialog(`暂停`, `对局已暂停，时间停止。`, [
          { label: `继续`, icon: `play`, onClick: () => this.resume() },
          {
            label: `重新开始`,
            kind: `wood`,
            icon: `restart`,
            onClick: () => this.start(),
          },
          {
            label: `返回主菜单`,
            kind: `ghost`,
            icon: `exit`,
            onClick: () => this.ctx.exit(),
          },
        ]));
    }
    resume() {
      ((this.paused = !1), this.ctx.ui.show(null));
    }
    grabbable(e) {
      return this.human !== null && this.engine.canGrab(this.human, e) === null;
    }
    dispose() {
      (this.ai.forEach((e) => e?.stop()),
        this.input?.dispose(),
        this.guide?.hide(),
        document.removeEventListener(`visibilitychange`, this.onVisibility),
        window.removeEventListener(`keydown`, this.onKey),
        this.ctx.scene.onPass && (this.ctx.scene.onPass = null),
        this.engine.world.free());
    }
    debug() {
      let e = this.engine,
        t = this.stage === `playing` && !this.paused;
      return {
        phase: this.stage,
        overtime: e.overtime,
        mySide: this.human,
        canAct:
          this.human !== null &&
          t &&
          e.holding(this.human) === null &&
          e.getPucks().some((e) => this.grabbable(e.id)),
        holding: this.human !== null && e.holding(this.human) !== null,
        winner: e.winner,
        reason: e.endReason,
        pucks: e.getPucks(),
        renderOk: Mn(e.getPucks()),
      };
    }
  };
function Gn() {
  return new URLSearchParams(location.search).get(`server`) || location.origin;
}
var Kn = null;
function qn() {
  if (Kn) return Kn;
  let e = null;
  try {
    e = localStorage.getItem(`sling.pid`);
  } catch {}
  if (!e || !/^[A-Za-z0-9_-]{16,64}$/.test(e)) {
    let t = new Uint8Array(16);
    (crypto.getRandomValues(t),
      (e = btoa(String.fromCharCode(...t))
        .replace(/\+/g, `-`)
        .replace(/\//g, `_`)
        .replace(/=+$/, ``)));
    try {
      localStorage.setItem(`sling.pid`, e);
    } catch {}
  }
  return ((Kn = e), e);
}
async function Jn(e, t = 50) {
  let n = new URL(`/api/leaderboard`, Gn());
  (n.searchParams.set(`period`, e),
    n.searchParams.set(`limit`, String(t)),
    n.searchParams.set(`pid`, qn()));
  let r = new AbortController(),
    i = window.setTimeout(() => r.abort(), 8e3);
  try {
    let e = await fetch(n, { signal: r.signal, cache: `no-store` });
    if (!e.ok) throw Error(`HTTP ${e.status}`);
    return await e.json();
  } finally {
    window.clearTimeout(i);
  }
}
var Yn = class {
    client = new t(Gn());
    enterQueue(e, t) {
      let n = null,
        r = !1,
        i = !1;
      return {
        room: new Promise((a, o) => {
          this.client
            .joinOrCreate(`queue`, { name: e, rank: 1e3, pid: qn() })
            .then((e) => {
              ((n = e),
                r
                  ? e.leave()
                  : (e.onMessage(`clients`, (e) => t?.(e)),
                    e.onMessage(`evt`, (t) => {
                      if (t.type !== `match_failed` || r || i) return;
                      i = !0;
                      e.leave();
                      o(Error(`匹配席位已过期，请重新匹配。`));
                    }),
                    e.onMessage(`seat`, async (t) => {
                      if (r || i) return;
                      e.send(`confirm`);
                      try {
                        let n = await this.client.consumeSeatReservation(t);
                        if (r || i) n.leave();
                        else ((i = !0), a(n));
                      } catch (t) {
                        if (!r && !i) ((i = !0), o(t));
                      } finally {
                        e.leave();
                      }
                    }),
                    e.onLeave((e) => {
                      !i &&
                        !r &&
                        e !== 1e3 &&
                        o(Error(`队列连接已断开 (${e})`));
                    })));
            })
            .catch(o);
        }),
        cancel: () => {
          ((r = !0), n && !i && n.leave());
        },
      };
    }
    createFriendRoom(e) {
      return this.client.create(`game`, { mode: `friend`, name: e, pid: qn() });
    }
    joinFriendRoom(e, t) {
      return this.client.joinById(e, { name: t, pid: qn() });
    }
  },
  Xn = 100,
  Zn = [`puck`, `wall`, `divider`, `band`, `launch`],
  Qn = 60,
  $n = `实时对战，随时出手！
按住自己半场的冰球 → 压上弹力带往后拉 → 松手发射
先清空自己半场的一方获胜`,
  er = (e, t, n) => {
    let r = t - e;
    for (; r > Math.PI;) r -= Math.PI * 2;
    for (; r < -Math.PI;) r += Math.PI * 2;
    return e + r * n;
  },
  tr = class {
    ctx;
    room;
    mode;
    kind = `online`;
    input;
    snaps = [];
    prediction = new LocalPrediction((pucks) => new xt(pucks), (drop, pucks) => {
      const bounds = Lt(drop.side);
      return Rt.prototype.freeSpot.call({ pucks }, drop.side,
        F(drop.x, bounds.minX, bounds.maxX), F(drop.y, bounds.minY, bounds.maxY), drop.puckId);
    });
    predictionClock = null;
    inputSeq = 0;
    offset = null;
    pending = [null, null];
    pendingGuide = [null, null];
    anchors = new Map();
    released = null;
    remote = null;
    fx = [];
    predictedFx = [];
    localFx = null;
    timeAnchor = { v: 0, at: 0 };
    phase = ``;
    overAt = 0;
    resultShown = !1;
    resultKey = ``;
    opponentLeft = !1;
    dropped = !1;
    leaving = !1;
    viewSideSet = !1;
    lastAimSend = 0;
    aimDirty = !1;
    render = [];
    noticeText = null;
    lastCountdown = -1;
    lastOne = [!1, !1];
    hinted = !1;
    guide;
    streak = new En();
    ping = null;
    pingTimer = 0;
    overtime = !1;
    renameSeq = 0;
    pendingRename = null;
    constructor(t, n, r) {
      ((this.ctx = t),
        (this.room = n),
        (this.mode = r),
        n.onStateChange((e) => this.onState(e)),
        n.onMessage(`shot`, (e) => this.onShot(e)),
        n.onMessage(`renamed`, (e) => {
          let t = this.pendingRename;
          t &&
            t.id === e.requestId &&
            (window.clearTimeout(t.timer),
            (this.pendingRename = null),
            e.name
              ? t.resolve(e.name)
              : t.reject(Error(e.error || `昵称暂时没能保存，请重试。`)));
        }),
        n.onMessage(`fx`, (e) => {
          if (this.prediction.enabled || this.dropped || this.st?.phase !== `playing`) return;
          let t = performance.now() + Xn;
          for (let n of e) this.fx.push({ at: t, f: n });
        }),
        n.onMessage(`score`, () => {}),
        n.onMessage(`evt`, (e) => this.onEvt(e)),
        n.onDrop(() => {
          ((this.dropped = !0), this.input.abort(), this.prediction.clear());
          this.fx.length = this.predictedFx.length = 0;
          this.localFx = null;
        }),
        n.onReconnect(() => {
          this.dropped = !1;
          this.snaps.length = 0;
          this.offset = null;
          this.predictionClock = null;
          this.prediction.clear();
          this.fx.length = this.predictedFx.length = 0;
          this.localFx = null;
        }),
        n.onLeave((n) => {
          this.leaving ||
            ((this.leaving = !0),
            this.input.abort(),
            t.ui.setHud(!1),
            t.ui.showDialog(
              `连接已断开`,
              n === e.FAILED_TO_RECONNECT
                ? `多次重连失败，已退出对局。`
                : `与服务器的连接已断开。`,
              [{ label: `返回主菜单`, onClick: () => t.exit() }],
            ));
        }));
      let { scene: i, sfx: a, ui: o } = t;
      ((this.input = new _n({
        scene: i,
        canvas: t.canvas,
        side: () => this.mySide ?? 0,
        enabled: () => this.canPlay(),
        pucks: () => this.prediction.enabled && this.render.length ? this.render : this.latestPucks(),
        canSelect: (e) => this.denyReason(e),
        onSelect: (e) => {
          const seq = ++this.inputSeq;
          e.seq = seq;
          this.prediction.hold(e.puckId, this.mySide, seq);
          (this.room.send(`grab`, { puckId: e.puckId, seq }),
            a.select(),
            a.buzz(8),
            this.sendAim(e, !0));
        },
        onChange: () => (this.aimDirty = !0),
        onShoot: (e, t) => {
          const seq = ++this.inputSeq;
          const predicted = this.prediction.shoot({ ...e, side: this.mySide, seq },
            this.predictionTime());
          if (predicted) a.launch(t.power, zn(i, e.px, e.py));
          (this.room.send(`shoot`, { ...e, seq }),
            (this.released = { aim: { ...t }, seq, at: performance.now() }),
            a.buzz(12 + Math.round(t.power * 16)),
            this.guide.finish(),
            this.hinted || ((this.hinted = !0), o.hint(null)));
        },
        onDrop: (e) => {
          const seq = ++this.inputSeq;
          if (this.input.dropping) this.input.dropping.seq = seq;
          this.prediction.releaseHold({ puckId: e.puckId, side: this.mySide,
            x: e.x, y: e.y, seq }, this.predictionTime());
          (this.room.send(`drop`, { x: e.x, y: e.y, seq }), a.putBack());
        },
        onDenied: (e, t) => {
          (i.shake(e.id), a.deny(), a.buzz([10, 40, 10]));
          let n = Hn[t];
          n && o.toast(n);
        },
        onStretch: (e) => a.stretch(e),
      })),
        (this.guide = new Tn(i, o, t.canvas)),
        (i.onPass = (e, t, n) => this.onPass(e, n)));
      let s = () => {
        if (!this.leaving)
          try {
            this.room.ping((e) => (this.ping = e));
          } catch {}
      };
      (s(),
        (this.pingTimer = window.setInterval(s, 2e3)),
        o.setHud(!1),
        o.showWaiting({
          title: `正在进入房间…`,
          buttons: [{ label: `取消`, kind: `ghost`, onClick: () => t.exit() }],
        }),
        typeof n.state?.serverTime == `number` && this.onState(n.state));
    }
    predictionTime(now = performance.now()) {
      // 跟随已完成的物理时间，服务器丢弃积压后也不会永久顶满外推上限。
      const clock = this.predictionClock;
      return clock ? clock.time + Math.max(0, now - clock.at) +
        Math.min(250, Math.max(0, this.ping ?? 0)) : now + (this.offset ?? 0);
    }
    get st() {
      return this.room.state;
    }
    get me() {
      return this.st?.players?.get(this.room.sessionId);
    }
    get opp() {
      let e;
      return (
        this.st?.players?.forEach((t, n) => {
          n !== this.room.sessionId && (e = t);
        }),
        e
      );
    }
    get mySide() {
      let e = this.me;
      return e ? e.side : null;
    }
    latestPucks() {
      return this.snaps.length
        ? this.snaps[this.snaps.length - 1].pucks
        : this.render;
    }
    canPlay() {
      let e = this.st;
      return (
        !!e &&
        e.phase === `playing` &&
        !this.dropped &&
        !this.leaving &&
        this.ctx.ui.screen === null
      );
    }
    speedOf(e) {
      const puck = this.latestPucks().find((p) => p.id === e);
      if (Number.isFinite(puck?.vx) && Number.isFinite(puck?.vy)) return Math.hypot(puck.vx, puck.vy);
      let t = this.snaps;
      if (t.length < 2) return 0;
      let n = t[t.length - 2],
        r = t[t.length - 1],
        i = n.pucks.find((t) => t.id === e),
        a = r.pucks.find((t) => t.id === e);
      return !i || !a || r.t <= n.t
        ? 0
        : Math.hypot(a.x - i.x, a.y - i.y) / ((r.t - n.t) / 1e3);
    }
    denyReason(e) {
      let t = this.mySide;
      return t === null || !this.canPlay()
        ? `not_playing`
        : e.held !== void 0 ||
            e.id === this.released?.aim.puckId ||
            e.id === this.pending[t]?.puckId
          ? `held`
          : N(e.y) === t
            ? this.speedOf(e.id) > 5
              ? `moving`
              : null
            : `not_your_half`;
    }
    setLocalFx(enabled) {
      if (this.localFx === enabled) return;
      this.fx.length = this.predictedFx.length = 0;
      this.localFx = enabled;
      this.room.send(`local_fx`, enabled);
    }
    onState(e) {
      let t = performance.now(),
        serverTime = e?.serverTime,
        n = serverTime - (Number.isFinite(e?.physicsDelay) ? e.physicsDelay : 0);
      if (!Number.isFinite(serverTime) || !Number.isFinite(n)) {
        this.prediction.clear();
        this.setLocalFx(false);
        return;
      }
      let r = [],
        i = !0;
      if (
        (e.pucks?.forEach((e) => {
          ((Number.isFinite(e.x) && Number.isFinite(e.y)) || (i = !1),
            r.push({
              id: e.id,
              x: e.x,
              y: e.y,
              a: Number.isFinite(e.a) ? e.a : 0,
              color: e.c,
              vx: e.vx, vy: e.vy, av: e.av,
              launchStep: e.launchStep, launchCx: e.launchCx,
              launchPx: e.launchPx, launchPy: e.launchPy, launchSide: e.launchSide,
              held: e.held === 0 || e.held === 1 ? e.held : void 0,
            }));
        }),
        !i || r.length === 0)
      ) {
        this.prediction.clear();
        this.setLocalFx(false);
        return;
      }
      let a = serverTime - t,
        o = this.offset;
      this.offset =
        o === null || !Number.isFinite(o) || a > o ? a : o + (a - o) * 0.02;
      let s = this.snaps[this.snaps.length - 1];
      (s && s.t === n
        ? (s.pucks = r)
        : !s || n > s.t
          ? this.snaps.push({ t: n, pucks: r })
          : (this.snaps = [{ t: n, pucks: r }]),
        this.snaps.length > 120 &&
          this.snaps.splice(0, this.snaps.length - 120));
      const me = e.players?.get(this.room.sessionId), shots = [];
      e.players?.forEach((player) => { shots[player.side] = player.shots; });
      this.inputSeq = Math.max(this.inputSeq, me?.inputSeq || 0);
      this.prediction.receive(r, n, e.phase, { inputSeq: me?.inputSeq, shots });
      this.predictionClock = { time: n, at: t };
      this.setLocalFx(this.prediction.enabled);
      let c = e.timeLeft / 10;
      c !== this.timeAnchor.v && (this.timeAnchor = { v: c, at: t });
    }
    onShot(e) {
      if (this.prediction.enabled) {
        const local = e.side === this.mySide;
        const matchesRelease = this.released?.aim.puckId === e.puckId &&
          (e.seq === undefined || this.released.seq === e.seq);
        const alreadyPlayed = local && matchesRelease;
        this.prediction.shoot(e, e.t, true);
        if (!alreadyPlayed) this.ctx.sfx.launch(e.power, zn(this.ctx.scene, e.px, e.py));
        if (local) {
          if (matchesRelease) this.released = null;
          this.streak.shot(e.puckId, performance.now() / 1e3);
        } else this.remote = null;
        return;
      }
      ((this.pending[e.side] = e),
        e.side === this.mySide &&
          this.streak.shot(e.puckId, performance.now() / 1e3));
      let t = rt(e.side, e.cx, e.px, e.py),
        n = t.speed || 1;
      ((this.pendingGuide[e.side] = {
        x: t.x,
        y: t.y,
        dx: t.vx / n,
        dy: t.vy / n,
      }),
        this.anchors.set(e.puckId, { t: e.t, x: e.px, y: e.py }),
        e.side === this.mySide
          ? this.released?.aim.puckId === e.puckId && (this.released = null)
          : (this.remote = null));
    }
    onEvt(e) {
      let { ui: t, sfx: n, scene: r } = this.ctx;
      switch (e.type) {
        case `reject`:
          if ([`shoot`, `grab`, `drop`].includes(e.action)) this.prediction.reject(e.seq);
          if (e.action === `drop` && (e.seq === undefined || this.input.dropping?.seq === e.seq)) this.input.dropping = null;
          if (e.action === `grab` && (e.seq === undefined || this.input.aim?.seq === e.seq)) {
            let i = this.input.aim?.puckId;
            (this.input.abort(),
              i !== void 0 && r.shake(i),
              n.deny(),
              t.toast(Hn[e.reason ?? ``] ?? `没拿到这枚球`));
          } else
            e.action === `shoot` && (e.seq === undefined || this.released?.seq === e.seq) &&
              ((this.released = null),
              t.toast(
                e.reason === `cooldown`
                  ? `出手太快了`
                  : `这一击无效，请重新瞄准`,
              ));
          break;
        case `opponent_left`:
          ((this.opponentLeft = !0),
            this.phase !== `over` && t.toast(`对手已离开`),
            (this.resultKey = ``));
          break;
        case `match_failed`:
          (t.toast(`对手未能进入对局，重新匹配…`), this.ctx.requeue());
      }
    }
    sendAim(e, t = !1) {
      let n = performance.now();
      (!t && n - this.lastAimSend < Qn) ||
        ((this.lastAimSend = n),
        (this.aimDirty = !1),
        this.room.send(`aim`, {
          pull: e.mode === `pull`,
          x: e.x,
          y: e.y,
          cx: e.cx,
        }));
    }
    onPass(e, t) {
      let n = this.mySide;
      if (n === null || this.st?.phase !== `playing`) return;
      if ((this.ctx.sfx.pass(e === n, 0), e === n)) {
        let e = this.streak.pass(t, performance.now() / 1e3);
        e >= 2 && (this.ctx.ui.streak(e), this.ctx.sfx.combo(e));
      }
      let r = P(this.render, n),
        i = P(this.render, j(n));
      (r === 1 && !this.lastOne[0]
        ? this.ctx.ui.flash(`最后一枚！`, `info`)
        : i === 1 &&
          !this.lastOne[1] &&
          this.ctx.ui.flash(`对手只剩最后一枚！`, `warn`),
        (this.lastOne = [r === 1, i === 1]));
    }
    sample(e) {
      let t = this.snaps;
      if (!t.length) return this.render;
      if (this.anchors.size) {
        let n = 0;
        for (; n < t.length - 1 && t[n + 1].t <= e;) n++;
        for (let [e, r] of this.anchors)
          t[n].t >= r.t && this.anchors.delete(e);
      }
      let n = t[0],
        r = t[t.length - 1];
      if (e <= n.t) r = n;
      else if (e >= r.t) n = r;
      else
        for (let i = t.length - 2; i >= 0; i--)
          if (t[i].t <= e) {
            ((n = t[i]), (r = t[i + 1]));
            break;
          }
      let i = r.t > n.t ? (e - n.t) / (r.t - n.t) : 0,
        a = [];
      for (let t = 0; t < n.pucks.length; t++) {
        let o = n.pucks[t],
          s = r.pucks[t] ?? o,
          c = o.x + (s.x - o.x) * i,
          l = o.y + (s.y - o.y) * i,
          u = er(o.a, s.a, i),
          d = this.anchors.get(o.id);
        if (d && n.t < d.t && e >= d.t) {
          if (r.t >= d.t && r !== n) {
            let t = r.t > d.t ? (e - d.t) / (r.t - d.t) : 1;
            ((c = d.x + (s.x - d.x) * t),
              (l = d.y + (s.y - d.y) * t),
              (u = s.a));
          } else ((c = d.x), (l = d.y));
        }
        a.push({
          id: o.id,
          x: c,
          y: l,
          a: u,
          color: o.color,
          held: (i < 0.5 ? o : s).held,
        });
      }
      for (; t.length > 2 && t[1].t < e - 500;) t.shift();
      return a;
    }
    update(e) {
      let t = performance.now(),
        n = this.st;
      if (
        !n ||
        typeof n.phase != `string` ||
        this.offset === null ||
        this.leaving
      )
        return { pucks: this.render };
      this.handlePhase(n, t);
      this.predictedFx.length = 0;
      let r = this.prediction.enabled ? this.predictionTime(t) : t + this.offset - Xn,
        i = this.prediction.sample(r, this.predictedFx) ?? this.sample(r);
      for (const impact of this.predictedFx) Bn(this.ctx, impact);
      this.render = i;
      for (let e of [0, 1]) {
        let t = this.pending[e];
        t &&
          r >= t.t &&
          (this.ctx.sfx.launch(t.power, zn(this.ctx.scene, t.px, t.py)),
          (this.pending[e] = null),
          (this.pendingGuide[e] = null));
      }
      for (; this.fx.length && this.fx[0].at <= t;) {
        let { f: e } = this.fx.shift(),
          t = Zn[e[0]];
        t &&
          t !== `launch` &&
          Bn(this.ctx, {
            k: t,
            x: e[1],
            y: e[2],
            v: e[3],
            s: e[4] === 0 || e[4] === 1 ? e[4] : void 0,
          });
      }
      (this.released && t - this.released.at > 3e3 && (this.released = null),
        this.updateRemote(e, n, i),
        this.input.update(e),
        this.streak.update(t / 1e3),
        this.guide.update(
          e,
          this.canPlay() && !this.input.aim && !this.released,
          this.mySide ?? 0,
          i,
          (e) => this.denyReason(e) === null,
        ),
        this.aimDirty && this.input.aim && this.sendAim(this.input.aim),
        !this.canPlay() && this.input.aim && this.input.abort(),
        this.updateHud(n, t, i));
      let a = this.mySide ?? 0,
        o = j(a),
        s = (e) => {
          let t = this.pending[e];
          if (!t) return null;
          let n = this.pendingGuide[e];
          return {
            held: { id: t.puckId, x: t.px, y: t.py, lift: 0 },
            pressing: [{ side: e, id: t.puckId }],
            aim: n
              ? {
                  cx: n.x,
                  cy: n.y,
                  dirX: n.dx,
                  dirY: n.dy,
                  power: t.power,
                  mine: e === a,
                }
              : null,
          };
        },
        c = s(a) ?? (this.released && !this.prediction.enabled ? gn(this.released.aim, !0) : null),
        l = s(o) ?? (this.remote ? gn(this.remote, !1) : null),
        u = Ln(Rn([c, this.input.view(), l]), this.overtime),
        d = null;
      return (
        this.canPlay() &&
          !this.input.aim &&
          (d = new Set(
            i.filter((e) => this.denyReason(e) === null).map((e) => e.id),
          )),
        { pucks: i, ...u, highlight: d, selected: this.input.selectedId }
      );
    }
    updateRemote(e, t, n) {
      let r = this.mySide;
      if (r === null) return;
      let i = j(r),
        a = t.aims?.[i];
      if (!a || !a.active || this.pending[i] ||
          this.prediction.commands.has(a.puckId) || t.phase !== `playing`) {
        this.remote = null;
        return;
      }
      let o = this.remote;
      if (!o || o.puckId !== a.puckId) {
        let e = n.find((e) => e.id === a.puckId);
        o = this.remote = mn(i, a.puckId, e?.x ?? a.x, e?.y ?? a.y);
      }
      let s = Math.min(1, e * 14);
      if (((o.x += (a.x - o.x) * s), (o.y += (a.y - o.y) * s), a.pull)) {
        ((o.mode = `pull`), (o.cx = a.cx));
        let e = ct(i, o.cx, o.x, o.y, []);
        ((o.power = e.engaged ? e.power : 0),
          (o.dirX = e.dirX),
          (o.dirY = e.dirY),
          (o.exitX = e.exitX),
          (o.exitY = e.exitY));
      } else ((o.mode = `hold`), (o.power = 0));
      o.lift += ((o.mode === `hold` ? pn : 0) - o.lift) * Math.min(1, e * 10);
    }
    handlePhase(e, t) {
      let { ui: n, scene: r, sfx: i } = this.ctx,
        a = e.phase,
        o = this.mySide,
        s = !!e.overtime;
      if (
        (s !== this.overtime &&
          ((this.overtime = s),
          s &&
            a === `playing` &&
            In(this.ctx, Math.round((e.otTime || 600) / 10))),
        o !== null &&
          !this.viewSideSet &&
          ((this.viewSideSet = !0), r.setViewSide(o, !0)),
        a !== this.phase)
      ) {
        let s = this.phase;
        this.fx.length = this.predictedFx.length = 0;
        if (((this.phase = a), a === `waiting`)) {
          if ((n.setHud(!1), this.mode === `friend`)) {
            let e = new URL(location.href);
            e.search = ``;
            let t = new URLSearchParams(location.search).get(`server`);
            (t && e.searchParams.set(`server`, t),
              e.searchParams.set(`room`, this.room.roomId),
              n.showInvite(this.room.roomId, e.toString(), () =>
                this.ctx.exit(),
              ));
          } else
            n.showWaiting({
              title: `正在等待对手进入…`,
              buttons: [
                {
                  label: `取消`,
                  kind: `ghost`,
                  onClick: () => this.ctx.exit(),
                },
              ],
            });
          this.opponentLeft = !1;
        } else
          a === `starting`
            ? ((this.resultShown = !1),
              (this.opponentLeft = !1),
              (this.lastCountdown = -1),
              (this.lastOne = [!1, !1]),
              (this.released = null),
              (this.pending = [null, null]),
              this.anchors.clear(),
              this.streak.reset(),
              r.resetEffects(),
              n.setHud(!0),
              n.resetCounts(),
              n.setClock(e.matchTime / 10, e.matchTime / 10))
            : a === `playing`
              ? (n.show(null),
                n.setHud(!0),
                s === `starting` &&
                  (n.flash(`开始！`, `go`), i.go(), this.hinted || n.hint($n)))
              : a === `over` &&
                ((this.overAt = t),
                this.input.abort(),
                (this.released = null),
                n.resultNote(``),
                s === `playing` && Fn(this.ctx, o, e.winner, e.reason));
      }
      if (a === `starting`) {
        let t = (this.me?.wins ?? 0) + (this.opp?.wins ?? 0);
        (n.showVersus(
          this.me?.name ?? `我`,
          this.opp?.name ?? `对手`,
          e.countdown,
          t > 0 ? `再来一局` : this.mode === `friend` ? `好友对战` : `匹配成功`,
        ),
          e.countdown !== this.lastCountdown &&
            ((this.lastCountdown = e.countdown),
            e.countdown > 0 && i.countdown()));
      }
      (a === `playing` && n.screen === `versus` && n.show(null),
        a === `over` &&
          (!this.resultShown &&
            t - this.overAt > 1e3 &&
            ((this.resultShown = !0),
            (this.resultKey = ``),
            e.winner === o ? i.win() : i.lose(),
            this.mode === `match` && this.showRank()),
          this.resultShown && this.refreshResult(e)));
    }
    refreshResult(e) {
      let { ui: t } = this.ctx,
        n = this.me,
        r = this.opp,
        i = this.mySide,
        a = !r || this.opponentLeft,
        o = a
          ? `对手已离开房间`
          : n?.rematch && !r.rematch
            ? `已发送“再来一局”，等待对手确认…`
            : r.rematch && !n?.rematch
              ? `对手想再来一局！`
              : ``,
        s = `${a}|${o}|${n?.wins}|${r?.wins}`;
      if (s === this.resultKey) return;
      let c = this.resultKey === ``;
      this.resultKey = s;
      let l = e.winner === i,
        u = e.winner === -1,
        d = Nn[e.reason] ?? [``, ``],
        f = a
          ? this.mode === `match`
            ? [
                {
                  label: `重新匹配`,
                  icon: `globe`,
                  onClick: () => this.ctx.requeue(),
                },
                {
                  label: `返回主菜单`,
                  kind: `ghost`,
                  onClick: () => this.ctx.exit(),
                },
              ]
            : [
                {
                  label: `等待好友再来一局`,
                  icon: `link`,
                  onClick: () => this.room.send(`rematch`),
                },
                {
                  label: `返回主菜单`,
                  kind: `ghost`,
                  onClick: () => this.ctx.exit(),
                },
              ]
          : [
              {
                label: n?.rematch ? `等待对手确认…` : `再来一局`,
                icon: `restart`,
                disabled: !!n?.rematch,
                onClick: () => this.room.send(`rematch`),
              },
              {
                label: `返回主菜单`,
                kind: `ghost`,
                onClick: () => this.ctx.exit(),
              },
            ];
      if (c || t.screen !== `result`) {
        let i = n?.shots ?? 0,
          a = n?.passes ?? 0;
        t.showResult({
          outcome: u ? `draw` : l ? `win` : `lose`,
          title: u ? `平局` : l ? `胜利！` : `惜败`,
          subtitle: u ? Pn(!!e.overtime) : l ? d[0] : d[1],
          stats: [
            [`${n?.wins ?? 0} : ${r?.wins ?? 0}`, `比分`],
            [
              Vn(
                (e.overtime
                  ? e.matchTime + e.otTime - e.timeLeft
                  : e.matchTime - e.timeLeft) * 100,
              ),
              `用时`,
            ],
            [
              i ? `${Math.min(100, Math.round((a / i) * 100))}%` : `—`,
              `命中率`,
            ],
            [String(this.streak.best), `最长连中`],
          ],
          status: o,
          buttons: f,
          onRename: (e) => this.rename(e),
        });
      } else t.updateResult(o, f);
    }
    rename(e) {
      return this.leaving || this.dropped || this.st?.phase !== `over`
        ? Promise.reject(Error(`连接或对局状态已变化，请返回主菜单修改昵称。`))
        : this.pendingRename
          ? Promise.reject(Error(`正在保存，请稍候。`))
          : new Promise((t, n) => {
              let r = ++this.renameSeq,
                i = window.setTimeout(() => {
                  ((this.pendingRename = null),
                    n(Error(`暂时没收到确认，请检查连接后重试。`)));
                }, 8e3);
              ((this.pendingRename = {
                id: r,
                resolve: t,
                reject: n,
                timer: i,
              }),
                this.room.send(`rename`, { requestId: r, name: e }));
            });
    }
    showRank() {
      Jn(`all`, 0).then(
        (e) => {
          if (this.leaving || this.st?.phase !== `over` || !e.me) return;
          let t = e.me;
          this.ctx.ui.resultNote(
            t.rank === null
              ? `匹配战绩 ${t.games} 局，还没有胜场`
              : `排行榜第 <b>${t.rank}</b> 名 · 累计 ${t.wins} 胜 · 胜率 ${Math.round(t.rate * 100)}%`,
          );
        },
        () => {},
      );
    }
    updateHud(e, t, n) {
      let { ui: r } = this.ctx,
        i = e.phase;
      if (i !== `playing` && i !== `starting` && i !== `over`) return;
      let a = this.mySide ?? 0,
        o = this.me,
        s = this.opp,
        c = !!this.remote;
      r.setPlayers(
        {
          name: o?.name ?? `我`,
          sub: this.input.aim ? `瞄准中…` : `你`,
          count: P(n, a),
          active: !!this.input.aim,
        },
        {
          name: s?.name ?? `对手`,
          sub: s
            ? s.connected
              ? c
                ? `瞄准中…`
                : `在线`
              : `断线 ${s.reconnectLeft}s`
            : `已离开`,
          count: P(n, j(a)),
          active: c,
          offline: !s || !s.connected,
        },
      );
      let l = (o?.wins ?? 0) + (s?.wins ?? 0);
      if (
        (r.setScore(l > 0 ? `${o?.wins ?? 0}:${s?.wins ?? 0}` : null),
        i === `playing`)
      ) {
        let n = Math.max(0, this.timeAnchor.v - (t - this.timeAnchor.at) / 1e3);
        r.setClock(n, (e.overtime ? e.otTime : e.matchTime) / 10, {
          overtime: !!e.overtime,
        });
      } else i === `over` && r.setClock(null);
      let u = this.input.aim;
      (r.setPower(u && u.mode === `pull` ? u.power : null),
        r.setPing(this.ping));
      let d = null;
      (this.dropped
        ? (d = `网络不稳定，正在重连…`)
        : s &&
          !s.connected &&
          i !== `over` &&
          (d = `对手连接中断，等待重连（${s.reconnectLeft}s）`),
        d !== this.noticeText && ((this.noticeText = d), r.notice(d)));
    }
    onMenu() {
      let e = this.st?.phase;
      e === `playing` || e === `starting`
        ? (this.input.cancel(),
          this.ctx.ui.showDialog(`离开对局？`, `对局进行中离开将直接判负。`, [
            {
              label: `继续对局`,
              icon: `play`,
              onClick: () => this.ctx.ui.show(null),
            },
            {
              label: `认输离开`,
              kind: `ghost`,
              icon: `exit`,
              onClick: () => this.ctx.exit(),
            },
          ]))
        : this.ctx.exit();
    }
    grabbable(e) {
      let t = this.latestPucks().find((t) => t.id === e);
      return !!t && !this.input.aim && this.denyReason(t) === null;
    }
    dispose() {
      ((this.pendingRename &&=
        (window.clearTimeout(this.pendingRename.timer),
        this.pendingRename.reject(Error(`已离开对局，请在主菜单修改昵称。`)),
        null)),
        (this.leaving = !0),
        window.clearInterval(this.pingTimer),
        this.prediction.clear(),
        (this.fx.length = this.predictedFx.length = 0),
        this.guide.hide(),
        this.input.dispose(),
        this.ctx.ui.notice(null),
        this.ctx.scene.onPass && (this.ctx.scene.onPass = null),
        this.room.leave().catch(() => {}));
    }
    netDebug() {
      let e = this.snaps;
      return {
        offset: this.offset,
        snaps: e.length,
        prediction: this.prediction.enabled,
        physicsSteps: this.prediction.steps,
        predictionAge: this.prediction.snapshot ? Math.max(0, performance.now() + this.offset - this.prediction.snapshot.time) : null,
        firstT: e[0]?.t,
        lastT: e[e.length - 1]?.t,
        rt: this.offset === null ? null : this.prediction.enabled ? this.predictionTime() : performance.now() + this.offset - Xn,
        render0: this.render[0] ?? null,
      };
    }
    debug() {
      let e = this.st,
        t = this.mySide,
        n =
          !!this.input.aim ||
          !!this.released ||
          (t !== null && !!this.pending[t]);
      return {
        phase: e?.phase ?? ``,
        overtime: this.overtime,
        mySide: t,
        canAct:
          this.canPlay() &&
          !n &&
          this.latestPucks().some((e) => this.denyReason(e) === null),
        holding: n,
        winner: e?.winner ?? -1,
        reason: e?.reason ?? ``,
        pucks: this.latestPucks(),
        renderOk: Mn(this.render),
      };
    }
  },
  W = (e, t = `0 0 24 24`) =>
    `<svg viewBox="${t}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`,
  G = {
    menu: W(`<path d="M4 7h16M4 12h16M4 17h16"/>`),
    soundOn: W(
      `<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>`,
    ),
    soundOff: W(
      `<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="m22 9-6 6M16 9l6 6"/>`,
    ),
    back: W(`<path d="M15 18 9 12l6-6"/>`),
    chev: W(`<path d="m9 18 6-6-6-6"/>`),
    robot: W(
      `<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M8.5 13.5h.01M15.5 13.5h.01M9 17h6"/>`,
    ),
    globe: W(
      `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>`,
    ),
    friends: W(
      `<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2a4.6 4.6 0 0 1 5 4.8"/>`,
    ),
    copy: W(
      `<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>`,
    ),
    share: W(
      `<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>`,
    ),
    help: W(
      `<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5M12 17h.01"/>`,
    ),
    trophy: W(
      `<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M16 6h3a3 3 0 0 1-3 4M8 6H5a3 3 0 0 0 3 4"/><path d="M12 13v4M8 21h8M9 17h6"/>`,
    ),
    sad: W(
      `<circle cx="12" cy="12" r="9"/><path d="M8.5 16a4 4 0 0 1 7 0M9 10h.01M15 10h.01"/>`,
    ),
    handshake: W(
      `<path d="m11 17 2 2a1.4 1.4 0 0 0 2-2"/><path d="m14 14 2.5 2.5a1.4 1.4 0 0 0 2-2l-3.9-3.9a2.8 2.8 0 0 0-4 0l-.9.9a1.4 1.4 0 1 1-2-2l2.8-2.8a5 5 0 0 1 5.3-1.1l.5.2a2 2 0 0 0 1.4 0L21 5"/><path d="m3 5 1.6 1.6a2 2 0 0 0 1.4.6h.9M3 13l6 6a1.4 1.4 0 0 0 2-2"/>`,
    ),
    play: W(`<path d="M7 4.5v15l12-7.5z"/>`),
    restart: W(`<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>`),
    exit: W(
      `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>`,
    ),
    link: W(
      `<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>`,
    ),
    wifi: W(
      `<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0"/><path d="M12 19.5h.01"/>`,
    ),
    clock: W(`<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>`),
    gear: W(
      `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>`,
    ),
    podium: W(
      `<path d="M9 21V9h6v12M3 21v-7h6M15 21v-5h6v5M2 21h20"/><path d="m12 2 1.1 2.2 2.4.4-1.8 1.7.4 2.4-2.1-1.1-2.1 1.1.4-2.4-1.8-1.7 2.4-.4z"/>`,
    ),
  },
  nr = `
<svg viewBox="0 0 80 80" aria-hidden="true">
  <defs>
    <linearGradient id="lg-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1d8a8"/><stop offset="1" stop-color="#d3a86d"/></linearGradient>
    <linearGradient id="lg-k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c49866"/><stop offset="1" stop-color="#a97d4e"/></linearGradient>
  </defs>
  <rect x="10" y="4" width="60" height="72" rx="9" fill="url(#lg-w)"/>
  <rect x="16" y="10" width="48" height="60" rx="3" fill="url(#lg-k)"/>
  <rect x="16" y="38" width="20" height="4" fill="url(#lg-w)"/><rect x="44" y="38" width="20" height="4" fill="url(#lg-w)"/>
  <path d="M16 18.5h48M16 61.5h48" stroke="#2a211b" stroke-width="1.6"/>
  <circle cx="40" cy="24" r="5.2" fill="#f4e1bb" stroke="#b08655" stroke-width="1"/>
  <circle cx="29" cy="53" r="5.2" fill="#221d19"/>
  <circle cx="48" cy="56" r="5.2" fill="#f4e1bb" stroke="#b08655" stroke-width="1"/>
  <path d="M40 46.5v-5" stroke="#d84a34" stroke-width="2" stroke-linecap="round"/>
  <path d="m37.6 44 2.4-3 2.4 3" fill="none" stroke="#d84a34" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
  rr = [
    { id: `easy`, name: `简单`, desc: `出手慢、瞄得松，适合熟悉操作`, dots: 1 },
    {
      id: `normal`,
      name: `普通`,
      desc: `会算弹道，节奏适中，偶尔失手`,
      dots: 2,
    },
    { id: `hard`, name: `困难`, desc: `出手快、算得准，很少失误`, dots: 3 },
  ];
function K(e) {
  return e.replace(
    /[&<>"']/g,
    (e) =>
      ({ "&": `&amp;`, "<": `&lt;`, ">": `&gt;`, '"': `&quot;`, "'": `&#39;` })[
        e
      ],
  );
}
function q(e) {
  return Array.from(
    e
      .replace(
        /[\u0000-\u001f\u007f<>\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g,
        ``,
      )
      .trim(),
  )
    .slice(0, 20)
    .join(``)
    .trim();
}
function J(e, t) {
  let n = e.querySelector(t);
  if (!n) throw Error(`UI 元素缺失: ` + t);
  return n;
}
var ir = class {
    root;
    sfx;
    h;
    screens = new Map();
    current = null;
    level = `normal`;
    toastTimer = 0;
    hudEl;
    turnEl;
    powerEl;
    noticeEl;
    hintEl;
    toastEl;
    chipMe;
    chipOpp;
    scoreEl;
    bigEl;
    guideEl;
    guidePath;
    pingEl;
    streakEl;
    streakTimer = 0;
    lastPing = -2;
    bigTimer = 0;
    lastPower = -1;
    lastClockSec = -1;
    lastCounts = [-1, -1];
    waitTimer = 0;
    boardPeriod = `all`;
    boardSeq = 0;
    resultNoteText = ``;
    nameInviteSeen = !1;
    constructor(e, t, n) {
      ((this.root = e),
        (this.sfx = t),
        (this.h = n),
        (this.level = localStorage.getItem(`sling.level`) || `normal`),
        (e.innerHTML = this.template()));
      for (let t of e.querySelectorAll(`.screen`))
        this.screens.set(t.dataset.screen, t);
      (this.bindMenu(), this.bindHud());
    }
    get name() {
      return q(J(this.root, `#nick`).value) || this.defaultName();
    }
    defaultName() {
      let e = localStorage.getItem(`sling.defaultName`);
      return (
        e ||
          ((e = `玩家` + Math.floor(1e3 + Math.random() * 9e3)),
          localStorage.setItem(`sling.defaultName`, e)),
        e
      );
    }
    template() {
      let e = rr
        .map(
          (e) => `<button class="level" data-level="${e.id}">
        <span class="dots">${[1, 2, 3].map((t) => `<i class="${t <= e.dots ? `on` : ``}"></i>`).join(``)}</span>
        <span><div class="t">${e.name}</div><div class="d">${e.desc}</div></span>
        <span class="check"></span>
      </button>`,
        )
        .join(``);
      return `
    ${islandMenu(G)}

    <section class="screen" data-screen="ai">
      <div class="panel">
        <button class="icon-btn back" data-act="back" aria-label="返回" style="background:rgba(0,0,0,.06);color:var(--ink)">${G.back}</button>
        <h2 style="text-align:center">人机对战</h2>
        <p class="sub" style="text-align:center">先选一个适合你的节奏。随时出手，先清空自己的半场就获胜。</p>
        <div class="levels">${e}</div>
        <div class="stack" style="margin-top:18px"><button class="btn btn-primary" data-act="start-ai">${G.play}开始对战</button></div>
      </div>
    </section>

    <section class="screen" data-screen="friend">
      <div class="panel">
        <button class="icon-btn back" data-act="back" aria-label="返回" style="background:rgba(0,0,0,.06);color:var(--ink)">${G.back}</button>
        <h2 style="text-align:center">好友对战</h2>
        <p class="sub" style="text-align:center">创建房间后把邀请链接发给好友，对方打开即可加入</p>
        <div class="stack">
          <button class="btn btn-primary" data-act="create-room">${G.link}创建房间</button>
          <div class="field"><label for="room-code">房间号</label><input id="room-code" maxlength="32" autocomplete="off" spellcheck="false" placeholder="输入好友的房间号"></div>
          <button class="btn btn-wood" data-act="join-room">加入房间</button>
        </div>
      </div>
    </section>

    <section class="screen" data-screen="wait">
      <div class="panel"><div class="wait"></div></div>
    </section>

    <section class="screen" data-screen="versus">
      <div class="panel"><div class="versus"></div></div>
    </section>

    <section class="screen" data-screen="result">
      <div class="panel result"></div>
    </section>

    <section class="screen" data-screen="dialog">
      <div class="panel" style="text-align:center"></div>
    </section>

    <section class="screen" data-screen="help">
      <div class="panel">
        <button class="icon-btn back" data-act="back" aria-label="返回" style="background:rgba(0,0,0,.06);color:var(--ink)">${G.back}</button>
        <h2 style="text-align:center;margin-bottom:14px">玩法说明</h2>
        <ul class="rules">
          <li><i>1</i><span>棋盘中间的隔板上有一个略宽于冰球的小洞，两端各有一条弹力带。开局每边 5 枚冰球。</span></li>
          <li><i>2</i><span><b>实时对战，不分回合</b>：双方随时出手，比谁又快又准。<b>颜色不代表归属</b>，落在你半场的冰球都由你操作。</span></li>
          <li><i>3</i><span>按住自己半场里停下（或慢慢滑动）的冰球，拖向弹力带，压上带子后往后拉，松手发射。一次只能拿一枚。</span></li>
          <li><i>4</i><span>像弹弓一样：正后方拉直射，往右后方拉就往左前方斜射。手指往侧面挪一点，方向就跟着变一点；冰球拉满后手指还能继续往后拉，拉得越远，方向调得越细。拉伸距离决定力度。</span></li>
          <li><i>5</i><span><b>先把自己半场清空的一方获胜</b>；常规时间 3 分钟，时间到时半场剩余较少的一方获胜。剩余相同进入 60 秒<b>加时赛</b>：先领先的一方获胜（默认关闭辅助线，可在设置中调整）。</span></li>
          <li><i>6</i><span>电脑上按 Esc 或右键可以取消当前瞄准；人机对战中按 Esc 暂停。</span></li>
        </ul>
        <div class="stack" style="margin-top:18px"><button class="btn btn-wood" data-act="back">知道了</button></div>
      </div>
    </section>

    <section class="screen" data-screen="settings">
      <div class="panel">
        <button class="icon-btn back" data-act="back" aria-label="返回" style="background:rgba(0,0,0,.06);color:var(--ink)">${G.back}</button>
        <h2 style="text-align:center">小岛设置</h2>
        <p class="sub" style="text-align:center">关掉辅助线，全凭手感瞄准，挑战更高难度</p>
        <div class="settings">
          <label class="setting">
            <span class="txt"><b>瞄准辅助线</b><small>拉伸时显示发射方向与力度的预测虚线。关闭后双方的虚线都不显示，力度条保留</small></span>
            <input type="checkbox" class="switch" data-set="guide">
          </label>
          <label class="setting">
            <span class="txt"><b>加时赛关闭辅助线</b><small>常规时间结束时双方剩余相同，进入 60 秒加时赛，先领先的一方获胜。开启后加时赛中不显示辅助线</small></span>
            <input type="checkbox" class="switch" data-set="overtimeNoGuide">
          </label>
        </div>
        <div class="stack" style="margin-top:18px"><button class="btn btn-wood" data-act="back">完成</button></div>
      </div>
    </section>

    <section class="screen" data-screen="board">
      <div class="panel board-panel">
        <button class="icon-btn back" data-act="back" aria-label="返回" style="background:rgba(0,0,0,.06);color:var(--ink)">${G.back}</button>
        <h2 style="text-align:center">匹配排行榜</h2>
        <p class="sub" style="text-align:center">在线匹配对战的胜场排名<span class="board-total"></span></p>
        <div class="tabs" role="tablist">
          <button role="tab" data-period="all">总榜</button>
          <button role="tab" data-period="week">本周</button>
        </div>
        <div class="board-body"></div>
        <div class="board-me"></div>
      </div>
    </section>

    <div class="hud">
      <div class="hud-top">
        <button class="icon-btn" data-act="hud-menu" aria-label="菜单">${G.menu}</button>
        <div class="chip opp"><span class="av av-op"></span><span class="meta"><span class="nm"></span><span class="st"></span></span><span class="cnt"><i></i><b>5</b></span></div>
        <button class="icon-btn" data-act="hud-sound" aria-label="声音"><span class="snd"></span></button>
      </div>
      <div class="turn hidden"><span class="ot-tag">加时</span><span class="ring"><svg viewBox="0 0 36 36"><circle class="bg" cx="18" cy="18" r="15"/><circle class="fg" cx="18" cy="18" r="15" stroke-dasharray="94.25" stroke-dashoffset="0"/></svg><span>${G.clock}</span></span><span class="lbl"></span></div>
      <div class="bigcount"></div>
      <div class="notice"><span class="dot"></span><span class="txt"></span></div>
      <div class="hint"></div>
      <div class="power"><span>力度</span><span class="bar"><i></i></span><span class="pct">0%</span></div>
      <div class="hud-bottom">
        <div class="chip me"><span class="av av-me"></span><span class="meta"><span class="nm"></span><span class="st"></span></span><span class="cnt"><i></i><b>5</b></span><span class="score"></span></div>
      </div>
      <div class="streak"></div>
      <div class="ping"></div>
      <svg class="guide-path" aria-hidden="true"><polyline points=""/><circle r="5"/></svg>
      <div class="guide-hand"><span class="ripple"></span><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15.5 9.5a3.5 3.5 0 0 1 7 0v13.2l9.8 2.3a4 4 0 0 1 3 4.5l-1.5 9.3a4 4 0 0 1-4 3.3H20.6a4 4 0 0 1-3-1.4l-8.5-9.7a2.9 2.9 0 0 1 4.1-4.1l2.3 2.1z"/></svg></div>
      <div class="toast"></div>
    </div>`;
    }
    bindMenu() {
      let e = this.root,
        t = J(e, `#nick`);
      ((t.value = q(localStorage.getItem(`sling.name`) ?? ``)),
        (t.placeholder = this.defaultName()),
        t.addEventListener(`input`, (e) => {
          if (e.isComposing) return;
          let n = Array.from(t.value);
          n.length > 20 && (t.value = n.slice(0, 20).join(``));
        }),
        t.addEventListener(`change`, () => {
          ((t.value = q(t.value)), localStorage.setItem(`sling.name`, t.value));
        }),
        e.addEventListener(`click`, (t) => {
          let n = t.target.closest(`[data-act]`);
          if (n)
            switch ((this.sfx.unlock(), n.dataset.act)) {
              case `ai`:
                this.show(`ai`);
                break;
              case `match`:
                this.h.onMatch();
                break;
              case `friend`:
                this.show(`friend`);
                break;
              case `help`:
                this.show(`help`);
                break;
              case `settings`:
                (this.refreshSettings(), this.show(`settings`));
                break;
              case `board`:
                (this.show(`board`), this.loadBoard(this.boardPeriod));
                break;
              case `board-retry`:
                this.loadBoard(this.boardPeriod);
                break;
              case `back`:
                this.show(`menu`);
                break;
              case `sound`:
              case `hud-sound`:
                (this.sfx.setEnabled(!this.sfx.enabled),
                  localStorage.setItem(
                    `sling.sound`,
                    this.sfx.enabled ? `1` : `0`,
                  ),
                  this.refreshSound());
                break;
              case `start-ai`:
                this.h.onLocal(this.level);
                break;
              case `create-room`:
                this.h.onCreateFriend();
                break;
              case `join-room`: {
                let t = this.parseRoomCode(J(e, `#room-code`).value);
                t
                  ? this.h.onJoinFriend(t)
                  : this.toast(`请输入房间号或邀请链接`);
                break;
              }
              case `hud-menu`:
                this.h.onMenuButton();
            }
        }));
      for (let t of e.querySelectorAll(`.level`))
        t.addEventListener(`click`, () => {
          ((this.level = t.dataset.level),
            localStorage.setItem(`sling.level`, this.level),
            this.refreshLevels());
        });
      for (let t of e.querySelectorAll(`[data-set]`))
        t.addEventListener(`change`, () => {
          (An({ [t.dataset.set]: t.checked }), this.refreshSettings());
        });
      for (let t of e.querySelectorAll(`[data-period]`))
        t.addEventListener(`click`, () => this.loadBoard(t.dataset.period));
      (this.refreshLevels(), this.refreshSound(), this.refreshSettings());
    }
    refreshSettings() {
      for (let e of this.root.querySelectorAll(`[data-set]`)) {
        let t = e.dataset.set;
        e.checked = U[t];
        let n = t === `overtimeNoGuide` && !U.guide;
        ((e.disabled = n), e.closest(`.setting`)?.classList.toggle(`muted`, n));
      }
    }
    loadBoard(e) {
      this.boardPeriod = e;
      let t = ++this.boardSeq,
        n = J(this.screens.get(`board`), `.panel`);
      for (let t of n.querySelectorAll(`[data-period]`)) {
        let n = t.dataset.period === e;
        (t.classList.toggle(`on`, n),
          t.setAttribute(`aria-selected`, String(n)));
      }
      let r = J(n, `.board-body`),
        i = J(n, `.board-me`);
      ((r.innerHTML = `<div class="board-state">加载中…</div>`),
        (i.innerHTML = ``),
        (J(n, `.board-total`).textContent = ``),
        this.h.loadBoard(e).then(
          (e) => {
            t === this.boardSeq && this.renderBoard(e, r, i);
          },
          () => {
            t === this.boardSeq &&
              (r.innerHTML = `<div class="board-state">无法连接服务器<button class="btn btn-wood btn-small" data-act="board-retry">重试</button></div>`);
          },
        ));
    }
    renderBoard(e, t, n) {
      let r = this.screens.get(`board`).querySelector(`.board-total`);
      r && (r.textContent = e.total ? ` · 共 ${e.total} 人上榜` : ``);
      let i = e.me?.rank ?? null,
        a = (e) => `${Math.round(e * 100)}%`;
      if (!e.top.length)
        t.innerHTML = `<div class="board-state">${e.period === `week` ? `本周` : `目前`}还没有人上榜<small>去在线匹配赢下第一场吧！</small></div>`;
      else {
        t.innerHTML = `<ol class="board-list">${e.top
          .map(
            (
              e,
            ) => `<li class="${e.rank <= 3 ? `r${e.rank}` : ``}${e.rank === i ? ` me` : ``}">
            <span class="rk">${e.rank}</span>
            <span class="who"><b>${K(e.name)}</b><i>#${K(e.tag)}</i></span>
            <span class="wn"><b>${e.wins}</b>胜</span>
            <span class="rt">${a(e.rate)} · ${e.games} 局</span>
          </li>`,
          )
          .join(``)}</ol>`;
        let n = t.querySelector(`li.me`);
        n && (t.scrollTop = Math.max(0, n.offsetTop - t.clientHeight / 2));
      }
      let o = e.me,
        s;
      ((s =
        !o || !o.games
          ? e.period === `week`
            ? `你本周还没有匹配战绩`
            : `你还没有匹配战绩，赢一局就能上榜`
          : o.rank === null
            ? `你：${o.games} 局，还没有胜场`
            : `你：第 <b>${o.rank}</b> 名 · ${o.wins} 胜 · 胜率 ${a(o.rate)}`),
        (n.innerHTML = `<span class="av av-me"></span><span class="t">${s}</span>`));
    }
    parseRoomCode(e) {
      let t = e.trim();
      if (!t) return null;
      try {
        let e = new URL(t).searchParams.get(`room`);
        if (e) return e;
      } catch {}
      let n = t.match(/[A-Za-z0-9_-]{4,32}/);
      return n ? n[0] : null;
    }
    refreshLevels() {
      for (let e of this.root.querySelectorAll(`.level`))
        e.classList.toggle(`sel`, e.dataset.level === this.level);
    }
    refreshSound() {
      for (let e of this.root.querySelectorAll(`.snd`))
        e.innerHTML = this.sfx.enabled ? G.soundOn : G.soundOff;
      for (let e of this.root.querySelectorAll(`.snd-t`))
        e.textContent = this.sfx.enabled ? `声音：开` : `声音：关`;
    }
    bindHud() {
      let e = this.root;
      ((this.hudEl = J(e, `.hud`)),
        (this.turnEl = J(e, `.turn`)),
        (this.powerEl = J(e, `.power`)),
        (this.noticeEl = J(e, `.notice`)),
        (this.hintEl = J(e, `.hint`)),
        (this.toastEl = J(e, `.toast`)),
        (this.chipMe = J(e, `.chip.me`)),
        (this.chipOpp = J(e, `.chip.opp`)),
        (this.scoreEl = J(e, `.chip.me .score`)),
        (this.bigEl = J(e, `.bigcount`)),
        (this.guideEl = J(e, `.guide-hand`)),
        (this.guidePath = e.querySelector(`.guide-path`)),
        (this.pingEl = J(e, `.ping`)),
        (this.streakEl = J(e, `.streak`)));
    }
    show(e) {
      if (this.current !== e) {
        window.clearInterval(this.waitTimer);
        for (let [t, n] of this.screens) n.classList.toggle(`on`, t === e);
        this.current = e;
      }
    }
    get screen() {
      return this.current;
    }
    setHud(e) {
      (this.hudEl.classList.toggle(`on`, e),
        e ||
          (this.setPower(null),
          this.notice(null),
          this.hint(null),
          this.setClock(null),
          this.bigEl.classList.remove(`show`),
          this.streakEl.classList.remove(`show`),
          this.guideHand(null),
          this.setPing(null),
          this.resetCounts()));
    }
    resetCounts() {
      this.lastCounts = [-1, -1];
    }
    setPlayers(e, t) {
      (this.fillChip(this.chipMe, e, 0), this.fillChip(this.chipOpp, t, 1));
    }
    fillChip(e, t, n) {
      let r = J(e, `.nm`);
      r.textContent !== t.name && (r.textContent = t.name);
      let i = J(e, `.st`),
        a = t.sub ?? ``;
      (i.textContent !== a && (i.textContent = a),
        (i.style.display = a ? `` : `none`));
      let o = J(e, `.cnt b`),
        s = String(t.count);
      o.textContent !== s && (o.textContent = s);
      let c = this.lastCounts[n];
      if (c >= 0 && c !== t.count) {
        let r = t.count - c;
        this.bump(e, r, n === 0 ? r < 0 : r > 0);
      }
      ((this.lastCounts[n] = t.count),
        e.classList.toggle(`active`, t.active),
        e.classList.toggle(`off`, !!t.offline),
        e.classList.toggle(`danger`, t.count === 1));
    }
    bump(e, t, n) {
      let r = J(e, `.cnt`);
      (r.classList.remove(`bump-good`, `bump-bad`),
        r.offsetWidth,
        r.classList.add(n ? `bump-good` : `bump-bad`));
      let i = document.createElement(`span`);
      ((i.className = `delta ${n ? `good` : `bad`}`),
        (i.textContent = (t > 0 ? `+` : ``) + t),
        r.appendChild(i),
        window.setTimeout(() => i.remove(), 900));
    }
    setScore(e) {
      ((this.scoreEl.textContent = e ?? ``),
        (this.scoreEl.style.display = e ? `` : `none`));
    }
    setClock(e, t = 1, n = {}) {
      let r = n.label;
      if (e === null) {
        (this.turnEl.classList.add(`hidden`),
          this.turnEl.classList.remove(`ot`),
          (this.lastClockSec = -1));
        return;
      }
      (this.turnEl.classList.remove(`hidden`),
        this.turnEl.classList.contains(`ot`) !== !!n.overtime &&
          (this.turnEl.classList.toggle(`ot`, !!n.overtime),
          (this.lastClockSec = -1)));
      let i = Math.max(0, Math.ceil(e)),
        a = r ?? `${Math.floor(i / 60)}:${String(i % 60).padStart(2, `0`)}`,
        o = J(this.turnEl, `.lbl`);
      (o.textContent !== a && (o.textContent = a),
        J(this.turnEl, `.fg`).setAttribute(
          `stroke-dashoffset`,
          String(94.25 * (1 - Math.max(0, Math.min(1, e / t)))),
        ));
      let s = !r && i <= 10 && e > 0;
      (this.turnEl.classList.toggle(`urgent`, s),
        s &&
          i !== this.lastClockSec &&
          this.lastClockSec !== -1 &&
          this.sfx.tick(i <= 3),
        !r &&
          this.lastClockSec === i + 1 &&
          (i === 30
            ? this.toast(`还剩 30 秒`)
            : i === 10 && this.flash(`最后 10 秒`, `warn`)),
        (this.lastClockSec = i));
    }
    flash(e, t = `count`) {
      let n = this.bigEl;
      ((n.textContent = e),
        (n.className = `bigcount ${t}`),
        n.offsetWidth,
        n.classList.add(`show`),
        window.clearTimeout(this.bigTimer),
        (this.bigTimer = window.setTimeout(
          () => n.classList.remove(`show`),
          t === `count` ? 820 : 1150,
        )));
    }
    setPower(e) {
      if (e === null) {
        (this.lastPower !== -1 && this.powerEl.classList.remove(`on`),
          (this.lastPower = -1));
        return;
      }
      let t = Math.round(e * 100);
      t !== this.lastPower &&
        ((this.lastPower = t),
        this.powerEl.classList.add(`on`),
        this.powerEl.classList.toggle(`max`, t >= 99),
        J(this.powerEl, `.bar i`).style.setProperty(`--p`, `${t}%`),
        (J(this.powerEl, `.pct`).textContent = `${t}%`));
    }
    toast(e, t = {}) {
      let n = this.toastEl;
      ((n.textContent = e),
        n.classList.toggle(`mine`, !!t.mine),
        n.classList.add(`show`),
        window.clearTimeout(this.toastTimer),
        (this.toastTimer = window.setTimeout(
          () => n.classList.remove(`show`),
          t.ms ?? 1300,
        )));
    }
    notice(e) {
      (this.noticeEl.classList.toggle(`on`, !!e),
        e && (J(this.noticeEl, `.txt`).textContent = e));
    }
    hint(e) {
      (this.hintEl.classList.toggle(`on`, !!e),
        e && (this.hintEl.textContent = e));
    }
    guideHand(e) {
      let t = this.guideEl,
        n = this.guidePath;
      if (!e)
        (t.style.opacity !== `0` && (t.style.opacity = `0`),
          n.style.opacity !== `0` && (n.style.opacity = `0`));
      else {
        if (e.path && e.path.length > 1) {
          ((n.style.opacity = (e.alpha * 0.85).toFixed(3)),
            n
              .querySelector(`polyline`)
              .setAttribute(
                `points`,
                e.path
                  .map((e) => `${e.x.toFixed(1)},${e.y.toFixed(1)}`)
                  .join(` `),
              ));
          let t = e.path[e.path.length - 1],
            r = n.querySelector(`circle`);
          (r.setAttribute(`cx`, t.x.toFixed(1)),
            r.setAttribute(`cy`, t.y.toFixed(1)));
        } else n.style.opacity = `0`;
        ((t.style.opacity = e.alpha.toFixed(3)),
          (t.style.transform = `translate(${e.x.toFixed(1)}px, ${e.y.toFixed(1)}px) scale(${(1 - 0.12 * e.press).toFixed(3)})`),
          t.classList.toggle(`pressed`, e.press > 0.5),
          t.classList.toggle(`pulling`, e.pulling));
      }
    }
    setPing(e) {
      let t = e === null ? -1 : Math.round(e);
      if (t === this.lastPing) return;
      this.lastPing = t;
      let n = this.pingEl;
      (n.classList.toggle(`on`, t >= 0),
        !(t < 0) &&
          ((n.innerHTML = `${G.wifi}<span>${t} ms</span>`),
          (n.dataset.q = t < 90 ? `good` : t < 180 ? `ok` : `bad`)));
    }
    streak(e) {
      let t = this.streakEl;
      ((t.innerHTML = `连中 <b>×${e}</b>`),
        t.classList.remove(`show`),
        t.offsetWidth,
        t.classList.add(`show`),
        t.classList.toggle(`hot`, e >= 4),
        window.clearTimeout(this.streakTimer),
        (this.streakTimer = window.setTimeout(
          () => t.classList.remove(`show`),
          1600,
        )));
    }
    buttons(e) {
      return e
        .map(
          (e, t) =>
            `<button class="btn btn-${e.kind ?? `primary`}" data-i="${t}" ${e.disabled ? `disabled` : ``}>${e.icon ? G[e.icon] : ``}${K(e.label)}</button>`,
        )
        .join(``);
    }
    wire(e, t) {
      e.querySelectorAll(`button[data-i]`).forEach((e) => {
        e.onclick = () => {
          (this.sfx.unlock(), t[Number(e.dataset.i)].onClick());
        };
      });
    }
    showWaiting(e) {
      let t = J(this.screens.get(`wait`), `.wait`);
      ((t.innerHTML = `<div class="spinner"><span class="pk a"></span><span class="pk b"></span></div>
      <div class="big">${K(e.title)}</div>
      <div class="mono txt">${K(e.text ?? ``)}</div>
      <div class="mono el"></div>
      <div class="stack" style="width:100%;margin-top:6px">${this.buttons(e.buttons)}</div>`),
        this.wire(t, e.buttons),
        this.show(`wait`));
      let n = J(t, `.el`);
      if (e.elapsed) {
        let e = Date.now(),
          t = () => {
            let t = Math.floor((Date.now() - e) / 1e3);
            n.textContent = `已等待 ${String(Math.floor(t / 60)).padStart(2, `0`)}:${String(t % 60).padStart(2, `0`)}`;
          };
        (t(), (this.waitTimer = window.setInterval(t, 500)));
      }
      return { setText: (e) => (J(t, `.txt`).textContent = e) };
    }
    showInvite(e, t, n) {
      let r = J(this.screens.get(`wait`), `.wait`),
        i = typeof navigator.share == `function`;
      r.innerHTML = `<div class="spinner"><span class="pk a"></span><span class="pk b"></span></div>
      <div class="big">等待好友加入…</div>
      <div class="mono">房间号</div>
      <div class="room-code">${K(e)}</div>
      <div class="link-box"><input readonly value="${K(t)}"><button class="btn btn-wood btn-small" data-x="copy">${G.copy}复制</button></div>
      <div class="stack" style="width:100%;margin-top:4px">
        ${i ? `<button class="btn btn-primary" data-x="share">${G.share}发送给好友</button>` : ``}
        <button class="btn btn-ghost" data-x="cancel">取消</button>
      </div>`;
      let a = async () => {
        try {
          (await navigator.clipboard.writeText(t), this.toast(`链接已复制`));
        } catch {
          (J(r, `input`).select(),
            document.execCommand(`copy`),
            this.toast(`链接已复制`));
        }
      };
      (r.querySelectorAll(`[data-x]`).forEach((e) => {
        e.onclick = () => {
          let r = e.dataset.x;
          r === `copy`
            ? a()
            : r === `share`
              ? navigator
                  .share({
                    title: `桌上弹射冰球`,
                    text: `来和我玩一局弹射冰球！`,
                    url: t,
                  })
                  .catch(() => {})
              : n();
        };
      }),
        this.show(`wait`));
    }
    showVersus(e, t, n, r = `匹配成功`) {
      let i = J(this.screens.get(`versus`), `.versus`),
        a = `<div class="tag">${K(r)}</div>
      <div class="vs-row">
        <div class="plate"><span class="av av-me"></span><span class="pn">${K(e)}</span></div>
        <div class="vs">VS</div>
        <div class="plate"><span class="av av-op"></span><span class="pn">${K(t)}</span></div>
      </div>
      <div class="count-big" data-c="${n}">${n > 0 ? n : `开始`}</div>`,
        o = i.querySelector(`.count-big`);
      ((o && o.dataset.c === String(n) && this.current === `versus`) ||
        (i.innerHTML = a),
        this.show(`versus`));
    }
    showResult(e) {
      (this.hint(null), this.bigEl.classList.remove(`show`));
      let t = J(this.screens.get(`result`), `.panel`);
      t.className = `panel result ${e.outcome}`;
      let n =
        e.outcome === `win`
          ? G.trophy
          : e.outcome === `lose`
            ? G.sad
            : G.handshake;
      ((t.innerHTML = `${e.outcome === `win` ? this.confetti() : ``}
      <div class="badge">${n}</div>
      <h2>${K(e.title)}</h2>
      <p class="sub">${K(e.subtitle)}</p>
      <div class="stats">${e.stats.map(([e, t]) => `<div><b>${K(e)}</b><span>${K(t)}</span></div>`).join(``)}</div>
      <div class="note">${this.resultNoteText}</div>
      <div class="status">${K(e.status ?? ``)}</div>
      <div class="stack">${this.buttons(e.buttons)}</div>`),
        this.wire(t, e.buttons));
      let r = !q(J(this.root, `#nick`).value);
      if (
        e.outcome === `win` &&
        r &&
        !this.nameInviteSeen &&
        localStorage.getItem(`sling.nameInviteSeen`) !== `1`
      ) {
        this.nameInviteSeen = !0;
        try {
          localStorage.setItem(`sling.nameInviteSeen`, `1`);
        } catch {}
        this.inviteName(t, e.onRename);
      }
      this.show(`result`);
    }
    inviteName(e, t) {
      let n = document.createElement(`form`);
      ((n.className = `winner-name`),
        (n.noValidate = !0),
        (n.innerHTML = `<label class="winner-name-title" for="winner-nick">给这场胜利签个名</label>
      <div class="winner-name-row"><div class="field"><input id="winner-nick" maxlength="40" autocomplete="off" spellcheck="false" enterkeyhint="done" aria-describedby="winner-name-hint winner-name-feedback"></div><button class="btn btn-wood" type="submit">保存昵称</button></div>
      <div class="winner-name-foot"><span id="winner-name-hint">最多 20 个字，可在主菜单修改</span><button class="btn btn-ghost" type="button">以后再说</button></div>
      <p id="winner-name-feedback" role="status" aria-live="polite"></p>`),
        e.insertBefore(n, J(e, `.status`)));
      let r = J(n, `input`),
        i = J(n, `[type="submit"]`),
        a = J(n, `[type="button"]`),
        o = J(n, `#winner-name-feedback`);
      r.placeholder = this.defaultName();
      let s = !1,
        c = !1,
        l = () => {
          ((r.value = Array.from(r.value).slice(0, 20).join(``)),
            r.removeAttribute(`aria-invalid`),
            (o.textContent = ``));
        };
      (r.addEventListener(`compositionstart`, () => {
        s = !0;
      }),
        r.addEventListener(`compositionend`, () => {
          ((s = !1), l());
        }),
        r.addEventListener(`input`, () => {
          s || l();
        }),
        r.addEventListener(`keydown`, (e) => {
          e.key === `Enter` && (e.isComposing || s) && e.preventDefault();
        }),
        (a.onclick = () => {
          (n.remove(),
            e.querySelector(`.stack button`)?.focus({ preventScroll: !0 }));
        }),
        (n.onsubmit = async (a) => {
          if ((a.preventDefault(), s || c)) return;
          let l = q(r.value);
          if (!l)
            ((o.textContent = `写个昵称再保存，也可以选择以后再说。`),
              r.setAttribute(`aria-invalid`, `true`),
              r.focus());
          else {
            ((c = !0),
              (r.disabled = i.disabled = !0),
              (i.textContent = `保存中…`),
              (o.textContent = ``));
            try {
              let r = t ? await t(l) : l;
              J(this.root, `#nick`).value = r;
              let i = !0;
              try {
                localStorage.setItem(`sling.name`, r);
              } catch {
                i = !1;
              }
              n.replaceChildren();
              let a = document.createElement(`p`);
              ((a.className = `winner-name-done`),
                a.setAttribute(`role`, `status`),
                (a.textContent = `已署名：${r}${i ? `` : `（浏览器未保存，下次打开需重填）`}`),
                n.append(a),
                n.isConnected &&
                  this.current === `result` &&
                  e
                    .querySelector(`.stack button`)
                    ?.focus({ preventScroll: !0 }));
            } catch (e) {
              ((o.textContent =
                e instanceof Error ? e.message : `昵称暂时没能保存，请重试。`),
                (r.disabled = i.disabled = !1),
                (i.textContent = `保存昵称`),
                (c = !1));
            }
          }
        }));
    }
    resultNote(e) {
      this.resultNoteText = e;
      let t = this.screens.get(`result`).querySelector(`.note`);
      t && (t.innerHTML = e);
    }
    updateResult(e, t) {
      let n = J(this.screens.get(`result`), `.panel`),
        r = n.querySelector(`.status`);
      if ((r && r.textContent !== e && (r.textContent = e), t)) {
        let e = J(n, `.stack`);
        ((e.innerHTML = this.buttons(t)), this.wire(e, t));
      }
    }
    showDialog(e, t, n) {
      let r = J(this.screens.get(`dialog`), `.panel`);
      ((r.innerHTML = `<h2>${K(e)}</h2><p class="sub">${K(t)}</p><div class="stack">${this.buttons(n)}</div>`),
        this.wire(r, n),
        this.show(`dialog`));
    }
    confetti() {
      let e = [`#d84a34`, `#ffcf6e`, `#2f7470`, `#f3dcb0`, `#1f1b18`],
        t = `<div class="confetti">`;
      for (let n = 0; n < 36; n++)
        t += `<i style="left:${Math.random() * 100}%;background:${e[n % e.length]};animation-delay:${(Math.random() * 0.8).toFixed(2)}s;animation-duration:${(1.8 + Math.random() * 1.4).toFixed(2)}s"></i>`;
      return t + `</div>`;
    }
  },
  ar = class {
    scene;
    canvas;
    ui;
    match = null;
    demo = null;
    net = null;
    ticket = null;
    ctx;
    flow = 0;
    shownAims = 0;
    constructor(e, t, n, r) {
      ((this.scene = e),
        (this.canvas = n),
        (this.ui = new ir(r, t, {
          onLocal: (e) => this.startLocal(e),
          onMatch: () => this.startMatchmaking(),
          onCreateFriend: () => this.createFriendRoom(),
          onJoinFriend: (e) => this.joinFriendRoom(e),
          onMenuButton: () => this.match?.onMenu(),
          loadBoard: (e) => Jn(e),
        })),
        (this.ctx = {
          scene: e,
          sfx: t,
          ui: this.ui,
          canvas: n,
          exit: () => this.showMenu(),
          requeue: () => this.startMatchmaking(),
        }));
    }
    getNet() {
      return ((this.net ||= new Yn()), this.net);
    }
    start() {
      let e = new URLSearchParams(location.search).get(`room`);
      e ? this.joinFriendRoom(e) : this.showMenu();
    }
    clearMatch() {
      (this.flow++,
        this.ticket?.cancel(),
        (this.ticket = null),
        this.match?.dispose(),
        (this.match = null),
        this.ui.setHud(!1));
    }
    showMenu() {
      this.clearMatch();
      let e = new URL(location.href);
      (e.searchParams.has(`room`) &&
        (e.searchParams.delete(`room`),
        history.replaceState(null, ``, e.toString())),
        (this.demo ||= new Wn(this.ctx, { demo: !0 })),
        this.scene.setViewSide(0),
        this.ui.show(`menu`));
    }
    stopDemo() {
      (this.demo?.dispose(), (this.demo = null));
    }
    startLocal(e) {
      (this.clearMatch(), this.stopDemo());
      let t = new URLSearchParams(location.search),
        n = (e) => {
          let n = Number(t.get(e));
          return t.has(e) && Number.isFinite(n) && n >= 0 ? n : void 0;
        };
      this.match = new Wn(this.ctx, {
        level: e,
        matchTime: n(`matchSeconds`) || void 0,
        overtime: n(`overtimeSeconds`),
      });
    }
    startMatchmaking() {
      this.clearMatch();
      let e = this.flow,
        t = this.ui.name,
        n = this.ui.showWaiting({
          title: `正在寻找对手…`,
          text: `已进入匹配队列`,
          elapsed: !0,
          buttons: [
            {
              label: `取消匹配`,
              kind: `ghost`,
              onClick: () => this.showMenu(),
            },
          ],
        }),
        r;
      try {
        r = this.getNet().enterQueue(t, (e) =>
          n.setText(
            e >= 2 ? `找到对手，正在进入对局…` : `队列中，等待其他玩家加入…`,
          ),
        );
      } catch (e) {
        this.netError(e);
        return;
      }
      ((this.ticket = r),
        r.room.then(
          (t) => {
            e === this.flow
              ? ((this.ticket = null), this.enterOnline(t, `match`))
              : t.leave();
          },
          (t) => {
            e === this.flow && this.netError(t);
          },
        ));
    }
    createFriendRoom() {
      this.clearMatch();
      let e = this.flow;
      (this.ui.showWaiting({
        title: `正在创建房间…`,
        buttons: [
          { label: `取消`, kind: `ghost`, onClick: () => this.showMenu() },
        ],
      }),
        this.getNet()
          .createFriendRoom(this.ui.name)
          .then(
            (t) => {
              if (e !== this.flow) return void t.leave();
              this.enterOnline(t, `friend`);
            },
            (t) => e === this.flow && this.netError(t),
          ));
    }
    joinFriendRoom(e) {
      this.clearMatch();
      let t = this.flow;
      (this.ui.showWaiting({
        title: `正在加入好友房间…`,
        text: `房间号 ${e}`,
        buttons: [
          { label: `取消`, kind: `ghost`, onClick: () => this.showMenu() },
        ],
      }),
        this.getNet()
          .joinFriendRoom(e, this.ui.name)
          .then(
            (e) => {
              if (t !== this.flow) return void e.leave();
              this.enterOnline(e, `friend`);
            },
            (e) => {
              if (t !== this.flow) return;
              let n = String(e?.message ?? e),
                r = /locked|full/i.test(n);
              this.ui.showDialog(
                r ? `房间已满` : `无法加入房间`,
                r
                  ? `这个房间里的对局已经开始了。`
                  : `房间不存在或已解散，请确认邀请链接。`,
                [{ label: `返回主菜单`, onClick: () => this.showMenu() }],
              );
            },
          ));
    }
    enterOnline(e, t) {
      (this.stopDemo(), (this.match = new tr(this.ctx, e, t)));
    }
    netError(e) {
      (console.warn(e),
        this.ui.showDialog(
          `无法连接服务器`,
          `请确认联机服务器已启动（npm run dev 或 npm start），然后重试。`,
          [{ label: `返回主菜单`, onClick: () => this.showMenu() }],
        ));
    }
    frame(e) {
      let t = this.match ?? this.demo,
        n = t ? t.update(e) : { pucks: [] };
      ((this.shownAims = n.aims?.length ?? 0), this.scene.frame(e, n));
    }
    testHooks() {
      return {
        state: () => {
          let e = this.match,
            t = e?.debug();
          return {
            screen: this.ui.screen,
            kind: e?.kind ?? null,
            aims: this.shownAims,
            ...(t ?? {
              phase: ``,
              mySide: null,
              canAct: !1,
              holding: !1,
              winner: -1,
              reason: ``,
              overtime: !1,
              renderOk: !1,
              pucks: [],
            }),
            pucks: t
              ? t.pucks.map((e) => ({
                  id: e.id,
                  x: +e.x.toFixed(3),
                  y: +e.y.toFixed(3),
                  held: e.held ?? null,
                }))
              : [],
          };
        },
        planDrag: (e = `hard`) => {
          let t = this.match,
            n = t?.debug();
          if (!t || !n || !n.canAct || n.mySide === null) return null;
          let r = n.mySide,
            i = rn(n.pucks, r, Vt[e], Math.random, {
              canUse: (e) => t.grabbable(e),
            });
          if (!i) return null;
          let a = i.shot,
            o = n.pucks.find((e) => e.id === a.puckId),
            s = this.canvas.getBoundingClientRect(),
            c = (e, t) => {
              let n = this.scene.project(e, t);
              return { x: s.left + n.x, y: s.top + n.y };
            },
            l = M(r),
            u = r === 0 ? 1 : -1;
          return {
            shot: a,
            start: c(o.x, o.y),
            front: c(a.cx, l + u * 0.6),
            engage: c(a.cx, l - u * 0.08),
            pull: c(a.px, a.py),
          };
        },
        project: (e, t) => this.scene.project(e, t),
        rawState: () => {
          let e = this.match?.room?.state;
          return e?.toJSON ? e.toJSON() : null;
        },
        netDebug: () => this.match?.netDebug?.() ?? null,
      };
    }
  },
  or = class {
    ctx = null;
    master = null;
    noise = null;
    last = new Map();
    voices = [];
    _enabled = !0;
    duck = 1;
    get enabled() {
      return this._enabled;
    }
    unlock() {
      if (!this.ctx) {
        let e = window.AudioContext ?? window.webkitAudioContext;
        if (!e) return;
        let t = new e(),
          n = t.createDynamicsCompressor();
        ((n.threshold.value = -14), (n.knee.value = 10), (n.ratio.value = 5));
        let r = t.createGain();
        ((r.gain.value = this._enabled ? 0.9 : 0),
          r.connect(n).connect(t.destination));
        let i = Math.floor(t.sampleRate * 0.5),
          a = t.createBuffer(1, i, t.sampleRate),
          o = a.getChannelData(0);
        for (let e = 0; e < i; e++) o[e] = Math.random() * 2 - 1;
        ((this.ctx = t), (this.master = r), (this.noise = a));
      }
      this.ctx.state === `suspended` && this.ctx.resume();
    }
    setEnabled(e) {
      ((this._enabled = e),
        this.master &&
          this.ctx &&
          this.master.gain.setTargetAtTime(
            e ? 0.9 : 0,
            this.ctx.currentTime,
            0.02,
          ));
    }
    setDuck(e) {
      this.duck = e;
    }
    ready() {
      return !this.ctx || !this._enabled || this.ctx.state !== `running`
        ? null
        : this.ctx;
    }
    allow(e, t) {
      let n = performance.now();
      return n - (this.last.get(e) ?? -1e9) < t ||
        ((this.voices = this.voices.filter((e) => n - e < 120)),
        this.voices.length > 14)
        ? !1
        : (this.voices.push(n), this.last.set(e, n), !0);
    }
    out(e, t) {
      let n = this.ctx,
        r = n.createGain();
      if (((r.gain.value = e * this.duck), n.createStereoPanner)) {
        let e = n.createStereoPanner();
        ((e.pan.value = Math.max(-0.8, Math.min(0.8, t))),
          r.connect(e).connect(this.master));
      } else r.connect(this.master);
      return r;
    }
    noiseBurst(e, t, n, r, i, a, o) {
      let s = this.ctx,
        c = s.createBufferSource();
      ((c.buffer = this.noise),
        (c.playbackRate.value = 0.9 + Math.random() * 0.2));
      let l = s.createBiquadFilter();
      ((l.type = n), (l.frequency.value = r), (l.Q.value = i));
      let u = s.createGain();
      (u.gain.setValueAtTime(1e-4, t),
        u.gain.exponentialRampToValueAtTime(o, t + 0.0015),
        u.gain.exponentialRampToValueAtTime(1e-4, t + a),
        c.connect(l).connect(u).connect(e),
        c.start(t, Math.random() * 0.3),
        c.stop(t + a + 0.02));
    }
    tone(e, t, n, r, i, a, o, s = 0.002) {
      let c = this.ctx,
        l = c.createOscillator();
      ((l.type = n),
        l.frequency.setValueAtTime(r, t),
        i !== r &&
          l.frequency.exponentialRampToValueAtTime(Math.max(20, i), t + a));
      let u = c.createGain();
      (u.gain.setValueAtTime(1e-4, t),
        u.gain.exponentialRampToValueAtTime(o, t + s),
        u.gain.exponentialRampToValueAtTime(1e-4, t + a),
        l.connect(u).connect(e),
        l.start(t),
        l.stop(t + a + 0.02));
    }
    hit(e, t, n = 0) {
      let r = this.ready();
      if (!r) return;
      let i = Math.min(1, (Math.max(0, t) / 26) ** 0.8);
      if (i < 0.04 || !this.allow(e, e === `puck` ? 28 : 40)) return;
      let a = r.currentTime + 0.005,
        o = this.out(0.25 + 0.75 * i, n),
        s = 0.92 + Math.random() * 0.16;
      switch (e) {
        case `puck`:
          (this.noiseBurst(
            o,
            a,
            `bandpass`,
            2200 * s,
            1.7,
            0.022,
            0.9 * i + 0.1,
          ),
            this.tone(o, a, `sine`, 380 * s, 240 * s, 0.055, 0.4 * i + 0.05),
            this.tone(o, a, `sine`, 1700 * s, 1200 * s, 0.028, 0.2 * i));
          break;
        case `wall`:
          (this.noiseBurst(o, a, `bandpass`, 950 * s, 1.4, 0.045, 0.8 * i + 0.1),
            this.tone(o, a, `sine`, 300 * s, 180 * s, 0.065, 0.5 * i + 0.05));
          break;
        case `divider`:
          (this.noiseBurst(
            o,
            a,
            `bandpass`,
            1250 * s,
            1.6,
            0.035,
            0.8 * i + 0.1,
          ),
            this.tone(o, a, `sine`, 560 * s, 360 * s, 0.06, 0.45 * i + 0.05));
          break;
        case `band`:
          (this.noiseBurst(o, a, `lowpass`, 700, 0.8, 0.07, 0.6 * i + 0.1),
            this.tone(o, a, `sine`, 160, 95, 0.11, 0.55 * i + 0.05));
      }
    }
    launch(e, t = 0) {
      let n = this.ready();
      if (!n || !this.allow(`launch`, 60)) return;
      let r = n.currentTime + 0.004,
        i = this.out(0.5 + 0.5 * e, t);
      (this.noiseBurst(i, r, `highpass`, 1800, 0.7, 0.03, 0.6 + 0.3 * e),
        this.tone(i, r, `triangle`, 210 + e * 100, 90, 0.1 + e * 0.05, 0.5),
        this.tone(i, r + 0.005, `sine`, 120 + e * 40, 65, 0.12, 0.35));
    }
    stretch(e) {
      let t = this.ready();
      if (!t || !this.allow(`stretch`, 45)) return;
      let n = t.currentTime + 0.002,
        r = this.out(0.12 + e * 0.18, 0);
      this.noiseBurst(r, n, `bandpass`, 500 + e * 1500, 6, 0.04, 0.5);
    }
    select() {
      let e = this.ready();
      if (!e || !this.allow(`select`, 60)) return;
      let t = e.currentTime + 0.003,
        n = this.out(0.35, 0);
      (this.tone(n, t, `sine`, 980, 900, 0.06, 0.5),
        this.noiseBurst(n, t, `bandpass`, 3e3, 2, 0.02, 0.3));
    }
    putBack() {
      let e = this.ready();
      if (!e || !this.allow(`put`, 60)) return;
      let t = e.currentTime + 0.003,
        n = this.out(0.35, 0);
      this.tone(n, t, `sine`, 700, 520, 0.09, 0.45);
    }
    turn(e) {
      let t = this.ready();
      if (!t || !this.allow(`turn`, 300)) return;
      let n = t.currentTime + 0.01,
        r = this.out(e ? 0.32 : 0.18, 0);
      e
        ? (this.tone(r, n, `sine`, 659, 659, 0.35, 0.5, 0.01),
          this.tone(r, n + 0.12, `sine`, 880, 880, 0.5, 0.5, 0.01))
        : this.tone(r, n, `sine`, 523, 523, 0.35, 0.4, 0.01);
    }
    tick(e) {
      let t = this.ready();
      if (!t || !this.allow(`tick`, 200)) return;
      let n = t.currentTime + 0.002,
        r = this.out(e ? 0.3 : 0.18, 0);
      this.tone(r, n, `square`, e ? 1760 : 1320, e ? 1760 : 1320, 0.03, 0.25);
    }
    timeout() {
      let e = this.ready();
      if (!e) return;
      let t = e.currentTime + 0.01,
        n = this.out(0.3, 0);
      this.tone(n, t, `sawtooth`, 220, 150, 0.35, 0.25, 0.01);
    }
    pass(e, t = 0) {
      let n = this.ready();
      if (!n || !this.allow(`pass` + e, 90)) return;
      let r = n.currentTime + 0.005,
        i = this.out(e ? 0.34 : 0.26, t);
      (this.noiseBurst(i, r, `bandpass`, e ? 2400 : 900, 0.8, 0.12, 0.25),
        e
          ? (this.tone(i, r + 0.02, `sine`, 1046, 1046, 0.25, 0.4, 0.004),
            this.tone(i, r + 0.09, `sine`, 1568, 1568, 0.35, 0.32, 0.004))
          : this.tone(i, r + 0.02, `triangle`, 330, 247, 0.28, 0.4, 0.004));
    }
    countdown() {
      let e = this.ready();
      if (!e || !this.allow(`cd`, 300)) return;
      let t = e.currentTime + 0.005;
      this.tone(this.out(0.28, 0), t, `sine`, 740, 740, 0.18, 0.5, 0.005);
    }
    go() {
      let e = this.ready();
      if (!e || !this.allow(`go`, 300)) return;
      let t = e.currentTime + 0.005,
        n = this.out(0.32, 0);
      (this.tone(n, t, `sine`, 988, 988, 0.5, 0.45, 0.005),
        this.tone(n, t, `triangle`, 1480, 1480, 0.4, 0.2, 0.005));
    }
    deny() {
      let e = this.ready();
      if (!e || !this.allow(`deny`, 200)) return;
      let t = e.currentTime + 0.005,
        n = this.out(0.22, 0);
      (this.tone(n, t, `square`, 180, 160, 0.09, 0.2, 0.002),
        this.tone(n, t + 0.1, `square`, 160, 140, 0.09, 0.2, 0.002));
    }
    combo(e) {
      let t = this.ready();
      if (!t || !this.allow(`combo`, 200)) return;
      let n = t.currentTime + 0.03,
        r = this.out(0.3, 0),
        i = 784 * 2 ** ((Math.min(e, 7) - 2) / 6);
      ([1, 1.26, 1.5].forEach((e, t) =>
        this.tone(
          r,
          n + t * 0.055,
          `triangle`,
          i * e,
          i * e,
          0.22,
          0.38,
          0.004,
        ),
      ),
        this.tone(r, n + 0.17, `sine`, i * 2, i * 2, 0.35, 0.18, 0.006));
    }
    buzz(e) {
      if (this._enabled)
        try {
          typeof navigator.vibrate == `function` &&
            matchMedia(`(pointer: coarse)`).matches &&
            navigator.vibrate(e);
        } catch {}
    }
    win() {
      let e = this.ready();
      if (!e) return;
      let t = e.currentTime + 0.02,
        n = this.out(0.4, 0);
      ([523, 659, 784, 1047].forEach((e, r) =>
        this.tone(n, t + r * 0.11, `triangle`, e, e, 0.5, 0.5, 0.01),
      ),
        this.tone(n, t + 0.44, `sine`, 1568, 1568, 0.9, 0.25, 0.02));
    }
    lose() {
      let e = this.ready();
      if (!e) return;
      let t = e.currentTime + 0.02,
        n = this.out(0.35, 0);
      [392, 330, 262].forEach((e, r) =>
        this.tone(n, t + r * 0.16, `triangle`, e, e * 0.98, 0.55, 0.45, 0.01),
      );
    }
  };
function sr(e) {
  let t = e >>> 0;
  return () => {
    t = (t + 1831565813) >>> 0;
    let e = t;
    return (
      (e = Math.imul(e ^ (e >>> 15), e | 1)),
      (e ^= e + Math.imul(e ^ (e >>> 7), e | 61)),
      ((e ^ (e >>> 14)) >>> 0) / 4294967296
    );
  };
}
function cr(e, t) {
  let n = document.createElement(`canvas`);
  return ((n.width = e), (n.height = t), [n, n.getContext(`2d`)]);
}
function lr(e, t = !1) {
  let n = new de(e);
  return (
    (n.colorSpace = m),
    (n.anisotropy = 8),
    t && ((n.wrapS = d), (n.wrapT = d)),
    (n.needsUpdate = !0),
    n
  );
}
function ur(e, t, n, r, i) {
  let a = e.getImageData(0, 0, t, n),
    o = a.data;
  for (let e = 0; e < o.length; e += 4) {
    let t = (i() - 0.5) * r;
    ((o[e] = Math.max(0, Math.min(255, o[e] + t))),
      (o[e + 1] = Math.max(0, Math.min(255, o[e + 1] + t))),
      (o[e + 2] = Math.max(0, Math.min(255, o[e + 2] + t))));
  }
  e.putImageData(a, 0, 0);
}
function dr(e, t, n, r) {
  let i = sr(r.seed ?? 1);
  ((e.fillStyle = r.base), e.fillRect(0, 0, t, n));
  for (let a = 0; a < 26; a++) {
    let a = i() * t,
      o = i() * n,
      s = (0.2 + i() * 0.5) * Math.max(t, n),
      c = e.createRadialGradient(a, o, 0, a, o, s),
      l = i() < 0.5 ? r.dark : (r.light ?? r.base);
    (c.addColorStop(0, pr(l, 0.08 + i() * 0.06)),
      c.addColorStop(1, pr(l, 0)),
      (e.fillStyle = c),
      e.fillRect(0, 0, t, n));
  }
  let a = r.lines ?? 70,
    o = r.wave ?? 1;
  for (let s = 0; s < a; s++) {
    let c = (s / a) * n + (i() - 0.5) * (n / a) * 1.6,
      l = (2 + i() * 6) * o,
      u = (0.004 + i() * 0.01) / o,
      d = i() * 10,
      f = (0.6 + i() * 2) * o,
      p = 0.02 + i() * 0.04;
    ((e.strokeStyle = pr(r.dark, 0.12 + i() * 0.3)),
      (e.lineWidth = 0.6 + i() * 2.2),
      e.beginPath());
    for (let n = -10; n <= t + 10; n += 6) {
      let t = c + Math.sin(n * u + d) * l + Math.sin(n * p + d * 2) * f;
      n === -10 ? e.moveTo(n, t) : e.lineTo(n, t);
    }
    e.stroke();
  }
  for (let a = 0; a < (r.knots ?? 0); a++) {
    let a = i() * t,
      o = i() * n;
    for (let t = 6; t > 0; t--)
      ((e.strokeStyle = pr(r.dark, 0.08 + t * 0.03)),
        (e.lineWidth = 1.2),
        e.beginPath(),
        e.ellipse(a, o, t * 5 + 4, t * 2.2 + 2, 0, 0, Math.PI * 2),
        e.stroke());
  }
  for (let a = 0; a < t * n * 6e-4; a++)
    ((e.fillStyle = pr(
      i() < 0.5 ? r.dark : (r.light ?? `#ffffff`),
      0.05 + i() * 0.07,
    )),
      e.fillRect(i() * t, i() * n, 2 + i() * 10, 0.8));
  ur(e, t, n, 10, i);
}
function fr(e, t = 1024, n = 512) {
  let [r, i] = cr(t, n);
  return (dr(i, t, n, e), lr(r, !0));
}
function pr(e, t) {
  let n = parseInt(e.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${t.toFixed(3)})`;
}
function mr() {
  let e = Math.round(T * 2 * 56),
    t = Math.round(E * 2 * 56),
    [n, r] = cr(e, t),
    i = sr(42),
    a = (e) => (e + T) * 56,
    o = (e) => (E - e) * 56;
  ((r.fillStyle = `#e6d5b0`), r.fillRect(0, 0, e, t));
  for (let n = 0; n < 70; n++) {
    let n = i() * e,
      a = i() * t,
      o = 80 + i() * 380,
      s = r.createRadialGradient(n, a, 0, n, a, o),
      c = i() < 0.55;
    (s.addColorStop(0, c ? `rgba(130,145,99,0.035)` : `rgba(255,251,226,0.08)`),
      s.addColorStop(1, `rgba(0,0,0,0)`),
      (r.fillStyle = s),
      r.fillRect(0, 0, e, t));
  }
  for (let n = 0; n < 26e3; n++) {
    let n = i() * e,
      a = i() * t,
      o = 2 + i() * 9,
      s = i() * Math.PI;
    ((r.strokeStyle =
      i() < 0.5
        ? `rgba(142,132,99,${0.015 + i() * 0.025})`
        : `rgba(255,255,237,${0.03 + i() * 0.04})`),
      (r.lineWidth = 0.6 + i() * 0.8),
      r.beginPath(),
      r.moveTo(n, a),
      r.lineTo(n + Math.cos(s) * o, a + Math.sin(s) * o),
      r.stroke());
  }
  ur(r, e, t, 5, i);
  let s = `rgba(126,149,111,0.42)`,
    c = `rgba(92,128,91,0.76)`;
  for (let e of [0, 1]) {
    let t = e === 0 ? -1 : 1,
      n = t * 8.4;
    (r.save(),
      r.translate(a(0), o(n)),
      e === 1 && r.rotate(Math.PI),
      (r.fillStyle = s));
    for (let e of [-1.15, 0, 1.15])
      for (let t of [-1, 1]) {
        let n = t < 0 ? -T * 56 : 3.2 * 56,
          a = t < 0 ? -3.2 * 56 : T * 56;
        hr(r, n, e * 56 - 5.04, a - n, 10.08, i);
      }
    ((r.strokeStyle = c),
      (r.lineWidth = 8.96),
      r.beginPath(),
      r.arc(0, 0, 154, 0, Math.PI * 2),
      r.stroke(),
      (r.lineWidth = 3.36),
      r.beginPath(),
      r.arc(0, 0, 134.4, 0, Math.PI * 2),
      r.stroke(),
      (r.fillStyle = c));
    for (let e of [Math.PI * 0.5, Math.PI * 1.5])
      _r(r, Math.cos(e) * 2.75 * 56, Math.sin(e) * 2.75 * 56, 0.34 * 56);
    ((r.textAlign = `center`),
      (r.textBaseline = `middle`),
      (r.fillStyle = c),
      (r.font = `900 ${0.98 * 56}px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif`),
      r.fillText(`小岛冰球`, 0, -12.32),
      (r.font = `700 23.52px "Avenir Next","Segoe UI",Arial,sans-serif`),
      gr(r, `ISLAND · PUCK`, 0, 43.68, 0.1 * 56),
      r.restore(),
      (r.fillStyle = s));
    let l = t * be;
    for (let e of [-6, -3, 0, 3, 6])
      hr(r, a(e) - 3.36, o(l) - 0.55 * 56, 6.72, 1.1 * 56, i);
    r.fillStyle = c;
    let u = t * (D + 1.15);
    r.beginPath();
    let d = o(t * (D + 0.75)),
      f = o(u) + (e === 0 ? 0.25 : -0.25) * 56;
    (r.moveTo(a(0), d),
      r.lineTo(a(-0.42), f),
      r.lineTo(a(0.42), f),
      r.closePath(),
      r.fill());
  }
  r.fillStyle = `rgba(126,149,111,0.38)`;
  for (let t of [-1, 1]) hr(r, 0, o(t * (D + 0.18)) - 1.68, e, 3.36, i);
  let l = (e, t, n, i, a, o) => {
      let s =
        a === `l`
          ? r.createLinearGradient(e, 0, e + o, 0)
          : a === `r`
            ? r.createLinearGradient(e + n, 0, e + n - o, 0)
            : a === `t`
              ? r.createLinearGradient(0, t, 0, t + o)
              : r.createLinearGradient(0, t + i, 0, t + i - o);
      (s.addColorStop(0, `rgba(111,102,68,0.16)`),
        s.addColorStop(1, `rgba(111,102,68,0)`),
        (r.fillStyle = s),
        r.fillRect(e, t, n, i));
    },
    u = 0.7 * 56;
  return (
    l(0, 0, u, t, `l`, u),
    l(e - u, 0, u, t, `r`, u),
    l(0, 0, e, u, `t`, u),
    l(0, t - u, e, u, `b`, u),
    l(0, o(D) - u * 0.8, e, u * 0.8, `b`, u * 0.8),
    l(0, o(-D), e, u * 0.8, `t`, u * 0.8),
    lr(n)
  );
}
function hr(e, t, n, r, i, a) {
  e.fillRect(t, n, r, i);
  let o = e.fillStyle;
  e.fillStyle = `rgba(240,229,201,0.35)`;
  let s = Math.max(4, Math.round((r * i) / 140));
  for (let o = 0; o < s; o++)
    e.fillRect(t + a() * r, n + a() * i, 1 + a() * 2, 1 + a() * 2);
  e.fillStyle = o;
}
function gr(e, t, n, r, i) {
  let a = [...t],
    o = a.map((t) => e.measureText(t).width),
    s = n - (o.reduce((e, t) => e + t, 0) + i * (a.length - 1)) / 2;
  ((e.textAlign = `left`),
    a.forEach((t, n) => {
      (e.fillText(t, s, r), (s += o[n] + i));
    }),
    (e.textAlign = `center`));
}
function _r(e, t, n, r) {
  e.beginPath();
  for (let i = 0; i < 10; i++) {
    let a = -Math.PI / 2 + (i * Math.PI) / 5,
      o = i % 2 == 0 ? r : r * 0.45,
      s = t + Math.cos(a) * o,
      c = n + Math.sin(a) * o;
    i === 0 ? e.moveTo(s, c) : e.lineTo(s, c);
  }
  (e.closePath(), e.fill());
}
function vr(e, t) {
  const [canvas, ctx] = cr(256, 256);
  const coral = e === `maple`;
  dr(ctx, 256, 256, {
    base: coral ? `#ce8867` : `#51876a`,
    dark: coral ? `#b47c61` : `#477357`,
    light: coral ? `#f0c4a0` : `#a6c39c`,
    lines: 15, wave: 0.6, seed: t,
  });
  ctx.strokeStyle = coral ? `#f5d2a8` : `#bbd5ac`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(128, 128, 89, 0, Math.PI * 2);
  ctx.stroke();
  // A small carved leaf on each puck, readable even at phone sizes.
  ctx.fillStyle = coral ? `#f7ddba` : `#d6e4bc`;
  ctx.beginPath();
  ctx.moveTo(103, 145);
  ctx.bezierCurveTo(85, 107, 116, 82, 158, 94);
  ctx.bezierCurveTo(171, 134, 139, 163, 103, 145);
  ctx.fill();
  ctx.strokeStyle = coral ? `#c18a69` : `#628b69`;
  ctx.lineWidth = 5;
  ctx.lineCap = `round`;
  ctx.beginPath();
  ctx.moveTo(99, 158);
  ctx.lineTo(141, 112);
  ctx.stroke();
  return lr(canvas);
}
function yr() {
  let [e, t] = cr(128, 128),
    n = t.createRadialGradient(64, 64, 0, 64, 64, 64);
  (n.addColorStop(0, `rgba(0,0,0,0.62)`),
    n.addColorStop(0.45, `rgba(0,0,0,0.38)`),
    n.addColorStop(0.75, `rgba(0,0,0,0.12)`),
    n.addColorStop(1, `rgba(0,0,0,0)`),
    (t.fillStyle = n),
    t.fillRect(0, 0, 128, 128));
  let r = new de(e);
  return ((r.colorSpace = m), r);
}
function br() {
  let [e, t] = cr(128, 128),
    n = t.createRadialGradient(64, 64, 0, 64, 64, 64);
  (n.addColorStop(0, `rgba(255,214,120,0)`),
    n.addColorStop(0.6, `rgba(255,214,120,0)`),
    n.addColorStop(0.7, `rgba(255,226,150,0.95)`),
    n.addColorStop(0.8, `rgba(255,196,96,0.35)`),
    n.addColorStop(1, `rgba(255,190,90,0)`),
    (t.fillStyle = n),
    t.fillRect(0, 0, 128, 128));
  let r = new de(e);
  return ((r.colorSpace = m), r);
}
function xr() {
  const [canvas, ctx] = cr(512, 512);
  const random = sr(9);
  ctx.fillStyle = `#b4c99e`;
  ctx.fillRect(0, 0, 512, 512);
  // A quiet grass pattern, drawn once into a reused texture.
  for (let y = 18; y < 512; y += 45) {
    for (let x = 14; x < 512; x += 48) {
      const px = x + (random() - 0.5) * 20;
      const py = y + (random() - 0.5) * 18;
      const size = 3 + random() * 4;
      ctx.fillStyle = random() > 0.5 ? `#b7caa244` : `#e2e9c444`;
      ctx.beginPath();
      ctx.moveTo(px, py - size);
      ctx.lineTo(px - size * 0.8, py + size * 0.6);
      ctx.lineTo(px + size * 0.8, py + size * 0.6);
      ctx.closePath();
      ctx.fill();
    }
  }
  const texture = lr(canvas, !0);
  texture.repeat.set(5, 5);
  return texture;
}
var Y = 1.3,
  Sr = 1.25,
  Cr = 0.9,
  X = 0.62,
  wr = 0.34,
  Tr = 0.085,
  Z = be + xe * 0.7;
function Q(e, t, n = 0, r = new v()) {
  return r.set(e, n, -t);
}
function Er(e, t, n, r = 9, i = 5.5) {
  let a = e.getAttribute(`position`),
    o = e.getAttribute(`normal`),
    s = new Float32Array(a.count * 2),
    c = n.x * 0.37 + n.z * 0.11;
  for (let e = 0; e < a.count; e++) {
    let l = a.getX(e) + n.x,
      u = a.getY(e) + n.y,
      d = a.getZ(e) + n.z,
      f = Math.abs(o.getX(e)),
      p = Math.abs(o.getY(e)),
      m = Math.abs(o.getZ(e)),
      h,
      g;
    (p >= f && p >= m
      ? t === `z`
        ? ((h = d / r), (g = l / i))
        : ((h = l / r), (g = d / i))
      : f >= m
        ? ((h = d / r), (g = u / i))
        : ((h = l / r), (g = u / i)),
      (s[e * 2] = h + c),
      (s[e * 2 + 1] = g + c * 0.5));
  }
  e.setAttribute(`uv`, new b(s, 2));
}
function Dr(e, t, n) {
  let r = new le(e, {
    depth: Math.max(0.01, t - 2 * n),
    bevelEnabled: n > 0,
    bevelThickness: n,
    bevelSize: n,
    bevelOffset: -n,
    bevelSegments: 3,
    curveSegments: 24,
  });
  return (r.rotateX(-Math.PI / 2), r.translate(0, n, 0), r);
}
function Or(e) {
  let t = new ne(),
    n = fr(
      {
        base: `#cfa575`,
        dark: `#bb9464`,
        light: `#f3d6a6`,
        lines: 28,
        wave: 1.1,
        seed: 3,
        knots: 1,
      },
      1024,
      256,
    );
  n.anisotropy = e;
  let r = new he({
      map: n,
      roughness: 0.82,
      clearcoat: 0.08,
      clearcoatRoughness: 0.5,
    }),
    i = (e, n, i) => {
      Er(e, i, n);
      let a = new g(e, r);
      return (
        a.position.copy(n),
        (a.castShadow = !0),
        (a.receiveShadow = !0),
        t.add(a),
        a
      );
    },
    a = 2.15,
    o = 0.35 / 2,
    s = E * 2 + Y * 2;
  for (let e of [-1, 1])
    i(new fe(Y, a, s, 4, 0.14), new v(e * (T + Y / 2), o, 0), `z`);
  for (let e of [-1, 1])
    i(new fe(T * 2 + 0.02, a, Y, 4, 0.14), new v(0, o, e * (E + Y / 2)), `x`);
  let c = mr();
  c.anisotropy = e;
  let l = new g(
    new p(T * 2, E * 2),
    new _({ map: c, roughness: 0.92, metalness: 0 }),
  );
  ((l.rotation.x = -Math.PI / 2), (l.receiveShadow = !0), t.add(l));
  let d = ye + D;
  for (let e of [-1, 1]) {
    let t = new u(),
      n = T + 0.05;
    (e > 0
      ? (t.moveTo(d, -D),
        t.lineTo(n, -D),
        t.lineTo(n, D),
        t.lineTo(d, D),
        t.absarc(d, 0, D, Math.PI / 2, (Math.PI * 3) / 2, !1))
      : (t.moveTo(-d, D),
        t.lineTo(-n, D),
        t.lineTo(-n, -D),
        t.lineTo(-d, -D),
        t.absarc(-d, 0, D, -Math.PI / 2, Math.PI / 2, !1)),
      i(Dr(t, Sr, 0.06), new v(0, 0, 0), `x`));
  }
  i(new fe(d * 2 + 0.3, 0.27, D * 2, 3, 0.06), new v(0, 2.23 / 2, 0), `x`);
  let f = new _({ color: 13214298, metalness: 0.9, roughness: 0.32 }),
    m = new pe(0.13, 0.13, 0.34, 18);
  m.rotateZ(Math.PI / 2);
  let h = new ve(0.19, 18, 12);
  for (let e of [-1, 1])
    for (let n of [-1, 1]) {
      let r = new g(m, f);
      (r.position.copy(Q(n * (T - 0.12), e * Z, wr)),
        (r.castShadow = !0),
        t.add(r));
      let i = new g(h, f);
      (i.position.copy(Q(n * (T - 0.28), e * Z, wr)),
        i.scale.set(0.55, 1, 1),
        (i.castShadow = !0),
        t.add(i));
    }
  let y = new pe(0.16, 0.16, 0.05, 20);
  for (let e of [-1, 1])
    for (let n of [-1, 1]) {
      let r = new g(y, f);
      (r.position.copy(Q(e * (T + Y / 2), n * (E + Y / 2), 1.265)), t.add(r));
    }
  let b = xr();
  b.anisotropy = e;
  let x = new g(
    new p(160, 160),
    new _({ map: b, roughness: 0.95, metalness: 0 }),
  );
  return (
    (x.rotation.x = -Math.PI / 2),
    (x.position.y = -0.905),
    (x.receiveShadow = !0),
    t.add(x),
    t
  );
}
var kr = 30;
function Ar(e, t = new w()) {
  let n = new w(4177762),
    r = new w(16761370),
    i = new w(15745066);
  return e < 0.55
    ? t.copy(n).lerp(r, e / 0.55)
    : t.copy(r).lerp(i, (e - 0.55) / 0.45);
}
var jr = class {
    group = new ne();
    dashes;
    outline;
    dashMat;
    outlineMat;
    arrow;
    arrowOutline;
    arrowMat;
    m = new ge();
    q = new r();
    s = new v();
    p = new v();
    c = new w();
    up = new v(0, 1, 0);
    constructor() {
      let e = (e, t) => {
        let n = t / 2,
          r = new u();
        return (
          r.moveTo(-e / 2 + n, -n),
          r.lineTo(e / 2 - n, -n),
          r.absarc(e / 2 - n, 0, n, -Math.PI / 2, Math.PI / 2, !1),
          r.lineTo(-e / 2 + n, n),
          r.absarc(-e / 2 + n, 0, n, Math.PI / 2, (Math.PI * 3) / 2, !1),
          new h(r, 6).rotateX(-Math.PI / 2)
        );
      };
      ((this.dashMat = new a({
        transparent: !0,
        depthWrite: !1,
        opacity: 0.95,
      })),
        (this.outlineMat = new a({
          color: 1707784,
          transparent: !0,
          depthWrite: !1,
          opacity: 0.4,
        })),
        (this.outline = new me(e(0.62, 0.32), this.outlineMat, kr)),
        (this.dashes = new me(e(0.5, 0.2), this.dashMat, kr)),
        (this.dashes.instanceColor = new y(new Float32Array(90), 3)));
      for (let e of [this.outline, this.dashes]) e.frustumCulled = !1;
      ((this.outline.renderOrder = 3), (this.dashes.renderOrder = 4));
      let t = (e) => {
        let t = new u();
        return (
          t.moveTo(0.66 * e, 0),
          t.lineTo(-0.34 * e, 0.46 * e),
          t.lineTo(-0.14 * e, 0),
          t.lineTo(-0.34 * e, -0.46 * e),
          t.closePath(),
          new h(t).rotateX(-Math.PI / 2)
        );
      };
      ((this.arrowMat = new a({
        transparent: !0,
        depthWrite: !1,
        opacity: 0.95,
      })),
        (this.arrow = new g(t(1), this.arrowMat)),
        (this.arrowOutline = new g(t(1.28), this.outlineMat)),
        (this.arrow.renderOrder = 4),
        (this.arrowOutline.renderOrder = 3),
        this.group.add(
          this.outline,
          this.dashes,
          this.arrowOutline,
          this.arrow,
        ),
        (this.group.visible = !1));
    }
    update(e, t) {
      if (!e || e.power <= 0.001) {
        this.group.visible = !1;
        return;
      }
      this.group.visible = !0;
      let n = 2.6 + e.power * 12.5,
        r = 0.66,
        i = (t * 2.4) % r,
        a = Ar(e.power, this.c.clone());
      ((this.dashMat.opacity = e.mine ? 0.95 : 0.55),
        (this.outlineMat.opacity = e.mine ? 0.42 : 0.22),
        (this.arrowMat.opacity = this.dashMat.opacity));
      let o = Math.atan2(e.dirY, e.dirX);
      this.q.setFromAxisAngle(this.up, o);
      let s = 0;
      for (let t = 0; t < kr; t++) {
        let o = 1.3 + i + t * r;
        if (o > n) break;
        let c = o / n;
        Q(e.cx + e.dirX * o, e.cy + e.dirY * o, 0.03, this.p);
        let l = 1.05 - 0.45 * c;
        (this.s.set(l, 1, l),
          this.m.compose(this.p, this.q, this.s),
          this.dashes.setMatrixAt(s, this.m),
          (this.p.y = 0.025),
          this.m.compose(this.p, this.q, this.s),
          this.outline.setMatrixAt(s, this.m),
          this.dashes.setColorAt(s, a),
          s++);
      }
      ((this.dashes.count = s),
        (this.outline.count = s),
        (this.dashes.instanceMatrix.needsUpdate = !0),
        (this.outline.instanceMatrix.needsUpdate = !0),
        this.dashes.instanceColor &&
          (this.dashes.instanceColor.needsUpdate = !0),
        Q(
          e.cx + e.dirX * (n + 0.35),
          e.cy + e.dirY * (n + 0.35),
          0.032,
          this.arrow.position,
        ),
        this.arrowOutline.position.copy(this.arrow.position).setY(0.026),
        this.arrow.quaternion.copy(this.q),
        this.arrowOutline.quaternion.copy(this.q));
      let c = 0.85 + e.power * 0.45;
      (this.arrow.scale.set(c, 1, c),
        this.arrowOutline.scale.set(c, 1, c),
        this.arrowMat.color.copy(a));
    }
  },
  Mr = 80,
  $ = 7,
  Nr = 1 + Tr * 0.9,
  Pr = T * 2;
function Fr(e) {
  e.sort((e, t) => e.x - t.x || e.y - t.y);
  let t = [];
  for (let n of e) {
    for (; t.length >= 2;) {
      let e = t[t.length - 2],
        r = t[t.length - 1];
      if ((r.x - e.x) * (n.y - e.y) - (r.y - e.y) * (n.x - e.x) <= 0) t.pop();
      else break;
    }
    t.push(n);
  }
  return t;
}
var Ir = class {
  side;
  mesh;
  geo = new ce();
  pos;
  nor;
  f;
  lineLocal = -Z;
  vibs = [];
  path = [];
  lastKey = ``;
  tube = {
    center: new v(), tangent: new v(), normal: new v(), up: new v(0, 1, 0),
    point: new v(), radial: new v(), prev: new v(), next: new v(),
  };
  section = Array.from({ length: $ }, (_, e) => {
    let t = (e / $) * Math.PI * 2;
    return { cos: Math.cos(t), sin: Math.sin(t) };
  });
  constructor(e, t) {
    ((this.side = e),
      (this.f = e === 0 ? 1 : -1),
      (this.pos = new Float32Array(1680)),
      (this.nor = new Float32Array(1680)));
    let n = [];
    for (let e = 0; e < 79; e++)
      for (let t = 0; t < $; t++) {
        let r = e * $ + t,
          i = e * $ + ((t + 1) % $),
          a = (e + 1) * $ + t,
          o = (e + 1) * $ + ((t + 1) % $);
        n.push(r, a, i, i, a, o);
      }
    (this.geo.setIndex(n),
      this.geo.setAttribute(`position`, new b(this.pos, 3).setUsage(C)),
      this.geo.setAttribute(`normal`, new b(this.nor, 3).setUsage(C)),
      (this.mesh = new g(this.geo, t)),
      (this.mesh.castShadow = !0),
      (this.mesh.frustumCulled = !1),
      this.rebuild([]));
  }
  toLocal(e, t) {
    return { x: this.f * e, y: this.f * t };
  }
  pluck(e, t) {
    if (t < 0.04) return;
    let n = this.f * e;
    this.vibs.push({
      cx: n,
      amp: 0.08 + t * 0.8,
      t: 0,
      freq: 9 + t * 4,
      decay: 0.3,
    });
  }
  update(e, t) {
    if (!t.length && !this.vibs.length && this.lastKey === ``) return;
    for (let t of this.vibs) t.t += e;
    this.vibs = this.vibs.filter((e) => Math.exp(-e.t / e.decay) > 0.015);
    let n = T - 0.12 - Nr,
      r = t
        .map((e) => this.toLocal(e.x, e.y))
        .filter((e) => e.y - Nr < this.lineLocal)
        .map((e) => ({ x: Math.max(-n, Math.min(n, e.x)), y: e.y })),
      i = r.map((e) => `${e.x.toFixed(3)},${e.y.toFixed(3)}`).join(`|`);
    (this.vibs.length || i !== this.lastKey) &&
      ((this.lastKey = i), this.rebuild(r));
  }
  rebuild(e) {
    let t = T - 0.12,
      n = this.lineLocal,
      r;
    if (e.length) {
      let i = [
        { x: -t, y: n },
        { x: t, y: n },
      ];
      for (let t of e)
        for (let e = 0; e < 40; e++) {
          let n = (e / 40) * Math.PI * 2;
          i.push({ x: t.x + Math.cos(n) * Nr, y: t.y + Math.sin(n) * Nr });
        }
      r = Fr(i).filter((e) => e.x >= -t - 1e-6 && e.x <= t + 1e-6);
    } else {
      r = [];
      for (let e = 0; e < Mr; e++) {
        let i = -t + ((2 * t) / 79) * e,
          a = 0;
        for (let e of this.vibs) {
          let n = i < e.cx ? (i + t) / (e.cx + t) : (t - i) / (t - e.cx);
          a +=
            e.amp *
            Math.exp(-e.t / e.decay) *
            Math.cos(2 * Math.PI * e.freq * e.t) *
            Math.max(0, n);
        }
        r.push({ x: i, y: n + a });
      }
    }
    ((this.path = Lr(r, Mr)), this.writeTube());
  }
  writeTube() {
    let e = this.path,
      t = 0;
    for (let n = 1; n < e.length; n++)
      t += Math.hypot(e[n].x - e[n - 1].x, e[n].y - e[n - 1].y);
    let n =
        Tr * Math.max(0.62, Math.min(1, Math.sqrt(Pr / Math.max(t, 0.001)))),
      { center: r, tangent: i, normal: a, up: o, point: s, radial: c,
        prev: f, next: p } = this.tube;
    for (let t = 0; t < Mr; t++) {
      let l = e[t],
        u = e[Math.max(0, t - 1)],
        d = e[Math.min(79, t + 1)];
      Q(this.f * l.x, this.f * l.y, wr, r);
      Q(this.f * u.x, this.f * u.y, wr, f);
      Q(this.f * d.x, this.f * d.y, wr, p);
      (i.subVectors(p, f).normalize(), a.crossVectors(i, o).normalize());
      for (let e = 0; e < $; e++) {
        let i = this.section[e];
        (c.copy(o).multiplyScalar(i.cos).addScaledVector(a, i.sin),
          s.copy(r).addScaledVector(c, n));
        let l = (t * $ + e) * 3;
        ((this.pos[l] = s.x),
          (this.pos[l + 1] = s.y),
          (this.pos[l + 2] = s.z),
          (this.nor[l] = c.x),
          (this.nor[l + 1] = c.y),
          (this.nor[l + 2] = c.z));
      }
    }
    ((this.geo.attributes.position.needsUpdate = !0),
      (this.geo.attributes.normal.needsUpdate = !0));
  }
};
function Lr(e, t) {
  if (e.length < 2) return Array.from({ length: t }, () => ({ ...e[0] }));
  let n = [0];
  for (let t = 1; t < e.length; t++)
    n.push(n[t - 1] + Math.hypot(e[t].x - e[t - 1].x, e[t].y - e[t - 1].y));
  let r = n[n.length - 1],
    i = [],
    a = 1;
  for (let o = 0; o < t; o++) {
    let s = (o / (t - 1)) * r;
    for (; a < e.length - 1 && n[a] < s;) a++;
    let c = n[a - 1],
      l = n[a],
      u = l > c ? (s - c) / (l - c) : 0;
    i.push({
      x: e[a - 1].x + (e[a].x - e[a - 1].x) * u,
      y: e[a - 1].y + (e[a].y - e[a - 1].y) * u,
    });
  }
  return i;
}
var Rr = class {
    points;
    max;
    pos;
    col;
    alpha;
    size;
    vel;
    life;
    maxLife;
    base;
    grav;
    geo = new ce();
    next = 0;
    alive = 0;
    constructor(e = 360) {
      ((this.max = e),
        (this.pos = new Float32Array(e * 3)),
        (this.col = new Float32Array(e * 3)),
        (this.alpha = new Float32Array(e)),
        (this.size = new Float32Array(e)),
        (this.vel = new Float32Array(e * 3)),
        (this.life = new Float32Array(e)),
        (this.maxLife = new Float32Array(e)),
        (this.base = new Float32Array(e)),
        (this.grav = new Float32Array(e)));
      let t = (e, t) => new b(e, t).setUsage(C);
      (this.geo.setAttribute(`position`, t(this.pos, 3)),
        this.geo.setAttribute(`aColor`, t(this.col, 3)),
        this.geo.setAttribute(`aAlpha`, t(this.alpha, 1)),
        this.geo.setAttribute(`aSize`, t(this.size, 1)));
      let n = new l({
        uniforms: { uScale: { value: 420 } },
        vertexShader: `
        attribute vec3 aColor; attribute float aAlpha; attribute float aSize;
        uniform float uScale; varying vec3 vColor; varying float vAlpha;
        void main() {
          vColor = aColor; vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / max(1.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
        fragmentShader: `
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.15, d) * vAlpha;
          if (a < 0.003) discard;
          gl_FragColor = vec4(vColor * a, a);
        }`,
        transparent: !0,
        depthWrite: !1,
        blending: 2,
      });
      ((this.points = new ae(this.geo, n)),
        (this.points.frustumCulled = !1),
        (this.points.renderOrder = 6));
    }
    setScale(e) {
      this.points.material.uniforms.uScale.value = e;
    }
    emit(e, t, n, r, i) {
      let a = new w(i.color),
        o = Q(e, t, n);
      for (let e = 0; e < r; e++) {
        let e = this.next;
        this.next = (this.next + 1) % this.max;
        let t = Math.random() * Math.PI * 2,
          n = i.speed * (0.35 + Math.random() * 0.65),
          r = (i.spread ?? 0) * Math.sqrt(Math.random());
        ((this.pos[e * 3] = o.x + Math.cos(t) * r),
          (this.pos[e * 3 + 1] = o.y),
          (this.pos[e * 3 + 2] = o.z + Math.sin(t) * r),
          (this.vel[e * 3] = Math.cos(t) * n),
          (this.vel[e * 3 + 1] = i.up * (0.5 + Math.random() * 0.7)),
          (this.vel[e * 3 + 2] = Math.sin(t) * n));
        let s = 0.85 + Math.random() * 0.3;
        ((this.col[e * 3] = a.r * s),
          (this.col[e * 3 + 1] = a.g * s),
          (this.col[e * 3 + 2] = a.b * s));
        let c = i.life * (0.6 + Math.random() * 0.6);
        ((this.life[e] = c),
          (this.maxLife[e] = c),
          (this.base[e] = i.size * (0.6 + Math.random() * 0.8)),
          (this.grav[e] = i.gravity ?? 9));
      }
      this.alive = this.max;
    }
    update(e) {
      if (this.alive === 0) return;
      let t = 0;
      for (let n = 0; n < this.max; n++) {
        if (this.life[n] <= 0) {
          this.alpha[n] !== 0 && ((this.alpha[n] = 0), (this.size[n] = 0));
          continue;
        }
        (t++, (this.life[n] -= e));
        let r = Math.max(0, this.life[n] / this.maxLife[n]);
        ((this.vel[n * 3 + 1] -= this.grav[n] * e),
          (this.pos[n * 3] += this.vel[n * 3] * e),
          (this.pos[n * 3 + 1] = Math.max(
            0.03,
            this.pos[n * 3 + 1] + this.vel[n * 3 + 1] * e,
          )),
          (this.pos[n * 3 + 2] += this.vel[n * 3 + 2] * e),
          this.pos[n * 3 + 1] <= 0.031 &&
            ((this.vel[n * 3] *= 0.8),
            (this.vel[n * 3 + 2] *= 0.8),
            (this.vel[n * 3 + 1] *= -0.3)),
          (this.alpha[n] = r * r),
          (this.size[n] = this.base[n] * (0.5 + 0.5 * r)));
      }
      this.alive = t;
      for (let e of [`position`, `aColor`, `aAlpha`, `aSize`])
        this.geo.attributes[e].needsUpdate = !0;
    }
  },
  zr = class {
    group = new ne();
    rings = [];
    constructor() {
      let e = new f(0.82, 1, 64).rotateX(-Math.PI / 2);
      for (let t = 0; t < 6; t++) {
        let t = new a({
            transparent: !0,
            depthWrite: !1,
            opacity: 0,
            blending: 2,
          }),
          n = new g(e, t);
        ((n.visible = !1),
          (n.renderOrder = 5),
          this.group.add(n),
          this.rings.push({ mesh: n, mat: t, t: 1, dur: 0.6, max: 4 }));
      }
    }
    spawn(e, t, n, r = 4, i = 0.65) {
      let a = this.rings.reduce((e, t) => (t.t / t.dur > e.t / e.dur ? t : e));
      (Q(e, t, 0.045, a.mesh.position),
        a.mat.color.set(n),
        (a.t = 0),
        (a.dur = i),
        (a.max = r),
        (a.mesh.visible = !0));
    }
    update(e) {
      for (let t of this.rings) {
        if (!t.mesh.visible) continue;
        t.t += e;
        let n = t.t / t.dur;
        if (n >= 1) {
          t.mesh.visible = !1;
          continue;
        }
        let r = 0.6 + (1 - (1 - n) ** 3) * t.max;
        (t.mesh.scale.set(r, 1, r), (t.mat.opacity = (1 - n) * 0.9));
      }
    }
  },
  Br = class e {
    mesh;
    hist = new Map();
    alpha;
    tint;
    m = new ge();
    p = new v();
    q = new r();
    s = new v();
    time = 0;
    static PER = 7;
    constructor(t = 12) {
      let n = t * e.PER,
        r = new S(0.92, 32).rotateX(-Math.PI / 2);
      ((this.alpha = new Float32Array(n)),
        (this.tint = new Float32Array(n * 3)),
        r.setAttribute(`aAlpha`, new y(this.alpha, 1).setUsage(C)),
        r.setAttribute(`aTint`, new y(this.tint, 3).setUsage(C)));
      let i = new l({
        vertexShader: `
        attribute float aAlpha; attribute vec3 aTint; varying float vAlpha; varying vec3 vTint; varying vec2 vUv;
        void main() { vAlpha = aAlpha; vTint = aTint; vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
        varying float vAlpha; varying vec3 vTint; varying vec2 vUv;
        void main() { float d = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.55, d) * vAlpha;
          if (a < 0.004) discard; gl_FragColor = vec4(vTint, a); }`,
        transparent: !0,
        depthWrite: !1,
      });
      ((this.mesh = new me(r, i, n)),
        (this.mesh.frustumCulled = !1),
        (this.mesh.renderOrder = 1),
        (this.mesh.count = 0));
    }
    update(t, n) {
      this.time += t;
      let r = 0;
      for (let t of n) {
        let n = this.hist.get(t.id);
        if (
          (n || this.hist.set(t.id, (n = [])),
          n.unshift({ x: t.x, y: t.y, t: this.time }),
          n.length > 9 && (n.length = 9),
          t.lift > 0.05 || n.length < 3)
        )
          continue;
        let i = n[0],
          a = n[2],
          o = Math.hypot(i.x - a.x, i.y - a.y) / Math.max(0.001, i.t - a.t);
        if (o < 11) continue;
        let s = Math.min(1, (o - 11) / 18),
          c = t.color === 0;
        for (let t = 1; t <= e.PER && t < n.length; t++) {
          let i = n[t];
          if (this.time - i.t > 0.12) break;
          let a = 1 - t / (e.PER + 1);
          Q(i.x, i.y, 0.02 + t * 0.001, this.p);
          let o = 0.98 - t * 0.04;
          (this.s.set(o, 1, o),
            this.m.compose(this.p, this.q, this.s),
            this.mesh.setMatrixAt(r, this.m),
            (this.alpha[r] = 0.32 * a * s),
            (this.tint[r * 3] = c ? 0.12 : 0.98),
            (this.tint[r * 3 + 1] = c ? 0.1 : 0.88),
            (this.tint[r * 3 + 2] = c ? 0.09 : 0.68),
            r++);
        }
      }
      ((this.mesh.count = r),
        (this.mesh.instanceMatrix.needsUpdate = !0),
        (this.mesh.geometry.attributes.aAlpha.needsUpdate = !0),
        (this.mesh.geometry.attributes.aTint.needsUpdate = !0));
    }
  };
function Vr() {
  let e = [],
    t = 0.12,
    n = X;
  (e.push(new i(0, 0)), e.push(new i(0.88, 0)));
  for (let n = 1; n <= 6; n++) {
    let r = (n / 6) * (Math.PI / 2);
    e.push(new i(0.88 + Math.sin(r) * t, t - Math.cos(r) * t));
  }
  e.push(new i(1, n - t));
  for (let r = 1; r <= 6; r++) {
    let a = (r / 6) * (Math.PI / 2);
    e.push(new i(0.88 + Math.cos(a) * t, n - t + Math.sin(a) * t));
  }
  return (e.push(new i(0.86, n)), new _e(e, 56));
}
var Hr = class {
    group = new ne();
    views = new Map();
    sideGeo = Vr();
    topGeo = new S(0.87, 56).rotateX(-Math.PI / 2);
    blobGeo = new p(2.7, 2.7).rotateX(-Math.PI / 2);
    ringGeo = new p(3.1, 3.1).rotateX(-Math.PI / 2);
    blobTex = yr();
    ringTex = br();
    sideMats;
    topMats;
    tmp = new v();
    constructor(e) {
      let t = fr(
          {
            base: `#548368`,
            dark: `#3f6b53`,
            light: `#87ab8b`,
            lines: 30,
            wave: 0.5,
            seed: 21,
          },
          512,
          128,
        ),
        n = fr(
          {
            base: `#c79072`,
            dark: `#a76f54`,
            light: `#e7ba97`,
            lines: 30,
            wave: 0.5,
            seed: 22,
          },
          512,
          128,
        );
      for (let r of [t, n]) ((r.anisotropy = e), r.repeat.set(3, 1));
      ((this.sideMats = [
        new he({
          map: t,
          roughness: 0.85,
          clearcoat: 0.08,
          clearcoatRoughness: 0.22,
        }),
        new he({
          map: n,
          roughness: 0.85,
          clearcoat: 0.08,
          clearcoatRoughness: 0.3,
        }),
      ]),
        (this.topMats = [0, 1].map((t) =>
          [0, 1, 2].map((n) => {
            let r = vr(t === 0 ? `ebony` : `maple`, 100 + t * 10 + n);
            return (
              (r.anisotropy = e),
              new he({
                map: r,
                roughness: 0.86,
                clearcoat: 0.08,
                clearcoatRoughness: 0.22,
              })
            );
          }),
        )));
    }
    create(e, t) {
      let n = new ne(),
        r = t === 0 ? 0 : 1,
        i = new g(this.sideGeo, this.sideMats[r]);
      ((i.castShadow = !0), (i.receiveShadow = !0));
      let o = new g(this.topGeo, this.topMats[r][e % 3]);
      ((o.position.y = X + 0.001),
        (o.receiveShadow = !0),
        n.add(i, o),
        this.group.add(n));
      let s = new a({
          map: this.blobTex,
          transparent: !0,
          depthWrite: !1,
          opacity: 0.85,
        }),
        c = new g(this.blobGeo, s);
      ((c.renderOrder = 1), this.group.add(c));
      let l = new a({
          map: this.ringTex,
          transparent: !0,
          depthWrite: !1,
          blending: 2,
          opacity: 0,
        }),
        u = new g(this.ringGeo, l);
      ((u.renderOrder = 2), (u.visible = !1), this.group.add(u));
      let d = { root: n, shadow: c, ring: u, ringMat: l, shadowMat: s };
      return (this.views.set(e, d), d);
    }
    update(e, t, n, r) {
      let i = new Set(),
        a = 0.55 + 0.45 * Math.sin(r * 4.2),
        shadowChanged = !1;
      for (let r of e) {
        i.add(r.id);
        let e = this.views.get(r.id);
        if (!e) {
          e = this.create(r.id, r.color);
          shadowChanged = !0;
        }
        shadowChanged ||= !e.root.visible ||
          e.root.position.x !== r.x || e.root.position.y !== r.lift ||
          e.root.position.z !== -r.y || e.root.rotation.y !== r.a;
        ((e.root.visible = !0),
          Q(r.x, r.y, r.lift, e.root.position),
          (e.root.rotation.y = r.a));
        let o = Math.min(1, r.lift / 1.2);
        Q(r.x + o * 0.35, r.y - o * 0.2, 0.012, e.shadow.position);
        let s = 1 + o * 0.45;
        (e.shadow.scale.set(s, 1, s),
          (e.shadowMat.opacity = 0.85 * (1 - o * 0.55)),
          (e.shadow.visible = !0));
        let c = n === r.id ? 0.95 : t?.has(r.id) ? 0.28 + 0.32 * a : 0;
        if (((e.ring.visible = c > 0.01), e.ring.visible)) {
          (Q(r.x, r.y, 0.016, e.ring.position), (e.ringMat.opacity = c));
          let t = n === r.id ? 1.05 : 1;
          e.ring.scale.set(t, 1, t);
        }
      }
      for (let [e, t] of this.views)
        i.has(e) ||
          ((shadowChanged ||= t.root.visible),
          (t.root.visible = !1),
          (t.shadow.visible = !1),
          (t.ring.visible = !1));
      return shadowChanged;
    }
    topOf(e, t) {
      return Q(e, t, X, this.tmp);
    }
  },
  Ur = 1 + Tr * 0.9,
  Wr = class {
    renderer;
    scene = new c();
    camera = new s(30, 1, 0.5, 400);
    onPass = null;
    pucks;
    bands;
    guides = [new jr(), new jr()];
    sparks = new Rr();
    rings = new zr();
    trails = new Br();
    raycaster = new ie();
    pickPlane = new o(new v(0, 1, 0), -X / 2);
    corners = [];
    azimuth = 0;
    azTarget = 0;
    viewSide = 0;
    margins = { top: 72, bottom: 104, side: 10 };
    width = 1;
    height = 1;
    needsFit = !0;
    time = 0;
    drawBuf = [];
    pressPrev = [new Map(), new Map()];
    lastSide = new Map();
    shakes = new Map();
    v3 = new v();
    effectsOn = !0;
    constructor(e) {
      let t = new re({
        canvas: e,
        antialias: !0,
        powerPreference: `high-performance`,
      });
      ((t.shadowMap.enabled = !0),
        (t.shadowMap.autoUpdate = !1),
        (t.shadowMap.needsUpdate = !0),
        (t.shadowMap.type = 1),
        (t.toneMapping = 4),
        (t.toneMappingExposure = 0.95),
        (t.outputColorSpace = m),
        (this.renderer = t));
      e.addEventListener(`webglcontextrestored`, () => {
        this.renderer.shadowMap.needsUpdate = !0;
      });
      let n = Math.min(8, t.capabilities.getMaxAnisotropy());
      this.effectsOn = !window.matchMedia?.(`(prefers-reduced-motion: reduce)`)
        .matches;
      let r = this.scene;
      ((r.background = new w(0xdce6c7)), (r.fog = new oe(0xdce6c7, 70, 150)));
      let i = new ue(t);
      ((r.environment = i.fromScene(new se(), 0.04).texture),
        (r.environmentIntensity = 0.35),
        i.dispose(),
        r.add(new te(0xfff9e8, 0xa8bc91, 0.95)));
      let a = new ee(0xfff6df, 1.8);
      (a.position.set(-11, 34, 5), (a.castShadow = !0));
      let o = Math.min(window.innerWidth, window.innerHeight) < 600;
      a.shadow.mapSize.set(o ? 1024 : 1536, o ? 1024 : 1536);
      let s = a.shadow.camera;
      ((s.left = -15),
        (s.right = 15),
        (s.top = 20),
        (s.bottom = -20),
        (s.near = 5),
        (s.far = 70),
        (a.shadow.radius = 5),
        (a.shadow.bias = -4e-4),
        (a.shadow.normalBias = 0.025),
        r.add(a, a.target));
      let c = new ee(16769730, 0.45);
      (c.position.set(14, 16, -8),
        r.add(c),
        r.add(Or(n)),
        (this.pucks = new Hr(n)),
        r.add(this.pucks.group));
      let l = new _({ color: 0x768661, roughness: 0.9, metalness: 0 });
      ((this.bands = [new Ir(0, l), new Ir(1, l)]),
        r.add(
          this.bands[0].mesh,
          this.bands[1].mesh,
          this.guides[0].group,
          this.guides[1].group,
        ),
        r.add(this.trails.mesh, this.rings.group, this.sparks.points));
      let u = T + Y,
        d = E + Y;
      for (let e of [-u, u])
        for (let t of [-d, d])
          for (let n of [-Cr, Sr]) this.corners.push(new v(e, n, t));
    }
    setMargins(e) {
      ((this.margins = e), (this.needsFit = !0));
    }
    resize(e, t) {
      ((this.width = Math.max(1, e)),
        (this.height = Math.max(1, t)));
      // 限制 WebGL 像素量；DOM 界面仍使用设备的原生分辨率。
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        Math.min(this.width, this.height) < 600 ? 1.5 : 2,
        Math.sqrt(2500000 / (this.width * this.height)),
      );
      if (this.renderer.getPixelRatio() !== ratio) this.renderer.setPixelRatio(ratio);
      (this.renderer.setSize(this.width, this.height, !1),
        this.sparks.setScale(
          this.height * this.renderer.getPixelRatio() * 0.55,
        ),
        (this.needsFit = !0));
    }
    setViewSide(e, t = !0) {
      ((this.viewSide = e),
        (this.azTarget = e === 0 ? 0 : Math.PI),
        t || (this.azimuth = this.azTarget),
        (this.needsFit = !0));
    }
    resetEffects() {
      (this.lastSide.clear(), (this.pressPrev = [new Map(), new Map()]));
    }
    pick(e, t, n) {
      let r = new i(
        ((e - n.left) / n.width) * 2 - 1,
        -((t - n.top) / n.height) * 2 + 1,
      );
      this.raycaster.setFromCamera(r, this.camera);
      let a = this.raycaster.ray.intersectPlane(this.pickPlane, this.v3);
      return a ? { x: a.x, y: -a.z } : null;
    }
    project(e, t, n = X / 2) {
      let r = Q(e, t, n, this.v3).project(this.camera);
      return {
        x: ((r.x + 1) / 2) * this.width,
        y: ((1 - r.y) / 2) * this.height,
      };
    }
    impact(e, t, n, r) {
      if (this.effectsOn) {
        if (e === `puck` && r > 6) {
          let e = Math.min(14, Math.round(r / 2.5));
          if (r > 13) this.rings.spawn(t, n, 16773572, 1.2 + Math.min(1, r / MAX_SHOT_SPEED) * 0.7, 0.16);
          this.sparks.emit(t, n, X * 0.5, e, {
            color: 16769184,
            speed: 2 + r * 0.12,
            up: 1.4,
            life: 0.18,
            size: 0.18,
            gravity: 10,
          });
        } else if ((e === `wall` || e === `divider`) && r > 9) {
          let e = Math.min(10, Math.round(r / 3));
          this.sparks.emit(t, n, 0.25, e, {
            color: 14268554,
            speed: 1.6,
            up: 1.2,
            life: 0.22,
            size: 0.2,
            gravity: 8,
            spread: 0.5,
          });
        }
      }
    }
    shake(e) {
      this.shakes.set(e, 0.32);
    }
    fit() {
      let e = this.width,
        t = this.height,
        n = this.camera;
      ((n.aspect = e / t), n.clearViewOffset());
      let r = x.clamp((1.25 - n.aspect) / 0.75, 0, 1),
        i = x.degToRad(x.lerp(52, 63, r)),
        a = new v(
          Math.sin(this.azimuth) * Math.cos(i),
          Math.sin(i),
          Math.cos(this.azimuth) * Math.cos(i),
        ),
        o = this.margins,
        s = 1 - (2 * o.side) / e,
        c = -1 + (2 * o.bottom) / t,
        l = 1 - (2 * o.top) / t,
        u = () => {
          let e = 1 / 0,
            t = -1 / 0,
            r = 1 / 0,
            i = -1 / 0;
          for (let a of this.corners) {
            let o = this.v3.copy(a).project(n);
            ((e = Math.min(e, o.x)),
              (t = Math.max(t, o.x)),
              (r = Math.min(r, o.y)),
              (i = Math.max(i, o.y)));
          }
          return { x0: e, x1: t, y0: r, y1: i };
        },
        d = 70;
      for (let e = 0; e < 7; e++) {
        (n.position.copy(a).multiplyScalar(d),
          n.lookAt(0, 0, 0),
          n.updateProjectionMatrix(),
          n.updateMatrixWorld());
        let e = u(),
          t = Math.max(
            (e.x1 - e.x0) / (2 * s),
            (e.y1 - e.y0) / Math.max(0.2, l - c),
          );
        d *= t;
      }
      (n.position.copy(a).multiplyScalar(d),
        n.lookAt(0, 0, 0),
        n.updateProjectionMatrix(),
        n.updateMatrixWorld());
      let f = u(),
        p = (((f.x0 + f.x1) / 2) * e) / 2,
        m = (-((f.y0 + f.y1) / 2 - (c + l) / 2) * t) / 2;
      (n.setViewOffset(e, t, p, m, e, t), n.updateProjectionMatrix());
    }
    frame(e, t) {
      ((this.time += e),
        Math.abs(this.azTarget - this.azimuth) > 1e-4 &&
          ((this.azimuth +=
            (this.azTarget - this.azimuth) * Math.min(1, e * 3.2)),
          Math.abs(this.azTarget - this.azimuth) < 0.001 &&
            (this.azimuth = this.azTarget),
          (this.needsFit = !0)),
        (this.needsFit &&= (this.fit(), !1)));
      let n = this.drawBuf;
      n.length = t.pucks.length;
      let r = t.helds ?? [];
      for (let i = 0; i < t.pucks.length; i++) {
        let a = t.pucks[i],
          o = n[i];
        ((o ||= n[i] = { id: 0, x: 0, y: 0, a: 0, color: 0, lift: 0 }),
          (o.id = a.id),
          (o.a = a.a),
          (o.color = a.color));
        let s = r.find((e) => e.id === a.id);
        s
          ? ((o.x = s.x), (o.y = s.y), (o.lift = s.lift))
          : ((o.x = a.x), (o.y = a.y), (o.lift = 0));
        let c = this.shakes.get(a.id);
        if (c !== void 0) {
          o.x += Math.sin(this.time * 70) * 0.14 * (c / 0.32);
          let t = c - e;
          t <= 0 ? this.shakes.delete(a.id) : this.shakes.set(a.id, t);
        }
        let l = o.y < 0 ? 0 : 1,
          u = this.lastSide.get(a.id);
        if (u !== void 0 && u !== l && o.lift < 0.05) {
          let e = u === this.viewSide;
          (this.effectsOn &&
            (this.rings.spawn(o.x, 0, e ? 16763989 : 16738890, 4.2, 0.7),
            this.rings.spawn(o.x, 0, e ? 16773572 : 16756890, 2.4, 0.45),
            this.sparks.emit(o.x, 0, 0.6, 22, {
              color: e ? 16765806 : 16743004,
              speed: 3.6,
              up: 4.2,
              life: 0.75,
              size: 0.26,
              gravity: 9,
              spread: 0.6,
            })),
            this.onPass?.(u, o.x, o.id));
        }
        this.lastSide.set(a.id, l);
      }
      let shadowChanged = this.pucks.update(n, t.highlight ?? null, t.selected ?? null, this.time);
      for (let r of [0, 1]) {
        let i = r === 0 ? -Z : Z,
          a = r === 0 ? 1 : -1,
          o = [],
          s = new Map();
        for (let e of n)
          e.lift > 0.05 ||
            ((t.pressing?.some((t) => t.side === r && t.id === e.id) ||
              a * (e.y - i) < Ur) &&
              (o.push(e), s.set(e.id, { x: e.x, y: e.y })));
        for (let [t, o] of this.pressPrev[r]) {
          if (s.has(t)) continue;
          let c = n.find((e) => e.id === t);
          if (!c || c.lift > 0.05 || a * (c.y - i) < Ur) continue;
          let l = Math.hypot(c.x - o.x, c.y - o.y) / Math.max(e, 1 / 240);
          this.bands[r].pluck(o.x, Math.min(1, l / MAX_SHOT_SPEED));
        }
        const version = this.bands[r].geo.attributes.position.version;
        ((this.pressPrev[r] = s), this.bands[r].update(e, o));
        shadowChanged ||= this.bands[r].geo.attributes.position.version !== version;
      }
      this.renderer.shadowMap.needsUpdate ||= shadowChanged;
      let i = t.aims ?? [];
      (this.guides[0].update(i[0] ?? null, this.time),
        this.guides[1].update(i[1] ?? null, this.time),
        this.effectsOn && this.trails.update(e, n),
        this.rings.update(e),
        this.sparks.update(e),
        this.renderer.render(this.scene, this.camera));
    }
  };
function Gr(e) {
  let t = document.querySelector(`.boot-text`);
  t && (t.textContent = e);
}
function Kr() {
  try {
    let e = document.createElement(`canvas`);
    return !!(e.getContext(`webgl2`) || e.getContext(`webgl`));
  } catch {
    return !1;
  }
}
async function qr() {
  if (!Kr()) {
    Gr(`当前浏览器不支持 WebGL，无法显示 3D 棋盘。`);
    return;
  }
  (Gr(`正在加载物理引擎…`), await ft(), Gr(`正在搭建棋盘…`));
  let e = document.getElementById(`scene`),
    t = document.getElementById(`ui`),
    n = new or();
  n.setEnabled(localStorage.getItem(`sling.sound`) !== `0`);
  let r = new Wr(e),
    i = new ar(r, n, e, t),
    a = () => {
      let e = window.innerWidth,
        t = window.innerHeight;
      if ((r.resize(e, t), e > t && t <= 520))
        r.setMargins({ top: 48, bottom: 10, side: 10 });
      else {
        let n = t < 640;
        r.setMargins({
          top: n ? 96 : 112,
          bottom: n ? 62 : 74,
          side: e < 500 ? 6 : 16,
        });
      }
    };
  (a(),
    window.addEventListener(`resize`, a),
    window.visualViewport?.addEventListener(`resize`, a));
  let o = () => n.unlock();
  (window.addEventListener(`pointerdown`, o, { capture: !0 }),
    window.addEventListener(`keydown`, o, { capture: !0 }),
    i.start());
  let s = performance.now(),
    c = (e) => {
      let t = Math.min(0.1, Math.max(0, (e - s) / 1e3));
      ((s = e), !document.hidden && i.frame(t), requestAnimationFrame(c));
    };
  document.addEventListener(`visibilitychange`, () => {
    s = performance.now();
    if (document.hidden) i.match?.input?.cancel();
  });
  (requestAnimationFrame(c), (window.__sling = i.testHooks(), (window.__slingApp = i)));
  let l = document.getElementById(`boot`);
  (l?.classList.add(`hide`), setTimeout(() => l?.remove(), 600));
}
qr().catch((e) => {
  (console.error(e),
    Gr(`加载失败：` + (e instanceof Error ? e.message : String(e))));
});
