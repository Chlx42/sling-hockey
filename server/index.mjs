// 弹射冰球 —— Colyseus 0.18 权威服务器入口
// HTTP: /api/leaderboard /api/health + /matchmake/*（SDK 内置路由）
// WS: {processId}/{roomId}（nginx 按 Upgrade 头转发）
import { Server, matchMaker } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './game-room.mjs';
import { QueueRoom } from './queue-room.mjs';
import * as board from './leaderboard.mjs';

const PORT = Number(process.env.PORT) || 3217;

board.load();

const gameServer = new Server({
  transport: new WebSocketTransport({
    pingInterval: 6000,
    pingMaxRetries: 3,
  }),
  // /api 与 /matchmake 共用 transport 的 express 应用
  express: (app) => {
    app.get('/api/health', async (req, res) => {
      let rooms = -1;
      try { rooms = (await matchMaker.query({ name: 'game' })).length; } catch {}
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.json({ ok: true, rooms, uptime: process.uptime() });
    });
    app.get('/api/leaderboard', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      const period = req.query.period === 'week' ? 'week' : 'all';
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
      const pid = String(req.query.pid || '');
      res.setHeader('Cache-Control', 'no-store');
      res.json(board.query(period, limit, pid));
    });
  },
});

gameServer.define('game', GameRoom);
gameServer.define('queue', QueueRoom);

gameServer.listen(PORT, '127.0.0.1').then(() => {
  console.log(`sling-hockey colyseus server on 127.0.0.1:${PORT} (patch 20Hz)`);
});

process.on('SIGTERM', () => {
  gameServer.gracefullyShutdown(true).then(() => process.exit(0));
});
