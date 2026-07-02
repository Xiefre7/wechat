/**
 * API 模块 - 与管理端云函数通信
 *
 * 使用前请将 API_BASE_URL 替换为云函数 HTTP 触发器的实际地址。
 * 在微信云开发控制台 → 云函数 → admin-api → HTTP 触发器 中获取 URL。
 */
const API = (() => {
  // ==================== 配置 ====================
  // 部署后替换为实际的云函数 HTTP 触发地址（HTTPS）
  // 在微信云开发控制台 → 云函数 → admin-api → HTTP 触发器 中获取 URL
  // 示例: https://your-env-id.service.tcloudbase.com/admin-api
  var API_BASE_URL = (function () {
    // 优先从 localStorage 读取已配置的地址（部署时通过控制台写入）
    var stored = ''
    try { stored = localStorage.getItem('ADMIN_API_BASE_URL') || '' } catch (e) {}
    if (stored) return stored
    // 回退到占位地址，部署时必须替换
    return 'https://mvp1-d8grozotx0e93940c.service.tcloudbase.com/admin-api'
  })()
  var BASE_URL = API_BASE_URL

  // ==================== 内部方法 ====================

  async function request(path, options = {}) {
    const { method = 'GET', body, params, noAuth = false } = options

    // 构建 URL
    let url = BASE_URL + path
    if (params) {
      const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
        .join('&')
      if (qs) url += '?' + qs
    }

    // 构建请求
    const fetchOptions = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'  // P1-7: 自动携带 HttpOnly Cookie
    }

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body)
    }

    try {
      const res = await fetch(url, fetchOptions)
      const data = await res.json()
      return data
    } catch (e) {
      console.error('API 请求失败:', e)
      return { code: -1, msg: '网络错误，请检查网络连接' }
    }
  }

  // ==================== 认证接口 ====================

  async function login(username, password) {
    return request('/api/login', {
      method: 'POST',
      body: { username, password },
      noAuth: true
    })
  }

  async function logout() {
    return request('/api/logout', { method: 'POST' })
  }

  async function checkAuth() {
    return request('/api/check-auth')
  }

  async function changePassword(oldPassword, newPassword) {
    return request('/api/change-password', {
      method: 'POST',
      body: { oldPassword, newPassword }
    })
  }

  // ==================== 题库接口 ====================

  async function getBanks(params = {}) {
    return request('/api/banks', { params })
  }

  async function createBank(data) {
    return request('/api/banks', { method: 'POST', body: data })
  }

  async function updateBank(id, data) {
    return request('/api/banks/' + id, { method: 'PUT', body: data })
  }

  async function deleteBank(id) {
    return request('/api/banks/' + id, { method: 'DELETE' })
  }

  // ==================== 知识点接口 ====================

  async function getKnowledgePoints(bankId) {
    return request('/api/banks/' + bankId + '/knowledge-points')
  }

  async function createKnowledgePoint(bankId, data) {
    return request('/api/banks/' + bankId + '/knowledge-points', {
      method: 'POST', body: data
    })
  }

  async function updateKnowledgePoint(id, data) {
    return request('/api/knowledge-points/' + id, { method: 'PUT', body: data })
  }

  async function deleteKnowledgePoint(id) {
    return request('/api/knowledge-points/' + id, { method: 'DELETE' })
  }

  // ==================== 题目接口 ====================

  async function getQuestions(params = {}) {
    return request('/api/questions', { params })
  }

  async function createQuestion(data) {
    return request('/api/questions', { method: 'POST', body: data })
  }

  async function updateQuestion(id, data) {
    return request('/api/questions/' + id, { method: 'PUT', body: data })
  }

  async function deleteQuestion(id) {
    return request('/api/questions/' + id, { method: 'DELETE' })
  }

  async function importQuestions(data) {
    return request('/api/questions/import', { method: 'POST', body: data })
  }

  // ==================== 资讯接口 ====================

  async function getNews(params = {}) {
    return request('/api/news', { params })
  }

  async function createNews(data) {
    return request('/api/news', { method: 'POST', body: data })
  }

  async function updateNews(id, data) {
    return request('/api/news/' + id, { method: 'PUT', body: data })
  }

  async function deleteNews(id) {
    return request('/api/news/' + id, { method: 'DELETE' })
  }

  /** Word 文档拖入导入 — multipart 上传 .docx 文件并解析 */
  async function importNewsWord(file) {
    var formData = new FormData();
    formData.append('file', file);
    var url = BASE_URL + '/api/news/import-word';
    try {
      var res = await fetch(url, {
        method: 'POST',
        headers: {},  // FormData 自动设置 Content-Type，避免覆盖 boundary
        credentials: 'include',  // P1-7: 自动携带 Cookie
        body: formData,
      });
      return await res.json();
    } catch (e) {
      console.error('Word 导入请求失败:', e);
      return { code: -1, msg: '网络错误，请检查网络连接' };
    }
  }

  // ==================== 反馈接口 ====================

  async function getFeedback(params = {}) {
    return request('/api/feedback', { params })
  }

  async function updateFeedback(id, data) {
    return request('/api/feedback/' + id, { method: 'PUT', body: data })
  }

  // ==================== 统计接口 ====================

  async function getStats() {
    return request('/api/stats')
  }

  // ==================== 真题分类接口 ====================

  async function getExamCategories() {
    return request('/api/exam-categories')
  }

  async function createExamCategory(data) {
    return request('/api/exam-categories', { method: 'POST', body: data })
  }

  async function updateExamCategory(id, data) {
    return request('/api/exam-categories/' + id, { method: 'PUT', body: data })
  }

  async function deleteExamCategory(id) {
    return request('/api/exam-categories/' + id, { method: 'DELETE' })
  }

  // ==================== 暴露接口 ====================

  return {
    login, logout, checkAuth, changePassword,
    getBanks, createBank, updateBank, deleteBank,
    getKnowledgePoints, createKnowledgePoint, updateKnowledgePoint, deleteKnowledgePoint,
    getQuestions, createQuestion, updateQuestion, deleteQuestion, importQuestions,
    getNews, createNews, updateNews, deleteNews, importNewsWord,
    getFeedback, updateFeedback,
    getStats,
    getExamCategories, createExamCategory, updateExamCategory, deleteExamCategory
  }
})()
