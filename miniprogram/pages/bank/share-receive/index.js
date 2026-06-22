const mockData = require('../../../data/mockData');

Page({
  data: {
    isDark: false,
    loading: true,
    error: '',
    bank: null,
    questionCount: 0,
    importing: false,
    importSuccess: false,
  },

  onLoad(options) {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });

    // 从分享卡片进入：读取 shareCode 或 data
    const { shareCode, data } = options;

    if (shareCode) {
      this.loadFromCloud(shareCode);
    } else if (data) {
      this.loadFromData(data);
    } else {
      this.setData({
        loading: false,
        error: '无效的分享链接',
      });
    }
  },

  onShow() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
  },

  /* ─── 从云函数加载 ─── */
  loadFromCloud(shareCode) {
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: { type: 'getSharedBank', shareCode },
    }).then((res) => {
      if (res.result && res.result.success) {
        const { bank, questions } = res.result.data;
        this.setData({
          loading: false,
          bank,
          questionCount: questions ? questions.length : bank.questionCount,
        });
        this._sharedQuestions = questions;
      } else {
        this.setData({
          loading: false,
          error: res.result.message || '分享已过期或不存在',
        });
      }
    }).catch(() => {
      this.setData({
        loading: false,
        error: '网络异常，请稍后重试',
      });
    });
  },

  /* ─── 从本地编码数据加载（降级方案） ─── */
  loadFromData(data) {
    try {
      const pkg = JSON.parse(decodeURIComponent(data));
      const { bank, questions } = pkg;
      if (!bank || !questions) throw new Error('数据不完整');

      this.setData({
        loading: false,
        bank,
        questionCount: questions.length,
      });
      this._sharedQuestions = questions;
    } catch (e) {
      this.setData({
        loading: false,
        error: '分享数据解析失败',
      });
    }
  },

  /* ─── 导入题库 ─── */
  handleImport() {
    if (this.data.importing || this.data.importSuccess) return;

    this.setData({ importing: true });

    const { bank } = this.data;
    const questions = this._sharedQuestions || [];

    // 检查是否已导入过
    const existing = mockData.banks.find(
      (b) => b.name === bank.name && b.type === 'custom'
    );
    if (existing) {
      this.setData({
        importing: false,
        error: '该题库已存在，请勿重复导入',
      });
      return;
    }

    // 生成新题库
    const newBankId = 'bank_custom_' + Date.now();
    const newBank = {
      _id: newBankId,
      name: bank.name,
      type: 'custom',
      category: bank.category || '',
      subCategory: bank.subCategory || '',
      description: bank.description || '',
      coverImage: '',
      ownerId: 'shared',
      isPublic: false,
      questionCount: questions.length,
      knowledgePointCount: 0,
      tags: ['分享导入'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 为题目分配新 ID 和 bankId
    const newQuestions = questions.map((q, i) => ({
      ...q,
      _id: `${newBankId}_q${i + 1}`,
      bankId: newBankId,
      knowledgePointId: '',
    }));

    // 写入 mockData
    mockData.banks.push(newBank);
    newQuestions.forEach((q) => mockData.questions.push(q));

    this.setData({
      importing: false,
      importSuccess: true,
    });
  },

  /* ─── 去刷题 ─── */
  handleGoPractice() {
    wx.redirectTo({
      url: '/pages/bank/list/index',
    });
  },

  /* ─── 返回首页 ─── */
  handleGoHome() {
    wx.redirectTo({
      url: '/pages/index/index',
    });
  },
});
