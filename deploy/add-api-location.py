#!/usr/bin/env python3
# 在 aliyun-chlx 的 nginx default 站点里插入 /api/ 代理片段（幂等）
import sys

p = "/etc/nginx/sites-available/default"
s = open(p).read()
if "location /api/" in s:
    print("已存在")
    sys.exit(0)
frag = '\n\t# ==== sling-hockey 排行榜 API（原版客户端从站点根取 /api/leaderboard）====\n\tlocation /api/ {\n\t    proxy_pass http://127.0.0.1:3217/api/;\n\t    proxy_set_header Host $host;\n\t    proxy_set_header X-Real-IP $remote_addr;\n\t}\n'
lines = s.split("\n")
for i, ln in enumerate(lines):
    if 'add_header Cache-Control "no-cache";' in ln:
        lines.insert(i + 1, frag.rstrip("\n"))
        break
else:
    print("未找到插入点")
    sys.exit(1)
open(p, "w").write("\n".join(lines))
print("inserted")
