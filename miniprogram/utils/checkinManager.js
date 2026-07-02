/**
 * 打卡管理模块
 * - 本地存储 + 云端同步（write-through）
 */

var STORAGE_KEY = 'checkin_dates';

/** 懒加载 cloudSync */
var _cloudSync = null;
function _getCloudSync() {
  if (_cloudSync === null) {
    try { _cloudSync = require('./cloudSync'); } catch (e) { _cloudSync = false; }
  }
  return _cloudSync || null;
}

/** 异步同步打卡数据到云端 */
function _syncToCloud() {
  var cs = _getCloudSync();
  if (!cs) return;
  cs.saveSection('checkin', { dates: getCheckinDates() });
}

/** 获取今天的日期字符串 YYYY-MM-DD */
function getTodayStr() {
  var d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/** 获取昨天的日期字符串 */
function getYesterdayStr() {
  var d = new Date();
  d.setDate(d.getDate() - 1);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/** 获取已打卡的日期集合 */
function getCheckinDates() {
  try {
    var raw = wx.getStorageSync(STORAGE_KEY);
    if (!raw || !Array.isArray(raw)) return [];
    return raw;
  } catch (e) {
    return [];
  }
}

/** 保存打卡日期集合 */
function saveCheckinDates(dates) {
  try {
    wx.setStorageSync(STORAGE_KEY, dates);
  } catch (e) {
    console.warn('打卡数据保存失败:', e);
  }
}

/**
 * 计算连续打卡天数
 * 从今天往回数，找到连续的最长序列
 */
function calcStreak(dates) {
  if (!dates || dates.length === 0) return 0;

  var today = getTodayStr();
  var yesterday = getYesterdayStr();
  var sorted = dates.slice().sort().reverse(); // 从新到旧

  // 最近一次打卡必须是今天或昨天，否则连续中断
  var latest = sorted[0];
  if (latest !== today && latest !== yesterday) return 0;

  var streak = 1;
  for (var i = 1; i < sorted.length; i++) {
    var expectedPrev = new Date(sorted[i - 1] + 'T00:00:00');
    expectedPrev.setDate(expectedPrev.getDate() - 1);
    // 使用本地日期构造，避免 UTC 时区偏移导致日期错位
    var ey = expectedPrev.getFullYear();
    var em = String(expectedPrev.getMonth() + 1).padStart(2, '0');
    var ed = String(expectedPrev.getDate()).padStart(2, '0');
    var expectedStr = ey + '-' + em + '-' + ed;

    if (sorted[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * 执行打卡
 * @returns {{ streak: number, isToday: boolean, totalDays: number }}
 */
function doCheckin() {
  var dates = getCheckinDates();
  var today = getTodayStr();
  var isToday = dates.indexOf(today) !== -1;

  if (!isToday) {
    dates.push(today);
    saveCheckinDates(dates);
    // 异步上云
    _syncToCloud();
  }

  return {
    streak: calcStreak(dates),
    isToday: true,
    totalDays: dates.length
  };
}

/**
 * 获取打卡概览
 * @returns {{ streak: number, checkedInToday: boolean, totalDays: number }}
 */
function getCheckinSummary() {
  var dates = getCheckinDates();
  var today = getTodayStr();
  return {
    streak: calcStreak(dates),
    checkedInToday: dates.indexOf(today) !== -1,
    totalDays: dates.length
  };
}

/**
 * 判断今天是否已打卡
 */
function isCheckedInToday() {
  var dates = getCheckinDates();
  return dates.indexOf(getTodayStr()) !== -1;
}

module.exports = {
  getCheckinSummary: getCheckinSummary,
  doCheckin: doCheckin,
  isCheckedInToday: isCheckedInToday,
  getTodayStr: getTodayStr
};
