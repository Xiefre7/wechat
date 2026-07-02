# 项目记忆

## 项目概况
- 项目名：导题斩题小工具（微信小程序）
- 目标用户：福建省职教高考考生
- MVP 学科：数学、英语、政治
- 核心机制：刷题、斩题、错题本(SM-2)、题库导入、真题、打卡
- 云开发环境ID：mvp1-d8grozotx0e93940c
- 架构：微信云开发（云数据库 + 2个云函数 quickstartFunctions / admin-api + 独立管理端网页）

## 已知问题（2026-07-01 审查）
- 斩题规则存在文档/代码不一致：AGENTS.md 要求"10题80%+30天复活"，slashManager v2 题类斩题为"3题2题+7天复活"，自导入单题斩题符合文档。需产品确认最终规则。
- 打卡(checkin)功能仅有静态假数据，未实际实现。
- example 页面 + cloudTipModal 组件为云开发模板残留死代码。
- images/bg/ 与 images/bg-light/ 重复（180KB 浪费）。
- 管理端网页存在 XSS（Word HTML innerHTML 注入）、HTTP 明文、硬编码 admin123 密码等问题。

## 技术约定
- 主色蓝 #007AFF，iOS26 液态玻璃设计风格
- 主包当前 1.7MB，接近 2MB 上限，后续新增功能需走分包
- 隐私 API：chooseMedia、chooseMessageFile（需配置 requiredPrivateInfos）
