/**
 * 错题本工具模块
 *
 * 管理错题收录、SM-2间隔复习、错题统计
 * 当前阶段使用本地存储，后续接入云数据库
 */

const STORAGE_KEY = 'wrongBook';
const ERROR_TRACKING_KEY = 'errorTracking';

/** SM-2 间隔序列（天） */
const INTERVALS = [1, 2, 4, 7, 15, 30, 60];

/**
 * 获取完整错题本
 * @returns {Array} 错题记录数组
 */
function getWrongBook() {
  return wx.getStorageSync(STORAGE_KEY) || [];
}

/**
 * 保存错题本
 * @param {Array} book
 */
function saveWrongBook(book) {
  wx.setStorageSync(STORAGE_KEY, book);
}

/**
 * 获取错题追踪数据
 * @returns {Object}
 */
function getErrorTracking() {
  return wx.getStorageSync(ERROR_TRACKING_KEY) || {};
}

/**
 * 保存错题追踪数据
 * @param {Object} tracking
 */
function saveErrorTracking(tracking) {
  wx.setStorageSync(ERROR_TRACKING_KEY, tracking);
}

/**
 * 生成唯一ID
 */
function generateId() {
  return 'wrong_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * 手动添加错题
 * @param {Object} question - 完整题目数据
 * @param {string} bankId
 * @param {string} bankName
 * @param {string} knowledgePointId
 * @param {string} knowledgePointName
 * @returns {Object} 新增的错题记录
 */
function manualAdd(question, bankId, bankName, knowledgePointId, knowledgePointName) {
  const book = getWrongBook();

  // 检查是否已存在
  const existingIdx = book.findIndex((w) => w.questionId === question._id);
  if (existingIdx !== -1) {
    // 已存在：若为 mastered 则重置为 reviewing，否则直接返回
    if (book[existingIdx].status === 'mastered') {
      book[existingIdx].status = 'reviewing';
      book[existingIdx].currentIntervalIndex = 0;
      book[existingIdx].consecutiveReviewCorrect = 0;
      book[existingIdx].nextReviewAt = new Date().toISOString();
      book[existingIdx].updatedAt = new Date().toISOString();
      saveWrongBook(book);
      return book[existingIdx];
    }
    return book[existingIdx];
  }

  const record = {
    _id: generateId(),
    questionId: question._id,
    bankId,
    bankName,
    knowledgePointId: knowledgePointId || '',
    knowledgePointName: knowledgePointName || '',
    source: 'manual',
    errorCount: 1,
    reviewCount: 0,
    consecutiveReviewCorrect: 0,
    status: 'reviewing',
    nextReviewAt: new Date().toISOString(), // 立即可复习
    currentIntervalIndex: 0,
    question: question, // 存完整题目快照
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  book.push(record);
  saveWrongBook(book);
  return record;
}

/**
 * 自动收录判定 + 执行
 * 在每次答题提交后调用
 *
 * @param {Object} question - 当前题目
 * @param {string} bankId
 * @param {string} bankName
 * @param {boolean} isCorrect - 本题是否答对
 * @param {Array} sessionAnswers - 本次会话中该知识点/题目的最近答案记录
 */
function autoCollect(question, bankId, bankName, isCorrect) {
  if (isCorrect === true || isCorrect === null) return null; // 答对或未判不触发

  const tracking = getErrorTracking();
  const knowledgePointId = question.knowledgePointId || '';

  if (knowledgePointId) {
    // ─── 官方题库：按知识点追踪 ───
    return autoCollectByKP(question, bankId, bankName, knowledgePointId, tracking);
  } else {
    // ─── 自导入题库：按单题追踪 ───
    return autoCollectByQuestion(question, bankId, bankName, tracking);
  }
}

/**
 * 官方题库按知识点自动收录
 * 同一知识点累计错3次以上 → 该知识点下所有错题加入错题本
 */
function autoCollectByKP(question, bankId, bankName, kpId, tracking) {
  if (!tracking[kpId]) {
    tracking[kpId] = { totalErrors: 0, questionErrors: {} };
  }

  const kpTracking = tracking[kpId];
  kpTracking.totalErrors++;

  // 追踪单题错误次数（防御：无 _id 时生成稳定标识）
  var qId = question._id;
  if (!qId) {
    // 用题库+题干前80字生成伪ID，确保同一题追踪一致
    var stemKey = (question.content ? question.content.stem : (question.stem || '')).slice(0, 80);
    qId = 'auto_' + bankId + '_' + stemKey.replace(/[^a-zA-Z0-9一-龥]/g, '_');
    if (!qId || qId === 'auto_' + bankId + '_') return; // 无法生成有效标识，放弃追踪
  }
  if (!kpTracking.questionErrors[qId]) {
    kpTracking.questionErrors[qId] = 0;
  }
  kpTracking.questionErrors[qId]++;

  saveErrorTracking(tracking);

  // 累计错3次以上，触发自动收录
  if (kpTracking.totalErrors >= 3) {
    const book = getWrongBook();
    const kpName = question.knowledgePointName || '';

    // 将该知识点下所有记录过的错题加入错题本
    const addedRecords = [];

    // 尝试从本地 mockData 中查找历史题目的完整数据
    var mockData = null;
    try { mockData = require('../data/mockData'); } catch (e) { /* ignore */ }

    Object.keys(kpTracking.questionErrors).forEach((errQId) => {
      // 检查是否已在错题本中
      const existingIdx = book.findIndex((w) => w.questionId === errQId);
      if (existingIdx !== -1) {
        // 已存在：若为 mastered 则重置为 reviewing（重新激活），否则跳过
        if (book[existingIdx].status === 'mastered') {
          book[existingIdx].status = 'reviewing';
          book[existingIdx].currentIntervalIndex = 0;
          book[existingIdx].consecutiveReviewCorrect = 0;
          book[existingIdx].nextReviewAt = new Date().toISOString();
          book[existingIdx].updatedAt = new Date().toISOString();
          addedRecords.push(book[existingIdx]);
        }
        return;
      }

      // 尝试获取完整题目数据：当前题直接用，历史题从 mockData 查找
      var questionData = null;
      if (errQId === question._id) {
        questionData = question;
      } else if (mockData && mockData.questions) {
        questionData = mockData.questions.find(function (q) { return q._id === errQId; }) || null;
      }

      const record = {
        _id: generateId(),
        questionId: errQId,
        bankId,
        bankName,
        knowledgePointId: kpId,
        knowledgePointName: kpName,
        source: 'auto',
        errorCount: kpTracking.questionErrors[errQId],
        reviewCount: 0,
        consecutiveReviewCorrect: 0,
        status: 'reviewing',
        nextReviewAt: new Date().toISOString(),
        currentIntervalIndex: 0,
        question: questionData, // 优先从本地获取完整题目，null 时复习页会异步补查云DB
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      book.push(record);
      addedRecords.push(record);
    });

    if (addedRecords.length > 0) {
      saveWrongBook(book);
    }
    return addedRecords.length > 0 ? addedRecords : null;
  }

  return null;
}

/**
 * 自导入题库按单题自动收录
 * 同一道题错3次以上 → 加入错题本
 */
function autoCollectByQuestion(question, bankId, bankName, tracking) {
  var qId = question._id;
  if (!qId) {
    var stemKey = (question.content ? question.content.stem : (question.stem || '')).slice(0, 80);
    qId = 'auto_' + bankId + '_' + stemKey.replace(/[^a-zA-Z0-9一-龥]/g, '_');
    if (!qId || qId === 'auto_' + bankId + '_') return null;
  }
  if (!tracking[qId]) {
    tracking[qId] = { count: 0 };
  }
  tracking[qId].count++;
  saveErrorTracking(tracking);

  // 同步更新已存在记录中的 errorCount
  var book = getWrongBook();
  var existingRec = book.find(function (w) { return w.questionId === qId; });
  if (existingRec) {
    existingRec.errorCount = tracking[qId].count;
    existingRec.updatedAt = new Date().toISOString();
    saveWrongBook(book);
  }

  if (tracking[qId].count >= 3) {

    const record = {
      _id: generateId(),
      questionId: qId,
      bankId,
      bankName,
      knowledgePointId: '',
      knowledgePointName: '',
      source: 'auto',
      errorCount: tracking[qId].count,
      reviewCount: 0,
      consecutiveReviewCorrect: 0,
      status: 'reviewing',
      nextReviewAt: new Date().toISOString(),
      currentIntervalIndex: 0,
      question: question,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    book.push(record);
    saveWrongBook(book);
    return [record];
  }

  return null;
}

/**
 * 获取待复习错题列表
 * @returns {Array} 已到达复习时间的错题
 */
function getDueReviews() {
  const book = getWrongBook();
  const now = new Date();
  return book.filter((w) => {
    if (w.status !== 'reviewing') return false;
    var reviewDate = new Date(w.nextReviewAt);
    // 无效日期视为立即可复习（防止记录丢失）
    if (isNaN(reviewDate.getTime())) return true;
    return reviewDate <= now;
  });
}

/**
 * 按题库分组统计
 * @returns {Array} [{ bankId, bankName, total, reviewing, mastered, dueReview }]
 */
function getStatsByBank() {
  const book = getWrongBook();
  const now = new Date();
  const map = {};

  book.forEach((w) => {
    const key = w.bankId;
    if (!map[key]) {
      map[key] = {
        bankId: key,
        bankName: w.bankName,
        total: 0,
        reviewing: 0,
        mastered: 0,
        dueReview: 0,
      };
    }
    map[key].total++;
    if (w.status === 'mastered') {
      map[key].mastered++;
    } else {
      map[key].reviewing++;
      if (new Date(w.nextReviewAt) <= now) {
        map[key].dueReview++;
      }
    }
  });

  return Object.values(map);
}

/**
 * SM-2 复习提交
 * @param {string} wrongId - 错题记录 _id
 * @param {boolean} isCorrect - 本次复习是否答对
 * @returns {Object} 更新后的记录
 */
function reviewAnswer(wrongId, isCorrect) {
  const book = getWrongBook();
  const index = book.findIndex((w) => w._id === wrongId);
  if (index === -1) return null;

  const record = book[index];
  const now = new Date();

  record.reviewCount++;
  record.updatedAt = now.toISOString();

  // 防御：isCorrect 非布尔时（null/undefined）不更新间隔，仅记录复习次数
  if (isCorrect === true) {
    record.consecutiveReviewCorrect++;
    record.currentIntervalIndex = Math.min(record.currentIntervalIndex + 1, INTERVALS.length - 1);
    const intervalDays = INTERVALS[record.currentIntervalIndex];
    record.nextReviewAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

    // 连续3次复习正确 → 标记为已掌握
    if (record.consecutiveReviewCorrect >= 3) {
      record.status = 'mastered';
    }
  } else {
    record.consecutiveReviewCorrect = 0;
    record.currentIntervalIndex = 0;
    record.nextReviewAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
  }

  book[index] = record;
  saveWrongBook(book);
  return record;
}

/**
 * 根据 bankId 获取该题库下的错题列表
 * @param {string} bankId
 * @param {string} filter - 'all' | 'reviewing' | 'mastered' | 'due'
 */
function getWrongByBank(bankId, filter = 'all') {
  const book = getWrongBook();
  const now = new Date();

  return book.filter((w) => {
    if (w.bankId !== bankId) return false;
    switch (filter) {
      case 'reviewing':
        return w.status === 'reviewing';
      case 'mastered':
        return w.status === 'mastered';
      case 'due':
        return w.status === 'reviewing' && new Date(w.nextReviewAt) <= now;
      default:
        return true;
    }
  });
}

/**
 * 获取全局统计
 * @returns {{ totalWrong: number, dueReview: number, mastered: number }}
 */
function getGlobalStats() {
  const book = getWrongBook();
  const now = new Date();

  let dueReview = 0;
  let mastered = 0;

  book.forEach((w) => {
    if (w.status === 'mastered') {
      mastered++;
    } else {
      var d = new Date(w.nextReviewAt);
      if (isNaN(d.getTime()) || d <= now) {
        dueReview++;
      }
    }
  });

  return {
    totalWrong: book.length,
    dueReview,
    mastered,
  };
}

/**
 * 清除已掌握的错题
 * @param {string} bankId - 可选，指定题库
 */
function cleanMastered(bankId) {
  let book = getWrongBook();
  if (bankId) {
    book = book.filter((w) => !(w.status === 'mastered' && w.bankId === bankId));
  } else {
    book = book.filter((w) => w.status !== 'mastered');
  }
  saveWrongBook(book);
}

/**
 * 手动从错题本移除
 * @param {string} wrongId
 */
function removeWrong(wrongId) {
  const book = getWrongBook().filter((w) => w._id !== wrongId);
  saveWrongBook(book);
}

module.exports = {
  getWrongBook,
  saveWrongBook,
  getErrorTracking,
  manualAdd,
  autoCollect,
  getDueReviews,
  getStatsByBank,
  getWrongByBank,
  getGlobalStats,
  reviewAnswer,
  cleanMastered,
  removeWrong,
  INTERVALS,
};
