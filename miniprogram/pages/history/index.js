var practiceHistoryManager = require('../../utils/practiceHistoryManager');

Page({
  data: {
    isDark: false,
    historyList: [],
    loading: true,
    empty: false
  },

  onLoad() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });

    this.loadHistory();
  },

  onShow() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
    // 返回时刷新（可能刚刷完题）
    this.loadHistory();
  },

  onPullDownRefresh() {
    this.loadHistory(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: '已刷新', icon: 'none' });
    });
  },

  loadHistory(callback) {
    this.setData({ loading: true });

    var rawList = practiceHistoryManager.getHistory();
    // 适配 wxml 字段
    var historyList = rawList.map(function (r) {
      return {
        id: r.bankId,
        name: r.bankName,
        subject: r.subject || 'other',
        subjectName: r.subjectName || r.category || '',
        knowledgePointName: r.knowledgePointName || '',
        lastTime: r.lastTimeText,
        lastTimeISO: r.lastTimeISO,
        progress: r.progress || 0,
        doneCount: r.totalDone || 0,
        totalCount: r.totalQuestions || 0,
        sessionCount: r.sessionCount || 1,
        accuracy: r.accuracy || 0
      };
    });

    this.setData({
      historyList: historyList,
      loading: false,
      empty: historyList.length === 0
    });
    callback && callback();
  },

  handleItemTap(e) {
    // 跳转到题库列表页，让用户重新选择知识点开始刷题
    wx.switchTab({
      url: '/pages/bank/list/index',
      fail: function () {
        wx.navigateTo({ url: '/pages/bank/list/index' });
      }
    });
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  }
});
