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
  },

  onPullDownRefresh() {
    this.loadHistory(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: '已刷新', icon: 'none' });
    });
  },

  loadHistory(callback) {
    this.setData({ loading: true });

    // TODO: 后续接入云开发后替换为数据库查询
    const mockData = [
      {
        id: 'h1',
        name: '2024福建职教高考数学真题',
        subject: 'math',
        subjectName: '数学',
        lastTime: '2026-06-01',
        lastTimeText: '3天前',
        progress: 72,
        doneCount: 36,
        totalCount: 50
      },
      {
        id: 'h2',
        name: '英语高频词汇练习',
        subject: 'english',
        subjectName: '英语',
        lastTime: '2026-06-03',
        lastTimeText: '昨天',
        progress: 45,
        doneCount: 90,
        totalCount: 200
      },
      {
        id: 'h3',
        name: '政治时事热点题库',
        subject: 'politics',
        subjectName: '政治',
        lastTime: '2026-05-29',
        lastTimeText: '5天前',
        progress: 28,
        doneCount: 14,
        totalCount: 50
      }
    ];

    setTimeout(() => {
      this.setData({
        historyList: mockData,
        loading: false,
        empty: mockData.length === 0
      });
      callback && callback();
    }, 300);
  },

  handleItemTap(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.historyList.find(h => h.id === id);

    if (item) {
      wx.navigateTo({
        url: `/pages/practice/index?bankId=${id}&bankName=${encodeURIComponent(item.name)}`,
      });
    }
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  }
});
