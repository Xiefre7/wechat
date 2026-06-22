/**
 * 考斩过管理端 - 主应用逻辑
 * 基于 hash 路由的 SPA，零框架依赖
 */

const App = (() => {
  // ==================== 状态 ====================
  let currentPage = 'dashboard'
  let currentBankId = ''     // 当前管理的题库 ID
  let currentBankType = ''   // 当前题库类型

  // ==================== 初始化 ====================

  function init() {
    if (Auth.isLoggedIn()) {
      showApp()
      navigate('dashboard')
    } else {
      showLogin()
    }
    bindEvents()
  }

  // ==================== 认证 ====================

  function showLogin() {
    document.getElementById('loginContainer').style.display = 'flex'
    document.getElementById('appContainer').style.display = 'none'
    document.getElementById('loginError').textContent = ''
  }

  function showApp() {
    document.getElementById('loginContainer').style.display = 'none'
    document.getElementById('appContainer').style.display = 'flex'
    document.getElementById('sidebarUser').textContent = Auth.getUsername()
  }

  async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim()
    const password = document.getElementById('loginPassword').value.trim()
    const errorEl = document.getElementById('loginError')

    if (!username || !password) {
      errorEl.textContent = '请输入用户名和密码'
      return
    }

    const btn = document.getElementById('loginBtn')
    btn.disabled = true
    btn.textContent = '登录中...'
    errorEl.textContent = ''

    const res = await API.login(username, password)
    btn.disabled = false
    btn.textContent = '登 录'

    if (res.code === 0) {
      Auth.saveSession(res.data.token, res.data.username)
      showApp()
      navigate('dashboard')
    } else {
      errorEl.textContent = res.msg || '登录失败'
    }
  }

  async function handleLogout() {
    await API.logout()
    Auth.clearSession()
    showLogin()
    currentPage = 'dashboard'
  }

  async function handleChangePassword() {
    const oldPwd = prompt('请输入旧密码：')
    if (!oldPwd) return
    const newPwd = prompt('请输入新密码（至少6位）：')
    if (!newPwd) return
    if (newPwd.length < 6) {
      toast('新密码至少6位', 'error')
      return
    }

    const res = await API.changePassword(oldPwd, newPwd)
    if (res.code === 0) {
      toast('密码修改成功，请重新登录', 'success')
      setTimeout(handleLogout, 1500)
    } else {
      toast(res.msg, 'error')
    }
  }

  // ==================== 路由与导航 ====================

  function navigate(page, data = {}) {
    currentPage = page

    // 保存页面数据
    if (data.bankId) currentBankId = data.bankId
    if (data.bankType) currentBankType = data.bankType

    // 更新侧边栏
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'))
    const link = document.querySelector(`.sidebar-nav a[data-page="${page}"]`)
    if (link) link.classList.add('active')

    // 切换页面
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'))
    const section = document.getElementById('page-' + page)
    if (section) section.classList.add('active')

    // 渲染页面
    switch (page) {
      case 'dashboard': renderDashboard(); break
      case 'examCategories': renderExamCategories(); break
      case 'banks': renderBanks(); break
      case 'exams': renderBanks(); break   // exams 复用 banks 渲染，type=exam
      case 'questions': renderQuestions(); break
      case 'news': renderNews(); break
      case 'feedback': renderFeedback(); break
    }
  }

  // ==================== Toast ====================

  function toast(msg, type = 'info') {
    const container = document.getElementById('toastContainer')
    const el = document.createElement('div')
    el.className = 'toast toast-' + type
    el.textContent = msg
    container.appendChild(el)
    setTimeout(() => { el.remove() }, 3000)
  }

  // ==================== 模态框 ====================

  function showModal(title, bodyHtml, footerHtml = '') {
    document.getElementById('modalTitle').textContent = title
    document.getElementById('modalBody').innerHTML = bodyHtml
    document.getElementById('modalFooter').innerHTML = footerHtml
    document.getElementById('modalOverlay').classList.add('show')
  }

  function hideModal() {
    document.getElementById('modalOverlay').classList.remove('show')
  }

  // ==================== 确认对话框 ====================

  function confirm(msg, onYes) {
    if (window.confirm(msg)) onYes()
  }

  // ==================== 面板：Dashboard ====================

  async function renderDashboard() {
    const el = document.getElementById('page-dashboard')
    el.innerHTML = '<div class="loading">加载中...</div>'

    const res = await API.getStats()
    if (res.code !== 0) {
      el.innerHTML = '<div class="empty-state"><p>加载失败：' + res.msg + '</p></div>'
      return
    }

    const s = res.data
    el.innerHTML = `
      <div class="page-header">
        <h3>📊 数据概览</h3>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">📚</div>
          <div class="stat-info">
            <div class="stat-num">${s.bankCount || 0}</div>
            <div class="stat-label">题库总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">📝</div>
          <div class="stat-info">
            <div class="stat-num">${s.questionCount || 0}</div>
            <div class="stat-label">题目总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">📰</div>
          <div class="stat-info">
            <div class="stat-num">${s.newsCount || 0}</div>
            <div class="stat-label">资讯总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">📮</div>
          <div class="stat-info">
            <div class="stat-num">${s.pendingFeedbackCount || 0}</div>
            <div class="stat-label">待处理反馈</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">❌</div>
          <div class="stat-info">
            <div class="stat-num">${s.wrongQuestionCount || 0}</div>
            <div class="stat-label">错题记录数</div>
          </div>
        </div>
      </div>
      <div class="table-container">
        <div class="table-toolbar"><strong>各题库题目数量</strong></div>
        <table>
          <thead><tr><th>题库名称</th><th>类型</th><th>题目数量</th></tr></thead>
          <tbody>
            ${(s.banks || []).map(b => `
              <tr>
                <td>${escHtml(b.name)}</td>
                <td><span class="tag ${b.type === 'exam' ? 'tag-orange' : 'tag-blue'}">${b.type === 'exam' ? '真题' : b.type === 'official' ? '官方' : '自定义'}</span></td>
                <td>${b.questionCount || 0}</td>
              </tr>
            `).join('') || '<tr><td colspan="3" class="text-muted">暂无题库数据</td></tr>'}
          </tbody>
        </table>
      </div>
    `
  }

  // ==================== 面板：真题分类管理 ====================

  async function renderExamCategories() {
    const el = document.getElementById('page-examCategories')
    el.innerHTML = '<div class="loading">加载中...</div>'

    const res = await API.getExamCategories()
    if (res.code !== 0) {
      el.innerHTML = '<div class="empty-state"><p>加载失败：' + res.msg + '</p></div>'
      return
    }

    const categories = res.data.list || []
    el.innerHTML = `
      <div class="page-header">
        <h3>🏷️ 真题分类管理</h3>
        <button class="btn btn-primary" onclick="App._addExamCategory()">+ 添加分类</button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>分类名称</th><th>排序号</th><th>创建时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            ${categories.length === 0
              ? '<tr><td colspan="4" class="text-muted" style="text-align:center">暂无分类，点击上方按钮创建</td></tr>'
              : categories.map(c => `
                <tr>
                  <td><strong>${escHtml(c.name)}</strong></td>
                  <td>${c.order || 0}</td>
                  <td class="text-sm text-muted">${fmtDate(c.createdAt)}</td>
                  <td>
                    <button class="btn btn-sm btn-default" onclick="App._editExamCategory('${c._id}','${escHtml(c.name)}',${c.order || 0})">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="App._deleteExamCategory('${c._id}','${escHtml(c.name)}')">🗑</button>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    `
  }

  function _addExamCategory() {
    const name = prompt('请输入真题分类名称（如：职教高考、考公考编）：')
    if (!name || !name.trim()) return
    API.createExamCategory({ name: name.trim() }).then(res => {
      if (res.code === 0) { toast('分类创建成功', 'success'); renderExamCategories() }
      else toast(res.msg, 'error')
    })
  }

  function _editExamCategory(id, name, order) {
    const newName = prompt('分类名称：', name)
    if (!newName || !newName.trim()) return
    const newOrderStr = prompt('排序号（数字越小越靠前）：', order)
    const newOrder = parseInt(newOrderStr)
    API.updateExamCategory(id, { name: newName.trim(), order: isNaN(newOrder) ? order : newOrder }).then(res => {
      if (res.code === 0) { toast('分类更新成功', 'success'); renderExamCategories() }
      else toast(res.msg, 'error')
    })
  }

  function _deleteExamCategory(id, name) {
    confirm('确定删除分类"' + name + '"吗？\n\n相关真题的分类标记将被清除，但真题本身不会被删除。', async () => {
      const res = await API.deleteExamCategory(id)
      if (res.code === 0) { toast('已删除', 'success'); renderExamCategories() }
      else toast(res.msg, 'error')
    })
  }

  // ==================== 面板：题库/真题管理 ====================

  async function renderBanks() {
    const el = document.getElementById('page-' + currentPage)
    const isExam = currentPage === 'exams'
    const typeFilter = isExam ? 'exam' : 'official'

    el.innerHTML = '<div class="loading">加载中...</div>'

    const res = await API.getBanks({ type: typeFilter })
    if (res.code !== 0) {
      el.innerHTML = '<div class="empty-state"><p>加载失败：' + res.msg + '</p></div>'
      return
    }

    const banks = res.data.list || []
    const title = isExam ? '🎯 真题管理' : '📚 题库管理'

    el.innerHTML = `
      <div class="page-header">
        <h3>${title}</h3>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="App._addBank()">+ 添加${isExam ? '真题' : '题库'}</button>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>学科</th>
              <th>子分类</th>
              <th>题目数</th>
              <th>知识点数</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${banks.length === 0 ? '<tr><td colspan="7" class="text-muted" style="text-align:center">暂无数据</td></tr>' :
              banks.map(b => `
                <tr>
                  <td><strong>${escHtml(b.name)}</strong></td>
                  <td><span class="tag tag-blue">${escHtml(b.category || '-')}</span></td>
                  <td>${escHtml(b.subCategory || '-')}</td>
                  <td>${b.questionCount || 0}</td>
                  <td>${b.knowledgePointCount || 0}</td>
                  <td class="text-sm text-muted">${fmtDate(b.createdAt)}</td>
                  <td>
                    <button class="btn btn-sm btn-default" onclick="App._manageKP('${b._id}')" title="知识点">📋</button>
                    <button class="btn btn-sm btn-default" onclick="App._viewBankQuestions('${b._id}')" title="题目">📝</button>
                    <button class="btn btn-sm btn-default" onclick="App._editBank('${b._id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="App._deleteBank('${b._id}','${escHtml(b.name)}')">🗑</button>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    `
  }

  async function _addBank() {
    const isExam = currentPage === 'exams'
    const label = isExam ? '真题' : '题库'
    const typeValue = isExam ? 'exam' : 'official'

    // 真题模式下加载分类列表
    let categoryOptionsHtml = ''
    if (isExam) {
      try {
        const catRes = await API.getExamCategories()
        const cats = catRes.data?.list || []
        categoryOptionsHtml = cats.map(c =>
          `<option value="${c._id}">${escHtml(c.name)}</option>`
        ).join('')
      } catch (e) { /* ignore */ }
    }

    showModal('添加' + label, `
      <div class="form-group">
        <label>${label}名称 *</label>
        <input id="bankFormName" placeholder="请输入${label}名称">
      </div>
      <div class="form-group">
        <label>学科分类 *</label>
        <select id="bankFormCategory">
          <option value="">请选择</option>
          <option value="数学">数学</option>
          <option value="英语">英语</option>
          <option value="政治">政治</option>
          ${isExam ? '<option value="语文">语文</option><option value="专业课">专业课</option>' : ''}
        </select>
      </div>
      <div class="form-group">
        <label>子分类</label>
        <input id="bankFormSubCategory" placeholder="如：高职单招、职教高考">
      </div>
      ${isExam ? `
        <div class="form-group">
          <label>真题分类</label>
          <select id="bankFormExamCategory">
            <option value="">无分类</option>
            ${categoryOptionsHtml}
          </select>
        </div>
        <div class="form-group"><label>年份</label><input id="bankFormYear" placeholder="如：2024"></div>
      ` : ''}
      <div class="form-group">
        <label>描述</label>
        <textarea id="bankFormDesc" rows="3" placeholder="可选的描述信息"></textarea>
      </div>
    `, `
      <button class="btn btn-default" onclick="App.hideModal()">取消</button>
      <button class="btn btn-primary" onclick="App._submitBank('${typeValue}')">保存</button>
    `)
  }

  async function _submitBank(type) {
    const name = document.getElementById('bankFormName').value.trim()
    const category = document.getElementById('bankFormCategory').value
    const subCategory = document.getElementById('bankFormSubCategory').value.trim()
    const description = document.getElementById('bankFormDesc').value.trim()
    const year = document.getElementById('bankFormYear')?.value?.trim() || ''
    const examCategoryId = document.getElementById('bankFormExamCategory')?.value || ''

    if (!name) { toast('请输入名称', 'error'); return }
    if (!category) { toast('请选择学科分类', 'error'); return }

    const data = { name, type, category, subCategory, description, examCategoryId }
    if (year) {
      data.subCategory = year + (subCategory ? ' ' + subCategory : '')
    }

    const res = await API.createBank(data)
    if (res.code === 0) {
      toast('创建成功', 'success')
      hideModal()
      renderBanks()
    } else {
      toast(res.msg, 'error')
    }
  }

  async function _editBank(id) {
    const res = await API.getBanks()
    const bank = (res.data?.list || []).find(b => b._id === id)
    if (!bank) { toast('未找到题库', 'error'); return }

    const isExam = bank.type === 'exam'
    const label = isExam ? '真题' : '题库'

    // 真题模式下加载分类列表
    let categoryOptionsHtml = ''
    if (isExam) {
      try {
        const catRes = await API.getExamCategories()
        const cats = catRes.data?.list || []
        categoryOptionsHtml = cats.map(c =>
          `<option value="${c._id}" ${bank.examCategoryId === c._id ? 'selected' : ''}>${escHtml(c.name)}</option>`
        ).join('')
      } catch (e) { /* ignore */ }
    }

    showModal('编辑' + label, `
      <div class="form-group">
        <label>${label}名称 *</label>
        <input id="bankFormName" value="${escHtml(bank.name)}">
      </div>
      <div class="form-group">
        <label>学科分类 *</label>
        <select id="bankFormCategory">
          <option value="数学" ${bank.category === '数学' ? 'selected' : ''}>数学</option>
          <option value="英语" ${bank.category === '英语' ? 'selected' : ''}>英语</option>
          <option value="政治" ${bank.category === '政治' ? 'selected' : ''}>政治</option>
          <option value="语文" ${bank.category === '语文' ? 'selected' : ''}>语文</option>
          <option value="专业课" ${bank.category === '专业课' ? 'selected' : ''}>专业课</option>
        </select>
      </div>
      <div class="form-group">
        <label>子分类</label>
        <input id="bankFormSubCategory" value="${escHtml(bank.subCategory || '')}">
      </div>
      ${isExam ? `
        <div class="form-group">
          <label>真题分类</label>
          <select id="bankFormExamCategory">
            <option value="">无分类</option>
            ${categoryOptionsHtml}
          </select>
        </div>
      ` : ''}
      <div class="form-group">
        <label>描述</label>
        <textarea id="bankFormDesc" rows="3">${escHtml(bank.description || '')}</textarea>
      </div>
    `, `
      <button class="btn btn-default" onclick="App.hideModal()">取消</button>
      <button class="btn btn-primary" onclick="App._submitEditBank('${id}')">保存</button>
    `)
  }

  async function _submitEditBank(id) {
    const name = document.getElementById('bankFormName').value.trim()
    const category = document.getElementById('bankFormCategory').value
    const subCategory = document.getElementById('bankFormSubCategory').value.trim()
    const description = document.getElementById('bankFormDesc').value.trim()
    const examCategoryId = document.getElementById('bankFormExamCategory')?.value

    if (!name) { toast('请输入名称', 'error'); return }

    const data = { name, category, subCategory, description }
    if (examCategoryId !== undefined) data.examCategoryId = examCategoryId

    const res = await API.updateBank(id, data)
    if (res.code === 0) {
      toast('更新成功', 'success')
      hideModal()
      renderBanks()
    } else {
      toast(res.msg, 'error')
    }
  }

  function _deleteBank(id, name) {
    confirm('确定要删除"' + name + '"吗？这将同时删除该题库下的所有题目和知识点，此操作不可恢复。', async () => {
      const res = await API.deleteBank(id)
      if (res.code === 0) {
        toast('已删除', 'success')
        renderBanks()
      } else {
        toast(res.msg, 'error')
      }
    })
  }

  async function _manageKP(bankId) {
    currentBankId = bankId
    const res = await API.getKnowledgePoints(bankId)
    const kps = res.data?.list || []

    let kpTreeHtml = ''
    const roots = kps.filter(k => !k.parentId)
    const children = kps.filter(k => !!k.parentId)

    function renderKP(kp, isChild) {
      return `
        <li class="kp-tree-item ${isChild ? 'child' : ''}">
          <span class="kp-name">
            ${isChild ? '├ ' : ''}${escHtml(kp.name)}
            <span class="kp-meta">${kp.questionCount || 0} 题</span>
          </span>
          <span class="kp-actions">
            <button class="btn btn-sm btn-default" onclick="App._editKP('${kp._id}','${escHtml(kp.name)}','${kp.parentId || ''}','${escHtml(kp.description || '')}',${kp.order || 0})">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="App._deleteKP('${kp._id}','${escHtml(kp.name)}')">🗑</button>
          </span>
        </li>
      `
    }

    roots.forEach(root => {
      kpTreeHtml += renderKP(root, false)
      children.filter(c => c.parentId === root._id).forEach(c => {
        kpTreeHtml += renderKP(c, true)
      })
    })

    showModal('管理知识点', `
      <div class="mb-md flex gap-sm">
        <button class="btn btn-sm btn-primary" onclick="App._addKP('${bankId}','')">+ 添加一级知识点</button>
      </div>
      ${kps.length === 0 ? '<div class="kp-empty">暂无知识点，点击上方按钮添加</div>' : `<ul class="kp-tree">${kpTreeHtml}</ul>`}
    `, `
      <button class="btn btn-default" onclick="App.hideModal()">关闭</button>
    `)
  }

  async function _addKP(bankId, parentId) {
    const name = prompt('请输入知识点名称：')
    if (!name) return
    const desc = prompt('知识点描述（可选）：') || ''

    const res = await API.createKnowledgePoint(bankId, { name, parentId, description: desc })
    if (res.code === 0) {
      toast('知识点已添加', 'success')
      _manageKP(bankId)
    } else {
      toast(res.msg, 'error')
    }
  }

  async function _editKP(id, name, parentId, description, order) {
    const newName = prompt('知识点名称：', name)
    if (!newName) return
    const newDesc = prompt('描述：', description) || ''

    const res = await API.updateKnowledgePoint(id, { name: newName, description: newDesc })
    if (res.code === 0) {
      toast('知识点已更新', 'success')
      _manageKP(currentBankId)
    } else {
      toast(res.msg, 'error')
    }
  }

  function _deleteKP(id, name) {
    confirm('确定删除知识点"' + name + '"吗？关联题目的知识点引用将被清除。', async () => {
      const res = await API.deleteKnowledgePoint(id)
      if (res.code === 0) {
        toast('已删除', 'success')
        _manageKP(currentBankId)
      } else {
        toast(res.msg, 'error')
      }
    })
  }

  function _viewBankQuestions(bankId) {
    currentBankId = bankId
    navigate('questions')
  }

  // ==================== 面板：题目管理 ====================

  let questionsPage = 1
  let questionsTotal = 0
  let questionFilters = { bankId: '', keyword: '', type: '' }

  async function renderQuestions() {
    const el = document.getElementById('page-questions')
    el.innerHTML = '<div class="loading">加载中...</div>'

    // 加载题库列表用于筛选
    const bankRes = await API.getBanks()
    const banks = bankRes.data?.list || []
    const bankOptions = banks.map(b =>
      `<option value="${b._id}" ${b._id === currentBankId ? 'selected' : ''}>${escHtml(b.name)} (${b.type === 'exam' ? '真题' : '官方'})</option>`
    ).join('')

    if (currentBankId) questionFilters.bankId = currentBankId

    const res = await API.getQuestions({
      ...questionFilters,
      page: questionsPage,
      size: 20
    })

    if (res.code !== 0) {
      el.innerHTML = '<div class="empty-state"><p>加载失败：' + res.msg + '</p></div>'
      return
    }

    const questions = res.data.list || []
    questionsTotal = res.data.total || 0
    const totalPages = Math.ceil(questionsTotal / 20)

    const typeMap = { single_choice: '单选', multi_choice: '多选', true_false: '判断', fill_blank: '填空', short_answer: '简答' }
    const diffMap = { 1: '★', 2: '★★', 3: '★★★' }

    el.innerHTML = `
      <div class="page-header">
        <h3>📝 题目管理</h3>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="App._addQuestion()">+ 添加题目</button>
          <button class="btn btn-success" onclick="App._importQuestions()">📥 批量导入</button>
        </div>
      </div>
      <div class="table-container">
        <div class="table-toolbar">
          <div class="search-box">
            <select id="qFilterBank" onchange="App._qFilterChange()">
              <option value="">全部题库</option>
              ${bankOptions}
            </select>
            <select id="qFilterType" onchange="App._qFilterChange()">
              <option value="">全部题型</option>
              <option value="single_choice">单选题</option>
              <option value="multi_choice">多选题</option>
              <option value="true_false">判断题</option>
              <option value="fill_blank">填空题</option>
              <option value="short_answer">简答题</option>
            </select>
            <input id="qFilterKeyword" placeholder="搜索题干关键词..." onkeydown="if(event.key==='Enter')App._qSearch()">
            <button class="btn btn-sm btn-default" onclick="App._qSearch()">🔍 搜索</button>
          </div>
          <span class="text-sm text-muted">共 ${questionsTotal} 题</span>
        </div>
        <table>
          <thead>
            <tr><th>题干</th><th>题型</th><th>难度</th><th>答案</th><th>操作</th></tr>
          </thead>
          <tbody>
            ${questions.length === 0 ? '<tr><td colspan="5" class="text-muted" style="text-align:center">暂无题目</td></tr>' :
              questions.map(q => `
                <tr>
                  <td class="text-truncate" style="max-width:300px" title="${escHtml(q.content?.stem || '')}">${escHtml(q.content?.stem || '')}</td>
                  <td><span class="tag tag-blue">${typeMap[q.type] || q.type}</span></td>
                  <td>${diffMap[q.difficulty] || q.difficulty}</td>
                  <td><span class="tag tag-green">${escHtml(q.content?.answer || '')}</span></td>
                  <td>
                    <button class="btn btn-sm btn-default" onclick="App._viewQuestion('${q._id}')">👁</button>
                    <button class="btn btn-sm btn-default" onclick="App._editQuestion('${q._id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="App._deleteQuestion('${q._id}')">🗑</button>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
        ${totalPages > 1 ? renderPagination(questionsPage, totalPages, '_qGoPage') : ''}
      </div>
    `
  }

  function _qFilterChange() {
    questionFilters.bankId = document.getElementById('qFilterBank')?.value || ''
    questionFilters.type = document.getElementById('qFilterType')?.value || ''
    questionsPage = 1
    renderQuestions()
  }

  function _qSearch() {
    questionFilters.keyword = document.getElementById('qFilterKeyword')?.value?.trim() || ''
    questionsPage = 1
    renderQuestions()
  }

  function _qGoPage(page) {
    questionsPage = page
    renderQuestions()
  }

  async function _addQuestion() {
    const bankRes = await API.getBanks()
    const banks = bankRes.data?.list || []
    const bankOptions = banks.map(b =>
      `<option value="${b._id}" ${b._id === currentBankId ? 'selected' : ''}>${escHtml(b.name)}</option>`
    ).join('')

    showModal('添加题目', `
      <div class="form-group">
        <label>所属题库 *</label>
        <select id="qBankId">${bankOptions}</select>
      </div>
      <div class="form-group">
        <label>题型 *</label>
        <select id="qType" onchange="App._onTypeChange()">
          <option value="single_choice">单选题</option>
          <option value="multi_choice">多选题</option>
          <option value="true_false">判断题</option>
          <option value="fill_blank">填空题</option>
          <option value="short_answer">简答题</option>
        </select>
      </div>
      <div class="form-group">
        <label>难度</label>
        <select id="qDifficulty">
          <option value="1">★ 简单</option>
          <option value="2">★★ 中等</option>
          <option value="3">★★★ 困难</option>
        </select>
      </div>
      <div class="form-group">
        <label>题干 *</label>
        <textarea id="qStem" rows="3" placeholder="请输入题干内容"></textarea>
      </div>
      <div class="form-group" id="qOptionsContainer">
        <label>选项</label>
        <div class="options-editor" id="qOptionsEditor">
          <div class="option-row"><span class="option-key">A</span><input placeholder="选项A" data-key="A"><button class="btn-remove-option" onclick="this.parentElement.remove()">×</button></div>
          <div class="option-row"><span class="option-key">B</span><input placeholder="选项B" data-key="B"><button class="btn-remove-option" onclick="this.parentElement.remove()">×</button></div>
          <div class="option-row"><span class="option-key">C</span><input placeholder="选项C" data-key="C"><button class="btn-remove-option" onclick="this.parentElement.remove()">×</button></div>
          <div class="option-row"><span class="option-key">D</span><input placeholder="选项D" data-key="D"><button class="btn-remove-option" onclick="this.parentElement.remove()">×</button></div>
        </div>
        <button class="btn btn-sm btn-default mt-sm" onclick="App._addOptionRow()">+ 添加选项</button>
      </div>
      <div class="form-group">
        <label>正确答案 *</label>
        <input id="qAnswer" placeholder="如：A 或 AB 或 √ 或 填空答案">
      </div>
      <div class="form-group">
        <label>解析</label>
        <textarea id="qExplanation" rows="3" placeholder="答案解析（可选）"></textarea>
      </div>
    `, `
      <button class="btn btn-default" onclick="App.hideModal()">取消</button>
      <button class="btn btn-primary" onclick="App._submitQuestion()">保存</button>
    `)
  }

  function _onTypeChange() {
    const type = document.getElementById('qType').value
    const optsContainer = document.getElementById('qOptionsContainer')
    if (type === 'fill_blank' || type === 'short_answer') {
      optsContainer.style.display = 'none'
    } else {
      optsContainer.style.display = 'block'
    }
    if (type === 'true_false') {
      document.getElementById('qOptionsEditor').innerHTML = `
        <div class="option-row"><span class="option-key">√</span><input value="正确" data-key="√" readonly></div>
        <div class="option-row"><span class="option-key">×</span><input value="错误" data-key="×" readonly></div>
      `
    }
  }

  function _addOptionRow() {
    const editor = document.getElementById('qOptionsEditor')
    const rows = editor.querySelectorAll('.option-row')
    const nextKey = String.fromCharCode(65 + rows.length)
    const row = document.createElement('div')
    row.className = 'option-row'
    row.innerHTML = `<span class="option-key">${nextKey}</span><input placeholder="选项${nextKey}" data-key="${nextKey}"><button class="btn-remove-option" onclick="this.parentElement.remove()">×</button>`
    editor.appendChild(row)
  }

  async function _submitQuestion() {
    const bankId = document.getElementById('qBankId').value
    const type = document.getElementById('qType').value
    const difficulty = parseInt(document.getElementById('qDifficulty').value)
    const stem = document.getElementById('qStem').value.trim()
    const answer = document.getElementById('qAnswer').value.trim()
    const explanation = document.getElementById('qExplanation').value.trim()

    if (!bankId) { toast('请选择题库', 'error'); return }
    if (!stem) { toast('请输入题干', 'error'); return }
    if (!answer) { toast('请输入答案', 'error'); return }

    // 收集选项
    const optionInputs = document.querySelectorAll('#qOptionsEditor input')
    const options = []
    optionInputs.forEach(input => {
      const val = input.value.trim()
      if (val) options.push({ key: input.dataset.key, text: val })
    })

    const res = await API.createQuestion({
      bankId, type, difficulty,
      content: { stem, options, answer, explanation }
    })

    if (res.code === 0) {
      toast('题目创建成功', 'success')
      hideModal()
      renderQuestions()
    } else {
      toast(res.msg, 'error')
    }
  }

  function _viewQuestion(id) {
    // 通过已有列表查看
    API.getQuestions({ page: 1, size: 200 }).then(res => {
      const q = (res.data?.list || []).find(q => q._id === id)
      if (!q) { toast('未找到题目', 'error'); return }

      const typeMap = { single_choice: '单选题', multi_choice: '多选题', true_false: '判断题', fill_blank: '填空题', short_answer: '简答题' }
      const optionsHtml = (q.content?.options || []).map(o => {
        const isCorrect = q.content?.answer?.includes(o.key)
        return `<div class="option ${isCorrect ? 'correct' : ''}">${o.key}. ${escHtml(o.text)} ${isCorrect ? ' ✅' : ''}</div>`
      }).join('')

      showModal('查看题目 - ' + typeMap[q.type], `
        <div class="question-preview">
          <div class="stem">${escHtml(q.content?.stem || '')}</div>
          ${optionsHtml ? '<div class="options">' + optionsHtml + '</div>' : ''}
          <div class="answer-info">✅ 正确答案：${escHtml(q.content?.answer || '')}</div>
          ${q.content?.explanation ? '<div class="explanation">💡 解析：' + escHtml(q.content.explanation) + '</div>' : ''}
        </div>
        <div class="mt-sm text-sm text-muted">题型：${typeMap[q.type]} | 难度：${'★'.repeat(q.difficulty || 1)} | ID：${q._id}</div>
      `, `<button class="btn btn-default" onclick="App.hideModal()">关闭</button>`)
    })
  }

  async function _editQuestion(id) {
    const res = await API.getQuestions({ page: 1, size: 500 })
    const q = (res.data?.list || []).find(q => q._id === id)
    if (!q) { toast('未找到题目', 'error'); return }

    const bankRes = await API.getBanks()
    const banks = bankRes.data?.list || []
    const bankOptions = banks.map(b =>
      `<option value="${b._id}" ${b._id === q.bankId ? 'selected' : ''}>${escHtml(b.name)}</option>`
    ).join('')

    const typeOptions = ['single_choice','multi_choice','true_false','fill_blank','short_answer']
    const typeNames = { single_choice:'单选题', multi_choice:'多选题', true_false:'判断题', fill_blank:'填空题', short_answer:'简答题' }
    const typeSelect = typeOptions.map(t =>
      `<option value="${t}" ${q.type === t ? 'selected' : ''}>${typeNames[t]}</option>`
    ).join('')

    const opts = q.content?.options || []
    const optionsHtml = opts.map(o =>
      `<div class="option-row"><span class="option-key">${o.key}</span><input value="${escHtml(o.text)}" data-key="${o.key}"><button class="btn-remove-option" onclick="this.parentElement.remove()">×</button></div>`
    ).join('')

    showModal('编辑题目', `
      <div class="form-group"><label>题库</label><select id="qBankId">${bankOptions}</select></div>
      <div class="form-group"><label>题型</label><select id="qType" onchange="App._onTypeChange()">${typeSelect}</select></div>
      <div class="form-group"><label>难度</label>
        <select id="qDifficulty">
          <option value="1" ${q.difficulty===1?'selected':''}>★ 简单</option>
          <option value="2" ${q.difficulty===2?'selected':''}>★★ 中等</option>
          <option value="3" ${q.difficulty===3?'selected':''}>★★★ 困难</option>
        </select>
      </div>
      <div class="form-group"><label>题干</label><textarea id="qStem" rows="3">${escHtml(q.content?.stem || '')}</textarea></div>
      <div class="form-group" id="qOptionsContainer" style="${(q.type==='fill_blank'||q.type==='short_answer')?'display:none':''}">
        <label>选项</label>
        <div class="options-editor" id="qOptionsEditor">${optionsHtml}</div>
        <button class="btn btn-sm btn-default mt-sm" onclick="App._addOptionRow()">+ 添加选项</button>
      </div>
      <div class="form-group"><label>正确答案</label><input id="qAnswer" value="${escHtml(q.content?.answer || '')}"></div>
      <div class="form-group"><label>解析</label><textarea id="qExplanation" rows="3">${escHtml(q.content?.explanation || '')}</textarea></div>
    `, `
      <button class="btn btn-default" onclick="App.hideModal()">取消</button>
      <button class="btn btn-primary" onclick="App._submitEditQuestion('${id}')">保存</button>
    `)
  }

  async function _submitEditQuestion(id) {
    const bankId = document.getElementById('qBankId').value
    const type = document.getElementById('qType').value
    const difficulty = parseInt(document.getElementById('qDifficulty').value)
    const stem = document.getElementById('qStem').value.trim()
    const answer = document.getElementById('qAnswer').value.trim()
    const explanation = document.getElementById('qExplanation').value.trim()

    const optionInputs = document.querySelectorAll('#qOptionsEditor input')
    const options = []
    optionInputs.forEach(input => {
      const val = input.value.trim()
      if (val) options.push({ key: input.dataset.key, text: val })
    })

    const res = await API.updateQuestion(id, {
      bankId, type, difficulty,
      content: { stem, options, answer, explanation }
    })

    if (res.code === 0) {
      toast('题目更新成功', 'success')
      hideModal()
      renderQuestions()
    } else {
      toast(res.msg, 'error')
    }
  }

  function _deleteQuestion(id) {
    confirm('确定删除这道题目吗？此操作不可恢复。', async () => {
      const res = await API.deleteQuestion(id)
      if (res.code === 0) {
        toast('已删除', 'success')
        renderQuestions()
      } else {
        toast(res.msg, 'error')
      }
    })
  }

  async function _importQuestions() {
    const bankRes = await API.getBanks()
    const banks = bankRes.data?.list || []
    const bankOptions = banks.map(b =>
      `<option value="${b._id}" ${b._id === currentBankId ? 'selected' : ''}>${escHtml(b.name)}</option>`
    ).join('')

    showModal('批量导入题目', `
      <div class="form-group">
        <label>目标题库 *</label>
        <select id="impBankId">${bankOptions}</select>
      </div>
      <div class="form-group">
        <label>导入方式</label>
        <p class="text-sm text-muted mb-sm">请按照模板格式将题目粘贴到下方，每道题之间用空行分隔。</p>
        <p class="text-sm text-muted mb-sm">
          <strong>格式示例：</strong><br>
          1. 题目内容<br>
          A. 选项A<br>
          B. 选项B<br>
          C. 选项C<br>
          D. 选项D<br>
          答案：A<br>
          解析：解析内容<br>
        </p>
      </div>
      <div class="form-group">
        <label>题目文本 *</label>
        <textarea id="impText" rows="12" placeholder="将题目文本粘贴到这里..."></textarea>
      </div>
    `, `
      <button class="btn btn-default" onclick="App.hideModal()">取消</button>
      <button class="btn btn-primary" onclick="App._submitImport()">导入</button>
    `)
  }

  async function _submitImport() {
    const bankId = document.getElementById('impBankId').value
    const text = document.getElementById('impText').value.trim()

    if (!bankId) { toast('请选择题库', 'error'); return }
    if (!text) { toast('请输入题目文本', 'error'); return }

    // 简易文本解析：按空行分隔题目
    const blocks = text.split(/\n\s*\n/).filter(b => b.trim())
    const questions = []

    blocks.forEach(block => {
      const lines = block.trim().split('\n').filter(l => l.trim())
      if (lines.length < 2) return

      let stem = lines[0].replace(/^\d+[\.\、\s]+/, '').trim()
      const options = []
      let answer = ''
      let explanation = ''
      let type = 'single_choice'

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (/^[A-Z][\.\、\s]/.test(line)) {
          options.push({ key: line[0], text: line.replace(/^[A-Z][\.\、\s]+/, '').trim() })
        } else if (/^答案[：:]/.test(line)) {
          answer = line.replace(/^答案[：:]\s*/, '').trim()
        } else if (/^解析[：:]/.test(line)) {
          explanation = line.replace(/^解析[：:]\s*/, '').trim()
        } else if (/^(正确|错误|√|×)$/.test(line)) {
          type = 'true_false'
          answer = line
        }
      }

      if (!answer && type === 'true_false') answer = '正确'
      if (!stem || !answer) return

      questions.push({ bankId, type, difficulty: 2, content: { stem, options, answer, explanation } })
    })

    if (questions.length === 0) {
      toast('未能解析出有效题目，请检查格式', 'error')
      return
    }

    const res = await API.importQuestions({ bankId, questions })
    if (res.code === 0) {
      toast(res.msg || `成功导入 ${questions.length} 道题目`, 'success')
      hideModal()
      renderQuestions()
    } else {
      toast(res.msg, 'error')
    }
  }

  // ==================== 面板：资讯管理 ====================

  let newsPage = 1
  let newsTotal = 0

  async function renderNews() {
    const el = document.getElementById('page-news')
    el.innerHTML = '<div class="loading">加载中...</div>'

    const res = await API.getNews({ page: newsPage, size: 20 })
    if (res.code !== 0) {
      el.innerHTML = '<div class="empty-state"><p>加载失败：' + res.msg + '</p></div>'
      return
    }

    const newsList = res.data.list || []
    newsTotal = res.data.total || 0
    const totalPages = Math.ceil(newsTotal / 20)

    el.innerHTML = `
      <div class="page-header">
        <h3>📰 资讯管理</h3>
        <button class="btn btn-primary" onclick="App._addNews()">+ 发布资讯</button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>标题</th><th>摘要</th><th>状态</th><th>发布时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            ${newsList.length === 0 ? '<tr><td colspan="5" class="text-muted" style="text-align:center">暂无资讯</td></tr>' :
              newsList.map(n => `
                <tr>
                  <td><strong>${escHtml(n.title)}</strong></td>
                  <td class="text-truncate" style="max-width:250px">${escHtml(n.summary || '')}</td>
                  <td><span class="tag ${n.status === 'published' ? 'tag-green' : 'tag-orange'}">${n.status === 'published' ? '已发布' : '草稿'}</span></td>
                  <td class="text-sm text-muted">${fmtDate(n.createdAt)}</td>
                  <td>
                    <button class="btn btn-sm btn-default" onclick="App._viewNews('${n._id}')">👁</button>
                    <button class="btn btn-sm btn-default" onclick="App._editNews('${n._id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="App._deleteNews('${n._id}','${escHtml(n.title)}')">🗑</button>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
        ${totalPages > 1 ? renderPagination(newsPage, totalPages, '_newsGoPage') : ''}
      </div>
    `
  }

  function _newsGoPage(page) { newsPage = page; renderNews() }

  function _addNews() {
    showModal('发布资讯', `
      <div class="news-import-container">
        <p class="text-sm text-muted mb-sm">拖入 .docx 文件自动导入，保留排版和图片</p>
        <div class="drop-zone" id="newsDropZone" onclick="App._selectNewsFile()">
          <div class="drop-zone-icon">📄</div>
          <div class="drop-zone-text">拖拽 Word 文件到此处</div>
          <div class="drop-zone-hint">或点击选择 .docx 文件</div>
          <input type="file" id="newsFileInput" accept=".docx" style="display:none" onchange="App._onNewsFileSelected(event)">
        </div>
        <div id="newsParseStatus" class="news-parse-status" style="display:none"></div>
        <div class="form-group mt-md">
          <label>标题（可修改）</label>
          <input id="newsTitle" placeholder="自动提取或手动输入">
        </div>
        <div class="form-group">
          <label>摘要（自动生成，可修改）</label>
          <input id="newsSummary" placeholder="自动从正文提取">
        </div>
        <div class="form-group" id="newsPreviewSection" style="display:none">
          <label>内容预览</label>
          <div id="newsPreview" class="news-preview"></div>
        </div>
      </div>
    `, `
      <button class="btn btn-default" onclick="App.hideModal()">取消</button>
      <button class="btn btn-primary" id="newsSubmitBtn" onclick="App._submitNewsImport()" disabled>请先导入文件</button>
    `)

    // 绑定拖拽事件
    setTimeout(function () {
      var dropZone = document.getElementById('newsDropZone');
      if (!dropZone) return;
      dropZone.addEventListener('dragover', function (e) { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drop-active'); });
      dropZone.addEventListener('dragleave', function (e) { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drop-active'); });
      dropZone.addEventListener('drop', function (e) {
        e.preventDefault(); e.stopPropagation();
        dropZone.classList.remove('drop-active');
        var file = e.dataTransfer.files[0];
        if (file) App._importNewsWord(file);
      });
    }, 100);
  }

  function _selectNewsFile() {
    document.getElementById('newsFileInput').click();
  }

  function _onNewsFileSelected(e) {
    var file = e.target.files[0];
    if (file) App._importNewsWord(file);
  }

  async function _importNewsWord(file) {
    if (!file.name.endsWith('.docx')) {
      toast('仅支持 .docx 格式文件', 'error');
      return;
    }

    var statusEl = document.getElementById('newsParseStatus');
    statusEl.style.display = 'block';
    statusEl.innerHTML = '<div class="parse-loading">⏳ 正在解析「' + escHtml(file.name) + '」...</div>';

    var res = await API.importNewsWord(file);

    if (res.code !== 0) {
      statusEl.innerHTML = '<div class="parse-error">❌ 解析失败：' + escHtml(res.msg || '未知错误') + '</div>';
      return;
    }

    var data = res.data;
    statusEl.innerHTML = '<div class="parse-success">✅ 解析完成！' + (data.imageCount > 0 ? ' 含 ' + data.imageCount + ' 张图片' : '') + '</div>';

    // 填充标题和摘要
    document.getElementById('newsTitle').value = data.title || '';
    document.getElementById('newsSummary').value = data.summary || '';

    // 渲染 HTML 预览
    var previewSection = document.getElementById('newsPreviewSection');
    var previewEl = document.getElementById('newsPreview');
    previewEl.innerHTML = data.htmlContent || '';
    previewSection.style.display = 'block';

    // 启用发布按钮
    var submitBtn = document.getElementById('newsSubmitBtn');
    submitBtn.disabled = false;
    submitBtn.textContent = '确认发布';
  }

  function _submitNewsImport() {
    var title = document.getElementById('newsTitle').value.trim();
    var summary = document.getElementById('newsSummary').value.trim();
    var htmlContent = document.getElementById('newsPreview').innerHTML.trim();

    if (!title) { toast('请输入标题', 'error'); return }
    if (!htmlContent) { toast('请先导入 Word 文件', 'error'); return }

    API.createNews({ title: title, summary: summary, content: htmlContent }).then(function (res) {
      if (res.code === 0) {
        toast('资讯发布成功', 'success');
        hideModal();
        renderNews();
      } else {
        toast(res.msg, 'error');
      }
    }).catch(function () {
      toast('发布失败，请重试', 'error');
    });
  }

  async function _viewNews(id) {
    const res = await API.getNews({ page: 1, size: 200 })
    const news = (res.data?.list || []).find(n => n._id === id)
    if (!news) { toast('未找到资讯', 'error'); return }

    showModal(news.title, `
      <div class="text-sm text-muted mb-md">${fmtDate(news.createdAt)} · ${news.status === 'published' ? '已发布' : '草稿'}</div>
      ${news.summary ? '<div class="question-preview mb-md">📌 ' + escHtml(news.summary) + '</div>' : ''}
      <div style="white-space:pre-wrap;line-height:1.8">${escHtml(news.content)}</div>
    `, `<button class="btn btn-default" onclick="App.hideModal()">关闭</button>`)
  }

  async function _editNews(id) {
    const res = await API.getNews({ page: 1, size: 200 })
    const news = (res.data?.list || []).find(n => n._id === id)
    if (!news) { toast('未找到资讯', 'error'); return }

    showModal('编辑资讯', `
      <div class="form-group"><label>标题</label><input id="newsTitle" value="${escHtml(news.title)}"></div>
      <div class="form-group"><label>摘要</label><input id="newsSummary" value="${escHtml(news.summary || '')}"></div>
      <div class="form-group"><label>正文内容</label><textarea id="newsContent" rows="10">${escHtml(news.content)}</textarea></div>
      <div class="form-group">
        <label>状态</label>
        <select id="newsStatus">
          <option value="published" ${news.status==='published'?'selected':''}>已发布</option>
          <option value="draft" ${news.status==='draft'?'selected':''}>草稿</option>
        </select>
      </div>
    `, `
      <button class="btn btn-default" onclick="App.hideModal()">取消</button>
      <button class="btn btn-primary" onclick="App._submitEditNews('${id}')">保存</button>
    `)
  }

  async function _submitEditNews(id) {
    const title = document.getElementById('newsTitle').value.trim()
    const summary = document.getElementById('newsSummary').value.trim()
    const content = document.getElementById('newsContent').value.trim()
    const status = document.getElementById('newsStatus').value

    const res = await API.updateNews(id, { title, summary, content, status })
    if (res.code === 0) {
      toast('资讯更新成功', 'success')
      hideModal()
      renderNews()
    } else {
      toast(res.msg, 'error')
    }
  }

  function _deleteNews(id, title) {
    confirm('确定删除资讯"' + title + '"吗？', async () => {
      const res = await API.deleteNews(id)
      if (res.code === 0) {
        toast('已删除', 'success')
        renderNews()
      } else {
        toast(res.msg, 'error')
      }
    })
  }

  // ==================== 面板：反馈查看 ====================

  let feedbackPage = 1
  let feedbackTotal = 0

  async function renderFeedback() {
    const el = document.getElementById('page-feedback')
    el.innerHTML = '<div class="loading">加载中...</div>'

    const res = await API.getFeedback({ page: feedbackPage, size: 20 })
    if (res.code !== 0) {
      el.innerHTML = '<div class="empty-state"><p>加载失败：' + res.msg + '</p></div>'
      return
    }

    const feedbackList = res.data.list || []
    feedbackTotal = res.data.total || 0
    const totalPages = Math.ceil(feedbackTotal / 20)
    const typeMap = { bug: '🐛 Bug', suggest: '💡 建议', content: '📝 内容', other: '📌 其他' }

    el.innerHTML = `
      <div class="page-header">
        <h3>📮 用户反馈</h3>
        <span class="text-sm text-muted">共 ${feedbackTotal} 条</span>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>类型</th><th>内容</th><th>联系方式</th><th>状态</th><th>时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            ${feedbackList.length === 0 ? '<tr><td colspan="6" class="text-muted" style="text-align:center">暂无反馈</td></tr>' :
              feedbackList.map(f => `
                <tr>
                  <td>${typeMap[f.type] || f.type}</td>
                  <td class="text-truncate" style="max-width:300px" title="${escHtml(f.content || '')}">${escHtml(f.content || '')}</td>
                  <td class="text-sm">${escHtml(f.contact || '-')}</td>
                  <td><span class="tag ${f.status==='pending'?'tag-orange':'tag-green'}">${f.status==='pending'?'待处理':'已处理'}</span></td>
                  <td class="text-sm text-muted">${fmtDate(f.createdAt)}</td>
                  <td>
                    <button class="btn btn-sm btn-default" onclick="App._viewFeedback('${f._id}')">👁</button>
                    ${f.status === 'pending' ? `<button class="btn btn-sm btn-success" onclick="App._resolveFeedback('${f._id}')">✓ 标记已处理</button>` : ''}
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
        ${totalPages > 1 ? renderPagination(feedbackPage, totalPages, '_feedbackGoPage') : ''}
      </div>
    `
  }

  function _feedbackGoPage(page) { feedbackPage = page; renderFeedback() }

  async function _viewFeedback(id) {
    const res = await API.getFeedback({ page: 1, size: 500 })
    const fb = (res.data?.list || []).find(f => f._id === id)
    if (!fb) { toast('未找到反馈', 'error'); return }

    const typeMap = { bug: '🐛 Bug反馈', suggest: '💡 功能建议', content: '📝 内容问题', other: '📌 其他' }

    showModal('反馈详情', `
      <div class="mb-md"><strong>类型：</strong>${typeMap[fb.type] || fb.type}</div>
      <div class="mb-md"><strong>状态：</strong><span class="tag ${fb.status==='pending'?'tag-orange':'tag-green'}">${fb.status==='pending'?'待处理':'已处理'}</span></div>
      <div class="mb-md"><strong>联系方式：</strong>${escHtml(fb.contact || '未填写')}</div>
      <div class="mb-md"><strong>时间：</strong>${fmtDate(fb.createdAt)}</div>
      <div class="question-preview"><strong>内容：</strong><br>${escHtml(fb.content || '')}</div>
    `, `
      <button class="btn btn-default" onclick="App.hideModal()">关闭</button>
      ${fb.status === 'pending' ? `<button class="btn btn-success" onclick="App._resolveFeedback('${fb._id}');App.hideModal()">✓ 标记已处理</button>` : ''}
    `)
  }

  async function _resolveFeedback(id) {
    const res = await API.updateFeedback(id, { status: 'resolved' })
    if (res.code === 0) {
      toast('已标记为已处理', 'success')
      renderFeedback()
    } else {
      toast(res.msg, 'error')
    }
  }

  // ==================== 分页组件 ====================

  function renderPagination(current, total, onClickFn) {
    let html = '<div class="pagination">'
    html += `<button onclick="App.${onClickFn}(${current - 1})" ${current <= 1 ? 'disabled' : ''}>‹ 上一页</button>`

    const maxButtons = 7
    let start = Math.max(1, current - 3)
    let end = Math.min(total, start + maxButtons - 1)
    if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1)

    if (start > 1) { html += `<button onclick="App.${onClickFn}(1)">1</button>`; if (start > 2) html += '<span>...</span>' }

    for (let i = start; i <= end; i++) {
      html += `<button onclick="App.${onClickFn}(${i})" class="${i === current ? 'active' : ''}">${i}</button>`
    }

    if (end < total) { if (end < total - 1) html += '<span>...</span>'; html += `<button onclick="App.${onClickFn}(${total})">${total}</button>` }

    html += `<button onclick="App.${onClickFn}(${current + 1})" ${current >= total ? 'disabled' : ''}>下一页 ›</button>`
    html += `<span class="page-info">${current}/${total} 页</span>`
    html += '</div>'
    return html
  }

  // ==================== 工具函数 ====================

  function escHtml(str) {
    if (!str) return ''
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }

  function fmtDate(dateStr) {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  // ==================== 事件绑定 ====================

  function bindEvents() {
    // 登录按钮
    document.getElementById('loginBtn').addEventListener('click', handleLogin)

    // 登录回车
    document.getElementById('loginPassword').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin()
    })
    document.getElementById('loginUsername').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('loginPassword').focus()
    })

    // 侧边栏导航
    document.querySelectorAll('.sidebar-nav a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault()
        navigate(a.dataset.page)
      })
    })

    // 退出登录
    document.getElementById('sidebarLogout').addEventListener('click', handleLogout)

    // 修改密码
    document.getElementById('sidebarChPwd').addEventListener('click', handleChangePassword)

    // 模态框关闭
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') hideModal()
    })

    // 品牌标题点击回首页
    document.getElementById('sidebarBrand').addEventListener('click', (e) => {
      e.preventDefault()
      navigate('dashboard')
    })
  }

  // ==================== 公开API（挂载到 window 以便 onclick 调用） ====================

  return {
    init,
    navigate,
    hideModal,
    showModal,

    // 真题分类
    _addExamCategory, _editExamCategory, _deleteExamCategory,

    // 题库
    _addBank, _submitBank, _editBank, _submitEditBank, _deleteBank,
    _manageKP, _addKP, _editKP, _deleteKP,
    _viewBankQuestions,

    // 题目
    _addQuestion, _editQuestion, _viewQuestion, _deleteQuestion,
    _submitQuestion, _submitEditQuestion,
    _onTypeChange, _addOptionRow,
    _importQuestions, _submitImport,
    _qFilterChange, _qSearch, _qGoPage,

    // 资讯
    _addNews, _selectNewsFile, _onNewsFileSelected, _importNewsWord, _submitNewsImport,
    _viewNews, _editNews, _submitEditNews, _deleteNews,
    _newsGoPage,

    // 反馈
    _viewFeedback, _resolveFeedback, _feedbackGoPage
  }
})()

// 启动应用
document.addEventListener('DOMContentLoaded', () => App.init())
