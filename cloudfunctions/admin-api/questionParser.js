/**
 * 导题斩题小工具 - 增强型题目结构化解析引擎 v3 (Enterprise)
 *
 * 多策略自动排版判别系统：
 *   Strategy 1 - 按空行分块 + 逐行模式识别（常规粘贴）
 *   Strategy 2 - 题型标签分割（【单选题】【多选题】等）
 *   Strategy 3 - HTML 结构分析（Word via mammoth → 识别列表结构/标题层级）
 *   Strategy 4 - 紧凑排版识别（无空行，通过数字/字母前缀推断题目边界）
 *   Strategy 5 - 表格结构检测（Word 表格 → 逐行解析）
 *
 * 自动识别任意用户排版，无需预设模板。
 * 适用于：纯文本粘贴、Word (.docx) 上传、OCR 结果。
 */

'use strict';

// ==================== 常量定义 ====================

const TYPE_KEYWORDS = {
  single_choice: ['单选', '单选题', '单项选择', '单项选择题'],
  multi_choice: ['多选', '多选题', '多项选择', '多项选择题', '不定项', '多项', '不定项选择题'],
  true_false: ['判断', '判断题', '是非题'],
  fill_blank: ['填空', '填空题'],
  short_answer: ['简答', '简答题', '问答', '问答题', '论述', '名词解释'],
};

const TYPE_KEYS = Object.keys(TYPE_KEYWORDS);

/** 选项字母前缀 */
const OPT_LETTER_RE = /^\s*([A-Za-z])\s*(?:[\.、\)）．:：]\s*|\s+(?=\S)|(?=[\u4e00-\u9fff\u300a\u300b\u201c\u201d\u2018\u2019]))/;
/** 中文圈数字选项：① ② ③ ④ */
const OPT_CIRCLE_RE = /^\s*([①②③④⑤⑥⑦⑧⑨⑩])\s*/;
/** Chinese bracket options: （A） */
const OPT_CHINBRACKET_RE = /^\s*[（(]\s*([A-Za-z])\s*[）)]\s*/;
/** English bracket options: (A) */
const OPT_ENBRACKET_RE = /^\s*\(\s*([A-Za-z])\s*\)\s*/;

/** 答案行正则 */
const ANSWER_RE = /^(?:【?答案】?|【?参考答案】?|【?正确答案】?)\s*[：:]?\s*(.+)/i;
/** 答案+解析合并行 */
const ANSWER_EXPL_RE = /^(?:【?答案】?|【?参考答案】?|【?正确答案】?)\s*[：:]\s*(.+?)\s*(?:\||\s{3,})\s*(?:解析|答案解析|详解)\s*[：:]\s*(.+)/i;
/** 纯解析行 */
const EXPLANATION_RE = /^(?:【?解析】?|【?答案解析】?|【?详解】?|【?试题解析】?|解析|答案解析|详解|试题解析)\s*[：:]\s*(.+)/i;

/** 判断题值 */
const TF_TRUE = /^(对|正确|√|✓|T|true|True|YES)$/;
const TF_FALSE = /^(错|错误|×|✗|F|false|False|NO)$/;

// ==================== HTML 清洗 ====================

/**
 * 将 mammoth 输出的 HTML 清洗为结构化文本
 * 保留标题、列表、段落层级信息
 */
function htmlToStructuredText(html) {
  if (!html) return '';

  var text = html;

  // 提取 <h1-3> 作为段落（带 # 标记）
  text = text.replace(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi, function(m, content) {
    return '\n' + stripHtmlTags(content).trim() + '\n';
  });

  // <ol> <ul> 列表项 → 每项换行
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, function(m, content) {
    return '\n' + stripHtmlTags(content).trim();
  });

  // <br> <p> → 换行
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<p[^>]*>/gi, '');

  // 表格：每行作为一个段落，单元格用制表符分隔
  text = text.replace(/<table[^>]*>(.*?)<\/table>/gi, function(m, tableContent) {
    var rows = tableContent.match(/<tr[^>]*>(.*?)<\/tr>/gi) || [];
    return '\n__TABLE__\n' + rows.map(function(row) {
      var cells = row.match(/<td[^>]*>(.*?)<\/td>/gi) || [];
      return cells.map(function(cell) {
        return stripHtmlTags(cell).trim();
      }).join('\t');
    }).join('\n') + '\n__ENDTABLE__\n';
  });

  // 清理剩余标签
  text = stripHtmlTags(text);

  // 规范化空白
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

function stripHtmlTags(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

// ==================== 题型检测 ====================


function detectType(text, optionsCount, answer, options) {
  var lower = (text || "").toLowerCase();
  var scores = {single_choice:0,multi_choice:0,true_false:0,fill_blank:0,short_answer:0};
  var optCount = (typeof optionsCount === "number") ? optionsCount : 0;
  var ans = (answer || "").trim().toUpperCase();
  var ansClean = ans.replace(/[,s、;；\/]/g, "");
  var stemText = text || "";
  var hasUnderscore = /_{3,}|____|__+|（\s*[^。？！，；]\s*）|\(\s*[^。？！，；]\s*\)/.test(stemText);
  var hasCalcPattern = /[＋－×÷±=√π∫]|sin|cos|tan|log|lim/.test(stemText);
  var stemLen = stemText.length;
  var hasMultiKw = /(?:多选|多项|不定项)[选题]|下列哪些|以下哪些|下列.*(?:正确|错误|不正确)|不正确的是|错误的是|下列说法/.test(stemText);
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
  if (optCount >= 2 && optCount <= 8) {
    scores.single_choice += 30;
    if (optCount === 2) scores.single_choice -= 5; // 2-option slightly more likely true_false
    if (optCount === 4) scores.single_choice += 10;
    if (ansClean && /^[A-E]$/i.test(ansClean)) scores.single_choice += 20;
    if (!hasMultiKw) scores.single_choice += 10;
    if (stemLen < 120) scores.single_choice += 5;
    if (optCount >= 4) scores.single_choice += 5;
  }
  if (optCount >= 3 && optCount <= 10) {
    scores.multi_choice += 20;
    if (/(?:多选|多项|不定项)[选题]|下列.*正确|下列哪些|以下哪些|不正确的是|错误的是|下列说法正确的是/.test(stemText)) scores.multi_choice += 35;
    if (ansClean && /^[A-E]{2,}$/i.test(ansClean)) scores.multi_choice += 30;
    if (optCount >= 5) scores.multi_choice += 10;
    if (/哪些|何种|多种|哪些项|哪些选项|不正确|错误的是/.test(stemText)) scores.multi_choice += 15;
  }
  if (optCount === 0 || optCount === 2) {
    scores.true_false += 15;
    if (/(?:判断|是否正确|对错|对的打|错的打|正确的打|(?:是|不是)否|√|×)/.test(stemText)) scores.true_false += 25;
    var hasTFOptText = false;
    if (options && Array.isArray(options)) {
      for (var tfi2 = 0; tfi2 < options.length; tfi2++) {
        var ot = (typeof options[tfi2] === 'string') ? options[tfi2] : (options[tfi2].text || '');
        if (ot === '对' || ot === '错' || ot === '正确' || ot === '错误') { hasTFOptText = true; break; }
      }
    }
    if (hasTFOptText) {
      scores.true_false += 35;
    } else {
      if (/^[AB]$/i.test(ansClean) && optCount === 2) scores.true_false += 5;
      if (/^(对|错|正确|错误|√|×|T|F)$/i.test(ans)) scores.true_false += 15;
    }
    if (stemLen < 60 && !hasCalcPattern) scores.true_false += 5;
  }
  if (optCount === 0 && stemLen >= 8) {
    scores.fill_blank += 20;
    if (hasUnderscore) {
      scores.fill_blank += 25;
      var underlineCount = (stemText.match(/_{2,}|____|__+/g) || []).length;
      if (underlineCount >= 2) scores.fill_blank += 10;
    }
    if (ansClean && ansClean.length < 10 && hasUnderscore) scores.fill_blank += 10;
    if (/(?:填空|填|___|____)/.test(stemText)) scores.fill_blank += 15;
    if (!/(?:简述|论述|说明|分析|试述|为什么|谈谈|阐述|试说明|说明理由|解释原因)/.test(stemText) && hasUnderscore) scores.fill_blank += 10;
    if (!/[A-Za-d]\s*[\.、\)）．:：]/.test(stemText) && hasUnderscore) scores.fill_blank += 10;
  }
  if (optCount === 0) {
    scores.short_answer += 15;
    if (/(?:简述|论述|说明|分析|试述|为什么|谈谈|阐述|试说明|说明理由|解释原因|简答|问答|名词解释|论述题)/.test(stemText)) scores.short_answer += 25;
    if (stemLen > 50) scores.short_answer += 10;
    if (stemLen > 100) scores.short_answer += 10;
    if (!hasUnderscore) scores.short_answer += 10;
    if (!/[A-Za-d]\s*[\.、\)）．:：]/.test(stemText)) scores.short_answer += 10;
    if (!hasCalcPattern) scores.short_answer += 5;
  }
    // Upgrade multi_choice when answer has multiple distinct letters (even without keywords)
  if (optCount >= 3 && ansClean && ansClean.length >= 2 && /^[A-E]+$/i.test(ansClean)) {
    var ml = Math.max(scores.multi_choice, scores.single_choice + 5);
    scores.multi_choice = Math.max(ml, 70);
  }
  // True/false booster: answer A or B without explicit keyword, 0 or 2 options
  if ((optCount === 0 || optCount === 2) && /^[AB]$/i.test(ansClean) && scores.true_false < 45 && hasTFOptText) {
    scores.true_false = Math.max(scores.true_false, 55);
  }
  // True/false booster: answer is 对/错/正确/错误 without explicit keyword
  if (/^(对|错|正确|错误|T|F|true|false|yes|no)$/i.test(ans) && optCount <= 2 && scores.true_false < 60 && hasTFOptText) {
    scores.true_false = Math.max(scores.true_false, 55);
  }
  // Multi-choice booster
  if (optCount >= 5 && ansClean && /^[A-E]{2,}$/i.test(ansClean)) {
    scores.multi_choice = Math.max(scores.multi_choice, scores.single_choice + 10);
  }
  if (hasUnderscore && scores.fill_blank > 0) {
    scores.short_answer = Math.max(0, scores.short_answer - 15);
  }
  if (optCount === 0 && /[A-D]\s*[\.、\)）]/.test(stemText) && /[A-D]\s*[\.、\)）][\u4e00-\u9fff]/.test(stemText)) {
    scores.short_answer = Math.max(0, scores.short_answer - 20);
  }
  var bestType = "single_choice";
  var bestScore = 0;
  for (var t = 0; t < TYPE_KEYS.length; t++) {
    var key = TYPE_KEYS[t];
    if (scores[key] > bestScore) { bestScore = scores[key]; bestType = key; }
  }
  // Edge case: very short text without keywords
  if (stemLen < 6 && optCount === 0) { return "short_answer"; }
  if (bestScore < 10) { return optCount >= 2 ? "single_choice" : "short_answer"; }
  return bestType;
}

function extractOptionsFromLine(line) {
  var options = [];
  var remaining = line.trim();

  // 尝试匹配连续多个选项：A. xxx  B. yyy  C. zzz
  while (remaining) {
    var match = remaining.match(OPT_LETTER_RE);
    if (!match) break;
    var key = match[1].toUpperCase();
    var rest = remaining.slice(match[0].length);
    // 查找下一个选项的位置
    var nextMatch = rest.match(/\s+[A-Za-z]\s*[\.、\)）．:：]\s*/);
    var text, consumed;
    if (nextMatch && nextMatch.index > 0) {
      text = rest.slice(0, nextMatch.index).trim();
      consumed = rest.slice(0, nextMatch.index);
      remaining = rest.slice(nextMatch.index);
    } else {
      text = rest.trim();
      consumed = rest;
      remaining = '';
    }
    options.push({ key: key, text: text });
  }

  return options.length > 0 ? options : null;
}

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
      remaining = "";
    }
    options.push({ key: key, text: text });
  }
  return options.length > 0 ? options : null;
}

function extractCircleOptionsFromLine(line) {
  var options = [];
  var remaining = line.trim();
  while (remaining) {
    var match = remaining.match(OPT_CIRCLE_RE);
    if (!match) break;
    var circleMap = { '①':'A','②':'B','③':'C','④':'D','⑤':'E','⑥':'F','⑦':'G','⑧':'H','⑨':'I','⑩':'J' };
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

// ==================== 核心解析引擎 ====================

/** Strategy 1: 标准解析 — 按空行分块 */
function parseStandardBlocks(text) {
  // 先移除题型/大题标头行
  text = text.replace(/^[一二三四五六七八九十]+[、.．\s]+(?:单选|多选|判断|填空|简答|问答|论述|不定项|选择)(?:题)?[^\n]*/gm, '');

  var blocks = text.split(/\n\s*\n/).filter(function(b) { return b.trim(); });
  var blocks = text.split(/\n\s*\n/).filter(function(b) { return b.trim(); });
  if (blocks.length > 1) {
    var singleLineBlocks = 0;
    for (var bi = 0; bi < blocks.length; bi++) {
      if (blocks[bi].split('\n').filter(function(l) { return l.trim(); }).length <= 1) singleLineBlocks++;
    }
    if (singleLineBlocks >= blocks.length - 1) {
      var fullResult = parseSingleBlock(text);
      return fullResult ? [fullResult] : null;
    }
  }
  return parseBlocks(blocks);
}

/** Strategy 2: 题型标签分割 */
function parseByTypeTag(text) {
  var lines = text.split('\n');
  var blocks = [];
  var current = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    // 检测题型标签开头
    if (/^\s*[【\[]\s*(?:单选|多选|判断|填空|简答|问答|论述|不定项)[^】\]]*[】\]]/.test(line) ||
        /^\s*[（(]\s*(?:单选|多选|判断|填空|简答|问答|论述|不定项)[^）)]*[）)]/.test(line) ||
        /^\s*(?:单选|多选|判断|填空|简答|问答|论述)(?:题)?\s*[：:]/.test(line)) {
      if (current.length > 0) {
        blocks.push(current.join('\n').trim());
        current = [];
      }
    }
    current.push(line);
  }
  if (current.length > 0) blocks.push(current.join('\n').trim());

  // 如果未分割成功，回退到策略1
  if (blocks.length <= 1 && !/^\s*[【\[]/.test(text)) return null;
  return parseBlocks(blocks);
}

/** Strategy 3: 数字编号分割（紧凑排版，无空行） */
function parseByNumberPrefix(text) {
  // 先移除题型/大题标头行（如 一、单选题 二、填空题 等）
  text = text.replace(/^[一二三四五六七八九十]+[、.．\s]+(?:单选|多选|判断|填空|简答|问答|论述|不定项|选择)(?:题)?[^\n]*/gm, '');

  var lines = text.split('\n').filter(function(l) { return l.trim(); });
  var blocks = [];
  var current = [];
  var foundNumbered = false;

  var numRe = /^\s*\d{1,4}[.、\)）]\s*/;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();

    if (numRe.test(line) && !ANSWER_RE.test(line) && !EXPLANATION_RE.test(line)) {
      var after = line.replace(numRe, '').trim();
      // 不是 "1.A." 这种
      if (!/^[A-Za-z]\s*[\.、\)）．:]/.test(after) && !ANSWER_RE.test(after) && !EXPLANATION_RE.test(after)) {
        if (current.length > 0) blocks.push(current.join('\n').trim());
        current = [line];
        foundNumbered = true;
        continue;
      }
    }
    current.push(line);
  }
  if (current.length > 0) blocks.push(current.join('\n').trim());

  if (!foundNumbered || blocks.length <= 1) return null;
  return parseBlocks(blocks);
}

/** Strategy 4: （1）【1】第1题 ① 等特殊编号 */
function parseBySpecialPrefix(text) {
  // 先移除题型/大题标头行
  text = text.replace(/^[一二三四五六七八九十]+[、.．\s]+(?:单选|多选|判断|填空|简答|问答|论述|不定项|选择)(?:题)?[^\n]*/gm, '');

  var lines = text.split('\n').filter(function(l) { return l.trim(); });
  var blocks = [];
  var current = [];
  var found = false;

  var specialRe = /^\s*(?:[（(]\d{1,2}[）)]|【\d{1,2}】|第\d{1,4}题|[①②③④⑤⑥⑦⑧⑨⑩])\s*/;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (specialRe.test(line) && !ANSWER_RE.test(line) && !EXPLANATION_RE.test(line)) {
      if (current.length > 0) blocks.push(current.join('\n').trim());
      current = [line];
      found = true;
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current.join('\n').trim());

  if (!found || blocks.length <= 1) return null;
  return parseBlocks(blocks);
}

/** Strategy 5: Newline split fallback — detect option patterns */
function parseByNewlineSplit(text) {
  // Split by any newline, find lines with option patterns
  var lines = text.split("\n").filter(function(l) { return l.trim(); });
  if (lines.length < 3) return null;
  var optCount = 0;
  for (var i = 0; i < lines.length; i++) {
    var opts = extractOptionsFromLine(lines[i]);
    if (opts && opts.length > 0 && opts[0].key.length === 1 && opts[0].key >= "A" && opts[0].key <= "D") {
      optCount++;
    }
  }
  if (optCount >= 2) {
    var result = parseSingleBlock(text);
    return result ? [result] : null;
  }
  return null;
}

/** Strategy 5: Word 表格结构解析 */
function parseTableStructure(text) {
  if (text.indexOf('__TABLE__') === -1) return null;

  var blocks = [];
  var lines = text.split('\n');
  var inTable = false;
  var tableRows = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line === '__TABLE__') { inTable = true; tableRows = []; continue; }
    if (line === '__ENDTABLE__') {
      inTable = false;
      // 将表格行转为文本块
      if (tableRows.length > 0) {
        blocks.push(tableRows.join('\n'));
      }
      continue;
    }
    if (inTable) {
      tableRows.push(line);
      continue;
    }
    // 非表格内容直接加入
    if (line) blocks.push(line);
  }

  if (blocks.length === 0) return null;
  return parseBlocks(blocks);
}

// ==================== 块级别解析 ====================

function parseBlocks(blocks) {
  var questions = [];
  for (var b = 0; b < blocks.length; b++) {
    var q = parseSingleBlock(blocks[b]);
    if (q && q.stem) questions.push(q);
  }
  return questions.length > 0 ? questions : null;
}

function parseSingleBlock(block) {
  var lines = block.split('\n').filter(function(l) { return l.trim(); });
  if (lines.length === 0) return null;

  var question = {
    type: 'single_choice',
    stem: '',
    options: [],
    answer: '',
    explanation: ''
  };

  var stemLines = [];
  var optionLines = [];
  var answerText = '';
  var explanationLines = [];
  var inOptions = false;
  var inAnswer = false;
  var inExplanation = false;

  // === Pass 1: 先检查跨行答案+解析合并 ===
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    var aeMatch = line.match(ANSWER_EXPL_RE);
    if (aeMatch) {
      answerText = aeMatch[1].trim();
      explanationLines.push(aeMatch[2].trim());
      lines.splice(i, 1);
      i--;
    }
  }

  // === Pass 2: 逐行分类 ===
  for (var i2 = 0; i2 < lines.length; i2++) {
    var line2 = lines[i2].trim();
    if (!line2) continue;

    // 答案行
    var ansMatch = line2.match(ANSWER_RE);
    if (ansMatch && !answerText) {
      answerText = ansMatch[1].trim();
      continue;
    }

    // 解析行
    var explMatch = line2.match(EXPLANATION_RE);
    if (explMatch) {
      explanationLines.push(explMatch[1].trim());
      continue;
    }

    // 纯 "答案" 单字行（下行为内容）
    if (/^答案\s*$/.test(line2)) {
      inAnswer = true;
      continue;
    }
    if (inAnswer) {
      answerText = line2;
      inAnswer = false;
      continue;
    }

    // 纯 "解析" "详解" 单字行
    if (/^(解析|详解|答案解析)\s*$/.test(line2)) {
      inExplanation = true;
      continue;
    }
    if (inExplanation) {
      explanationLines.push(line2);
      inExplanation = false;
      continue;
    }

    // 选项行（字母前缀）
    var opts = extractOptionsFromLine(line2);
    if (opts && opts.length > 0) {
      optionLines = optionLines.concat(opts);
      inOptions = true;
      continue;
    }

    // 圈数字选项
    var circleOpts = extractCircleOptionsFromLine(line2);
    if (circleOpts && circleOpts.length > 0) {
      optionLines = optionLines.concat(circleOpts);
      inOptions = true;
      continue;
    }
    // 中文括号选项：（A）铁
    var bracketOpts = extractBracketOptionsFromLine(line2, OPT_CHINBRACKET_RE);
    if (bracketOpts && bracketOpts.length > 0) {
      optionLines = optionLines.concat(bracketOpts);
      inOptions = true;
      continue;
    }
    // 英文括号选项：(A) 铁
    var enBracketOpts = extractBracketOptionsFromLine(line2, OPT_ENBRACKET_RE);
    if (enBracketOpts && enBracketOpts.length > 0) {
      optionLines = optionLines.concat(enBracketOpts);
      inOptions = true;
      continue;
    }

    // 答案格式的特殊行：如 "A" 或 "AB" 或 "√"
    if (/^[A-E]+$/i.test(line2) || TF_TRUE.test(line2) || TF_FALSE.test(line2)) {
      if (inOptions && optionLines.length > 0) {
        answerText = line2;
        continue;
      }
    }

    stemLines.push(line2);
  }

  // === Pass 3: 构建题目 ===
  var stem = (stemLines.length > 0) ? cleanStem(stemLines.join(' ')) : '';
  question.stem = stem || '（未识别题干）';

  question.options = optionLines;
  question.answer = answerText || '';

  if (explanationLines.length > 0) {
    question.explanation = explanationLines.join('\n').trim();
  }

    // 题型推断
  question.type = detectType(question.stem + ' ' + stemLines.join(' '), question.options.length, question.answer, question.options);

  // P2: 判断题选项文本检测（A对/B错模式）
  if (question.options.length === 2 && question.type === 'single_choice') {
    var hasTFText = true;
    for (var tfi = 0; tfi < question.options.length; tfi++) {
      var optText = question.options[tfi].text;
      if (optText !== '对' && optText !== '错' && optText !== '正确' && optText !== '错误') { hasTFText = false; break; }
    }
    if (hasTFText) question.type = 'true_false';
  }
// 判断题规范化
  if (question.type === 'true_false') {
    if (question.options.length === 0) {
      question.options = [
        { key: 'A', text: '正确' },
        { key: 'B', text: '错误' }
      ];
    }
    var ans = (question.answer || '').trim();
    if (TF_TRUE.test(ans)) question.answer = 'A';
    else if (TF_FALSE.test(ans)) question.answer = 'B';
  }

  return question;
}

// ==================== 主入口 ====================

/**
 * 从纯文本解析题目
 * @param {string} text - 原始文本
 * @returns {{ questions: Array, stats: Object, warnings: Array, strategy: string }}
 */
function parseTextOriginal(text) {
  if (!text || !text.trim()) {
    return { questions: [], stats: { total: 0, parsed: 0, failed: 0 }, warnings: ['输入文本为空'], strategy: 'none' };
  }

  var normalized = text.replace(/\r\n/g, '\n');
  var questions = null;
  var strategyUsed = 'none';

  // 按优先级尝试各策略
  var strategies = [
    { name: 'type_tag', fn: parseByTypeTag },
    { name: 'special_prefix', fn: parseBySpecialPrefix },
    { name: 'number_prefix', fn: parseByNumberPrefix },
    { name: 'standard_blocks', fn: parseStandardBlocks },
    { name: 'newline_split', fn: parseByNewlineSplit },
  ];

  for (var s = 0; s < strategies.length; s++) {
    var result = strategies[s].fn(normalized);
    if (result && result.length > 0) {
      questions = result;
      strategyUsed = strategies[s].name;
      break;
    }
  }

  questions = questions || [];
  return {
    questions: questions,
    strategy: strategyUsed,
    stats: {
      total: Math.max(questions.length, 1),
      parsed: questions.length,
      failed: 0
    },
    warnings: questions.length === 0 ? ['未能解析出有效题目，请检查格式'] : []
  };
}
// ==================== 多假设评分引擎 (v4) ====================

var layoutAnalyzerQP;
try { layoutAnalyzerQP = require('./layoutAnalyzer'); } catch (e) {}

function parseWithLayoutAnalysis(text, html) {
  var layoutFeatures = null;
  if (layoutAnalyzerQP && html) layoutFeatures = layoutAnalyzerQP.extractFeatures(html);
  if (!text || !text.trim()) {
    return { questions: [], stats: { total: 0, parsed: 0, failed: 0 }, warnings: ['输入文本为空'], strategy: 'none', layout: 'none' };
  }
  var normalized = text.replace(/\r\n/g, '\n');
  var hypotheses = [];
  var strategies = [
    { name: 'type_tag', fn: parseByTypeTag },
    { name: 'number_prefix', fn: parseByNumberPrefix },
    { name: 'special_prefix', fn: parseBySpecialPrefix },
    { name: 'standard_blocks', fn: parseStandardBlocks },
    { name: 'newline_split', fn: parseByNewlineSplit },
  ];
  for (var s = 0; s < strategies.length; s++) {
    var qs = strategies[s].fn(normalized) || [];
    var h = { questions: qs, name: strategies[s].name };
    if (layoutAnalyzerQP) h.score = layoutAnalyzerQP.scoreHypothesis(h, layoutFeatures, normalized);
    else h.score = qs.length > 0 ? (60 - s * 10) : 0;
    hypotheses.push(h);
  }
  hypotheses.sort(function(a, b) { return b.score - a.score; });
  var best = hypotheses[0];
  var questions = (best && best.questions.length > 0) ? best.questions : [];
  return {
    questions: questions,
    strategy: best ? best.name : 'none',
    stats: { total: Math.max(questions.length, 1), parsed: questions.length, failed: 0 },
    warnings: questions.length === 0 ? ['未能解析出有效题目，请检查格式'] : [],
    layout: layoutFeatures ? layoutFeatures.dominantPattern : 'none'
  };
}

function parseText(text) {
  var origResult = parseTextOriginal(text);
  var enhancedResult = parseWithLayoutAnalysis(text, null);
  if (enhancedResult.questions.length > origResult.questions.length) return enhancedResult;
  if (enhancedResult.questions.length >= origResult.questions.length && enhancedResult.questions.length > 0) return enhancedResult;
  return origResult;
}


/**
 * 从 Word Buffer 解析题目
 * @param {Buffer} docxBuffer - .docx 文件 Buffer
 * @returns {Promise<{ questions: Array, stats: Object, warnings: Array, htmlPreview: string, strategy: string }>}
 */

/** Word智能解析 — 识别题干 + 多行选项 + 答案行模式 */
function parseWordLikeText(text) {
  var lines = text.split("\n").filter(function(l) { return l.trim(); });
  if (lines.length < 4) return null;
  var optIndices = [];
  var ansIdx = -1;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (ANSWER_RE.test(line) || /^答案/.test(line)) { ansIdx = i; break; }
    var opts = extractOptionsFromLine(line);
    if (opts && opts.length === 1 && /^[A-D]$/i.test(opts[0].key)) { optIndices.push(i); continue; }
    var bOpts = extractBracketOptionsFromLine(line, OPT_CHINBRACKET_RE);
    if (bOpts && bOpts.length === 1) { optIndices.push(i); continue; }
    var eOpts = extractBracketOptionsFromLine(line, OPT_ENBRACKET_RE);
    if (eOpts && eOpts.length === 1) { optIndices.push(i); continue; }
  }
  if (optIndices.length < 2) return null;
  var firstOpt = optIndices[0];
  var blockLines = lines.slice(0, ansIdx >= 0 ? ansIdx + 1 : lines.length);
  var blockText = blockLines.join("\n");
  var result = parseSingleBlock(blockText);
  return result ? [result] : null;
}

// ==================== 增强型 Word 智能解析 (v2) ====================

function wordSmartParseV2(text) {
  var lines = text.split("\n").filter(function(l) { return l.trim(); });
  if (lines.length < 3) return null;
  var results = [];
  var currentBlock = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (/^\s*[【\\[]\s*(?:单选|多选|判断|填空|简答|不定项)/.test(line) || /^\s*(?:一|二|三|四|五|六|七|八|九|十)[、.．]/.test(line)) {
      if (currentBlock.length > 0) { var q = parseSingleBlock(currentBlock.join("\n")); if (q && q.stem) results.push(q); currentBlock = []; }
    }
    var isNewQ = /^\s*\d{1,4}[.、\)）]\s*/.test(line) && !/^\s*[A-Za-z]\s*[.、\)）]/.test(line) && !ANSWER_RE.test(line) && !EXPLANATION_RE.test(line);
    if (isNewQ && currentBlock.length > 0) { var pq = parseSingleBlock(currentBlock.join("\n")); if (pq && pq.stem && pq.stem !== '（未识别题干）') results.push(pq); currentBlock = []; }
    currentBlock.push(line);
  }
  if (currentBlock.length > 0) { var lq = parseSingleBlock(currentBlock.join("\n")); if (lq && lq.stem) results.push(lq); }
  if (results.length === 0) { var fb = parseSingleBlock(text); if (fb && fb.stem) results.push(fb); }
  return results.length > 0 ? results : null;
}

function parseTableEnhanced(text) {
  if (text.indexOf('__TABLE__') === -1) return null;
  var results = [];
  var parts = text.split(/__TABLE__(\d*)\n/);
  for (var ti = 1; ti < parts.length; ti += 2) {
    var colCnt = parseInt(parts[ti]) || 2;
    var tblContent = parts[ti + 1];
    if (!tblContent || tblContent.indexOf('__ENDTABLE__') === -1) continue;
    var rows = tblContent.split('\n').filter(function(l) { return l.trim() && l.indexOf('__ENDTABLE__') === -1; });
    if (rows.length < 2) continue;
    var startRow = 0;
    var cells0 = rows[0].split('\t');
    if (cells0.every(function(c) { return /^[A-D]$/i.test(c.trim()); })) startRow = 1;
    var firstColIsNum = true;
    for (var ri = startRow; ri < rows.length; ri++) { var c = rows[ri].split('\t'); if (c.length > 0 && !/^\d/.test(c[0].trim())) { firstColIsNum = false; break; } }
    var optStart = firstColIsNum ? 1 : 0;
    var optEnd = Math.min(optStart + 4, colCnt);
    for (var ri2 = startRow; ri2 < rows.length; ri2++) {
      var cells = rows[ri2].split('\t');
      if (cells.length <= optStart) continue;
      var stem = firstColIsNum ? cells[0].replace(/^\d+[.、\)）]?\s*/, '').trim() : (cells[0] || '');
      var opts = [];
      for (var ci = optStart; ci < optEnd && ci < cells.length; ci++) {
        var ct = cells[ci].replace(/【B】/g, '').replace(/【\/B】/g, '').trim();
        if (ct) opts.push({ key: String.fromCharCode(65 + ci - optStart), text: ct });
      }
      if (opts.length >= 2) results.push({ type: 'single_choice', stem: stem || '（表格题）', options: opts, answer: '', explanation: '' });
    }
  }
  return results.length > 0 ? results : null;
}

async function parseWordBuffer(docxBuffer) {
  var mammoth;
  try { mammoth = require('mammoth'); } catch (e) {
    return { questions: [], stats: { total: 0, parsed: 0, failed: 0 }, warnings: ['mammoth 未安装'], strategy: 'error' };
  }
  try {
    var styleMap = [
      "p[style-name='List Paragraph'] => p.list-item:fresh",
      "p[style-name='ListParagraph'] => p.list-item:fresh",
      "p[style-name='Heading 1'] => h1:fresh", "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Question Stem'] => p.stem:fresh",
      "p[style-name='Answer'] => p.answer:fresh",
      "p[style-name='Explanation'] => p.explanation:fresh"
    ];
    var convertResult = await mammoth.convertToHtml({ buffer: docxBuffer, styleMap: styleMap });
    var htmlContent = convertResult.value;
    var warnings = (convertResult.messages || []).filter(function(m) { return m.type === 'warning'; }).map(function(m) { return m.message; });
    var structuredText = htmlToStructuredText(htmlContent);
    // 1. Table enhanced
    var tblResult = parseTableEnhanced(structuredText);
    if (tblResult && tblResult.length > 0) return { questions: tblResult, strategy: 'word_table_v2', stats: { total: tblResult.length, parsed: tblResult.length, failed: 0 }, warnings: warnings, htmlPreview: htmlContent };
    // 2. Old table
    var oldTbl = parseTableStructure(structuredText);
    if (oldTbl && oldTbl.length > 0) return { questions: oldTbl, strategy: 'word_table', stats: { total: oldTbl.length, parsed: oldTbl.length, failed: 0 }, warnings: warnings, htmlPreview: htmlContent };
    var cleanText = structuredText.replace(/\n\n+/g, "\n");
    // 3. WordSmartV2
    var v2Result = wordSmartParseV2(cleanText);
    if (v2Result && v2Result.length > 0) return { questions: v2Result, strategy: 'word_smart_v2', stats: { total: v2Result.length, parsed: v2Result.length, failed: 0 }, warnings: warnings, htmlPreview: htmlContent };
    // 4. Old word_smart
    var oldSmart = parseWordLikeText(cleanText);
    if (oldSmart && oldSmart.length > 0) return { questions: oldSmart, strategy: 'word_smart', stats: { total: oldSmart.length, parsed: oldSmart.length, failed: 0 }, warnings: warnings, htmlPreview: htmlContent };
    // 5. Layout analysis + multi-hypothesis
    var layoutResult = parseWithLayoutAnalysis(cleanText, htmlContent);
    if (layoutResult.questions.length > 0) return { questions: layoutResult.questions, strategy: 'word_layout_' + layoutResult.strategy, stats: layoutResult.stats, warnings: warnings, htmlPreview: htmlContent };
    // 6. Final fallback
    var textResult = parseText(cleanText);
    return { questions: textResult.questions, strategy: 'word_' + textResult.strategy, stats: textResult.stats, warnings: warnings.concat(textResult.warnings), htmlPreview: htmlContent };
  } catch (err) {
    return { questions: [], strategy: 'error', stats: { total: 0, parsed: 0, failed: 0 }, warnings: ['Word 解析失败: ' + (err.message || '未知错误')] };
  }
}



// ==================== 选项提取辅助函数 ====================

function _extractCommaOptions(line) {
  var parts = line.trim().split(/\s+/);
  var options = [];
  for (var i = 0; i < parts.length; i++) {
    var m = parts[i].match(/^([A-Za-z])\s*[、]\s*(.+)/);
    if (m) {
      options.push({ key: m[1].toUpperCase(), text: m[2].trim() });
    }
  }
  if (options.length >= 2) return options;
  var fullLine = line.trim();
  var re = /([A-Za-z])\s*[、]\s*([^A-Za-z\s]+[^A-Za-z]*?)(?=\s+[A-Za-z]\s*[、]|$)/g;
  var m2;
  while ((m2 = re.exec(fullLine)) !== null) {
    options.push({ key: m2[1].toUpperCase(), text: m2[2].trim() });
  }
  return options.length >= 2 ? options : null;
}

function _extractTabOptions(line) {
  if (line.indexOf("\t") < 0) return null;
  var parts = line.trim().split(/\t+/).filter(function(p){return p.trim();});
  if (parts.length < 2) return null;
  var options = [];
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    if (!p) continue;
    var m = p.match(/^\s*([A-Za-z])\s*[\.、\)）．:：]?\s*(.*)/);
    if (m && m[1]) {
      options.push({ key: m[1].toUpperCase(), text: (m[2] || '').trim() });
    } else {
      var key = String.fromCharCode(65 + options.length);
      options.push({ key: key, text: p });
    }
  }
  return options.length >= 2 ? options : null;
}

module.exports = {
  _extractCommaOptions: _extractCommaOptions,
  _extractTabOptions: _extractTabOptions,
  parseWithLayoutAnalysis: parseWithLayoutAnalysis,
  wordSmartParseV2: wordSmartParseV2,

  parseText: parseText,
  parseWordBuffer: parseWordBuffer,
  detectType: detectType,
  cleanStem: cleanStem,
  TYPE_KEYWORDS: TYPE_KEYWORDS
};




