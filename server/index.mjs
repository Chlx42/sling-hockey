// 桌上弹射冰球 —— 权威服务器入口
// HTTP: /api/leaderboard /api/health   WS: 任意路径（由 nginx 只转发 /hockey-ws）
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { Registry } from './rooms.mjs';
import * as board from './leaderboard.mjs';

const PORT = Number(process.env.PORT) || 3217;
const TICK_HZ = 60;
const SNAP_EVERY = 5; // 每 5 帧 1 个快照 = 12Hz

board.load();

const registry = new Registry({ onResult: (pid, name, won) => board.record(pid, name, won) });

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: registry.rooms.size, queue: registry.queue.length, uptime: process.uptime() }));
    return;
  }
  if (url.pathname === '/api/leaderboard') {
    const period = url.searchParams.get('period') === 'week' ? 'week' : 'all';
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10));
    const pid = url.searchParams.get('pid') || '';
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(board.query(period, limit, pid)));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let bound = false;
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'hello') {
      if (bound) return;
      bound = true;
      registry.attach(ws, m);
      return;
    }
    const ref = registry.connRoom.get(ws);
    if (ref) ref.room.handleMessage(ref.sid, m);
  });
  ws.on('close', () => registry.onClose(ws));
  ws.on('error', () => {});
});

// 主循环
let last = Date.now();
let frame = 0;
setInterval(() => {
  const now = Date.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  frame++;
  registry.tick(dt, frame % SNAP_EVERY === 0);
}, 1000 / TICK_HZ);

server.listen(PORT, '127.0.0.1', () => {
  console.log(`sling-hockey server on 127.0.0.1:${PORT} (tick ${TICK_HZ}Hz, snap ${SNAP_EVERY}Hz)`);
});

process.on('SIGTERM', () => { server.close(); wss.close(); process.exit(0); });
