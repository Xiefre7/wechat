const app = getApp();
const slashManager = require('../../utils/slashManager');

Page({
  data: {
    isDark: false,
    avatarUrl: '',
    nickname: '',
    totalQuestions: 1523,
    slashCount: 47,
    studyTimeText: '22.8小时',
    checkinStreak: 12,
    dockItems: [
      { id: "study", label: "学习", icon: "/images/kzg/book-blue.svg", active: false },
      { id: "mine", label: "我的", icon: "/images/kzg/user-blue.svg", active: true }
    ],
  },

  onLoad() {
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });

    var userInfo = app.getUserInfo();
    this.setData({
      avatarUrl: userInfo.avatarUrl || '',
      nickname: userInfo.nickname || '导题斩题小工具用户',
    });
  },

  onShow() {
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
  },

  /**
   * 选择头像
   */
  onChooseAvatar(e) {
    var that = this;
    var tempPath = e.detail.avatarUrl;

    // 1. 立即更新 UI（用临时路径预览）
    that.setData({ avatarUrl: tempPath });

    // 2. 尝试上传到云存储
    var cloudAvailable = wx.cloud && app.globalData.env;
    if (cloudAvailable) {
      wx.cloud.uploadFile({
        cloudPath: 'avatars/' + Date.now() + '.png',
        filePath: tempPath,
      }).then(function (res) {
        // 上传成功，使用 cloud fileID
        app.saveUserInfo({ avatarUrl: res.fileID });
      }).catch(function (err) {
        console.warn('头像上传云存储失败，使用本地缓存:', err);
        // 降级：用本地临时路径
        app.saveUserInfo({ avatarUrl: tempPath });
      });
    } else {
      // 云开发不可用，直接存本地
      app.saveUserInfo({ avatarUrl: tempPath });
    }
  },

  /**
   * 昵称输入完成（失焦）
   */
  onNicknameBlur(e) {
    var value = e.detail.value;
    if (value && value.trim()) {
      var nickname = value.trim();
      this.setData({ nickname: nickname });
      app.saveUserInfo({ nickname: nickname });
    }
  },

  /**
   * 昵称输入完成（确认）
   */
  onNicknameConfirm(e) {
    var value = e.detail.value;
    if (value && value.trim()) {
      var nickname = value.trim();
      this.setData({ nickname: nickname });
      app.saveUserInfo({ nickname: nickname });
    }
  },

  handleFeedbackTap() {
    wx.navigateTo({
      url: '/pages/feedback/index'
    });
  },

  handleDockTap(e) {
    const { id } = e.currentTarget.dataset;

    if (id === "mine") {
      return;
    }

    if (id === "study") {
      wx.redirectTo({ url: '/pages/index/index' });
    }
  },

  /** 进入斩题管理页 */
  goSlashManage() {
    wx.navigateTo({
      url: '/pages/slash/manage/index',
    });
  },
});
