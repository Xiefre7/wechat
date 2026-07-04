/**
 * 答题进度记忆管理器
 *
 * 按 题库ID + 模式 独立保存答题进度，支持刷题模式（practice）和背题模式（memorize）。
 * 用户退出页面（包括滑出/返回）时自动保存当前题目索引，下次进入时从上次位置继续。
 *
 * 存储键格式：practice_progress_{bankId}_{mode}
 * 存储值：{ index, total, savedAt }
 *
 * 仅对自导入题库（custom 类型）启用进度记忆；
 * 官方题库因每次随机选择题类，不适用进度记忆。
 */

var STORAGE_PREFIX = 'practice_progress_';

/**
 * 保存答题进度
 * @param {string} bankId - 题库ID
 * @param {string} mode - 'practice' | 'memorize'
 * @param {number} index - 当前题目索引（0-based）
 * @param {number} total - 题目总数
 */
function saveProgress(bankId, mode, index, total) {
  if (!bankId || !mode) return;
  if (typeof index !== 'number' || index < 0) return;
  var key = STORAGE_PREFIX + bankId + '_' + mode;
  try {
    wx.setStorageSync(key, {
      index: index,
      total: total || 0,
      savedAt: Date.now(),
    });
  } catch (e) {
    // 静默失败，进度保存不应影响主流程
    console.warn('[progressManager] saveProgress failed:', e.message);
  }
}

/**
 * 读取答题进度
 * @param {string} bankId
 * @param {string} mode
 * @param {number} currentTotal - 当前题目总数（用于校验，如果与保存时不一致则视为无效）
 * @returns {number} 起始索引（0-based），无有效进度时返回 0
 */
function getProgress(bankId, mode, currentTotal) {
  if (!bankId || !mode) return 0;
  var key = STORAGE_PREFIX + bankId + '_' + mode;
  try {
    var saved = wx.getStorageSync(key);
    if (!saved || typeof saved.index !== 'number') return 0;
    // 题目数量变化（如重新导入）→ 进度无效
    if (currentTotal && saved.total && saved.total !== currentTotal) return 0;
    // 索引越界 → 进度无效
    if (currentTotal && saved.index >= currentTotal) return 0;
    // 进度过期（超过7天）→ 清除
    if (saved.savedAt && Date.now() - saved.savedAt > 7 * 24 * 60 * 60 * 1000) {
      wx.removeStorageSync(key);
      return 0;
    }
    return saved.index;
  } catch (e) {
    return 0;
  }
}

/**
 * 清除答题进度（完成答题后调用）
 * @param {string} bankId
 * @param {string} mode
 */
function clearProgress(bankId, mode) {
  if (!bankId || !mode) return;
  var key = STORAGE_PREFIX + bankId + '_' + mode;
  try {
    wx.removeStorageSync(key);
  } catch (e) {
    // 静默失败
  }
}

/**
 * 检查是否有未完成的进度
 * @param {string} bankId
 * @param {string} mode
 * @param {number} currentTotal
 * @returns {boolean}
 */
function hasProgress(bankId, mode, currentTotal) {
  return getProgress(bankId, mode, currentTotal) > 0;
}

module.exports = {
  saveProgress: saveProgress,
  getProgress: getProgress,
  clearProgress: clearProgress,
  hasProgress: hasProgress,
};
