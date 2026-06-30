const TYPE_LABELS = {
  single_choice: '单选',
  multi_choice: '多选',
  true_false: '判断',
  fill_blank: '填空',
  short_answer: '简答',
};

const QUESTION_TYPES = [
  { value: 'single_choice', label: '单选' },
  { value: 'multi_choice', label: '多选' },
  { value: 'true_false', label: '判断' },
  { value: 'fill_blank', label: '填空' },
  { value: 'short_answer', label: '简答' },
];

Page({
  data: {
    isDark: false,
    bankName: '',
    questions: [],
    questionTypes: QUESTION_TYPES,
    typeDistribution: '',
    importing: false,
    isExcelImport: false,
  },

  onLoad() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });

    console.log('[import-preview onLoad] Page loaded');

    // 读取导入数据（加 try/catch 防止 Storage 读取失败）
    var data;
    try {
      data = wx.getStorageSync('importPreviewData');
    } catch (e) {
      console.error('[import-preview onLoad] Failed to read storage:', e);
      wx.showToast({ title: '数据读取失败，请返回重试', icon: 'none' });
      setTimeout(function () { wx.navigateBack(); }, 1500);
      return;
    }

    console.log('[import-preview onLoad] Storage data:', {
      hasData: !!data,
      source: data ? data.source : 'N/A',
      bankName: data ? data.bankName : 'N/A',
      questionCount: data && data.questions ? data.questions.length : 0,
    });

    if (!data) {
      console.warn('[import-preview onLoad] No importPreviewData in storage');
      wx.showToast({ title: '未找到待导入的题目', icon: 'none' });
      setTimeout(function () { wx.navigateBack(); }, 1000);
      return;
    }

    // Excel 导入的特殊处理：题目在服务端解析，预览页展示导入确认信息
    if (data.source === 'excel') {
      console.log('[import-preview onLoad] Excel import mode');
      this.setData({
        bankName: data.bankName || '未命名题库',
        questions: [],
        source: data.source,
        filePath: data.filePath,
        isExcelImport: true,
      });
      return;
    }

    if (!data.questions || data.questions.length === 0) {
      console.warn('[import-preview onLoad] Empty questions array');
      wx.showToast({ title: '未找到待导入的题目', icon: 'none' });
      setTimeout(function () { wx.navigateBack(); }, 1000);
      return;
    }

    try {
      var questions = data.questions.map(function (q, idx) {
        // 跳过 null/undefined 条目
        if (!q) {
          console.warn('[import-preview onLoad] Null question at index', idx);
          return null;
        }
        return {
          type: q.type || 'single_choice',
          stem: q.stem || '',
          options: q.options || [],
          answer: q.answer || '',
          explanation: q.explanation || '',
          _editing: false,
          _typeLabel: TYPE_LABELS[q.type] || '未知',
        };
      }).filter(Boolean); // 移除 null 条目

      if (questions.length === 0) {
        console.warn('[import-preview onLoad] All questions filtered out as null');
        wx.showToast({ title: '题目数据异常，请返回重试', icon: 'none' });
        setTimeout(function () { wx.navigateBack(); }, 1000);
        return;
      }

      var bankName = data.bankName || '未命名题库';

      console.log('[import-preview onLoad] Processed', questions.length, 'questions');

      this.setData({
        bankName: bankName,
        questions: questions,
        typeDistribution: this.countTypes(questions),
        source: data.source,
        filePath: data.filePath,
      });
    } catch (e) {
      console.error('[import-preview onLoad] Error processing questions:', e);
      wx.showToast({ title: '题目数据处理失败，请返回重试', icon: 'none' });
      setTimeout(function () { wx.navigateBack(); }, 1000);
    }
  },

  onShow() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
  },

  /* ─── 题型分布统计 ─── */
  countTypes(questions) {
    const counts = {};
    questions.forEach((q) => {
      const label = TYPE_LABELS[q.type] || '其他';
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([k, v]) => `${k} ${v}题`)
      .join('  ');
  },

  /* ─── 题目编辑 ─── */
  toggleEdit(e) {
    const { index } = e.currentTarget.dataset;
    const questions = [...this.data.questions];
    questions[index] = { ...questions[index], _editing: !questions[index]._editing };
    this.setData({ questions });
  },

  onItemFieldChange(e) {
    const { index, field } = e.currentTarget.dataset;
    const questions = [...this.data.questions];
    questions[index] = { ...questions[index], [field]: e.detail.value };
    this.setData({ questions });
  },

  onItemOptionChange(e) {
    const { index, optIndex } = e.currentTarget.dataset;
    const questions = [...this.data.questions];
    const options = [...questions[index].options];
    options[optIndex] = { ...options[optIndex], text: e.detail.value };
    questions[index] = { ...questions[index], options };
    this.setData({ questions });
  },

  onItemTypeChange(e) {
    const { index, value } = e.currentTarget.dataset;
    const questions = [...this.data.questions];
    questions[index] = {
      ...questions[index],
      type: value,
      _typeLabel: TYPE_LABELS[value] || '未知',
      // 判断题重置选项
      options:
        value === 'true_false'
          ? [
              { key: 'A', text: '对' },
              { key: 'B', text: '错' },
            ]
          : value === 'short_answer' || value === 'fill_blank'
          ? []
          : questions[index].options.length > 0
          ? questions[index].options
          : [
              { key: 'A', text: '' },
              { key: 'B', text: '' },
              { key: 'C', text: '' },
              { key: 'D', text: '' },
            ],
    };
    this.setData({ questions });
  },

  removeQuestion(e) {
    const { index } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要移除此题吗？',
      success: (res) => {
        if (res.confirm) {
          const questions = this.data.questions.filter((_, i) => i !== index);
          this.setData({
            questions,
            typeDistribution: this.countTypes(questions),
          });
        }
      },
    });
  },

  /* ─── 确认导入 ─── */
  confirmImport() {
    const { questions, bankName, importing, source, filePath } = this.data;
    if (importing) return;

    // 最终校验
    const invalidQuestions = questions.filter(
      (q) => !q.stem || !q.stem.trim() || (q.type !== 'short_answer' && !q.answer)
    );
    if (invalidQuestions.length > 0) {
      wx.showModal({
        title: '存在不完整题目',
        content: `有 ${invalidQuestions.length} 道题缺少题干或答案，是否跳过这些题目继续导入？`,
        success: (res) => {
          if (res.confirm) {
            const valid = questions.filter(
              (q) => q.stem && q.stem.trim() && (q.type === 'short_answer' || q.answer)
            );
            this.setData({ questions: valid }, () => this.doImport());
          }
        },
      });
      return;
    }

    this.doImport();
  },

  doImport() {
    this.setData({ importing: true });

    const { bankName, questions, source, filePath } = this.data;

    // 清理内部字段
    const cleanQuestions = questions.map(({ _editing, _typeLabel, ...q }) => ({
      type: q.type,
      stem: q.stem.trim(),
      options: q.options || [],
      answer: q.answer ? q.answer.trim() : '',
      explanation: q.explanation ? q.explanation.trim() : '',
    }));

    const importData = {
      type: 'importBank',
      bankName: bankName.trim(),
      bankType: 'custom',
      questions: cleanQuestions,
      source: source || 'manual',
    };

    // Excel 文件需要先上传
    if (source === 'excel' && filePath) {
      this.uploadAndImport(filePath, bankName.trim());
      return;
    }

    wx.showLoading({ title: '导入中...', mask: true });

    wx.cloud
      .callFunction({
        name: 'quickstartFunctions',
        data: importData,
      })
      .then((res) => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          this.onImportSuccess(res.result);
        } else {
          this.onImportFail(res.result ? res.result.errMsg : '未知错误');
        }
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('导入失败:', err);
        this.onImportFail(err.errMsg || '网络异常，请重试');
      });
  },

  uploadAndImport(filePath, bankName) {
    wx.showLoading({ title: '上传文件中...', mask: true });

    const cloudPath = `imports/${Date.now()}_${Math.random().toString(36).slice(2)}.xlsx`;
    wx.cloud
      .uploadFile({ cloudPath, filePath })
      .then((uploadRes) => {
        wx.showLoading({ title: '解析导入中...', mask: true });
        return wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'importBankByExcel',
            fileID: uploadRes.fileID,
            bankName,
          },
        });
      })
      .then((res) => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          this.onImportSuccess(res.result);
        } else {
          this.onImportFail(res.result ? res.result.errMsg : '解析失败');
        }
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('导入失败:', err);
        this.onImportFail(err.errMsg || '文件上传失败，请重试');
      });
  },

  onImportSuccess(result) {
    const { bankId, questionCount } = result;
    wx.showModal({
      title: '导入成功',
      content: `「${this.data.bankName}」已成功导入 ${questionCount} 道题目！`,
      showCancel: false,
      confirmText: '开始刷题',
      success: () => {
        // 跳转到题库页面（目前跳转首页）
        wx.removeStorageSync('importPreviewData');
        wx.removeStorageSync('manualDraft');
        wx.redirectTo({
          url: '/pages/index/index',
        });
      },
    });
    this.setData({ importing: false });
  },

  onImportFail(errMsg) {
    this.setData({ importing: false });
    wx.showModal({
      title: '导入失败',
      content: errMsg || '导入过程中出现异常，请稍后重试',
      showCancel: true,
      confirmText: '重试',
      cancelText: '返回修改',
      success: (res) => {
        if (res.confirm) {
          this.doImport();
        }
      },
    });
  },

  /* ─── 返回 ─── */
  goBack() {
    wx.navigateBack();
  },
});
