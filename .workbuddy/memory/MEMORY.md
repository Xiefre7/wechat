# 项目记忆

## 项目概况
- 项目名：导题斩题小工具（微信小程序）
- 目标用户：福建省职教高考考生
- MVP 学科：数学、英语、政治
- 核心机制：刷题、斩题、错题本(SM-2)、题库导入、真题、打卡、微信登录+云端同步
- 云开发环境ID：mvp1-d8grozotx0e93940c
- 架构：微信云开发（云数据库 + 2个云函数 quickstartFunctions / admin-api + 独立管理端网页）

## 微信登录 + 云端数据互通（2026-07-02 实现）
- 登录方式：自定义登录引导页 + chooseAvatar + nickname input（微信无主动弹出官方登录页）
- 登录墙：首页可浏览，核心功能（刷题/错题/导入/真题/打卡/斩题/历史）需登录
- 云端集合：`user_data`（每用户一文档，含 checkin/studyStats/practiceHistory/slashProgress）
- 同步策略：写时同步（本地立即更新+防抖2秒异步上云），读取走本地缓存
- 首次登录迁移：本地数据自动上传云端（合并策略：打卡并集/学习取大/历史取新/斩题取并集）
- 关键文件：utils/authManager.js、utils/cloudSync.js、pages/login/index
- 待优化：错题本(wrongBook.js)仍纯本地，云函数接口已就绪但前端未接通

## 已知问题（2026-07-01 审查）
- 斩题规则存在文档/代码不一致：AGENTS.md 要求"10题80%+30天复活"，slashManager v2 题类斩题为"3题2题+7天复活"，自导入单题斩题符合文档。需产品确认最终规则。
- example 页面 + cloudTipModal 组件为云开发模板残留死代码。
- images/bg/ 与 images/bg-light/ 重复（180KB 浪费）。
- 管理端网页存在 XSS（Word HTML innerHTML 注入）、HTTP 明文、硬编码 admin123 密码等问题。

## 技术约定
- 主色蓝 #007AFF，iOS26 液态玻璃设计风格
- 主包当前 1.7MB，接近 2MB 上限，后续新增功能需走分包
- 隐私 API：chooseMedia、chooseMessageFile、chooseAvatar（需配置 requiredPrivateInfos）
- 隐私指引勾选：用户信息(昵称头像)、选中的照片或视频信息、选中的文件；设备信息(app.js getSystemInfoSync 回退，建议删除)
- app.json 缺少 requiredPrivateInfos 声明（需补充 chooseMedia, chooseMessageFile）
- 云函数新增接口需在 quickstartFunctions/index.js switch-case 中注册
- 云数据库分页陷阱：小程序端 wx.cloud.database() 单次 get 最多 20 条（limit 上限 20）；云函数端单次 get 最多 100 条（limit 上限 1000 但单次仍 100，需 skip 分页）。批量取数必须走云函数 + skip/limit 循环
