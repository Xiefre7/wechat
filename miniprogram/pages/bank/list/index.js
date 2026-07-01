const mockData = require('../../../data/mockData');
const slashManager = require('../../../utils/slashManager');
const wrongBook = require('../../../utils/wrongBook');

const CATEGORY_COLORS = {
  '数学': { bg: 'rgba(0,122,255,0.08)', text: '#007AFF' },
  '英语': { bg: 'rgba(52,199,89,0.08)', text: '#34C759' },
  '政治': { bg: 'rgba(255,149,0,0.08)', text: '#FF9500' },
};

Page({
  data: {
    isDark: false,
    currentTab: 'official',
    banks: [],
    expandedBankId: '',
    showingKnowledgePoints: {},
    kpMap: {},
    memorizeMode: false,
  },

  onLoad() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });

    this.loadBanks();
  },

  onShow() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
  },

  /* ─── 全量题库（mockData + 云端自导入） ─── */
  _allBanks: [],
  _kpMap: {},

  /* ─── 加载题库 ─── */
  loadBanks() {
    // 1. 本地 mockData（官方题库 + 知识点）
    const localBanks = mockData.banks || [];
    const knowledgePoints = mockData.knowledgePoints || [];

    // 按知识点分组
    const kpMap = {};
    knowledgePoints.forEach((kp) => {
      if (!kpMap[kp.bankId]) kpMap[kp.bankId] = [];
      kpMap[kp.bankId].push(kp);
    });

    this._kpMap = kpMap;
    this._allBanks = localBanks;

    this.setData({ kpMap });
    this.filterBanks('official');

    // 2. 异步加载云端自导入题库（用户自己导入的）
    this.loadCloudBanks();
  },

  /* ─── 从云数据库加载用户导入的题库 ─── */
  loadCloudBanks() {
    var that = this;
    var cloudAvailable = wx.cloud && getApp().globalData.env !== 'your-cloud-env-id';

    if (!cloudAvailable) {
      // 云开发未配置，尝试直接查询（使用默认环境）
      try {
        var db = wx.cloud.database();
        db.collection('banks')
          .where({ type: 'custom' })
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get()
          .then(function (res) {
            that.mergeCloudBanks(res.data || []);
          })
          .catch(function () {
            // 静默降级，仅使用本地数据
          });
      } catch (e) {
        // 云数据库不可用，仅使用 mockData
      }
    } else {
      try {
        var db = wx.cloud.database();
        db.collection('banks')
          .where({ type: 'custom' })
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get()
          .then(function (res) {
            that.mergeCloudBanks(res.data || []);
          })
          .catch(function () {
            // 静默降级
          });
      } catch (e) {
        // 云数据库不可用
      }
    }
  },

  /* ─── 合并云端题库到本地列表 ─── */
  mergeCloudBanks(cloudBanks) {
    if (!cloudBanks || cloudBanks.length === 0) return;

    // 按名称去重（mockData 中已有的不重复添加）
    var existingNames = this._allBanks.map(function (b) { return b.name; });
    var newBanks = cloudBanks.filter(function (b) {
      return existingNames.indexOf(b.name) === -1;
    });

    if (newBanks.length > 0) {
      this._allBanks = this._allBanks.concat(newBanks);
    }

    // 刷新当前 tab 的显示
    this.filterBanks(this.data.currentTab);
  },

  /* ─── Tab 切换 ─── */
  switchTab(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ currentTab: tab, expandedBankId: '', memorizeMode: false });
    this.filterBanks(tab);
  },

  /* ─── 模式切换（自导入题库专用） ─── */
  switchMode(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({ memorizeMode: mode === 'memorize' });
  },

  filterBanks(tab) {
    const allBanks = this._allBanks;
    const banks = allBanks
      .filter((b) => (tab === 'official' ? b.type === 'official' : b.type === 'custom'))
      .map((b) => ({
        ...b,
        categoryColor: CATEGORY_COLORS[b.category] || { bg: 'rgba(0,122,255,0.08)', text: '#007AFF' },
        progress: this.calcBankProgress(b),
      }));
    this.setData({ banks });
  },

  /* ─── 计算进度 ─── */
  calcBankProgress(bank) {
    const kps = this._kpMap[bank._id] || [];
    if (kps.length === 0) return 0;
    const progressData = wx.getStorageSync('kpProgress') || {};
    let total = 0;
    let mastered = 0;
    kps.forEach((kp) => {
      total += kp.questionCount;
      if (progressData[kp._id] && progressData[kp._id].slashed) {
        mastered += kp.questionCount;
      }
    });
    return total > 0 ? Math.round((mastered / total) * 100) : 0;
  },

  /* ─── 展开/收起知识点 ─── */
  toggleKnowledgePoints(e) {
    const { bankId } = e.currentTarget.dataset;
    const isExpanded = this.data.expandedBankId === bankId;
    this.setData({
      expandedBankId: isExpanded ? '' : bankId,
    });
  },

  /* ─── 开始刷题 ─── */
  startPractice(e) {
    const { bankId, kpId } = e.currentTarget.dataset;
    const bank = this._allBanks.find((b) => b._id === bankId);
    if (!bank) {
      wx.showToast({ title: '题库不存在', icon: 'none' });
      return;
    }

    // 官方题库按知识点 → 随机选择题类
    if (kpId && bank.type === 'official') {
      this.startOfficialPractice(bank, kpId);
      return;
    }

    // 自导入题库：检查是否为云端题库
    if (bank.type === 'custom' && !mockData.banks.find((b) => b._id === bankId)) {
      // 云端自导入题库 → 从云数据库加载题目
      this.startCloudBankPractice(bank);
      return;
    }

    // 本地自导入题库
    let questions = mockData.questions.filter((q) => q.bankId === bankId);
    if (bank.type === 'custom') {
      questions = questions.filter((q) => !slashManager.isCustomQuestionSlashed(q._id));
    }

    if (questions.length === 0) {
      wx.showToast({ title: '该题库暂无题目（可能已被全部斩掉）', icon: 'none' });
      return;
    }

    this.navigateToPractice(bank, questions, '');
  },

  /* ─── 云端自导入题库 → 加载题目并开始刷题 ─── */
  startCloudBankPractice(bank) {
    var that = this;
    wx.showLoading({ title: '加载题目中...' });

    wx.cloud.database().collection('questions')
      .where({ bankId: bank._id, status: 'active' })
      .limit(500)
      .get()
      .then(function (res) {
        wx.hideLoading();
        var questions = res.data || [];
        if (questions.length === 0) {
          wx.showToast({ title: '该题库暂无题目', icon: 'none' });
          return;
        }
        // 过滤已斩单题
        questions = questions.filter(function (q) {
          return !slashManager.isCustomQuestionSlashed(q._id);
        });
        that.navigateToPractice(bank, questions, '');
      })
      .catch(function (err) {
        wx.hideLoading();
        console.error('加载云端题目失败:', err);
        wx.showToast({ title: '加载失败，请检查网络', icon: 'none' });
      });
  },

  /** 官方题库：随机选一个未斩题类开始刷题 */
  startOfficialPractice(bank, kpId) {
    const kp = mockData.knowledgePoints.find((k) => k._id === kpId);
    const kpName = kp ? kp.name : '';

    // 获取该知识点下所有题类
    const allClasses = mockData.questionClasses.filter((qc) => qc.knowledgePointId === kpId);
    if (allClasses.length === 0) {
      // 没有题类 → 回退到按知识点所有题刷
      const questions = mockData.questions.filter((q) => q.knowledgePointId === kpId);
      if (questions.length === 0) {
        wx.showToast({ title: '该知识点暂无题目', icon: 'none' });
        return;
      }
      this.navigateToPractice(bank, questions, kpId, kpName);
      return;
    }

    // 过滤未斩题类
    const unslashedClasses = allClasses.filter((qc) => !slashManager.isClassSlashed(qc._id));

    if (unslashedClasses.length === 0) {
      wx.showModal({
        title: '全部已斩',
        content: '该知识点下所有题类都已被斩掉！\n\n斩掉的题类将在7天后自动复活。',
        showCancel: true,
        confirmText: '重新挑战',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            // 从所有题类中随机选
            const randomClass = allClasses[Math.floor(Math.random() * allClasses.length)];
            const questions = mockData.questions.filter(
              (q) => q.questionClassId === randomClass._id
            );
            this.navigateToPracticeWithClass(bank, questions, kpId, kpName, randomClass, allClasses);
          }
        },
      });
      return;
    }

    // 随机选一个未斩题类
    const chosenClass = unslashedClasses[Math.floor(Math.random() * unslashedClasses.length)];
    const questions = mockData.questions.filter((q) => q.questionClassId === chosenClass._id);

    // 随机打乱题目顺序
    this.shuffleArray(questions);

    this.navigateToPracticeWithClass(bank, questions, kpId, kpName, chosenClass, allClasses);
  },

  /** 随机打乱数组 */
  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  },

  /** 跳转到练习页（带题类信息） */
  navigateToPracticeWithClass(bank, questions, kpId, kpName, currentClass, allClasses) {
    wx.setStorageSync('practiceSession', {
      bankId: bank._id,
      bankName: bank.name,
      bankType: bank.type,
      knowledgePointId: kpId,
      knowledgePointName: kpName,
      questionClassId: currentClass._id,
      questionClassName: currentClass.name,
      allClassIds: allClasses.map((c) => c._id),
      questions,
      mode: this.data.memorizeMode ? 'memorize' : 'practice',
    });

    wx.navigateTo({
      url: '/pages/practice/index',
    });
  },

  navigateToPractice(bank, questions, knowledgePointId, kpNameOverride) {
    let kpName = kpNameOverride || '';
    if (!kpName && knowledgePointId) {
      const kp = mockData.knowledgePoints.find((k) => k._id === knowledgePointId);
      if (kp) kpName = kp.name;
    }

    // 确保题目有统一的 content.* 格式（兼容云端扁平格式）
    const normalizedQuestions = questions.map((q) => ({
      ...q,
      content: q.content || {
        stem: q.stem || '',
        options: q.options || [],
        answer: q.answer || '',
        explanation: q.explanation || '',
      },
    }));

    wx.setStorageSync('practiceSession', {
      bankId: bank._id,
      bankName: bank.name,
      bankType: bank.type,
      knowledgePointId,
      knowledgePointName: kpName,
      questionClassId: '',
      questionClassName: '',
      allClassIds: [],
      questions: normalizedQuestions,
      mode: this.data.memorizeMode ? 'memorize' : 'practice',
    });

    wx.navigateTo({
      url: '/pages/practice/index',
    });
  },

  /* ─── 删除自导入题库 ─── */
  deleteBank(e) {
    const { bankId, bankName } = e.currentTarget.dataset;
    const that = this;

    wx.showModal({
      title: '删除题库',
      content: '确定要删除「' + bankName + '」吗？\n\n删除后题库和错题本中该题库的记录将一并清除，此操作不可撤销。',
      confirmText: '删除',
      confirmColor: '#FF3B30',
      cancelText: '取消',
      success(res) {
        if (!res.confirm) return;

        wx.showLoading({ title: '删除中...' });

        // 判断是否为本地 mock 数据（非云端题库）
        var isMockBank = mockData.banks.some(function (b) { return b._id === bankId; });

        if (isMockBank) {
          // 本地 mock 数据：直接清理本地，无需调云函数
          that.performLocalCleanup(bankId);
          wx.hideLoading();
          wx.showToast({ title: '已删除', icon: 'success' });
        } else {
          // 云端题库：调云函数删除云端数据，成功后清理本地
          that.deleteFromCloud(bankId).then(function () {
            that.performLocalCleanup(bankId);
            wx.hideLoading();
            wx.showToast({ title: '已删除', icon: 'success' });
          }).catch(function (err) {
            wx.hideLoading();
            console.error('删除题库失败:', err);
            // 云函数失败也清理本地数据
            that.performLocalCleanup(bankId);
            wx.showToast({ title: '已从本地移除（云端同步失败）', icon: 'none', duration: 2500 });
          });
        }
      },
    });
  },

  /* ─── 本地清理：移除列表 + 错题本 + 收起展开 ─── */
  performLocalCleanup(bankId) {
    this._allBanks = this._allBanks.filter(function (b) { return b._id !== bankId; });
    wrongBook.removeByBankId(bankId);
    if (this.data.expandedBankId === bankId) {
      this.setData({ expandedBankId: '' });
    }
    this.filterBanks(this.data.currentTab);
  },

  /* ─── 调用云函数删除题库 ─── */
  deleteFromCloud(bankId) {
    return new Promise(function (resolve, reject) {
      try {
        wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'deleteBank',
            bankId: bankId,
          },
        }).then(function (res) {
          if (res.result && res.result.success) {
            resolve(res.result);
          } else {
            reject(new Error(res.result && res.result.errMsg ? res.result.errMsg : '云函数返回失败'));
          }
        }).catch(function (err) {
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  },

  /* ─── 跳转导入 ─── */
  goImport() {
    wx.navigateTo({
      url: '/pages/bank/import/index',
    });
  },

  /* ─── 分享题库 ─── */
  onShareAppMessage(options) {
    // 仅从 share 按钮触发（options.from === 'button'）
    const bankId = options.target && options.target.dataset && options.target.dataset.bankId;
    if (!bankId) {
      return { title: '导题斩题小工具 - 职教高考刷题', path: '/pages/index/index' };
    }

    const bank = this._allBanks.find((b) => b._id === bankId);
    if (!bank || bank.type !== 'custom') {
      return { title: '导题斩题小工具 - 职教高考刷题', path: '/pages/index/index' };
    }

    // 异步调用云函数存储题库并获取分享码
    // 如果云函数未部署，降级为本地编码
    return this.prepareShareData(bank);
  },

  prepareShareData(bank) {
    // 本地题库：从 mockData 取题；云端题库：从云数据库取题
    const localQuestions = mockData.questions.filter((q) => q.bankId === bank._id);
    if (localQuestions.length > 0) {
      return this.doShare(bank, localQuestions);
    }
    // 云端自导入题库
    return wx.cloud.database().collection('questions')
      .where({ bankId: bank._id })
      .limit(500)
      .get()
      .then((res) => this.doShare(bank, res.data || []))
      .catch(() => {
        wx.showToast({ title: '无法获取题目数据', icon: 'none' });
        return { title: bank.name, path: '/pages/index/index' };
      });
  },

  doShare(bank, questions) {
    return wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'shareBank',
        bank: {
          name: bank.name,
          type: bank.type,
          category: bank.category,
          subCategory: bank.subCategory || '',
          description: bank.description || '',
          questionCount: questions.length,
        },
        questions,
      },
    }).then((res) => {
      if (res.result && res.result.success && res.result.shareCode) {
        return {
          title: `【题库】${bank.name}`,
          path: `/pages/bank/share-receive/index?shareCode=${res.result.shareCode}`,
          imageUrl: '',
        };
      }
      throw new Error('云函数返回失败');
    }).catch(() => {
      // 降级：将数据编码到 path（仅适合小题库）
      const pkg = { bank, questions };
      const json = JSON.stringify(pkg);
      if (json.length > 800) {
        wx.showModal({
          title: '题库较大',
          content: '该题库题目较多，无法通过链接直接分享。\n\n建议：在微信云开发控制台上传并部署 quickstartFunctions 云函数后重试。',
          showCancel: false,
          confirmText: '知道了',
        });
        return { title: '【题库】' + bank.name + '（需部署云函数后分享）', path: '/pages/index/index' };
      }
      const code = encodeURIComponent(json);
      return {
        title: `【题库】${bank.name}`,
        path: `/pages/bank/share-receive/index?data=${code}`,
        imageUrl: '',
      };
    });
  },
});
