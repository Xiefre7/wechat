# -*- coding: utf-8 -*-
import json
with open("C:/Users/32804/WeChatProjects/miniprogram-1/.workbuddy/ops_b1.json","r",encoding="utf-8") as f:
    b1 = json.load(f)
with open("C:/Users/32804/WeChatProjects/miniprogram-1/.workbuddy/ops_b1_lines.txt","w",encoding="utf-8") as f:
    for op in b1:
        f.write(json.dumps(op, ensure_ascii=False) + "\n")
print("lines:", len(b1))
# 校验每行长度
for i,op in enumerate(b1):
    print(i, len(op), repr(op[:50]))
