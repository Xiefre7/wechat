// 模块级读取初始值，避免组件首次渲染时 imagePath 为空导致玻璃卡片闪烁
var _app = getApp();
var _initialImagePath = '/images/bg-light/1.jpg';
var _initialOverlay = 'bg-overlay-light';
var _initialLoading = true;

if (_app && _app.globalData) {
  _initialImagePath = _app.globalData.backgroundImage || _initialImagePath;
  _initialOverlay = (_app.globalData.effectiveTheme === 'dark') ? 'bg-overlay-dark' : 'bg-overlay-light';
  // 本地资源可认为已就绪；云端资源需要等待 load 事件
  _initialLoading = String(_initialImagePath).indexOf('cloud://') === 0;
}

Component({
  properties: {
    opacity: {
      type: Number,
      value: 0.70
    }
  },

  data: {
    imagePath: _initialImagePath,
    overlayClass: _initialOverlay,
    loading: _initialLoading
  },

  lifetimes: {
    attached() {
      // 不调用 refreshBackground() — data 已由模块级初始化，无需重复 setData
      // 避免组件创建后立即 setData 触发玻璃卡片重渲染闪烁
      this._firstPageShow = true;

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
      var app = getApp();
      if (app.offThemeChange && this._themeCb) {
        app.offThemeChange(this._themeCb);
      }
    }
  },

  pageLifetimes: {
    show() {
      // 首次 show 跳过：data 已由模块级初始化，无需重复 setData
      if (this._firstPageShow) {
        this._firstPageShow = false;
        return;
      }
      this.refreshBackground();
    }
  },

  methods: {
    refreshBackground() {
      const app = getApp();
      const imagePath = app.globalData.backgroundImage || '/images/bg-light/1.jpg';
      const effectiveTheme = app.globalData.effectiveTheme || 'light';
      const overlayClass = effectiveTheme === 'dark' ? 'bg-overlay-dark' : 'bg-overlay-light';
      const isCloud = String(imagePath).indexOf('cloud://') === 0;

      if (this.data.imagePath !== imagePath || this.data.overlayClass !== overlayClass) {
        this.setData({
          imagePath: imagePath,
          overlayClass: overlayClass,
          loading: isCloud
        });
      }
    },

    /** 云端背景图加载完成 */
    onImageLoad() {
      this.setData({ loading: false });
    },

    /** 云端背景图加载失败：静默保持渐变占位，不影响功能 */
    onImageError(e) {
      console.warn('[background-image] 背景图加载失败:', e.detail);
      this.setData({ loading: false });
    }
  }
});
