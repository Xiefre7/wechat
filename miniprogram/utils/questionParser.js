/**
 * 题目结构化解析引擎
 *
 * 将用户粘贴的题库文本自动识别为结构化题目数据。
 * 支持多种常见格式：编号型、括号型、模板型。
 *
 * 识别字段：题型、题干、选项(A/B/C/D/对/错)、答案、解析
 */

/** 题型关键词 → 标准类型映射 */
const TYPE_KEYWORDS = {
  single_choice: ['单选', '单选题', '单项选择', '单项选择题'],
  multi_choice: ['多选', '多选题', '多项选择', '多项选择题', '不定项'],
  true_false: ['判断', '判断题', '是非题'],
  fill_blank: ['填空', '填空题'],
  short_answer: ['简答', '简答题', '问答', '问答题', '论述', '名词解释'],
};

/** 题型推断 */
function detectType(text, optionsCount) {
  const lower = text.toLowerCase();
  const keys = Object.keys(TYPE_KEYWORDS);
  for (const key of keys) {
    if (TYPE_KEYWORDS[key].some((kw) => lower.includes(kw))) {
      return key;
    }
  }
  // 无关键词时按选项数推断（2选项不再盲判判断题，用户需明确标注"判断"）
  if (optionsCount >= 2) return 'single_choice';
  if (optionsCount === 0) return 'short_answer';
  return 'single_choice';
}

/** 清理题干中的题型标签和题号前缀（循环去除，处理"单选题\n1. 题干"等多层前缀） */
function cleanStem(raw) {
  var result = raw;
  var prev = '';
  // 循环替换直到不再变化（处理多层级前缀如 "单选题\n1. 题干内容"）
  while (result !== prev) {
    prev = result;
    result = result
      .replace(
        /^(?:题目\s*[：:]|题干\s*[：:]|\d+[\.\、\)）]\s*|【.*?】|\[.*?\]|（.*?）)/g,
        ''
      )
      .replace(/^(?:单选|多选|判断|填空|简答|问答|论述|名词解释)(?:题)?\s*/i, '');
  }
  return result.trim();
}

/** 匹配选项字母 */
const OPT_LETTER_RE = /^([A-Za-z])[\.\、\)）．\s]+(.+)/;
/** 判断题正误 */
const TF_RE = /^(?:[对错]|正确|错误|√|×|✓|✗|T|F|True|False|YES|NO)$/i;
const TF_TRUE = /^(对|正确|√|✓|T|t|true|True)$/;
const TF_FALSE = /^(错|错误|×|✗|F|f|false|False)$/;

/** 答案行正则 — 支持 答案： / 【答案】 / [答案] / 答案 等写法（冒号可选） */
const ANSWER_RE = /^(?:【?答案】?|【?参考答案】?|【?正确答案】?)\s*[：:：]?\s*(.+)/i;

/** 答案+解析合并行正则 — 支持 答案：B | 解析：... / 【答案】B | 解析：... 等 */
const ANSWER_EXPL_RE = /^(?:【?答案】?|【?参考答案】?|【?正确答案】?)\s*[：:：]?\s*(.+?)\s*(?:\|\s*|\s{2,})\s*(?:解析|答案解析|详解)\s*[：:：]\s*(.+)/i;

/** 解析行正则 */
const EXPLANATION_RE = /^(?:【?解析】?|【?答案解析】?|【?详解】?|【?试题解析】?|解析|答案解析|详解|试题解析)\s*[：:：]?\s*(.+)/i;

/**
 * 解析文本块为单道题目
 * @param {string} blockText - 一道题的完整文本
 * @returns {object|null} 解析后的题目对象
 */
function parseQuestionBlock(blockText) {
  const lines = blockText
    .split(/\n|\r\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  const question = {
    type: 'single_choice',
    stem: '',
    options: [],
    answer: '',
    explanation: '',
  };

  const optionLines = [];
  let inExplanation = false;
  let explanationLines = [];
  let stemLines = [];

  for (const line of lines) {
    const answerMatch = line.match(ANSWER_RE);
    const explMatch = line.match(EXPLANATION_RE);
    const answerExplMatch = line.match(ANSWER_EXPL_RE);

    if (answerExplMatch) {
      // 合并行：【答案】B  |  解析：xxx
      question.answer = answerExplMatch[1].trim();
      explanationLines.push(answerExplMatch[2].trim());
      inExplanation = false;
    } else if (answerMatch) {
      question.answer = answerMatch[1].trim();
      inExplanation = false;
    } else if (explMatch) {
      inExplanation = true;
      explanationLines.push(explMatch[1].trim());
    } else if (inExplanation) {
      // 检测解析区是否结束：遇到选项行或新的答案行
      if (OPT_LETTER_RE.test(line) || ANSWER_RE.test(line)) {
        inExplanation = false;
        // 当前行不是解析内容，需重新按对应分支处理
        if (OPT_LETTER_RE.test(line)) {
          const optMatch = line.match(OPT_LETTER_RE);
          optionLines.push({ key: optMatch[1].toUpperCase(), text: optMatch[2].trim() });
        } else if (ANSWER_RE.test(line)) {
          const ansMatch = line.match(ANSWER_RE);
          question.answer = ansMatch[1].trim();
        }
      } else {
        explanationLines.push(line);
      }
    } else if (OPT_LETTER_RE.test(line)) {
      var match = line.match(OPT_LETTER_RE);
      var key = match[1].toUpperCase();
      var text = match[2].trim();
      // 判断型选项
      if (TF_RE.test(text)) {
        optionLines.push({ key, text, isTrueFalse: true });
      } else {
        optionLines.push({ key, text });
      }
    } else if (TF_RE.test(line)) {
      // 判断题 — 选项就是"对/错"
      const key =
        optionLines.length === 0 ? 'A' : String.fromCharCode(65 + optionLines.length);
      optionLines.push({ key, text: line.trim() });
    } else {
      stemLines.push(line);
    }
  }

  // 组装题干
  question.stem = cleanStem(stemLines.join('\n')) || '（无题干）';

  // 处理选项
  if (optionLines.length > 0) {
    question.options = optionLines.map((o) => ({
      key: o.key,
      text: o.text,
    }));
    // 判断题选项规范化
    if (
      optionLines.length === 2 &&
      optionLines.every((o) => TF_TRUE.test(o.text) || TF_FALSE.test(o.text))
    ) {
      question.type = 'true_false';
      // 规范化对错
      const normOptions = optionLines.map((o) => ({
        key: o.key,
        text: TF_TRUE.test(o.text) ? '对' : '错',
        isTrue: TF_TRUE.test(o.text),
      }));
      question.options = normOptions;
    }
  }

  // 题型 — 仅从题干文本推断，避免选项/解析中的关键词干扰
  const stemText = question.stem.toLowerCase();
  question.type = detectType(stemText, question.options.length);

  // 判断题答案规范化 → 统一为 A/B
  if (question.type === 'true_false') {
    const ans = question.answer.trim();
    if (TF_TRUE.test(ans)) question.answer = 'A';
    else if (TF_FALSE.test(ans)) question.answer = 'B';
  }

  // 解析
  question.explanation = explanationLines.join('\n').trim();

  return question;
}

/**
 * 切分文本为题目块
 *
 * 切分规则：
 * 1. 以题号"数字."或"数字、"开头的行为新题起始
 * 2. 以"【数字】"或"【练数字】"或"【单选题】"等标签起始
 */
function splitIntoBlocks(text) {
  // 匹配新题起始：
  //   N.  /  N、 /  N）  — 数字编号型（要求前面是文本开头或空行，防止解析文本中的编号被误判）
  //   【N】 / 【练N】 / 【第N题】  — 括号编号型
  //   【单选题】 / 【多选题】 等  — 题型标签型
  //   行首的 单选/多选/判断/填空/简答   — 纯文字题型标记
  const questionStartRe =
    /(?:^|\n\s*\n)\s*(\d{1,4})[\.\、\)）]\s*(?![\d\.\、\)）])|(?:^|\n)\s*(?:【(?:练|第)?\d[^】]*】)|(?:^|\n)\s*(?:【(?:单选|多选|判断|填空|简答)(?:题)?】)|(?:\n|^)(?:单选|多选|判断|填空|简答)(?:题)?\s*(?:[：:]|(?=\n|$))/g;

  // 收集所有可能的切分点
  const splitPoints = [];
  let match;
  while ((match = questionStartRe.exec(text)) !== null) {
    const pos = match.index + (match[0].match(/^\n/) ? 1 : 0);
    splitPoints.push(pos);
  }

  // 没有找到题号 → 整体作为一道题
  if (splitPoints.length === 0) {
    return [text.trim()];
  }

  // 去重排序
  const unique = [...new Set(splitPoints)].sort((a, b) => a - b);

  const blocks = [];
  for (let i = 0; i < unique.length; i++) {
    const start = unique[i];
    const end = i < unique.length - 1 ? unique[i + 1] : text.length;
    const block = text.slice(start, end).trim();
    if (block) blocks.push(block);
  }
  return blocks;
}

/**
 * 主解析入口
 * @param {string} rawText - 用户粘贴的原始文本
 * @returns {{ questions: object[], stats: object }}
 */
function parseQuestions(rawText) {
  if (!rawText || !rawText.trim()) {
    return { questions: [], stats: { total: 0, parsed: 0, failed: 0 } };
  }

  const blocks = splitIntoBlocks(rawText);
  const questions = [];

  for (const block of blocks) {
    const q = parseQuestionBlock(block);
    if (q && q.stem !== '（无题干）') {
      questions.push(q);
    } else if (q) {
      // 无题干但有选项/答案的题目（仅由选项行+答案行组成），仍保留
      if (q.options.length > 0 || q.answer) {
        q.stem = '（请查看选项）';
        questions.push(q);
      }
    }
  }

  return {
    questions,
    stats: {
      total: blocks.length,
      parsed: questions.length,
      failed: blocks.length - questions.length,
    },
  };
}

module.exports = {
  parseQuestions,
  parseQuestionBlock,
  splitIntoBlocks,
  detectType,
  cleanStem,
  TYPE_KEYWORDS,
  OPT_LETTER_RE,
  ANSWER_RE,
  EXPLANATION_RE,
};
