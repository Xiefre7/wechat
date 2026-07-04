var imageUploader = require('../../utils/imageUploader');
var studyTimeManager = require('../../utils/studyTimeManager');
var practiceHistoryManager = require('../../utils/practiceHistoryManager');
var progressManager = require('../../utils/progressManager');

/** 题型中文名 */
var TYPE_LABELS = {
  single_choice: '单选题',
  multi_choice: '多选题',
  true_false: '判断题',
  fill_blank: '填空题',
  short_answer: '简答题',
};

Page({
  data: {
    isDark: false,
    bankName: '',
    bankType: '',
    bankId: '',
    bankCategory: '',
    questions: [],
    totalQuestions: 0,
    currentIndex: 0,
    currentQuestion: null,
    processedOptions: [],
    questionTypeLabel: '',
    questionNumber: 1,
    showExplanation: true,
    showAnswer: true,
    vibration: true,
    scrollTop: 0,
    isShortAnswer: false,
    isMultiChoice: false,
  },

  onLoad: function () {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });

    var session = wx.getStorageSync('practiceSession');
    if (!session || !session.questions || session.questions.length === 0) {
      wx.showToast({ title: '未找到练习数据', icon: 'none' });
      setTimeout(function () { wx.navigateBack(); }, 1200);
      return;
    }

    var totalQuestions = session.questions.length;
    // 进度记忆：从上次退出的位置继续（仅自导入题库）
    var startIndex = 0;
    if (session.bankType === 'custom' && session.bankId) {
      startIndex = progressManager.getProgress(session.bankId, 'memorize', totalQuestions);
      if (startIndex > 0) {
        wx.showToast({
          title: '从第' + (startIndex + 1) + '题继续',
          icon: 'none',
          duration: 1500,
        });
      }
    }
    var startQuestion = this.formatQuestion(session.questions[startIndex]);

    this.setData({
      bankName: session.bankName,
      bankType: session.bankType,
      bankId: session.bankId || '',
      bankCategory: session.bankCategory || '',
      questions: session.questions,
      totalQuestions: totalQuestions,
      currentIndex: startIndex,
      currentQuestion: startQuestion,
      processedOptions: this.buildOptionClasses(startQuestion, {
        isMemorizeMode: true,
        submitted: false,
        isCorrect: null,
        isMultiChoice: startQuestion.isMulti || false,
        isShortAnswer: startQuestion.isShortAnswer || false,
      }),
      questionTypeLabel: TYPE_LABELS[startQuestion.type] || '未知题型',
      questionNumber: startIndex + 1,
      showExplanation: true,
      showAnswer: true,
      isShortAnswer: startQuestion.isShortAnswer || false,
      isMultiChoice: startQuestion.isMulti || false,
      sessionStartTime: Date.now(),
    });

    this._memorizeMarks = [];
  },

  onShow: function () {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
  },

  onHide: function () {
    this._saveCurrentProgress();
  },

  onUnload: function () {
    this._saveCurrentProgress();
  },

  /* ─── 保存当前背题进度（仅自导入题库）─── */
  _saveCurrentProgress: function () {
    // 完成背题后不再保存进度（避免覆盖已清除的进度）
    if (this._sessionFinished) return;
    if (this.data.bankType === 'custom' && this.data.bankId && this.data.totalQuestions > 0) {
      progressManager.saveProgress(
        this.data.bankId,
        'memorize',
        this.data.currentIndex,
        this.data.totalQuestions
      );
    }
  },

  /* ─── 格式化题目 ─── */
  formatQuestion: function (q) {
    // 统一两种数据结构：官方题库用 q.content.*，自导入题库用 q.* 扁平结构
    var content = q.content || {
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

    // 填空题：兼容旧数据
    var fbCount = content.fillBlankCount || q.fillBlankCount || 0;
    var fbAnswers = (content.fillBlankAnswers || q.fillBlankAnswers || []).slice();
    if (q.type === 'fill_blank') {
      if (fbCount === 0 || fbAnswers.length === 0) {
        var rawAns = (content.answer || '').trim();
        if (rawAns) {
          fbAnswers = rawAns.split(/[|｜]/).map(function(s) { return s.trim(); });
          fbCount = fbAnswers.length;
        } else {
          fbCount = 1;
          fbAnswers = [''];
        }
      }
    }

    var hasStemImages = (stemImages && stemImages.length > 0);
    var hasExplanationImages = (explanationImages && explanationImages.length > 0);

    return {
      content: {
        stem: content.stem,
        options: (content.options || []).map(function (opt) {
          return { key: opt.key, text: opt.text || '', image: opt.image || '' };
        }),
        answer: content.answer,
        explanation: content.explanation,
        stemImages: stemImages,
        explanationImages: explanationImages,
        fillBlankCount: fbCount,
        fillBlankAnswers: fbAnswers,
      },
      _id: q._id || ('tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
      type: q.type,
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
  parseCorrectKeys: function (answerStr, options) {
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
  buildOptionClasses: function (question, overrides) {
    var q = question || this.data.currentQuestion;
    var state = overrides ? overrides : {};
    if (!q || !q.content || !q.content.options) return [];

    var correctKeys = this.parseCorrectKeys(q.content.answer, q.content.options);

    var isMemorizeMode = state.isMemorizeMode !== undefined ? state.isMemorizeMode : true;

    return q.content.options.map(function (opt) {
      var isCorrectOpt = isMemorizeMode && correctKeys.indexOf(opt.key) !== -1;

      var cls = '';
      if (isCorrectOpt) cls += 'correct';

      return {
        key: opt.key, text: opt.text || '', image: opt.image || '',
        _cls: cls.trim(),
        _isCorrect: isCorrectOpt,
      };
    });
  },

  /* ─── 选项点击（无操作，背题模式下禁用） ─── */
  onOptionTap: function () {
    // 背题模式下选项不可交互
  },

  /* ─── 标记"记住了" ─── */
  markMemorized: function () {
    var currentQuestion = this.data.currentQuestion;
    var currentIndex = this.data.currentIndex;

    this._memorizeMarks.push({
      questionId: currentQuestion._id,
      index: currentIndex,
      remembered: true,
    });

    this.goNextAfterMark();
  },

  /* ─── 标记"没记住" ─── */
  markNotMemorized: function () {
    var currentQuestion = this.data.currentQuestion;
    var currentIndex = this.data.currentIndex;

    this._memorizeMarks.push({
      questionId: currentQuestion._id,
      index: currentIndex,
      remembered: false,
    });

    this.goNextAfterMark();
  },

  /* ─── 标记后跳转下一题 ─── */
  goNextAfterMark: function () {
    var currentIndex = this.data.currentIndex;
    var totalQuestions = this.data.totalQuestions;

    if (this.data.vibration) {
      wx.vibrateShort({ type: 'light' });
    }

    if (currentIndex + 1 >= totalQuestions) {
      this.finishMemorizeSession();
      return;
    }

    var nextIndex = currentIndex + 1;
    var nextQuestion = this.formatQuestion(this.data.questions[nextIndex]);
    var nextOptions = this.buildOptionClasses(nextQuestion, {
      isMemorizeMode: true,
      submitted: false,
      isCorrect: null,
      isMultiChoice: nextQuestion.isMulti || false,
      isShortAnswer: nextQuestion.isShortAnswer || false,
    });

    this.setData({
      currentIndex: nextIndex,
      currentQuestion: nextQuestion,
      questionTypeLabel: TYPE_LABELS[nextQuestion.type] || '未知题型',
      questionNumber: nextIndex + 1,
      scrollTop: 0,
      showExplanation: true,
      showAnswer: true,
      isShortAnswer: nextQuestion.isShortAnswer || false,
      isMultiChoice: nextQuestion.isMulti || false,
      processedOptions: nextOptions,
    });

    // 保存背题进度（自导入题库）
    this._saveCurrentProgress();
  },

  /* ─── 返回上一题 ─── */
  goToPreviousQuestion: function () {
    var currentIndex = this.data.currentIndex;
    if (currentIndex <= 0) return;

    if (this.data.vibration) {
      wx.vibrateShort({ type: 'light' });
    }

    var prevIndex = currentIndex - 1;
    var prevQuestion = this.formatQuestion(this.data.questions[prevIndex]);
    var prevOptions = this.buildOptionClasses(prevQuestion, {
      isMemorizeMode: true,
      submitted: false,
      isCorrect: null,
      isMultiChoice: prevQuestion.isMulti || false,
      isShortAnswer: prevQuestion.isShortAnswer || false,
    });

    this.setData({
      currentIndex: prevIndex,
      currentQuestion: prevQuestion,
      questionTypeLabel: TYPE_LABELS[prevQuestion.type] || '未知题型',
      questionNumber: prevIndex + 1,
      scrollTop: 0,
      showExplanation: true,
      showAnswer: true,
      isShortAnswer: prevQuestion.isShortAnswer || false,
      isMultiChoice: prevQuestion.isMulti || false,
      processedOptions: prevOptions,
    });
  },

  /* ─── 完成背题 ─── */
  finishMemorizeSession: function () {
    // 完成背题：清除进度记忆，标记会话已结束（阻止 onUnload 重新保存）
    this._sessionFinished = true;
    if (this.data.bankType === 'custom' && this.data.bankId) {
      progressManager.clearProgress(this.data.bankId, 'memorize');
    }

    var marks = this._memorizeMarks;
    // 按 questionId 去重，保留最后一次标记
    var seen = {};
    for (var i = 0; i < marks.length; i++) {
      seen[marks[i].questionId] = marks[i];
    }
    var uniqueMarks = [];
    for (var key in seen) {
      if (seen.hasOwnProperty(key)) {
        uniqueMarks.push(seen[key]);
      }
    }
    var rememberedCount = 0;
    var notRememberedCount = 0;
    for (var j = 0; j < uniqueMarks.length; j++) {
      if (uniqueMarks[j].remembered) {
        rememberedCount++;
      } else {
        notRememberedCount++;
      }
    }

    // 累加学习时长（背题模式）
    var totalTime = Math.round((Date.now() - (this.data.sessionStartTime || Date.now())) / 1000);
    studyTimeManager.addStudyTime(totalTime);

    // 记录练习历史
    var accuracy = this.data.totalQuestions > 0
      ? Math.round((rememberedCount / this.data.totalQuestions) * 100) : 0;
    practiceHistoryManager.recordSession({
      bankId: this.data.bankId,
      bankName: this.data.bankName,
      bankType: this.data.bankType,
      category: this.data.bankCategory,
      knowledgePointName: '背题模式',
      totalQuestions: this.data.totalQuestions,
      correctCount: rememberedCount,
      accuracy: accuracy,
    });

    var result = {
      bankName: this.data.bankName,
      totalQuestions: this.data.totalQuestions,
      mode: 'memorize',
      rememberedCount: rememberedCount,
      notRememberedCount: notRememberedCount,
      marks: uniqueMarks,
      totalTime: totalTime,
      finishedAt: new Date().toISOString(),
    };

    wx.setStorageSync('practiceResult', result);

    wx.redirectTo({
      url: '/pages/practice/result',
    });
  },

  /* ─── 返回（二次确认） ─── */
  goBack: function () {
    var hasProgress = this._memorizeMarks.length > 0;
    var that = this;
    var isCustomBank = this.data.bankType === 'custom' && this.data.bankId;

    if (hasProgress) {
      var content = isCustomBank
        ? '已浏览 ' + this._memorizeMarks.length + '/' + this.data.totalQuestions + ' 题，退出后下次可从此处继续。确定退出吗？'
        : '已浏览 ' + this._memorizeMarks.length + '/' + this.data.totalQuestions + ' 题，退出后本次进度不保存。确定退出吗？';
      wx.showModal({
        title: '确认退出',
        content: content,
        confirmText: '退出',
        cancelText: '继续背题',
        success: function (res) {
          if (res.confirm) {
            that._saveCurrentProgress();
            wx.navigateBack();
          }
        },
      });
    } else {
      wx.navigateBack();
    }
  },

  /* ─── 展开/收起解析 ─── */
  toggleExplanation: function () {
    this.setData({ showExplanation: !this.data.showExplanation });
  },

  /* ─── 图片预览 ─── */
  onPreviewStemImage: function (e) {
    var url = e.detail.url;
    if (!url) return;
    var urls = this.data.currentQuestion.content.stemImages || [];
    imageUploader.previewImage(url, urls);
  },

  onPreviewOptionImage: function (e) {
    var url = e.detail.url;
    if (url) imageUploader.previewImage(url);
  },

  onPreviewExplanationImage: function (e) {
    var url = e.currentTarget.dataset.url;
    if (!url) return;
    var urls = this.data.currentQuestion.content.explanationImages || [];
    imageUploader.previewImage(url, urls);
  },
});
