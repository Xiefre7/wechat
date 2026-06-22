/**
 * 认证模块 - 管理登录状态和 Token
 */
const Auth = (() => {
  const STORAGE_KEY_TOKEN = 'admin_token'
  const STORAGE_KEY_USERNAME = 'admin_username'

  function getToken() {
    return localStorage.getItem(STORAGE_KEY_TOKEN) || ''
  }

  function getUsername() {
    return localStorage.getItem(STORAGE_KEY_USERNAME) || ''
  }

  function isLoggedIn() {
    return !!getToken()
  }

  function saveSession(token, username) {
    localStorage.setItem(STORAGE_KEY_TOKEN, token)
    localStorage.setItem(STORAGE_KEY_USERNAME, username)
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY_TOKEN)
    localStorage.removeItem(STORAGE_KEY_USERNAME)
  }

  return {
    getToken,
    getUsername,
    isLoggedIn,
    saveSession,
    clearSession
  }
})()
