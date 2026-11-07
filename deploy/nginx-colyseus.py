#!/usr/bin/env python3
# nginx 重构为 Colyseus 反代：
# 1. /hockey/ 与 /api/ 加 ^~（优先于正则，避免静态资源被 WS 正则吞掉）
# 2. 删除废弃的 /hockey-ws 与 /hockey/api/
# 3. 新增 /matchmake/ 代理 + WS 两段深路径正则代理（排除 hockey/api）
p = "/etc/nginx/sites-available/default"
lines = open(p).read().split("\n")

out = []
i = 0
n = len(lines)
while i < n:
    ln = lines[i]
    # 删除旧的 /hockey/api/ 与 /hockey-ws 块
    if ln.strip() == "location /hockey/api/ {" or ln.strip() == "location /hockey-ws {":
        depth = 1
        i += 1
        while i < n and depth > 0:
            if lines[i].strip().startswith("}"):
                depth -= 1
            i += 1
        # 顺带吃掉其上方注释行
        while out and out[-1].strip().startswith("#") and "sling-hockey" not in out[-1]:
            if "====" in out[-1]:
                break
            out.pop()
        continue
    # /hockey/ 与 /api/ 加 ^~
    if ln.strip() == "location /hockey/ {":
        ln = ln.replace("location /hockey/", "location ^~ /hockey/")
    if ln.strip() == "location /api/ {":
        ln = ln.replace("location /api/", "location ^~ /api/")
    out.append(ln)
    i += 1

s = "\n".join(out)

# 新增 Colyseus 反代（插在 server 块结束前 —— 最后一处顶级 "}" 前）
frag = """
	# ==== sling-hockey Colyseus（matchmake HTTP + WS 对局连接）====
	location /matchmake/ {
	    proxy_pass http://127.0.0.1:3217;
	    proxy_set_header Host $host;
	    proxy_set_header X-Real-IP $remote_addr;
	}
	location ~ "^/(?!(hockey|api)(/|$))[A-Za-z0-9_-]+/[A-Za-z0-9_-]+$" {
	    proxy_pass http://127.0.0.1:3217;
	    proxy_http_version 1.1;
	    proxy_set_header Upgrade $http_upgrade;
	    proxy_set_header Connection "upgrade";
	    proxy_set_header Host $host;
	    proxy_read_timeout 300s;
	    proxy_send_timeout 300s;
	}
"""
# 找第一个 server 块的闭合（顶级 "\t}"，含 hockey 片段的那个 server）
depth = 0
insert_at = None
for i, ln in enumerate(out):
    if ln.startswith("server {") or ln.strip() == "server {":
        depth = 1
        continue
    if depth > 0:
        if ln.startswith("}"):
            insert_at = i
            break
        if ln.strip().startswith("location") or ln.strip().startswith("#"):
            pass
        if ln.strip() == "}" and False:
            pass
assert insert_at is not None, "未找到 server 闭合"
out.insert(insert_at, frag.rstrip("\n"))
open(p, "w").write("\n".join(out))
print("重构完成")
