var WSRoom = class {
  constructor(ws) {
    this.ws = ws;
    this.sessionId = null;
    this.roomId = null;
    this.state = null;
    this._stateCbs = [];
    this._msgCbs = new Map();
    this._leaveCbs = [];
    this._dropCbs = [];
    this._reconnCbs = [];
    this._pings = new Map();
    this._players = new Map();
    this._left = !1;
    this._retries = 0;
    let self = this;
    ws.addEventListener(`message`, (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      self._on(m);
    });
    ws.addEventListener(`close`, () => { self._left || self._dropped(); });
    ws.addEventListener(`error`, () => {});
  }
  _on(m) {
    switch (m.t) {
      case `hello`:
        this.sessionId = m.sid;
        m.resumed && ((this._retries = 0), this._reconnCbs.forEach((cb) => cb()));
        break;
      case `room`:
        this.roomId = m.code;
        break;
      case `st`: {
        this._players = new Map(m.pl.map(([sid, name, side, wins, rematch, shots, passes, connected, reconnectLeft]) => [sid, { sid, name, side, wins, rematch: !!rematch, shots, passes, connected: !!connected, reconnectLeft: reconnectLeft || 0 }]));
        const pucks = m.pk.map(([id, x, y, a, held]) => ({ id, x: x / 10, y: y / 10, a: a / 100, c: id < 5 ? id % 2 : (id - 4) % 2, held: held < 0 ? void 0 : held }));
        this._applyState({
          serverTime: m.st, phase: m.ph, timeLeft: m.tl, matchTime: m.mt, otTime: m.ot,
          overtime: !!m.ov, countdown: m.cd, winner: m.winner, reason: m.reason,
          players: this._players, pucks,
        });
        break;
      }
      case `shot`: this._emit(`shot`, { ...m, t: m.at }); break;
      case `score`: this._emit(`score`, m.e); break;
      case `fx`: this._emit(`fx`, m.e); break;
      case `renamed`: this._emit(`renamed`, m); break;
      case `evt`: this._emit(`evt`, m); break;
      case `pong`: {
        let cb = this._pings.get(m.ts);
        if (cb) { this._pings.delete(m.ts); cb(Math.round(performance.now() - m.ts)); }
        break;
      }
    }
  }
  _applyState(s) { this.state = s; this._stateCbs.forEach((cb) => cb(s)); }
  _emit(type, payload) { let cbs = this._msgCbs.get(type); cbs && cbs.forEach((cb) => cb(payload)); }
  onStateChange(cb) { this._stateCbs.push(cb); this.state && cb(this.state); }
  onMessage(e, t) { this._msgCbs.has(e) || this._msgCbs.set(e, []); this._msgCbs.get(e).push(t); }
  onLeave(e) { this._leaveCbs.push(e); }
  onDrop(e) { this._dropCbs.push(e); }
  onReconnect(e) { this._reconnCbs.push(e); }
  send(e, t) { this.ws?.readyState === 1 && this.ws.send(JSON.stringify({ t: e, ...t })); }
  ping(e) { let t = performance.now() | 0; this._pings.set(t, e), this.send(`ping`, { ts: t }); }
  leave() { this._left = !0; try { this.ws?.close(); } catch {} return Promise.resolve(); }
  _dropped() {
    if ((this._dropCbs.forEach((cb) => cb()), this._retries >= 3))
      return void this._leaveCbs.forEach((cb) => cb(4999));
    this._retries++;
    let self = this;
    setTimeout(() => {
      if (self._left) return;
      let e = location.protocol === `https:` ? `wss` : `ws`;
      let ws = new WebSocket(`${e}://${location.host}/hockey-ws`);
      ws.addEventListener(`open`, () => ws.send(JSON.stringify({ t: `hello`, mode: `resume`, sid: self.sessionId, name: ``, pid: localStorage.getItem(`sling.pid`) || `` })));
      self.ws = ws;
      ws.addEventListener(`message`, (ev) => { let m; try { m = JSON.parse(ev.data); } catch { return; } self._on(m); });
      ws.addEventListener(`close`, () => { self._left || self._dropped(); });
      ws.addEventListener(`error`, () => {});
    }, 600 * this._retries);
  }
},
  Yn = class {
    _connect(hello, hooks) {
      let e = location.protocol === `https:` ? `wss` : `ws`,
        t = new URLSearchParams(location.search).get(`server`) || location.origin,
        n = new WebSocket(`${e}://${new URL(t).host}/hockey-ws`),
        r = null, i = !1, a = !1, o = !1, s = !1, c = !1;
      // o: 已收到首帧状态; s: 已收到房间号; c: 已 resolve/reject
      let l = () => {
        c || (a && (hello.mode !== `create` || s) && ((c = !0), hooks.onReady(r)));
      };
      n.addEventListener(`open`, () => n.send(JSON.stringify({ t: `hello`, mode: hello.mode, room: hello.room, name: hello.name, pid: localStorage.getItem(`sling.pid`) || `` })));
      n.addEventListener(`message`, (ev) => {
        let m;
        try { m = JSON.parse(ev.data); } catch { return; }
        ((Yn._dbg ||= []).push(m.t + (m.ph ? `:${m.ph}` : ``)), Yn._dbg.length > 40 && Yn._dbg.shift());
        if (m.t === `hello`) {
          r = new WSRoom(n), (r.sessionId = m.sid), (i = !0);
          return;
        }
        if (m.t === `room`) { s = !0, r && (r.roomId = m.code); l(); return; }
        if (m.t === `queued`) { hooks.onQueued?.(m.count); return; }
        if (m.t === `st`) {
          a = !0;
          r && r._on(m);
          if (hello.mode !== `queue`) l();
          else {
            // 匹配模式：进入对局房（starting/waiting/playing 任一真实状态）才 resolve
            (m.ph === `starting` || m.ph === `playing` || m.ph === `waiting`) && !c && ((c = !0), hooks.onReady(r));
          }
          return;
        }
        if (m.t === `evt` && m.type === `no_room` && !c) { c = !0; hooks.onFail(Error(`房间不存在或已解散`)); return; }
        if (m.t === `evt` && m.type === `bad_hello` && !c) { c = !0; hooks.onFail(Error(`无法进入房间`)); return; }
        r && r._on(m);
      });
      n.addEventListener(`close`, () => { !c && !i && ((c = !0), hooks.onFail(Error(`无法连接服务器`))); });
      n.addEventListener(`error`, () => {});
      return { room: r, ws: n };
    }
    _open(hello) {
      return new Promise((resolve, reject) => {
        this._connect(hello, { onReady: resolve, onFail: reject, onQueued: () => {} });
      });
    }
    enterQueue(e, t) {
      let n = null, r = !1, i = !1;
      return {
        room: new Promise((a, o) => {
          let s = this._connect({ mode: `queue`, name: e }, {
            onQueued: (e) => t?.(e),
            onReady: (e) => { r || ((i = !0), a(e)); },
            onFail: (e) => { r || i || ((i = !0), o(e)); },
          });
          n = s;
        }),
        cancel: () => {
          ((r = !0),
            n?.room ? !i && n.room.leave() : n?.ws?.close());
        },
      };
    }
    createFriendRoom(e) { return this._open({ mode: `create`, name: e }); }
    joinFriendRoom(e, t) { return this._open({ mode: `join`, room: e, name: t }); }
  },
