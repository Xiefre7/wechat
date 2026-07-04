/**
 * 登录态管理器
 *
 * 职责：
 * - 管理用户登录态（本地标记 + 云端 openid）
 * - provideLoginInterceptor: 在功能页拦截未登录用户，跳转登录引导页
 * - doLogin: 登录页调用，完成登录流程（保存资料 + 拉取/迁移云端数据）
 * - silentInit: app.js onLaunch 静默初始化 openid
 *
 * 登录判定标准：用户已授权头像昵称（localUserInfo 有值且非默认值）
 */

var LOGIN_KEY = 'user_logged_in';
var OPENID_KEY = 'user_openid';
var MIGRATED_KEY = 'data_migrated';

var cloudSync = require('./cloudSync');

/**
 * 是否已登录
 */
function isLoggedIn() {
  try {
    return wx.getStorageSync(LOGIN_KEY) === true;
  } catch (e) {
    return false;
  }
}

/**
 * 获取 openid
 */
function getOpenid() {
  try {
    return wx.getStorageSync(OPENID_KEY) || '';
  } catch (e) {
    return '';
  }
}

/**
 * 静默初始化 openid（app.js onLaunch 调用）
 * 云函数会自动通过 getWXContext 获取 openid
 */
function silentInit() {
  var app = getApp();
  if (!wx.cloud || !app || !app.globalData || !app.globalData.env) return;

  wx.cloud.callFunction({
    name: 'quickstartFunctions',
    data: { type: 'getOpenId' }
  }).then(function (res) {
    if (res.result && res.result.openid) {
      wx.setStorageSync(OPENID_KEY, res.result.openid);
    }
  }).catch(function (err) {
    // 静默失败，不影响启动
    console.warn('[authManager] 静默获取 openid 失败:', err);
  });
}

/**
 * 登录拦截器 — 在功能页/功能按钮点击时调用
 * 已登录 → 执行 callback
 * 未登录 → 跳转登录页，登录后返回原页面并执行 callback
 *
 * @param {Function} callback - 登录成功后执行的回调
 * @param {Object} [options] - { redirect: 自定义跳转路径 }
 */
function ensureLogin(callback, options) {
  if (isLoggedIn()) {
    if (callback) callback();
    return;
  }

  // 记录目标跳转路径
  var redirect = (options && options.redirect) || '';
  if (!redirect) {
    var pages = getCurrentPages();
    if (pages.length > 0) {
      var currentPage = pages[pages.length - 1];
      redirect = '/' + currentPage.route;
    }
  }

  // 将 callback 暂存到全局，登录页完成后回调
  var app = getApp();
  if (app) {
    app._pendingLoginCallback = callback || null;
  }

  wx.navigateTo({
    url: '/pages/login/index?redirect=' + encodeURIComponent(redirect),
    fail: function () {
      // 如果 navigateTo 失败（比如页面栈满），用 redirectTo
      wx.redirectTo({
        url: '/pages/login/index?redirect=' + encodeURIComponent(redirect)
      });
    }
  });
}

/**
 * 执行登录流程（登录页调用）
 *
 * 流程：
 * 1. 保存用户资料到云端
 * 2. 拉取云端数据
 * 3. 如果云端有数据 → 写入本地缓存
 * 4. 如果云端无数据 + 本地有数据 → 迁移上云
 * 5. 标记已登录
 *
 * @param {Object} userInfo - { nickname, avatarUrl }
 * @param {Function} callback - function(success, errMsg)
 */
function doLogin(userInfo, callback) {
  var app = getApp();

  // 1. 更新全局用户信息
  if (app && app.saveUserInfo) {
    app.saveUserInfo(userInfo);
  }

  // 2. 获取 openid
  var cloudReady = wx.cloud && app && app.globalData && app.globalData.env;
  if (!cloudReady) {
    // 无云能力，直接标记登录（降级为本地模式）
    _markLoggedIn();
    if (callback) callback(true);
    return;
  }

  wx.cloud.callFunction({
    name: 'quickstartFunctions',
    data: { type: 'getOpenId' }
  }).then(function (res) {
    if (res.result && res.result.openid) {
      wx.setStorageSync(OPENID_KEY, res.result.openid);
    }

    // 3. 拉取云端数据
    return cloudSync.fetchCloudData();
  }).then(function (cloudData) {
    var localHasData = cloudSync.hasLocalData();
    var migrated = wx.getStorageSync(MIGRATED_KEY) === true;

    if (cloudData && cloudData !== null) {
      // 云端有数据 → 写入本地
      cloudSync.applyCloudToLocal(cloudData);
      _markLoggedIn();
      _markMigrated();
      if (callback) callback(true);
    } else if (localHasData && !migrated) {
      // 云端无数据 + 本地有数据 → 迁移上云
      var localData = cloudSync.collectLocalData();
      cloudSync.migrateLocal(localData).then(function (mergedData) {
        if (mergedData) {
          cloudSync.applyCloudToLocal(mergedData);
        }
        _markLoggedIn();
        _markMigrated();
        if (callback) callback(true);
      }).catch(function () {
        // 迁移失败也标记登录，后续会重试
        _markLoggedIn();
        if (callback) callback(true);
      });
    } else {
      // 全新用户，无数据迁移
      _markLoggedIn();
      _markMigrated();
      if (callback) callback(true);
    }
  }).catch(function (err) {
    console.warn('[authManager] 登录流程失败:', err);
    // 降级：标记登录，本地模式
    _markLoggedIn();
    if (callback) callback(true);
  });
}

/**
 * 退出登录
 *
 * 完整清除当前账号所有关联数据：
 * 1. 清除本地缓存中的所有用户数据（打卡、学习统计、斩题进度、错题本、历史记录等）
 * 2. 清除 openid 和登录态标记
 * 3. 重置 globalData.userInfo 为默认值
 *
 * 重新登录后，doLogin 流程会从云端拉取该账号数据恢复本地缓存
 */
function logout() {
  // 1. 清除所有用户绑定的本地缓存数据
  try {
    cloudSync.clearAllUserData();
  } catch (e) {
    console.warn('[authManager] 清除用户数据失败:', e);
  }

  // 2. 清除登录态标记、迁移标记、openid
  try {
    wx.removeStorageSync(LOGIN_KEY);
    wx.removeStorageSync(MIGRATED_KEY);
    wx.removeStorageSync(OPENID_KEY);
  } catch (e) { /* ignore */ }

  // 3. 重置 globalData.userInfo 和 avatarTempUrl 为默认值
  var app = getApp();
  if (app && app.globalData) {
    app.globalData.userInfo = { nickname: '导题斩题小工具用户', avatarUrl: '' };
    app.globalData.avatarTempUrl = '';
    try {
      wx.setStorageSync('userInfo', app.globalData.userInfo);
    } catch (e) { /* ignore */ }
  }
}

function _markLoggedIn() {
  try { wx.setStorageSync(LOGIN_KEY, true); } catch (e) { /* ignore */ }
}

function _markMigrated() {
  try { wx.setStorageSync(MIGRATED_KEY, true); } catch (e) { /* ignore */ }
}

/**
 * 登录完成后执行暂存的回调（登录页调用）
 */
function executePendingCallback() {
  var app = getApp();
  if (app && app._pendingLoginCallback) {
    var cb = app._pendingLoginCallback;
    app._pendingLoginCallback = null;
    try { cb(); } catch (e) { console.warn('[authManager] 回调执行失败:', e); }
  }
}

module.exports = {
  isLoggedIn: isLoggedIn,
  getOpenid: getOpenid,
  silentInit: silentInit,
  ensureLogin: ensureLogin,
  doLogin: doLogin,
  logout: logout,
  executePendingCallback: executePendingCallback,
};
