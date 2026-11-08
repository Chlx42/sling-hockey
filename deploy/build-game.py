#!/usr/bin/env python3
# 构建 client/js/game.mjs：共享引擎 + 原站客户端切片 + Colyseus + 性能补丁
import os
import re
import subprocess
import tempfile
from pathlib import Path

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

patched = client_slice  # 保留原版 Colyseus 网络协议，后续补丁修复队列生命周期。
# 测试钩子：暴露 ar 实例供自动化验收驱动（不影响正常行为）
patched = patched.replace(
    "(window.__sling = i.testHooks())",
    "(window.__sling = i.testHooks(), (window.__slingApp = i))",
)

header = f"""// 弹射冰球 —— 1:1 复刻客户端
// 渲染/UI/音效/AI 控制器逆向移植自 https://bin.hlool.top 公开客户端 bundle（仅供学习研究）
// 规则引擎与服务端逻辑同源（原站把整套服务端打包进了客户端）
// 网络层通过 Colyseus SDK 对接权威服务器
// 重建：python3 deploy/build-game.py
import * as T3 from '../vendor/three-orig.js';
import {{ n as e, t }} from '../vendor/colyseus-orig.js';
import * as n from '@dimforge/rapier2d-compat';
await n.init();
const {{{spec}}} = T3;
"""

game = header + "\n" + engine_body + "\n" + patched + "\n"
# 先在临时文件中应用补丁，失败时保留现有客户端。
with tempfile.TemporaryDirectory(prefix="sling-build-") as directory:
    target = Path(directory) / "game.mjs"
    target.write_text(game)
    for patch in ("client-performance.patch", "client-colyseus.patch", "client-physics.patch", "client-island.patch"):
        subprocess.run(
            ["patch", "--batch", "--forward", "--fuzz=0", str(target), f"{ROOT}/deploy/{patch}"],
            check=True,
        )
    game = target.read_text()
open(f"{ROOT}/client/js/game.mjs", "w").write(game)
print(f"game.mjs: {game.count(chr(10))} 行 / {len(game)//1024}KB")
