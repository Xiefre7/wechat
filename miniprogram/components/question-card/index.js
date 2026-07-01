Component({
  properties: {
    question: {
      type: Object,
      value: {}
    },
    options: {
      type: Array,
      value: []
    },
    showIcons: {
      type: Boolean,
      value: false
    },
    disabled: {
      type: Boolean,
      value: false
    },
    typeLabel: {
      type: String,
      value: ''
    }
  },

  methods: {
    onOptionTap: function(e) {
      if (this.data.disabled) return;
      var key = e.currentTarget.dataset.key;
      this.triggerEvent('optiontap', { key: key });
    },

    onStemImageTap: function(e) {
      var url = e.currentTarget.dataset.url;
      if (url) this.triggerEvent('stemimagetap', { url: url });
    },

    onOptionImageTap: function(e) {
      var url = e.currentTarget.dataset.url;
      if (url) this.triggerEvent('optionimagetap', { url: url });
    }
  }
});
