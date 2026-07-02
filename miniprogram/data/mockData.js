/**
 * 本地数据层
 *
 * P1 修复：移除了测试用的 mock 题库数据（数学/英语/政治/自导入），
 * 现在所有题库均通过管理端导入到云数据库，前端从云端读取。
 *
 * 保留空数组结构以兼容现有引用：
 *   utils/questionData.js、utils/wrongBook.js、pages/bank/list/index.js 等
 *   均通过 require('../data/mockData') 引入并使用 .banks / .questions / .knowledgePoints / .questionClasses
 *   返回空数组时，这些代码会自动降级为「无数据」状态，不会报错。
 *
 * 后续真正的题库数据全部存储在云数据库 banks / questions / knowledge_points / question_classes 集合中。
 */

const mockData = {
  "banks": [],
  "knowledgePoints": [],
  "questionClasses": [],
  "questions": []
};

module.exports = mockData;
