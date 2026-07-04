const app = getApp();
const slashManager = require('../../utils/slashManager');
const checkinManager = require('../../utils/checkinManager');
const studyTimeManager = require('../../utils/studyTimeManager');
const authManager = require('../../utils/authManager');

// 模块级预读：redirectTo 创建新页时，第一帧 data 就有真实值，消除闪烁
var _effectiveTheme = (app && app.globalData) ? (app.globalData.effectiveTheme || 'light') : 'light';
var _userInfo = (app && app.getUserInfo) ? app.getUserInfo() : { nickname: '导题斩题小工具用户', avatarUrl: '' };
var _checkinInfo = checkinManager.getCheckinSummary();
var _slashedItems = slashManager.getAllSlashedItems();

Page({
  data: {
    isDark: _effectiveTheme === 'dark',
    avatarUrl: _userInfo.avatarUrl || '',
    nickname: _userInfo.nickname || '导题斩题小工具用户',
    totalQuestions: studyTimeManager.getTotalQuestions(),
    slashCount: _slashedItems ? _slashedItems.length : 0,
    studyTimeText: studyTimeManager.getTotalFormatted(),
    checkinStreak: _checkinInfo.streak,
    isLoggedIn: authManager.isLoggedIn(),
    dockItems: [
      { id: "study", label: "学习", icon: "/images/kzg/book-blue.svg", active: false },
      { id: "mine", label: "我的", icon: "/images/kzg/user-blue.svg", active: true }
    ],
  },

  onLoad() {
    // 模块级预读的 _userInfo 可能在退出登录后已过期（JS 模块缓存，不会重新求值）
    // 因此 onLoad 必须从 app.getUserInfo() 读取最新值，覆盖可能过期的 data 初始值
    // setData 在首次渲染前执行，不会产生可见闪烁
    var userInfo = app.getUserInfo();
    this._firstShow = true;
    var that = this;
    this._themeCb = function () {
      var theme = app.globalData.effectiveTheme || 'light';
      that.setData({ isDark: theme === 'dark' });
    };
    if (app.onThemeChange) {
      app.onThemeChange(this._themeCb);
    }
    this.setData({
      avatarUrl: userInfo.avatarUrl || '',
      nickname: userInfo.nickname || '导题斩题小工具用户',
    });
  },

  onUnload() {
    if (app.offThemeChange && this._themeCb) {
      app.offThemeChange(this._themeCb);
    }
  },

  onShow() {
    // 首次 onShow 跳过：onLoad 已通过 setData 刷新了用户信息
    // 避免页面创建后立即 setData 触发重渲染闪烁
    if (this._firstShow) {
      this._firstShow = false;
      return;
    }

    // 后续 onShow（从其他页返回时）刷新数据
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    var userInfo = app.getUserInfo();
    var checkinInfo = checkinManager.getCheckinSummary();
    var slashedItems = slashManager.getAllSlashedItems();

    this.setData({
      isDark: effectiveTheme === 'dark',
      isLoggedIn: authManager.isLoggedIn(),
      avatarUrl: userInfo.avatarUrl || '',
      nickname: userInfo.nickname || '导题斩题小工具用户',
      checkinStreak: checkinInfo.streak,
      totalQuestions: studyTimeManager.getTotalQuestions(),
      slashCount: slashedItems ? slashedItems.length : 0,
      studyTimeText: studyTimeManager.getTotalFormatted(),
    });
  },

  /** 加载真实打卡数据 */
  loadCheckinData() {
    var info = checkinManager.getCheckinSummary();
    this.setData({ checkinStreak: info.streak });
  },

  /** 加载学习统计数据 */
  loadStatsData() {
    var slashedItems = slashManager.getAllSlashedItems();
    this.setData({
      totalQuestions: studyTimeManager.getTotalQuestions(),
      slashCount: slashedItems ? slashedItems.length : 0,
      studyTimeText: studyTimeManager.getTotalFormatted(),
    });
  },

  /**
   * 选择头像
   */
  onChooseAvatar(e) {
    var that = this;

    // 未登录时引导登录
    if (!authManager.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }

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
    // 未登录时不保存
    if (!authManager.isLoggedIn()) return;
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
    // 未登录时不保存
    if (!authManager.isLoggedIn()) return;
    var value = e.detail.value;
    if (value && value.trim()) {
      var nickname = value.trim();
      this.setData({ nickname: nickname });
      app.saveUserInfo({ nickname: nickname });
    }
  },

  handleFeedbackTap() {
    authManager.ensureLogin(function () {
      wx.navigateTo({
        url: '/pages/feedback/index'
      });
    });
  },

  handlePrivacyTap() {
    wx.navigateTo({
      url: '/pages/privacy/index'
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
    authManager.ensureLogin(function () {
      wx.navigateTo({
        url: '/pages/slash/manage/index',
      });
    });
  },

  /** 账号管理：未登录→登录页，已登录→退出登录 */
  handleAccountTap() {
    var that = this;
    if (authManager.isLoggedIn()) {
      wx.showModal({
        title: '退出登录',
        content: '退出后将清除当前账号的所有本地数据（打卡记录、学习进度、错题本、历史记录等）。重新登录后可从云端恢复。',
        confirmText: '退出登录',
        confirmColor: '#FF3B30',
        success: function (res) {
          if (res.confirm) {
            authManager.logout();
            // 退出后立即刷新 UI 为默认值
            that.setData({
              isLoggedIn: false,
              avatarUrl: '',
              nickname: '导题斩题小工具用户',
              checkinStreak: 0,
              totalQuestions: 0,
              slashCount: 0,
              studyTimeText: '0小时',
            });
            wx.showToast({ title: '已退出登录', icon: 'none' });
          }
        }
      });
    } else {
      wx.navigateTo({
        url: '/pages/login/index'
      });
    }
  },
});
