Page({
  data: {
    isDark: false,
    title: "功能模块",
    description: "页面框架已接入，下一步会补齐数据、状态和交互流程。"
  },

  onLoad(options) {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });

    if (options.title) {
      this.setData({
        title: decodeURIComponent(options.title)
      });
      wx.setNavigationBarTitle({
        title: decodeURIComponent(options.title)
      });
    }
  },

  onShow() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
  },

  onBack() {
    wx.navigateBack({
      delta: 1,
      fail() {
        wx.redirectTo({
          url: "/pages/index/index"
        });
      }
    });
  },
});
