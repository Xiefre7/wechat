var app = getApp();
var slashManager = require('../../utils/slashManager');

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
      checkinStreak: 7,
      slashCount: 18
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
    historyBanks: [
      {
        id: "h1",
        name: "2024福建职教高考数学真题",
        subject: "math",
        subjectName: "数学",
        lastTime: "3天前",
        progress: 72,
        doneCount: 36,
        totalCount: 50
      },
      {
        id: "h2",
        name: "英语高频词汇练习",
        subject: "english",
        subjectName: "英语",
        lastTime: "昨天",
        progress: 45,
        doneCount: 90,
        totalCount: 200
      },
      {
        id: "h3",
        name: "政治时事热点题库",
        subject: "politics",
        subjectName: "政治",
        lastTime: "5天前",
        progress: 28,
        doneCount: 14,
        totalCount: 50
      }
    ]
  },

  onLoad() {
    this.updateGreeting();
    this.loadUserData();
  },

  onShow() {
    // 每次显示时刷新用户数据（从 mine 页返回时可能已更新）
    this.loadUserData();
    // 检查斩题复活通知
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
      nickname: userInfo.nickname || '考斩过用户',
      isDark: effectiveTheme === 'dark',
    });
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
    const { id } = e.currentTarget.dataset;
    const bank = this.data.historyBanks.find(b => b.id === id);
    if (bank) {
      wx.navigateTo({
        url: `/pages/practice/index?bankId=${id}&bankName=${encodeURIComponent(bank.name)}`,
      });
    }
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
