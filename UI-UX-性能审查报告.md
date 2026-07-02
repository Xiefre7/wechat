# 导题斩题小工具 — UI/UX 设计合规性与性能优化审查报告

> 审查时间：2026-07-02
> 审查范围：`miniprogram/` 全部页面、组件、样式与脚本
> 设计基线：iOS26 液态玻璃规范（主蓝 #007AFF / 深蓝文本 #102A56 / 背景浅蓝 #F3F8FF / 玻璃表面 rgba(255,255,255,0.58) 与 rgba(15,32,64,0.52) / 高光蓝 #5AC8FA / 正确 #34C759 / 错误 #FF3B30）

---

## 一、严重问题（违反设计规范或影响性能/可用性，必须修复）

### S1. 大量结构图标使用 emoji，违反"统一线性矢量图标"硬性规定

PRD 明确要求"结构图标不得使用 emoji，统一使用线性矢量图标"，但项目中至少 **30+ 处** 将 emoji 用作功能图标，且 `images/kzg/` 已经有完整的线性 SVG 图标库可复用。

| 文件 | 行号 | emoji | 用途 |
|------|------|-------|------|
| `pages/index/index.wxml` | 35 | 🔄 | 斩题复活通知图标 |
| `pages/index/index.wxml` | 119 | 📝 | 历史空状态图标 |
| `pages/practice/index.wxml` | 165 | 📖 | 题目解析标题图标 |
| `pages/practice/result.wxml` | 8 | 🎉 / 🧠 | 完成图标 |
| `pages/practice/result.wxml` | 69 | 📝 | 继续刷题按钮图标 |
| `pages/practice/result.wxml` | 73 | 🏠 | 返回首页按钮图标 |
| `pages/wrong/list/index.wxml` | 116 | 📝 | 错题空状态 |
| `pages/wrong/review/index.wxml` | 8 | 🎉 / 💪 | 复习完成图标 |
| `pages/wrong/review/index.wxml` | 186 | 📖 | 解析标题图标 |
| `pages/history/index.wxml` | 29 | 📚 | 历史空状态 |
| `pages/exam/list/index.wxml` | 55 | 📋 | 真题空状态 |
| `pages/slash/manage/index.wxml` | 73 | ⚔️ | 斩题空状态 |
| `pages/bank/list/index.wxml` | 136 | 📂 | 自导入空状态 |
| `pages/bank/import/index.wxml` | 38, 45, 50, 75, 82, 87, 113, 178, 182, 222, 223 | 📥 📁 ✅ 📄 📷 🖼️ ✏️ 🗑️ | 上传/编辑/删除图标 |
| `pages/bank/import-preview/index.wxml` | 264 | 📋 | 空状态 |
| `pages/bank/share-receive/index.wxml` | 14, 22, 41 | 😔 ✅ 📚 | 错误/成功/题库图标 |

**修复建议**：用 `/images/kzg/` 下已有 SVG（如 `book-blue.svg`、`file-blue.svg`、`pen-blue.svg`、`close-red.svg`、`delete-x-red.svg`）替换全部结构图标 emoji。完成页"🎉/💪/🧠"等情绪图标建议改为线性 SVG 或省略。

---

### S2. 错误反馈色与 PRD 规范不一致，且大面积使用橙色/朱红

PRD 规定：**错误反馈 = #FF3B30**，且**禁止大面积朱红/金色/橙色/紫色**。但项目：

- 自定义了一套错误色 `#F2545B`、`#FF6B4A`、`#FF5C4A`、`#EF4444`，与 PRD 的 `#FF3B30` 全部不符。
- `pages/practice/index.wxss:699` `.slash-float-btn` 使用 `background: rgba(249, 115, 22, 0.82)`，是 **大面积橙色填充**（斩题浮动按钮直径 128rpx），且带 `rgba(249, 115, 22, 0.35)` 脉冲光环（行 722），明显违反"禁止大面积橙色"。
- `pages/wrong/list/index.wxss:214` 复习按钮 `background: linear-gradient(135deg, #FF6B4A, #FF5C4A)`，整按钮朱红渐变。
- `pages/wrong/review/index.wxss:294` 提交按钮、行 628 操作按钮同样用 `linear-gradient(135deg, #FF6B4A, #FF5C4A)`。
- `pages/feedback/index.wxss:105` 反馈提交按钮重复使用同样的朱红渐变。
- `pages/slash/manage/index.wxss:153` `.revive-days` 使用金色 `#F5A623`，`.revive-tag` 使用 `#D97706` 金色 + `#FEF3C7` 金色背景。
- `pages/index/index.wxss:173` `.revive-badge` 使用 `rgba(245,166,35,...)` 金色渐变背景。

**修复建议**：
1. 全局替换：`#F2545B`、`#FF6B4A`、`#FF5C4A` → `#FF3B30`（错误反馈）。
2. 斩题浮动按钮改为液态玻璃 + 蓝色光晕（PRD："斩题动画使用蓝色液态光晕"），删除橙色脉冲光环。
3. 错题本/复习相关按钮改用 `#007AFF` 主蓝或液态玻璃样式。
4. `.revive-badge`、`.revive-tag`、`.revive-days` 改用 `#5AC8FA` 高光蓝或 `#007AFF` 主蓝，禁止金色。

---

### S3. "我的"页使用紫色，违反"禁止大面积紫色"

`pages/mine/index.wxss`：
- 行 34：`.ambient-strip` 包含 `rgba(124, 92, 252, 0.08)` 紫色径向光晕。
- 行 136：`.purple-bg { background: rgba(124, 92, 252, 0.10); }` 用作"总学习时长"图标背景（虽然单图标不大，但属于紫色 token）。
- 行 319：`.dock-item.active .dock-label` 使用 `linear-gradient(135deg, #4A8FEA, #7C5CFC)` 紫蓝渐变文字，dock 标签是页面持续显示元素，属中等面积紫色。

**修复建议**：
- `.ambient-strip` 第三层光晕改为 `rgba(90, 200, 250, 0.10)`（高光蓝）。
- `.purple-bg` 改为 `.cyan-bg { background: rgba(90, 200, 250, 0.10); }`。
- dock-label 渐变改为 `linear-gradient(135deg, #007AFF, #5AC8FA)`。

---

### S4. 深色模式下大量文本被设为深色 `#1A2538`，在深色背景上不可读

`app.js:166` 将深色模式背景设为 `#0F172A`（深蓝黑）。但多个页面在 `.theme-dark` 选择器下把次要文本设为 `#1A2538`（同样是深蓝黑），导致**深色文本在深色背景上几乎不可见**：

| 文件 | 行号 | 选择器 | 当前色 |
|------|------|--------|--------|
| `pages/index/index.wxss` | 966-967 | `.theme-dark .subtitle, .card-desc, .stat-label, .metric-label-small, .dock-label` | `#1A2538` |
| `pages/index/index.wxss` | 1080-1092 | `.theme-dark .section-more, .history-time, .history-count` | `#1A2538` |
| `pages/mine/index.wxss` | 395 | `.theme-dark .stat-label` | `#1A2538` |
| `pages/mine/index.wxss` | 425 | `.theme-dark .dock-label` | `rgba(255,255,255,0.45)`（可读，但行 313 浅色 dock-label 也是 `#1A2538`，浅色下可读但对比度偏低） |
| `pages/bank/list/index.wxss` | 443 | `.theme-dark .page-desc, .bank-meta, .kp-count` | `#1A2538` |
| `pages/practice/index.wxss` | 765, 792, 806 | `.theme-dark .option-text, .ref-text, .expl-content, .slash-body, .progress-text, ...` | `#1A2538` |
| `pages/wrong/list/index.wxss` | 421 | `.theme-dark .page-desc, .stat-label, .section-label, .wrong-meta, ...` | `#1A2538` |
| `pages/wrong/review/index.wxss` | 661, 677 | `.theme-dark .option-text, .ref-text, .option-key` | `#1A2538` |
| `pages/memorize/index.wxss` | 332, 335 | `.theme-dark .expl-content, .progress-text` | `#1A2538` |
| `pages/feedback/index.wxss` | 124, 137, 143, 147 | `.theme-dark .type-chip, .feedback-textarea, .contact-input, .placeholder, .char-count` | `#1A2538` |
| `pages/placeholder/index.wxss` | 86 | `.theme-dark .desc` | `#1A2538` |
| `pages/exam/list/index.wxss` | 241 | `.theme-dark .page-desc, .exam-meta` | `#1A2538` |
| `pages/history/index.wxss` | 276 | `.theme-dark .history-date, .progress-count, .empty-text, .empty-desc` | `#1A2538` |

**修复建议**：深色模式下次要文本应使用 `rgba(255,255,255,0.55)` ~ `rgba(255,255,255,0.7)`，禁用 `#1A2538`。建议在 `app.wxss` 引入深色 token 变量统一管理。

---

### S5. 触控目标低于 44pt（88rpx）下限

PRD："所有触控目标≥44pt（88rpx）"。以下可点击元素未达标：

| 文件 | 行号 | 元素 | min-height | 问题 |
|------|------|------|-----------|------|
| `components/question-card/index.wxss` | 44 | `.option-item` | 76rpx | 选项卡片，点击作答 |
| `pages/practice/index.wxss` | 168 | `.option-item` | 76rpx | 同上 |
| `pages/wrong/review/index.wxss` | 172 | `.option-item` | 76rpx | 同上 |
| `pages/practice/index.wxss` | 473 | `.judge-btn` | 72rpx | 简答自判按钮 |
| `pages/wrong/review/index.wxss` | 397 | `.judge-btn` | 72rpx | 同上 |
| `pages/practice/index.wxss` | 319, 341 | `.add-wrong-btn`, `.in-wrong-book` | 80rpx | 加入错题本按钮 |
| `pages/wrong/review/index.wxss` | 287-296 | `.submit-btn` | 96rpx ✓ 但 `.next-btn` 88rpx ✓ | — |
| `pages/bank/list/index.wxss` | 208 | `.review-btn` | 56rpx | 错题本"去复习"按钮（行 208） |
| `pages/bank/list/index.wxss` | 247-258 | `.bank-delete` | 44rpx（44×44rpx） | 删除按钮，远低于 88rpx |
| `pages/wrong/list/index.wxss` | 343 | `.clean-btn` | 76rpx | 清理按钮 |
| `pages/index/index.wxss` | 592 | `.dock-item` | 56rpx | dock 项容器（虽然父级 dock-item 96rpx，但单 item 内只有 56rpx） |
| `pages/bank/import-manual/index.wxss` | 232 | `.tf-item` | 56rpx | 判断题选项 |
| `pages/bank/import-preview/index.wxss` | 441 | `.q-image-delete` | 56rpx | 图片删除 × |

**修复建议**：将所有可点击元素的 `min-height` 提升至 ≥88rpx；空间受限的删除/关闭小按钮可通过扩大 `padding` 增大命中区域，或保留视觉小尺寸但用透明 `padding` 拓展点击区。

---

### S6. `pages/bank/import-preview/index.js` 输入即全量 setData，严重性能问题

`onItemFieldChange`（行 169-174）、`onItemOptionChange`（行 176-183）、`onItemTypeChange`（行 185-218）等编辑回调中，每次输入都执行 `this.setData({ questions })`，**questions 是完整题目数组**（最多 500 题）。

```js
onItemFieldChange(e) {
  const { index, field } = e.currentTarget.dataset;
  const questions = [...this.data.questions];
  questions[index] = { ...questions[index], [field]: e.detail.value };
  this.setData({ questions });   // ← 每次按键都触发整列表重渲染
}
```

每次输入字符都会序列化整个题目数组并重新渲染所有题目卡片，在 500 题规模下会导致明显卡顿。

**修复建议**：使用路径表达式精确更新：
```js
this.setData({
  [`questions[${index}].${field}`]: e.detail.value
});
```
对 `onItemOptionChange` 同理：`[`questions[${index}].options[${optIndex}].text`]`。

---

### S7. 斩题管理页深色模式机制与其他页面不一致，主题切换失效

`pages/slash/manage/index.wxss:214` 使用 `@media (prefers-color-scheme: dark)`，而项目其他所有页面通过 `.theme-dark` 类驱动（app.js 手动控制）。

```css
/* 错误：依赖系统媒体查询 */
@media (prefers-color-scheme: dark) {
  page { background: #0F172A; }
  ...
}
```

后果：当用户在 app 内手动选择"浅色"或"深色"时，斩题管理页**不会跟随**用户选择，只有系统级主题才生效。

**修复建议**：
1. `pages/slash/manage/index.wxml` 根节点加 `{{isDark ? 'theme-dark' : ''}}` 类。
2. wxss 把 `@media (prefers-color-scheme: dark)` 改为 `.theme-dark` 选择器前缀。
3. `pages/slash/manage/index.js` 在 `onLoad/onShow` 中读取 `app.globalData.effectiveTheme` 并 `setData({ isDark })`，与其他页面统一。

---

### S8. 占位页、斩题管理页、导入相关页面注释为"百词斩风格"，与 PRD 风格冲突

| 文件 | 行号 | 注释 |
|------|------|------|
| `pages/placeholder/index.wxss` | 1 | `/* 占位页 — 百词斩风格 */` |
| `pages/slash/manage/index.wxss` | 1 | `/* 斩题管理页 — 百词斩风格 */` |
| `pages/bank/import/index.wxss` | 1 | `/* 题库导入页 — 百词斩风格 */` |
| `pages/bank/import-manual/index.wxss` | 1 | `/* 手动录入页 — 百词斩风格 */` |
| `pages/bank/import-preview/index.wxss` | 1 | `/* 预览修正页 — 百词斩风格 */` |

设计规范要求 iOS26 液态玻璃风格，"百词斩风格"暗示了不同的视觉方向（白卡片+橙色主调）。这些页面的实际样式也偏离液态玻璃规范：
- `pages/slash/manage/index.wxss:86` `.glass-card` 使用 `background: rgba(255,255,255,0.72)` 而非规范的 `rgba(255,255,255,0.58)`，且 `box-shadow` 用 `rgba(0,0,0,0.03)` 而非 `rgba(74,143,234,0.08)` 蓝色阴影。
- `pages/slash/manage/index.wxss:174` `.rollback-btn` 使用 `#EF4444` 朱红文字 + `#FEF2F2` 浅红背景，违反"禁止大面积朱红"。

**修复建议**：统一改为液态玻璃规范——`background: rgba(255,255,255,0.58)`、`border: 1rpx solid rgba(255,255,255,0.45)`、`box-shadow: inset 0 1rpx 0 rgba(255,255,255,0.78), 0 14rpx 48rpx rgba(74,143,234,0.08)`。撤销按钮改用 `#FF3B30` 错误色 + `rgba(255,59,48,0.08)` 浅红背景。注释统一改为"iOS26 液态玻璃风格"。

---

## 二、中等问题（影响体验一致性）

### M1. `pages/login/index.wxss` 使用 `blur(50px)` 而非 rpx，且未走 `.theme-dark` 类机制

- 行 58-59、88-89：`backdrop-filter: blur(50px) saturate(1.6)` 使用 `px` 单位（项目唯一一处），在不同 DPR 设备上模糊量不一致；其他页面统一使用 `blur(34rpx)` 或 `blur(40rpx)`。
- 行 18-21：`.login-page.dark` 用 `.dark` 类切换深色，而项目其他页面用 `.theme-dark`，且 `pages/login/index.wxml` 需要检查是否绑定 `isDark`。

**修复建议**：
1. 将 `blur(50px)` 改为 `blur(50rpx)`。
2. 统一使用 `.theme-dark` 类名，根节点绑定 `{{isDark ? 'theme-dark' : ''}}`。

---

### M2. 多处 `background: #FFFFFF` 纯白卡片违反"禁止大白卡片"规定

| 文件 | 行号 | 选择器 | 说明 |
|------|------|--------|------|
| `pages/practice/index.wxss` | 27 | `.top-bar` | 顶部栏纯白 `#FFFFFF`，虽有 `backdrop-filter: blur(40rpx)` 但底色不透明，不是液态玻璃 |
| `pages/practice/index.wxss` | 112, 120 | `.glass-card`, `.glass-input` | `background: #FFFFFF` 完全不透明，丧失玻璃感 |
| `pages/memorize/index.wxss` | 27, 113 | `.top-bar`, `.glass-card` | 同上 |
| `pages/bank/list/index.wxss` | 80 | `.tab-item` | 纯白 `#FFFFFF` |
| `pages/exam/list/index.wxss` | 84 | `.tab-item` | 同上 |
| `pages/bank/import/index.wxss` | 460 | 某元素 | 纯白 |
| `components/question-card/index.wxss` | 143 | `.glass-card` | 组件内 `.glass-card` 是 `#FFFFFF`，被各页面复用 |

**修复建议**：所有"glass-card"基类统一为 `background: rgba(255,255,255,0.58)` + `border: 1rpx solid rgba(255,255,255,0.45)` + `backdrop-filter: blur(34rpx) saturate(180%)`。`.top-bar` 改为 `background: rgba(255,255,255,0.72)` 半透明。`.tab-item` 改为 `rgba(255,255,255,0.58)`。

---

### M3. 斩题动画无法跳过，且未适配 reduce-motion

PRD："斩题动画使用蓝色液态光晕，可跳过，≤2.5秒"。

- `pages/practice/index.wxss:723` `.slash-float-ring` 动画 `slashPulse 1.8s ease-out infinite` —— **无限循环**脉冲光环，没有结束时间。
- `pages/practice/index.js:442-460` `onSlashButtonTap` 直接 `setData({ showSlashButton: false })` + `wx.showToast`，并无显式的"斩题动画"播放流程，也没有"跳过"按钮。`wx.showToast` 默认 1500ms，符合 ≤2.5s，但视觉反馈较弱。
- 全项目 **未检测到** `prefers-reduced-motion` 适配（`@media (prefers-reduced-motion: reduce)` 全部缺失）。

**修复建议**：
1. 若需完整斩题动画，新增一个 ≤2500ms 的液态光晕动画（蓝色径向 + 缩放），并提供"跳过"按钮。
2. 全局加 `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }`。
3. `.slash-float-ring` 的 `infinite` 改为 `1.5s ease-out 2`（最多循环 2 次）或加 `animation-iteration-count` 限制。

---

### M4. 错题选项抖动动画 `shake 0.4s` 无 reduce-motion 适配，可能引起不适

`pages/practice/index.wxss:64-68`、`pages/wrong/review/index.wxss:192-196`、`components/question-card/index.wxss:64-68` 三处定义 `@keyframes shake` 抖动动画，答错时触发。虽然时长 0.4s 短，但前庭敏感用户可能不适。

**修复建议**：在 `app.wxss` 加全局 `@media (prefers-reduced-motion: reduce) { .option-item.wrong { animation: none; } }`。

---

### M5. `images/bg/` 目录与 `images/bg-light/` 内容重复，浪费 180KB

- `images/bg/` 6 张图共 180KB
- `images/bg-light/` 6 张图共 180KB
- `app.js:4-11` 只引用 `/images/bg-light/`，**`images/bg/` 全部是未引用的冗余资源**。
- 虽然 `diff -q` 显示两目录文件字节不同（可能轻微压缩差异），但视觉内容相同。

**修复建议**：删除 `images/bg/` 目录，节省 180KB 主包体积。

---

### M6. 背景图未使用懒加载，且 `background-image` 组件每次 `show` 都触发 setData

`components/background-image/index.js:36-39`：
```js
pageLifetimes: {
  show() {
    this.refreshBackground();   // ← 每次页面显示都重新 setData
  }
}
```
`refreshBackground` 内 `setData({ imagePath, overlayClass })`，即使主题和图片未变也会触发。多页面切换时累积调用。

**修复建议**：
1. `refreshBackground` 内加缓存比较：`if (this.data.imagePath === imagePath && this.data.overlayClass === overlayClass) return;`
2. `bg-image` 是固定背景图，可考虑加 `lazy-load` 属性（虽然 `<image>` 的 `lazy-load` 主要对列表有效，但无副作用）。

---

### M7. `practice/index.js` 选择题点击时连续两次 setData

`pages/practice/index.js:238-258` `selectOption`：
```js
if (this.data.isMultiChoice) {
  const selectedAnswers = { ...this.data.selectedAnswers };
  ...
  this.setData(data);                  // 第一次
  this.refreshOptions({ selectedAnswers });  // 内部又 setData（行 234）
} else {
  const data = { selectedAnswer: key };
  this.setData(data);                  // 第一次
  this.refreshOptions({ selectedAnswer: key }); // 第二次
}
```
`refreshOptions`（行 233-235）内部 `setData({ processedOptions: ... })`，所以每次点选都触发 2 次 setData 渲染。

**修复建议**：合并为一次：
```js
this.setData({
  selectedAnswers,
  processedOptions: this.buildOptionClasses(null, { selectedAnswers })
});
```
同样问题见 `pages/wrong/review/index.js:201-204`、`212`。

---

### M8. `pages/index/index.js` onShow 中 4 次独立 setData

`pages/index/index.js:96-107` `onShow` 依次调用 `loadUserData()`、`loadCheckinData()`、`loadStudyData()`、`loadHistoryData()`，每个函数内部各自 `setData`，外加 revive 通知 setData，共 **5 次连续 setData**。

**修复建议**：合并为一次批量 setData：
```js
const userInfo = app.getUserInfo();
const checkin = checkinManager.getCheckinSummary();
const wrongStats = wrongBook.getGlobalStats();
...
this.setData({
  userAvatar: userInfo.avatarUrl,
  'summary.checkinStreak': checkin.streak,
  ...
});
```

---

### M9. `practice/index.js` 完成会话 `setData({ finished: true })` 后立即 `redirectTo`，setData 多余

`pages/practice/index.js:731-735`：
```js
this.setData({ finished: true });   // 多余，紧接着 redirectTo 会销毁页面
wx.redirectTo({ url: '/pages/practice/result' });
```
`finished: true` 不会触发任何 UI 更新（页面被销毁）。

**修复建议**：删除 `this.setData({ finished: true })`。

---

### M10. `app.json` 预加载策略可优化

`app.json:72-81`：
```json
"preloadRule": {
  "pages/index/index": { "network": "all", "packages": ["bank", "practice"] },
  "pages/bank/list/index": { "network": "all", "packages": ["practice", "wrong"] }
}
```
- `pages/index/index` 主页预加载 `bank` + `practice` 两个分包合理。
- 但 `memorize`、`wrong` 分包未在任何入口预加载，错题复习入口未配置。
- `network: "all"` 包含弱网，可能影响首屏。

**修复建议**：
1. `pages/wrong/list/index` 加预加载 `practice`（用户常从错题去练习）。
2. `pages/practice/index` 加预加载 `wrong`（错题自动收录后用户可能去错题本）。
3. 主页预加载改为 `"network": "wifi"` 减少弱网负担。

---

### M11. 主包图片资源偏大，未做压缩优化

- `images/ai_example2.png` 58KB、`images/bg-light/1.jpg` 33KB、`images/bg-light/3.jpg` 30KB —— 背景图单张 30KB+ 偏大。
- `images/icons/avatar.png` 13KB、`images/cloud_dev.png` 13KB —— 看似未使用，可清理。
- 主包体积约 1.2MB（接近 1.5MB 上限）。

**修复建议**：
1. 背景图用 WebP 格式（小程序支持），可省 50%+ 体积。
2. 清理未引用的 `cloud_dev.png`、`scf-enter.png`、`create_cbr.png`、`create_cbrf.png`、`create_env.png`、`database.png`、`database_add.png`、`default-goods-image.png`、`env-select.png`、`function_deploy.png`、`ai_example1.png`、`ai_example2.png`、`avatar.png`（根目录）、`icons/avatar.png`（与 `images/icons/avatar.png` 重复）—— 这些是云开发模板遗留图，业务代码未使用。
3. 已使用 SVG 的图标保持，剩余 PNG 图标可考虑转 SVG。

---

## 三、轻微问题（优化建议）

### L1. 全局 `app.wxss` 过于简陋，未定义设计 Token

`app.wxss` 仅 38 行，只定义了 `page` 基础样式，没有：
- CSS 变量（`--color-primary`、`--color-bg-glass` 等）
- 全局 `.glass-card`、`.pressing`、`.safe-bottom` 公共类
- 深色模式 token 切换

导致每个页面都重复定义 `.glass-card`、`.pressing`、`.safe-bottom` 等相同样式（全项目 15+ 处重复定义 `.glass-card`）。

**修复建议**：在 `app.wxss` 提取公共 token 与组件类：
```css
page {
  --color-primary: #007AFF;
  --color-text: #102A56;
  --color-bg: #F3F8FF;
  --color-glass-light: rgba(255,255,255,0.58);
  --color-glass-dark: rgba(15,32,64,0.52);
  --color-border-glass: rgba(255,255,255,0.45);
  --color-correct: #34C759;
  --color-wrong: #FF3B30;
  --color-highlight: #5AC8FA;
}
.theme-dark page {
  --color-text: #FFFFFF;
  --color-bg: #0F172A;
  ...
}
.glass-card { /* 全局定义 */ }
.pressing { /* 全局定义 */ }
.safe-bottom { height: calc(env(safe-area-inset-bottom) + 48rpx); }
```

---

### L2. 颜色 token 与 PRD 不一致

项目主色使用 `#4A8FEA`（深一点），而 PRD 规定主蓝 `#007AFF`。`#4A8FEA` 仅在 `pages/login/index.wxss` 中作为渐变 stop 出现，其他页面大量使用 `#4A8FEA`。

**修复建议**：全局将 `#4A8FEA` 替换为 `#007AFF`（保留 `#5AC8FA` 作为高光蓝）。或显式说明 `#4A8FEA` 是主蓝的派生色并写入 token。

---

### L3. `pages/bank/list/index.wxss:271-279` `.share-btn` 使用 `!important` 且 padding-left 190rpx 离谱

```css
.share-btn {
  padding-left: 190rpx !important;   /* 用 !important 撑开 hit area，hack 写法 */
  opacity: 0.5;
}
```
`padding-left: 190rpx` 是为了让 `button[open-type="share"]` 的点击区扩大到整个卡片，但 `!important` 与巨大 padding 是 hack。

**修复建议**：用 `::after` 透明覆盖层扩大点击区，或调整结构使 share 按钮包裹整行。

---

### L4. `pages/index/index.wxml:147` FAB 按钮 `filter: brightness(0) invert(1)` 把图标变白

```css
.floating-icon {
  filter: brightness(0) invert(1);   /* 把任意 SVG 强制变白 */
}
```
该 filter 会将 SVG 图标先变黑再反相为白，丢失原图色彩。如果 `pen-blue.svg` 本身是蓝色矢量，应直接用白色版本。

**修复建议**：新增 `pen-white.svg` 或用 CSS `color` + `mask` 方式着色，避免 filter 破坏图标细节。

---

### L5. `pages/practice/index.wxss:417` `.add-wrong-label` 用 `#FF6B4A` 错题本加入按钮文字

加入错题本是中性操作，不应使用警告色。同问题见 `pages/wrong/list/index.wxss:167` `.bank-icon-text`。

**修复建议**：改用主蓝 `#007AFF` 或 `#5E718D` 中性灰。

---

### L6. 文字大小不可调，无 `font-size` 响应式

PRD："文字大小是否可调"。项目所有 `font-size` 都是固定 rpx，没有根据系统字体大小缩放。

**修复建议**：小程序可在 `app.js` 读取 `wx.getSystemInfoSync().fontSizeSetting`，按比例换算 rpx；或使用 `rem`（小程序支持有限）。

---

### L7. `pages/wrong/list/index.wxml:116` 空状态图标 📝 与 `pages/index/index.wxml:119` 重复

多处空状态用相同 emoji 📝，缺乏区分度。

**修复建议**：每个空状态用专属线性 SVG（如错题本用 `book-pen.svg`，历史用 `history-blue.svg`）。

---

### L8. `pages/bank/import-manual/index.wxml:97, 101` 判断题选项用文字"对 ✓""错 ✗"

```html
<view class="tf-text">对 ✓</view>
<view class="tf-text">错 ✗</view>
```
虽然 ✓ ✗ 是 Unicode 符号不算 emoji，但与 PRD"统一线性矢量图标"略有出入。

**修复建议**：判断题选项用 `check-blue.svg` / `close-red.svg` 图标 + 文字。

---

### L9. `pages/history/index.wxss:69-71` 骨架屏 `shimmer` 动画无限循环

```css
@keyframes shimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```
`animation: shimmer 1.5s infinite`，加载完成前一直循环。无 reduce-motion 适配。

**修复建议**：加 `@media (prefers-reduced-motion: reduce) { .skeleton-line { animation: none; opacity: 0.6; } }`。

---

### L10. `pages/bank/list/index.wxss:185` `.bank-tag` 自导入标签用橙色 `#FF9500`

`#FF9500` 是橙色，PRD 禁止大面积橙色。虽然标签面积小，但多处累计形成视觉碎片。

**修复建议**：`.bank-tag` 改用 `#5AC8FA` 高光蓝 + `rgba(90,200,250,0.12)` 背景。`pages/exam/list/index.wxss:179` `.exam-subcategory`、`pages/wrong/list/index.wxss:192` `.meta-item.due` 同样改色。

---

### L11. `pages/practice/result.wxml:99-100, 142-143` 答题详情用 ✓/✗ Unicode 符号

虽然不是 emoji，但 PRD 要求线性矢量图标。建议用 SVG 替换或在 CSS 中用 `::before` 绘制。

---

### L12. 主包总体积约 1.2MB，接近但未超 1.5MB 目标

- 主包 ≈ 总体积 1.7MB − 分包 0.5MB ≈ **1.2MB**
- 删除冗余 `images/bg/`（180KB）+ 未引用云开发模板图（约 80KB）后可降至约 **0.95MB**，留出余量。

**修复建议**：执行 M5 + M11 清理后重新测包。

---

## 四、汇总与优先级建议

| 优先级 | 编号 | 问题 | 影响 |
|--------|------|------|------|
| P0 立即修复 | S1 | 30+ 处 emoji 用作结构图标 | 设计规范硬性违规 |
| P0 立即修复 | S2 | 错误色与 PRD 不符 + 大面积橙色/朱红 | 设计规范硬性违规 |
| P0 立即修复 | S3 | "我的"页紫色 | 设计规范硬性违规 |
| P0 立即修复 | S4 | 深色模式文本 `#1A2538` 不可读 | 用户可用性严重受损 |
| P0 立即修复 | S5 | 触控目标 < 44pt | 用户可用性 |
| P0 立即修复 | S6 | import-preview 输入即全量 setData | 性能严重问题 |
| P0 立即修复 | S7 | 斩题管理页深色模式机制不一致 | 主题切换失效 |
| P0 立即修复 | S8 | "百词斩风格"页面偏离液态玻璃规范 | 设计一致性 |
| P1 尽快修复 | M1-M11 | 单位/白卡片/动画/冗余资源/setData 重复 | 体验一致性 + 性能 |
| P2 后续优化 | L1-L12 | Token 缺失/颜色不一致/可访问性 | 长期可维护性 |

---

## 五、修复路径建议

1. **第一步（设计 token 化）**：在 `app.wxss` 引入 CSS 变量与公共类（`.glass-card`、`.pressing`、`.safe-bottom`、`.theme-dark` 文本 token），删除各页面重复定义。
2. **第二步（颜色合规）**：全局 sed 替换错误色 `#F2545B`/`#FF6B4A`/`#FF5C4A`/`#EF4444` → `#FF3B30`；金色 `#F5A623`/`#D97706` → `#5AC8FA`；紫色 `#7C5CFC`/`rgba(124,92,252,...)` → `#5AC8FA`/`rgba(90,200,250,...)`；橙色 `#FF9500`/`#F97316` → `#5AC8FA`。
3. **第三步（emoji 清理）**：遍历 wxml，将所有 emoji 替换为 `images/kzg/` 下对应 SVG。
4. **第四步（深色文本修复）**：批量将 `.theme-dark` 下的 `color: #1A2538` 替换为 `color: rgba(255,255,255,0.6)`。
5. **第五步（触控目标）**：批量调整 `min-height` ≥ 88rpx。
6. **第六步（性能优化）**：合并 setData、删除冗余图片、修复 import-preview 路径化 setData。
7. **第七步（动画合规）**：加 `@media (prefers-reduced-motion: reduce)` 全局适配，斩题动画补跳过按钮。

完成上述 7 步后，项目应能通过 iOS26 液态玻璃规范与性能双维度审查。

---

**审查人**：CodeBuddy UI/UX 与性能审查
**报告完成**：2026-07-02
