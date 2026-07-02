/**
 * 斩题管理工具模块 v2
 *
 * 按题类（questionClass）维度管理斩题：
 *  - 知识点下设多个题类，每个题类包含多道同类型题目
 *  - 做 3 道同类题，对 ≥2 道 → 可斩
 *  - 7 天后自动复活
 *  - 每日 3 次回滚撤销
 *
 * 自定义题库仍按单题维度斩题（保持 v1 逻辑）。
 * 本地存储 + 云端同步（write-through）
 */

const CLASS_PROGRESS_KEY = 'classSlashProgress';
const Q_SLASH_KEY = 'questionSlashProgress';
const KP_PROGRESS_KEY = 'kpProgress';
const ROLLBACK_KEY = 'slashRollbackDaily';

/** 斩杀阈值 */
const SLASH_NEED_COUNT = 3;       // 需要做满 3 题
const SLASH_MIN_CORRECT = 2;      // 至少对 2 题
/** 复活天数 */
const REVIVE_DAYS = 7;
const REVIVE_MS = REVIVE_DAYS * 24 * 60 * 60 * 1000;
/** 每日回滚上限 */
const MAX_ROLLBACK = 3;

/** 懒加载 cloudSync */
var _cloudSync = null;
function _getCloudSync() {
  if (_cloudSync === null) {
    try { _cloudSync = require('./cloudSync'); } catch (e) { _cloudSync = false; }
  }
  return _cloudSync || null;
}

/** 异步同步斩题进度到云端（防抖） */
var _syncTimer = null;
function _syncToCloud() {
  var cs = _getCloudSync();
  if (!cs) return;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(function () {
    _syncTimer = null;
    cs.saveSection('slashProgress', {
      classSlash: wx.getStorageSync(CLASS_PROGRESS_KEY) || {},
      questionSlash: wx.getStorageSync(Q_SLASH_KEY) || {},
      kpProgress: wx.getStorageSync(KP_PROGRESS_KEY) || {}
    });
  }, 2000);
}

/* ================================================================
 * 读 / 写
 * ================================================================ */

function getClassProgress() {
  return wx.getStorageSync(CLASS_PROGRESS_KEY) || {};
}

function saveClassProgress(data) {
  wx.setStorageSync(CLASS_PROGRESS_KEY, data);
  _syncToCloud();
}

function getQuestionProgress() {
  return wx.getStorageSync(Q_SLASH_KEY) || {};
}

function saveQuestionProgress(data) {
  wx.setStorageSync(Q_SLASH_KEY, data);
  _syncToCloud();
}

function getKpProgress() {
  return wx.getStorageSync(KP_PROGRESS_KEY) || {};
}

/* ================================================================
 * 回滚计数
 * ================================================================ */

function getRollbackRemaining() {
  const today = new Date().toISOString().slice(0, 10);
  const data = wx.getStorageSync(ROLLBACK_KEY);
  if (!data || data.date !== today) return MAX_ROLLBACK;
  return Math.max(0, MAX_ROLLBACK - data.count);
}

function _useRollback() {
  const today = new Date().toISOString().slice(0, 10);
  const data = wx.getStorageSync(ROLLBACK_KEY);
  const prev = (data && data.date === today) ? data.count : 0;
  wx.setStorageSync(ROLLBACK_KEY, { date: today, count: prev + 1 });
}

/* ================================================================
 * 题类斩题 — 答题追踪
 * ================================================================ */

/**
 * 记录一道题类的答题结果，返回是否触发斩题标记
 * @param {string} classId     questionClassId
 * @param {boolean} isCorrect  本题是否答对
 * @param {string} className   题类名称（用于记录）
 * @returns {{ readyToSlash: boolean, answered: number, correct: number }}
 */
function trackClassAnswer(classId, isCorrect, className) {
  const progress = getClassProgress();
  const entry = progress[classId] || {
    answered: 0,
    correct: 0,
    slashed: false,
    slashedAt: null,
    name: className || '',
  };

  if (entry.slashed) {
    return { readyToSlash: false, answered: entry.answered, correct: entry.correct };
  }

  entry.answered++;
  if (isCorrect) entry.correct++;
  if (className) entry.name = className;

  progress[classId] = entry;
  saveClassProgress(progress);

  const ready = entry.answered >= SLASH_NEED_COUNT && entry.correct >= SLASH_MIN_CORRECT;
  return { readyToSlash: ready, answered: entry.answered, correct: entry.correct };
}

/**
 * 获取题类在当前 session 中的状态（不写入存储，只读取）
 * 用于判断是否需要显示斩题按钮
 */
function getClassSessionState(classId) {
  const progress = getClassProgress();
  const entry = progress[classId];
  if (!entry || entry.slashed) return { readyToSlash: false };
  return {
    readyToSlash: entry.answered >= SLASH_NEED_COUNT && entry.correct >= SLASH_MIN_CORRECT,
    answered: entry.answered || 0,
    correct: entry.correct || 0,
  };
}

/* ================================================================
 * 题类斩题 — 执行
 * ================================================================ */

/** 执行斩题 */
function executeClassSlash(classId) {
  const progress = getClassProgress();
  const entry = progress[classId] || {};
  progress[classId] = {
    ...entry,
    slashed: true,
    slashedAt: new Date().toISOString(),
  };
  saveClassProgress(progress);
}

/** 判断题类是否已斩 */
function isClassSlashed(classId) {
  const progress = getClassProgress();
  return !!(progress[classId] && progress[classId].slashed);
}

/** 撤销题类斩题 */
function rollbackClassSlash(classId) {
  const remaining = getRollbackRemaining();
  if (remaining <= 0) {
    return { success: false, errMsg: '今日撤销次数已用完（每日3次）' };
  }
  const progress = getClassProgress();
  const entry = progress[classId];
  if (!entry || !entry.slashed) {
    return { success: false, errMsg: '该题类未被斩掉' };
  }
  progress[classId] = {
    ...entry,
    slashed: false,
    slashedAt: null,
    answered: 0,
    correct: 0,
  };
  saveClassProgress(progress);
  _useRollback();
  return { success: true };
}

/* ================================================================
 * 自导入题库 — 单题斩（保持 v1 逻辑）
 * ================================================================ */

function trackCustomAnswer(questionId, isCorrect, bankId, stem) {
  if (!questionId) return null;
  const progress = getQuestionProgress();
  const qp = progress[questionId] || {
    recentCorrect: [], slashed: false,
    bankId: bankId || '', stem: (stem || '').slice(0, 50),
  };
  if (qp.slashed) return null;
  qp.recentCorrect.push(isCorrect);
  if (qp.recentCorrect.length > 10) qp.recentCorrect = qp.recentCorrect.slice(-10);
  if (bankId) qp.bankId = bankId;
  if (stem) qp.stem = stem.slice(0, 50);
  progress[questionId] = qp;
  saveQuestionProgress(progress);
  if (qp.recentCorrect.length < 10) return null;
  const rate = qp.recentCorrect.filter(Boolean).length / qp.recentCorrect.length;
  if (rate >= 0.8) {
    return { triggered: true, correctRate: Math.round(rate * 100) };
  }
  return null;
}

function executeCustomSlash(questionId) {
  const progress = getQuestionProgress();
  progress[questionId] = { ...(progress[questionId] || {}), slashed: true, slashedAt: new Date().toISOString() };
  saveQuestionProgress(progress);
}

function rollbackCustomSlash(questionId) {
  const remaining = getRollbackRemaining();
  if (remaining <= 0) return { success: false, errMsg: '今日撤销次数已用完' };
  const progress = getQuestionProgress();
  if (!progress[questionId] || !progress[questionId].slashed) return { success: false, errMsg: '该题目未被斩掉' };
  progress[questionId] = { ...progress[questionId], slashed: false, slashedAt: null, recentCorrect: [] };
  saveQuestionProgress(progress);
  _useRollback();
  return { success: true };
}

function isCustomQuestionSlashed(questionId) {
  const p = getQuestionProgress();
  return !!(p[questionId] && p[questionId].slashed);
}

/* ================================================================
 * 7 天复活检查
 * ================================================================ */

function checkAndRevive() {
  const now = new Date();
  let total = 0;

  // 题类复活（含 NaN 防御：无效日期视为已过期直接复活）
  const cp = getClassProgress();
  Object.keys(cp).forEach((id) => {
    const e = cp[id];
    if (e.slashed && e.slashedAt) {
      var slashedDate = new Date(e.slashedAt);
      if (isNaN(slashedDate.getTime()) || (now - slashedDate) >= REVIVE_MS) {
        cp[id] = { ...e, slashed: false, slashedAt: null, answered: 0, correct: 0 };
        total++;
      }
    }
  });
  saveClassProgress(cp);

  // 自导入单题复活（含 NaN 防御）
  const qp = getQuestionProgress();
  Object.keys(qp).forEach((id) => {
    const e = qp[id];
    if (e.slashed && e.slashedAt) {
      var qSlashedDate = new Date(e.slashedAt);
      if (isNaN(qSlashedDate.getTime()) || (now - qSlashedDate) >= REVIVE_MS) {
        qp[id] = { ...e, slashed: false, slashedAt: null, recentCorrect: [] };
        total++;
      }
    }
  });
  saveQuestionProgress(qp);

  // KP 进度复活（兼容旧数据，含 NaN 防御）
  const kp = getKpProgress();
  let kpRevived = 0;
  Object.keys(kp).forEach((id) => {
    const e = kp[id];
    if (e.slashed && e.slashedAt) {
      var kSlashedDate = new Date(e.slashedAt);
      if (isNaN(kSlashedDate.getTime()) || (now - kSlashedDate) >= REVIVE_MS) {
        kp[id] = { ...e, slashed: false, slashedAt: null, recentCorrect: [] };
        kpRevived++;
      }
    }
  });
  if (kpRevived > 0) {
    wx.setStorageSync(KP_PROGRESS_KEY, kp);
    total += kpRevived;
  }

  // 如果有复活，触发同步
  if (total > 0) {
    _syncToCloud();
  }

  if (total > 0) {
    wx.setStorageSync('reviveNotification', { count: total, timestamp: now.toISOString(), seen: false });
  }

  return { total };
}

function getReviveNotification() {
  return wx.getStorageSync('reviveNotification') || null;
}

function markReviveSeen() {
  const data = wx.getStorageSync('reviveNotification');
  if (data) { data.seen = true; wx.setStorageSync('reviveNotification', data); }
}

/* ================================================================
 * 管理页查询
 * ================================================================ */

function getAllSlashedItems() {
  const now = new Date();
  const cp = getClassProgress();
  const classItems = Object.keys(cp)
    .filter((id) => cp[id].slashed)
    .map((id) => {
      const e = cp[id];
      const elapsed = e.slashedAt ? now - new Date(e.slashedAt) : 0;
      return {
        id, type: 'class', name: e.name || id,
        slashedAt: e.slashedAt || '',
        daysUntilRevive: Math.max(0, Math.ceil((REVIVE_MS - elapsed) / 86400000)),
      };
    });

  const qp = getQuestionProgress();
  const customItems = Object.keys(qp)
    .filter((id) => qp[id].slashed)
    .map((id) => {
      const e = qp[id];
      const elapsed = e.slashedAt ? now - new Date(e.slashedAt) : 0;
      return {
        id, type: 'custom', name: e.stem || id, bankId: e.bankId || '',
        slashedAt: e.slashedAt || '',
        daysUntilRevive: Math.max(0, Math.ceil((REVIVE_MS - elapsed) / 86400000)),
      };
    });

  return { classItems, customItems };
}

module.exports = {
  // 题类斩题
  trackClassAnswer,
  getClassSessionState,
  executeClassSlash,
  rollbackClassSlash,
  isClassSlashed,
  SLASH_NEED_COUNT,
  SLASH_MIN_CORRECT,

  // 自导入单题斩
  trackCustomAnswer,
  executeCustomSlash,
  rollbackCustomSlash,
  isCustomQuestionSlashed,

  // 回滚
  getRollbackRemaining,

  // 复活
  checkAndRevive,
  getReviveNotification,
  markReviveSeen,

  // 管理
  getAllSlashedItems,
};
