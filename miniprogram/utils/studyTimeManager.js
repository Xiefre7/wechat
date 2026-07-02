/**
 * 学习时长管理模块
 *
 * 追踪用户在刷题/背题/错题复习中的累计学习时长
 * - 按周统计（每周一 00:00 自动刷新）
 * - 同时维护一个「总累计时长」用于 mine 页展示
 * - 本地存储 + 云端同步（write-through）
 */

/** 当周学习时长（秒） — 每周一重置 */
const WEEKLY_KEY = 'study_time_weekly';
/** 历史总累计（秒） — 只增不减 */
const TOTAL_KEY = 'study_time_total';
/** 累计答题数 */
const QUESTIONS_KEY = 'total_questions_answered';
/** 今日答题计数 — 每日重置 */
const TODAY_KEY = 'today_questions_answered';

/** 懒加载 cloudSync（避免循环依赖） */
var _cloudSync = null;
function _getCloudSync() {
  if (_cloudSync === null) {
    try { _cloudSync = require('./cloudSync'); } catch (e) { _cloudSync = false; }
  }
  return _cloudSync || null;
}

/** 异步同步 studyStats 到云端（防抖：合并短时间内的多次写入） */
var _syncTimer = null;
function _syncToCloud() {
  var cs = _getCloudSync();
  if (!cs) return;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(function () {
    _syncTimer = null;
    var data = {
      weeklySeconds: wx.getStorageSync(WEEKLY_KEY) || { weekStart: '', seconds: 0 },
      totalSeconds: wx.getStorageSync(TOTAL_KEY) || 0,
      totalQuestions: wx.getStorageSync(QUESTIONS_KEY) || 0,
      todayQuestions: wx.getStorageSync(TODAY_KEY) || { date: '', count: 0 }
    };
    cs.saveSection('studyStats', data);
  }, 2000);
}

/**
 * 获取今日日期字符串
 * @returns {string} 'YYYY-MM-DD'
 */
function getToday() {
  var now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

/**
 * 获取本周起始日期（周一）
 * @returns {string} 'YYYY-MM-DD'
 */
function getMonday() {
  const now = new Date();
  const day = now.getDay(); // 0=周日, 1=周一...6=周六
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return [monday.getFullYear(), String(monday.getMonth() + 1).padStart(2, '0'), String(monday.getDate()).padStart(2, '0')].join('-');
}

/**
 * 读取当周数据（自动处理跨周重置）
 * @returns {{ weekStart: string, seconds: number }}
 */
function _loadWeekly() {
  var data = wx.getStorageSync(WEEKLY_KEY);
  var monday = getMonday();
  if (!data || data.weekStart !== monday) {
    data = { weekStart: monday, seconds: 0 };
  }
  return data;
}

/**
 * 保存当周数据
 */
function _saveWeekly(data) {
  wx.setStorageSync(WEEKLY_KEY, data);
}

/**
 * 累加学习时长
 * @param {number} seconds 本次学习秒数
 */
function addStudyTime(seconds) {
  if (!seconds || seconds <= 0) return;

  // 当周
  var weekly = _loadWeekly();
  weekly.seconds += seconds;
  _saveWeekly(weekly);

  // 总累计
  var total = wx.getStorageSync(TOTAL_KEY) || 0;
  total += seconds;
  wx.setStorageSync(TOTAL_KEY, total);

  // 异步上云
  _syncToCloud();
}

/**
 * 获取当周学习时长（秒）
 * @returns {number}
 */
function getWeeklySeconds() {
  return _loadWeekly().seconds;
}

/**
 * 获取总累计学习时长（秒）
 * @returns {number}
 */
function getTotalSeconds() {
  return wx.getStorageSync(TOTAL_KEY) || 0;
}

/**
 * 格式化时长为显示文本
 * @param {number} seconds
 * @returns {string} 如 "3.5小时"、"0.2小时"、"48分钟"
 */
function formatTime(seconds) {
  if (!seconds || seconds < 60) {
    return '0小时';
  }
  var hours = seconds / 3600;
  if (hours >= 0.1) {
    return hours.toFixed(1) + '小时';
  }
  var mins = Math.round(seconds / 60);
  return mins + '分钟';
}

/**
 * 获取当周学习时长（格式化文本）
 * @returns {string}
 */
function getWeeklyFormatted() {
  return formatTime(getWeeklySeconds());
}

/**
 * 获取总累计学习时长（格式化文本）
 * @returns {string}
 */
function getTotalFormatted() {
  return formatTime(getTotalSeconds());
}

/**
 * 记录一道题已作答（累加总刷题数 + 今日刷题数）
 */
function recordQuestionAnswered() {
  // 累计总数
  var count = getTotalQuestions() + 1;
  wx.setStorageSync(QUESTIONS_KEY, count);

  // 今日计数
  var todayData = wx.getStorageSync(TODAY_KEY);
  if (!todayData || todayData.date !== getToday()) {
    todayData = { date: getToday(), count: 0 };
  }
  todayData.count += 1;
  wx.setStorageSync(TODAY_KEY, todayData);

  // 异步上云
  _syncToCloud();

  return count;
}

/**
 * 获取累计刷题数
 * @returns {number}
 */
function getTotalQuestions() {
  return wx.getStorageSync(QUESTIONS_KEY) || 0;
}

/**
 * 获取今日刷题数（跨日自动归零）
 * @returns {number}
 */
function getTodayQuestions() {
  var todayData = wx.getStorageSync(TODAY_KEY);
  if (!todayData || todayData.date !== getToday()) {
    return 0;
  }
  return todayData.count || 0;
}

module.exports = {
  addStudyTime: addStudyTime,
  getWeeklySeconds: getWeeklySeconds,
  getTotalSeconds: getTotalSeconds,
  getWeeklyFormatted: getWeeklyFormatted,
  getTotalFormatted: getTotalFormatted,
  formatTime: formatTime,
  // 答题计数
  recordQuestionAnswered: recordQuestionAnswered,
  getTotalQuestions: getTotalQuestions,
  getTodayQuestions: getTodayQuestions,
};
