# 微信登录 + 云端数据互通 — 实现概览

## 完成内容

为小程序实现了完整的微信登录系统和云端数据同步功能，用户登录后所有数据存云端，更换设备登录即可恢复全部数据。

## 核心架构

```
用户打开小程序 → app.js onLaunch
  ├─ wx.cloud.init（初始化云开发）
  ├─ loadUserProfile（拉取用户资料）
  └─ authManager.silentInit（静默获取 openid）

用户点击功能 → authManager.ensureLogin(callback)
  ├─ 已登录 → 直接执行 callback
  └─ 未登录 → 跳转登录引导页
       ├─ chooseAvatar 获取头像
       ├─ nickname input 获取昵称
       ├─ 勾选隐私协议
       └─ 点击"微信一键登录"
            ├─ 上传头像到云存储
            ├─ authManager.doLogin
            │   ├─ 保存用户资料到云端
            │   ├─ 拉取云端 user_data
            │   ├─ 云端有数据 → 写入本地缓存
            │   └─ 云端无数据+本地有数据 → 迁移上云
            ├─ 标记已登录
            └─ 返回原页面执行 callback

日常使用 → 各 manager 写操作
  ├─ 本地立即更新（UI 流畅）
  └─ 防抖2秒异步上云（write-through）
```

## 新建文件

| 文件 | 用途 |
|------|------|
| `miniprogram/utils/authManager.js` | 登录态管理：isLoggedIn/ensureLogin/doLogin/silentInit/logout |
| `miniprogram/utils/cloudSync.js` | 云端同步：fetchCloudData/saveSection/migrateLocal/applyCloudToLocal |
| `miniprogram/pages/login/index.js` | 登录引导页逻辑 |
| `miniprogram/pages/login/index.json` | 登录页配置 |
| `miniprogram/pages/login/index.wxml` | 登录页模板（液态玻璃风格） |
| `miniprogram/pages/login/index.wxss` | 登录页样式 |

## 云函数扩展

`cloudfunctions/quickstartFunctions/index.js` 新增 3 个接口：

| type | 功能 | 说明 |
|------|------|------|
| `getUserData` | 获取用户云端数据 | 查询 user_data 集合 |
| `saveUserData` | 增量保存数据 | 按 section 更新（checkin/studyStats/practiceHistory/slashProgress） |
| `migrateLocalData` | 迁移本地数据 | 合并策略：打卡取并集、学习取较大值、历史取较新、斩题取已斩并集 |

**新集合**：`user_data`（每个用户一个文档，`_openid` 自动关联）

## 改造文件

| 文件 | 改动 |
|------|------|
| `app.js` | onLaunch 接入 authManager.silentInit() |
| `app.json` | 注册 pages/login/index |
| `studyTimeManager.js` | 写操作后防抖2秒上云 studyStats |
| `checkinManager.js` | doCheckin 后上云 checkin |
| `practiceHistoryManager.js` | recordSession 后防抖2秒上云 |
| `slashManager.js` | saveClassProgress/saveQuestionProgress 内部统一上云 |
| `pages/index/index.js` | 所有功能入口加 ensureLogin 拦截 |
| `pages/mine/index.js` | 登录状态、退出登录、编辑资料前检查登录 |
| `pages/mine/index.wxml` | 新增"账号管理"卡片 |

## 数据同步策略

- **读取**：登录时从云端拉取全量到本地缓存，之后读取走本地（快速）
- **写入**：本地立即更新 + 防抖2秒异步上云（不阻塞 UI）
- **未登录时**：saveSection 静默跳过，避免无谓的云函数调用
- **首次登录迁移**：本地有数据 + 云端无数据 → 自动迁移上云

## 登录流程说明

1. 微信小程序的 `wx.login()` 是静默的，不会弹出可视登录页
2. 登录引导页是自定义页面，使用 `<button open-type="chooseAvatar">` 获取头像 + `<input type="nickname">` 获取昵称
3. 登录成功后返回原页面并执行被拦截的功能操作

## 待优化项

1. **错题本云端同步**：`wrongBook.js` 仍为纯本地存储，云函数接口（addWrongQuestion等）已就绪但前端未接通
2. **app onHide 同步**：可在应用切后台时强制同步一次未上传的脏数据
3. **网络异常重试**：当前上云失败仅记录标记，可增加自动重试机制

## 补充：题库跨设备同步

用户自导入的题库也需要跨设备同步，已实现：

- **新增云函数接口** `getMyBanks`：按 `ownerId = openid` 查询用户题库，确保数据隔离
- **改造 bank/list 页**：`loadCloudBanks` 从客户端直查改为调用云函数（之前不带 ownerId 过滤，换设备看不到自己的题库）
- 导入题库时 `importBank` 云函数已写入 `ownerId = openid`，现在查询也按 ownerId 过滤，闭环完成

## 补充：登录页UI精简

按用户要求精简登录页：

- 去掉 appname/slogan/特性卡片（刷题练习/斩题机制/错题本/云端同步）所有装饰文字
- 只保留基础信息授权：头像选择 + 昵称输入 + 隐私协议 + 登录按钮
- 背景换成首页白天背景图（随机一张），叠加半透明遮罩保证卡片可读性
- 登录卡片保持液态玻璃风格（backdrop-filter blur 24px）
