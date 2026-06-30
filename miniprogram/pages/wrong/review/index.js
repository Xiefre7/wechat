const wrongBook = require('../../../utils/wrongBook');
const mockData = require('../../../data/mockData');
var questionData = require('../../../utils/questionData');
const imageUploader = require('../../../utils/imageUploader');

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
    /* 复习列表 */
    wrongRecords: [],
    totalQuestions: 0,
    currentIndex: 0,

    /* 刷题数据 */
    currentQuestion: null,
    processedOptions: [],
    currentWrongId: '',
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
    vibration: true,

    /* 进度 */
    answeredCount: 0,
    correctCount: 0,

    /* 计时 */
    questionStartTime: 0,
    questionTimeSpent: 0,

    /* 多选题提示 */
    isMultiChoice: false,

    /* 简答题自判 */
    isShortAnswer: false,
    shortAnswerJudged: false,

    /* 复习完成 */
    finished: false,
    reviewResult: null,

    /* 滚动到顶部 */
    scrollTop: 0,
  },

  onLoad(options) {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });

    const reviewListIds = wx.getStorageSync('wrongReviewList') || [];
    if (reviewListIds.length === 0) {
      wx.showToast({ title: '未找到待复习错题', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }

    const book = wrongBook.getWrongBook();
    const records = reviewListIds
      .map((id) => book.find((w) => w._id === id))
      .filter(Boolean);

    if (records.length === 0) {
      wx.showToast({ title: '待复习错题数据异常', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }

    // 确保每条记录都有完整题目数据（本地 mockData + 云DB）
    var that = this;
    var enrichPromises = records.map(function (r) {
      if (r.question && r.question.content) return Promise.resolve(r);
      return questionData.findQuestionById(r.questionId).then(function (q) {
        if (q) r.question = q;
        return r;
      });
    });

    Promise.all(enrichPromises).then(function (enrichedRecords) {
      that._initReview(enrichedRecords);
    });
  },

  _initReview(records) {
    const firstRecord = records[0];
    const firstQuestion = this.formatQuestion(firstRecord);

    this.setData({
      wrongRecords: records,
      totalQuestions: records.length,
      currentIndex: 0,
      currentWrongId: firstRecord._id,
      currentQuestion: firstQuestion,
      processedOptions: this.buildOptionClasses(firstQuestion),
      questionTypeLabel: TYPE_LABELS[firstQuestion.type] || '未知题型',
      questionNumber: 1,
      questionStartTime: Date.now(),
    });

    this._reviewAnswers = [];
  },

  onShow() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
  },

  /* ─── 格式化题目 ─── */
  formatQuestion(record) {
    const q = record.question || {};
    const content = q.content || {
      stem: q.stem || '',
      options: q.options || [],
      answer: q.answer || '',
      explanation: q.explanation || '',
      stemImages: q.stemImages || [],
      explanationImages: q.explanationImages || [],
    };
    return {
      ...q,
      content: {
        ...content,
        options: (content.options || []).map(function(opt) {
          return { key: opt.key, text: opt.text || '', image: opt.image || '' };
        }),
      },
      _id: q._id || record.questionId,
      displayType: TYPE_LABELS[q.type] || '未知',
      hasOptions: q.type === 'single_choice' || q.type === 'multi_choice' || q.type === 'true_false',
      isMulti: q.type === 'multi_choice',
      isFillBlank: q.type === 'fill_blank',
      isShortAnswer: q.type === 'short_answer',
      isTrueFalse: q.type === 'true_false',
      hasStemImages: !!(content.stemImages && content.stemImages.length > 0),
      hasExplanationImages: !!(content.explanationImages && content.explanationImages.length > 0),
    };
  },

  /* ─── 预处理选项 class ─── */
  buildOptionClasses(question, overrides) {
    const q = question || this.data.currentQuestion;
    const state = overrides ? { ...this.data, ...overrides } : this.data;
    const { submitted, isMultiChoice, selectedAnswers, selectedAnswer, isCorrect, isShortAnswer } = state;
    if (!q || !q.content || !q.content.options) return [];

    return q.content.options.map((opt) => {
      const isSelected = !submitted &&
        (isMultiChoice ? selectedAnswers[opt.key] : selectedAnswer === opt.key);
      const isCorrectOpt = submitted && opt.key === q.content.answer;
      const isWrongOpt = submitted && !isShortAnswer && isCorrect === false &&
        (isMultiChoice ? selectedAnswers[opt.key] : selectedAnswer === opt.key);

      let cls = '';
      if (isSelected) cls += 'selected';
      if (isCorrectOpt) cls += ' correct';
      if (isWrongOpt) cls += ' wrong';

      return { key: opt.key, text: opt.text || '', image: opt.image || '', _cls: cls.trim() };
    });
  },

  /* ─── 刷新选项状态 ─── */
  refreshOptions(overrides) {
    this.setData({ processedOptions: this.buildOptionClasses(null, overrides) });
  },

  /* ─── 选项选择 ─── */
  selectOption(e) {
    if (this.data.submitted) return;
    const { key } = e.currentTarget.dataset;

    if (this.data.isMultiChoice) {
      const selectedAnswers = { ...this.data.selectedAnswers };
      if (selectedAnswers[key]) {
        delete selectedAnswers[key];
      } else {
        selectedAnswers[key] = true;
      }
      this.setData({ selectedAnswers });
      this.refreshOptions({ selectedAnswers });
    } else {
      this.setData({ selectedAnswer: key });
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

    const { currentQuestion, selectedAnswer, selectedAnswers, userInput, isShortAnswer } = this.data;

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

    const timeSpent = Math.round((Date.now() - this.data.questionStartTime) / 1000);

    // 判断对错
    let isCorrect = false;
    if (isShortAnswer) {
      isCorrect = null;
    } else if (currentQuestion.isMulti) {
      const userKeys = Object.keys(selectedAnswers).sort().join(',');
      const correctKeys = currentQuestion.content.answer
        .split(/[,，]/)
        .map((s) => s.trim())
        .sort()
        .join(',');
      isCorrect = userKeys === correctKeys;
    } else if (currentQuestion.isFillBlank) {
      isCorrect = this.checkFillBlank(userInput.trim(), currentQuestion.content.answer);
    } else {
      isCorrect = selectedAnswer === currentQuestion.content.answer;
    }

    // 震动反馈
    if (this.data.vibration) {
      if (isCorrect === true) wx.vibrateShort({ type: 'light' });
      else if (isCorrect === false) wx.vibrateShort({ type: 'heavy' });
    }

    // 记录答案
    this._reviewAnswers.push({
      wrongId: this.data.currentWrongId,
      questionId: currentQuestion._id,
      isCorrect,
      timeSpent,
    });

    const answeredCount = this._reviewAnswers.length;
    const correctCount = this._reviewAnswers.filter((a) => a.isCorrect === true).length;

    const stateUpdates = {
      submitted: true,
      isCorrect,
      showExplanation: true,
      shortAnswerJudged: isShortAnswer ? false : undefined,
      questionTimeSpent: timeSpent,
      answeredCount,
      correctCount,
    };

    this.setData({
      ...stateUpdates,
      processedOptions: this.buildOptionClasses(null, stateUpdates),
    });
  },

  /* ─── 填空题对错判断 ─── */
  checkFillBlank(userAnswer, correctAnswer) {
    const userParts = userAnswer.split('|').map((s) => s.trim().toLowerCase());
    const correctParts = correctAnswer.split('|').map((s) => s.trim().toLowerCase());
    // 精确匹配（不区分大小写，trim）
    if (correctParts.length === 1 && userParts.length === 1) {
      return userParts[0] === correctParts[0];
    }
    if (userParts.length !== correctParts.length) return false;
    for (let i = 0; i < correctParts.length; i++) {
      if ((userParts[i] || '') !== correctParts[i]) return false;
    }
    return true;
  },

  /* ─── 简答题自判 ─── */
  judgeShortAnswer(e) {
    const { correct } = e.currentTarget.dataset;
    const isCorrect = correct === 'true';

    if (this._reviewAnswers.length > 0) {
      this._reviewAnswers[this._reviewAnswers.length - 1].isCorrect = isCorrect;
    }

    const correctCount = this._reviewAnswers.filter((a) => a.isCorrect === true).length;

    const judgeUpdates = {
      isCorrect,
      shortAnswerJudged: true,
      correctCount,
    };

    this.setData({
      ...judgeUpdates,
      processedOptions: this.buildOptionClasses(null, judgeUpdates),
    });

    if (this.data.vibration) {
      wx.vibrateShort({ type: isCorrect ? 'light' : 'heavy' });
    }
  },

  /* ─── 下一题 ─── */
  nextQuestion() {
    const { currentIndex, totalQuestions, isShortAnswer, shortAnswerJudged } = this.data;

    if (isShortAnswer && !shortAnswerJudged) {
      wx.showToast({ title: '请先判断对错', icon: 'none' });
      return;
    }

    // SM-2 更新当前错题
    const lastAnswer = this._reviewAnswers[this._reviewAnswers.length - 1];
    if (lastAnswer && lastAnswer.isCorrect !== null) {
      wrongBook.reviewAnswer(lastAnswer.wrongId, lastAnswer.isCorrect);
    }

    if (currentIndex + 1 >= totalQuestions) {
      this.finishReview();
      return;
    }

    const nextIndex = currentIndex + 1;
    const nextRecord = this.data.wrongRecords[nextIndex];
    const nextQuestion = this.formatQuestion(nextRecord);

    this.setData({
      currentIndex: nextIndex,
      currentWrongId: nextRecord._id,
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
      processedOptions: this.buildOptionClasses(nextQuestion, { submitted: false, isCorrect: null, selectedAnswer: '', selectedAnswers: {}, isShortAnswer: nextQuestion.isShortAnswer || false, isMultiChoice: nextQuestion.isMulti || false }),
    });
  },

  /* ─── 完成复习 ─── */
  finishReview() {
    // 处理最后一道题的SM-2更新
    const lastAnswer = this._reviewAnswers[this._reviewAnswers.length - 1];
    if (lastAnswer && lastAnswer.isCorrect !== null) {
      wrongBook.reviewAnswer(lastAnswer.wrongId, lastAnswer.isCorrect);
    }

    const answers = this._reviewAnswers;
    const correctCount = answers.filter((a) => a.isCorrect === true).length;
    const wrongCount = answers.filter((a) => a.isCorrect === false).length;

    const reviewResult = {
      totalQuestions: this.data.totalQuestions,
      correctCount,
      wrongCount,
      accuracy: this.data.totalQuestions > 0
        ? Math.round((correctCount / this.data.totalQuestions) * 100)
        : 0,
      masteredCount: answers.filter((a) => {
        const record = this.data.wrongRecords.find((r) => r._id === a.wrongId);
        if (!record) return false;
        return record.consecutiveReviewCorrect + (a.isCorrect ? 1 : 0) >= 3;
      }).length,
    };

    this.setData({
      finished: true,
      reviewResult,
    });

    // 清除复习列表缓存
    wx.removeStorageSync('wrongReviewList');
  },

  /* ─── 返回 ─── */
  goBack() {
    if (this._reviewAnswers.length > 0 && !this.data.finished) {
      wx.showModal({
        title: '确认退出',
        content: `已完成 ${this._reviewAnswers.length}/${this.data.totalQuestions} 题，退出后本次复习进度仍会保存。确定退出吗？`,
        confirmText: '退出',
        cancelText: '继续复习',
        success: (res) => {
          if (res.confirm) {
            // 保存已完成的复习
            const lastAnswer = this._reviewAnswers[this._reviewAnswers.length - 1];
            if (lastAnswer && lastAnswer.isCorrect !== null) {
              wrongBook.reviewAnswer(lastAnswer.wrongId, lastAnswer.isCorrect);
            }
            wx.removeStorageSync('wrongReviewList');
            wx.navigateBack();
          }
        },
      });
    } else {
      wx.navigateBack();
    }
  },

  /* ─── 返回错题本 ─── */
  goToWrongList() {
    wx.removeStorageSync('wrongReviewList');
    wx.redirectTo({
      url: '/pages/wrong/list/index',
    });
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
