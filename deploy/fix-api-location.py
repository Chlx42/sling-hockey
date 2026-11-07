#!/usr/bin/env python3
# 修复：把误插进 /hockey/ location 内部的 /api/ 片段移到其闭合括号之后
p = "/etc/nginx/sites-available/default"
lines = open(p).read().split("\n")

# 1. 摘除已插入的 /api/ 片段（从注释行到它的 "\t}" 行）
start = end = None
for i, ln in enumerate(lines):
    if "sling-hockey 排行榜 API" in ln:
        start = i
    if start is not None and ln.strip() == "}" and end is None and i > start:
        end = i
        break
assert start is not None and end is not None, "未找到已插入片段"
frag = "\n".join(lines[start : end + 1])
del lines[start : end + 1]

# 2. 找 /hockey/ location 的闭合行，插到其后
for i, ln in enumerate(lines):
    if ln.strip().startswith("location /hockey/ {"):
        j = i
        while lines[j].strip() != "}":
            j += 1
        lines.insert(j + 1, frag)
        break
else:
    raise SystemExit("未找到 /hockey/ location")

open(p, "w").write("\n".join(lines))
print("moved")
