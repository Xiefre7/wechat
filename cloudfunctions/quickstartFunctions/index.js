const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
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

    // 2. 批量写入题目（分批 100 条/批，微信云数据库单次限制）
    const BATCH_SIZE = 100;
    let insertedCount = 0;

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = questions.slice(i, i + BATCH_SIZE).map((q) => ({
        bankId,
        knowledgePointId: '', // 自导入无知识点
        type: q.type || 'single_choice',
        difficulty: 2,
        content: {
          stem: q.stem || '',
          options: q.options || [],
          answer: q.answer || '',
          explanation: q.explanation || '',
        },
        tags: ['自导入'],
        status: 'active',
        createdAt: new Date().toISOString(),
      }));

      // 逐条添加（云数据库批量add限制）
      for (const item of batch) {
        await db.collection('questions').add({ data: item });
        insertedCount++;
      }
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
      return {
        success: false,
        errMsg: 'Word解析组件未就绪，请运行 npm install 安装 mammoth 依赖。错误: ' + e.message,
      };
    }

    // 提取纯文本
    const extractResult = await mammoth.extractRawText({ buffer: fileBuffer });
    const rawText = extractResult.value;

    if (!rawText || !rawText.trim()) {
      return { success: false, errMsg: 'Word 文档中未提取到文字内容，请检查文件' };
    }

    // 用规则引擎结构化（复用 OCR 的解析逻辑）
    const questions = parseOcrText(rawText);

    if (questions.length === 0) {
      return {
        success: false,
        errMsg: '未能从文档中识别到题目。请确保文档格式为：题号. 题干 + 选项(A/B/C/D) + 答案',
        rawText: rawText.substring(0, 200),
      };
    }

    // 截断过长文本
    const warnings = [];
    if (rawText.length > 50000) {
      warnings.push('文档内容较长，仅解析了前50000字符');
    }

    return {
      success: true,
      rawText: rawText.substring(0, 500),
      questions,
      questionCount: questions.length,
      warnings,
    };
  } catch (err) {
    console.error('Word解析失败:', err);
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
function parseOcrText(rawText) {
  if (!rawText || !rawText.trim()) return [];

  // 按题号切分
  const lines = rawText.split(/\n|\r\n/);
  const questions = [];
  let current = null;

  const OPT_RE = /^([A-Fa-f])[\.\、\)）．\s]+(.+)/;
  const ANSWER_RE = /^(?:答案|参考答案|正确答案)\s*[：:：]\s*(.+)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 检测新题开始
    const qStartMatch = trimmed.match(/^(\d{1,4})[\.\、\)）]/);
    if (qStartMatch) {
      if (current && current.stem) {
        questions.push(current);
      }
      current = {
        type: 'single_choice',
        stem: trimmed.replace(/^\d+[\.\、\)）]\s*/, ''),
        options: [],
        answer: '',
        explanation: '',
      };
      continue;
    }

    if (!current) {
      current = {
        type: 'single_choice',
        stem: trimmed,
        options: [],
        answer: '',
        explanation: '',
      };
      continue;
    }

    // 选项行
    const optMatch = trimmed.match(OPT_RE);
    if (optMatch) {
      current.options.push({
        key: optMatch[1].toUpperCase(),
        text: optMatch[2].trim(),
      });
      continue;
    }

    // 答案行
    const answerMatch = trimmed.match(ANSWER_RE);
    if (answerMatch) {
      current.answer = answerMatch[1].trim();
      continue;
    }

    // 如果 stem 已有内容且非选项/答案，追加到 stem
    if (!current.stem.includes(trimmed)) {
      current.stem += '\n' + trimmed;
    }
  }

  // 最后一道
  if (current && current.stem) {
    questions.push(current);
  }

  // 推断题型
  return questions.map((q) => {
    let type = 'single_choice';
    if (q.options.length === 0) type = 'short_answer';
    else if (
      q.options.length === 2 &&
      q.options.every((o) => /^(对|错|正确|错误|√|×)/.test(o.text))
    ) {
      type = 'true_false';
    }
    return { ...q, type };
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
      <h3>考斩过 - 用户反馈</h3>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td style="padding:8px;border:1px solid #e0e0e0;background:#f5f5f5;width:80px;">反馈类型</td><td style="padding:8px;border:1px solid #e0e0e0;">${typeLabel}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e0e0e0;background:#f5f5f5;">用户OpenID</td><td style="padding:8px;border:1px solid #e0e0e0;">${openid}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e0e0e0;background:#f5f5f5;">联系方式</td><td style="padding:8px;border:1px solid #e0e0e0;">${contact || '未填写'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e0e0e0;background:#f5f5f5;">反馈时间</td><td style="padding:8px;border:1px solid #e0e0e0;">${createdAt}</td></tr>
      </table>
      <h4>详细描述：</h4>
      <p style="white-space:pre-wrap;background:#f9f9f9;padding:12px;border-radius:4px;">${content.trim()}</p>
    `;

    await transporter.sendMail({
      from: `考斩过反馈 <${EMAIL_CONFIG.auth.user}>`,
      to: EMAIL_CONFIG.to,
      subject: `[考斩过反馈] ${typeLabel} - ${createdAt.slice(0, 10)}`,
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
  const { bankId } = event || {};
  if (!bankId) return { success: false, errMsg: '缺少题库ID' };
  try {
    const list = (await db.collection('questions')
      .where({ bankId, status: 'active' })
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
      nickname: '考斩过用户',
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

// ─── 云函数入口 ───
exports.main = async (event, context) => {
  switch (event.type) {
    case 'getOpenId':
      return await getOpenId();
    case 'getMiniProgramCode':
      return await getMiniProgramCode();
    case 'createCollection':
      return await createCollection();
    case 'selectRecord':
      return await selectRecord();
    case 'updateRecord':
      return await updateRecord(event);
    case 'insertRecord':
      return await insertRecord(event);
    case 'deleteRecord':
      return await deleteRecord(event);
    // 题库导入
    case 'importBank':
      return await importBank(event);
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
    // 真题模块
    case 'getExamCategories':
      return await getExamCategories();
    case 'getExamBanks':
      return await getExamBanks(event);
    case 'getBankQuestions':
      return await getBankQuestions(event);
  }
};
