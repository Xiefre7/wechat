var app = getApp();
var slashManager = require('../../utils/slashManager');
var checkinManager = require('../../utils/checkinManager');
var studyTimeManager = require('../../utils/studyTimeManager');
var wrongBook = require('../../utils/wrongBook');
var practiceHistoryManager = require('../../utils/practiceHistoryManager');

Page({
  data: {
    userName: "早上好",
    subtitle: "准备好开始今天的练习了吗？",
    reviveCount: 0,
    userAvatar: "",
    nickname: "",
    showUserCard: false,
    themeMode: "system",
    isDark: false,
    // TODO: 接入云数据库后改为从云端拉取真实统计数据
    summary: {
      totalSolved: 1280,
      todaySolved: 45,
      totalWrong: 156,
      todayReview: 12,
      checkinStreak: 0,
      checkedInToday: false,
      weeklyStudyTime: '0小时',
      dueReview: 0
    },
    studySubjects: [
      { id: "math", name: "数学", progress: 72, color: "#007AFF" },
      { id: "english", name: "英语", progress: 48, color: "#34C759" },
      { id: "politics", name: "政治", progress: 36, color: "#FF9500" }
    ],
    primaryCards: [
      {
        id: "study",
        title: "学习",
        desc: "进入主线课程，按部就班提升技能",
        icon: "/images/kzg/book-blue.svg",
        tone: "blue",
        metricLabel: "累计刷题",
        metricValue: "1280",
        subMetricLabel: "今日刷题",
        subMetricValue: "45"
      },
      {
        id: "wrong",
        title: "错题",
        desc: "巩固错题，查漏补缺强化记忆",
        icon: "/images/kzg/slash-red.svg",
        tone: "red",
        metricLabel: "累计错题",
        metricValue: "156",
        subMetricLabel: "今日待复习",
        subMetricValue: "12"
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
      },
      {
        id: "policy",
        label: "政策",
        icon: "/images/kzg/file-blue.svg"
      },
      {
        id: "qa",
        label: "在线答疑",
        icon: "/images/kzg/chat-blue.svg"
      }
    ],
    subjects: [
      { id: "math", name: "数学", progress: 72, count: "2000题", points: "45个知识点" },
      { id: "english", name: "英语", progress: 48, count: "1800题", points: "38个知识点" },
      { id: "politics", name: "政治", progress: 36, count: "1200题", points: "30个知识点" }
    ],
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
    this.updateGreeting();
    this.loadUserData();
    this.loadCheckinData();
    this.loadStudyData();
    this.loadHistoryData();
  },

  onShow() {
    // 每次显示时刷新用户数据（从练习页返回时历史/时长可能已更新）
    this.loadUserData();
    this.loadCheckinData();
    this.loadStudyData();
    this.loadHistoryData();
    var revive = slashManager.getReviveNotification();
    if (revive && !revive.seen && revive.count > 0) {
      this.setData({ reviveCount: revive.count });
    } else {
      this.setData({ reviveCount: 0 });
    }
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

  /** 加载学习时长 + 待复习数据 */
  loadStudyData() {
    this.setData({
      'summary.weeklyStudyTime': studyTimeManager.getWeeklyFormatted(),
      'summary.dueReview': wrongBook.getGlobalStats().dueReview
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
  },

  handleQuickAction(e) {
    const { id } = e.currentTarget.dataset;

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

    const actionMap = {
      policy: '政策资讯',
      qa: '在线答疑',
    };

    this.openPlaceholder(actionMap[id]);
  },

  handleSubjectTap(e) {
    // 跳转到题库选择页
    wx.navigateTo({
      url: '/pages/bank/list/index',
    });
  },

  handleDockTap(e) {
    const { id } = e.currentTarget.dataset;

    if (id === "study") {
      wx.navigateTo({
        url: '/pages/bank/list/index',
      });
      return;
    }

    if (id === "mine") {
      wx.redirectTo({
        url: '/pages/mine/index',
      });
      return;
    }

    this.openPlaceholder("我的");
  },


  handleHistoryTap(e) {
    // 点击历史记录项 → 跳转到题库列表页（重新开始刷题需要选知识点）
    wx.switchTab({
      url: '/pages/bank/list/index',
      fail: function () {
        wx.navigateTo({ url: '/pages/bank/list/index' });
      }
    });
  },

  handleHistoryMore() {
    wx.navigateTo({
      url: '/pages/history/index',
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
    slashManager.markReviveSeen();
    this.setData({ reviveCount: 0 });
    wx.navigateTo({
      url: '/pages/slash/manage/index',
    });
  },
});
