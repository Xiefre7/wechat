const wrongBook = require('../../../utils/wrongBook');

const TYPE_LABELS = {
  single_choice: '单选',
  multi_choice: '多选',
  true_false: '判断',
  fill_blank: '填空',
  short_answer: '简答',
};

Page({
  data: {
    isDark: false,
    bankGroups: [],
    globalStats: { totalWrong: 0, dueReview: 0, mastered: 0 },
    expandedBankId: '',
    flatList: {},
    isEmpty: true,
  },

  onLoad() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
  },

  onShow() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
    this.loadData();
  },

  /* ─── 加载错题数据 ─── */
  loadData() {
    const globalStats = wrongBook.getGlobalStats();
    const bankStats = wrongBook.getStatsByBank();

    // 按题库分组，每组内按状态排序（待复习在前）
    const bankGroups = bankStats.map((stat) => {
      const allWrong = wrongBook.getWrongByBank(stat.bankId, 'all');
      // 待复习优先，然后按加入时间倒序
      const sorted = [...allWrong].sort((a, b) => {
        if (a.status === 'reviewing' && b.status === 'mastered') return -1;
        if (a.status === 'mastered' && b.status === 'reviewing') return 1;
        const aDue = new Date(a.nextReviewAt) <= new Date() ? 1 : 0;
        const bDue = new Date(b.nextReviewAt) <= new Date() ? 1 : 0;
        if (aDue !== bDue) return bDue - aDue;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      return {
        ...stat,
        questions: sorted.map((w) => this.formatWrongItem(w)),
      };
    });

    this.setData({
      bankGroups,
      globalStats,
      isEmpty: bankGroups.length === 0,
    });
  },

  /* ─── 格式化单条错题 ─── */
  formatWrongItem(w) {
    const q = w.question || {};
    const isDue = w.status === 'reviewing' && new Date(w.nextReviewAt) <= new Date();

    let typeLabel = '未知';
    if (q.type) {
      typeLabel = TYPE_LABELS[q.type] || '未知';
    }

    return {
      _id: w._id,
      questionId: w.questionId,
      bankId: w.bankId,
      typeLabel,
      stem: q.content ? q.content.stem : (q.stem || '（题目已移除）'),
      answer: q.content ? q.content.answer : (q.answer || ''),
      source: w.source,
      sourceLabel: w.source === 'auto' ? '自动收录' : '手动添加',
      status: w.status,
      statusLabel: w.status === 'mastered' ? '已消灭' : '复习中',
      isDue,
      nextReviewLabel: this.formatNextReview(w.nextReviewAt, w.status),
      errorCount: w.errorCount,
      reviewCount: w.reviewCount,
      consecutiveReviewCorrect: w.consecutiveReviewCorrect,
      currentIntervalIndex: w.currentIntervalIndex,
    };
  },

  /* ─── 格式化下次复习时间 ─── */
  formatNextReview(nextReviewAt, status) {
    if (status === 'mastered') return '已掌握 ✓';
    const now = new Date();
    const reviewDate = new Date(nextReviewAt);
    const diffMs = reviewDate - now;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffMs <= 0) return '现在可复习';
    if (diffHours < 24) return `${diffHours}小时后`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return '明天';
    return `${diffDays}天后`;
  },

  /* ─── 展开/收起题库分组 ─── */
  toggleBank(e) {
    const { bankId } = e.currentTarget.dataset;
    const isExpanded = this.data.expandedBankId === bankId;
    this.setData({
      expandedBankId: isExpanded ? '' : bankId,
    });
  },

  /* ─── 开始复习 ─── */
  startReview(e) {
    const { bankId } = e.currentTarget.dataset;
    const bankGroup = this.data.bankGroups.find((g) => g.bankId === bankId);
    if (!bankGroup) return;

    // 获取待复习题目（优先），没有则获取全部复习中题目
    let reviewQuestions = bankGroup.questions.filter((q) => q.isDue);
    if (reviewQuestions.length === 0) {
      reviewQuestions = bankGroup.questions.filter((q) => q.status === 'reviewing');
    }

    if (reviewQuestions.length === 0) {
      wx.showToast({ title: '该题库暂无待复习错题', icon: 'none' });
      return;
    }

    // 获取完整错题数据
    const fullRecords = wrongBook.getWrongByBank(bankId, 'reviewing')
      .filter((w) => {
        // 只复习待复习的
        const now = new Date();
        return new Date(w.nextReviewAt) <= now;
      })
      .sort((a, b) => new Date(a.nextReviewAt) - new Date(b.nextReviewAt));

    if (fullRecords.length === 0) {
      // 如果没有到期但用户强行复习，取所有复习中的
      const allReviewing = wrongBook.getWrongByBank(bankId, 'reviewing');
      if (allReviewing.length === 0) {
        wx.showToast({ title: '该题库暂无待复习错题', icon: 'none' });
        return;
      }
      // 存储复习列表
      wx.setStorageSync('wrongReviewList', allReviewing.map((w) => w._id));
    } else {
      wx.setStorageSync('wrongReviewList', fullRecords.map((w) => w._id));
    }

    wx.navigateTo({
      url: '/pages/wrong/review/index?bankId=' + encodeURIComponent(bankId),
    });
  },

  /* ─── 查看单题详情 ─── */
  viewDetail(e) {
    const { wrongId } = e.currentTarget.dataset;
    // 展开该题的详细信息（切换）
    const book = wrongBook.getWrongBook();
    const record = book.find((w) => w._id === wrongId);
    if (!record) return;

    wx.showModal({
      title: '错题详情',
      content: `收录方式：${record.source === 'auto' ? '自动收录' : '手动添加'}\n错误次数：${record.errorCount}\n复习次数：${record.reviewCount}\n连续正确：${record.consecutiveReviewCorrect}次\n状态：${record.status === 'mastered' ? '已消灭' : '复习中'}`,
      showCancel: true,
      confirmText: '移除此题',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          wrongBook.removeWrong(wrongId);
          this.loadData();
          wx.showToast({ title: '已移除', icon: 'success' });
        }
      },
    });
  },

  /* ─── 清除已掌握 ─── */
  cleanMastered() {
    wx.showModal({
      title: '清理已消灭错题',
      content: '确定要清除所有已消灭的错题吗？此操作不可恢复。',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wrongBook.cleanMastered();
          this.loadData();
          wx.showToast({ title: '已清理', icon: 'success' });
        }
      },
    });
  },

  /* ─── 返回 ─── */
  goBack() {
    wx.navigateBack({
      fail() {
        wx.redirectTo({ url: '/pages/index/index' });
      },
    });
  },
});
