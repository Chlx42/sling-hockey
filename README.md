# 弹射冰球（sling-hockey）—— 1:1 复刻版

线上试玩：**http://123.56.69.142/hockey/**

原站 https://bin.hlool.top 的《桌上弹射冰球》逆向复刻（[原作者帖子](https://linux.do/t/topic/3057890)）。**观感与交互 1:1**：渲染
（three.js 场景）、UI、CSS、音效、AI 拟人动画全部逆向移植自原站客户端 bundle；
规则引擎与原站服务端逻辑同源（原站把整套服务端代码打包进了客户端，逆向无损）。
**网络层为自研 WS 适配器 + 自研权威服务器**（不依赖 Colyseus），协议消息名与原版一致。

> 仅作学习研究。玩法与代码结构来自公开客户端逆向，署名原站作者；美术由 three.js
> 程序化生成（原版 chunk + 原版 CSS），无额外版权素材。

## 在线入口

http://123.56.69.142/hockey/ （aliyun-chlx，2C2G）

## 结构

| 位置 | 内容 |
| --- | --- |
| `engine/index.mjs` | 规则引擎切片（状态机/物理/计分/AI 搜索），服务端与客户端同源 |
| `client/js/game.mjs` | 1:1 复刻客户端：引擎 + 原站渲染/UI/音效切片 + 自研 WS 适配器 |
| `client/vendor/three-orig.js` | 原站编译的 three.js chunk（版本一致，零猜测） |
| `client/css/orig.css` | 原站 CSS 原样 |
| `server/` | Node + ws 权威服务器（匹配/对局/排行榜 JSON） |
| `deploy/` | systemd、nginx 片段、烟囱测试、构建脚本 |

## 重建 game.mjs

```bash
python3 deploy/build-game.py   # 依赖 /tmp/bin-hlool-re/index.beauty.js（逆向切片源）
node --check client/js/game.mjs
```

补丁点（构建脚本内）：`Yn` 网络类 → 自研 `WSRoom/Yn` 适配器（保留原 var 声明链逗号！）、
`e.FAILED_TO_RECONNECT` → `4999`、暴露 `window.__slingApp`（ar 实例，自动化测试钩子，
原版自带 `window.__sling = i.testHooks()` 含 planDrag 出手模拟）。

## 协议要点

- WS `/hockey-ws`，JSON 消息。`hello(queue/create/join/resume)` → 统一状态消息 `st`
  （四态 `waiting/starting/playing/over`，与原版 Schema 对齐：`serverTime/timeLeft×10/
  matchTime×10/otTime×10/overtime/countdown/winner/reason/players[wins,rematch,shots,passes]/
  pucks 量化 ×10、×100`）+ `shot/score/fx/evt` 独立消息
- `waiting` 即发初始布局（原版 onState 对空 pucks 直接 return，进房必须带 10 球）；
  `starting` 由服务器驱动 3s versus 倒计时；好友房 `waiting` 触发原版邀请界面（房间号+复制链接）
- 适配器（`deploy/ws-adapter.js`）把 `st` 重建为原版 shape、`shot.at`→`shot.t`，
  客户端切片零改动；`leave()` 必须返回 Promise（原版 `tr.dispose` 有 `.catch`）
- 出手仅上报 `{puckId, cx, px, py}`，服务器用同款几何函数全量重算（±68° 拉角、
  3.9 拉距、0.3s 冷却、重叠检测），无法伪造初速
- 断线 30s 席位保留，适配器自动 `resume` 重连（3 次失败判负）；重赛换边、wins 累计

## 部署（aliyun-chlx）

1. Node 22（mirrors.aliyun.com/nodejs-release）→ `/usr/local`
2. rsync 项目（除 node_modules）→ `/opt/sling-hockey`；`npm install --registry=https://registry.npmmirror.com --omit=dev`
3. `deploy/sling-hockey.service` → systemd enable --now（PORT=3217）
4. nginx default 站点内：`/hockey/`（静态，no-cache）、`/hockey/api/` 代理、
   `/hockey-ws`（Upgrade）、`/api/` 代理（原版客户端从站点根取排行榜）
5. `.mjs` MIME：`/etc/nginx/mime.types` 增加 `text/javascript mjs;`（已加，备份 default.bak-slinghockey-*）

## 验证记录（2026-11-07）

- 烟囱测试 15/15（匹配/抓球校验/出手广播/快照 12Hz/断线重连/好友房/排行榜）
- 浏览器（IAB WebKit）：菜单/难度页/对局/结算全流程原版观感；
  `planDrag` 真实拖拽出手穿洞得分；在线匹配双端对局（mySide=1，puck 穿洞确认）；
  注意 IAB 合成器把 rAF 压到 ~1fps，用 `__slingApp.frame(1/60)` 泵帧验收，真实浏览器前台不受影响

## 容量参考

每房间 CPU ≈ 1.5–3 ms/游戏秒（本机实测），2C2G 可承载 300+ 并发玩家；
瓶颈是公网带宽（每房双向 ≈ 6KB/s，1Mbps 固定带宽约 20 房）。
