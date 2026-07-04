const wrongBook = require('../../utils/wrongBook');
const slashManager = require('../../utils/slashManager');
const imageUploader = require('../../utils/imageUploader');
const studyTimeManager = require('../../utils/studyTimeManager');
const practiceHistoryManager = require('../../utils/practiceHistoryManager');
const questionData = require('../../utils/questionData');
const progressManager = require('../../utils/progressManager');

/** 斩题阈值：近10题正确率达到此值触发 */
const SLASH_THRESHOLD = 0.8;

/** 题型中文名 */
const TYPE_LABELS = {
  single_choice: '单选题',
  multi_choice: '多选题',
  true_false: '判断题',
  fill_blank: '填空题',
  short_answer: '简答题',
};

Page({
  data: {
    isDark: false,
    /* 会话信息 */
    bankName: '',
    bankType: '',
    bankId: '',
    bankCategory: '',
    knowledgePointName: '',
    questions: [],
    totalQuestions: 0,
    currentIndex: 0,
    mode: 'practice',

    /* 刷题数据 */
    currentQuestion: null,
    processedOptions: [],
    questionTypeLabel: '',
    questionNumber: 1,

    /* 答题状态 */
    selectedAnswer: '',
    selectedAnswers: {},
    userInput: '',
    fillBlankInputs: [],
    fillBlankResults: [],
    submitted: false,
    isCorrect: null,
    showExplanation: false,

    /* 控制 */
    autoNext: true,
    vibration: true,

    /* 进度 */
    answeredCount: 0,
    correctCount: 0,

    /* 计时 */
    questionStartTime: 0,
    sessionStartTime: 0,
    questionTimeSpent: 0,

    /* 斩题浮动按钮 */
    showSlashButton: false,
    questionClassId: '',
    questionClassName: '',
    allClassIds: [],
    classAnsweredCount: 0,
    classCorrectCount: 0,

    /* 简答题自判 */
    isShortAnswer: false,
    shortAnswerJudged: false,

    /* 多选题提示 */
    isMultiChoice: false,

    /* 完成 */
    finished: false,

    /* 背题模式 */
    isMemorizeMode: false,
    showAnswer: false,

    /* 滚动到顶部 */
    scrollTop: 0,

    /* 错题本 */
    inWrongBook: false,
    wrongBookAdding: false,
  },

  onLoad() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });

    const session = wx.getStorageSync('practiceSession');
    if (!session || !session.questions || session.questions.length === 0) {
      wx.showToast({ title: '未找到练习数据', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }

    const totalQuestions = session.questions.length;
    // 进度记忆：从上次退出的位置继续（仅自导入题库）
    var startIndex = 0;
    if (session.bankType === 'custom' && session.bankId) {
      startIndex = progressManager.getProgress(session.bankId, 'practice', totalQuestions);
      if (startIndex > 0) {
        wx.showToast({
          title: '从第' + (startIndex + 1) + '题继续',
          icon: 'none',
          duration: 1500,
        });
      }
    }
    const startQuestion = this.formatQuestion(session.questions[startIndex]);

    this.setData({
      bankName: session.bankName,
      bankType: session.bankType,
      bankId: session.bankId || '',
      bankCategory: session.bankCategory || '',
      knowledgePointName: session.knowledgePointName || '',
      questions: session.questions,
      totalQuestions,
      currentIndex: startIndex,
      currentQuestion: startQuestion,
      processedOptions: this.buildOptionClasses(startQuestion, {
        isMemorizeMode: false,
        isMultiChoice: startQuestion.isMulti || false,
        isShortAnswer: startQuestion.isShortAnswer || false,
      }),
      questionTypeLabel: TYPE_LABELS[startQuestion.type] || '未知题型',
      questionNumber: startIndex + 1,
      sessionStartTime: Date.now(),
      questionStartTime: Date.now(),
      questionClassId: session.questionClassId || '',
      questionClassName: session.questionClassName || '',
      allClassIds: session.allClassIds || [],
      fillBlankInputs: startQuestion.isFillBlank
        ? new Array(startQuestion.content.fillBlankCount || 1).fill('')
        : [],
    });

    this._sessionAnswers = [];

    this.updateWrongBookStatus();
  },

  onShow() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
  },

  onHide() {
    // 页面隐藏（包括滑出/切换到其他页面）时自动保存进度
    this._saveCurrentProgress();
  },

  onUnload() {
    // 页面卸载时自动保存进度
    this._saveCurrentProgress();
  },

  /* ─── 保存当前答题进度（仅自导入题库）─── */
  _saveCurrentProgress() {
    // 完成答题后不再保存进度（避免覆盖已清除的进度）
    if (this._sessionFinished) return;
    if (this.data.bankType === 'custom' && this.data.bankId && this.data.totalQuestions > 0) {
      progressManager.saveProgress(
        this.data.bankId,
        'practice',
        this.data.currentIndex,
        this.data.totalQuestions
      );
    }
  },

  /* ─── 格式化题目 ─── */
  formatQuestion(q) {
    // 统一两种数据结构：官方题库用 q.content.*，自导入题库用 q.* 扁平结构
    const content = q.content || {
      stem: q.stem || '',
      options: q.options || [],
      answer: q.answer || '',
      explanation: q.explanation || '',
      stemImages: q.stemImages || [],
      explanationImages: q.explanationImages || [],
      fillBlankCount: q.fillBlankCount || 0,
      fillBlankAnswers: q.fillBlankAnswers || [],
    };

    // 兼容：content 存在但缺少 stemImages/explanationImages 时，回退到顶层
    var stemImages = content.stemImages || q.stemImages || [];
    var explanationImages = content.explanationImages || q.explanationImages || [];

    // 填空题：确保有空格数量和答案数组（兼容旧数据）
    var fbCount = content.fillBlankCount || q.fillBlankCount || 0;
    var fbAnswers = (content.fillBlankAnswers || q.fillBlankAnswers || []).slice();
    if (q.type === 'fill_blank') {
      if (fbCount === 0) {
        // 兼容旧数据：从 answer 字段按 | 拆分推断
        var rawAns = (content.answer || '').trim();
        if (rawAns) {
          fbAnswers = rawAns.split(/[|｜]/).map(function(s) { return s.trim(); });
          fbCount = fbAnswers.length;
        } else {
          fbCount = 1;
          fbAnswers = [''];
        }
      } else if (fbAnswers.length === 0) {
        var rawAns2 = (content.answer || '').trim();
        if (rawAns2) {
          fbAnswers = rawAns2.split(/[|｜]/).map(function(s) { return s.trim(); });
        } else {
          fbAnswers = new Array(fbCount).fill('');
        }
      }
    }

    const hasStemImages = (stemImages && stemImages.length > 0);
    const hasExplanationImages = (explanationImages && explanationImages.length > 0);

    return {
      ...q,
      content: {
        ...content,
        stemImages: stemImages,
        explanationImages: explanationImages,
        fillBlankCount: fbCount,
        fillBlankAnswers: fbAnswers,
        options: (content.options || []).map(function(opt) {
          return { key: opt.key, text: opt.text || '', image: opt.image || '' };
        }),
      },
      // 自导入题目可能没有 _id，生成临时 ID 用于错题本等场景
      _id: q._id || ('tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
      displayType: TYPE_LABELS[q.type] || '未知',
      hasOptions:
        q.type === 'single_choice' ||
        q.type === 'multi_choice' ||
        q.type === 'true_false',
      isMulti: q.type === 'multi_choice',
      isFillBlank: q.type === 'fill_blank',
      isShortAnswer: q.type === 'short_answer',
      isTrueFalse: q.type === 'true_false',
      hasStemImages: hasStemImages,
      hasExplanationImages: hasExplanationImages,
    };
  },

  /* ─── 解析正确答案的选项key列表 ─── */
  parseCorrectKeys(answerStr, options) {
    if (!answerStr) return [];
    var trimmed = answerStr.trim();

    // 1. 标准逗号分隔: "A,C" → ["A","C"]
    var keys = trimmed.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);

    // 2. 如果只有一个结果且长度>1(如"AC"、"ABC")，尝试按单字符拆分
    if (keys.length === 1 && keys[0].length > 1) {
      var singleChars = keys[0].split('').filter(function (c) { return /[A-Za-z]/.test(c); });
      // 验证拆分后的字符是否都是有效选项key
      var validKeys = (options || []).map(function (o) { return o.key; });
      var allValid = singleChars.every(function (c) { return validKeys.indexOf(c) !== -1; });
      if (allValid && singleChars.length > 1) {
        return singleChars;
      }
    }

    return keys;
  },

  /* ─── 预处理选项 class ─── */
  buildOptionClasses(question, overrides) {
    const q = question || this.data.currentQuestion;
    const state = overrides ? { ...this.data, ...overrides } : this.data;
    const { submitted, isMemorizeMode, isMultiChoice, selectedAnswers, selectedAnswer, isCorrect, isShortAnswer } = state;
    if (!q || !q.content || !q.content.options) return [];

    // 将答案按逗号拆成数组，兼容多选（"A,C" → ["A","C"]，"A" → ["A"]）
    // 也兼容无分隔符的答案（"AC" → ["A","C"]）
    var correctKeys = this.parseCorrectKeys(q.content.answer, q.content.options);

    return q.content.options.map((opt) => {
      const isSelected = !submitted && !isMemorizeMode &&
        (isMultiChoice ? selectedAnswers[opt.key] : selectedAnswer === opt.key);
      const isCorrectOpt = (submitted || isMemorizeMode) && correctKeys.indexOf(opt.key) !== -1;
      const isWrongOpt = submitted && !isShortAnswer && isCorrect === false &&
        (isMultiChoice ? selectedAnswers[opt.key] : selectedAnswer === opt.key);

      let cls = '';
      if (isSelected) cls += 'selected';
      if (isCorrectOpt) cls += ' correct';
      if (isWrongOpt) cls += ' wrong';

      return {
        key: opt.key, text: opt.text || '', image: opt.image || '',
        _cls: cls.trim(),
        _isCorrect: isCorrectOpt,
      };
    });
  },

  /* ─── 刷新选项状态 ─── */
  refreshOptions(overrides) {
    this.setData({ processedOptions: this.buildOptionClasses(null, overrides) });
  },

  /* ─── 选项选择 ─── */
  selectOption(e) {
    if (this.data.submitted || this.data.isMemorizeMode) return;
    const { key } = e.currentTarget.dataset;

    if (this.data.isMultiChoice) {
      // 多选：切换
      const selectedAnswers = { ...this.data.selectedAnswers };
      if (selectedAnswers[key]) {
        delete selectedAnswers[key];
      } else {
        selectedAnswers[key] = true;
      }
      const data = { selectedAnswers };
      this.setData(data);
      this.refreshOptions({ selectedAnswers });
    } else {
      // 单选/判断：替换
      const data = { selectedAnswer: key };
      this.setData(data);
      this.refreshOptions({ selectedAnswer: key });
    }
  },

  /* ─── 输入变更 ─── */
  onInputChange(e) {
    if (this.data.submitted) return;
    this.setData({ userInput: e.detail.value });
  },

  /* ─── 填空题分空输入变更 ─── */
  onFillBlankInput(e) {
    if (this.data.submitted) return;
    const { blankIdx } = e.currentTarget.dataset;
    var inputs = this.data.fillBlankInputs.slice();
    inputs[blankIdx] = e.detail.value;
    this.setData({ fillBlankInputs: inputs });
  },

  /* ─── 提交答案 ─── */
  submitAnswer() {
    if (this.data.submitted) return;

    const { currentQuestion, selectedAnswer, selectedAnswers, userInput, fillBlankInputs, isShortAnswer } =
      this.data;

    // 校验是否已作答
    const hasAnswer = isShortAnswer
      ? userInput.trim().length > 0
      : currentQuestion.isFillBlank
      ? fillBlankInputs.some(function(s) { return s && s.trim().length > 0; })
      : currentQuestion.isMulti
      ? Object.keys(selectedAnswers).length > 0
      : currentQuestion.hasOptions
      ? selectedAnswer
      : userInput.trim().length > 0;

    if (!hasAnswer) {
      wx.showToast({ title: '请先作答', icon: 'none' });
      return;
    }

    // 累加答题计数
    studyTimeManager.recordQuestionAnswered();

    // 计算耗时
    const timeSpent = Math.round((Date.now() - this.data.questionStartTime) / 1000);

    // 判断对错
    let isCorrect = false;
    let userAnswerStr = '';
    if (isShortAnswer) {
      // 简答题：显示参考答案，用户自判
      isCorrect = null;
      userAnswerStr = userInput.trim();
    } else if (currentQuestion.isFillBlank) {
      // 填空题：逐空精确匹配（不区分大小写）
      var fbAnswers = currentQuestion.content.fillBlankAnswers || [];
      var fbCount = currentQuestion.content.fillBlankCount || fbAnswers.length || 1;
      var userParts = fillBlankInputs.map(function(s) { return (s || '').trim(); });
      var correctParts = fbAnswers.map(function(s) { return (s || '').trim(); });
      // 补齐 correctParts 长度
      while (correctParts.length < fbCount) correctParts.push('');
      isCorrect = true;
      var fbResults = [];
      for (var i = 0; i < fbCount; i++) {
        var correct = (userParts[i] || '').toLowerCase() === (correctParts[i] || '').toLowerCase();
        fbResults.push(correct);
        if (!correct) isCorrect = false;
      }
      this.setData({ fillBlankResults: fbResults });
      userAnswerStr = userParts.join('|');
    } else if (currentQuestion.isMulti) {
      // 多选题：排序后比较（支持用户任意选择顺序，如 BCD/DCB/BDC 均判正确）
      const userKeys = Object.keys(selectedAnswers).sort().join(',');
      const correctKeys = this.parseCorrectKeys(currentQuestion.content.answer, currentQuestion.content.options)
        .map(function (k) { return k.toUpperCase(); })
        .sort()
        .join(',');
      isCorrect = userKeys === correctKeys;
      userAnswerStr = userKeys;
    } else {
      // 单选/判断：精确匹配
      isCorrect = selectedAnswer === currentQuestion.content.answer;
      userAnswerStr = selectedAnswer;
    }

    // 震动反馈
    if (this.data.vibration) {
      if (isCorrect === true) {
        wx.vibrateShort({ type: 'light' });
      } else if (isCorrect === false) {
        wx.vibrateShort({ type: 'heavy' });
      }
    }

    // 记录答案
    const answerRecord = {
      questionId: currentQuestion._id,
      knowledgePointId: currentQuestion.knowledgePointId || '',
      userAnswer: userAnswerStr,
      isCorrect,
      timeSpent,
    };
    this._sessionAnswers.push(answerRecord);

    const answeredCount = this._sessionAnswers.length;
    const correctCount = this._sessionAnswers.filter((a) => a.isCorrect === true).length;

    const stateUpdates = {
      submitted: true,
      isCorrect,
      showExplanation: true,
      shortAnswerJudged: isShortAnswer ? false : null,
      questionTimeSpent: timeSpent,
      answeredCount,
      correctCount,
    };

    this.setData({
      ...stateUpdates,
      processedOptions: this.buildOptionClasses(null, stateUpdates),
    });

    // 斩题判定：按题类追踪
    if (isCorrect !== null && this.data.questionClassId) {
      slashManager.trackClassAnswer(this.data.questionClassId, isCorrect, this.data.questionClassName);
    }

    // 错题自动收录
    if (isCorrect === false) {
      this.tryAutoCollect();
    }

    // 更新错题本状态
    this.updateWrongBookStatus();

    // 检查是否触发斩题按钮
    if (isCorrect !== null) {
      this.checkSlashReady();
    }
  },

  /* ─── 填空题对错判断 ─── */
  checkFillBlank(userAnswer, correctAnswer) {
    // 支持多个填空（用 | 分隔），精确匹配（trim + 不区分大小写）
    const userParts = userAnswer.split('|').map((s) => s.trim().toLowerCase());
    const correctParts = correctAnswer.split('|').map((s) => s.trim().toLowerCase());

    // 单填空：精确匹配
    if (correctParts.length === 1 && userParts.length === 1) {
      return userParts[0] === correctParts[0];
    }
    // 多个填空逐一精确比对
    if (userParts.length !== correctParts.length) return false;
    for (let i = 0; i < correctParts.length; i++) {
      if ((userParts[i] || '') !== correctParts[i]) {
        return false;
      }
    }
    return true;
  },

  /* ─── 斩题触发检查 ─── */
  checkSlashReady() {
    const { questionClassId, bankType, currentQuestion } = this.data;

    if (!questionClassId) {
      // 自导入题库：按单题斩（保持旧逻辑）
      if (bankType === 'custom' && currentQuestion) {
        const result = slashManager.trackCustomAnswer(
          currentQuestion._id, this.data.isCorrect,
          currentQuestion.bankId || '',
          currentQuestion.content ? currentQuestion.content.stem : (currentQuestion.stem || '')
        );
        // 自导入仍用弹窗（10题80%触发，频率低可接受）
        if (result && result.triggered) {
          const stem = (currentQuestion.content ? currentQuestion.content.stem : (currentQuestion.stem || '')).slice(0, 30);
          wx.showModal({
            title: '触发斩题',
            content: '该题近10次正确率达 ' + result.correctRate + '%，要斩掉吗？',
            confirmText: '斩掉',
            cancelText: '暂不',
            success: (res) => {
              if (res.confirm) {
                slashManager.executeCustomSlash(currentQuestion._id);
                wx.showToast({ title: '已斩', icon: 'success' });
              }
            },
          });
        }
      }
      return;
    }

    // 官方题库：按题类斩
    const state = slashManager.getClassSessionState(questionClassId);
    if (state.readyToSlash) {
      this.setData({
        showSlashButton: true,
        classAnsweredCount: state.answered,
        classCorrectCount: state.correct,
      });
    }
  },

  /* ─── 斩题按钮点击 ─── */
  onSlashButtonTap() {
    const { questionClassId, questionClassName } = this.data;
    if (!questionClassId) return;

    // 执行斩题
    slashManager.executeClassSlash(questionClassId);
    wx.vibrateShort({ type: 'heavy' });

    this.setData({ showSlashButton: false });

    wx.showToast({
      title: '已斩「' + (questionClassName || '该题类') + '」',
      icon: 'success',
      duration: 1500,
    });

    // 延迟后自动切换到下一个题类
    setTimeout(() => this.switchToNextClass(), 800);
  },

  /* ─── 切换到下一个随机题类 ─── */
  switchToNextClass() {
    const { allClassIds, questionClassId, bankId } = this.data;

    // 获取未斩题类
    const unslashed = allClassIds.filter((id) => !slashManager.isClassSlashed(id));

    if (unslashed.length === 0) {
      wx.showModal({
        title: '全部完成',
        content: '该知识点下所有题类都已完成！\n\n斩掉的题类将在7天后自动复活。',
        showCancel: false,
        confirmText: '返回',
        success: () => wx.navigateBack(),
      });
      return;
    }

    // 加权随机选下一个题类：距离上次出现越久权重越高
    const candidates = unslashed.filter((id) => id !== questionClassId);
    const pool = candidates.length > 0 ? candidates : unslashed;

    // 计算权重：基于上次出现时间，越久权重越高
    const now = Date.now();
    let totalWeight = 0;
    const weighted = pool.map((id) => {
      const state = slashManager.getClassSessionState(id);
      const lastSeen = state.lastSeenAt || 0;
      const elapsed = now - lastSeen;
      // 权重 = 1 + elapsed / 3600000（每小时增加1权重，最低权重1）
      const weight = 1 + elapsed / 3600000;
      totalWeight += weight;
      return { id, weight };
    });

    // 加权随机选择
    let rand = Math.random() * totalWeight;
    let nextClassId = weighted[0].id;
    for (const item of weighted) {
      rand -= item.weight;
      if (rand <= 0) {
        nextClassId = item.id;
        break;
      }
    }

    // 从云端/本地数据层获取该题类的题目
    wx.showLoading({ title: '加载中...', mask: true });
    questionData.findQuestionsByBank(bankId, { questionClassId: nextClassId }).then((questions) => {
      wx.hideLoading();

      if (!questions || questions.length === 0) {
        wx.showToast({ title: '该题类暂无题目', icon: 'none' });
        return;
      }

      // 随机打乱
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }

      // 获取题类名称
      const qc = questionData.findQuestionClassById(nextClassId);
      const className = qc ? qc.name : '';

      // 重置刷题状态
      const firstQuestion = this.formatQuestion(questions[0]);
      this.setData({
        questions,
        totalQuestions: questions.length,
        currentIndex: 0,
        currentQuestion: firstQuestion,
        processedOptions: this.buildOptionClasses(firstQuestion, { submitted: false, isCorrect: null, selectedAnswer: '', selectedAnswers: {}, isShortAnswer: firstQuestion.isShortAnswer || false, isMultiChoice: firstQuestion.isMulti || false }),
        questionTypeLabel: TYPE_LABELS[firstQuestion.type] || '未知题型',
        questionNumber: 1,
        selectedAnswer: '',
        selectedAnswers: {},
        userInput: '',
        fillBlankInputs: firstQuestion.isFillBlank
          ? new Array(firstQuestion.content.fillBlankCount || 1).fill('')
          : [],
        fillBlankResults: [],
        submitted: false,
        isCorrect: null,
        showExplanation: false,
        isShortAnswer: firstQuestion.isShortAnswer || false,
        isMultiChoice: firstQuestion.isMulti || false,
        shortAnswerJudged: false,
        questionStartTime: Date.now(),
        questionTimeSpent: 0,
        scrollTop: 0,
        showSlashButton: false,
        questionClassId: nextClassId,
        questionClassName: className,
        classAnsweredCount: 0,
        classCorrectCount: 0,
      });

      this._sessionAnswers = [];
      this.updateWrongBookStatus();

      wx.showToast({
        title: '下一题类：' + (className || '新题类'),
        icon: 'none',
        duration: 2000,
      });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '加载题目失败', icon: 'none' });
    });
  },

  /* ─── 简答题自判 ─── */
  judgeShortAnswer(e) {
    const { correct } = e.currentTarget.dataset;
    const isCorrect = correct === 'true';

    // 更新答案记录
    if (this._sessionAnswers.length > 0) {
      this._sessionAnswers[this._sessionAnswers.length - 1].isCorrect = isCorrect;
    }

    const correctCount = this._sessionAnswers.filter((a) => a.isCorrect === true).length;

    const judgeUpdates = {
      isCorrect,
      shortAnswerJudged: true,
      correctCount,
    };

    this.setData({
      ...judgeUpdates,
      processedOptions: this.buildOptionClasses(null, judgeUpdates),
    });

    // 斩题判定：按题类追踪
    if (this.data.questionClassId) {
      slashManager.trackClassAnswer(this.data.questionClassId, isCorrect, this.data.questionClassName);
    }

    // 错题自动收录
    if (isCorrect === false) {
      this.tryAutoCollect();
    }

    // 更新错题本状态
    this.updateWrongBookStatus();

    // 检查是否触发斩题按钮
    this.checkSlashReady();

    // 震动
    if (this.data.vibration) {
      wx.vibrateShort({ type: isCorrect ? 'light' : 'heavy' });
    }
  },

  /* ─── 错题自动收录 ─── */
  tryAutoCollect() {
    // 自导入题库不自动加入错题本
    if (this.data.bankType === 'custom') return;

    const { currentQuestion, bankName } = this.data;
    const bankId = currentQuestion.bankId;

    const result = wrongBook.autoCollect(
      currentQuestion,
      bankId,
      bankName,
      false
    );

    if (result) {
      wx.showToast({
        title: '已自动加入错题本',
        icon: 'none',
        duration: 1500,
      });
    }
  },

  /* ─── 手动加入错题本 ─── */
  manualAddToWrong() {
    const { currentQuestion, bankName, inWrongBook, wrongBookAdding } = this.data;
    if (wrongBookAdding || inWrongBook) return;

    this.setData({ wrongBookAdding: true });

    const bankId = currentQuestion.bankId;
    const kpId = currentQuestion.knowledgePointId || '';
    const kpName = this.data.knowledgePointName || '';

    wrongBook.manualAdd(
      currentQuestion,
      bankId,
      bankName,
      kpId,
      kpName
    );

    wx.showToast({
      title: '已加入错题本',
      icon: 'success',
      duration: 1200,
    });

    this.setData({
      wrongBookAdding: false,
      inWrongBook: true,
    });
  },

  /* ─── 更新错题本状态（检查当前题目是否已在错题本） ─── */
  updateWrongBookStatus() {
    const { currentQuestion } = this.data;
    const book = wrongBook.getWrongBook();
    const exists = book.find(
      (w) => w.questionId === currentQuestion._id && w.status !== 'mastered'
    );
    this.setData({ inWrongBook: !!exists });
  },

  /* ─── 下一题 ─── */
  nextQuestion() {
    const { currentIndex, totalQuestions, isShortAnswer, shortAnswerJudged } = this.data;

    // 简答题未自判时不能进入下一题
    if (isShortAnswer && !shortAnswerJudged) {
      wx.showToast({ title: '请先判断对错', icon: 'none' });
      return;
    }

    if (currentIndex + 1 >= totalQuestions) {
      // 全部完成
      this.finishSession();
      return;
    }

    const nextIndex = currentIndex + 1;
    const nextQuestion = this.formatQuestion(this.data.questions[nextIndex]);

    this.setData({
      currentIndex: nextIndex,
      currentQuestion: nextQuestion,
      questionTypeLabel: TYPE_LABELS[nextQuestion.type] || '未知题型',
      questionNumber: nextIndex + 1,
      selectedAnswer: '',
      selectedAnswers: {},
      userInput: '',
      fillBlankInputs: nextQuestion.isFillBlank
        ? new Array(nextQuestion.content.fillBlankCount || 1).fill('')
        : [],
      fillBlankResults: [],
      submitted: false,
      isCorrect: null,
      showExplanation: false,
      isShortAnswer: nextQuestion.isShortAnswer || false,
      isMultiChoice: nextQuestion.isMulti || false,
      shortAnswerJudged: false,
      questionStartTime: Date.now(),
      questionTimeSpent: 0,
      scrollTop: 0,
      inWrongBook: false,
      wrongBookAdding: false,
      processedOptions: this.buildOptionClasses(nextQuestion, { submitted: false, isCorrect: null, selectedAnswer: '', selectedAnswers: {}, isShortAnswer: nextQuestion.isShortAnswer || false, isMultiChoice: nextQuestion.isMulti || false }),
    });

    // 更新错题本状态
    this.updateWrongBookStatus();

    // 保存答题进度（自导入题库）
    this._saveCurrentProgress();
  },
  finishSession() {
    // 完成答题：清除进度记忆，标记会话已结束（阻止 onUnload 重新保存）
    this._sessionFinished = true;
    if (this.data.bankType === 'custom' && this.data.bankId) {
      progressManager.clearProgress(this.data.bankId, 'practice');
    }

    const totalTime = Math.round((Date.now() - this.data.sessionStartTime) / 1000);
    const answers = this._sessionAnswers;
    const correctCount = answers.filter((a) => a.isCorrect === true).length;
    const accuracy = this.data.totalQuestions > 0 ? Math.round((correctCount / this.data.totalQuestions) * 100) : 0;

    const result = {
      bankName: this.data.bankName,
      knowledgePointName: this.data.knowledgePointName,
      totalQuestions: this.data.totalQuestions,
      correctCount,
      wrongCount: answers.filter((a) => a.isCorrect === false).length,
      unjudgedCount: answers.filter((a) => a.isCorrect === null).length,
      accuracy,
      totalTime,
      avgTime: answers.length > 0 ? Math.round(totalTime / answers.length) : 0,
      answers,
      mode: this.data.mode,
      finishedAt: new Date().toISOString(),
    };

    // 累加学习时长
    studyTimeManager.addStudyTime(totalTime);

    // 记录练习历史（用于首页历史记录展示）
    practiceHistoryManager.recordSession({
      bankId: this.data.bankId,
      bankName: this.data.bankName,
      bankType: this.data.bankType,
      category: this.data.bankCategory,
      knowledgePointName: this.data.knowledgePointName,
      totalQuestions: this.data.totalQuestions,
      correctCount: correctCount,
      accuracy: accuracy,
    });

    wx.setStorageSync('practiceResult', result);

    this.setData({ finished: true });

    wx.redirectTo({
      url: '/pages/practice/result',
    });
  },

  /* ─── 返回（二次确认） ─── */
  goBack() {
    const hasProgress = this._sessionAnswers.length > 0;
    var isCustomBank = this.data.bankType === 'custom' && this.data.bankId;

    if (hasProgress) {
      var content = isCustomBank
        ? '已完成 ' + this._sessionAnswers.length + '/' + this.data.totalQuestions + ' 题，退出后下次可从此处继续。确定退出吗？'
        : '已完成 ' + this._sessionAnswers.length + '/' + this.data.totalQuestions + ' 题，退出后本次进度不保存。确定退出吗？';
      wx.showModal({
        title: '确认退出',
        content: content,
        confirmText: '退出',
        cancelText: '继续刷题',
        success: (res) => {
          if (res.confirm) {
            // 自导入题库：退出前保存进度（onUnload 也会保存，这里显式保存确保及时）
            this._saveCurrentProgress();
            wx.navigateBack();
          }
        },
      });
    } else {
      wx.navigateBack();
    }
  },

  /* ─── 展开/收起解析 ─── */
  toggleExplanation() {
    this.setData({ showExplanation: !this.data.showExplanation });
  },

  /* ─── 图片预览 ─── */
  onPreviewStemImage(e) {
    const { url } = e.currentTarget.dataset;
    if (!url) return;
    const urls = this.data.currentQuestion.content.stemImages || [];
    imageUploader.previewImage(url, urls);
  },

  onPreviewOptionImage(e) {
    const { url } = e.currentTarget.dataset;
    if (url) imageUploader.previewImage(url);
  },

  onPreviewExplanationImage(e) {
    const { url } = e.currentTarget.dataset;
    if (!url) return;
    const urls = this.data.currentQuestion.content.explanationImages || [];
    imageUploader.previewImage(url, urls);
  },
});
