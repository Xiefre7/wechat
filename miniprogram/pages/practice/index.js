const mockData = require('../../data/mockData');
const wrongBook = require('../../utils/wrongBook');
const slashManager = require('../../utils/slashManager');
const imageUploader = require('../../utils/imageUploader');

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
    const firstQuestion = this.formatQuestion(session.questions[0]);

    this.setData({
      bankName: session.bankName,
      bankType: session.bankType,
      knowledgePointName: session.knowledgePointName || '',
      questions: session.questions,
      totalQuestions,
      currentIndex: 0,
      currentQuestion: firstQuestion,
      processedOptions: this.buildOptionClasses(firstQuestion, {
        isMemorizeMode: false,
        isMultiChoice: firstQuestion.isMulti || false,
        isShortAnswer: firstQuestion.isShortAnswer || false,
      }),
      questionTypeLabel: TYPE_LABELS[firstQuestion.type] || '未知题型',
      questionNumber: 1,
      sessionStartTime: Date.now(),
      questionStartTime: Date.now(),
      questionClassId: session.questionClassId || '',
      questionClassName: session.questionClassName || '',
      allClassIds: session.allClassIds || [],
    });

    this._sessionAnswers = [];

    this.updateWrongBookStatus();
  },

  onShow() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
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
    };
    const hasStemImages = (content.stemImages && content.stemImages.length > 0);
    const hasExplanationImages = (content.explanationImages && content.explanationImages.length > 0);

    return {
      ...q,
      content: {
        ...content,
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

  /* ─── 提交答案 ─── */
  submitAnswer() {
    if (this.data.submitted) return;

    const { currentQuestion, selectedAnswer, selectedAnswers, userInput, isShortAnswer } =
      this.data;

    // 校验是否已作答
    const hasAnswer = isShortAnswer
      ? userInput.trim().length > 0
      : currentQuestion.isMulti
      ? Object.keys(selectedAnswers).length > 0
      : currentQuestion.hasOptions
      ? selectedAnswer
      : userInput.trim().length > 0;

    if (!hasAnswer) {
      wx.showToast({ title: '请先作答', icon: 'none' });
      return;
    }

    // 计算耗时
    const timeSpent = Math.round((Date.now() - this.data.questionStartTime) / 1000);

    // 判断对错
    let isCorrect = false;
    if (isShortAnswer) {
      // 简答题：显示参考答案，用户自判
      isCorrect = null;
    } else if (currentQuestion.isMulti) {
      // 多选题：排序后比较
      const userKeys = Object.keys(selectedAnswers).sort().join(',');
      const correctKeys = currentQuestion.content.answer
        .split(/[,，]/)
        .map((s) => s.trim())
        .sort()
        .join(',');
      isCorrect = userKeys === correctKeys;
    } else if (currentQuestion.isFillBlank) {
      // 填空题：包含匹配（不区分大小写）
      isCorrect = this.checkFillBlank(userInput.trim(), currentQuestion.content.answer);
    } else {
      // 单选/判断：精确匹配
      isCorrect = selectedAnswer === currentQuestion.content.answer;
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
      userAnswer: isShortAnswer
        ? userInput.trim()
        : currentQuestion.isMulti
        ? Object.keys(selectedAnswers).sort().join(',')
        : currentQuestion.hasOptions
        ? selectedAnswer
        : userInput.trim(),
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
    const { allClassIds, questionClassId, knowledgePointId } = this.data;

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

    // 随机选下一个题类（排除当前的）
    const candidates = unslashed.filter((id) => id !== questionClassId);
    const nextClassId = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : unslashed[Math.floor(Math.random() * unslashed.length)];

    // 获取该题类的题目
    let questions = mockData.questions.filter((q) => q.questionClassId === nextClassId);
    // 随机打乱
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    // 获取题类名称
    const qc = mockData.questionClasses.find((c) => c._id === nextClassId);
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
  },

  /* ─── 完成答题 ─── */
  finishSession() {
    const totalTime = Math.round((Date.now() - this.data.sessionStartTime) / 1000);
    const answers = this._sessionAnswers;
    const correctCount = answers.filter((a) => a.isCorrect === true).length;

    const result = {
      bankName: this.data.bankName,
      knowledgePointName: this.data.knowledgePointName,
      totalQuestions: this.data.totalQuestions,
      correctCount,
      wrongCount: answers.filter((a) => a.isCorrect === false).length,
      unjudgedCount: answers.filter((a) => a.isCorrect === null).length,
      accuracy: this.data.totalQuestions > 0 ? Math.round((correctCount / this.data.totalQuestions) * 100) : 0,
      totalTime,
      avgTime: answers.length > 0 ? Math.round(totalTime / answers.length) : 0,
      answers,
      mode: this.data.mode,
      finishedAt: new Date().toISOString(),
    };

    wx.setStorageSync('practiceResult', result);

    this.setData({ finished: true });

    wx.redirectTo({
      url: '/pages/practice/result',
    });
  },

  /* ─── 返回（二次确认） ─── */
  goBack() {
    const hasProgress = this._sessionAnswers.length > 0;

    if (hasProgress) {
      wx.showModal({
        title: '确认退出',
        content: '已完成 ' + this._sessionAnswers.length + '/' + this.data.totalQuestions + ' 题，退出后本次进度不保存。确定退出吗？',
        confirmText: '退出',
        cancelText: '继续刷题',
        success: (res) => {
          if (res.confirm) {
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
