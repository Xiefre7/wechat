Page({
  data: {
    isDark: false,
    feedbackTypes: [
      { id: "bug", label: "功能异常" },
      { id: "suggest", label: "功能建议" },
      { id: "content", label: "题目错误" },
      { id: "other", label: "其他问题" }
    ],
    selectedType: "other",
    content: "",
    contact: ""
  },

  onLoad(options) {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });

    if (options.type) {
      this.setData({ selectedType: options.type });
    }
    const label = options.label ? decodeURIComponent(options.label) : "问题反馈";
    wx.setNavigationBarTitle({ title: label });
  },

  onShow() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
  },

  handleTypeChange(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ selectedType: id });
  },

  handleContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  handleContactInput(e) {
    this.setData({ contact: e.detail.value });
  },

  handleSubmit() {
    const { selectedType, content, contact } = this.data;

    if (!content.trim()) {
      wx.showToast({
        title: "请填写问题描述",
        icon: "none"
      });
      return;
    }

    wx.showLoading({ title: "提交中…" });

    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'sendFeedback',
        feedbackType: selectedType,
        content: content.trim(),
        contact: contact.trim()
      },
      success: () => {
        wx.hideLoading();
        wx.showToast({
          title: "反馈已提交，感谢！",
          icon: "success"
        });
        setTimeout(() => {
          wx.navigateBack({
            fail() {
              wx.redirectTo({ url: "/pages/index/index" });
            }
          });
        }, 1200);
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('提交反馈失败:', err);
        wx.showToast({
          title: "提交失败，请稍后重试",
          icon: "none"
        });
      }
    });
  }
});
