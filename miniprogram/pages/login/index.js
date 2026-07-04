var app = getApp();
var authManager = require('../../utils/authManager');

// 登录页背景图统一从 app.js 获取，以支持云端/本地自动切换
function pickLoginBg() {
  var list = app.getBgList ? app.getBgList(false) : [];
  if (!list || list.length === 0) {
    list = ["/images/bg-light/1.jpg"];
  }
  return list[Math.floor(Math.random() * list.length)];
}

Page({
  data: {
    redirect: '',
    bgImage: '',
    avatarUrl: '',
    nickname: '',
    hasAvatar: false,
    hasNickname: false,
    canLogin: false,
    logging: false,
    isDark: false,
    agreedPrivacy: false,
  },

  onLoad: function (options) {
    // 随机选一张白天背景图
    this.setData({
      redirect: options.redirect || '/pages/index/index',
      isDark: app.globalData.effectiveTheme === 'dark',
      bgImage: pickLoginBg()
    });
  },

  /** 选择头像（button open-type="chooseAvatar" 触发） */
  onChooseAvatar: function (e) {
    var avatarUrl = e.detail.avatarUrl;
    if (!avatarUrl) return;
    var newHasAvatar = true;
    // 注意：不能在此处调用 this._checkCanLogin()，因为 this.data 尚未更新
    // 需要用新值直接计算 canLogin，否则状态会滞后一步
    this.setData({
      avatarUrl: avatarUrl,
      hasAvatar: newHasAvatar,
      canLogin: newHasAvatar && this.data.hasNickname && this.data.agreedPrivacy && !this.data.logging
    });
  },

  /** 昵称输入（input type="nickname"） */
  onNicknameInput: function (e) {
    var nickname = (e.detail.value || '').trim();
    var newHasNickname = nickname.length > 0;
    // 用新值直接计算，避免读取未更新的 this.data
    this.setData({
      nickname: nickname,
      hasNickname: newHasNickname,
      canLogin: this.data.hasAvatar && newHasNickname && this.data.agreedPrivacy && !this.data.logging
    });
  },

  /** 隐私协议勾选 */
  onPrivacyChange: function (e) {
    var newAgreed = e.detail.value && e.detail.value.length > 0;
    // 用新值直接计算，避免读取未更新的 this.data
    this.setData({
      agreedPrivacy: newAgreed,
      canLogin: this.data.hasAvatar && this.data.hasNickname && newAgreed && !this.data.logging
    });
  },

  _checkCanLogin: function () {
    return this.data.hasAvatar && this.data.hasNickname && this.data.agreedPrivacy && !this.data.logging;
  },

  /** 点击登录按钮 */
  handleLogin: function () {
    var that = this;

    // 安全网：直接校验隐私协议勾选状态，防止 canLogin 状态不同步时绕过
    if (!this.data.agreedPrivacy) {
      wx.showToast({ title: '请先勾选同意隐私协议', icon: 'none' });
      return;
    }

    if (!this.data.canLogin) {
      if (!this.data.hasAvatar) {
        wx.showToast({ title: '请先选择头像', icon: 'none' });
      } else if (!this.data.hasNickname) {
        wx.showToast({ title: '请输入昵称', icon: 'none' });
      } else if (!this.data.agreedPrivacy) {
        wx.showToast({ title: '请勾选同意隐私协议', icon: 'none' });
      }
      return;
    }

    this.setData({ logging: true });
    wx.showLoading({ title: '登录中...', mask: true });

    // 如果头像是本地临时文件，上传到云存储
    var avatarUrl = this.data.avatarUrl;
    var nickname = this.data.nickname;

    that._processAvatar(avatarUrl).then(function (finalAvatarUrl) {
      // 调用 authManager 完成登录
      authManager.doLogin({
        nickname: nickname,
        avatarUrl: finalAvatarUrl
      }, function (success, errMsg) {
        wx.hideLoading();
        that.setData({ logging: false });

        if (success) {
          wx.showToast({ title: '登录成功', icon: 'success' });

          // 检查是否有暂存的回调（ensureLogin 传入的）
          var app = getApp();
          var hasPendingCallback = !!(app && app._pendingLoginCallback);

          setTimeout(function () {
            if (hasPendingCallback) {
              // 先返回原页面，再执行回调（回调中通常包含 navigateTo 跳转）
              wx.navigateBack({
                success: function () {
                  setTimeout(function () {
                    authManager.executePendingCallback();
                  }, 200);
                },
                fail: function () {
                  // navigateBack 失败，直接执行回调
                  authManager.executePendingCallback();
                }
              });
            } else {
              // 无 callback，跳转到 redirect 页或返回
              var pages = getCurrentPages();
              if (pages.length > 1) {
                wx.navigateBack();
              } else {
                wx.redirectTo({
                  url: that.data.redirect || '/pages/index/index',
                  fail: function () {
                    wx.switchTab({ url: '/pages/index/index' });
                  }
                });
              }
            }
          }, 800);
        } else {
          wx.showToast({ title: errMsg || '登录失败，请重试', icon: 'none' });
        }
      });
    }).catch(function (err) {
      wx.hideLoading();
      that.setData({ logging: false });
      console.warn('登录失败:', err);
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    });
  },

  /**
   * 处理头像：如果是本地临时文件，上传到云存储
   * 返回最终的 avatarUrl（cloud:// 或原始路径）
   */
  _processAvatar: function (avatarUrl) {
    return new Promise(function (resolve, reject) {
      if (!avatarUrl) {
        resolve('');
        return;
      }

      var app = getApp();
      var cloudReady = wx.cloud && app.globalData && app.globalData.env;

      // 判断是否为本地临时文件（需要上传）
      // 微信 chooseAvatar 返回的路径通常以 http://tmp/ 或 wxfile:// 开头
      var isLocalTemp = avatarUrl.indexOf('http://tmp') === 0 ||
                        avatarUrl.indexOf('wxfile://') === 0 ||
                        avatarUrl.indexOf('/var/') === 0 ||
                        avatarUrl.indexOf('//tmp') === 0;

      // 已是云端URL或不需要上传
      if (!isLocalTemp || !cloudReady) {
        resolve(avatarUrl);
        return;
      }

      // 上传到云存储
      var timestamp = Date.now();
      var cloudPath = 'avatars/' + timestamp + '.png';

      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: avatarUrl,
        success: function (res) {
          resolve(res.fileID);
        },
        fail: function (err) {
          console.warn('头像上传失败，使用本地路径:', err);
          resolve(avatarUrl);
        }
      });
    });
  },

  /** 跳过（不登录返回） */
  handleSkip: function () {
    wx.navigateBack({
      fail: function () {
        wx.switchTab({ url: '/pages/index/index' });
      }
    });
  },

  /** 查看隐私协议 */
  viewPrivacy: function () {
    wx.openPrivacyContract && wx.openPrivacyContract({
      fail: function () {
        wx.showToast({ title: '请在设置中查看隐私协议', icon: 'none' });
      }
    });
  }
});
