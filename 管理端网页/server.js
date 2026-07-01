/**
 * 导题斩题小工具管理端 - 本地开发服务器
 * 同时提供静态文件服务和 Mock API
 *
 * 用法: node server.js
 * 访问: http://localhost:3000
 *
 * 数据存储在内存中，重启后重置。
 */

const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
var mammoth = null;
try { mammoth = require('mammoth'); } catch (e) { console.warn('mammoth 未安装，Word 导入功能不可用。运行: npm install mammoth'); }

const PORT = 3000
const ROOT = __dirname

// ==================== 内存数据库 ====================

const DB = {
  admin_users: [{
    _id: 'u1',
    username: 'admin',
    passwordHash: crypto.pbkdf2Sync('admin123', 'kaozhanguo_admin_salt_2024', 10000, 64, 'sha256').toString('hex'),
    role: 'superadmin',
    createdAt: new Date().toISOString()
  }],
  admin_sessions: [],
  banks: [
    { _id: 'bank1', name: '福建职教高考·数学', type: 'official', category: '数学', subCategory: '职教高考', description: '官方数学题库', questionCount: 3, knowledgePointCount: 2, tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'bank2', name: '福建职教高考·英语', type: 'official', category: '英语', subCategory: '职教高考', description: '官方英语题库', questionCount: 2, knowledgePointCount: 1, tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'bank3', name: '2024 福建高职单招数学真题', type: 'exam', category: '数学', subCategory: '2024 高职单招', description: '2024年真题', questionCount: 2, knowledgePointCount: 0, tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ],
  knowledgePoints: [
    { _id: 'kp1', bankId: 'bank1', name: '集合与不等式', parentId: '', order: 1, questionCount: 2, description: '集合运算与不等式求解' },
    { _id: 'kp2', bankId: 'bank1', name: '一元二次不等式', parentId: 'kp1', order: 1, questionCount: 1, description: '' },
    { _id: 'kp3', bankId: 'bank2', name: '词汇', parentId: '', order: 1, questionCount: 2, description: '基础词汇考查' }
  ],
  questions: [
    { _id: 'q1', bankId: 'bank1', knowledgePointId: 'kp1', type: 'single_choice', difficulty: 1, content: { stem: '已知集合 A={1,2,3}，B={2,3,4}，则 A∩B=（  ）', options: [{key:'A',text:'{1,2,3,4}'},{key:'B',text:'{2,3}'},{key:'C',text:'{1,4}'},{key:'D',text:'∅'}], answer: 'B', explanation: '交集是两集合共有的元素，A和B共有2和3' }, tags: [], status: 'active', createdAt: new Date().toISOString() },
    { _id: 'q2', bankId: 'bank1', knowledgePointId: 'kp1', type: 'single_choice', difficulty: 2, content: { stem: '不等式 x²-3x+2<0 的解集是（  ）', options: [{key:'A',text:'{x|x<1}'},{key:'B',text:'{x|x>2}'},{key:'C',text:'{x|1<x<2}'},{key:'D',text:'{x|x<1或x>2}'}], answer: 'C', explanation: 'x²-3x+2=(x-1)(x-2)<0，解得1<x<2' }, tags: [], status: 'active', createdAt: new Date().toISOString() },
    { _id: 'q3', bankId: 'bank1', knowledgePointId: 'kp2', type: 'true_false', difficulty: 1, content: { stem: '空集是任何集合的子集。', options: [{key:'√',text:'正确'},{key:'×',text:'错误'}], answer: '√', explanation: '空集是任何集合的子集，这是集合论的基本性质。' }, tags: [], status: 'active', createdAt: new Date().toISOString() },
    { _id: 'q4', bankId: 'bank2', knowledgePointId: 'kp3', type: 'single_choice', difficulty: 1, content: { stem: 'The word "abandon" means（  ）', options: [{key:'A',text:'放弃'},{key:'B',text:'坚持'},{key:'C',text:'接受'},{key:'D',text:'拒绝'}], answer: 'A', explanation: 'abandon 意为放弃、抛弃' }, tags: [], status: 'active', createdAt: new Date().toISOString() },
    { _id: 'q5', bankId: 'bank2', knowledgePointId: 'kp3', type: 'fill_blank', difficulty: 2, content: { stem: '请用正确形式填空：She ___ (go) to school every day.', options: [], answer: 'goes', explanation: '一般现在时第三人称单数，go→goes' }, tags: [], status: 'active', createdAt: new Date().toISOString() },
    { _id: 'q6', bankId: 'bank3', knowledgePointId: '', type: 'single_choice', difficulty: 3, content: { stem: '【2024真题】若函数 f(x)=2x+1，则 f(3)=（  ）', options: [{key:'A',text:'5'},{key:'B',text:'6'},{key:'C',text:'7'},{key:'D',text:'8'}], answer: 'C', explanation: 'f(3)=2×3+1=7' }, tags: [], status: 'active', createdAt: new Date().toISOString() },
    { _id: 'q7', bankId: 'bank3', knowledgePointId: '', type: 'single_choice', difficulty: 3, content: { stem: '【2024真题】等差数列{an}中，a₁=2，d=3，则 a₅=（  ）', options: [{key:'A',text:'11'},{key:'B',text:'14'},{key:'C',text:'17'},{key:'D',text:'20'}], answer: 'B', explanation: 'a₅=a₁+4d=2+4×3=14' }, tags: [], status: 'active', createdAt: new Date().toISOString() }
  ],
  news: [
    { _id: 'n1', title: '2025年福建省职教高考报名通知', summary: '报名时间及考试安排', content: '2025年福建省职教高考报名将于2024年12月1日开始，考试时间为2025年3月。请各位考生及时关注并准备相关材料。', status: 'published', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'n2', title: '职教高考数学科目考试大纲发布', summary: '最新考纲变化解读', content: '2025年职教高考数学科目考试大纲已发布，新增数列极限相关内容，删减了部分概率统计知识点。', status: 'published', createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString() }
  ],
  feedback: [
    { _id: 'f1', openid: 'user001', type: 'bug', typeLabel: 'Bug反馈', content: '刷题页面在切换背题模式后，选项顺序会错乱，请修复。', contact: '138xxxx1234', status: 'pending', createdAt: new Date().toISOString() },
    { _id: 'f2', openid: 'user002', type: 'suggest', typeLabel: '功能建议', content: '希望增加夜间模式，晚上刷题太刺眼了。', contact: '', status: 'pending', createdAt: new Date(Date.now() - 172800000).toISOString() }
  ],
  wrong_questions: [
    { _id: 'w1', userId: 'u1', questionId: 'q1', bankId: 'bank1', status: 'reviewing', createdAt: new Date().toISOString() }
  ],
  exam_categories: [
    { _id: 'ec1', name: '职教高考', order: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'ec2', name: '考公考编', order: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]
}

// ID 计数器
let idCounter = 100

function nextId() {
  return 'id_' + (++idCounter) + '_' + Date.now()
}

// ==================== MIME 类型 ====================

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
}

// ==================== 工具函数 ====================

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  }
}

function jsonResponse(data, status = 200) {
  const body = JSON.stringify(data)
  return {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body
  }
}

function parseBody(req) {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(raw)) } catch (e) { resolve({}) }
    })
  })
}

/** 简易 multipart/form-data 解析（仅提取文件 buffer 和字段） */
function parseMultipart(req, boundary) {
  return new Promise((resolve) => {
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      var buf = Buffer.concat(chunks);
      var result = { fields: {}, file: null, fileName: '' };
      // 按 boundary 切分
      var boundaryBuf = Buffer.from('--' + boundary);
      var parts = [];
      var start = buf.indexOf(boundaryBuf) + boundaryBuf.length;
      while (start < buf.length) {
        var end = buf.indexOf(boundaryBuf, start);
        if (end === -1) end = buf.length;
        parts.push(buf.slice(start, end));
        start = end + boundaryBuf.length;
      }
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        // 跳过开头的 \r\n 和结尾的 --
        var headerEnd = p.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;
        var headerStr = p.slice(0, headerEnd).toString();
        var body = p.slice(headerEnd + 4);
        // 去掉结尾的 \r\n
        if (body.length >= 2 && body[body.length - 2] === 0x0d) body = body.slice(0, -2);
        if (body.length === 0) continue;

        var nameMatch = headerStr.match(/name="([^"]+)"/);
        var filenameMatch = headerStr.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          result.file = body;
          result.fileName = filenameMatch[1];
        } else if (nameMatch) {
          result.fields[nameMatch[1]] = body.toString();
        }
      }
      resolve(result);
    });
  });
}

function getParams(url) {
  const idx = url.indexOf('?')
  if (idx === -1) return {}
  const qs = url.slice(idx + 1)
  const params = {}
  qs.split('&').forEach(pair => {
    const [k, v] = pair.split('=').map(decodeURIComponent)
    params[k] = v
  })
  return params
}

// ==================== 认证 ====================

async function authenticate(req) {
  const token = (req.headers.authorization || req.headers.Authorization || '')
  if (!token) return null
  const session = DB.admin_sessions.find(s => s.token === token && new Date(s.expireAt) > new Date())
  if (!session) return null
  return session.username
}

function hashPassword(password) {
  return crypto.pbkdf2Sync(password, 'kaozhanguo_admin_salt_2024', 10000, 64, 'sha256').toString('hex')
}

// ==================== API 路由处理 ====================

async function handleAPI(req, res, method, pathname, params, username) {
  const parts = pathname.split('/').filter(Boolean)

  // ----- 公开接口 -----
  if (method === 'POST' && parts[1] === 'login') {
    const body = await parseBody(req)
    const { username: uname, password } = body
    if (!uname || !password) return jsonResponse({ code: -1, msg: '请输入用户名和密码' })
    const admin = DB.admin_users.find(u => u.username === uname)
    if (!admin || admin.passwordHash !== hashPassword(password)) {
      return jsonResponse({ code: -1, msg: '用户名或密码错误' })
    }
    const token = crypto.randomBytes(32).toString('hex')
    const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    DB.admin_sessions.push({ token, username: uname, createdAt: new Date().toISOString(), expireAt })
    // 清理过期会话
    DB.admin_sessions = DB.admin_sessions.filter(s => new Date(s.expireAt) > new Date())
    return jsonResponse({ code: 0, msg: 'ok', data: { token, username: uname, role: admin.role } })
  }

  if (method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders(), body: '' }
  }

  // ----- 需要认证 -----
  if (!username) {
    return jsonResponse({ code: -2, msg: '未登录或会话已过期' }, 401)
  }

  if (method === 'POST' && parts[1] === 'logout') {
    const token = (req.headers.authorization || '')
    DB.admin_sessions = DB.admin_sessions.filter(s => s.token !== token)
    return jsonResponse({ code: 0, msg: '已退出登录', data: {} })
  }

  if (method === 'GET' && parts[1] === 'check-auth') {
    return jsonResponse({ code: 0, msg: 'ok', data: { username } })
  }

  if (method === 'POST' && parts[1] === 'change-password') {
    const body = await parseBody(req)
    const admin = DB.admin_users.find(u => u.username === username)
    if (!admin || admin.passwordHash !== hashPassword(body.oldPassword)) {
      return jsonResponse({ code: -1, msg: '旧密码错误' })
    }
    admin.passwordHash = hashPassword(body.newPassword)
    return jsonResponse({ code: 0, msg: '密码修改成功', data: {} })
  }

  // ----- 题库 -----
  if (method === 'GET' && parts[1] === 'banks' && parts.length === 2) {
    const p = getParams(req.url)
    let list = [...DB.banks]
    if (p.type) list = list.filter(b => b.type === p.type)
    const page = parseInt(p.page) || 1
    const size = parseInt(p.size) || 50
    const start = (page - 1) * size
    return jsonResponse({ code: 0, msg: 'ok', data: { list: list.slice(start, start + size), total: list.length, page, size } })
  }

  if (method === 'POST' && parts[1] === 'banks' && parts.length === 2) {
    const body = await parseBody(req)
    const bank = { _id: nextId(), name: body.name, type: body.type || 'official', category: body.category || '', subCategory: body.subCategory || '', description: body.description || '', coverImage: '', ownerId: '', isPublic: true, questionCount: 0, knowledgePointCount: 0, tags: body.tags || [], examCategoryId: body.examCategoryId || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    DB.banks.push(bank)
    return jsonResponse({ code: 0, msg: '题库创建成功', data: { id: bank._id } })
  }

  if (method === 'PUT' && parts[1] === 'banks' && parts.length === 3) {
    const body = await parseBody(req)
    const bank = DB.banks.find(b => b._id === parts[2])
    if (!bank) return jsonResponse({ code: -1, msg: '题库不存在' }, 404)
    if (body.name !== undefined) bank.name = body.name
    if (body.category !== undefined) bank.category = body.category
    if (body.subCategory !== undefined) bank.subCategory = body.subCategory
    if (body.description !== undefined) bank.description = body.description
    if (body.examCategoryId !== undefined) bank.examCategoryId = body.examCategoryId
    bank.updatedAt = new Date().toISOString()
    return jsonResponse({ code: 0, msg: '题库更新成功', data: {} })
  }

  if (method === 'DELETE' && parts[1] === 'banks' && parts.length === 3) {
    const id = parts[2]
    DB.banks = DB.banks.filter(b => b._id !== id)
    DB.questions = DB.questions.filter(q => q.bankId !== id)
    DB.knowledgePoints = DB.knowledgePoints.filter(k => k.bankId !== id)
    return jsonResponse({ code: 0, msg: '题库已删除', data: {} })
  }

  // ----- 知识点 -----
  if (method === 'GET' && parts[1] === 'banks' && parts[3] === 'knowledge-points') {
    const bankId = parts[2]
    const list = DB.knowledgePoints.filter(k => k.bankId === bankId).sort((a, b) => a.order - b.order)
    const bank = DB.banks.find(b => b._id === bankId)
    if (bank) bank.knowledgePointCount = list.length
    return jsonResponse({ code: 0, msg: 'ok', data: { list, bankId } })
  }

  if (method === 'POST' && parts[1] === 'banks' && parts[3] === 'knowledge-points') {
    const bankId = parts[2]
    const body = await parseBody(req)
    const maxOrder = Math.max(0, ...DB.knowledgePoints.filter(k => k.bankId === bankId).map(k => k.order))
    const kp = { _id: nextId(), bankId, name: body.name, parentId: body.parentId || '', order: maxOrder + 1, questionCount: 0, description: body.description || '' }
    DB.knowledgePoints.push(kp)
    const bank = DB.banks.find(b => b._id === bankId)
    if (bank) bank.knowledgePointCount = DB.knowledgePoints.filter(k => k.bankId === bankId).length
    return jsonResponse({ code: 0, msg: '知识点创建成功', data: { id: kp._id, order: kp.order } })
  }

  if (method === 'PUT' && parts[1] === 'knowledge-points' && parts.length === 3) {
    const body = await parseBody(req)
    const kp = DB.knowledgePoints.find(k => k._id === parts[2])
    if (!kp) return jsonResponse({ code: -1, msg: '知识点不存在' }, 404)
    if (body.name !== undefined) kp.name = body.name
    if (body.parentId !== undefined) kp.parentId = body.parentId
    if (body.description !== undefined) kp.description = body.description
    if (body.order !== undefined) kp.order = body.order
    return jsonResponse({ code: 0, msg: '知识点更新成功', data: {} })
  }

  if (method === 'DELETE' && parts[1] === 'knowledge-points' && parts.length === 3) {
    const id = parts[2]
    const kp = DB.knowledgePoints.find(k => k._id === id)
    DB.knowledgePoints = DB.knowledgePoints.filter(k => k._id !== id)
    DB.questions.forEach(q => { if (q.knowledgePointId === id) q.knowledgePointId = '' })
    if (kp) {
      const bank = DB.banks.find(b => b._id === kp.bankId)
      if (bank) bank.knowledgePointCount = DB.knowledgePoints.filter(k => k.bankId === kp.bankId).length
    }
    return jsonResponse({ code: 0, msg: '知识点已删除', data: {} })
  }

  // ----- 题目 -----
  if (method === 'GET' && parts[1] === 'questions' && parts.length === 2) {
    const p = getParams(req.url)
    let list = [...DB.questions]
    if (p.bankId) list = list.filter(q => q.bankId === p.bankId)
    if (p.knowledgePointId) list = list.filter(q => q.knowledgePointId === p.knowledgePointId)
    if (p.type) list = list.filter(q => q.type === p.type)
    if (p.difficulty) list = list.filter(q => q.difficulty === parseInt(p.difficulty))
    if (p.keyword) {
      const kw = p.keyword.toLowerCase()
      list = list.filter(q => (q.content?.stem || '').toLowerCase().includes(kw))
    }
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    const page = parseInt(p.page) || 1
    const size = parseInt(p.size) || 20
    const start = (page - 1) * size
    return jsonResponse({ code: 0, msg: 'ok', data: { list: list.slice(start, start + size), total: list.length, page, size } })
  }

  if (method === 'POST' && parts[1] === 'questions' && parts.length === 2) {
    const body = await parseBody(req)
    const q = { _id: nextId(), bankId: body.bankId, knowledgePointId: body.knowledgePointId || '', type: body.type, difficulty: body.difficulty || 1, content: body.content || { stem: '', options: [], answer: '', explanation: '' }, tags: body.tags || [], status: 'active', createdAt: new Date().toISOString() }
    DB.questions.push(q)
    // 更新计数
    const bank = DB.banks.find(b => b._id === q.bankId)
    if (bank) bank.questionCount = DB.questions.filter(x => x.bankId === q.bankId).length
    if (q.knowledgePointId) {
      const kp = DB.knowledgePoints.find(k => k._id === q.knowledgePointId)
      if (kp) kp.questionCount = DB.questions.filter(x => x.knowledgePointId === q.knowledgePointId).length
    }
    return jsonResponse({ code: 0, msg: '题目创建成功', data: { id: q._id } })
  }

  if (method === 'PUT' && parts[1] === 'questions' && parts.length === 3) {
    const body = await parseBody(req)
    const q = DB.questions.find(x => x._id === parts[2])
    if (!q) return jsonResponse({ code: -1, msg: '题目不存在' }, 404)
    if (body.bankId !== undefined) q.bankId = body.bankId
    if (body.knowledgePointId !== undefined) q.knowledgePointId = body.knowledgePointId
    if (body.type !== undefined) q.type = body.type
    if (body.difficulty !== undefined) q.difficulty = body.difficulty
    if (body.content !== undefined) q.content = body.content
    if (body.tags !== undefined) q.tags = body.tags
    return jsonResponse({ code: 0, msg: '题目更新成功', data: {} })
  }

  if (method === 'DELETE' && parts[1] === 'questions' && parts.length === 3) {
    const id = parts[2]
    const q = DB.questions.find(x => x._id === id)
    DB.questions = DB.questions.filter(x => x._id !== id)
    if (q) {
      const bank = DB.banks.find(b => b._id === q.bankId)
      if (bank) bank.questionCount = DB.questions.filter(x => x.bankId === q.bankId).length
      if (q.knowledgePointId) {
        const kp = DB.knowledgePoints.find(k => k._id === q.knowledgePointId)
        if (kp) kp.questionCount = DB.questions.filter(x => x.knowledgePointId === q.knowledgePointId).length
      }
    }
    return jsonResponse({ code: 0, msg: '题目已删除', data: {} })
  }

  if (method === 'POST' && parts[1] === 'questions' && parts[2] === 'import') {
    const body = await parseBody(req)
    const { bankId, questions } = body
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return jsonResponse({ code: -1, msg: '没有可导入的题目' })
    }
    let inserted = 0
    questions.forEach((item) => {
      const q = { _id: nextId(), bankId, knowledgePointId: item.knowledgePointId || '', type: item.type || 'single_choice', difficulty: item.difficulty || 1, content: item.content || { stem: '', options: [], answer: '', explanation: '' }, tags: item.tags || [], status: 'active', createdAt: new Date().toISOString() }
      DB.questions.push(q)
      inserted++
    })
    const bank = DB.banks.find(b => b._id === bankId)
    if (bank) bank.questionCount = DB.questions.filter(x => x.bankId === bankId).length
    return jsonResponse({ code: 0, msg: `成功导入 ${inserted} 道题目`, data: { inserted } })
  }

  // ----- 资讯 -----
  if (method === 'GET' && parts[1] === 'news' && parts.length === 2) {
    const p = getParams(req.url)
    const list = [...DB.news].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    const page = parseInt(p.page) || 1
    const size = parseInt(p.size) || 20
    const start = (page - 1) * size
    return jsonResponse({ code: 0, msg: 'ok', data: { list: list.slice(start, start + size), total: list.length, page, size } })
  }

  // POST /api/news/import-word — Word 文档拖入导入
  if (method === 'POST' && parts[1] === 'news' && parts[2] === 'import-word') {
    if (!mammoth) return jsonResponse({ code: -1, msg: 'mammoth 未安装，请运行 npm install mammoth' }, 500);

    var contentType = req.headers['content-type'] || '';
    var boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) return jsonResponse({ code: -1, msg: '需要 multipart/form-data 格式' }, 400);

    try {
      var parsed = await parseMultipart(req, boundaryMatch[1]);
      if (!parsed.file) return jsonResponse({ code: -1, msg: '未收到文件' }, 400);

      // 用 mammoth 解析 .docx → HTML（保留排版）
      var convertResult = await mammoth.convertToHtml({ buffer: parsed.file });
      var htmlContent = convertResult.value;
      var warnings = convertResult.messages;

      // 提取图片并转为 base64 内嵌（本地开发环境无需云存储）
      var images = [];
      if (parsed.fileName) {
        // mammoth 的图片提取需要在 convertToHtml 时配置
        // 这里用 img 标签的 src 占位处理
      }

      // 从 HTML 或文件名提取标题
      var titleMatch = htmlContent.match(/<h1[^>]*>(.+?)<\/h1>/i);
      var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : parsed.fileName.replace(/\.docx?$/i, '');
      var summary = htmlContent.replace(/<[^>]+>/g, '').slice(0, 150).trim();

      // 处理 mammoth 生成的图片占位 → base64 内嵌（本地模式）
      // mammoth 默认将图片转为 base64 data URI
      var imageCount = (htmlContent.match(/<img[^>]*>/gi) || []).length;

      return jsonResponse({ code: 0, msg: '解析成功', data: { title, summary, htmlContent, imageCount, warnings: warnings.slice(0, 5) } });
    } catch (err) {
      console.error('Word 解析失败:', err);
      return jsonResponse({ code: -1, msg: 'Word 解析失败: ' + (err.message || '未知错误') }, 500);
    }
  }

  if (method === 'POST' && parts[1] === 'news' && parts.length === 2) {
    const body = await parseBody(req)
    const n = { _id: nextId(), title: body.title, summary: body.summary || '', content: body.content, status: 'published', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    DB.news.push(n)
    return jsonResponse({ code: 0, msg: '资讯发布成功', data: { id: n._id } })
  }

  if (method === 'PUT' && parts[1] === 'news' && parts.length === 3) {
    const body = await parseBody(req)
    const n = DB.news.find(x => x._id === parts[2])
    if (!n) return jsonResponse({ code: -1, msg: '资讯不存在' }, 404)
    if (body.title !== undefined) n.title = body.title
    if (body.summary !== undefined) n.summary = body.summary
    if (body.content !== undefined) n.content = body.content
    if (body.status !== undefined) n.status = body.status
    n.updatedAt = new Date().toISOString()
    return jsonResponse({ code: 0, msg: '资讯更新成功', data: {} })
  }

  if (method === 'DELETE' && parts[1] === 'news' && parts.length === 3) {
    DB.news = DB.news.filter(x => x._id !== parts[2])
    return jsonResponse({ code: 0, msg: '资讯已删除', data: {} })
  }

  // ----- 反馈 -----
  if (method === 'GET' && parts[1] === 'feedback' && parts.length === 2) {
    const p = getParams(req.url)
    let list = [...DB.feedback]
    if (p.type) list = list.filter(f => f.type === p.type)
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    const page = parseInt(p.page) || 1
    const size = parseInt(p.size) || 20
    const start = (page - 1) * size
    return jsonResponse({ code: 0, msg: 'ok', data: { list: list.slice(start, start + size), total: list.length, page, size } })
  }

  if (method === 'PUT' && parts[1] === 'feedback' && parts.length === 3) {
    const body = await parseBody(req)
    const fb = DB.feedback.find(f => f._id === parts[2])
    if (!fb) return jsonResponse({ code: -1, msg: '反馈不存在' }, 404)
    if (body.status !== undefined) fb.status = body.status
    return jsonResponse({ code: 0, msg: '反馈状态已更新', data: {} })
  }

  // ----- 真题分类 -----
  if (method === 'GET' && parts[1] === 'exam-categories' && parts.length === 2) {
    const list = [...DB.exam_categories].sort((a, b) => a.order - b.order)
    return jsonResponse({ code: 0, msg: 'ok', data: { list } })
  }

  if (method === 'POST' && parts[1] === 'exam-categories' && parts.length === 2) {
    const body = await parseBody(req)
    if (!body.name) return jsonResponse({ code: -1, msg: '分类名称不能为空' })
    const maxOrder = Math.max(0, ...DB.exam_categories.map(c => c.order))
    const cat = { _id: nextId(), name: body.name, order: maxOrder + 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    DB.exam_categories.push(cat)
    return jsonResponse({ code: 0, msg: '分类创建成功', data: { id: cat._id } })
  }

  if (method === 'PUT' && parts[1] === 'exam-categories' && parts.length === 3) {
    const body = await parseBody(req)
    const cat = DB.exam_categories.find(c => c._id === parts[2])
    if (!cat) return jsonResponse({ code: -1, msg: '分类不存在' }, 404)
    if (body.name !== undefined) cat.name = body.name
    if (body.order !== undefined) cat.order = body.order
    cat.updatedAt = new Date().toISOString()
    return jsonResponse({ code: 0, msg: '分类更新成功', data: {} })
  }

  if (method === 'DELETE' && parts[1] === 'exam-categories' && parts.length === 3) {
    const id = parts[2]
    DB.exam_categories = DB.exam_categories.filter(c => c._id !== id)
    // 清除关联 banks 的分类引用
    DB.banks.forEach(b => { if (b.examCategoryId === id) b.examCategoryId = '' })
    return jsonResponse({ code: 0, msg: '分类已删除', data: {} })
  }

  // ----- 统计 -----
  if (method === 'GET' && parts[1] === 'stats') {
    return jsonResponse({ code: 0, msg: 'ok', data: {
      userCount: '已激活',
      bankCount: DB.banks.length,
      questionCount: DB.questions.length,
      newsCount: DB.news.length,
      feedbackCount: DB.feedback.length,
      pendingFeedbackCount: DB.feedback.filter(f => f.status === 'pending').length,
      wrongQuestionCount: DB.wrong_questions.length,
      banks: DB.banks.map(b => ({ name: b.name, type: b.type, questionCount: b.questionCount || 0 }))
    }})
  }

  return jsonResponse({ code: -1, msg: `未知接口: ${method} ${pathname}` }, 404)
}

// ==================== HTTP 服务器 ====================

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const pathname = url.pathname
  const method = req.method.toUpperCase()

  // API 请求
  if (pathname.startsWith('/api/')) {
    const username = await authenticate(req)
    const result = await handleAPI(req, res, method, pathname, getParams(req.url), username)
    res.writeHead(result.status, result.headers)
    res.end(result.body)
    return
  }

  // 静态文件
  let filePath = pathname === '/' ? '/index.html' : pathname
  filePath = path.join(ROOT, filePath)

  // 安全检查：防止目录遍历
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  const ext = path.extname(filePath)
  const contentType = MIME[ext] || 'application/octet-stream'

  try {
    const content = fs.readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': contentType, ...corsHeaders() })
    res.end(content)
  } catch (e) {
    if (e.code === 'ENOENT') {
      res.writeHead(404)
      res.end('Not Found')
    } else {
      res.writeHead(500)
      res.end('Internal Server Error')
    }
  }
})

server.listen(PORT, () => {
  console.log('')
  console.log('  ╔══════════════════════════════════════════╗')
  console.log('  ║   🎓 导题斩题小工具 管理端 - 本地开发服务器     ║')
  console.log('  ╠══════════════════════════════════════════╣')
  console.log(`  ║  地址: http://localhost:${PORT}              ║`)
  console.log('  ║  账号: admin                            ║')
  console.log('  ║  密码: admin123                         ║')
  console.log('  ║                                          ║')
  console.log('  ║  已预置测试数据:                         ║')
  console.log('  ║  - 3 个题库（含1个真题）                 ║')
  console.log('  ║  - 3 个知识点                            ║')
  console.log('  ║  - 7 道题目                              ║')
  console.log('  ║  - 2 条资讯                              ║')
  console.log('  ║  - 2 条反馈                              ║')
  console.log('  ║                                          ║')
  console.log('  ║  ⚠ 数据存储在内存中，重启后重置          ║')
  console.log('  ║  按 Ctrl+C 停止服务器                    ║')
  console.log('  ╚══════════════════════════════════════════╝')
  console.log('')
})
