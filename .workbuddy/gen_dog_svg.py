# -*- coding: utf-8 -*-
# 16x16 像素白色小狗头像 - path 形式(行内合并同色, 按颜色分组)
from collections import OrderedDict

GRID = [
    "..KKK......KKK..",  # 0 耳朵顶
    ".KWWWK....KWWWK.",  # 1
    ".KWGWWK..KWWGWK.",  # 2 耳内浅灰
    ".KWGGWWKKWWGGWK.",  # 3
    ".KWWWWWWWWWWWWK.",  # 4 耳根接脸
    "..KWWWWWWWWWWK..",  # 5 脸顶
    "..KWWWWWWWWWWK..",  # 6
    "..KWKKWWWWKKWK..",  # 7 眼睛
    "..KWKKWWWWKKWK..",  # 8 眼睛
    "..KWWWWWWWWWWK..",  # 9
    "..KWWWWPPWWWWK..",  # 10 鼻子
    "..KWWWWWWWWWWK..",  # 11
    "..KWWWWTTWWWWK..",  # 12 舌头
    "...KWWWWWWWWWK..",  # 13 下巴
    "....KWWWWWWWK...",  # 14
    ".....KKKKKK.....",  # 15 底部收边
]

COLORS = OrderedDict([
    ("K", "#2B2B2B"),
    ("W", "#FFFFFF"),
    ("G", "#D8D8D8"),
    ("P", "#FF9AA2"),
    ("T", "#FF7A85"),
])

for i, row in enumerate(GRID):
    assert len(row) == 16, f"Row {i} bad len {len(row)}"

# 按颜色收集 path 段(行内 RLE 合并)
segments = {ch: [] for ch in COLORS}
for y, row in enumerate(GRID):
    x = 0
    while x < 16:
        ch = row[x]
        if ch in COLORS:
            w = 1
            while x + w < 16 and row[x + w] == ch:
                w += 1
            if w == 1:
                segments[ch].append(f"M{x},{y}h1v1h-1z")
            else:
                segments[ch].append(f"M{x},{y}h{w}v1h-{w}z")
            x += w
        else:
            x += 1

parts = []
for ch, color in COLORS.items():
    segs = segments[ch]
    if segs:
        d = "".join(segs)
        parts.append(f"<path fill='{color}' d='{d}'/>")

svg = ("<svg width='16' height='16' viewBox='0 0 16 16' "
       "xmlns='http://www.w3.org/2000/svg' shape-rendering='crispEdges'>"
       + "".join(parts) + "</svg>")

out_path = "C:/Users/32804/WeChatProjects/miniprogram-1/.workbuddy/dog_svg.txt"
with open(out_path, "w", encoding="utf-8") as f:
    f.write(svg)

total_segs = sum(len(v) for v in segments.values())
print("segments:", total_segs)
print("svg length:", len(svg))
print("===FULL SVG===")
print(svg)
