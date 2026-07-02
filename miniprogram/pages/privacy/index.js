Page({
  data: {
    isDark: false,
  },

  onLoad: function () {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });

    wx.setNavigationBarColor({
      frontColor: effectiveTheme === 'dark' ? '#ffffff' : '#000000',
      backgroundColor: effectiveTheme === 'dark' ? '#0F172A' : '#F3F8FF',
      animation: { duration: 300, timingFunc: 'easeInOut' }
    });
  },

  onShow: function () {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
  },
});
