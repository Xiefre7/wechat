# -*- coding: utf-8 -*-
import json

with open("C:/Users/32804/WeChatProjects/miniprogram-1/.workbuddy/dog_sizes.json","r",encoding="utf-8") as f:
    data = json.load(f)

S16, S32, S64, S128, S256 = data["16"], data["32"], data["64"], data["128"], data["256"]

# ---------- 批1：结构 + 主图标 + 场景预览 ----------
b1 = []
b1.append('showcase=I(document, {type:"frame", name:"DogAvatar-Showcase", layout:"vertical", width:680, height:"hug_contents", padding:56, gap:44, fill:"#F5F7FA", cornerRadius:28})')
b1.append('header=I(showcase, {type:"frame", name:"Header", layout:"vertical", gap:10, width:"fill_container"})')
b1.append('title=I(header, {type:"text", name:"Title", content:"像素白犬", fontSize:34, fontWeight:"700", fill:"#1A1D24"})')
b1.append('subtitle=I(header, {type:"text", name:"Subtitle", content:"登录默认头像 · 16×16 像素艺术", fontSize:15, fill:"#6B7280"})')
b1.append('mainRow=I(showcase, {type:"frame", name:"MainRow", layout:"horizontal", gap:56, counterAxisAlignItems:"CENTER", primaryAxisAlignItems:"CENTER", width:"fill_container"})')
b1.append('cardL=I(mainRow, {type:"frame", name:"IconCard-L", width:300, height:300, fill:"#FFFFFF", cornerRadius:36, layout:"none"})')
b1.append('dogL=I(cardL, {type:"frame", name:"DogIcon-L", svg:"' + S256 + '", layout:"none", x:22, y:22, width:256, height:256})')
b1.append('sceneCol=I(mainRow, {type:"frame", name:"ScenePreview", layout:"vertical", gap:18, counterAxisAlignItems:"CENTER"})')
b1.append('avatar=I(sceneCol, {type:"frame", name:"AvatarCircle", width:144, height:144, fill:"#EFF6FF", cornerRadius:72, layout:"none"})')
b1.append('dogM=I(avatar, {type:"frame", name:"DogIcon-M", svg:"' + S128 + '", layout:"none", x:8, y:8, width:128, height:128})')
b1.append('sceneLabel=I(sceneCol, {type:"text", name:"SceneLabel", content:"登录页头像位 · 144px", fontSize:13, fill:"#9CA3AF"})')

# ---------- 批2：尺寸变体 ----------
b2 = []
b2.append('sizesBlock=I(showcase, {type:"frame", name:"SizesBlock", layout:"vertical", gap:18, width:"fill_container"})')
b2.append('sizesTitle=I(sizesBlock, {type:"text", name:"SizesTitle", content:"多尺寸适配", fontSize:15, fontWeight:"600", fill:"#374151"})')
b2.append('sizesRow=I(sizesBlock, {type:"frame", name:"SizesRow", layout:"horizontal", gap:40, counterAxisAlignItems:"CENTER", primaryAxisAlignItems:"SPACE_EVENLY", width:"fill_container"})')

# 16px 组
b2.append('g16=I(sizesRow, {type:"frame", name:"Size-16", layout:"vertical", gap:10, counterAxisAlignItems:"CENTER"})')
b2.append('c16=I(g16, {type:"frame", name:"Card-16", width:80, height:80, fill:"#FFFFFF", cornerRadius:14, layout:"none"})')
b2.append('d16=I(c16, {type:"frame", name:"DogIcon-16", svg:"' + S16 + '", layout:"none", x:32, y:32, width:16, height:16})')
b2.append('l16=I(g16, {type:"text", name:"Label-16", content:"16 px", fontSize:12, fill:"#6B7280"})')
# 32px 组
b2.append('g32=I(sizesRow, {type:"frame", name:"Size-32", layout:"vertical", gap:10, counterAxisAlignItems:"CENTER"})')
b2.append('c32=I(g32, {type:"frame", name:"Card-32", width:80, height:80, fill:"#FFFFFF", cornerRadius:14, layout:"none"})')
b2.append('d32=I(c32, {type:"frame", name:"DogIcon-32", svg:"' + S32 + '", layout:"none", x:24, y:24, width:32, height:32})')
b2.append('l32=I(g32, {type:"text", name:"Label-32", content:"32 px", fontSize:12, fill:"#6B7280"})')
# 64px 组
b2.append('g64=I(sizesRow, {type:"frame", name:"Size-64", layout:"vertical", gap:10, counterAxisAlignItems:"CENTER"})')
b2.append('c64=I(g64, {type:"frame", name:"Card-64", width:80, height:80, fill:"#FFFFFF", cornerRadius:14, layout:"none"})')
b2.append('d64=I(c64, {type:"frame", name:"DogIcon-64", svg:"' + S64 + '", layout:"none", x:8, y:8, width:64, height:64})')
b2.append('l64=I(g64, {type:"text", name:"Label-64", content:"64 px", fontSize:12, fill:"#6B7280"})')

with open("C:/Users/32804/WeChatProjects/miniprogram-1/.workbuddy/ops_b1.json","w",encoding="utf-8") as f:
    json.dump(b1, f, ensure_ascii=False)
with open("C:/Users/32804/WeChatProjects/miniprogram-1/.workbuddy/ops_b2.json","w",encoding="utf-8") as f:
    json.dump(b2, f, ensure_ascii=False)

print("batch1 ops:", len(b1))
print("batch2 ops:", len(b2))
print("--- b1[6] (dogL) length:", len(b1[6]))
print("--- b1[6] head:", b1[6][:120])
