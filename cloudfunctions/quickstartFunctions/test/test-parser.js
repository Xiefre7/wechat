/**
 * 考斩过 — Word/文本导入 选项识别 & 题型判别 测试集
 *
 * 模拟真实用户可能输入的各类题型和排版格式。
 * 覆盖：单行选项 / 两行选项 / 四行选项 / Tab分隔 / 括号选项 / 圈数字
 *       单选 / 多选 / 判断 / 填空 / 简答
 *       边缘情况（空行、缺少题干、维生素A误判、答案含字母）
 *
 * 运行方式：node test-parser.js
 */

'use strict';

// 使用客户端解析器测试（与用户粘贴文本共用同一套代码）
// 从 test 目录向上一级到 quickstartFunctions，再向上一级到 cloudfunctions，再定位到 miniprogram
const path = require('path');
const questionParserPath = path.resolve(__dirname, '../../../miniprogram/utils/questionParser');
const { parseQuestions, normalizeOptionLayouts, detectType } = require(questionParserPath);

let totalTests = 0;
let passedTests = 0;

function assert(condition, label) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log('  ✓ ' + label);
  } else {
    console.log('  ✗ FAIL: ' + label);
  }
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  console.log('  ' + title);
  console.log('='.repeat(60));
}

// ================================================================
// 测试组 1: 选项布局标准化 (normalizeOptionLayouts)
// ================================================================
section('1. 选项布局标准化');

(function test1_single_line_4_options() {
  const input = '1. 中国的首都是？\nA. 北京  B. 上海  C. 广州  D. 深圳\n答案：A';
  const result = normalizeOptionLayouts(input);
  const lines = result.split('\n');
  const optLines = lines.filter(l => /^[A-D]\.\s/.test(l.trim()));
  assert(optLines.length === 4, '单行4选项 → 拆分为4个独立选项行');
  assert(optLines[0].includes('北京'), '选项A文本正确');
  assert(optLines[3].includes('深圳'), '选项D文本正确');
})();

(function test1_single_line_chinese_separator() {
  const input = '1. 下列哪个是哺乳动物？\nA、鲸鱼  B、鲨鱼  C、鳄鱼  D、青蛙\n答案：A';
  const result = normalizeOptionLayouts(input);
  const lines = result.split('\n');
  const optLines = lines.filter(l => /^[A-D]\.\s/.test(l.trim()));
  assert(optLines.length === 4, '单行4选项(顿号分隔) → 拆分为4行');
})();

(function test1_two_line_2_plus_2() {
  const input = '1. 光合作用的产物是？\nA. 氧气  B. 葡萄糖\nC. 水  D. 二氧化碳\n答案：AB';
  const result = normalizeOptionLayouts(input);
  const lines = result.split('\n');
  const optLines = lines.filter(l => /^[A-D]\.\s/.test(l.trim()));
  assert(optLines.length === 4, '两行2+2选项 → 拆分为4个独立选项行');
})();

(function test1_four_line_standard() {
  const input = '1. TCP/IP协议中哪层负责路由？\nA. 应用层\nB. 传输层\nC. 网络层\nD. 链路层\n答案：C';
  const result = normalizeOptionLayouts(input);
  const lines = result.split('\n');
  const optLines = lines.filter(l => /^[A-D]\.\s/.test(l.trim()));
  assert(optLines.length === 4, '标准四行格式 → 保持不变');
})();

(function test1_mixed_layout() {
  const input = '1. 以下哪些是正确的？（不定项）\nA. 地球绕太阳转  B. 月亮自身发光\nC. 水在0°C结冰\nD. 光速是3×10⁸m/s\n答案：ACD';
  const result = normalizeOptionLayouts(input);
  const lines = result.split('\n');
  const optLines = lines.filter(l => /^[A-D]\.\s/.test(l.trim()));
  assert(optLines.length === 4, '混合布局(第一行2选项+后两行各1选项) → 4行');
})();

(function test1_tab_separated() {
  const input = '1. HTTP状态码200表示？\nA. 成功\tB. 重定向\tC. 客户端错误\tD. 服务端错误\n答案：A';
  const result = normalizeOptionLayouts(input);
  const lines = result.split('\n');
  const optLines = lines.filter(l => /^[A-D]\.\s/.test(l.trim()));
  assert(optLines.length === 4, 'Tab分隔4选项 → 拆分为4行');
})();

(function test1_circle_numbers() {
  const input = '1. 以下哪个不是编程语言？\n① Python  ② Java  ③ HTML  ④ C++\n答案：③';
  const result = normalizeOptionLayouts(input);
  const lines = result.split('\n');
  const optLines = lines.filter(l => /^[A-D]\.\s/.test(l.trim()));
  assert(optLines.length === 4, '圈数字4选项 → 转换为A-D字母选项');
})();

(function test1_bracket_options() {
  const input = '1. 水的化学式是？\n（A）H₂O  （B）CO₂  （C）NaCl  （D）O₂\n答案：A';
  const result = normalizeOptionLayouts(input);
  const lines = result.split('\n');
  const optLines = lines.filter(l => /^[A-D]\.\s/.test(l.trim()));
  assert(optLines.length === 4, '中文括号选项 → 拆分为4行');
})();

(function test1_no_false_positive_vitamin() {
  const input = '1. 维生素A缺乏可导致夜盲症，维生素B缺乏会导致口角炎\n答案：夜盲症、口角炎';
  const result = normalizeOptionLayouts(input);
  assert(!result.includes('A. 缺乏'), '维生素A不误拆为选项');
  assert(!result.includes('B. 缺乏'), '维生素B不误拆为选项');
})();

(function test1_answer_line_preserved() {
  const input = '1. 题目内容\nA. 选项一\nB. 选项二\n答案：A\n解析：这是解析内容';
  const result = normalizeOptionLayouts(input);
  assert(result.includes('答案：A'), '答案行原样保留');
  assert(result.includes('解析：这是解析内容'), '解析行原样保留');
})();

// ================================================================
// 测试组 2: 题型判别 (detectType)
// ================================================================
section('2. 题型判别 — 多选题');

(function test2_multi_choice_keywords() {
  const type = detectType('下列哪些属于可再生能源？', 4, 'ABC', [{text:'太阳能'},{text:'风能'},{text:'煤炭'},{text:'水能'}]);
  assert(type === 'multi_choice', '题干含"下列哪些"+答案ABC → 多选题');
})();

(function test2_multi_choice_no_keywords_but_multi_answer() {
  const type = detectType('以下属于哺乳动物的是', 5, 'ABD', [
    {text:'鲸鱼'},{text:'鲨鱼'},{text:'蝙蝠'},{text:'鳄鱼'},{text:'人类'}
  ]);
  assert(type === 'multi_choice', '无关键词但答案含多字母+5选项 → 多选题');
})();

(function test2_multi_choice_bu_ding_xiang() {
  const type = detectType('下列说法不正确的是（不定项）', 4, 'BCD', [
    {text:'A选项'},{text:'B选项'},{text:'C选项'},{text:'D选项'}
  ]);
  assert(type === 'multi_choice', '题干含"不定项" → 多选题');
})();

section('2. 题型判别 — 判断题');

(function test2_true_false_from_options() {
  const type = detectType('判断下列说法是否正确：地球绕太阳转', 2, 'A', [
    {text:'对'},{text:'错'}
  ]);
  assert(type === 'true_false', '选项为对/错 → 判断题');
})();

(function test2_true_false_from_keyword() {
  const type = detectType('判断题：1+1=2', 2, 'A', [
    {text:'正确'},{text:'错误'}
  ]);
  assert(type === 'true_false', '题干含"判断题"+选项正确/错误 → 判断题');
})();

(function test2_true_false_from_answer() {
  const type = detectType('以下说法正确吗？水在100°C沸腾', 2, '对', [
    {text:'对'},{text:'错'}
  ]);
  assert(type === 'true_false', '答案为"对"+选项为对/错 → 判断题');
})();

section('2. 题型判别 — 填空题');

(function test2_fill_blank_underscore() {
  const type = detectType('中国首都是____，最大的城市是____', 0, '北京|上海', []);
  assert(type === 'fill_blank', '题干含____下划线 → 填空题');
})();

(function test2_fill_blank_keyword() {
  const type = detectType('填空题：光合作用的原料是___和___', 0, '二氧化碳|水', []);
  assert(type === 'fill_blank', '题干含"填空题"+下划线 → 填空题');
})();

(function test2_fill_blank_bracket() {
  const type = detectType('《红楼梦》的作者是（  ）', 0, '曹雪芹', []);
  assert(type === 'fill_blank', '题干含中文括号填空 → 填空题');
})();

section('2. 题型判别 — 简答题');

(function test2_short_answer() {
  const type = detectType('简述光合作用的过程', 0, '', []);
  assert(type === 'short_answer', '题干含"简述"+无选项 → 简答题');
})();

(function test2_short_answer_long_text() {
  const type = detectType('请分析中国近代史上鸦片战争爆发的主要原因及其对中国社会的影响', 0, '', []);
  assert(type === 'short_answer', '长题干无选项无填空标记 → 简答题');
})();

section('2. 题型判别 — 单选题');

(function test2_single_choice_standard() {
  const type = detectType('HTTP协议默认端口号是？', 4, 'B', [
    {text:'21'},{text:'80'},{text:'443'},{text:'8080'}
  ]);
  assert(type === 'single_choice', '4选项+单字母答案+无多选关键词 → 单选题');
})();

// ================================================================
// 测试组 3: 完整解析流程 (parseQuestions)
// ================================================================
section('3. 完整解析流程');

(function test3_mixed_types_full_parse() {
  const input = [
    '1. TCP协议工作在OSI模型的哪一层？',
    'A. 物理层  B. 数据链路层  C. 传输层  D. 应用层',
    '答案：C',
    '解析：TCP是传输层协议，提供可靠的端到端数据传输',
    '',
    '2. 下列哪些属于OSI模型层次？（多选）',
    'A. 应用层',
    'B. 传输层',
    'C. 网络层',
    'D. 会话层',
    'E. 物理层',
    '答案：ABCDE',
    '',
    '3. 判断：HTTP是应用层协议',
    'A. 对',
    'B. 错',
    '答案：对',
    '',
    '4. DNS的全称是____，默认端口号是____',
    '答案：Domain Name System|53',
    '',
    '5. 简述TCP和UDP的主要区别',
    '答案：TCP面向连接可靠传输，UDP无连接不可靠但速度快',
  ].join('\n');

  const result = parseQuestions(input);
  const qs = result.questions;

  assert(qs.length === 5, '5道混合题型全部解析成功');
  assert(qs[0].type === 'single_choice', '第1题 → 单选题');
  assert(qs[1].type === 'multi_choice', '第2题 → 多选题');
  assert(qs[2].type === 'true_false', '第3题 → 判断题');
  assert(qs[3].type === 'fill_blank', '第4题 → 填空题');
  assert(qs[4].type === 'short_answer', '第5题 → 简答题');

  // 验证判断题答案规范化
  assert(qs[2].answer === 'A', '判断题"对"规范化 → A');
})();

(function test3_user_paste_compact_format() {
  // 模拟用户从Word复制粘贴的紧凑排版（最常见的场景）
  const input = [
    '1. 计算机中数据存储的最小单位是？',
    'A. 字节  B. 位  C. 字  D. KB',
    '答案：B',
    '',
    '2. 以下哪些是输入设备？',
    'A. 键盘  B. 显示器  C. 鼠标  D. 打印机  E. 扫描仪',
    '答案：ACE',
    '',
    '3. 判断：ROM中的数据断电后会丢失',
    'A. 对  B. 错',
    '答案：错',
    '',
    '4. 1KB = ____ 字节，1MB = ____ KB',
    '答案：1024|1024',
  ].join('\n');

  const result = parseQuestions(input);
  const qs = result.questions;

  assert(qs.length === 4, '紧凑排版4题全部解析');
  assert(qs[0].options.length === 4, '第1题4个选项');
  assert(qs[1].options.length === 5, '第2题5个选项(含E)');
  assert(qs[1].type === 'multi_choice', '第2题 → 多选题');
  assert(qs[2].type === 'true_false', '第3题 → 判断题');
  assert(qs[2].answer === 'B', '判断题"错"规范化 → B');
  assert(qs[3].type === 'fill_blank', '第4题 → 填空题');

  // 验证 typeDistribution
  assert(result.typeDistribution.single_choice === 1, '题型分布：1单选');
  assert(result.typeDistribution.multi_choice === 1, '题型分布：1多选');
  assert(result.typeDistribution.true_false === 1, '题型分布：1判断');
  assert(result.typeDistribution.fill_blank === 1, '题型分布：1填空');
})();

(function test3_two_line_options() {
  // 模拟用户文档中每个选项独占一行但答案在一行的场景
  // 以及真正的两行两列场景
  const input = [
    '1. 以下哪个是中国的四大发明之一？',
    'A. 造纸术  B. 蒸汽机',
    'C. 指南针  D. 电灯',
    '答案：A',
    '',
    '2. 操作系统的主要功能包括',
    'A. 进程管理  B. 存储管理  C. 设备管理',
    'D. 文件管理  E. 作业管理',
    '答案：ABCDE',
    '',
    '3. 数据结构中，栈的特点是____，队列的特点是____',
    '答案：先进后出|先进先出',
  ].join('\n');

  const result = parseQuestions(input);
  const qs = result.questions;

  assert(qs.length === 3, '两行混合布局3题全部解析');
  assert(qs[0].options.length === 4, '第1题(2+2两行) → 4个选项');
  assert(qs[1].options.length === 5, '第2题(3+2两行) → 5个选项');
  assert(qs[1].type === 'multi_choice', '第2题 → 多选题');
  assert(qs[2].type === 'fill_blank', '第3题 → 填空题');
})();

// ================================================================
// 测试组 4: 边缘情况
// ================================================================
section('4. 边缘情况');

(function test4_empty_input() {
  const result = parseQuestions('');
  assert(result.questions.length === 0, '空输入 → 0题');
  assert(result.stats.total === 0, '空输入 → total=0');
})();

(function test4_only_stem_no_options() {
  const input = '1. 请解释什么是闭包';
  const result = parseQuestions(input);
  assert(result.questions.length === 1, '纯题干无选项 → 1题');
  assert(result.questions[0].type === 'short_answer', '纯题干 → 简答题');
})();

(function test4_answer_with_letter_not_misparsed() {
  const input = [
    '1. 维生素C的化学名称是？',
    'A. 抗坏血酸',
    'B. 视黄醇',
    'C. 核黄素',
    'D. 烟酸',
    '答案：A',
  ].join('\n');
  const result = parseQuestions(input);
  assert(result.questions.length === 1, '答案A不被拆分为新题');
  assert(result.questions[0].options.length === 4, '4个选项正确识别');
})();

(function test4_explanation_not_misparsed_as_question() {
  const input = [
    '1. 题目内容',
    'A. 选项一',
    'B. 选项二',
    '答案：B',
    '解析：此题考查基础知识，选项A不符合题意',
  ].join('\n');
  const result = parseQuestions(input);
  assert(result.questions.length === 1, '解析内容不误拆为新题');
  assert(result.questions[0].explanation.includes('此题考查基础知识'), '解析内容正确提取');
})();

(function test4_multi_line_stem() {
  const input = [
    '1. 阅读以下代码片段：',
    '   int a = 10;',
    '   int b = a++ + ++a;',
    '   请回答b的值是多少？',
    'A. 20',
    'B. 21',
    'C. 22',
    'D. 23',
    '答案：C',
  ].join('\n');
  const result = parseQuestions(input);
  assert(result.questions.length === 1, '多行题干 → 1题');
  assert(result.questions[0].type === 'single_choice', '多行题干 → 单选题');
  assert(result.questions[0].stem.includes('int a = 10'), '题干包含完整代码');
})();

(function test4_numbered_list_not_misparsed() {
  // 题干中的编号不应被当成新题号
  const input = [
    '1. 以下选项中，属于TCP/IP协议栈的有：',
    '   1) 应用层',
    '   2) 传输层',
    '   3) 网络层',
    '   4) 链路层',
    'A. 1)2)3)',
    'B. 1)2)4)',
    'C. 全部都是',
    'D. 1)3)4)',
    '答案：C',
  ].join('\n');
  const result = parseQuestions(input);
  assert(result.questions.length === 1, '题干内编号列表不误拆为新题');
  assert(result.questions[0].options.length === 4, '4个选项正确识别');
})();

// ================================================================
// 测试组 5: 答案规范化
// ================================================================
section('5. 判断题答案规范化');

(function test5_tf_true_variants() {
  const inputs = ['对', '正确', '√', 'T', 'true', 'True'];
  const result = parseQuestions(
    inputs.map((ans, i) =>
      `${i + 1}. 判断题目\nA. 对\nB. 错\n答案：${ans}`
    ).join('\n\n')
  );
  assert(result.questions.length === 6, '6道判断题全部解析');
  result.questions.forEach((q, i) => {
    assert(q.answer === 'A', `判断题答案"${inputs[i]}"规范化 → A`);
    assert(q.type === 'true_false', `第${i + 1}题 → 判断题`);
  });
})();

(function test5_tf_false_variants() {
  const inputs = ['错', '错误', '×', 'F', 'false', 'False'];
  const result = parseQuestions(
    inputs.map((ans, i) =>
      `${i + 1}. 判断题目\nA. 对\nB. 错\n答案：${ans}`
    ).join('\n\n')
  );
  result.questions.forEach((q, i) => {
    assert(q.answer === 'B', `判断题答案"${inputs[i]}"规范化 → B`);
    assert(q.type === 'true_false', `第${i + 1}题 → 判断题`);
  });
})();

// ================================================================
// 测试结果汇总
// ================================================================

console.log('\n');
console.log('='.repeat(60));
console.log('  测试结果：' + passedTests + '/' + totalTests + ' 通过');
if (passedTests === totalTests) {
  console.log('  ✓ 全部通过!');
} else {
  console.log('  ✗ ' + (totalTests - passedTests) + ' 项未通过');
}
console.log('='.repeat(60));
