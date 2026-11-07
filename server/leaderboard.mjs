// 排行榜：JSON 文件存储（规模小，无需数据库）
// 结构：{ pids: { <pid>: { name, wins, played, updatedAt } } }
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.SLING_DATA_DIR || path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'leaderboard.json');

let state = { pids: {} };

export function load() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  try {
    state = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    state = { pids: {} };
  }
}

function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, FILE);
}

export function record(pid, name, won) {
  if (!pid || !/^[A-Za-z0-9_-]{8,64}$/.test(pid)) return;
  const now = Date.now();
  const row = state.pids[pid] ?? { name: '', wins: 0, played: 0, updatedAt: 0 };
  row.name = String(name || row.name || '').slice(0, 24);
  row.played++;
  if (won) row.wins++;
  row.updatedAt = now;
  state.pids[pid] = row;
  save();
}

// period: all | week
export function query(period, limit, pid) {
  const entries = Object.entries(state.pids);
  const weekMs = 7 * 86400 * 1000;
  const cutoff = Date.now() - weekMs;
  let rows = entries.map(([p, r]) => ({ pid: p, name: r.name, wins: r.wins, played: r.played }));
  if (period === 'week') {
    rows = entries
      .filter(([, r]) => r.updatedAt >= cutoff)
      .map(([p, r]) => ({ pid: p, name: r.name, wins: r.wins, played: r.played }));
  }
  rows.sort((a, b) => b.wins - a.wins || b.played - a.played);
  const top = rows.slice(0, limit).map((r) => ({ name: r.name, wins: r.wins, played: r.played }));
  const mine = pid ? rows.find((r) => r.pid === pid) : null;
  const rank = mine ? rows.findIndex((r) => r.pid === pid) + 1 : null;
  return {
    period,
    total: rows.length,
    top,
    me: mine
      ? { name: mine.name, wins: mine.wins, played: mine.played, games: mine.played, rank, rate: mine.played ? mine.wins / mine.played : 0 }
      : null,
  };
}
