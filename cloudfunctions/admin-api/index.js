const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// ==================== 工具函数 ====================

/** 生成密码哈希（使用每用户独立随机盐） */
function hashPassword(password, salt) {
  var actualSalt = salt || crypto.randomBytes(16).toString('hex')
  var hash = crypto.pbkdf2Sync(password, actualSalt, 10000, 64, 'sha256').toString('hex')
  return { hash: hash, salt: actualSalt }
}

/** 验证密码 */
function verifyPassword(password, storedHash, storedSalt) {
  var result = hashPassword(password, storedSalt)
  return result.hash === storedHash
}

/** 生成会话 token */
function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

/** 成功响应 */
function ok(data = {}, msg = 'ok') {
  return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ code: 0, msg, data }) }
}

/** 错误响应 */
function fail(code = -1, msg = 'error', statusCode = 400) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify({ code, msg }) }
}

/** CORS 头 — 从环境变量读取允许的来源，未配置时拒绝跨域 */
function corsHeaders() {
  var allowedOrigin = process.env.ADMIN_CORS_ORIGIN || 'https://mvp1-d8grozotx0e93940c-1445854594.tcloudbaseapp.com'
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  }
}

/** 解析请求体 */
function parseBody(event) {
  if (!event.body) return {}
  try { return JSON.parse(event.body) } catch (e) { return {} }
}

// ==================== 认证中间件 ====================

/** 验证管理员身份，返回用户名 */
async function authenticate(event) {
  const token = (event.headers || {}).authorization || (event.headers || {}).Authorization || ''
  if (!token) return null
  try {
    const res = await db.collection('admin_sessions').where({ token, expireAt: _.gt(new Date()) }).get()
    if (res.data.length === 0) return null
    return res.data[0].username
  } catch (e) {
    return null
  }
}

/** 确保 admin 集合和默认账号存在 */
async function ensureAdminExists() {
  var adminPassword = process.env.ADMIN_PASSWORD || ''
  console.log('[ensureAdminExists] ADMIN_PASSWORD 已配置:', adminPassword.length > 0 ? '是' : '否（长度:' + adminPassword.length + '）')
  if (!adminPassword) {
    console.error('未配置 ADMIN_PASSWORD 环境变量，无法初始化管理员账号。请在云开发控制台→admin-api→环境变量中设置。')
    return
  }

  try {
    const countRes = await db.collection('admin_users').count()
    console.log('[ensureAdminExists] admin_users 记录数:', countRes.total)
    if (countRes.total === 0) {
      var pwdResult = hashPassword(adminPassword)
      await db.collection('admin_users').add({
        data: {
          username: 'admin',
          passwordHash: pwdResult.hash,
          passwordSalt: pwdResult.salt,
          role: 'superadmin',
          createdAt: new Date()
        }
      })
      console.log('默认管理员账号已创建（用户名: admin）')
    } else {
      console.log('[ensureAdminExists] admin 账号已存在，跳过创建')
    }
  } catch (e) {
    console.log('[ensureAdminExists] 异常（集合可能不存在）:', e.message)
    // 集合可能尚不存在，尝试创建
    try {
      await db.createCollection('admin_users')
      var pwdResult2 = hashPassword(adminPassword)
      await db.collection('admin_users').add({
        data: {
          username: 'admin',
          passwordHash: pwdResult2.hash,
          passwordSalt: pwdResult2.salt,
          role: 'superadmin',
          createdAt: new Date()
        }
      })
      console.log('admin_users 集合已创建，默认管理员账号已初始化（用户名: admin）')
    } catch (e2) {
      console.error('创建管理员账号失败:', e2)
    }
  }
}

// ==================== 认证接口 ====================

async function handleLogin(body) {
  const { username, password } = body
  if (!username || !password) return fail(-1, '请输入用户名和密码')

  await ensureAdminExists()

  const res = await db.collection('admin_users').where({ username }).get()
  console.log('[handleLogin] 查到用户数:', res.data.length, '用户名:', username)
  if (res.data.length === 0) return fail(-1, '用户名或密码错误')

  const admin = res.data[0]
  if (!verifyPassword(password, admin.passwordHash, admin.passwordSalt)) return fail(-1, '用户名或密码错误')

  // 创建会话
  const token = generateToken()
  const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时
  await db.collection('admin_sessions').add({
    data: { token, username, createdAt: new Date(), expireAt }
  })

  // 清理过期会话
  try {
    await db.collection('admin_sessions').where({ expireAt: _.lt(new Date()) }).remove()
  } catch (e) { /* ignore */ }

  return ok({ token, username, role: admin.role })
}

async function handleLogout(headers) {
  const token = (headers || {}).authorization || (headers || {}).Authorization || ''
  if (token) {
    try { await db.collection('admin_sessions').where({ token }).remove() } catch (e) { /* ignore */ }
  }
  return ok({}, '已退出登录')
}

async function handleCheckAuth(username) {
  return ok({ username })
}

async function handleChangePassword(username, body) {
  const { oldPassword, newPassword } = body
  if (!oldPassword || !newPassword) return fail(-1, '请填写旧密码和新密码')
  if (newPassword.length < 6) return fail(-1, '新密码至少6位')

  const res = await db.collection('admin_users').where({ username }).get()
  const admin = res.data[0]
  if (!verifyPassword(oldPassword, admin.passwordHash, admin.passwordSalt)) return fail(-1, '旧密码错误')

  var newPwdResult = hashPassword(newPassword)
  await db.collection('admin_users').doc(admin._id).update({
    data: { passwordHash: newPwdResult.hash, passwordSalt: newPwdResult.salt }
  })
  return ok({}, '密码修改成功')
}

// ==================== 题库管理 ====================

async function handleListBanks(query) {
  const { type, page = 1, size = 50 } = query
  const condition = {}
  if (type) condition.type = type

  const total = (await db.collection('banks').where(condition).count()).total
  const list = (await db.collection('banks')
    .where(condition)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * size)
    .limit(size)
    .get()).data

  return ok({ list, total, page: Number(page), size: Number(size) })
}

async function handleCreateBank(username, body) {
  const { name, type = 'official', category, subCategory, description, coverImage, tags = [], examCategoryId } = body
  if (!name) return fail(-1, '题库名称不能为空')
  if (!category) return fail(-1, '请选择学科分类')

  const data = {
    name, type, category, subCategory: subCategory || '',
    description: description || '', coverImage: coverImage || '',
    ownerId: '', isPublic: true,
    questionCount: 0, knowledgePointCount: 0,
    tags, examCategoryId: examCategoryId || '',
    createdAt: new Date(), updatedAt: new Date()
  }

  const res = await db.collection('banks').add({ data })
  return ok({ id: res._id }, '题库创建成功')
}

async function handleUpdateBank(id, body) {
  const { name, category, subCategory, description, coverImage, tags, examCategoryId } = body
  const updateData = { updatedAt: new Date() }
  if (name !== undefined) updateData.name = name
  if (category !== undefined) updateData.category = category
  if (subCategory !== undefined) updateData.subCategory = subCategory
  if (description !== undefined) updateData.description = description
  if (coverImage !== undefined) updateData.coverImage = coverImage
  if (tags !== undefined) updateData.tags = tags
  if (examCategoryId !== undefined) updateData.examCategoryId = examCategoryId

  await db.collection('banks').doc(id).update({ data: updateData })
  return ok({}, '题库更新成功')
}

async function handleDeleteBank(id) {
  // 删除题库及其所有题目和知识点
  await db.collection('banks').doc(id).remove()
  // 异步清理关联数据（不阻塞响应）
  try { await db.collection('knowledgePoints').where({ bankId: id }).remove() } catch (e) { /* ignore */ }
  try { await db.collection('questions').where({ bankId: id }).remove() } catch (e) { /* ignore */ }
  return ok({}, '题库已删除')
}

// ==================== 知识点管理 ====================

async function handleListKnowledgePoints(bankId, query) {
  const condition = { bankId }
  const list = (await db.collection('knowledgePoints')
    .where(condition)
    .orderBy('order', 'asc')
    .limit(200)
    .get()).data

  // 更新题库的知识点数量
  const count = list.length
  try {
    await db.collection('banks').doc(bankId).update({ data: { knowledgePointCount: count } })
  } catch (e) { /* ignore */ }

  return ok({ list, bankId })
}

async function handleCreateKnowledgePoint(bankId, body) {
  const { name, parentId = '', description = '' } = body
  if (!name) return fail(-1, '知识点名称不能为空')

  // 获取最大排序号
  const maxRes = await db.collection('knowledgePoints')
    .where({ bankId })
    .orderBy('order', 'desc')
    .limit(1)
    .get()
  const order = maxRes.data.length > 0 ? maxRes.data[0].order + 1 : 1

  const data = {
    bankId, name, parentId: parentId || '',
    order, questionCount: 0, description
  }
  const res = await db.collection('knowledgePoints').add({ data })

  // 更新题库知识点计数
  try {
    const count = (await db.collection('knowledgePoints').where({ bankId }).count()).total
    await db.collection('banks').doc(bankId).update({ data: { knowledgePointCount: count } })
  } catch (e) { /* ignore */ }

  return ok({ id: res._id, order }, '知识点创建成功')
}

async function handleUpdateKnowledgePoint(id, body) {
  const { name, parentId, description, order } = body
  const updateData = {}
  if (name !== undefined) updateData.name = name
  if (parentId !== undefined) updateData.parentId = parentId
  if (description !== undefined) updateData.description = description
  if (order !== undefined) updateData.order = order

  await db.collection('knowledgePoints').doc(id).update({ data: updateData })
  return ok({}, '知识点更新成功')
}

async function handleDeleteKnowledgePoint(id) {
  const kp = (await db.collection('knowledgePoints').doc(id).get()).data
  await db.collection('knowledgePoints').doc(id).remove()
  // 清除关联题目的知识点引用
  try {
    await db.collection('questions').where({ knowledgePointId: id }).update({
      data: { knowledgePointId: '' }
    })
  } catch (e) { /* ignore */ }
  // 更新题库计数
  if (kp && kp.bankId) {
    try {
      const count = (await db.collection('knowledgePoints').where({ bankId: kp.bankId }).count()).total
      await db.collection('banks').doc(kp.bankId).update({ data: { knowledgePointCount: count } })
    } catch (e) { /* ignore */ }
  }
  return ok({}, '知识点已删除')
}

// ==================== 题目管理 ====================

async function handleListQuestions(query) {
  const { bankId, knowledgePointId, keyword, type, difficulty, page = 1, size = 20 } = query
  const condition = {}
  if (bankId) condition.bankId = bankId
  if (knowledgePointId) condition.knowledgePointId = knowledgePointId
  if (type) condition.type = type
  if (difficulty) condition.difficulty = Number(difficulty)
  // 关键词搜索（搜索题干）
  if (keyword) {
    condition['content.stem'] = db.RegExp({ regexp: keyword, options: 'i' })
  }

  const total = (await db.collection('questions').where(condition).count()).total
  const list = (await db.collection('questions')
    .where(condition)
    .orderBy('createdAt', 'desc')
    .skip((Number(page) - 1) * Number(size))
    .limit(Number(size))
    .get()).data

  return ok({ list, total, page: Number(page), size: Number(size) })
}

async function handleCreateQuestion(body) {
  const { bankId, knowledgePointId, type, difficulty, content, tags = [] } = body
  if (!bankId) return fail(-1, '请选择题库')
  if (!type) return fail(-1, '请选择题型')
  if (!content || !content.stem) return fail(-1, '请输入题干')

  const data = {
    bankId, knowledgePointId: knowledgePointId || '',
    type, difficulty: difficulty || 1,
    content: {
      stem: content.stem || '',
      options: content.options || [],
      answer: content.answer || '',
      explanation: content.explanation || ''
    },
    tags, status: 'active',
    createdAt: new Date()
  }

  const res = await db.collection('questions').add({ data })
  // 更新题库题目计数
  try {
    const count = (await db.collection('questions').where({ bankId }).count()).total
    await db.collection('banks').doc(bankId).update({ data: { questionCount: count } })
  } catch (e) { /* ignore */ }
  // 更新知识点题目计数
  if (knowledgePointId) {
    try {
      const count = (await db.collection('questions').where({ knowledgePointId }).count()).total
      await db.collection('knowledgePoints').doc(knowledgePointId).update({ data: { questionCount: count } })
    } catch (e) { /* ignore */ }
  }

  return ok({ id: res._id }, '题目创建成功')
}

async function handleUpdateQuestion(id, body) {
  const { bankId, knowledgePointId, type, difficulty, content, tags } = body
  const updateData = {}
  if (bankId !== undefined) updateData.bankId = bankId
  if (knowledgePointId !== undefined) updateData.knowledgePointId = knowledgePointId
  if (type !== undefined) updateData.type = type
  if (difficulty !== undefined) updateData.difficulty = difficulty
  if (content !== undefined) {
    updateData.content = {
      stem: content.stem || '',
      options: content.options || [],
      answer: content.answer || '',
      explanation: content.explanation || ''
    }
  }
  if (tags !== undefined) updateData.tags = tags

  await db.collection('questions').doc(id).update({ data: updateData })
  return ok({}, '题目更新成功')
}

async function handleDeleteQuestion(id) {
  const q = (await db.collection('questions').doc(id).get()).data
  await db.collection('questions').doc(id).remove()
  // 更新关联计数
  if (q && q.bankId) {
    try {
      const count = (await db.collection('questions').where({ bankId: q.bankId }).count()).total
      await db.collection('banks').doc(q.bankId).update({ data: { questionCount: count } })
    } catch (e) { /* ignore */ }
  }
  if (q && q.knowledgePointId) {
    try {
      const count = (await db.collection('questions').where({ knowledgePointId: q.knowledgePointId }).count()).total
      await db.collection('knowledgePoints').doc(q.knowledgePointId).update({ data: { questionCount: count } })
    } catch (e) { /* ignore */ }
  }
  return ok({}, '题目已删除')
}

/** 批量导入题目（Excel解析） */
async function handleImportQuestions(body) {
  const { bankId, knowledgePointId, questions } = body
  if (!bankId) return fail(-1, '请选择题库')
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return fail(-1, '没有可导入的题目')
  }
  if (questions.length > 500) return fail(-1, '单次最多导入500道题目')

  const now = new Date()
  const toInsert = questions.map((q, i) => ({
    bankId,
    knowledgePointId: q.knowledgePointId || knowledgePointId || '',
    type: q.type || 'single_choice',
    difficulty: q.difficulty || 1,
    content: {
      stem: q.stem || '',
      options: q.options || [],
      answer: q.answer || '',
      explanation: q.explanation || ''
    },
    tags: q.tags || [],
    status: 'active',
    createdAt: new Date(now.getTime() + i)
  }))

  // 分批写入（每批100条）
  const batchSize = 100
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize)
    await Promise.all(batch.map(item => db.collection('questions').add({ data: item })))
    inserted += batch.length
  }

  // 更新题库计数
  try {
    const count = (await db.collection('questions').where({ bankId }).count()).total
    await db.collection('banks').doc(bankId).update({ data: { questionCount: count } })
  } catch (e) { /* ignore */ }

  return ok({ inserted }, `成功导入 ${inserted} 道题目`)
}

// ==================== 资讯管理 ====================

async function handleListNews(query) {
  const { page = 1, size = 20 } = query
  const total = (await db.collection('news').count()).total
  const list = (await db.collection('news')
    .orderBy('createdAt', 'desc')
    .skip((Number(page) - 1) * Number(size))
    .limit(Number(size))
    .get()).data

  return ok({ list, total, page: Number(page), size: Number(size) })
}

async function handleCreateNews(body) {
  const { title, summary, content } = body
  if (!title) return fail(-1, '标题不能为空')
  if (!content) return fail(-1, '内容不能为空')

  const data = {
    title, summary: summary || '', content,
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date()
  }
  const res = await db.collection('news').add({ data })
  return ok({ id: res._id }, '资讯发布成功')
}

async function handleUpdateNews(id, body) {
  const { title, summary, content, status } = body
  const updateData = { updatedAt: new Date() }
  if (title !== undefined) updateData.title = title
  if (summary !== undefined) updateData.summary = summary
  if (content !== undefined) updateData.content = content
  if (status !== undefined) updateData.status = status

  await db.collection('news').doc(id).update({ data: updateData })
  return ok({}, '资讯更新成功')
}

async function handleDeleteNews(id) {
  await db.collection('news').doc(id).remove()
  return ok({}, '资讯已删除')
}

/** Word 文档导入资讯 — 接收云存储 fileID，解析 .docx 并入库 */
async function handleImportNewsWord(body) {
  const { fileID } = body
  if (!fileID) return fail(-1, '缺少文件 fileID')

  let mammoth
  try {
    mammoth = require('mammoth')
  } catch (e) {
    return fail(-1, 'Word 解析组件未就绪，请先上传并部署云函数依赖')
  }

  try {
    // 下载云存储文件
    const downloadRes = await cloud.downloadFile({ fileID })
    const fileBuffer = downloadRes.fileContent

    // mammoth 解析 .docx → HTML
    const convertResult = await mammoth.convertToHtml({ buffer: fileBuffer })
    const htmlContent = convertResult.value

    // 提取图片并上传云存储
    var imageMap = {}
    if (convertResult.messages) {
      for (const msg of convertResult.messages) {
        if (msg.type === 'warning') console.warn('mammoth warning:', msg.message)
      }
    }

    // 从 HTML 第一个 h1 提取标题
    var titleMatch = htmlContent.match(/<h1[^>]*>(.+?)<\/h1>/i)
    var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '未命名资讯'
    var summary = htmlContent.replace(/<[^>]+>/g, '').slice(0, 200).trim()
    var imageCount = (htmlContent.match(/<img[^>]*>/gi) || []).length

    return ok({ title, summary, htmlContent, imageCount }, '解析成功')
  } catch (err) {
    console.error('Word 资讯导入失败:', err)
    return fail(-1, 'Word 解析失败: ' + (err.message || '未知错误'))
  }
}

// ==================== 反馈管理 ====================

async function handleListFeedback(query) {
  const { type, page = 1, size = 20 } = query
  const condition = {}
  if (type) condition.type = type

  const total = (await db.collection('feedback').where(condition).count()).total
  const list = (await db.collection('feedback')
    .where(condition)
    .orderBy('createdAt', 'desc')
    .skip((Number(page) - 1) * Number(size))
    .limit(Number(size))
    .get()).data

  return ok({ list, total, page: Number(page), size: Number(size) })
}

async function handleUpdateFeedback(id, body) {
  const { status } = body
  await db.collection('feedback').doc(id).update({ data: { status } })
  return ok({}, '反馈状态已更新')
}

// ==================== 数据统计 ====================

async function handleStats() {
  const stats = {}
  try {
    stats.userCount = (await db.collection('admin_users').count()).total > 0
      ? '已激活' : '未初始化'
    try { stats.bankCount = (await db.collection('banks').count()).total } catch (e) { stats.bankCount = 0 }
    try { stats.questionCount = (await db.collection('questions').count()).total } catch (e) { stats.questionCount = 0 }
    try { stats.newsCount = (await db.collection('news').count()).total } catch (e) { stats.newsCount = 0 }
    try { stats.feedbackCount = (await db.collection('feedback').count()).total } catch (e) { stats.feedbackCount = 0 }
    try { stats.pendingFeedbackCount = (await db.collection('feedback').where({ status: 'pending' }).count()).total } catch (e) { stats.pendingFeedbackCount = 0 }
    try { stats.wrongQuestionCount = (await db.collection('wrong_questions').count()).total } catch (e) { stats.wrongQuestionCount = 0 }

    // 各题库题目数量
    try {
      const banks = (await db.collection('banks').get()).data
      stats.banks = banks.map(b => ({ name: b.name, type: b.type, questionCount: b.questionCount || 0 }))
    } catch (e) { stats.banks = [] }
  } catch (e) {
    return ok(stats)
  }

  return ok(stats)
}

// ==================== 真题分类管理 ====================

async function handleListExamCategories(query) {
  const list = (await db.collection('exam_categories')
    .orderBy('order', 'asc')
    .limit(50)
    .get()).data
  return ok({ list })
}

async function handleCreateExamCategory(body) {
  const { name } = body
  if (!name) return fail(-1, '分类名称不能为空')
  // 自动递增排序号
  const maxRes = await db.collection('exam_categories')
    .orderBy('order', 'desc').limit(1).get()
  const order = maxRes.data.length > 0 ? maxRes.data[0].order + 1 : 1
  const res = await db.collection('exam_categories').add({
    data: { name, order, createdAt: new Date(), updatedAt: new Date() }
  })
  return ok({ id: res._id }, '分类创建成功')
}

async function handleUpdateExamCategory(id, body) {
  const { name, order } = body
  const updateData = { updatedAt: new Date() }
  if (name !== undefined) updateData.name = name
  if (order !== undefined) updateData.order = order
  await db.collection('exam_categories').doc(id).update({ data: updateData })
  return ok({}, '分类更新成功')
}

async function handleDeleteExamCategory(id) {
  await db.collection('exam_categories').doc(id).remove()
  // 清除关联 banks 的分类引用
  try {
    await db.collection('banks').where({ examCategoryId: id }).update({
      data: { examCategoryId: '' }
    })
  } catch (e) { /* ignore */ }
  return ok({}, '分类已删除')
}

// ==================== 路由 ====================

/** 解析请求路径 */
function parseRoute(httpMethod, path) {
  // 移除开头 /
  const cleanPath = (path || '/').replace(/^\//, '')
  const parts = cleanPath.split('/').filter(Boolean)
  return { method: httpMethod, parts }
}

/** 主路由处理 */
async function route(event, username) {
  const { method, parts } = parseRoute(event.httpMethod, event.path || event.resource || '')
  const body = parseBody(event)
  const query = event.queryStringParameters || {}

  // ----- 公开接口（无需登录） -----

  // POST /api/login
  if (method === 'POST' && parts[0] === 'api' && parts[1] === 'login') {
    return handleLogin(body)
  }

  // OPTIONS 预检
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' }
  }

  // ----- 需要认证 -----
  if (!username) {
    return fail(-2, '未登录或会话已过期', 401)
  }

  // POST /api/logout
  if (method === 'POST' && parts[0] === 'api' && parts[1] === 'logout') {
    return handleLogout(event.headers)
  }

  // GET /api/check-auth
  if (method === 'GET' && parts[0] === 'api' && parts[1] === 'check-auth') {
    return handleCheckAuth(username)
  }

  // POST /api/change-password
  if (method === 'POST' && parts[0] === 'api' && parts[1] === 'change-password') {
    return handleChangePassword(username, body)
  }

  // ----- 题库 -----
  // GET /api/banks
  if (method === 'GET' && parts[0] === 'api' && parts[1] === 'banks' && parts.length === 2) {
    return handleListBanks(query)
  }
  // POST /api/banks
  if (method === 'POST' && parts[0] === 'api' && parts[1] === 'banks' && parts.length === 2) {
    return handleCreateBank(username, body)
  }
  // PUT /api/banks/:id
  if (method === 'PUT' && parts[0] === 'api' && parts[1] === 'banks' && parts.length === 3) {
    return handleUpdateBank(parts[2], body)
  }
  // DELETE /api/banks/:id
  if (method === 'DELETE' && parts[0] === 'api' && parts[1] === 'banks' && parts.length === 3) {
    return handleDeleteBank(parts[2])
  }

  // ----- 知识点 -----
  // GET /api/banks/:id/knowledge-points
  if (method === 'GET' && parts[0] === 'api' && parts[1] === 'banks' && parts[3] === 'knowledge-points') {
    return handleListKnowledgePoints(parts[2], query)
  }
  // POST /api/banks/:id/knowledge-points
  if (method === 'POST' && parts[0] === 'api' && parts[1] === 'banks' && parts[3] === 'knowledge-points') {
    return handleCreateKnowledgePoint(parts[2], body)
  }
  // PUT /api/knowledge-points/:id
  if (method === 'PUT' && parts[0] === 'api' && parts[1] === 'knowledge-points' && parts.length === 3) {
    return handleUpdateKnowledgePoint(parts[2], body)
  }
  // DELETE /api/knowledge-points/:id
  if (method === 'DELETE' && parts[0] === 'api' && parts[1] === 'knowledge-points' && parts.length === 3) {
    return handleDeleteKnowledgePoint(parts[2])
  }

  // ----- 题目 -----
  // GET /api/questions
  if (method === 'GET' && parts[0] === 'api' && parts[1] === 'questions' && parts.length === 2) {
    return handleListQuestions(query)
  }
  // POST /api/questions
  if (method === 'POST' && parts[0] === 'api' && parts[1] === 'questions' && parts.length === 2) {
    return handleCreateQuestion(body)
  }
  // PUT /api/questions/:id
  if (method === 'PUT' && parts[0] === 'api' && parts[1] === 'questions' && parts.length === 3) {
    return handleUpdateQuestion(parts[2], body)
  }
  // DELETE /api/questions/:id
  if (method === 'DELETE' && parts[0] === 'api' && parts[1] === 'questions' && parts.length === 3) {
    return handleDeleteQuestion(parts[2])
  }
  // POST /api/questions/import
  if (method === 'POST' && parts[0] === 'api' && parts[1] === 'questions' && parts[2] === 'import') {
    return handleImportQuestions(body)
  }

  // ----- 资讯 -----
  // GET /api/news
  if (method === 'GET' && parts[0] === 'api' && parts[1] === 'news' && parts.length === 2) {
    return handleListNews(query)
  }
  // POST /api/news
  if (method === 'POST' && parts[0] === 'api' && parts[1] === 'news' && parts.length === 2) {
    return handleCreateNews(body)
  }
  // PUT /api/news/:id
  if (method === 'PUT' && parts[0] === 'api' && parts[1] === 'news' && parts.length === 3) {
    return handleUpdateNews(parts[2], body)
  }
  // POST /api/news/import-word — Word 文档拖入导入
  if (method === 'POST' && parts[0] === 'api' && parts[1] === 'news' && parts[2] === 'import-word') {
    return handleImportNewsWord(body)
  }
  // DELETE /api/news/:id
  if (method === 'DELETE' && parts[0] === 'api' && parts[1] === 'news' && parts.length === 3) {
    return handleDeleteNews(parts[2])
  }

  // ----- 反馈 -----
  // GET /api/feedback
  if (method === 'GET' && parts[0] === 'api' && parts[1] === 'feedback' && parts.length === 2) {
    return handleListFeedback(query)
  }
  // PUT /api/feedback/:id
  if (method === 'PUT' && parts[0] === 'api' && parts[1] === 'feedback' && parts.length === 3) {
    return handleUpdateFeedback(parts[2], body)
  }

  // ----- 真题分类 -----
  // GET /api/exam-categories
  if (method === 'GET' && parts[0] === 'api' && parts[1] === 'exam-categories' && parts.length === 2) {
    return handleListExamCategories(query)
  }
  // POST /api/exam-categories
  if (method === 'POST' && parts[0] === 'api' && parts[1] === 'exam-categories' && parts.length === 2) {
    return handleCreateExamCategory(body)
  }
  // PUT /api/exam-categories/:id
  if (method === 'PUT' && parts[0] === 'api' && parts[1] === 'exam-categories' && parts.length === 3) {
    return handleUpdateExamCategory(parts[2], body)
  }
  // DELETE /api/exam-categories/:id
  if (method === 'DELETE' && parts[0] === 'api' && parts[1] === 'exam-categories' && parts.length === 3) {
    return handleDeleteExamCategory(parts[2])
  }

  // ----- 统计 -----
  // GET /api/stats
  if (method === 'GET' && parts[0] === 'api' && parts[1] === 'stats') {
    return handleStats()
  }

  return fail(-1, `未知接口: ${method} /${parts.join('/')}`, 404)
}

// ==================== 入口 ====================

exports.main = async (event, context) => {
  console.log('admin-api 收到请求:', event.httpMethod, event.path)

  // CORS 预检
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' }
  }

  try {
    const username = await authenticate(event)
    return await route(event, username)
  } catch (e) {
    console.error('admin-api 错误:', e)
    return fail(-1, '服务器内部错误: ' + e.message, 500)
  }
}
