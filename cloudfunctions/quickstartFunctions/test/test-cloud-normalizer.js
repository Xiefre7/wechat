/**
 * 云函数侧 optionNormalizer 模块测试
 * 运行方式：node test-cloud-normalizer.js
 */
'use strict';

const path = require('path');
const {
  normalizeOptionLayouts,
  detectType,
  extractOptionsFromLine,
  cleanStem,
} = require('../lib/optionNormalizer');

let total = 0, passed = 0;
function assert(cond, label) { total++; cond ? (passed++, console.log('  \x1b[32m✓\x1b[0m ' + label)) : console.log('  \x1b[31m✗ FAIL:\x1b[0m ' + label); }

console.log('\n云函数 optionNormalizer 模块测试');
console.log('='.repeat(50));

// 单行选项
const r1 = normalizeOptionLayouts('1. 题目\nA. 选项1  B. 选项2  C. 选项3  D. 选项4\n答案：A');
assert(r1.split('\n').filter(l => /^[A-D]\./.test(l.trim())).length === 4, '单行4选项拆分');

// Tab 分隔
const r2 = normalizeOptionLayouts('1. 题\nA. a\tB. b\tC. c\tD. d\n答案：A');
assert(r2.split('\n').filter(l => /^[A-D]\./.test(l.trim())).length === 4, 'Tab分隔4选项拆分');

// 两行
const r3 = normalizeOptionLayouts('1. 题\nA. a1  B. a2\nC. a3  D. a4\n答案：A');
assert(r3.split('\n').filter(l => /^[A-D]\./.test(l.trim())).length === 4, '两行2+2拆分');

// 防误判
const r4 = normalizeOptionLayouts('维生素A缺乏症主要表现为夜盲');
assert(r4.split('\n').length === 1, '维生素A不误拆');

// detectType
assert(detectType('下列哪些正确', 4, 'ABC', [{text:'a'},{text:'b'},{text:'c'},{text:'d'}]) === 'multi_choice', '多选题判别');
assert(detectType('判断：xxx', 2, '对', [{text:'对'},{text:'错'}]) === 'true_false', '判断题判别');
assert(detectType('中国首都是____', 0, '北京', []) === 'fill_blank', '填空题判别');
assert(detectType('简述xxx', 0, '', []) === 'short_answer', '简答题判别');
assert(detectType('常规题目', 4, 'B', [{text:'a'},{text:'b'},{text:'c'},{text:'d'}]) === 'single_choice', '单选题判别');

// cleanStem
assert(cleanStem('【单选题】1. 真正题干') === '真正题干', '题干清洗-多层前缀');
assert(cleanStem('1. 题干') === '题干', '题干清洗-数字前缀');

// extractOptionsFromLine
const opts = extractOptionsFromLine('A. 北京  B. 上海  C. 广州');
assert(opts && opts.length === 3, '提取3个连续选项');
assert(opts[0].key === 'A' && opts[0].text === '北京', '选项A内容正确');

console.log('\n结果：' + passed + '/' + total + ' 通过' + (passed === total ? ' \x1b[32m✓\x1b[0m' : ' \x1b[31m✗\x1b[0m'));
