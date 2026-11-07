// 匹配队列房间（Colyseus 0.18）：成对配发 game 房席位预订；真人 8s 未配 → AI 陪练自客户端顶上
import { Room, matchMaker } from 'colyseus';
import { Schema, type } from '@colyseus/schema';
import { launchBot } from './bot.mjs';

const BOT_AFTER_MS = Number(process.env.SLING_BOT_AFTER_MS) || 8000;
const BOT_NAMES = ['退休球王', '冰球保安', '橡皮筋教授', '搓澡大侠', '弹弓师傅', '泡面董事长', '咸鱼教练', '挖掘机公主'];

export class QueueState extends Schema {
  constructor() {
    super();
    this.count = 0;
  }
}
type('uint8')(QueueState.prototype, 'count');

export class QueueRoom extends Room {
  maxClients = 50;

  onCreate() {
    this.waiting = [];
    this.pending = new Map(); // sessionId -> { client, timer }
    this.setState(new QueueState());
    this.clock.setInterval(() => this.checkBot(), 1000);
    // 原版协议：客户端收到 seat 后先发 confirm 再消费
    this.onMessage('confirm', (client) => {
      this.clearPending(client.sessionId);
    });
  }


  onJoin(client, { name, pid }) {
    this.waiting.push({ client, name: String(name || '玩家').slice(0, 24), pid: String(pid || ''), at: this.clock.currentTime, botLaunched: false });
    this.pushCount();
    if (this.waiting.length >= 2) this.pair();
  }

  onLeave(client) {
    this.clearPending(client.sessionId);
    const i = this.waiting.findIndex((w) => w.client.sessionId === client.sessionId);
    if (i >= 0) this.waiting.splice(i, 1);
    this.pushCount();
  }

  pushCount() {
    this.state.count = this.waiting.length;
    this.broadcast('clients', this.waiting.length);
  }

  clearPending(sessionId) {
    const pending = this.pending.get(sessionId);
    if (!pending) return;
    pending.timer.clear();
    this.pending.delete(sessionId);
  }

  reserve(client, seat) {
    const timer = this.clock.setTimeout(() => {
      this.pending.delete(client.sessionId);
      client.send('evt', { type: 'match_failed' });
    }, 12000);
    this.pending.set(client.sessionId, { client, timer });
    client.send('seat', seat);
  }

  async pair() {
    if (this.waiting.length < 2) return;
    const a = this.waiting.shift();
    const b = this.waiting.shift();
    this.pushCount();
    try {
      const seatA = await matchMaker.create('game', { mode: 'queue', name: a.name, pid: a.pid });
      const seatB = await matchMaker.joinById(seatA.roomId, { mode: 'queue', name: b.name, pid: b.pid });
      if (!this.clients.includes(a.client) || !this.clients.includes(b.client)) {
        if (this.clients.includes(a.client)) a.client.send('evt', { type: 'match_failed' });
        if (this.clients.includes(b.client)) b.client.send('evt', { type: 'match_failed' });
        return;
      }
      // 每个席位单独计时，不让较早一对的超时清理后续配对。
      this.reserve(a.client, seatA);
      this.reserve(b.client, seatB);
    } catch (err) {
      console.error('[queue] 配对失败:', err?.message || err);
      a.client.send('evt', { type: 'match_failed' });
      b.client.send('evt', { type: 'match_failed' });
    }
  }

  checkBot() {
    if (this.waiting.length !== 1) return;
    const w = this.waiting[0];
    if (w.botLaunched || w.pid.startsWith('bot-')) return;
    if (this.clock.currentTime - w.at >= BOT_AFTER_MS) {
      w.botLaunched = true;
      const name = 'AI 陪练·' + BOT_NAMES[(Math.random() * BOT_NAMES.length) | 0];
      console.log(`[queue] ${w.name} 等待超时，AI 陪练（${name}）入列`);
      launchBot(name, this.roomId).catch((e) => {
        console.error('[queue] 陪练启动失败:', e?.message || e);
        w.botLaunched = false;
        w.at = this.clock.currentTime;
      });
    }
  }
}
