var app = getApp();
var slashManager = require('../../utils/slashManager');
var checkinManager = require('../../utils/checkinManager');
var studyTimeManager = require('../../utils/studyTimeManager');
var wrongBook = require('../../utils/wrongBook');
var practiceHistoryManager = require('../../utils/practiceHistoryManager');
var authManager = require('../../utils/authManager');

// 模块级预读主题状态，确保第一帧的 theme-dark 类正确
var _initIsDark = (app && app.globalData) ? (app.globalData.effectiveTheme === 'dark') : false;
var _initThemeMode = (app && app.globalData) ? (app.globalData.themeMode || 'system') : 'system';
// 模块级预读用户信息，确保第一帧就有头像 URL，消除 avatar 延迟出现
var _initUserInfo = (app && app.getUserInfo) ? app.getUserInfo() : { nickname: '', avatarUrl: '' };

Page({
  data: {
    loading: !getApp().globalData.indexFirstLoaded,
    userName: "早上好",
    subtitle: "准备好开始今天的练习了吗？",
    reviveCount: 0,
    userAvatar: _initUserInfo.avatarUrl || '',
    nickname: _initUserInfo.nickname || '',
    showUserCard: false,
    themeMode: _initThemeMode,
    isDark: _initIsDark,
    summary: {
      totalSolved: 0,
      todaySolved: 0,
      totalWrong: 0,
      todayReview: 0,
      checkinStreak: 0,
      checkedInToday: false,
      weeklyStudyTime: '0小时',
      dueReview: 0
    },
    studySubjects: [],
    primaryCards: [
      {
        id: "study",
        title: "学习",
        desc: "进入主线课程，按部就班提升技能",
        icon: "/images/kzg/book-blue.svg",
        tone: "blue",
        metricLabel: "累计刷题",
        metricValue: "0",
        subMetricLabel: "今日刷题",
        subMetricValue: "0"
      },
      {
        id: "wrong",
        title: "错题",
        desc: "巩固错题，查漏补缺强化记忆",
        icon: "/images/kzg/slash-red.svg",
        tone: "red",
        metricLabel: "累计错题",
        metricValue: "0",
        subMetricLabel: "今日待复习",
        subMetricValue: "0"
      }
    ],
    quickActions: [
      {
        id: "import",
        label: "导入",
        icon: "/images/kzg/plus-blue.svg"
      },
      {
        id: "papers",
        label: "历届真题",
        icon: "/images/kzg/history-blue.svg"
      }
    ],
    subjects: [],
    news: [
      { id: "exam", tag: "考试政策", title: "福建职教高考备考资讯入口已预留" },
      { id: "slash", tag: "斩题机制", title: "近10题正确率达到80%后可触发斩题" }
    ],
    dockItems: [
      { id: "study", label: "学习", icon: "/images/kzg/book-blue.svg", active: true },
      { id: "mine", label: "我的", icon: "/images/kzg/user-blue.svg", active: false }
    ],
    historyBanks: []
  },

  onLoad() {
    // 启动优化：合并 5 次独立 setData 为 1 次，减少 JS-Native 桥通信开销
    // 所有数据均从本地管理器同步读取，不依赖网络请求
    var hour = new Date().getHours();
    var userName = "早上好";
    if (hour >= 12 && hour < 18) {
      userName = "下午好";
    } else if (hour >= 18 || hour < 5) {
      userName = "晚上好";
    }

    var userInfo = app.getUserInfo();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    var checkinInfo = checkinManager.getCheckinSummary();
    var wrongStats = wrongBook.getGlobalStats();
    var totalQuestions = studyTimeManager.getTotalQuestions();
    var todayQuestions = studyTimeManager.getTodayQuestions();
    var recent = practiceHistoryManager.getRecent(5);

    var historyList = recent.map(function (r) {
      return {
        id: r.bankId,
        name: r.bankName,
        subject: r.subject || 'other',
        subjectName: r.subjectName || r.category || '',
        lastTime: r.lastTimeText,
        progress: r.progress || 0,
        doneCount: r.totalDone || 0,
        totalCount: r.totalQuestions || 0
      };
    });

    // 标记首页已加载，后续 redirectTo 重建时不再显示骨架屏
    app.globalData.indexFirstLoaded = true;
    // 首次 onShow 跳过标记
    this._firstShow = true;

    this.setData({
      loading: false,
      userName: userName,
      userAvatar: userInfo.avatarUrl || '',
      themeMode: app.globalData.themeMode || 'system',
      nickname: userInfo.nickname || '导题斩题小工具用户',
      isDark: effectiveTheme === 'dark',
      'summary.checkinStreak': checkinInfo.streak,
      checkedInToday: checkinInfo.checkedInToday,
      'summary.weeklyStudyTime': studyTimeManager.getWeeklyFormatted(),
      'summary.dueReview': wrongStats.dueReview,
      'summary.totalSolved': totalQuestions,
      'summary.todaySolved': todayQuestions,
      'summary.totalWrong': wrongStats.totalWrong,
      'summary.todayReview': wrongStats.dueReview,
      'primaryCards[0].metricValue': String(totalQuestions),
      'primaryCards[0].subMetricValue': String(todayQuestions),
      'primaryCards[1].metricValue': String(wrongStats.totalWrong),
      'primaryCards[1].subMetricValue': String(wrongStats.dueReview),
      historyBanks: historyList
    });
  },

  onShow() {
    // 首次 onShow 跳过：onLoad 已完成所有数据设置
    // 避免页面创建后立即 setData 触发重渲染闪烁
    if (this._firstShow) {
      this._firstShow = false;
      return;
    }

    // 后续 onShow（从其他页返回时）刷新数据
    var userInfo = app.getUserInfo();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    var checkinInfo = checkinManager.getCheckinSummary();
    var wrongStats = wrongBook.getGlobalStats();
    var totalQuestions = studyTimeManager.getTotalQuestions();
    var todayQuestions = studyTimeManager.getTodayQuestions();
    var recent = practiceHistoryManager.getRecent(5);

    var historyList = recent.map(function (r) {
      return {
        id: r.bankId,
        name: r.bankName,
        subject: r.subject || 'other',
        subjectName: r.subjectName || r.category || '',
        lastTime: r.lastTimeText,
        progress: r.progress || 0,
        doneCount: r.totalDone || 0,
        totalCount: r.totalQuestions || 0
      };
    });

    var revive = slashManager.getReviveNotification();
    var reviveCount = (revive && !revive.seen && revive.count > 0) ? revive.count : 0;

    this.setData({
      userAvatar: userInfo.avatarUrl || '',
      themeMode: app.globalData.themeMode || 'system',
      nickname: userInfo.nickname || '导题斩题小工具用户',
      isDark: effectiveTheme === 'dark',
      'summary.checkinStreak': checkinInfo.streak,
      checkedInToday: checkinInfo.checkedInToday,
      'summary.weeklyStudyTime': studyTimeManager.getWeeklyFormatted(),
      'summary.dueReview': wrongStats.dueReview,
      'summary.totalSolved': totalQuestions,
      'summary.todaySolved': todayQuestions,
      'summary.totalWrong': wrongStats.totalWrong,
      'summary.todayReview': wrongStats.dueReview,
      'primaryCards[0].metricValue': String(totalQuestions),
      'primaryCards[0].subMetricValue': String(todayQuestions),
      'primaryCards[1].metricValue': String(wrongStats.totalWrong),
      'primaryCards[1].subMetricValue': String(wrongStats.dueReview),
      historyBanks: historyList,
      reviveCount: reviveCount
    });
  },

  loadUserData() {
    var userInfo = app.getUserInfo();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({
      userAvatar: userInfo.avatarUrl || '',
      themeMode: app.globalData.themeMode || 'system',
      nickname: userInfo.nickname || '导题斩题小工具用户',
      isDark: effectiveTheme === 'dark',
    });
  },

  /** 加载真实打卡数据 */
  loadCheckinData() {
    var info = checkinManager.getCheckinSummary();
    this.setData({
      'summary.checkinStreak': info.streak,
      checkedInToday: info.checkedInToday
    });
  },

  /** 加载学习时长 + 待复习数据 + 卡片统计 */
  loadStudyData() {
    var wrongStats = wrongBook.getGlobalStats();
    var totalQuestions = studyTimeManager.getTotalQuestions();
    var todayQuestions = studyTimeManager.getTodayQuestions();
    this.setData({
      'summary.weeklyStudyTime': studyTimeManager.getWeeklyFormatted(),
      'summary.dueReview': wrongStats.dueReview,
      'summary.totalSolved': totalQuestions,
      'summary.todaySolved': todayQuestions,
      'summary.totalWrong': wrongStats.totalWrong,
      'summary.todayReview': wrongStats.dueReview,
      'primaryCards[0].metricValue': String(totalQuestions),
      'primaryCards[0].subMetricValue': String(todayQuestions),
      'primaryCards[1].metricValue': String(wrongStats.totalWrong),
      'primaryCards[1].subMetricValue': String(wrongStats.dueReview)
    });
  },

  /** 加载最近练习历史（最多3条） */
  loadHistoryData() {
    var recent = practiceHistoryManager.getRecent(5);
    // 适配 wxml 字段
    var list = recent.map(function (r) {
      return {
        id: r.bankId,
        name: r.bankName,
        subject: r.subject || 'other',
        subjectName: r.subjectName || r.category || '',
        lastTime: r.lastTimeText,
        progress: r.progress || 0,
        doneCount: r.totalDone || 0,
        totalCount: r.totalQuestions || 0
      };
    });
    this.setData({ historyBanks: list });
  },

  /** 点击打卡 */
  handleCheckinTap() {
    // 登录拦截
    authManager.ensureLogin(function () {
      var result = checkinManager.doCheckin();
      this.setData({
        'summary.checkinStreak': result.streak,
        checkedInToday: true
      });

      if (result.isToday) {
        wx.showToast({
          title: result.streak > 1 ? '已连续打卡 ' + result.streak + ' 天！' : '打卡成功！',
          icon: 'success'
        });
      }
    }.bind(this));
  },

  onPullDownRefresh() {
    wx.showToast({
      title: "已刷新今日任务",
      icon: "none"
    });
    wx.stopPullDownRefresh();
  },

  updateGreeting() {
    const hour = new Date().getHours();
    let userName = "早上好";

    if (hour >= 12 && hour < 18) {
      userName = "下午好";
    } else if (hour >= 18 || hour < 5) {
      userName = "晚上好";
    }

    this.setData({ userName });
  },

  handlePrimaryTap(e) {
    const { id } = e.currentTarget.dataset;

    // 登录拦截
    authManager.ensureLogin(function () {
      if (id === 'study') {
        wx.navigateTo({
          url: '/pages/bank/list/index',
        });
        return;
      }

      if (id === 'wrong') {
        wx.navigateTo({
          url: '/pages/wrong/list/index',
        });
        return;
      }
    });
  },

  handleQuickAction(e) {
    const { id } = e.currentTarget.dataset;

    // 登录拦截
    authManager.ensureLogin(function () {
      if (id === 'import') {
        wx.navigateTo({
          url: '/pages/bank/import/index',
        });
        return;
      }

      if (id === 'papers') {
        wx.navigateTo({
          url: '/pages/exam/list/index',
        });
        return;
      }
    }.bind(this));
  },

  handleSubjectTap(e) {
    // 登录拦截
    authManager.ensureLogin(function () {
      // 跳转到题库选择页
      wx.navigateTo({
        url: '/pages/bank/list/index',
      });
    });
  },

  handleDockTap(e) {
    const { id } = e.currentTarget.dataset;

    if (id === "mine") {
      wx.redirectTo({
        url: '/pages/mine/index',
      });
      return;
    }

    // "学习" dock 需要登录
    authManager.ensureLogin(function () {
      wx.navigateTo({
        url: '/pages/bank/list/index',
      });
    });
  },


  handleHistoryTap(e) {
    // 登录拦截
    authManager.ensureLogin(function () {
      // 点击历史记录项 → 跳转到题库列表页（重新开始刷题需要选知识点）
      wx.switchTab({
        url: '/pages/bank/list/index',
        fail: function () {
          wx.navigateTo({ url: '/pages/bank/list/index' });
        }
      });
    });
  },

  handleHistoryMore() {
    // 登录拦截
    authManager.ensureLogin(function () {
      wx.navigateTo({
        url: '/pages/history/index',
      });
    });
  },

  openPlaceholder(title) {
    wx.navigateTo({
      url: `/pages/placeholder/index?title=${encodeURIComponent(title)}`
    });
  },

  /** 点击头像 — 显示信息卡片 */
  handleAvatarTap() {
    this.setData({ showUserCard: true });
  },

  /** 点击遮罩 — 隐藏卡片 */
  hideUserCard() {
    this.setData({ showUserCard: false });
  },

  /** 点击"编辑资料" — 跳转我的页面 */
  goToMine() {
    this.setData({ showUserCard: false });
    wx.navigateTo({
      url: '/pages/mine/index',
    });
  },

  /** 切换主题模式 */
  switchTheme(e) {
    var mode = e.currentTarget.dataset.mode;
    if (!mode) return;
    app.setThemeMode(mode);
    var isDark = app.globalData.effectiveTheme === 'dark';
    this.setData({ themeMode: mode, isDark: isDark });

    // 刷新当前页面的背景组件
    var bgComp = this.selectComponent('background-image');
    if (bgComp) {
      bgComp.refreshBackground();
    }

    // 更新导航栏颜色
    wx.setNavigationBarColor({
      frontColor: isDark ? '#ffffff' : '#000000',
      backgroundColor: isDark ? '#0F172A' : '#F3F8FF',
      animation: { duration: 300, timingFunc: 'easeInOut' }
    });
  },

  /** 阻止冒泡 */
  noop() {},

  /** 进入斩题管理页 */
  goSlashManage() {
    // 登录拦截
    authManager.ensureLogin(function () {
      slashManager.markReviveSeen();
      this.setData({ reviveCount: 0 });
      wx.navigateTo({
        url: '/pages/slash/manage/index',
      });
    }.bind(this));
  },
});
