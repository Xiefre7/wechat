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

    // 通过云函数持久化导入（写入云数据库）
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'importBank',
        bankName: bank.name,
        bankType: 'custom',
        questions: questions.map(function (q) {
          return {
            type: q.type || 'single_choice',
            stem: (q.content ? q.content.stem : q.stem) || '',
            options: (q.content ? q.content.options : q.options) || [],
            answer: (q.content ? q.content.answer : q.answer) || '',
            explanation: (q.content ? q.content.explanation : q.explanation) || '',
            stemImages: (q.content ? q.content.stemImages : q.stemImages) || [],
            explanationImages: (q.content ? q.content.explanationImages : q.explanationImages) || [],
          };
        }),
        source: 'share',
      },
    }).then((res) => {
      if (res.result && res.result.success) {
        this.setData({
          importing: false,
          importSuccess: true,
        });
      } else {
        this.setData({
          importing: false,
          error: (res.result && res.result.errMsg) || '导入失败，请稍后重试',
        });
      }
    }).catch(() => {
      this.setData({
        importing: false,
        error: '网络异常，请稍后重试',
      });
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
