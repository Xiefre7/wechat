const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 导入选项布局标准化 & 增强题型判别模块（防御式加载：若模块不存在则回退到简单模式）
let normalizeOptionLayouts, extractOptionsFromLine, extractBracketOptionsFromLine,
    extractCircleOptionsFromLine, detectType, cleanStem,
    OPT_CHINBRACKET_RE, OPT_ENBRACKET_RE,
    ANSWER_RE_SHARED, ANSWER_EXPL_SHARED, EXPLANATION_RE_SHARED,
    TF_TRUE, TF_FALSE;

try {
  const optNorm = require('./lib/optionNormalizer');
  normalizeOptionLayouts = optNorm.normalizeOptionLayouts;
  extractOptionsFromLine = optNorm.extractOptionsFromLine;
  extractBracketOptionsFromLine = optNorm.extractBracketOptionsFromLine;
  extractCircleOptionsFromLine = optNorm.extractCircleOptionsFromLine;
  detectType = optNorm.detectType;
  cleanStem = optNorm.cleanStem;
  OPT_CHINBRACKET_RE = optNorm.OPT_CHINBRACKET_RE;
  OPT_ENBRACKET_RE = optNorm.OPT_ENBRACKET_RE;
  ANSWER_RE_SHARED = optNorm.ANSWER_RE;
  ANSWER_EXPL_SHARED = optNorm.ANSWER_EXPL_RE;
  EXPLANATION_RE_SHARED = optNorm.EXPLANATION_RE;
  TF_TRUE = optNorm.TF_TRUE;
  TF_FALSE = optNorm.TF_FALSE;
} catch (e) {
  console.warn('[quickstartFunctions] optionNormalizer module not available, enhanced parsing disabled:', e.message);
  // 占位：parseOcrText 内部会检测并退回 fallback
}
// 获取openid
const getOpenId = async () => {
  // 获取基础信息
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 获取小程序二维码
const getMiniProgramCode = async () => {
  // 获取小程序二维码的buffer
  const resp = await cloud.openapi.wxacode.get({
    path: "pages/index/index",
  });
  const { buffer } = resp;
  // 将图片上传云存储空间
  const upload = await cloud.uploadFile({
    cloudPath: "code.png",
    fileContent: buffer,
  });
  return upload.fileID;
};

// 创建集合
const createCollection = async () => {
  try {
    // 创建集合
    await db.createCollection("sales");
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "上海",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "南京",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "广州",
        sales: 22,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "深圳",
        sales: 22,
      },
    });
    return {
      success: true,
    };
  } catch (e) {
    // 这里catch到的是该collection已经存在，从业务逻辑上来说是运行成功的，所以catch返回success给前端，避免工具在前端抛出异常
    return {
      success: true,
      data: "create collection success",
    };
  }
};

// 查询数据
const selectRecord = async () => {
  // 返回数据库查询结果
  return await db.collection("sales").get();
};

// 更新数据
const updateRecord = async (event) => {
  try {
    // 遍历修改数据库信息
    for (let i = 0; i < event.data.length; i++) {
      await db
        .collection("sales")
        .where({
          _id: event.data[i]._id,
        })
        .update({
          data: {
            sales: event.data[i].sales,
          },
        });
    }
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 新增数据
const insertRecord = async (event) => {
  try {
    const insertRecord = event.data;
    // 插入数据
    await db.collection("sales").add({
      data: {
        region: insertRecord.region,
        city: insertRecord.city,
        sales: Number(insertRecord.sales),
      },
    });
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 删除数据
const deleteRecord = async (event) => {
  try {
    await db
      .collection("sales")
      .where({
        _id: event.data._id,
      })
      .remove();
    return {
      success: true,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// ─── 题库导入 ───

/**
 * 导入题库（文本/手动录入/OCR结果）
 * 创建 bank + 批量写入 questions
 */
const importBank = async (event) => {
  const { bankName, bankType, questions, source } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!bankName || !questions || !Array.isArray(questions) || questions.length === 0) {
    return { success: false, errMsg: '缺少题库名称或题目数据' };
  }

  if (questions.length > 500) {
    return { success: false, errMsg: '单次最多导入 500 题' };
  }

  try {
    // 1. 创建题库
    const bankRes = await db.collection('banks').add({
      data: {
        name: bankName,
        type: 'custom',
        category: '',
        subCategory: '',
        description: `用户自导入题库（${source}方式导入）`,
        coverImage: '',
        ownerId: openid,
        isPublic: false,
        questionCount: questions.length,
        knowledgePointCount: 0,
        tags: ['自导入'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    const bankId = bankRes._id;

    // 2. 批量写入题目（每批20条并发，微信云数据库单次 add 最多20条）
    const BATCH_SIZE = 20;
    let insertedCount = 0;

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = questions.slice(i, i + BATCH_SIZE).map((q) => ({
        bankId,
        knowledgePointId: '', // 自导入无知识点
        type: q.type || 'single_choice',
        difficulty: 2,
        content: {
          stem: q.stem || '',
          options: (q.options || []).map(function(o) {
            return { key: o.key, text: (o.text || '').trim(), image: o.image || '' };
          }),
          answer: q.answer || '',
          explanation: q.explanation || '',
          stemImages: q.stemImages || [],
          explanationImages: q.explanationImages || [],
        },
        tags: ['自导入'],
        status: 'active',
        createdAt: new Date().toISOString(),
      }));

      // 并发写入本批（最多20条同时 add）
      const results = await Promise.all(
        batch.map((item) => db.collection('questions').add({ data: item }))
      );
      insertedCount += results.length;
    }

    // 3. 更新题库题目计数
    await db
      .collection('banks')
      .doc(bankId)
      .update({
        data: {
          questionCount: insertedCount,
          updatedAt: new Date().toISOString(),
        },
      });

    return {
      success: true,
      bankId,
      questionCount: insertedCount,
    };
  } catch (err) {
    console.error('导入题库失败:', err);
    return {
      success: false,
      errMsg: '导入失败: ' + (err.message || '数据库写入异常'),
    };
  }
};

/**
 * 删除自导入题库
 * 级联删除：banks → questions → wrong_questions
 */
const deleteBank = async (event) => {
  const { bankId } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!bankId) {
    return { success: false, errMsg: '缺少题库ID' };
  }

  try {
    // 1. 验证题库存在且属于当前用户
    const bankRes = await db.collection('banks').doc(bankId).get();
    if (!bankRes.data) {
      return { success: false, errMsg: '题库不存在' };
    }
    // 安全校验：ownerId 为空（官方题库）或不属于当前用户时禁止删除
    if (!bankRes.data.ownerId || bankRes.data.ownerId !== openid) {
      return { success: false, errMsg: '无权删除此题库' };
    }

    // 2. 删除题库
    await db.collection('banks').doc(bankId).remove();

    // 3. 删除该题库下所有题目（分批）
    await batchDelete(db.collection('questions'), 'bankId', bankId);

    // 4. 删除该题库下所有错题记录
    await batchDelete(db.collection('wrong_questions'), 'bankId', bankId);

    return { success: true, message: '题库已删除' };
  } catch (err) {
    console.error('deleteBank error:', err);
    return { success: false, errMsg: err.message || '删除失败' };
  }
};

/**
 * 分批删除辅助函数
 * 微信云数据库 remove where 无单次限制，但逐条 doc().remove() 保险
 */
async function batchDelete(collection, fieldName, fieldValue) {
  const BATCH_SIZE = 100;
  while (true) {
    const res = await collection
      .where({ [fieldName]: fieldValue })
      .limit(BATCH_SIZE)
      .get();
    if (!res.data || res.data.length === 0) break;
    const ids = res.data.map(function (item) { return item._id; });
    for (var i = 0; i < ids.length; i++) {
      try { await collection.doc(ids[i]).remove(); } catch (e) { /* skip */ }
    }
    if (res.data.length < BATCH_SIZE) break;
  }
}

/**
 * Excel 文件导入
 * 云函数端使用 SheetJS 解析 xlsx 后调用 importBank
 */
const importBankByExcel = async (event) => {
  const { fileID, bankName } = event;

  if (!fileID || !bankName) {
    return { success: false, errMsg: '缺少文件或题库名称' };
  }

  try {
    // 下载云存储文件
    const downloadRes = await cloud.downloadFile({ fileID });
    const fileBuffer = downloadRes.fileContent;

    // 动态加载 SheetJS（需在 package.json 中添加依赖）
    let XLSX;
    try {
      XLSX = require('xlsx');
    } catch (e) {
      return {
        success: false,
        errMsg: 'Excel解析组件未就绪，请使用文本粘贴方式导入。错误: ' + e.message,
      };
    }

    // 解析 Excel
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!rawData || rawData.length < 2) {
      return { success: false, errMsg: 'Excel 文件为空或格式不正确' };
    }

    // 按模板解析：第1行为表头
    // 模板列：题型 | 题干 | 选项A | 选项B | 选项C | 选项D | 选项E | 选项F | 答案 | 解析
    const header = rawData[0];
    const rows = rawData.slice(1).filter((row) => row.some((cell) => cell != null && cell !== ''));

    if (rows.length > 500) {
      return { success: false, errMsg: `Excel 包含 ${rows.length} 题，单次最多导入 500 题` };
    }

    const typeMap = {
      单选题: 'single_choice',
      多选题: 'multi_choice',
      判断题: 'true_false',
      填空题: 'fill_blank',
      简答题: 'short_answer',
    };

    const questions = rows
      .map((row) => {
        const rawType = (row[0] || '单选题').toString().trim();
        const type = typeMap[rawType] || 'single_choice';
        const stem = (row[1] || '').toString().trim();
        const answer = (row[8] || '').toString().trim();
        const explanation = (row[9] || '').toString().trim();

        // 提取选项
        const optionKeys = ['A', 'B', 'C', 'D', 'E', 'F'];
        const options = [];
        for (let i = 0; i < 6; i++) {
          const text = row[2 + i];
          if (text != null && text.toString().trim() !== '') {
            options.push({ key: optionKeys[i], text: text.toString().trim() });
          }
        }

        if (!stem) return null;

        return { type, stem, options, answer, explanation };
      })
      .filter(Boolean);

    if (questions.length === 0) {
      return { success: false, errMsg: '未能从 Excel 中解析到有效题目' };
    }

    // 复用 importBank 逻辑
    return await importBank({
      bankName,
      bankType: 'custom',
      questions,
      source: 'excel',
    });
  } catch (err) {
    console.error('Excel导入失败:', err);
    return {
      success: false,
      errMsg: 'Excel 文件解析失败: ' + (err.message || '未知错误'),
    };
  }
};

/**
 * Word 文档解析（仅提取文本+结构化，不入库）
 * 用于预览页展示解析结果
 */
const parseWordDocument = async (event) => {
  const { fileID } = event;

  if (!fileID) {
    console.warn('[parseWordDocument] Missing fileID');
    return { success: false, errMsg: '缺少 Word 文件' };
  }

  try {
    // 下载云存储文件
    const downloadRes = await cloud.downloadFile({ fileID });
    const fileBuffer = downloadRes.fileContent;

    // 动态加载 mammoth
    let mammoth;
    try {
      mammoth = require('mammoth');
    } catch (e) {
      console.error('[parseWordDocument] mammoth require failed:', e.message);
      return {
        success: false,
        errMsg: 'Word解析组件未就绪，请运行 npm install 安装 mammoth 依赖。错误: ' + e.message,
      };
    }

    // 提取纯文本
    const extractResult = await mammoth.extractRawText({ buffer: fileBuffer });
    const rawText = extractResult.value;

    if (!rawText || !rawText.trim()) {
      return {
        success: false,
        errMsg: 'Word 文档中未提取到文字内容，请检查文件是否包含文字（非图片扫描件）',
      };
    }

    // 用规则引擎结构化（增强版：多选项布局 + 题型打分引擎）
    let questions;
    let parseUsedFallback = false;
    try {
      questions = parseOcrText(rawText);
    } catch (parseErr) {
      console.error('[parseWordDocument] Enhanced parser failed:', parseErr.message);
      console.error('[parseWordDocument] Stack:', parseErr.stack);
      // 回退到简单解析（仅按行分割，不做标准化）
      questions = parseOcrTextFallback(rawText);
      parseUsedFallback = true;
    }

    // 为每道题添加识别置信度标记，方便前端提示用户核对
    questions.forEach((q) => {
      q._detectionConfidence = 'high';
      q._detectionNote = '';

      // 有2-4个选项但被判为简答题 → 可疑
      if (q.options.length >= 2 && q.options.length <= 4 && q.type === 'short_answer') {
        q._detectionConfidence = 'low';
        q._detectionNote = '疑似选择题（有选项但未识别为选择题），请确认题型';
      }

      // 2个对/错选项但被判为单选题 → 可能是判断题
      if (
        q.options.length === 2 &&
        q.type === 'single_choice' &&
        q.options.every((o) => /^(对|错|正确|错误|√|×|T|F|true|false)$/i.test(o.text))
      ) {
        q._detectionConfidence = 'medium';
        q._detectionNote = '选项为对/错文本，可能为判断题，请确认';
      }

      // 无题干但有选项 → 可疑
      if ((!q.stem || q.stem.trim().length < 3) && q.options.length >= 2) {
        q._detectionConfidence = 'low';
        q._detectionNote = '题干过短，可能解析有误，请核对';
      }

      // 有3+选项但答案是单个字母且题干含"多选/哪些"关键词 → 答案可能不完整
      if (
        q.options.length >= 3 &&
        q.type === 'single_choice' &&
        /(?:多选|多项|不定项|下列哪些|以下哪些)/.test(q.stem)
      ) {
        q._detectionConfidence = 'medium';
        q._detectionNote = '题干含多选关键词但被判为单选，请确认题型';
      }

      // 选项中有下划线或填空题特征 → 可能是填空题
      if (q.options.length === 0 && /_{2,}|____|__+|（\s*[^。？！，；]*\s*）/.test(q.stem) && q.type !== 'fill_blank') {
        q._detectionConfidence = 'medium';
        q._detectionNote = '题干含填空标记但未识别为填空题，请确认';
      }
    });

    if (questions.length === 0) {
      return {
        success: false,
        errMsg: '未能从文档中识别到题目。请确保文档格式为：题号. 题干 + 选项(A/B/C/D) + 答案',
        rawTextPreview: rawText.substring(0, 200),
        rawTextLength: rawText.length,
        lineCount: rawText.split(/\n/).length,
      };
    }

    // 统计题型分布
    const typeCounts = {};
    questions.forEach((q) => {
      typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
    });

    // 截断过长文本
    const warnings = [];
    if (rawText.length > 50000) {
      warnings.push('文档内容较长，仅解析了前50000字符');
    }

    return {
      success: true,
      rawTextPreview: rawText.substring(0, 500),
      rawTextLength: rawText.length,
      questions,
      questionCount: questions.length,
      typeDistribution: typeCounts,
      warnings,
    };
  } catch (err) {
    console.error('[parseWordDocument] Exception:', err.message);
    console.error('[parseWordDocument] Stack:', err.stack);
    return {
      success: false,
      errMsg: 'Word 文档解析失败: ' + (err.message || '未知错误'),
    };
  }
};

/**
 * Word 文档直接导入（解析+入库）
 */
const importBankByWord = async (event) => {
  const { fileID, bankName } = event;

  if (!fileID || !bankName) {
    return { success: false, errMsg: '缺少文件或题库名称' };
  }

  // 先解析
  const parseResult = await parseWordDocument({ fileID });
  if (!parseResult.success) {
    return parseResult;
  }

  if (parseResult.questions.length > 500) {
    return { success: false, errMsg: `Word 文档包含 ${parseResult.questions.length} 题，单次最多导入 500 题` };
  }

  // 复用 importBank 逻辑入库
  return await importBank({
    bankName,
    bankType: 'custom',
    questions: parseResult.questions,
    source: 'word',
  });
};

/**
 * 生成下载用 Excel 模板
 */
const downloadImportTemplate = async () => {
  try {
    // 模板内容：纯文本 CSV 格式作为简易模板
    const csvHeader = '题型,题干,选项A,选项B,选项C,选项D,答案,解析';
    const csvExample =
      '单选题,设集合A={1,2,3}, B={2,3,4}, 则A∩B=?,{1,2,3,4},{2,3},{1,4},{1},B,交集是同时属于两个集合的元素';

    const csvContent = csvHeader + '\n' + csvExample;

    const uploadRes = await cloud.uploadFile({
      cloudPath: `templates/import_template_${Date.now()}.csv`,
      fileContent: Buffer.from('﻿' + csvContent, 'utf-8'), // BOM for Excel UTF-8
    });

    return {
      success: true,
      fileID: uploadRes.fileID,
    };
  } catch (err) {
    console.error('生成模板失败:', err);
    return { success: false, errMsg: '模板生成失败' };
  }
};

/**
 * OCR 文字识别
 * 使用微信云开发 OCR 扩展
 */
const parseOCR = async (event) => {
  const { fileID } = event;

  if (!fileID) {
    return { success: false, errMsg: '缺少图片文件' };
  }

  try {
    // 调用 OCR 扩展（需在云开发控制台安装 OCR 扩展）
    let ocrResult;
    try {
      const ocrExt = require('wx-ocr');
      ocrResult = await ocrExt.recognize({
        fileID,
        type: 'general',
      });
    } catch (e) {
      // OCR 扩展未安装时的降级提示
      return {
        success: false,
        errMsg: 'OCR 服务未开通。请在微信云开发控制台安装「通用印刷体识别」扩展。错误: ' + e.message,
      };
    }

    if (!ocrResult || !ocrResult.text) {
      return { success: false, errMsg: 'OCR 未识别到文字内容' };
    }

    const rawText = ocrResult.text;

    // 用规则引擎结构化（复用前端解析逻辑的简化版）
    const questions = parseOcrText(rawText);

    return {
      success: true,
      rawText,
      questions,
    };
  } catch (err) {
    console.error('OCR失败:', err);
    return { success: false, errMsg: 'OCR 识别失败: ' + (err.message || '未知错误') };
  }
};

/**
 * OCR 文本解析（简化版规则引擎）
 * 在云函数端执行，避免前端依赖问题
 */
/**
 * 回退解析器 — 当增强版解析异常时使用，保证至少能返回基本结构化结果
 * 不做选项布局标准化，直接按行解析（兼容原有逻辑）
 */
function parseOcrTextFallback(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\n|\r\n/);
  const questions = [];
  let current = null;
  let inExplanation = false;

  const OPT_RE = /^([A-Fa-f])[\.\、\)）．\s]+(.+)/;
  const ANSWER_RE = /^(?:【?答案】?|【?参考答案】?|【?正确答案】?)\s*[：:：]?\s*(.+)/i;
  const EXPLANATION_RE = /^(?:【?解析】?|【?答案解析】?|【?详解】?|【?试题解析】?|解析|答案解析|详解|试题解析)\s*[：:：]?\s*(.+)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { inExplanation = false; continue; }

    if (current) {
      const explMatch = trimmed.match(EXPLANATION_RE);
      if (explMatch) {
        inExplanation = true;
        current.explanation = (current.explanation ? current.explanation + '\n' : '') + explMatch[1].trim();
        continue;
      }
    }

    const qStartMatch = trimmed.match(/^(\d{1,4})[\.\、\)）]/);
    if (qStartMatch) {
      inExplanation = false;
      if (current && current.stem) questions.push(current);
      current = { stem: trimmed.replace(/^\d+[\.\、\)）]\s*/, ''), options: [], answer: '', explanation: '' };
      continue;
    }

    if (!current) {
      current = { stem: trimmed, options: [], answer: '', explanation: '' };
      continue;
    }

    if (inExplanation) {
      current.explanation = (current.explanation ? current.explanation + '\n' : '') + trimmed;
      continue;
    }

    const optMatch = trimmed.match(OPT_RE);
    if (optMatch) {
      current.options.push({ key: optMatch[1].toUpperCase(), text: optMatch[2].trim() });
      continue;
    }

    const answerMatch = trimmed.match(ANSWER_RE);
    if (answerMatch) { current.answer = answerMatch[1].trim(); inExplanation = false; continue; }

    if (!current.stem.includes(trimmed)) current.stem += '\n' + trimmed;
  }

  if (current && current.stem) questions.push(current);

  return questions.map(function (q) {
    let type = 'single_choice';
    if (q.options.length === 0) type = 'short_answer';
    else if (q.options.length === 2 && q.options.every(function (o) { return /^(对|错|正确|错误|√|×|T|F|true|false)$/i.test(o.text); })) {
      type = 'true_false';
    }
    return { type: type, stem: q.stem || '', options: q.options || [], answer: (q.answer || '').trim(), explanation: (q.explanation || '').trim() };
  });
}

/**
 * OCR/Word 文本结构化解析（增强版 v2）
 *
 * 相比 v1 的改进：
 *   1. 引入 normalizeOptionLayouts() 预处理，支持单行/两行/四行/Tab分隔等任意选项布局
 *   2. 使用 extractOptionsFromLine() 替代简单正则，支持单行多选项拆分
 *   3. 使用 detectType() 多因子打分引擎替代选项数量判题型
 *   4. 支持全部五种题型：单选/多选/判断/填空/简答
 *   5. 判断题答案自动规范化 (对/√ → A, 错/× → B)
 */
function parseOcrText(rawText) {
  if (!rawText || !rawText.trim()) return [];

  // 增强模块不可用时退回简单解析
  if (!normalizeOptionLayouts) {
    console.warn('[parseOcrText] Enhanced module not loaded, delegating to fallback');
    return parseOcrTextFallback(rawText);
  }

  // ── Step 1: 选项布局标准化 ──
  // 将单行多选项(A. xx B. xx)、两行两列、Tab分隔等布局统一转为每行单选项
  const normalizedText = normalizeOptionLayouts(rawText);

  // ── Step 2: 按行拆分 ──
  const lines = normalizedText.split(/\n|\r\n/);
  const questions = [];
  let current = null;
  let inExplanation = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      inExplanation = false;
      continue;
    }

    // 检查是否是解析行（在判断题号之前，防止解析行被误判为新题）
    if (current) {
      const explMatch = trimmed.match(EXPLANATION_RE_SHARED);
      if (explMatch) {
        inExplanation = true;
        current.explanation = (current.explanation ? current.explanation + '\n' : '') + explMatch[1].trim();
        continue;
      }
    }

    // 检测新题开始（题号 + . / 、 / ））
    const qStartMatch = trimmed.match(/^(\d{1,4})[\.\、\)）]/);
    if (qStartMatch) {
      inExplanation = false;
      if (current && current.stem) {
        questions.push(current);
      }
      current = {
        stem: trimmed.replace(/^\d+[\.\、\)）]\s*/, ''),
        options: [],
        answer: '',
        explanation: '',
      };
      continue;
    }

    if (!current) {
      inExplanation = false;
      current = {
        stem: trimmed,
        options: [],
        answer: '',
        explanation: '',
      };
      continue;
    }

    // 如果在解析区域，追加到解析字段
    if (inExplanation) {
      current.explanation = (current.explanation ? current.explanation + '\n' : '') + trimmed;
      continue;
    }

    // ── Step 3: 选项行 — 使用多选项提取器（支持单行多选项）──
    const multiOpts = extractOptionsFromLine(trimmed)
      || extractBracketOptionsFromLine(trimmed, OPT_CHINBRACKET_RE)
      || extractBracketOptionsFromLine(trimmed, OPT_ENBRACKET_RE)
      || extractCircleOptionsFromLine(trimmed);

    if (multiOpts && multiOpts.length > 0) {
      for (const opt of multiOpts) {
        current.options.push({
          key: opt.key.toUpperCase(),
          text: opt.text,
        });
      }
      continue;
    }

    // 答案行
    const answerMatch = trimmed.match(ANSWER_RE_SHARED);
    if (answerMatch) {
      current.answer = answerMatch[1].trim();
      inExplanation = false;
      continue;
    }

    // 答案+解析合并行
    const answerExplMatch = trimmed.match(ANSWER_EXPL_SHARED);
    if (answerExplMatch) {
      current.answer = answerExplMatch[1].trim();
      current.explanation = (current.explanation ? current.explanation + '\n' : '') + answerExplMatch[2].trim();
      inExplanation = false;
      continue;
    }

    // 非选项非答案行 → 追加到题干（去重）
    if (!current.stem.includes(trimmed)) {
      current.stem += '\n' + trimmed;
    }
  }

  // 最后一道
  if (current && current.stem) {
    questions.push(current);
  }

  // ── Step 4: 题型判别 + 规范化 ──
  return questions.map((q) => {
    // 使用增强型多因子打分引擎判断题型
    const type = detectType(q.stem, q.options.length, q.answer, q.options);

    // 判断题答案规范化：对/√ → A, 错/× → B
    let answer = (q.answer || '').trim();
    if (type === 'true_false') {
      if (TF_TRUE.test(answer)) answer = 'A';
      else if (TF_FALSE.test(answer)) answer = 'B';
    }

    // 多选题答案规范化：确保是大写且无多余分隔符
    if (type === 'multi_choice') {
      answer = answer.replace(/[^A-Ea-e]/g, '').toUpperCase();
    }

    return {
      type: type,
      stem: cleanStem(q.stem || ''),
      options: q.options || [],
      answer: answer,
      explanation: (q.explanation || '').trim(),
    };
  });
}

// ─── 问题反馈 ───

// 邮箱配置（使用 QQ 邮箱 SMTP）
// ⚠️ 敏感信息通过云函数环境变量配置，不要在源码中写入真实凭据
// 部署前在微信云开发控制台 → 云函数 → quickstartFunctions → 环境变量中设置：
//   EMAIL_USER  = 你的QQ邮箱地址
//   EMAIL_PASS  = QQ邮箱SMTP授权码 (不是QQ密码，在QQ邮箱设置→账户→POP3/SMTP服务中获取)
//   EMAIL_TO    = 接收反馈通知的邮箱地址
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || 'smtp.qq.com',
  port: parseInt(process.env.EMAIL_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
  // 接收反馈通知的邮箱
  to: process.env.EMAIL_TO || '',
};

const sendFeedback = async (event) => {
  const { feedbackType, content, contact } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!content || !content.trim()) {
    return { success: false, errMsg: '请填写反馈内容' };
  }

  const typeMap = {
    bug: '功能异常',
    suggest: '功能建议',
    content: '题目错误',
    other: '其他问题',
  };
  const typeLabel = typeMap[feedbackType] || '其他问题';
  const createdAt = new Date().toISOString();

  // HTML escape 函数，防止邮件正文 XSS 注入
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 对用户输入进行 HTML 转义
  var safeTypeLabel = escapeHtml(typeLabel);
  var safeContact = escapeHtml(contact || '未填写');
  var safeContent = escapeHtml(content.trim());

  // 1. 存入数据库
  try {
    await db.collection('feedback').add({
      data: {
        openid,
        type: feedbackType,
        typeLabel,
        content: content.trim(),
        contact: contact || '',
        status: 'pending',
        createdAt,
      },
    });
  } catch (dbErr) {
    console.error('反馈入库失败:', dbErr);
    // 入库失败不阻塞邮件发送
  }

  // 2. 发送邮件通知
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (e) {
    return {
      success: false,
      errMsg: '邮件服务未就绪，请先执行 npm install。错误: ' + e.message,
    };
  }

  try {
    const transporter = nodemailer.createTransport(EMAIL_CONFIG);

    const mailBody = `
      <h3>导题斩题小工具 - 用户反馈</h3>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td style="padding:8px;border:1px solid #e0e0e0;background:#f5f5f5;width:80px;">反馈类型</td><td style="padding:8px;border:1px solid #e0e0e0;">${safeTypeLabel}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e0e0e0;background:#f5f5f5;">用户OpenID</td><td style="padding:8px;border:1px solid #e0e0e0;">${openid}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e0e0e0;background:#f5f5f5;">联系方式</td><td style="padding:8px;border:1px solid #e0e0e0;">${safeContact}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e0e0e0;background:#f5f5f5;">反馈时间</td><td style="padding:8px;border:1px solid #e0e0e0;">${createdAt}</td></tr>
      </table>
      <h4>详细描述：</h4>
      <p style="white-space:pre-wrap;background:#f9f9f9;padding:12px;border-radius:4px;">${safeContent}</p>
    `;

    await transporter.sendMail({
      from: `导题斩题小工具反馈 <${EMAIL_CONFIG.auth.user}>`,
      to: EMAIL_CONFIG.to,
      subject: `[导题斩题小工具反馈] ${typeLabel} - ${createdAt.slice(0, 10)}`,
      html: mailBody,
    });

    return { success: true };
  } catch (mailErr) {
    console.error('邮件发送失败:', mailErr);
    return {
      success: false,
      errMsg: '邮件发送失败: ' + (mailErr.message || '未知错误'),
    };
  }
};

// ─── 错题本云函数（本地→云端迁移预备） ───

/** 手动添加错题 */
const addWrongQuestion = async (event) => {
  const { questionId, bankId, knowledgePointId, source } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!questionId || !bankId) return { success: false, errMsg: '缺少必要参数' };
  try {
    const exists = await db.collection('wrong_questions')
      .where({ userId: openid, questionId, status: 'reviewing' }).get();
    if (exists.data.length > 0) return { success: true, alreadyExists: true };
    const now = new Date().toISOString();
    await db.collection('wrong_questions').add({ data: {
      userId: openid, questionId, bankId, knowledgePointId: knowledgePointId || '',
      source: source || 'manual', errorCount: 1, reviewCount: 0,
      consecutiveReviewCorrect: 0, status: 'reviewing', nextReviewAt: now,
      currentIntervalIndex: 0, createdAt: now, updatedAt: now,
    }});
    return { success: true };
  } catch (err) {
    return { success: false, errMsg: err.message };
  }
};

/** 获取待复习错题列表 */
const getWrongReviewList = async (event) => {
  const { bankId } = event || {};
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  try {
    const now = new Date().toISOString();
    let query = db.collection('wrong_questions').where({
      userId: openid, status: 'reviewing',
      nextReviewAt: db.command.lte(now),
    });
    if (bankId) query = query.where({ bankId });
    const { data } = await query.limit(100).get();
    const qIds = [...new Set(data.map(w => w.questionId))];
    const questions = {};
    if (qIds.length > 0) {
      const qRes = await db.collection('questions').where({ _id: db.command.in(qIds) }).get();
      qRes.data.forEach(q => { questions[q._id] = q; });
    }
    return { success: true, data: data.map(w => ({ ...w, question: questions[w.questionId] || null })) };
  } catch (err) {
    return { success: false, errMsg: err.message };
  }
};

/** 错题复习提交（SM-2） */
const reviewWrongAnswer = async (event) => {
  const { wrongId, isCorrect } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!wrongId) return { success: false, errMsg: '缺少错题ID' };
  try {
    const record = await db.collection('wrong_questions').doc(wrongId).get();
    if (!record.data || record.data.userId !== openid) return { success: false, errMsg: '记录不存在' };
    const r = record.data;
    const now = new Date();
    const INTERVALS = [1, 2, 4, 7, 15, 30, 60];
    let update = { reviewCount: r.reviewCount + 1, updatedAt: now.toISOString() };
    if (isCorrect) {
      const ni = Math.min(r.currentIntervalIndex + 1, INTERVALS.length - 1);
      update.consecutiveReviewCorrect = r.consecutiveReviewCorrect + 1;
      update.currentIntervalIndex = ni;
      update.nextReviewAt = new Date(now.getTime() + INTERVALS[ni] * 86400000).toISOString();
      if (update.consecutiveReviewCorrect >= 3) update.status = 'mastered';
    } else {
      update.consecutiveReviewCorrect = 0;
      update.currentIntervalIndex = 0;
      update.nextReviewAt = new Date(now.getTime() + 86400000).toISOString();
    }
    await db.collection('wrong_questions').doc(wrongId).update({ data: update });
    return { success: true, data: update };
  } catch (err) {
    return { success: false, errMsg: err.message };
  }
};

/** 获取错题统计 */
const getWrongStats = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  try {
    const now = new Date().toISOString();
    const [totalRes, dueRes, masteredRes] = await Promise.all([
      db.collection('wrong_questions').where({ userId: openid }).count(),
      db.collection('wrong_questions').where({ userId: openid, status: 'reviewing', nextReviewAt: db.command.lte(now) }).count(),
      db.collection('wrong_questions').where({ userId: openid, status: 'mastered' }).count(),
    ]);
    return { success: true, data: {
      totalWrong: totalRes.total, dueReview: dueRes.total, mastered: masteredRes.total,
    }};
  } catch (err) {
    return { success: false, errMsg: err.message };
  }
};

// ─── 题库分享 ───

/** 分享题库：存储题库数据并返回分享码 */
const shareBank = async (event) => {
  const { bank, questions } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, message: '无法获取用户身份' };
  }
  if (!bank || !questions) {
    return { success: false, message: '缺少题库数据' };
  }

  const shareCode = 'S' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

  try {
    await db.collection('sharedBanks').add({
      data: {
        shareCode,
        bank,
        questions,
        ownerId: openid,
        createdAt: new Date(),
        // 7天过期
        expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return { success: true, shareCode };
  } catch (e) {
    return { success: false, message: e.message };
  }
};

/** 通过分享码获取题库数据 */
const getSharedBank = async (event) => {
  const { shareCode } = event;
  if (!shareCode) {
    return { success: false, message: '缺少分享码' };
  }

  try {
    const res = await db.collection('sharedBanks')
      .where({ shareCode })
      .limit(1)
      .get();

    if (res.data.length === 0) {
      return { success: false, message: '分享已过期或不存在' };
    }

    const shared = res.data[0];

    // 过期校验：expireAt 字段存在且已过期则拒绝
    if (shared.expireAt) {
      var expireDate = new Date(shared.expireAt);
      if (!isNaN(expireDate.getTime()) && Date.now() > expireDate.getTime()) {
        return { success: false, message: '分享已过期' };
      }
    }

    return {
      success: true,
      data: {
        bank: shared.bank,
        questions: shared.questions,
      },
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
};

// ─── 真题模块（小程序端查询） ───

/** 获取真题分类列表 */
const getExamCategories = async () => {
  try {
    const list = (await db.collection('exam_categories')
      .orderBy('order', 'asc')
      .limit(50)
      .get()).data;
    return { success: true, data: list };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

/** 获取真题试卷列表（可选按分类过滤） */
const getExamBanks = async (event) => {
  const { examCategoryId } = event || {};
  try {
    const condition = { type: 'exam' };
    if (examCategoryId) condition.examCategoryId = examCategoryId;
    const list = (await db.collection('banks')
      .where(condition)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()).data;
    return { success: true, data: list };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

/** 获取题库下的所有题目 */
const getBankQuestions = async (event) => {
  const { bankId, condition } = event || {};
  if (!bankId) return { success: false, errMsg: '缺少题库ID' };
  try {
    var query = { bankId, status: 'active' };
    // 合并前端传入的筛选条件（knowledgePointId, questionClassId 等）
    if (condition) {
      if (condition.knowledgePointId) query.knowledgePointId = condition.knowledgePointId;
      if (condition.questionClassId) query.questionClassId = condition.questionClassId;
    }
    const list = (await db.collection('questions')
      .where(query)
      .limit(500)
      .get()).data;
    return { success: true, data: list };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// ─── 用户信息 ───

/** 获取用户资料（不存在则自动创建） */
const getUserProfile = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    const res = await db.collection('users').where({ openid }).limit(1).get();
    if (res.data.length > 0) {
      return { success: true, data: res.data[0] };
    }

    // 用户不存在，创建默认记录
    const defaultUser = {
      openid,
      nickname: '导题斩题小工具用户',
      avatarUrl: '',
      checkinStreak: 0,
      checkinHistory: [],
      totalQuestions: 0,
      totalCorrect: 0,
      totalSlash: 0,
      totalStudyTime: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createRes = await db.collection('users').add({ data: defaultUser });
    return { success: true, data: { ...defaultUser, _id: createRes._id } };
  } catch (err) {
    return { success: false, errMsg: err.message };
  }
};

/** 更新用户资料（仅更新传入的字段） */
const updateUserProfile = async (event) => {
  const { nickname, avatarUrl } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!nickname && !avatarUrl) {
    return { success: false, errMsg: '请提供要更新的昵称或头像' };
  }

  try {
    // 查找用户记录
    const res = await db.collection('users').where({ openid }).limit(1).get();
    if (res.data.length === 0) {
      return { success: false, errMsg: '用户不存在' };
    }

    const userId = res.data[0]._id;
    const updateData = { updatedAt: new Date().toISOString() };
    if (nickname !== undefined && nickname !== null) {
      updateData.nickname = nickname;
    }
    if (avatarUrl !== undefined && avatarUrl !== null) {
      updateData.avatarUrl = avatarUrl;
    }

    await db.collection('users').doc(userId).update({ data: updateData });

    // 返回更新后的完整用户数据
    const updated = await db.collection('users').doc(userId).get();
    return { success: true, data: updated.data };
  } catch (err) {
    return { success: false, errMsg: err.message };
  }
};

// ─── 用户数据同步（跨设备互通） ───

/**
 * 获取当前用户的所有自导入题库（跨设备同步）
 * 按 ownerId = openid 过滤，确保数据隔离
 */
const getMyBanks = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    const res = await db.collection('banks')
      .where({ ownerId: openid, type: 'custom' })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    return { success: true, data: res.data || [] };
  } catch (err) {
    return { success: false, errMsg: err.message, data: [] };
  }
};

/**
 * 获取用户完整云端数据
 * 返回 user_data 集合中该用户的文档（不存在返回 null）
 */
const getUserData = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    const res = await db.collection('user_data').where({ openid }).limit(1).get();
    if (res.data.length > 0) {
      return { success: true, data: res.data[0] };
    }
    return { success: true, data: null };
  } catch (err) {
    // 集合可能不存在，自动创建
    if (err.errCode === -502003 || (err.message && err.message.includes('collection'))) {
      try {
        await db.createCollection('user_data');
        return { success: true, data: null };
      } catch (e2) { /* ignore */ }
    }
    return { success: false, errMsg: err.message };
  }
};

/**
 * 保存部分数据到云端（增量更新指定 section）
 * @param {string} section - 'checkin' | 'studyStats' | 'practiceHistory' | 'slashProgress'
 * @param {*} data - 该 section 的完整数据
 */
const saveUserData = async (event) => {
  const { section, data } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!section) {
    return { success: false, errMsg: '缺少 section 参数' };
  }

  try {
    // 查找用户文档
    const res = await db.collection('user_data').where({ openid }).limit(1).get();

    if (res.data.length === 0) {
      // 文档不存在 → 创建新文档
      const newDoc = {
        openid,
        checkin: { dates: [] },
        studyStats: { weeklySeconds: { weekStart: '', seconds: 0 }, totalSeconds: 0, totalQuestions: 0, todayQuestions: { date: '', count: 0 } },
        practiceHistory: [],
        slashProgress: { classSlash: {}, questionSlash: {}, kpProgress: {} },
        wrongBook: [],
        errorTracking: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newDoc[section] = data;
      await db.collection('user_data').add({ data: newDoc });
      return { success: true };
    }

    // 文档存在 → 更新指定 section
    const docId = res.data[0]._id;
    const updateData = {
      updatedAt: new Date().toISOString()
    };
    updateData[section] = data;

    await db.collection('user_data').doc(docId).update({ data: updateData });
    return { success: true };
  } catch (err) {
    return { success: false, errMsg: err.message };
  }
};

/**
 * 首次登录迁移本地数据到云端
 * 策略：云端有数据 → 云端优先，合并本地（取较大值）；云端无数据 → 直接写入
 * @param {Object} localData - { checkin, studyStats, practiceHistory, slashProgress }
 */
const migrateLocalData = async (event) => {
  const { localData } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!localData) {
    return { success: false, errMsg: '缺少 localData' };
  }

  try {
    const res = await db.collection('user_data').where({ openid }).limit(1).get();

    if (res.data.length === 0) {
      // 云端无数据 → 直接写入本地数据
      const newDoc = {
        openid,
        checkin: localData.checkin || { dates: [] },
        studyStats: localData.studyStats || { weeklySeconds: { weekStart: '', seconds: 0 }, totalSeconds: 0, totalQuestions: 0, todayQuestions: { date: '', count: 0 } },
        practiceHistory: localData.practiceHistory || [],
        slashProgress: localData.slashProgress || { classSlash: {}, questionSlash: {}, kpProgress: {} },
        wrongBook: localData.wrongBook || [],
        errorTracking: localData.errorTracking || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('user_data').add({ data: newDoc });
      return { success: true, data: newDoc };
    }

    // 云端有数据 → 合并（取较大值/并集）
    const existing = res.data[0];
    const docId = existing._id;
    const merged = { ...existing };

    // 打卡：日期取并集
    if (localData.checkin && localData.checkin.dates) {
      const cloudDates = (existing.checkin && existing.checkin.dates) || [];
      const dateSet = new Set([...cloudDates, ...localData.checkin.dates]);
      merged.checkin = { dates: Array.from(dateSet).sort() };
    }

    // 学习统计：取较大值
    if (localData.studyStats) {
      const ls = localData.studyStats;
      const es = existing.studyStats || {};
      merged.studyStats = {
        totalSeconds: Math.max(ls.totalSeconds || 0, es.totalSeconds || 0),
        totalQuestions: Math.max(ls.totalQuestions || 0, es.totalQuestions || 0),
        weeklySeconds: (ls.weeklySeconds && ls.weeklySeconds.seconds > ((es.weeklySeconds && es.weeklySeconds.seconds) || 0))
          ? ls.weeklySeconds : (es.weeklySeconds || ls.weeklySeconds),
        todayQuestions: (ls.todayQuestions && ls.todayQuestions.count > ((es.todayQuestions && es.todayQuestions.count) || 0))
          ? ls.todayQuestions : (es.todayQuestions || ls.todayQuestions),
      };
    }

    // 练习历史：以本地为主合并（本地有的更新云端，云端有的保留）
    if (localData.practiceHistory) {
      const cloudHist = existing.practiceHistory || [];
      const localHist = localData.practiceHistory;
      const map = {};
      cloudHist.forEach(function (r) { map[r.bankId] = r; });
      localHist.forEach(function (r) {
        if (map[r.bankId]) {
          // 合并：取较新的记录
          var existingRec = map[r.bankId];
          if (new Date(r.lastTimeISO || 0) > new Date(existingRec.lastTimeISO || 0)) {
            map[r.bankId] = r;
          }
        } else {
          map[r.bankId] = r;
        }
      });
      merged.practiceHistory = Object.values(map).sort(function (a, b) {
        return new Date(b.lastTimeISO || 0) - new Date(a.lastTimeISO || 0);
      }).slice(0, 50);
    }

    // 斩题进度：合并（本地 + 云端，冲突取已斩状态）
    if (localData.slashProgress) {
      var lp = localData.slashProgress;
      var ep = existing.slashProgress || {};
      merged.slashProgress = {
        classSlash: _mergeSlashProgress(ep.classSlash || {}, lp.classSlash || {}),
        questionSlash: _mergeSlashProgress(ep.questionSlash || {}, lp.questionSlash || {}),
        kpProgress: _mergeSlashProgress(ep.kpProgress || {}, lp.kpProgress || {}),
      };
    }

    // 错题本：合并去重（以 questionId 为唯一键，冲突取较新的记录）
    if (localData.wrongBook) {
      var cloudWrong = existing.wrongBook || [];
      var localWrong = localData.wrongBook;
      var wrongMap = {};
      cloudWrong.forEach(function (w) { wrongMap[w.questionId] = w; });
      localWrong.forEach(function (w) {
        var existingW = wrongMap[w.questionId];
        if (!existingW) {
          wrongMap[w.questionId] = w;
        } else {
          // 取较新的记录
          var existingDate = new Date(existingW.updatedAt || 0);
          var localDate = new Date(w.updatedAt || 0);
          if (localDate > existingDate) {
            wrongMap[w.questionId] = w;
          }
        }
      });
      merged.wrongBook = Object.values(wrongMap);
    }

    // 错题追踪：合并取较大值
    if (localData.errorTracking) {
      var cloudTracking = existing.errorTracking || {};
      var localTracking = localData.errorTracking;
      var trackingKeys = new Set(Object.keys(cloudTracking).concat(Object.keys(localTracking)));
      var mergedTracking = {};
      trackingKeys.forEach(function (key) {
        var cv = cloudTracking[key];
        var lv = localTracking[key];
        if (!cv) { mergedTracking[key] = lv; }
        else if (!lv) { mergedTracking[key] = cv; }
        else {
          // 合并：取 totalErrors 较大值
          mergedTracking[key] = (cv.totalErrors || 0) >= (lv.totalErrors || 0) ? cv : lv;
        }
      });
      merged.errorTracking = mergedTracking;
    }

    merged.updatedAt = new Date().toISOString();
    await db.collection('user_data').doc(docId).update({ data: merged });
    return { success: true, data: merged };
  } catch (err) {
    return { success: false, errMsg: err.message };
  }
};

/**
 * 合并斩题进度：已斩状态取并集（任一方已斩即视为已斩），答题数取较大值
 */
function _mergeSlashProgress(cloudObj, localObj) {
  var merged = { ...cloudObj };
  var keys = Object.keys(localObj);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var localEntry = localObj[key];
    var cloudEntry = merged[key];
    if (!cloudEntry) {
      merged[key] = localEntry;
    } else {
      // 已斩取或
      merged[key] = {
        ...cloudEntry,
        slashed: cloudEntry.slashed || localEntry.slashed,
        slashedAt: cloudEntry.slashedAt || localEntry.slashedAt,
        answered: Math.max(cloudEntry.answered || 0, localEntry.answered || 0),
        correct: Math.max(cloudEntry.correct || 0, localEntry.correct || 0),
        recentCorrect: (localEntry.recentCorrect && localEntry.recentCorrect.length > 0)
          ? localEntry.recentCorrect : (cloudEntry.recentCorrect || []),
        name: localEntry.name || cloudEntry.name || '',
        bankId: localEntry.bankId || cloudEntry.bankId || '',
        stem: localEntry.stem || cloudEntry.stem || '',
      };
    }
  }
  return merged;
}

// ─── 云函数入口 ───
exports.main = async (event, context) => {
  switch (event.type) {
    case 'getOpenId':
      return await getOpenId();
    case 'getMiniProgramCode':
      return await getMiniProgramCode();
    case 'createCollection':
      return await createCollection();
    // 题库导入
    case 'importBank':
      return await importBank(event);
    case 'deleteBank':
      return await deleteBank(event);
    case 'importBankByExcel':
      return await importBankByExcel(event);
    case 'downloadImportTemplate':
      return await downloadImportTemplate();
    case 'parseOCR':
      return await parseOCR(event);
    case 'parseWordDocument':
      return await parseWordDocument(event);
    case 'importBankByWord':
      return await importBankByWord(event);
    // 问题反馈
    case 'sendFeedback':
      return await sendFeedback(event);
    // 错题本（本地→云端迁移预备）
    case 'addWrongQuestion':
      return await addWrongQuestion(event);
    case 'getWrongReviewList':
      return await getWrongReviewList(event);
    case 'reviewWrongAnswer':
      return await reviewWrongAnswer(event);
    case 'getWrongStats':
      return await getWrongStats(event);
    // 题库分享
    case 'shareBank':
      return await shareBank(event);
    case 'getSharedBank':
      return await getSharedBank(event);
    // 用户信息
    case 'getUserProfile':
      return await getUserProfile();
    case 'updateUserProfile':
      return await updateUserProfile(event);
    // 用户数据同步（跨设备互通）
    case 'getUserData':
      return await getUserData();
    case 'saveUserData':
      return await saveUserData(event);
    case 'migrateLocalData':
      return await migrateLocalData(event);
    case 'getMyBanks':
      return await getMyBanks();
    // 真题模块
    case 'getExamCategories':
      return await getExamCategories();
    case 'getExamBanks':
      return await getExamBanks(event);
    case 'getBankQuestions':
      return await getBankQuestions(event);
  }
};
