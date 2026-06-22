const TYPE_LABELS = {
  single_choice: '单选',
  multi_choice: '多选',
  true_false: '判断',
  fill_blank: '填空',
  short_answer: '简答',
};

var questionData = require('../../utils/questionData');

Page({
  data: {
    isDark: false,
    result: null,
    accuracy: 0,
    accuracyLabel: '',
    accuracyColor: '',
    timeFormatted: '',
    avgTimeFormatted: '',
    answersExpanded: false,
    answerDetails: [],
  },

  onLoad() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });

    const result = wx.getStorageSync('practiceResult');
    if (!result) {
      wx.showToast({ title: '未找到结果数据', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }

    const isMemorize = result.mode === 'memorize';

    if (isMemorize) {
      this.initMemorizeResult(result);
    } else {
      this.initPracticeResult(result);
    }
  },

  onShow() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
  },

  /* ─── 刷题模式结果 ─── */
  initPracticeResult(result) {
    var that = this;
    const accuracy = result.accuracy || 0;
    let accuracyLabel = '';
    let accuracyColor = '';

    if (accuracy >= 90) {
      accuracyLabel = '太棒了！';
      accuracyColor = '#34C759';
    } else if (accuracy >= 70) {
      accuracyLabel = '做得不错！';
      accuracyColor = '#007AFF';
    } else if (accuracy >= 50) {
      accuracyLabel = '继续加油！';
      accuracyColor = '#FF9500';
    } else {
      accuracyLabel = '需要多加练习';
      accuracyColor = '#FF3B30';
    }

    const timeFormatted = this.formatTime(result.totalTime || 0);
    const avgTimeFormatted = this.formatTime(result.avgTime || 0);

    // 异步查找题目（支持云DB + mockData）
    var lookups = (result.answers || []).map(function (a, i) {
      return questionData.findQuestionById(a.questionId).then(function (question) {
        return {
          index: i + 1,
          questionId: a.questionId,
          type: question ? question.type : 'single_choice',
          typeLabel: question ? (TYPE_LABELS[question.type] || '未知') : '未知',
          stem: question ? (question.content ? question.content.stem : question.stem) : '（题目已移除）',
          options: question ? (question.content ? question.content.options : (question.options || [])) : [],
          correctAnswer: question ? (question.content ? question.content.answer : (question.answer || '')) : '',
          userAnswer: a.userAnswer,
          isCorrect: a.isCorrect,
          timeSpent: a.timeSpent,
          explanation: question ? (question.content ? question.content.explanation : (question.explanation || '')) : '',
        };
      });
    });

    Promise.all(lookups).then(function (answerDetails) {
      that.setData({
        result: result,
        isMemorize: false,
        accuracy: accuracy,
        accuracyLabel: accuracyLabel,
        accuracyColor: accuracyColor,
        timeFormatted: timeFormatted,
        avgTimeFormatted: avgTimeFormatted,
        answerDetails: answerDetails,
      });
    });
  },

  /* ─── 背题模式结果 ─── */
  initMemorizeResult(result) {
    var that = this;
    const rememberedCount = result.rememberedCount || 0;
    const notRememberedCount = result.notRememberedCount || 0;
    const total = result.totalQuestions || 0;
    const rate = total > 0 ? Math.round((rememberedCount / total) * 100) : 0;

    // 异步查找题目（支持云DB + mockData）
    var lookups = (result.marks || []).map(function (m, i) {
      return questionData.findQuestionById(m.questionId).then(function (question) {
        return {
          index: i + 1,
          questionId: m.questionId,
          type: question ? question.type : 'single_choice',
          typeLabel: question ? (TYPE_LABELS[question.type] || '未知') : '未知',
          stem: question ? (question.content ? question.content.stem : question.stem) : '（题目已移除）',
          options: question ? (question.content ? question.content.options : (question.options || [])) : [],
          correctAnswer: question ? (question.content ? question.content.answer : (question.answer || '')) : '',
          remembered: m.remembered,
          explanation: question ? (question.content ? question.content.explanation : (question.explanation || '')) : '',
        };
      });
    });

    Promise.all(lookups).then(function (answerDetails) {
      that.setData({
        result: result,
        isMemorize: true,
        rememberedCount: rememberedCount,
        notRememberedCount: notRememberedCount,
        memorizeRate: rate,
        answerDetails: answerDetails,
      });
    });
  },

  /* ─── 格式化时间 ─── */
  formatTime(seconds) {
    if (seconds < 60) return `${seconds}秒`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`;
  },

  /* ─── 展开/收起答题详情 ─── */
  toggleAnswers() {
    this.setData({ answersExpanded: !this.data.answersExpanded });
  },

  /* ─── 继续刷题 ─── */
  continuePractice() {
    wx.removeStorageSync('practiceResult');
    wx.redirectTo({
      url: '/pages/bank/list/index',
    });
  },

  /* ─── 查看错题 ─── */
  reviewWrong() {
    wx.redirectTo({
      url: '/pages/wrong/list/index',
    });
  },

  /* ─── 返回首页 ─── */
  goHome() {
    wx.removeStorageSync('practiceResult');
    wx.redirectTo({
      url: '/pages/index/index',
    });
  },
});
