/**
 * 打卡管理模块（本地存储版）
 * - 基于 wx.Storage 的轻量打卡追踪
 * - 可后续升级为云数据库版本
 */

var STORAGE_KEY = 'checkin_dates';

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
    var expectedPrev = new Date(sorted[i - 1]);
    expectedPrev.setDate(expectedPrev.getDate() - 1);
    var expectedStr = expectedPrev.toISOString().split('T')[0];

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
