/**
 * 题目数据访问层
 *
 * 统一云数据库 + 本地 mockData 的读取入口。
 * 优先从云数据库查询，失败时降级到本地 mockData。
 */

var mockData = null;
var _cloudAvailable = null;

/** 懒加载 mockData */
function getMockData() {
  if (!mockData) {
    try { mockData = require('../data/mockData'); } catch (e) { mockData = { banks: [], questions: [], knowledgePoints: [], questionClasses: [] }; }
  }
  return mockData;
}

/** 检测云开发是否可用 */
function isCloudAvailable() {
  if (_cloudAvailable !== null) return _cloudAvailable;
  try {
    _cloudAvailable = !!(wx.cloud && wx.cloud.database);
  } catch (e) {
    _cloudAvailable = false;
  }
  return _cloudAvailable;
}

/**
 * 按 ID 查找题目（云DB优先 → mockData 降级）
 * @param {string} questionId
 * @returns {Promise<object|null>}
 */
function findQuestionById(questionId) {
  if (!questionId) return Promise.resolve(null);

  // 先查本地缓存
  var md = getMockData();
  var local = md.questions.find(function (q) { return q._id === questionId; });
  if (local) return Promise.resolve(local);

  // 本地没有 → 查云数据库
  if (isCloudAvailable()) {
    return wx.cloud.database().collection('questions')
      .where({ _id: questionId })
      .limit(1)
      .get()
      .then(function (res) {
        return (res.data && res.data.length > 0) ? res.data[0] : null;
      })
      .catch(function (err) {
        console.warn('findQuestionById 云DB查询失败，降级为 null:', err);
        return null;
      });
  }

  return Promise.resolve(null);
}

/**
 * 按题库 ID 获取题目列表（云DB优先 → mockData 降级）
 * @param {string} bankId
 * @param {object} opts — { knowledgePointId, questionClassId, limit }
 * @returns {Promise<Array>}
 */
function findQuestionsByBank(bankId, opts) {
  opts = opts || {};
  var md = getMockData();

  // 检查是否在本地 mockData 中
  var localBank = md.banks.find(function (b) { return b._id === bankId; });
  if (localBank) {
    var list = md.questions.filter(function (q) {
      if (q.bankId !== bankId) return false;
      if (opts.knowledgePointId && q.knowledgePointId !== opts.knowledgePointId) return false;
      if (opts.questionClassId && q.questionClassId !== opts.questionClassId) return false;
      return true;
    });
    return Promise.resolve(list);
  }

  // 云端题库
  if (isCloudAvailable()) {
    var condition = { bankId: bankId, status: 'active' };
    if (opts.knowledgePointId) condition.knowledgePointId = opts.knowledgePointId;
    if (opts.questionClassId) condition.questionClassId = opts.questionClassId;

    return wx.cloud.database().collection('questions')
      .where(condition)
      .limit(opts.limit || 500)
      .get()
      .then(function (res) { return res.data || []; })
      .catch(function () { return []; });
  }

  return Promise.resolve([]);
}

/**
 * 按知识点 ID 获取知识点头信息
 * @param {string} kpId
 * @returns {object|null}
 */
function findKnowledgePointById(kpId) {
  if (!kpId) return null;
  var md = getMockData();
  return md.knowledgePoints.find(function (kp) { return kp._id === kpId; }) || null;
}

/**
 * 按题类 ID 获取题类信息
 * @param {string} classId
 * @returns {object|null}
 */
function findQuestionClassById(classId) {
  if (!classId) return null;
  var md = getMockData();
  return md.questionClasses.find(function (qc) { return qc._id === classId; }) || null;
}

/**
 * 按题库 ID 获取题库信息（本地 + 云端）
 * @param {string} bankId
 * @returns {Promise<object|null>}
 */
function findBankById(bankId) {
  if (!bankId) return Promise.resolve(null);
  var md = getMockData();
  var local = md.banks.find(function (b) { return b._id === bankId; });
  if (local) return Promise.resolve(local);

  if (isCloudAvailable()) {
    return wx.cloud.database().collection('banks')
      .where({ _id: bankId })
      .limit(1)
      .get()
      .then(function (res) { return (res.data && res.data.length > 0) ? res.data[0] : null; })
      .catch(function () { return null; });
  }

  return Promise.resolve(null);
}

module.exports = {
  findQuestionById: findQuestionById,
  findQuestionsByBank: findQuestionsByBank,
  findKnowledgePointById: findKnowledgePointById,
  findQuestionClassById: findQuestionClassById,
  findBankById: findBankById,
};
