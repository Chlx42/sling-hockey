# 弹射冰球（sling-hockey）

线上试玩：**http://123.56.69.142/hockey/**

2.5D 桌面弹射对战：按住自己半场的冰球拖到底线弹力带，后拉松手发射，穿过中央洞口送到对方半场，先清空自己半场的一方获胜。支持人机三档难度、在线匹配（无人时自动配 AI 陪练）和好友房间。

## 技术栈

- 前端：three.js + Rapier（WASM），原生 ESM 无打包器
- 后端：Node.js + ws，权威服务器（出手全量校验，12Hz 量化快照同步）
- 部署：systemd + nginx

## 运行

```bash
npm install
npm start        # 服务端监听 127.0.0.1:3217
```

`client/` 为纯静态文件，任意静态服务器托管即可；WebSocket 与 API 代理配置见 `deploy/nginx-sling-hockey.conf`。

## 目录结构

| 目录 | 内容 |
| --- | --- |
| `client/` | 游戏客户端 |
| `server/` | 权威服务器（匹配、对局、排行榜） |
| `engine/` | 规则引擎（服务端与客户端共用） |
| `deploy/` | systemd 单元、nginx 配置、协议烟囱测试 |

---

玩法与界面参考 [bin.hlool.top](https://bin.hlool.top/) 的《桌上弹射冰球》。
