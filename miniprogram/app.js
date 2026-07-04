// app.js

// 本地兜底背景图库（当云端未配置或加载失败时使用）
var BG_LIGHT_LIST_LOCAL = [
  "/images/bg-light/1.jpg",
  "/images/bg-light/2.jpg",
  "/images/bg-light/3.jpg",
  "/images/bg-light/7.jpg"
];

var BG_DARK_LIST_LOCAL = [
  "/images/bg-dark/夜间1.jpg",
  "/images/bg-dark/夜间2.jpg",
  "/images/bg-dark/夜间6.jpg"
];

// 云端背景图库（由 miniprogram/config/bg-cloud.js 配置）
var BG_CLOUD_LIGHT_LIST = [];
var BG_CLOUD_DARK_LIST = [];
try {
  var bgCloudConfig = require('./config/bg-cloud.js');
  if (bgCloudConfig && bgCloudConfig.light && bgCloudConfig.light.length > 0) {
    BG_CLOUD_LIGHT_LIST = bgCloudConfig.light;
  }
  if (bgCloudConfig && bgCloudConfig.dark && bgCloudConfig.dark.length > 0) {
    BG_CLOUD_DARK_LIST = bgCloudConfig.dark;
  }
} catch (e) {
  // 未配置云端背景图，静默使用本地兜底
}

// 获取当前主题对应的背景图库（优先云端）
function getBgList(isDark) {
  return isDark
    ? (BG_CLOUD_DARK_LIST.length > 0 ? BG_CLOUD_DARK_LIST : BG_DARK_LIST_LOCAL)
    : (BG_CLOUD_LIGHT_LIST.length > 0 ? BG_CLOUD_LIGHT_LIST : BG_LIGHT_LIST_LOCAL);
}

App({
  globalData: {
    env: "",
    backgroundImage: getBgList(false)[0] || "/images/bg-light/1.jpg",
    userInfo: null,
    avatarTempUrl: "",  // 预解析的 cloud fileID → temp URL，加速头像渲染
    avatarTempUrlExpire: 0,  // temp URL 过期时间戳，过期后回退到 cloud://
    themeMode: "system",    // 'light' | 'dark' | 'system'
    effectiveTheme: "light", // 实际生效的主题 'light' | 'dark'
    indexFirstLoaded: false   // 首页是否已加载过（控制骨架屏仅在冷启动时显示）
  },

  // 主题变化监听器（供 background-image 等组件订阅）
  _themeListeners: [],

  onThemeChange: function (cb) {
    this._themeListeners.push(cb);
  },

  offThemeChange: function (cb) {
    var idx = this._themeListeners.indexOf(cb);
    if (idx > -1) this._themeListeners.splice(idx, 1);
  },

  _notifyThemeChange: function () {
    for (var i = 0; i < this._themeListeners.length; i++) {
      try { this._themeListeners[i](); } catch (e) { /* ignore */ }
    }
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

    // 非关键初始化延迟到首屏渲染后执行，避免阻塞启动流程
    // - 静默初始化 openid：require 链加载 cloudSync + 异步云调用
    // - 斩题复活检查：同步读取多个 storage + 遍历计算
    // 两者均不影响首屏展示，延迟执行可加速冷启动
    setTimeout(function () {
      try {
        var authManager = require('./utils/authManager');
        authManager.silentInit();
      } catch (e) {
        // 忽略
      }

      try {
        var slashManager = require('./utils/slashManager');
        slashManager.checkAndRevive();
      } catch (e) {
        // 忽略复活检查失败
      }
    }, 0);

    // 监听系统主题变化，实现"跟随系统"实时切换
    var that = this;
    if (wx.onThemeChange) {
      wx.onThemeChange(function (res) {
        if (that.globalData.themeMode === 'system') {
          that.globalData.effectiveTheme = res.theme || 'light';
          that.applyThemeToUI();
          that.pickBackgroundImage();
          that._notifyThemeChange();
        }
      });
    }
  },

  /**
   * 获取当前主题对应的背景图库（供登录页等使用）
   * @param {boolean} isDark
   */
  getBgList: function (isDark) {
    return getBgList(isDark);
  },
  getEffectiveTheme: function () {
    if (this.globalData.themeMode === 'system') {
      try {
        // 仅使用 getAppBaseInfo 获取主题模式（3.5.0+ 基础库原生支持）
        // 该 API 不读取设备型号/系统版本等隐私信息，无需声明"设备信息"隐私接口
        var appBaseInfo = wx.getAppBaseInfo();
        return appBaseInfo.theme || 'light';
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
    this._notifyThemeChange();
  },

  /**
   * 从对应图库随机选一张背景图
   * 优先使用云端图库（若已配置），否则回退本地图库
   */
  pickBackgroundImage: function () {
    var list = getBgList(this.globalData.effectiveTheme === 'dark');
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
    var defaultUser = { nickname: '导题斩题小工具用户', avatarUrl: '' };

    // 1. 先从本地缓存读取（立即可用）
    try {
      var cached = wx.getStorageSync('userInfo');
      if (cached) {
        that.globalData.userInfo = cached;
      }
    } catch (e) {
      // 缓存读取失败，忽略
    }

    // 1b. 读取缓存的预解析头像 temp URL（避免每次都走云端解析）
    try {
      var cachedAvatarUrl = wx.getStorageSync('avatarTempUrl');
      var cachedExpire = wx.getStorageSync('avatarTempUrlExpire');
      if (cachedAvatarUrl && cachedExpire && cachedExpire > Date.now()) {
        // 缓存未过期，直接使用
        that.globalData.avatarTempUrl = cachedAvatarUrl;
        that.globalData.avatarTempUrlExpire = cachedExpire;
      } else if (cachedAvatarUrl) {
        // 缓存已过期，清除并稍后触发重新解析
        that.globalData.avatarTempUrl = '';
        that.globalData.avatarTempUrlExpire = 0;
        wx.removeStorageSync('avatarTempUrl');
        wx.removeStorageSync('avatarTempUrlExpire');
      }
    } catch (e) {
      // 忽略
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
        // 预解析 cloud fileID → temp URL
        that.preResolveAvatar();
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
   * 预解析头像 cloud fileID → temp URL
   *
   * <image src="cloud://..."> 每次渲染都需走云端解析，导致头像延迟出现。
   * 预先调用 getTempFileURL 获取 HTTP URL，WeChat 的 image 组件会缓存该 URL 对应的图片，
   * 后续渲染直接从缓存读取，实现与本地资源同步加载。
   *
   * temp URL 有效期约 2 小时，过期后返回 403。
   * 缓存时记录过期时间戳，getUserInfo() 检测过期后回退到 cloud:// 协议并触发重新解析。
   */
  preResolveAvatar: function () {
    var that = this;
    var avatarUrl = this.globalData.userInfo && this.globalData.userInfo.avatarUrl;

    if (!avatarUrl || avatarUrl.indexOf('cloud://') !== 0) {
      // 非 cloud fileID（本地路径或空），无需预解析
      return;
    }

    if (!wx.cloud || !wx.cloud.getTempFileURL) return;

    wx.cloud.getTempFileURL({
      fileList: [avatarUrl],
      success: function (res) {
        if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
          var tempUrl = res.fileList[0].tempFileURL;
          // 记录过期时间：当前时间 + 110 分钟（略小于 2 小时有效期，留安全余量）
          var expireAt = Date.now() + 110 * 60 * 1000;
          that.globalData.avatarTempUrl = tempUrl;
          that.globalData.avatarTempUrlExpire = expireAt;
          try {
            wx.setStorageSync('avatarTempUrl', tempUrl);
            wx.setStorageSync('avatarTempUrlExpire', expireAt);
          } catch (e) { /* ignore */ }
        }
      },
      fail: function () {
        // 预解析失败，静默降级 — <image> 会自行解析 cloud:// 协议
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
      // 头像变更后清除旧的 temp URL，并触发重新预解析
      this.globalData.avatarTempUrl = '';
      this.globalData.avatarTempUrlExpire = 0;
      try {
        wx.removeStorageSync('avatarTempUrl');
        wx.removeStorageSync('avatarTempUrlExpire');
      } catch (e) { /* ignore */ }
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

    // 头像变更后触发预解析（异步，不阻塞）
    if (info.avatarUrl !== undefined) {
      this.preResolveAvatar();
    }
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
   * 优先返回未过期的预解析 temp URL（加载快），过期则回退到 cloud:// 协议并触发重新解析
   */
  getUserInfo: function () {
    var info = this.globalData.userInfo || { nickname: '导题斩题小工具用户', avatarUrl: '' };
    // 如果有未过期的预解析 temp URL，用它替换 cloud fileID
    if (this.globalData.avatarTempUrl && this.globalData.avatarTempUrlExpire &&
        this.globalData.avatarTempUrlExpire > Date.now() &&
        info.avatarUrl && info.avatarUrl.indexOf('cloud://') === 0) {
      return {
        nickname: info.nickname,
        avatarUrl: this.globalData.avatarTempUrl
      };
    }
    // temp URL 过期或不存在 → 回退到 cloud:// 协议（<image> 会自行解析）
    // 同时异步触发重新预解析（仅在 cloud:// 且尚未在解析中时）
    if (info.avatarUrl && info.avatarUrl.indexOf('cloud://') === 0 && !this._resolvingAvatar) {
      this._resolvingAvatar = true;
      var that = this;
      setTimeout(function () {
        that.preResolveAvatar();
        that._resolvingAvatar = false;
      }, 100);
    }
    return info;
  },
});
