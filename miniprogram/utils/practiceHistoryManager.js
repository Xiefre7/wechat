/**
 * 练习历史记录管理模块
 *
 * 在每次刷题/背题会话完成时记录一条历史，用于：
 * - 首页"历史记录"区域展示最近刷过的题库
 * - 历史记录页展示完整列表
 *
 * 按题库聚合：同一题库多次刷题会合并为一条记录，更新最后时间和累计进度
 * 本地存储 + 云端同步（write-through）
 *
 * 存储 key：practice_history
 */

const STORAGE_KEY = 'practice_history';
const MAX_RECORDS = 50;

/** 懒加载 cloudSync */
var _cloudSync = null;
function _getCloudSync() {
  if (_cloudSync === null) {
    try { _cloudSync = require('./cloudSync'); } catch (e) { _cloudSync = false; }
  }
  return _cloudSync || null;
}

/** 异步同步练习历史到云端（防抖） */
var _syncTimer = null;
function _syncToCloud() {
  var cs = _getCloudSync();
  if (!cs) return;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(function () {
    _syncTimer = null;
    cs.saveSection('practiceHistory', getHistory());
  }, 2000);
}

/**
 * 读取全部历史记录（按最近时间倒序）
 * @returns {Array}
 */
function getHistory() {
  return wx.getStorageSync(STORAGE_KEY) || [];
}

/**
 * 记录/更新一次刷题会话
 * @param {Object} info
 *   - bankId, bankName, bankType, category
 *   - knowledgePointName
 *   - totalQuestions (本次会话题目数)
 *   - correctCount
 *   - accuracy
 */
function recordSession(info) {
  if (!info || !info.bankId) return;

  var list = getHistory();
  var now = new Date();
  var iso = now.toISOString();

  // 查找是否已有该题库记录
  var idx = -1;
  for (var i = 0; i < list.length; i++) {
    if (list[i].bankId === info.bankId) {
      idx = i;
      break;
    }
  }

  var record;
  if (idx >= 0) {
    // 已有 → 更新累计
    record = list[idx];
    record.totalDone = (record.totalDone || 0) + (info.totalQuestions || 0);
    record.sessionCount = (record.sessionCount || 0) + 1;
    record.lastTimeISO = iso;
    record.lastTimeText = formatRelativeTime(now);
    record.accuracy = info.accuracy != null ? info.accuracy : record.accuracy;
    record.knowledgePointName = info.knowledgePointName || record.knowledgePointName;
    // 移到最前
    list.splice(idx, 1);
    list.unshift(record);
  } else {
    // 新增
    record = {
      bankId: info.bankId,
      bankName: info.bankName || '未命名题库',
      bankType: info.bankType || 'official',
      category: info.category || '',
      subject: mapSubject(info.category),
      subjectName: info.category || '',
      knowledgePointName: info.knowledgePointName || '',
      totalDone: info.totalQuestions || 0,
      totalQuestions: info.totalQuestions || 0,
      sessionCount: 1,
      accuracy: info.accuracy != null ? info.accuracy : 0,
      lastTimeISO: iso,
      lastTimeText: formatRelativeTime(now),
      progress: 0,
    };
    list.unshift(record);
  }

  // 限制条数
  if (list.length > MAX_RECORDS) {
    list = list.slice(0, MAX_RECORDS);
  }

  wx.setStorageSync(STORAGE_KEY, list);

  // 异步上云
  _syncToCloud();

  return record;
}

/**
 * 科目名映射为样式 key（用于 wxss class）
 */
function mapSubject(category) {
  if (category === '数学') return 'math';
  if (category === '英语') return 'english';
  if (category === '政治') return 'politics';
  return 'other';
}

/**
 * 格式化相对时间
 * @param {Date} date
 * @returns {string} "刚刚"、"5分钟前"、"3小时前"、"昨天"、"2天前"、"2026-06-01"
 */
function formatRelativeTime(date) {
  var now = new Date();
  var diff = now - date;
  var mins = Math.floor(diff / 60000);
  var hours = Math.floor(diff / 3600000);
  var days = Math.floor(diff / 86400000);

  if (mins < 1) return '刚刚';
  if (mins < 60) return mins + '分钟前';
  if (hours < 24) return hours + '小时前';

  // 判断是否为昨天
  var yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (date.getFullYear() === yest.getFullYear() &&
      date.getMonth() === yest.getMonth() &&
      date.getDate() === yest.getDate()) {
    return '昨天';
  }
  if (days < 7) return days + '天前';

  // 超过7天显示日期
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

/**
 * 获取最近 N 条历史（用于首页展示）
 * @param {number} [n=3]
 * @returns {Array}
 */
function getRecent(n) {
  n = n || 3;
  var list = getHistory();
  return list.slice(0, n);
}

/**
 * 删除某题库的历史记录
 * @param {string} bankId
 */
function removeByBankId(bankId) {
  var list = getHistory();
  var filtered = list.filter(function (r) { return r.bankId !== bankId; });
  if (filtered.length !== list.length) {
    wx.setStorageSync(STORAGE_KEY, filtered);
  }
}

/**
 * 清空全部历史
 */
function clearAll() {
  wx.removeStorageSync(STORAGE_KEY);
}

module.exports = {
  getHistory: getHistory,
  getRecent: getRecent,
  recordSession: recordSession,
  removeByBankId: removeByBankId,
  clearAll: clearAll,
};
