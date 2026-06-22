// app.js

// 亮色背景图库
var BG_LIGHT_LIST = [
  "/images/bg-light/1.jpg",
  "/images/bg-light/2.jpg",
  "/images/bg-light/3.jpg",
  "/images/bg-light/4.jpg",
  "/images/bg-light/5.jpg",
  "/images/bg-light/7.jpg"
];

// 深色背景图库
var BG_DARK_LIST = [
  "/images/bg-dark/夜间1.jpg",
  "/images/bg-dark/夜间2.jpg",
  "/images/bg-dark/夜间3.jpg",
  "/images/bg-dark/夜间4.jpg",
  "/images/bg-dark/夜间5.jpg",
  "/images/bg-dark/夜间6.jpg"
];

App({
  globalData: {
    env: "",
    backgroundImage: "/images/bg-light/1.jpg",
    userInfo: null,
    themeMode: "system",    // 'light' | 'dark' | 'system'
    effectiveTheme: "light" // 实际生效的主题 'light' | 'dark'
  },

  onLaunch: function () {
    // 读取持久化的主题模式
    try {
      var savedMode = wx.getStorageSync('themeMode');
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        this.globalData.themeMode = savedMode;
      }
    } catch (e) {
      // 忽略
    }

    // 计算生效主题并随机选图
    this.updateEffectiveTheme();
    this.pickBackgroundImage();

    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      // 从 envList 读取云环境 ID，未配置时使用默认环境
      var envList = require('./envList');
      var cloudEnv = (envList && envList.envList && envList.envList[0]) || '';
      this.globalData.env = cloudEnv;
      wx.cloud.init({
        env: cloudEnv,
        traceUser: true,
      });
    }

    // 加载用户资料
    this.loadUserProfile();

    // 斩题复活检查
    try {
      var slashManager = require('./utils/slashManager');
      slashManager.checkAndRevive();
    } catch (e) {
      // 忽略复活检查失败
    }
  },

  /**
   * 计算当前生效的主题
   */
  getEffectiveTheme: function () {
    if (this.globalData.themeMode === 'system') {
      try {
        var systemInfo = wx.getSystemInfoSync();
        return systemInfo.theme || 'light';
      } catch (e) {
        return 'light';
      }
    }
    return this.globalData.themeMode;
  },

  /**
   * 更新生效主题并应用 UI
   */
  updateEffectiveTheme: function () {
    this.globalData.effectiveTheme = this.getEffectiveTheme();
    this.applyThemeToUI();
  },

  /**
   * 切换主题模式
   */
  setThemeMode: function (mode) {
    if (mode !== 'light' && mode !== 'dark' && mode !== 'system') return;
    this.globalData.themeMode = mode;
    wx.setStorageSync('themeMode', mode);
    this.updateEffectiveTheme();
    this.pickBackgroundImage();
  },

  /**
   * 从对应图库随机选一张背景图
   */
  pickBackgroundImage: function () {
    var list = this.globalData.effectiveTheme === 'dark' ? BG_DARK_LIST : BG_LIGHT_LIST;
    var randomIndex = Math.floor(Math.random() * list.length);
    this.globalData.backgroundImage = list[randomIndex];
  },

  /**
   * 应用主题到 UI：导航栏 + 页面背景
   */
  applyThemeToUI: function () {
    var isDark = this.globalData.effectiveTheme === 'dark';
    wx.setNavigationBarColor({
      frontColor: isDark ? '#ffffff' : '#000000',
      backgroundColor: isDark ? '#0F172A' : '#F3F8FF',
      animation: { duration: 300, timingFunc: 'easeInOut' }
    });
    wx.setBackgroundColor({
      backgroundColor: isDark ? '#0F172A' : '#F3F8FF',
      backgroundColorTop: isDark ? '#0F172A' : '#F3F8FF',
      backgroundColorBottom: isDark ? '#0F172A' : '#F3F8FF'
    });
  },

  /**
   * 加载用户资料（云端优先，本地缓存兜底）
   */
  loadUserProfile: function () {
    var that = this;
    var defaultUser = { nickname: '考斩过用户', avatarUrl: '' };

    // 1. 先从本地缓存读取（立即可用）
    try {
      var cached = wx.getStorageSync('userInfo');
      if (cached) {
        that.globalData.userInfo = cached;
      }
    } catch (e) {
      // 缓存读取失败，忽略
    }

    // 2. 异步从云端获取
    var cloudAvailable = wx.cloud && that.globalData.env;
    if (!cloudAvailable) {
      if (!that.globalData.userInfo) {
        that.globalData.userInfo = defaultUser;
        that.saveUserInfoToCache(defaultUser);
      }
      return;
    }

    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: { type: 'getUserProfile' },
    }).then(function (res) {
      if (res.result && res.result.success && res.result.data) {
        var userData = res.result.data;
        that.globalData.userInfo = {
          nickname: userData.nickname || defaultUser.nickname,
          avatarUrl: userData.avatarUrl || '',
        };
        that.saveUserInfoToCache(that.globalData.userInfo);
      }
    }).catch(function (err) {
      console.warn('获取用户资料失败，使用本地缓存:', err);
      if (!that.globalData.userInfo) {
        that.globalData.userInfo = defaultUser;
        that.saveUserInfoToCache(defaultUser);
      }
    });
  },

  /**
   * 保存用户信息（本地缓存 + 云端同步）
   */
  saveUserInfo: function (info) {
    if (!this.globalData.userInfo) {
      this.globalData.userInfo = {};
    }
    if (info.nickname !== undefined) {
      this.globalData.userInfo.nickname = info.nickname;
    }
    if (info.avatarUrl !== undefined) {
      this.globalData.userInfo.avatarUrl = info.avatarUrl;
    }

    this.saveUserInfoToCache(this.globalData.userInfo);

    var cloudAvailable = wx.cloud && this.globalData.env;
    if (!cloudAvailable) return;

    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'updateUserProfile',
        nickname: info.nickname,
        avatarUrl: info.avatarUrl,
      },
    }).catch(function (err) {
      console.warn('同步用户资料到云端失败:', err);
    });
  },

  /**
   * 写入本地缓存
   */
  saveUserInfoToCache: function (userInfo) {
    try {
      wx.setStorageSync('userInfo', userInfo);
    } catch (e) {
      // 存储失败，忽略
    }
  },

  /**
   * 获取当前用户信息
   */
  getUserInfo: function () {
    return this.globalData.userInfo || { nickname: '考斩过用户', avatarUrl: '' };
  },
});
