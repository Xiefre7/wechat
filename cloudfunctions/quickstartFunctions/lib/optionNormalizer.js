/**
 * 导题斩题小工具 - 选项布局标准化 & 题型判别共享模块
 *
 * 解决 Word 文档导入时选项排版多样（1行/2行/4行/混合）的识别问题，
 * 并提供增强的题型判别打分引擎。
 *
 * 核心思路：在文本进入解析循环前，将所有选项布局标准化为
 * "每行一个选项" 的规范格式，后续逻辑无需改动。
 */

'use strict';

// ==================== 常量定义 ====================

/** 题型关键词 → 标准类型映射 */
const TYPE_KEYWORDS = {
  single_choice: ['单选', '单选题', '单项选择', '单项选择题'],
  multi_choice: ['多选', '多选题', '多项选择', '多项选择题', '不定项', '多项', '不定项选择题'],
  true_false: ['判断', '判断题', '是非题'],
  fill_blank: ['填空', '填空题'],
  short_answer: ['简答', '简答题', '问答', '问答题', '论述', '名词解释'],
};
const TYPE_KEYS = Object.keys(TYPE_KEYWORDS);

/** 选项字母前缀 — 支持 A. A、A) A．A: A 后跟中文 等格式 */
const OPT_LETTER_RE = /^\s*([A-Za-z])\s*(?:[\.\、\)）．:：]\s*|\s+(?=\S)|(?=[一-鿿《》“”‘’]))/;

/** 中文圈数字选项：① ② ③ ④ … ⑩ */
const OPT_CIRCLE_RE = /^\s*([①②③④⑤⑥⑦⑧⑨⑩])\s*/;

/** 中文括号选项：（A） */
const OPT_CHINBRACKET_RE = /^\s*[（(]\s*([A-Za-z])\s*[）)]\s*/;

/** 英文括号选项：(A) */
const OPT_ENBRACKET_RE = /^\s*\(\s*([A-Za-z])\s*\)\s*/;

/** 答案行正则 — 支持 【答案】/ 答案：/ 参考答案：/ 正确答案： 等 */
const ANSWER_RE = /^(?:【?答案】?|【?参考答案】?|【?正确答案】?)\s*[：:：]?\s*(.+)/i;

/** 答案+解析合并行 — 答案 | 解析 或 答案   解析（3个以上空格分隔） */
const ANSWER_EXPL_RE = /^(?:【?答案】?|【?参考答案】?|【?正确答案】?)\s*[：:：]\s*(.+?)\s*(?:\||\s{3,})\s*(?:解析|答案解析|详解)\s*[：:：]\s*(.+)/i;

/** 纯解析行 */
const EXPLANATION_RE = /^(?:【?解析】?|【?答案解析】?|【?详解】?|【?试题解析】?|解析|答案解析|详解|试题解析)\s*[：:：]?\s*(.+)/i;

/** 判断题正确值 */
const TF_TRUE = /^(对|正确|√|✓|T|true|True|YES)$/;

/** 判断题错误值 */
const TF_FALSE = /^(错|错误|×|✗|F|false|False|NO)$/;

// ==================== 选项提取函数 ====================

/**
 * 从单行文本中提取多个连续选项
 * 支持：A. xxx  B. yyy  C. zzz（空格分隔）
 *       A、xxx  B、yyy  C、zzz（中文顿号分隔）
 *       A) xxx  B) yyy  C) zzz（英文括号分隔）
 *
 * @param {string} line - 单行文本
 * @returns {Array|null} [{key, text}, ...] 或 null
 */
function extractOptionsFromLine(line) {
  var options = [];
  var remaining = line.trim();

  while (remaining) {
    var match = remaining.match(OPT_LETTER_RE);
    if (!match) break;
    var key = match[1].toUpperCase();
    var rest = remaining.slice(match[0].length);

    // 查找下一个选项的位置
    var nextMatch = rest.match(/\s+[A-Za-z]\s*[\.\、\)）．:：]\s*/);
    var text;
    if (nextMatch && nextMatch.index > 0) {
      text = rest.slice(0, nextMatch.index).trim();
      remaining = rest.slice(nextMatch.index);
    } else {
      text = rest.trim();
      remaining = '';
    }
    options.push({ key: key, text: text });
  }

  return options.length > 0 ? options : null;
}

/**
 * 从单行中提取括号格式选项：(A) xxx （B）yyy C) zzz
 */
function extractBracketOptionsFromLine(line, bracketRe) {
  var options = [];
  var remaining = line.trim();
  while (remaining) {
    var match = remaining.match(bracketRe);
    if (!match) break;
    var key = match[1].toUpperCase();
    var rest = remaining.slice(match[0].length);
    var nextMatch = rest.match(/\s+[（(]\s*[A-Za-z]\s*[）)]\s*/);
    var text;
    if (nextMatch && nextMatch.index > 0) {
      text = rest.slice(0, nextMatch.index).trim();
      remaining = rest.slice(nextMatch.index);
    } else {
      text = rest.trim();
      remaining = '';
    }
    options.push({ key: key, text: text });
  }
  return options.length > 0 ? options : null;
}

/**
 * 从单行中提取圈数字选项：① xxx ② yyy ③ zzz
 */
function extractCircleOptionsFromLine(line) {
  var options = [];
  var remaining = line.trim();
  while (remaining) {
    var match = remaining.match(OPT_CIRCLE_RE);
    if (!match) break;
    var circleMap = { '①': 'A', '②': 'B', '③': 'C', '④': 'D', '⑤': 'E', '⑥': 'F', '⑦': 'G', '⑧': 'H', '⑨': 'I', '⑩': 'J' };
    var key = circleMap[match[1]] || match[1];
    var rest = remaining.slice(match[0].length);
    var nextMatch = rest.match(/\s+[①②③④⑤⑥⑦⑧⑨⑩]\s*/);
    var text;
    if (nextMatch && nextMatch.index > 0) {
      text = rest.slice(0, nextMatch.index).trim();
      remaining = rest.slice(nextMatch.index);
    } else {
      text = rest.trim();
      remaining = '';
    }
    options.push({ key: key, text: text });
  }
  return options.length > 0 ? options : null;
}

/**
 * 从 Tab 分隔的文本中提取选项（Word 表格转换产物）
 * 例如：A. 北京\tB. 上海\tC. 广州\tD. 深圳
 */
function extractTabOptions(line) {
  if (line.indexOf('\t') < 0) return null;
  var parts = line.trim().split(/\t+/).filter(function (p) { return p.trim(); });
  if (parts.length < 2) return null;
  var options = [];
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    if (!p) continue;
    var m = p.match(/^\s*([A-Za-z])\s*[\.\、\)）．:：]?\s*(.*)/);
    if (m && m[1]) {
      options.push({ key: m[1].toUpperCase(), text: (m[2] || '').trim() });
    } else {
      var key = String.fromCharCode(65 + options.length);
      options.push({ key: key, text: p });
    }
  }
  return options.length >= 2 ? options : null;
}

/**
 * 逗号分隔选项：A.xxx, B.yyy, C.zzz
 * 用于处理 OCR 或特殊粘贴格式
 */
function extractCommaOptions(line) {
  // 先检查行中是否有明显的选项字母模式 + 逗号分隔
  var hasCommaOptPattern = /[A-Z]\s*[\.\、\)）．]\s*.+?\s*,\s*[A-Z]\s*[\.\、\)）．]/.test(line);
  if (!hasCommaOptPattern) return null;
  var parts = line.trim().split(/\s*,\s*/);
  if (parts.length < 2) return null;
  var options = [];
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    var m = p.match(/^\s*([A-Za-z])\s*[\.\、\)）．:：]?\s*(.*)/);
    if (m && m[1]) {
      options.push({ key: m[1].toUpperCase(), text: (m[2] || '').trim() });
    }
  }
  return options.length >= 2 ? options : null;
}

// ==================== 选项序列验证 ====================

/**
 * 验证提取的选项是否构成合法连续序列
 * 防止正文中的孤立字母被误判为选项
 *
 * 合法序列：A→B→C→D, A→B, ①→②→③→④ 等
 */
function isValidOptionSequence(options) {
  if (!options || options.length < 2) return false;
  // 验证键是否为连续递增序列（不强制从A开始，C→D和A→B→C→D都合法）
  var expected = options[0].key.charCodeAt(0);
  for (var i = 1; i < options.length; i++) {
    if (options[i].key.charCodeAt(0) !== expected + i) return false;
  }
  return true;
}

/**
 * 判断一行是否是答案行或解析行（不应被拆分的行）
 */
function isMetaLine(line) {
  return ANSWER_RE.test(line) || EXPLANATION_RE.test(line) || ANSWER_EXPL_RE.test(line);
}

/**
 * 判断一行是否是题号行（例如 "1." "2、" "（3）" "第4题"）
 */
function isQuestionNumberLine(line) {
  return /^\s*(\d{1,4})[\.\、\)）]/.test(line) ||
    /^\s*[（(]\s*\d{1,4}\s*[）)]/.test(line) ||
    /^\s*第\s*\d{1,4}\s*题/.test(line) ||
    /^\s*【\s*\d{1,4}\s*】/.test(line);
}

// ==================== 核心标准化函数 ====================

/**
 * 选项布局标准化 — 将任意排版标准化为"每行一个选项"
 *
 * 支持的输入布局：
 *   四行（标准）：A. xxx\nB. xxx\nC. xxx\nD. xxx
 *   单行（紧凑）：A. xxx  B. xxx  C. xxx  D. xxx
 *   两行（混合）：A. xxx  B. xxx\nC. xxx  D. xxx
 *   Tab分隔（表格）：A. xxx\tB. xxx\tC. xxx\tD. xxx
 *   括号格式：（A）xxx （B）xxx
 *   圈数字格式：① xxx ② xxx
 *   逗号分隔：A.xxx, B.yyy, C.zzz
 *
 * @param {string} rawText - 原始文本
 * @returns {string} 标准化后的文本（每行一个选项）
 */
function normalizeOptionLayouts(rawText) {
  if (!rawText) return rawText;

  var lines = rawText.split(/\n|\r\n/);
  var output = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmed = line.trim();

    // 空行直接保留
    if (!trimmed) {
      output.push('');
      continue;
    }

    // 答案行/解析行/题号行 → 原样保留（不拆分其中的选项字母）
    if (isMetaLine(trimmed) || isQuestionNumberLine(trimmed)) {
      output.push(line);
      continue;
    }

    // 题型标签行 → 原样保留
    if (/^\s*[【\[]\s*(?:单选|多选|判断|填空|简答|问答|论述|名词解释)(?:题)?\s*[】\]]/.test(trimmed)) {
      output.push(line);
      continue;
    }

    // 尝试各种选项提取策略
    var allOptions = null;

    // 策略1: Tab 分隔（Word 表格）
    allOptions = extractTabOptions(trimmed);

    // 策略2: 逗号分隔
    if (!allOptions) {
      allOptions = extractCommaOptions(trimmed);
    }

    // 策略3: 字母前缀空格分隔（A. xxx B. xxx）
    if (!allOptions) {
      allOptions = extractOptionsFromLine(trimmed);
    }

    // 策略4: 中文括号格式（（A）xxx）
    if (!allOptions) {
      allOptions = extractBracketOptionsFromLine(trimmed, OPT_CHINBRACKET_RE);
    }

    // 策略5: 英文括号格式 ((A) xxx)
    if (!allOptions) {
      allOptions = extractBracketOptionsFromLine(trimmed, OPT_ENBRACKET_RE);
    }

    // 策略6: 圈数字格式 (① xxx)
    if (!allOptions) {
      allOptions = extractCircleOptionsFromLine(trimmed);
    }

    // 如果提取到多个选项且构成合法序列 → 拆分为每行一个
    if (allOptions && allOptions.length >= 2 && isValidOptionSequence(allOptions)) {
      for (var oi = 0; oi < allOptions.length; oi++) {
        var opt = allOptions[oi];
        output.push(opt.key + '. ' + opt.text);
      }
    } else {
      // 单选项或无选项 → 原样保留
      output.push(line);
    }
  }

  return output.join('\n');
}

// ==================== 题型判别引擎 ====================

/**
 * 增强型题型判别 — 多因子打分引擎
 *
 * 对5种题型分别打分，返回最高分题型。
 * 输入特征：题干文本、选项数量、答案字符串、选项数组
 *
 * @param {string} text - 题干文本
 * @param {number} optionsCount - 选项数量
 * @param {string} answer - 答案字符串
 * @param {Array} options - 选项数组 [{key, text}, ...]
 * @returns {string} 题型：single_choice | multi_choice | true_false | fill_blank | short_answer
 */
function detectType(text, optionsCount, answer, options) {
  var lower = (text || '').toLowerCase();
  var scores = { single_choice: 0, multi_choice: 0, true_false: 0, fill_blank: 0, short_answer: 0 };
  var optCount = (typeof optionsCount === 'number') ? optionsCount : 0;
  var ans = (answer || '').trim().toUpperCase();
  var ansClean = ans.replace(/[,s、;；\/]/g, '');
  var stemText = text || '';

  // 下划线/填空检测
  var hasUnderscore = /_{3,}|____|__+|（\s*[^。？！，；]\s*）|\(\s*[^。？！，；]\s*\)/.test(stemText);

  // 计算/数学模式检测
  var hasCalcPattern = /[＋－×÷±=√π∫]|sin|cos|tan|log|lim/.test(stemText);

  var stemLen = stemText.length;

  // 多选题关键词
  var hasMultiKw = /(?:多选|多项|不定项)[选题]|下列哪些|以下哪些|下列.*(?:正确|错误|不正确)|不正确的是|错误的是|下列说法/.test(stemText);

  // 判断题选项文本检测（需提前，在打分逻辑中复用）
  var hasTFOptText = false;
  if (options && Array.isArray(options)) {
    for (var tfi = 0; tfi < options.length; tfi++) {
      var ot = (typeof options[tfi] === 'string') ? options[tfi] : (options[tfi].text || '');
      if (ot === '对' || ot === '错' || ot === '正确' || ot === '错误') { hasTFOptText = true; break; }
    }
  }

  // ── 题型标签优先匹配 ──
  var tagMatch = text && text.match(/^\s*[【\[]\s*([^】\]]+)\s*[】\]]/);
  if (tagMatch) {
    var tagText = tagMatch[1];
    for (var k = 0; k < TYPE_KEYS.length; k++) {
      var kws = TYPE_KEYWORDS[TYPE_KEYS[k]];
      for (var w = 0; w < kws.length; w++) {
        if (tagText.indexOf(kws[w]) !== -1) return TYPE_KEYS[k];
      }
    }
  }

  // ── 单选题打分 ──
  if (optCount >= 2 && optCount <= 8) {
    scores.single_choice += 30;
    if (optCount === 2) scores.single_choice -= 5; // 2选项更可能是判断
    if (optCount === 4) scores.single_choice += 10;
    if (ansClean && /^[A-E]$/i.test(ansClean)) scores.single_choice += 20;
    if (!hasMultiKw) scores.single_choice += 10;
    if (stemLen < 120) scores.single_choice += 5;
    if (optCount >= 4) scores.single_choice += 5;
  }

  // ── 多选题打分 ──
  if (optCount >= 3 && optCount <= 10) {
    scores.multi_choice += 20;
    if (/(?:多选|多项|不定项)[选题]|下列.*正确|下列哪些|以下哪些|不正确的是|错误的是|下列说法正确的是/.test(stemText)) {
      scores.multi_choice += 35;
    }
    if (ansClean && /^[A-E]{2,}$/i.test(ansClean)) scores.multi_choice += 30;
    if (optCount >= 5) scores.multi_choice += 10;
    if (/哪些|何种|多种|哪些项|哪些选项|不正确|错误的是/.test(stemText)) scores.multi_choice += 15;
  }

  // ── 判断题打分 ──
  if (optCount === 0 || optCount === 2) {
    scores.true_false += 15;
    if (/(?:判断|是否正确|对错|对的打|错的打|正确的打|(?:是|不是)否|√|×)/.test(stemText)) {
      scores.true_false += 25;
    }
    if (hasTFOptText) {
      scores.true_false += 35;
    } else {
      if (/^[AB]$/i.test(ansClean) && optCount === 2) scores.true_false += 5;
      if (/^(对|错|正确|错误|√|×|T|F)$/i.test(ans)) scores.true_false += 15;
    }
    if (stemLen < 60 && !hasCalcPattern) scores.true_false += 5;
  }

  // ── 填空题打分 ──
  if (optCount === 0 && stemLen >= 8) {
    scores.fill_blank += 20;
    if (hasUnderscore) {
      scores.fill_blank += 25;
      var underlineCount = (stemText.match(/_{2,}|____|__+/g) || []).length;
      if (underlineCount >= 2) scores.fill_blank += 10;
    }
    if (ansClean && ansClean.length < 10 && hasUnderscore) scores.fill_blank += 10;
    if (/(?:填空|填|___|____)/.test(stemText)) scores.fill_blank += 15;
    if (!/(?:简述|论述|说明|分析|试述|为什么|谈谈|阐述|试说明|说明理由|解释原因)/.test(stemText) && hasUnderscore) {
      scores.fill_blank += 10;
    }
    if (!/[A-Za-d]\s*[\.\、\)）．:：]/.test(stemText) && hasUnderscore) scores.fill_blank += 10;
  }

  // ── 简答题打分 ──
  if (optCount === 0) {
    scores.short_answer += 15;
    if (/(?:简述|论述|说明|分析|试述|为什么|谈谈|阐述|试说明|说明理由|解释原因|简答|问答|名词解释|论述题)/.test(stemText)) {
      scores.short_answer += 25;
    }
    if (stemLen > 50) scores.short_answer += 10;
    if (stemLen > 100) scores.short_answer += 10;
    if (!hasUnderscore) scores.short_answer += 10;
    if (!/[A-Za-d]\s*[\.\、\)）．:：]/.test(stemText)) scores.short_answer += 10;
    if (!hasCalcPattern) scores.short_answer += 5;
  }

  // ── 增强修正 ──

  // 多选增强：答案包含多个不同字母
  if (optCount >= 3 && ansClean && ansClean.length >= 2 && /^[A-E]+$/i.test(ansClean)) {
    var ml = Math.max(scores.multi_choice, scores.single_choice + 5);
    scores.multi_choice = Math.max(ml, 70);
  }

  // 判断增强：答案为 A/B 且选项文本是对/错
  if ((optCount === 0 || optCount === 2) && /^[AB]$/i.test(ansClean) && scores.true_false < 45 && hasTFOptText) {
    scores.true_false = Math.max(scores.true_false, 55);
  }

  // 判断增强：答案本身就是对/错/正确/错误
  if (/^(对|错|正确|错误|T|F|true|false|yes|no)$/i.test(ans) && optCount <= 2 && scores.true_false < 60 && hasTFOptText) {
    scores.true_false = Math.max(scores.true_false, 55);
  }

  // 多选增强：5+选项且多字母答案
  if (optCount >= 5 && ansClean && /^[A-E]{2,}$/i.test(ansClean)) {
    scores.multi_choice = Math.max(scores.multi_choice, scores.single_choice + 10);
  }

  // 填空 vs 简答抑制：有下划线时降低简答分
  if (hasUnderscore && scores.fill_blank > 0) {
    scores.short_answer = Math.max(0, scores.short_answer - 15);
  }

  // 题干中包含选项字母模式（A. B. C. D.）→ 可能不是简答题
  if (optCount === 0 && /[A-D]\s*[\.\、\)）]/.test(stemText) && /[A-D]\s*[\.\、\)）][一-鿿]/.test(stemText)) {
    scores.short_answer = Math.max(0, scores.short_answer - 20);
  }

  // ── 决策 ──
  var bestType = 'single_choice';
  var bestScore = 0;
  for (var t = 0; t < TYPE_KEYS.length; t++) {
    var key = TYPE_KEYS[t];
    if (scores[key] > bestScore) { bestScore = scores[key]; bestType = key; }
  }

  // 边缘情况处理
  if (stemLen < 6 && optCount === 0) { return 'short_answer'; }
  if (bestScore < 10) { return optCount >= 2 ? 'single_choice' : 'short_answer'; }

  return bestType;
}

// ==================== 题干清洗 ====================

/**
 * 清洗题干前缀 — 去除题型标签、题号、题目/题干前缀
 * 循环迭代直到稳定，处理多层级嵌套前缀
 */
function cleanStem(raw) {
  if (!raw) return '';
  var result = raw;
  var prev = '';
  while (result !== prev) {
    prev = result;
    result = result.replace(/^\s*[【\[]\s*(?:单选|多选|判断|填空|简答|问答|论述|名词解释)(?:题)?\s*[】\]]\s*/, '');
    result = result.replace(/^\s*(?:\d{1,4}[.、\)）]|①|②|③|④|[【\[]\s*\d+\s*[】\]]|第\d+题|（\d+）|\d+[.、\)）])\s*/, '');
    result = result.replace(/^(?:题目\s*[：:]|题干\s*[：:])\s*/, '');
  }
  return result.trim();
}

// ==================== 数学符号规范化 ====================

/**
 * 规范化数学符号 — 统一常见数学表达的不同写法
 * 在 parseOcrText 输出后、入库前调用
 */
function normalizeMathSymbols(text) {
  if (!text) return text;
  var result = text;

  // 全角运算符 → 半角
  result = result.replace(/＋/g, '+')
    .replace(/－/g, '-')
    .replace(/×/g, '\u00D7')   // ×
    .replace(/÷/g, '\u00F7');  // ÷

  // 全角括号在数学上下文中 → 半角（仅当两侧都是数字/变量时）
  result = result.replace(/（/g, '(').replace(/）/g, ')');

  // 常见 LaTeX 残留清理
  result = result.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2');
  result = result.replace(/\\sqrt\{([^}]*)\}/g, '\u221A($1)');
  result = result.replace(/\\sqrt\s+(\S)/g, '\u221A$1');
  result = result.replace(/\\pi/g, '\u03C0');
  result = result.replace(/\\infty/g, '\u221E');
  result = result.replace(/\\alpha/g, '\u03B1');
  result = result.replace(/\\beta/g, '\u03B2');
  result = result.replace(/\\gamma/g, '\u03B3');
  result = result.replace(/\\delta/g, '\u03B4');
  result = result.replace(/\\theta/g, '\u03B8');
  result = result.replace(/\\lambda/g, '\u03BB');
  result = result.replace(/\\mu/g, '\u03BC');
  result = result.replace(/\\sigma/g, '\u03C3');
  result = result.replace(/\\phi/g, '\u03C6');
  result = result.replace(/\\omega/g, '\u03C9');
  result = result.replace(/\\Delta/g, '\u0394');
  result = result.replace(/\\Sigma/g, '\u03A3');
  result = result.replace(/\\leq/g, '\u2264');
  result = result.replace(/\\geq/g, '\u2265');
  result = result.replace(/\\neq/g, '\u2260');
  result = result.replace(/\\approx/g, '\u2248');
  result = result.replace(/\\pm/g, '\u00B1');
  result = result.replace(/\\mp/g, '\u2213');
  result = result.replace(/\\cdot/g, '\u00B7');
  result = result.replace(/\\cdots/g, '\u22EF');
  result = result.replace(/\\ldots/g, '\u2026');
  result = result.replace(/\\sum/g, '\u2211');
  result = result.replace(/\\int/g, '\u222B');
  result = result.replace(/\\prod/g, '\u220F');
  result = result.replace(/\\partial/g, '\u2202');
  result = result.replace(/\\nabla/g, '\u2207');
  result = result.replace(/\\forall/g, '\u2200');
  result = result.replace(/\\exists/g, '\u2203');
  result = result.replace(/\\in\b/g, '\u2208');
  result = result.replace(/\\notin/g, '\u2209');
  result = result.replace(/\\cup/g, '\u222A');
  result = result.replace(/\\cap/g, '\u2229');
  result = result.replace(/\\emptyset/g, '\u2205');
  result = result.replace(/\\infty/g, '\u221E');
  result = result.replace(/\\to/g, '\u2192');
  result = result.replace(/\\rightarrow/g, '\u2192');
  result = result.replace(/\\Rightarrow/g, '\u21D2');
  result = result.replace(/\\leftrightarrow/g, '\u2194');
  result = result.replace(/\\Leftrightarrow/g, '\u21D4');
  result = result.replace(/\\angle/g, '\u2220');
  result = result.replace(/\\perp/g, '\u22A5');
  result = result.replace(/\\parallel/g, '\u2225');
  result = result.replace(/\\circ/g, '\u2218');
  result = result.replace(/\\bullet/g, '\u2022');
  result = result.replace(/\\star/g, '\u22C6');
  result = result.replace(/\\deg/g, '\u00B0');
  result = result.replace(/\\le/g, '\u2264');
  result = result.replace(/\\ge/g, '\u2265');
  result = result.replace(/\\ne/g, '\u2260');
  result = result.replace(/\\sim/g, '\u223C');
  result = result.replace(/\\equiv/g, '\u2261');
  result = result.replace(/\\propto/g, '\u221D');
  result = result.replace(/\\div/g, '\u00F7');

  // \times 已经是 ×
  result = result.replace(/\\times/g, '\u00D7');

  // 上下标 LaTeX 残留
  result = result.replace(/\^\{([^}]*)\}/g, function (m, p1) {
    return formatSuperscriptLatex(p1);
  });
  result = result.replace(/_\{([^}]*)\}/g, function (m, p1) {
    return formatSubscriptLatex(p1);
  });

  // 单字符上下标
  result = result.replace(/\^([A-Za-z0-9])/g, function (m, p1) {
    return formatSuperscriptLatex(p1);
  });
  result = result.replace(/_([A-Za-z0-9])/g, function (m, p1) {
    return formatSubscriptLatex(p1);
  });

  // 合并多余空格（但保留公式内必要的单空格）
  result = result.replace(/ {2,}/g, ' ');

  return result;
}

/** LaTeX 上标转 Unicode */
function formatSuperscriptLatex(s) {
  var map = {
    '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3',
    '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077',
    '8': '\u2078', '9': '\u2079', '+': '\u207A', '-': '\u207B',
    '=': '\u207C', '(': '\u207D', ')': '\u207E', 'n': '\u207F',
  };
  var allConv = true;
  var result = '';
  for (var i = 0; i < s.length; i++) {
    if (map[s[i]]) {
      result += map[s[i]];
    } else {
      allConv = false;
      break;
    }
  }
  if (allConv) return result;
  return '^(' + s + ')';
}

/** LaTeX 下标转 Unicode */
function formatSubscriptLatex(s) {
  var map = {
    '0': '\u2080', '1': '\u2081', '2': '\u2082', '3': '\u2083',
    '4': '\u2084', '5': '\u2085', '6': '\u2086', '7': '\u2087',
    '8': '\u2088', '9': '\u2089', '+': '\u208A', '-': '\u208B',
    '=': '\u208C', '(': '\u208D', ')': '\u208E',
    'a': '\u2090', 'e': '\u2091', 'o': '\u2092', 'x': '\u2093',
  };
  var allConv = true;
  var result = '';
  for (var i = 0; i < s.length; i++) {
    if (map[s[i]]) {
      result += map[s[i]];
    } else {
      allConv = false;
      break;
    }
  }
  if (allConv) return result;
  return '_(' + s + ')';
}

// ==================== 填空题空格检测 ====================

/**
 * 检测题干中的填空空格数量
 * 支持的空格标记：
 *   1. 连续下划线（2+个）：___  ____  _____
 *   2. 空的中文括号：（）  （ ）
 *   3. 空的英文括号：()  ( )
 *   4. 全宽下划线：＿＿＿
 *
 * @param {string} stem - 题干文本
 * @returns {number} 空格数量（至少 1）
 */
function countBlanks(stem) {
  if (!stem) return 1;
  var text = stem;
  var count = 0;

  // 1. 连续下划线（半角 2+ 或全角 2+）
  var underscoreMatches = text.match(/_{2,}|＿{2,}/g);
  if (underscoreMatches) count += underscoreMatches.length;
  // 移除已匹配的下划线，避免与括号检测冲突
  text = text.replace(/_{2,}|＿{2,}/g, ' ');

  // 2. 空的中文括号 （） （ ）
  var cnBracketMatches = text.match(/（\s*）/g);
  if (cnBracketMatches) count += cnBracketMatches.length;

  // 3. 空的英文括号 ()  ( )  — 仅匹配括号内只有空白或为空的
  var enBracketMatches = text.match(/\(\s*\)/g);
  if (enBracketMatches) count += enBracketMatches.length;

  // 至少 1 个空
  return Math.max(count, 1);
}

/**
 * 将答案字符串按填空数拆分为数组
 * 支持的答案分隔符：|  |  ｜（全角竖线）
 * 如果答案数量与空格数不匹配，按空格数截断或补空
 *
 * @param {string} answer - 原始答案字符串
 * @param {number} blankCount - 空格数量
 * @returns {string[]} 答案数组，长度等于 blankCount
 */
function splitFillBlankAnswer(answer, blankCount) {
  if (!answer || !answer.trim()) {
    return new Array(blankCount || 1).fill('');
  }
  var parts = answer.split(/[|｜]/).map(function (s) { return s.trim(); });
  var count = blankCount || parts.length || 1;
  // 补齐或截断
  while (parts.length < count) parts.push('');
  if (parts.length > count) parts = parts.slice(0, count);
  return parts;
}

// ==================== 导出 ====================

module.exports = {
  // 常量
  TYPE_KEYWORDS: TYPE_KEYWORDS,
  OPT_LETTER_RE: OPT_LETTER_RE,
  OPT_CIRCLE_RE: OPT_CIRCLE_RE,
  OPT_CHINBRACKET_RE: OPT_CHINBRACKET_RE,
  OPT_ENBRACKET_RE: OPT_ENBRACKET_RE,
  ANSWER_RE: ANSWER_RE,
  ANSWER_EXPL_RE: ANSWER_EXPL_RE,
  EXPLANATION_RE: EXPLANATION_RE,
  TF_TRUE: TF_TRUE,
  TF_FALSE: TF_FALSE,

  // 选项提取
  extractOptionsFromLine: extractOptionsFromLine,
  extractBracketOptionsFromLine: extractBracketOptionsFromLine,
  extractCircleOptionsFromLine: extractCircleOptionsFromLine,
  extractTabOptions: extractTabOptions,
  extractCommaOptions: extractCommaOptions,

  // 标准化
  normalizeOptionLayouts: normalizeOptionLayouts,
  isValidOptionSequence: isValidOptionSequence,
  isMetaLine: isMetaLine,

  // 题型判别
  detectType: detectType,

  // 题干清洗
  cleanStem: cleanStem,

  // 数学符号规范化
  normalizeMathSymbols: normalizeMathSymbols,

  // 填空题空格检测
  countBlanks: countBlanks,
  splitFillBlankAnswer: splitFillBlankAnswer,
};
