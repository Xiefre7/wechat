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
    var keys = ['checkin_dates', 'study_time_total', 'total_questions_answered',
                'practice_history', 'classSlashProgress', 'questionSlashProgress',
                'kpProgress', 'wrongBook', 'errorTracking'];
    for (var i = 0; i < keys.length; i++) {
      var val = wx.getStorageSync(keys[i]);
      if (val && (typeof val === 'object' ? Object.keys(val).length > 0 : val > 0)) {
        return true;
      }
    }
  } catch (e) { /* ignore */ }
  return false;
}

module.exports = {
  fetchCloudData: fetchCloudData,
  saveSection: saveSection,
  migrateLocal: migrateLocal,
  collectLocalData: collectLocalData,
  applyCloudToLocal: applyCloudToLocal,
  hasLocalData: hasLocalData,
};
