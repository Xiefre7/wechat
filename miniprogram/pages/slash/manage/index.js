const slashManager = require('../../../utils/slashManager');
const mockData = require('../../../data/mockData');
const app = getApp();

Page({
  data: {
    classItems: [],
    customItems: [],
    rollbackRemaining: 3,
    hasItems: false,
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
    this.loadData();
  },

  loadData() {
    const { classItems, customItems } = slashManager.getAllSlashedItems();
    const remaining = slashManager.getRollbackRemaining();

    // 题类：补充知识点和题库信息
    const enrichedClassItems = classItems.map((item) => {
      // 用 questionClassId 反查所属知识点
      const qc = mockData.questionClasses.find((c) => c._id === item.id);
      const kpName = qc ? (mockData.knowledgePoints.find((k) => k._id === qc.knowledgePointId) || {}).name || '' : '';
      const bankId = qc ? qc.knowledgePointId : '';
      const bankName = kpName ? this.getBankNameByKpId(qc.knowledgePointId) : '';
      return { ...item, kpName, bankName: bankName || kpName };
    });

    // 自导入：使用存储的 stem
    const enrichedCustomItems = customItems.map((item) => ({
      ...item,
      name: item.name || item.id,
    }));

    this.setData({
      classItems: enrichedClassItems,
      customItems: enrichedCustomItems,
      rollbackRemaining: remaining,
      hasItems: enrichedClassItems.length > 0 || enrichedCustomItems.length > 0,
    });
  },

  getBankNameByKpId(kpId) {
    const kp = mockData.knowledgePoints.find((k) => k._id === kpId);
    if (!kp) return '';
    const bank = mockData.banks.find((b) => b._id === kp.bankId);
    return bank ? bank.name : '';
  },

  rollbackClass(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '撤销斩题',
      content: '该题类将重新出现在刷题列表中。\n（今日剩余 ' + this.data.rollbackRemaining + ' 次）',
      confirmText: '确认撤销',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const result = slashManager.rollbackClassSlash(id);
          if (result.success) {
            wx.showToast({ title: '已撤销', icon: 'success' });
            this.loadData();
          } else {
            wx.showToast({ title: result.errMsg, icon: 'none' });
          }
        }
      },
    });
  },

  rollbackCustom(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '撤销斩题',
      content: '该题将重新出现在刷题列表中。\n（今日剩余 ' + this.data.rollbackRemaining + ' 次）',
      confirmText: '确认撤销',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const result = slashManager.rollbackCustomSlash(id);
          if (result.success) {
            wx.showToast({ title: '已撤销', icon: 'success' });
            this.loadData();
          } else {
            wx.showToast({ title: result.errMsg, icon: 'none' });
          }
        }
      },
    });
  },
});
