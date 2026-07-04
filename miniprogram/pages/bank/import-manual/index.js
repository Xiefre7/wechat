const imageUploader = require('../../../utils/imageUploader');

const EMPTY_FORM = {
  type: 'single_choice',
  stem: '',
  _stemImages: [],
  options: [
    { key: 'A', text: '', _image: '' },
    { key: 'B', text: '', _image: '' },
    { key: 'C', text: '', _image: '' },
    { key: 'D', text: '', _image: '' },
  ],
  answer: '',
  fillBlankCount: 0,
  fillBlankAnswers: [],
  explanation: '',
  _explanationImages: [],
};

const QUESTION_TYPES = [
  { value: 'single_choice', label: '单选题' },
  { value: 'multi_choice', label: '多选题' },
  { value: 'true_false', label: '判断题' },
  { value: 'fill_blank', label: '填空题' },
  { value: 'short_answer', label: '简答题' },
];

Page({
  data: {
    isDark: false,
    isEditing: false,
    editIndex: -1,
    questionTypes: QUESTION_TYPES,
    form: { ...EMPTY_FORM, options: [...EMPTY_FORM.options] },
    selectedAnswers: {},
    showOptions: true,
  },

  onLoad(options) {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });

    if (options.editIndex !== undefined) {
      const index = parseInt(options.editIndex);
      const drafts = wx.getStorageSync('manualDraft') || [];
      if (drafts[index]) {
        const q = drafts[index];
        const selectedAnswers = {};
        if (q.type === 'single_choice' || q.type === 'multi_choice') {
          const answers = q.answer.split(/[,，、]/);
          answers.forEach((a) => {
            selectedAnswers[a.trim()] = true;
          });
        }
        var editOptions = q.options && q.options.length > 0
          ? q.options.map(function(opt) { return { key: opt.key, text: opt.text || '', _image: opt.image || '' }; })
          : [...EMPTY_FORM.options];
        this.setData({
          isEditing: true,
          editIndex: index,
          form: {
            type: q.type,
            stem: q.stem,
            _stemImages: (q.stemImages || []).slice(),
            options: editOptions,
            answer: q.answer,
            fillBlankCount: q.fillBlankCount || (q.type === 'fill_blank' && q.answer ? q.answer.split(/[|｜]/).length : 0),
            fillBlankAnswers: q.fillBlankAnswers && q.fillBlankAnswers.length > 0
              ? q.fillBlankAnswers.slice()
              : (q.type === 'fill_blank' && q.answer ? q.answer.split(/[|｜]/).map(function(s) { return s.trim(); }) : []),
            explanation: q.explanation || '',
            _explanationImages: (q.explanationImages || []).slice(),
          },
          selectedAnswers,
          showOptions: !['short_answer', 'fill_blank'].includes(q.type),
        });
      }
    }
  },

  onShow() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
  },

  /* ─── 题型选择 ─── */
  selectType(e) {
    const { type } = e.currentTarget.dataset;
    const form = { ...this.data.form, type };

    // 切换题型时重置选项
    if (type === 'true_false') {
      form.options = [
        { key: 'A', text: '对', _image: '' },
        { key: 'B', text: '错', _image: '' },
      ];
      form.answer = '';
      form.fillBlankCount = 0;
      form.fillBlankAnswers = [];
    } else if (type === 'short_answer') {
      form.options = [];
      form.answer = '';
      form.fillBlankCount = 0;
      form.fillBlankAnswers = [];
    } else if (type === 'fill_blank') {
      form.options = [];
      form.answer = '';
      form.fillBlankCount = 1;
      form.fillBlankAnswers = [''];
    } else if (form.options.length === 0 || this.data.form.type === 'true_false' || this.data.form.type === 'short_answer' || this.data.form.type === 'fill_blank') {
      form.options = [...EMPTY_FORM.options];
      form.fillBlankCount = 0;
      form.fillBlankAnswers = [];
    }

    // 多选切单选时清答案
    if (type === 'single_choice' && form.type !== type) {
      form.answer = '';
    }

    this.setData({
      form,
      selectedAnswers: {},
      showOptions: !['short_answer', 'fill_blank'].includes(type),
    });
  },

  /* ─── 字段变更 ─── */
  onFieldChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`form.${field}`]: e.detail.value,
    });
  },

  /* ─── 填空题分空输入 ─── */
  onFillBlankInput(e) {
    const { blankIdx } = e.currentTarget.dataset;
    var answers = (this.data.form.fillBlankAnswers || []).slice();
    while (answers.length <= blankIdx) answers.push('');
    answers[blankIdx] = e.detail.value;
    this.setData({
      'form.fillBlankAnswers': answers,
      'form.answer': answers.join('|'),
    });
  },

  addFillBlank() {
    var answers = (this.data.form.fillBlankAnswers || []).slice();
    if (answers.length >= 10) {
      wx.showToast({ title: '最多 10 个空', icon: 'none' });
      return;
    }
    answers.push('');
    this.setData({
      'form.fillBlankAnswers': answers,
      'form.fillBlankCount': answers.length,
      'form.answer': answers.join('|'),
    });
  },

  removeFillBlank(e) {
    const { blankIdx } = e.currentTarget.dataset;
    var answers = (this.data.form.fillBlankAnswers || []).slice();
    if (answers.length <= 1) {
      wx.showToast({ title: '至少保留 1 个空', icon: 'none' });
      return;
    }
    answers.splice(blankIdx, 1);
    this.setData({
      'form.fillBlankAnswers': answers,
      'form.fillBlankCount': answers.length,
      'form.answer': answers.join('|'),
    });
  },

  /* ─── 选项变更 ─── */
  onOptionChange(e) {
    const { index } = e.currentTarget.dataset;
    const options = [...this.data.form.options];
    options[index] = { ...options[index], text: e.detail.value };
    this.setData({ 'form.options': options });
  },

  addOption() {
    const options = [...this.data.form.options];
    if (options.length >= 10) return;
    const nextKey = String.fromCharCode(65 + options.length);
    options.push({ key: nextKey, text: '', _image: '' });
    this.setData({ 'form.options': options });
  },

  deleteOption(e) {
    const { index } = e.currentTarget.dataset;
    const options = this.data.form.options.filter((_, i) => i !== index);
    // 重新编号
    const rekeyed = options.map((opt, i) => ({
      ...opt,
      key: String.fromCharCode(65 + i),
    }));
    this.setData({ 'form.options': rekeyed });
  },

  /* ─── 答案 ─── */
  toggleAnswer(e) {
    const { key } = e.currentTarget.dataset;
    const { form } = this.data;

    if (form.type === 'single_choice' || form.type === 'true_false') {
      // 单选：替换
      this.setData({
        selectedAnswers: { [key]: true },
        'form.answer': key,
      });
    } else if (form.type === 'multi_choice') {
      // 多选：切换
      const selectedAnswers = { ...this.data.selectedAnswers };
      if (selectedAnswers[key]) {
        delete selectedAnswers[key];
      } else {
        selectedAnswers[key] = true;
      }
      const answer = Object.keys(selectedAnswers).sort().join(',');
      this.setData({ selectedAnswers, 'form.answer': answer });
    }
  },

  setAnswer(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({
      'form.answer': value,
      selectedAnswers: { [value]: true },
    });
  },

  setTfAnswer(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({ 'form.answer': value });
  },

  /* ─── 图片操作 ─── */
  onChooseStemImage() {
    var that = this;
    var form = this.data.form;
    var currentCount = (form._stemImages || []).length;
    if (currentCount >= 3) {
      wx.showToast({ title: '题干最多添加3张图片', icon: 'none' });
      return;
    }
    imageUploader.chooseImages(3 - currentCount, 3 - currentCount).then(function(paths) {
      if (paths.length === 0) return;
      that.setData({ 'form._stemImages': [...(form._stemImages || []), ...paths] });
    });
  },

  onRemoveStemImage(e) {
    var imgUrl = e.currentTarget.dataset.imgUrl;
    var form = this.data.form;
    this.setData({
      'form._stemImages': (form._stemImages || []).filter(function(p) { return p !== imgUrl; })
    });
  },

  onChooseOptionImage(e) {
    var that = this;
    var optIndex = Number(e.currentTarget.dataset.optIndex);
    imageUploader.chooseImages(1, 1).then(function(paths) {
      if (paths.length === 0) return;
      var form = that.data.form;
      var options = [...form.options];
      options[optIndex] = { ...options[optIndex], _image: paths[0] };
      that.setData({ 'form.options': options });
    });
  },

  onRemoveOptionImage(e) {
    var optIndex = Number(e.currentTarget.dataset.optIndex);
    var form = this.data.form;
    var options = [...form.options];
    options[optIndex] = { ...options[optIndex], _image: '' };
    this.setData({ 'form.options': options });
  },

  onChooseExplanationImage() {
    var that = this;
    var form = this.data.form;
    var currentCount = (form._explanationImages || []).length;
    if (currentCount >= 3) {
      wx.showToast({ title: '解析最多添加3张图片', icon: 'none' });
      return;
    }
    imageUploader.chooseImages(3 - currentCount, 3 - currentCount).then(function(paths) {
      if (paths.length === 0) return;
      that.setData({ 'form._explanationImages': [...(form._explanationImages || []), ...paths] });
    });
  },

  onRemoveExplanationImage(e) {
    var imgUrl = e.currentTarget.dataset.imgUrl;
    var form = this.data.form;
    this.setData({
      'form._explanationImages': (form._explanationImages || []).filter(function(p) { return p !== imgUrl; })
    });
  },

  onPreviewImage(e) {
    var url = e.currentTarget.dataset.url;
    if (url) imageUploader.previewImage(url);
  },

  /* ─── 保存 ─── */
  validateForm() {
    const { form } = this.data;
    const errors = [];

    if (!form.stem.trim()) errors.push('请输入题干');
    if (form.type !== 'short_answer' && form.type !== 'fill_blank') {
      if (form.options.some((o) => !o.text.trim())) errors.push('请填写所有选项');
    }
    if (form.type === 'fill_blank') {
      var hasAnswer = (form.fillBlankAnswers || []).some(function (a) { return a && a.trim(); });
      if (!hasAnswer) errors.push('请至少填写一个空的答案');
    } else if (!form.answer.trim()) {
      errors.push('请设置答案');
    }

    return errors;
  },

  /* 收集表单中所有待上传的图片临时路径 */
  _collectTempPaths() {
    const { form } = this.data;
    var allTempPaths = [];
    (form._stemImages || []).forEach(function(p) { allTempPaths.push(p); });
    (form._explanationImages || []).forEach(function(p) { allTempPaths.push(p); });
    (form.options || []).forEach(function(opt) {
      if (opt._image) allTempPaths.push(opt._image);
    });
    return allTempPaths;
  },

  /* 用 pathMap 替换表单中的临时路径 → cloudFileID */
  _applyPathMap(pathMap) {
    const { form } = this.data;
    return {
      type: form.type,
      stem: form.stem.trim(),
      _stemImages: (form._stemImages || []).map(function(p) { return pathMap[p] || p; }),
      options: form.options.map(function(opt) {
        return { key: opt.key, text: opt.text.trim(), _image: pathMap[opt._image] || opt._image || '' };
      }),
      answer: form.answer.trim(),
      fillBlankCount: form.fillBlankCount || 0,
      fillBlankAnswers: (form.fillBlankAnswers || []).slice(),
      explanation: form.explanation.trim(),
      _explanationImages: (form._explanationImages || []).map(function(p) { return pathMap[p] || p; }),
    };
  },

  /* 构建最终保存的题目对象 */
  _buildQuestion(formAfterUpload) {
    var answer = formAfterUpload.answer;
    if (formAfterUpload.type === 'true_false') {
      if (/^(对|正确|√|✓|T|t|true|True)$/.test(answer)) answer = 'A';
      else if (/^(错|错误|×|✗|F|f|false|False)$/.test(answer)) answer = 'B';
    }

    var question = {
      type: formAfterUpload.type,
      stem: formAfterUpload.stem,
      stemImages: (formAfterUpload._stemImages || []).filter(function(p) { return p && p.indexOf('cloud://') === 0; }),
      options: formAfterUpload.options.filter(function(o) { return o.text; }).map(function(o) {
        return { key: o.key, text: o.text, image: o._image || '' };
      }),
      answer: answer,
      explanation: formAfterUpload.explanation,
      explanationImages: (formAfterUpload._explanationImages || []).filter(function(p) { return p && p.indexOf('cloud://') === 0; }),
    };

    // 填空题：保存空格信息
    if (formAfterUpload.type === 'fill_blank') {
      question.fillBlankCount = formAfterUpload.fillBlankCount || (formAfterUpload.fillBlankAnswers || []).length || 1;
      question.fillBlankAnswers = (formAfterUpload.fillBlankAnswers || []).map(function(a) { return (a || '').trim(); });
    }

    return question;
  },

  /* 写入 storage */
  _writeDraft(question) {
    const { isEditing, editIndex } = this.data;
    var drafts = wx.getStorageSync('manualDraft') || [];
    if (isEditing) {
      drafts[editIndex] = question;
    } else {
      drafts.push(question);
    }
    wx.setStorageSync('manualDraft', drafts);
  },

  /* 重置表单 */
  _resetForm() {
    this.setData({
      isEditing: false,
      editIndex: -1,
      form: {
        ...EMPTY_FORM,
        options: [...EMPTY_FORM.options],
      },
      selectedAnswers: {},
    });
  },

  /* 异步保存：先上传图片再写入 storage */
  _doSave() {
    var that = this;
    var errors = this.validateForm();
    if (errors.length > 0) {
      wx.showToast({ title: errors[0], icon: 'none' });
      return Promise.resolve(false);
    }

    var allTempPaths = this._collectTempPaths();

    if (allTempPaths.length === 0) {
      var form = this.data.form;
      var formAfter = {
        type: form.type,
        stem: form.stem.trim(),
        _stemImages: (form._stemImages || []).slice(),
        options: form.options.map(function(opt) { return { key: opt.key, text: opt.text.trim(), _image: opt._image || '' }; }),
        answer: form.answer.trim(),
        fillBlankCount: form.fillBlankCount || 0,
        fillBlankAnswers: (form.fillBlankAnswers || []).slice(),
        explanation: form.explanation.trim(),
        _explanationImages: (form._explanationImages || []).slice(),
      };
      var question = this._buildQuestion(formAfter);
      this._writeDraft(question);
      return Promise.resolve(true);
    }

    wx.showLoading({ title: '上传图片中...', mask: true });

    return imageUploader.uploadImages(allTempPaths, 'q').then(function(result) {
      wx.hideLoading();
      var formAfter = that._applyPathMap(result.pathMap);
      var question = that._buildQuestion(formAfter);
      that._writeDraft(question);
      return true;
    }).catch(function(err) {
      wx.hideLoading();
      console.error('[import-manual] 图片上传失败:', err);
      return new Promise(function(resolve) {
        wx.showModal({
          title: '上传失败',
          content: '图片上传失败: ' + (err.errMsg || '网络异常') + '。是否跳过图片直接保存？',
          confirmText: '跳过图片保存',
          cancelText: '返回修改',
          success: function(res) {
            if (res.confirm) {
              var form = that.data.form;
              var formNoImg = {
                type: form.type,
                stem: form.stem.trim(),
                _stemImages: [],
                options: form.options.map(function(opt) { return { key: opt.key, text: opt.text.trim(), _image: '' }; }),
                answer: form.answer.trim(),
                fillBlankCount: form.fillBlankCount || 0,
                fillBlankAnswers: (form.fillBlankAnswers || []).slice(),
                explanation: form.explanation.trim(),
                _explanationImages: [],
              };
              var question = that._buildQuestion(formNoImg);
              that._writeDraft(question);
              resolve(true);
            } else {
              resolve(false);
            }
          },
        });
      });
    });
  },

  saveAndContinue() {
    var that = this;
    this._doSave().then(function(success) {
      if (!success) return;
      that._resetForm();
      wx.showToast({ title: '已保存，继续添加', icon: 'success' });
      that.setData({ scrollTop: 0 });
    });
  },

  saveAndFinish() {
    var that = this;
    this._doSave().then(function(success) {
      if (!success) return;
      that._resetForm();
      wx.showToast({ title: '题目已保存', icon: 'success' });
      setTimeout(function() {
        wx.navigateBack();
      }, 800);
    });
  },
});
