/**
 * 认证模块 - 管理登录状态
 *
 * P1-7 修复后：token 改为 HttpOnly Cookie 存储，前端无法通过 JS 读取。
 * 此模块仅保留 username（用于显示），token 由浏览器自动管理。
 */
const Auth = (() => {
  const STORAGE_KEY_USERNAME = 'admin_username'

  function getUsername() {
    return localStorage.getItem(STORAGE_KEY_USERNAME) || ''
  }

  function isLoggedIn() {
    return !!getUsername()
  }

  function saveSession(username) {
    localStorage.setItem(STORAGE_KEY_USERNAME, username)
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY_USERNAME)
  }

  return {
    getUsername,
    isLoggedIn,
    saveSession,
    clearSession
  }
})()
