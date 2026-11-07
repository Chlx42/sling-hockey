#!/usr/bin/env python3
# 构建 client/js/game.mjs：共享引擎 + 原站客户端切片（1628-6427）+ WS 适配器
# 三个补丁：Yn 网络类替换（保留 var 声明链逗号）、colyseus 常量、测试钩子 __slingApp
import os
import re

# 项目根（deploy/ 的上级）
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 原站 bundle 的格式化切片目录（逆向工作区，不随仓库分发；可用环境变量指向自己的分析产物）
BUNDLE_DIR = os.environ.get("SLING_BUNDLE_DIR", "/tmp/bin-hlool-re")

minified = open(f"{BUNDLE_DIR}/assets/index-BFST9Wsw.js").read()
spec = re.search(r'import\{([^}]*)\}from"\./three-5gbYhOrR\.js"', minified).group(1).replace(" as ", ": ")

beauty = open(f"{BUNDLE_DIR}/index.beauty.js").read().split("\n")
engine = open(f"{ROOT}/engine/index.mjs").read().split("\n")
body_end = len(engine)
for i in range(len(engine) - 1, 0, -1):
    if engine[i].startswith("export {"):
        body_end = i
        break
engine_body = "\n".join(engine[2:body_end])

client_slice = "\n".join(beauty[1627:6427])
yn_old = "\n".join(beauty[2677:2722])
ADAPTER = open(f"{ROOT}/deploy/ws-adapter.js").read().rstrip()
assert ADAPTER.endswith(","), "适配器必须以逗号结尾以接续 var 声明链"

patched = client_slice.replace(yn_old, ADAPTER)
assert patched != client_slice, "Yn 替换失败"
patched = patched.replace("e.FAILED_TO_RECONNECT", "4999")
# 测试钩子：暴露 ar 实例供自动化验收驱动（不影响正常行为）
patched = patched.replace(
    "(window.__sling = i.testHooks())",
    "(window.__sling = i.testHooks(), (window.__slingApp = i))",
)

header = f"""// 弹射冰球 —— 1:1 复刻客户端
// 渲染/UI/音效/AI 控制器逆向移植自 https://bin.hlool.top 公开客户端 bundle（仅供学习研究）
// 规则引擎与服务端逻辑同源（原站把整套服务端打包进了客户端）
// 网络层为自研 WS 适配器（WSRoom/Yn），对接自研权威服务器，接口与原版 Colyseus room 一致
// 重建：python3 deploy/build-game.py
import * as T3 from '../vendor/three-orig.js';
import * as n from '@dimforge/rapier2d-compat';
await n.init();
const {{{spec}}} = T3;
"""

game = header + "\n" + engine_body + "\n" + patched + "\n"
open(f"{ROOT}/client/js/game.mjs", "w").write(game)
print(f"game.mjs: {game.count(chr(10))} 行 / {len(game)//1024}KB")
