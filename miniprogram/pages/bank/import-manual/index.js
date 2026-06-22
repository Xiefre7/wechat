const EMPTY_FORM = {
  type: 'single_choice',
  stem: '',
  options: [
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
  ],
  answer: '',
  explanation: '',
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
        this.setData({
          isEditing: true,
          editIndex: index,
          form: {
            type: q.type,
            stem: q.stem,
            options: q.options && q.options.length > 0 ? [...q.options] : [...EMPTY_FORM.options],
            answer: q.answer,
            explanation: q.explanation || '',
          },
          selectedAnswers,
          showOptions: !['short_answer'].includes(q.type),
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
        { key: 'A', text: '对' },
        { key: 'B', text: '错' },
      ];
      form.answer = '';
    } else if (type === 'short_answer' || type === 'fill_blank') {
      form.options = [];
      form.answer = '';
    } else if (form.options.length === 0 || this.data.form.type === 'true_false' || this.data.form.type === 'short_answer') {
      form.options = [...EMPTY_FORM.options];
    }

    // 多选切单选时清答案
    if (type === 'single_choice' && form.type !== type) {
      form.answer = '';
    }

    this.setData({
      form,
      selectedAnswers: {},
      showOptions: !['short_answer'].includes(type),
    });
  },

  /* ─── 字段变更 ─── */
  onFieldChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`form.${field}`]: e.detail.value,
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
    if (options.length >= 6) return;
    const nextKey = String.fromCharCode(65 + options.length);
    options.push({ key: nextKey, text: '' });
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

  /* ─── 保存 ─── */
  validateForm() {
    const { form } = this.data;
    const errors = [];

    if (!form.stem.trim()) errors.push('请输入题干');
    if (form.type !== 'short_answer' && form.type !== 'fill_blank') {
      if (form.options.some((o) => !o.text.trim())) errors.push('请填写所有选项');
    }
    if (!form.answer.trim()) errors.push('请设置答案');

    return errors;
  },

  saveForm() {
    const errors = this.validateForm();
    if (errors.length > 0) {
      wx.showToast({ title: errors[0], icon: 'none' });
      return false;
    }

    const { form, isEditing, editIndex } = this.data;
    const drafts = wx.getStorageSync('manualDraft') || [];

    // 判断题答案规范化：统一转为 A（对）或 B（错）
    let answer = form.answer.trim();
    if (form.type === 'true_false') {
      if (/^(对|正确|√|✓|T|t|true|True)$/.test(answer)) answer = 'A';
      else if (/^(错|错误|×|✗|F|f|false|False)$/.test(answer)) answer = 'B';
    }

    const question = {
      type: form.type,
      stem: form.stem.trim(),
      options: form.options.filter((o) => o.text.trim()).map((o) => ({ key: o.key, text: o.text.trim() })),
      answer,
      explanation: form.explanation.trim(),
    };

    if (isEditing) {
      drafts[editIndex] = question;
    } else {
      drafts.push(question);
    }

    wx.setStorageSync('manualDraft', drafts);
    return true;
  },

  saveAndContinue() {
    if (!this.saveForm()) return;

    // 重置表单
    this.setData({
      isEditing: false,
      editIndex: -1,
      form: {
        ...EMPTY_FORM,
        options: [...EMPTY_FORM.options],
      },
      selectedAnswers: {},
    });

    wx.showToast({ title: '已保存，继续添加', icon: 'success' });
    // 滚动到顶部
    this.setData({ scrollTop: 0 });
  },

  saveAndFinish() {
    if (!this.saveForm()) return;

    // 清除编辑状态
    this.setData({
      isEditing: false,
      editIndex: -1,
      form: {
        ...EMPTY_FORM,
        options: [...EMPTY_FORM.options],
      },
      selectedAnswers: {},
    });

    wx.showToast({ title: '题目已保存', icon: 'success' });
    setTimeout(() => {
      wx.navigateBack();
    }, 800);
  },
});
