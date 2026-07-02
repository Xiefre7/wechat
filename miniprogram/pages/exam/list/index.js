const CATEGORY_COLORS = {
  '数学': { bg: 'rgba(0,122,255,0.08)', text: '#007AFF' },
  '英语': { bg: 'rgba(52,199,89,0.08)', text: '#34C759' },
  '政治': { bg: 'rgba(255,149,0,0.08)', text: '#FF9500' },
  '语文': { bg: 'rgba(255,107,74,0.08)', text: '#FF6B4A' },
  '专业课': { bg: 'rgba(175,82,222,0.08)', text: '#AF52DE' },
};

var app = getApp();

Page({
  data: {
    tabs: [{ id: 'all', name: '全部' }],
    currentTab: 'all',
    exams: [],
    loaded: false,
    isDark: false,
  },

  onLoad() {
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
    this.loadData();
  },

  onShow() {
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /* ─── 加载分类和真题 ─── */
  async loadData() {
    wx.showNavigationBarLoading();
    try {
      await this.loadCategories();
      await this.loadExams('');
    } catch (e) {
      console.error('加载真题数据失败:', e);
    }
    this.setData({ loaded: true });
    wx.hideNavigationBarLoading();
  },

  /* ─── 加载分类 ─── */
  async loadCategories() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getExamCategories' },
      });
      if (res.result && res.result.success) {
        const categories = res.result.data || [];
        this.setData({
          tabs: [
            { id: 'all', name: '全部' },
            ...categories.map((c) => ({ id: c._id, name: c.name })),
          ],
        });
      }
    } catch (e) {
      console.error('加载真题分类失败:', e);
      // 降级：只显示"全部" tab
    }
  },

  /* ─── 加载真题列表 ─── */
  async loadExams(categoryId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getExamBanks',
          examCategoryId: categoryId || '',
        },
      });
      if (res.result && res.result.success) {
        const exams = (res.result.data || []).map((b) => ({
          ...b,
          categoryColor: CATEGORY_COLORS[b.category] || {
            bg: 'rgba(0,122,255,0.08)',
            text: '#007AFF',
          },
        }));
        this.setData({ exams });
      }
    } catch (e) {
      console.error('加载真题列表失败:', e);
      this.setData({ exams: [] });
    }
  },

  /* ─── Tab 切换 ─── */
  switchTab(e) {
    const { tab } = e.currentTarget.dataset;
    if (tab === this.data.currentTab) return;
    this.setData({ currentTab: tab, loaded: false });
    // 'all' 表示加载全部，否则按分类ID过滤
    this.loadExams(tab === 'all' ? '' : tab).then(() => {
      this.setData({ loaded: true });
    });
  },

  /* ─── 开始刷题 ─── */
  async startExam(e) {
    const { id } = e.currentTarget.dataset;
    const bank = this.data.exams.find((b) => b._id === id);
    if (!bank) return;

    wx.showLoading({ title: '加载题目...' });

    try {
      // 优先从云端获取题目
      let questions = [];
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getBankQuestions', bankId: id },
      });

      if (res.result && res.result.success && res.result.data.length > 0) {
        questions = res.result.data;
      } else {
        // 降级：尝试从本地 mock 数据获取
        try {
          const mockData = require('../../../data/mockData');
          questions = mockData.questions.filter((q) => q.bankId === id);
        } catch (mockErr) {
          // mock data 也没有，提示用户
        }
      }

      wx.hideLoading();

      if (questions.length === 0) {
        wx.showToast({ title: '该试卷暂无题目', icon: 'none' });
        return;
      }

      // 将题目格式统一为练习页需要的格式
      const normalizedQuestions = questions.map((q) => ({
        ...q,
        stem: q.stem || (q.content && q.content.stem) || '',
        options: q.options || (q.content && q.content.options) || [],
        answer: q.answer || (q.content && q.content.answer) || '',
        explanation: q.explanation || (q.content && q.content.explanation) || '',
      }));

      // 存储练习会话，复用现有刷题流程
      wx.setStorageSync('practiceSession', {
        bankId: bank._id,
        bankName: bank.name,
        bankType: bank.type || 'exam',
        bankCategory: bank.category || '',
        knowledgePointId: '',
        knowledgePointName: '',
        questions: normalizedQuestions,
        mode: 'practice',
      });

      wx.navigateTo({
        url: '/pages/practice/index',
      });
    } catch (e) {
      wx.hideLoading();
      console.error('加载题目失败:', e);
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  },
});
