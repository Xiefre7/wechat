/**
 * 云端数据同步工具
 *
 * 统一管理 user_data 集合的读写操作。
 * 每个用户在 user_data 集合中有一个文档，以 openid 自动关联。
 *
 * 文档结构：
 * {
 *   _openid: "自动",
 *   checkin: { dates: ["2026-07-01", ...] },
 *   studyStats: { weeklySeconds, totalSeconds, totalQuestions, todayQuestions },
 *   practiceHistory: [...],
 *   slashProgress: { classSlash, questionSlash, kpProgress },
 *   updatedAt: "ISO"
 * }
 *
 * 同步策略：
 * - 读取：登录时从云端拉取全量到本地缓存，之后读取走本地
 * - 写入：本地立即更新 + 异步上云（write-through，不阻塞 UI）
 */

var SYNC_KEY = 'cloud_sync_pending';

/**
 * 是否有云能力
 */
function _cloudReady() {
  var app = getApp();
  return !!(wx.cloud && app && app.globalData && app.globalData.env);
}

/**
 * 调用云函数的 Promise 封装
 */
function _callFunction(data) {
  return new Promise(function (resolve, reject) {
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: data,
      success: function (res) { resolve(res.result); },
      fail: function (err) { reject(err); }
    });
  });
}

/**
 * 从云端拉取用户完整数据
 * @returns {Promise<Object|null>}
 */
function fetchCloudData() {
  if (!_cloudReady()) return Promise.resolve(null);
  return _callFunction({ type: 'getUserData' }).then(function (result) {
    if (result && result.success) {
      return result.data || null;
    }
    return null;
  }).catch(function (err) {
    console.warn('[cloudSync] 拉取云端数据失败:', err);
    return null;
  });
}

/**
 * 保存部分数据到云端（增量更新）
 * 未登录时静默跳过，避免无谓的云函数调用
 * @param {string} section - 'checkin' | 'studyStats' | 'practiceHistory' | 'slashProgress'
 * @param {*} data - 该 section 的完整数据
 * @returns {Promise}
 */
function saveSection(section, data) {
  if (!_cloudReady()) return Promise.resolve(null);
  // 未登录时跳过（避免无谓调用）
  try {
    if (wx.getStorageSync('user_logged_in') !== true) return Promise.resolve(null);
  } catch (e) { /* ignore */ }
  return _callFunction({
    type: 'saveUserData',
    section: section,
    data: data
  }).then(function (result) {
    return result;
  }).catch(function (err) {
    console.warn('[cloudSync] 保存 ' + section + ' 失败:', err);
    // 记录待同步标记，下次可重试
    try {
      var pending = wx.getStorageSync(SYNC_KEY) || {};
      pending[section] = true;
      wx.setStorageSync(SYNC_KEY, pending);
    } catch (e) { /* ignore */ }
    return null;
  });
}

/**
 * 首次登录迁移本地数据到云端
 * @param {Object} localData - { checkin, studyStats, practiceHistory, slashProgress }
 * @returns {Promise<Object>} 返回合并后的云端数据
 */
function migrateLocal(localData) {
  if (!_cloudReady()) return Promise.resolve(null);
  return _callFunction({
    type: 'migrateLocalData',
    localData: localData
  }).then(function (result) {
    if (result && result.success) {
      return result.data || null;
    }
    return null;
  }).catch(function (err) {
    console.warn('[cloudSync] 迁移本地数据失败:', err);
    return null;
  });
}

/**
 * 收集本地所有需同步的数据
 */
function collectLocalData() {
  var data = {};
  try { data.checkin = { dates: wx.getStorageSync('checkin_dates') || [] }; } catch (e) { data.checkin = { dates: [] }; }
  try {
    data.studyStats = {
      weeklySeconds: wx.getStorageSync('study_time_weekly') || { weekStart: '', seconds: 0 },
      totalSeconds: wx.getStorageSync('study_time_total') || 0,
      totalQuestions: wx.getStorageSync('total_questions_answered') || 0,
      todayQuestions: wx.getStorageSync('today_questions_answered') || { date: '', count: 0 }
    };
  } catch (e) {
    data.studyStats = { weeklySeconds: { weekStart: '', seconds: 0 }, totalSeconds: 0, totalQuestions: 0, todayQuestions: { date: '', count: 0 } };
  }
  try { data.practiceHistory = wx.getStorageSync('practice_history') || []; } catch (e) { data.practiceHistory = []; }
  try {
    data.slashProgress = {
      classSlash: wx.getStorageSync('classSlashProgress') || {},
      questionSlash: wx.getStorageSync('questionSlashProgress') || {},
      kpProgress: wx.getStorageSync('kpProgress') || {}
    };
  } catch (e) {
    data.slashProgress = { classSlash: {}, questionSlash: {}, kpProgress: {} };
  }
  // 补充错题本和错题追踪数据同步
  try { data.wrongBook = wx.getStorageSync('wrongBook') || []; } catch (e) { data.wrongBook = []; }
  try { data.errorTracking = wx.getStorageSync('errorTracking') || {}; } catch (e) { data.errorTracking = {}; }
  return data;
}

/**
 * 将云端数据写入本地缓存
 */
function applyCloudToLocal(cloudData) {
  if (!cloudData) return;
  try {
    if (cloudData.checkin && cloudData.checkin.dates) {
      wx.setStorageSync('checkin_dates', cloudData.checkin.dates);
    }
    if (cloudData.studyStats) {
      var s = cloudData.studyStats;
      if (s.weeklySeconds) wx.setStorageSync('study_time_weekly', s.weeklySeconds);
      if (s.totalSeconds !== undefined) wx.setStorageSync('study_time_total', s.totalSeconds);
      if (s.totalQuestions !== undefined) wx.setStorageSync('total_questions_answered', s.totalQuestions);
      if (s.todayQuestions) wx.setStorageSync('today_questions_answered', s.todayQuestions);
    }
    if (cloudData.practiceHistory) {
      wx.setStorageSync('practice_history', cloudData.practiceHistory);
    }
    if (cloudData.slashProgress) {
      var sp = cloudData.slashProgress;
      if (sp.classSlash) wx.setStorageSync('classSlashProgress', sp.classSlash);
      if (sp.questionSlash) wx.setStorageSync('questionSlashProgress', sp.questionSlash);
      if (sp.kpProgress) wx.setStorageSync('kpProgress', sp.kpProgress);
    }
    // 恢复错题本和错题追踪数据
    if (cloudData.wrongBook) {
      wx.setStorageSync('wrongBook', cloudData.wrongBook);
    }
    if (cloudData.errorTracking) {
      wx.setStorageSync('errorTracking', cloudData.errorTracking);
    }
  } catch (e) {
    console.warn('[cloudSync] 写入本地缓存失败:', e);
  }
}

/**
 * 检查本地是否有用户数据（用于判断是否需要迁移）
 */
function hasLocalData() {
  try {
    var keys = _USER_DATA_KEYS();
    for (var i = 0; i < keys.length; i++) {
      var val = wx.getStorageSync(keys[i]);
      if (val && (typeof val === 'object' ? Object.keys(val).length > 0 : val > 0)) {
        return true;
      }
    }
  } catch (e) { /* ignore */ }
  return false;
}

/**
 * 所有与用户账号绑定的本地缓存 key 列表
 * 退出登录时需要全部清除，防止账号间数据残留
 *
 * 注意：以下 key 不在此列表中（设备级偏好，非用户绑定）：
 * - themeMode（主题模式）
 * - user_logged_in / data_migrated（由 authManager 单独管理）
 * - user_openid（由 authManager 单独管理）
 * - userInfo（由 app.js 单独管理）
 */
function _USER_DATA_KEYS() {
  return [
    // 打卡
    'checkin_dates',
    // 学习时长统计
    'study_time_weekly',
    'study_time_total',
    'total_questions_answered',
    'today_questions_answered',
    // 练习历史
    'practice_history',
    // 斩题进度
    'classSlashProgress',
    'questionSlashProgress',
    'kpProgress',
    'slashRollbackDaily',
    'reviveNotification',
    // 错题本
    'wrongBook',
    'errorTracking',
    // 云同步待重试标记
    'cloud_sync_pending',
    // 导入草稿 / 预览数据
    'manualDraft',
    'importPreviewData',
    // 练习会话临时数据
    'practiceSession',
    'practiceResult',
    // 错题复习列表临时数据
    'wrongReviewList',
    // OCR 使用次数记录
    'ocrUsage',
    // 预解析的头像 temp URL（退出登录后失效，重新登录时重新生成）
    'avatarTempUrl',
  ];
}

/**
 * 清除所有与当前用户账号绑定的本地缓存数据
 *
 * 退出登录时调用，确保：
 * 1. 头像和昵称重置为默认值（由 authManager 负责 app.globalData.userInfo）
 * 2. 打卡情况清零
 * 3. 学习时长归零
 * 4. 自导入题库草稿清空（云端题库不受影响，重新登录后从云端拉取）
 * 5. 历史记录清除
 * 6. 斩题进度清零
 * 7. 错题本清空
 * 8. 其他所有个性化数据移除
 *
 * 重新登录后，doLogin 流程会从云端拉取该账号数据写入本地
 */
function clearAllUserData() {
  var keys = _USER_DATA_KEYS();
  for (var i = 0; i < keys.length; i++) {
    try {
      wx.removeStorageSync(keys[i]);
    } catch (e) {
      console.warn('[cloudSync] 清除 ' + keys[i] + ' 失败:', e);
    }
  }
}

module.exports = {
  fetchCloudData: fetchCloudData,
  saveSection: saveSection,
  migrateLocal: migrateLocal,
  collectLocalData: collectLocalData,
  applyCloudToLocal: applyCloudToLocal,
  hasLocalData: hasLocalData,
  clearAllUserData: clearAllUserData,
};
