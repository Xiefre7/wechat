# -*- coding: utf-8 -*-
import json
from collections import OrderedDict

GRID = [
    "..KKK......KKK..",".KWWWK....KWWWK.",".KWGWWK..KWWGWK.",".KWGGWWKKWWGGWK.",
    ".KWWWWWWWWWWWWK.","..KWWWWWWWWWWK..","..KWWWWWWWWWWK..","..KWKKWWWWKKWK..",
    "..KWKKWWWWKKWK..","..KWWWWWWWWWWK..","..KWWWWPPWWWWK..","..KWWWWWWWWWWK..",
    "..KWWWWTTWWWWK..","...KWWWWWWWWWK..","....KWWWWWWWK...",".....KKKKKK.....",
]
COLORS = OrderedDict([("K","#2B2B2B"),("W","#FFFFFF"),("G","#D8D8D8"),("P","#FF9AA2"),("T","#FF7A85")])
segs={ch:[] for ch in COLORS}
for y,row in enumerate(GRID):
    x=0
    while x<16:
        ch=row[x]
        if ch in COLORS:
            w=1
            while x+w<16 and row[x+w]==ch: w+=1
            segs[ch].append(("M%d,%dh%dv1h-%dz" % (x,y,w,w)) if w>1 else ("M%d,%dh1v1h-1z" % (x,y)))
            x+=w
        else: x+=1
parts=[]
for ch,color in COLORS.items():
    if segs[ch]:
        d = "".join(segs[ch])
        parts.append("<path fill='%s' d='%s'/>" % (color, d))
inner="".join(parts)

def mk(size):
    return ("<svg width='%d' height='%d' viewBox='0 0 16 16' "
            "xmlns='http://www.w3.org/2000/svg' shape-rendering='crispEdges'>%s</svg>" % (size, size, inner))

out={str(s):mk(s) for s in [16,32,64,128,256]}
with open("C:/Users/32804/WeChatProjects/miniprogram-1/.workbuddy/dog_sizes.json","w",encoding="utf-8") as f:
    json.dump(out,f,ensure_ascii=False)
for s in out: print("size %s: len %d" % (s, len(out[s])))
print("OK")
