import { createGameAuth } from './northward-session.mjs';
import { ServerError } from 'colyseus';
export const gameAuth = createGameAuth({ game: 'hockey', sessionPath: '/hockey/northward/session' });
export function authenticatePlayer(options, context = {}) {
  // Colyseus 0.18 使用标准 Headers，内部匹配与 Node HTTP 边界也可能提供普通对象。
  const read = name => typeof context.headers?.get === 'function'
    ? context.headers.get(name) : context.headers?.[name];
  const cookie = read('cookie') || '', origin = read('origin');
  const user = gameAuth.identity(context.headers);
  // 认证结果会经过匹配器序列化，内部上下文必须使用可序列化的普通对象。
  const authContext = { headers: { cookie, ...(origin ? { origin } : {}) }, ip: context.ip };
  if (user && origin && origin !== process.env.NORTHWARD_GAME_ORIGIN) throw new ServerError(403, '请从游戏页面进入');
  if (user) return { pid: `northward_${user.uid}`, name: user.nickname, user, authContext };
  if (String(options.pid || '').startsWith('northward_')) throw new ServerError(401, '请重新进入游戏');
  return { pid: String(options.pid || '').slice(0, 64), name: String(options.name || '玩家').slice(0, 24), authContext };
}
