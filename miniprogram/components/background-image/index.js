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
