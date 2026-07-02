Component({
  properties: {
    opacity: {
      type: Number,
      value: 0.70
    }
  },

  data: {
    imagePath: '',
    overlayClass: ''
  },

  lifetimes: {
    attached() {
      this.refreshBackground();
      // 订阅 app 级主题变化通知
      var that = this;
      this._themeCb = function () {
        that.refreshBackground();
      };
      var app = getApp();
      if (app.onThemeChange) {
        app.onThemeChange(this._themeCb);
      }
    },
    detached() {
      // 取消订阅，避免内存泄漏
      var app = getApp();
      if (app.offThemeChange && this._themeCb) {
        app.offThemeChange(this._themeCb);
      }
    }
  },

  pageLifetimes: {
    show() {
      this.refreshBackground();
    }
  },

  methods: {
    refreshBackground() {
      const app = getApp();
      const imagePath = app.globalData.backgroundImage || '/images/bg-light/1.jpg';
      const effectiveTheme = app.globalData.effectiveTheme || 'light';
      this.setData({
        imagePath: imagePath,
        overlayClass: effectiveTheme === 'dark' ? 'bg-overlay-dark' : 'bg-overlay-light'
      });
    }
  }
});
