# 弹射冰球（sling-hockey）

线上试玩：**http://123.56.69.142/hockey/**

2.5D 桌面弹射对战：按住自己半场的冰球拖到底线弹力带，后拉松手发射，穿过中央洞口送到对方半场，先清空自己半场的一方获胜。支持人机三档难度、在线匹配（无人时自动配 AI 陪练）和好友房间。

## 技术栈

- 前端：three.js + Rapier（WASM），原生 ESM 无打包器
- 后端：Node.js + Colyseus 0.18，权威服务器（出手校验、120Hz 物理步进、20Hz Schema 增量同步）
- 联机：原版 Colyseus SDK；同步棋子与瞄准状态，客户端插值渲染
- AI 陪练：真实 Colyseus 客户端，复用共享引擎并分片搜索，避免长时间阻塞房间更新
- 部署：systemd + nginx

## 运行

```bash
npm ci
npm start        # 服务端监听 127.0.0.1:3217
```

`client/` 为纯静态文件，任意静态服务器托管即可；WebSocket 与 API 代理配置见 `deploy/nginx-sling-hockey.conf`。

生产环境通过 nginx 提供 `/hockey/` 静态页面、`/api/`、`/matchmake/`，以及
`/{processId}/{roomId}` WebSocket。服务端仅监听回环地址；修改反代时保留同站其他服务的路由。
排行榜目录由 `SLING_DATA_DIR` 指定，发布代码时保留该目录。

`client/js/game.mjs` 已包含运行所需客户端代码。重建需准备原始分析产物目录
（默认 `/tmp/bin-hlool-re`，可用 `SLING_BUNDLE_DIR` 指定），运行 `python3 deploy/build-game.py`；
构建会应用 `deploy/client-performance.patch` 和 `deploy/client-colyseus.patch`，保留渲染优化与队列修复。

## 目录结构

| 目录 | 内容 |
| --- | --- |
| `client/` | 游戏客户端 |
| `server/` | 权威服务器（匹配、对局、排行榜） |
| `engine/` | 规则引擎（服务端与客户端共用） |
| `deploy/` | systemd 单元、nginx 配置、协议烟囱测试 |

---

玩法与界面参考 [bin.hlool.top](https://bin.hlool.top/) 的《桌上弹射冰球》。
