const imageUploader = require('../../../utils/imageUploader');

const TYPE_LABELS = {
  single_choice: '单选',
  multi_choice: '多选',
  true_false: '判断',
  fill_blank: '填空',
  short_answer: '简答',
};

const MAX_OPTIONS = 10; // 选项上限 A-J
const MIN_OPTIONS = 2;  // 最少保留 2 个选项

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
          _idx: idx,
          type: q.type || 'single_choice',
          stem: q.stem || '',
          _stemImages: (q.stemImages || []).slice(),
          _explanationImages: (q.explanationImages || []).slice(),
          options: (q.options || []).map(function(opt) {
            var ans = q.answer || '';
            return { key: opt.key, text: opt.text || '', _image: opt.image || '', _sel: ans.indexOf(opt.key) > -1 };
          }),
          answer: q.answer || '',
          explanation: q.explanation || '',
          _editing: false,
          _typeLabel: TYPE_LABELS[q.type] || '未知',
          _detectionConfidence: q._detectionConfidence || 'high',
          _detectionNote: q._detectionNote || '',
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
    console.log('[toggleEdit] index:', index, 'dataset:', JSON.stringify(e.currentTarget.dataset));
    const questions = [...this.data.questions];
    if (!questions[index]) {
      console.warn('[toggleEdit] Question not found at index:', index);
      return;
    }
    var q = questions[index];
    console.log('[toggleEdit] q.type:', q.type, 'q._editing:', q._editing, 'q.options.length:', (q.options || []).length, 'q.answer:', q.answer);
    questions[index] = { ...q, _editing: !q._editing };
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
    const currentQ = questions[index];
    let newOptions;

    if (value === 'true_false') {
      newOptions = [
        { key: 'A', text: '对', _image: '', _sel: false },
        { key: 'B', text: '错', _image: '', _sel: false },
      ];
    } else if (value === 'short_answer' || value === 'fill_blank') {
      newOptions = [];
    } else if (currentQ.options && currentQ.options.length >= MIN_OPTIONS) {
      newOptions = currentQ.options.map(function(o) { return { key: o.key, text: o.text, _image: o._image || '', _sel: false }; });
    } else {
      newOptions = [
        { key: 'A', text: '', _image: '', _sel: false },
        { key: 'B', text: '', _image: '', _sel: false },
        { key: 'C', text: '', _image: '', _sel: false },
        { key: 'D', text: '', _image: '', _sel: false },
      ];
    }

    questions[index] = {
      ...currentQ,
      type: value,
      _typeLabel: TYPE_LABELS[value] || '未知',
      options: newOptions,
      // 切换题型时清除答案（选项结构可能变化）
      answer: '',
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

  /* ─── 图片操作（预览&编辑模式共用）─── */

  onChooseStemImage(e) {
    const { index } = e.currentTarget.dataset;
    const questions = [...this.data.questions];
    const q = questions[index];
    const currentCount = (q._stemImages || []).length;
    if (currentCount >= 3) {
      wx.showToast({ title: '题干最多添加3张图片', icon: 'none' });
      return;
    }
    imageUploader.chooseImages(3 - currentCount, 3 - currentCount).then((paths) => {
      if (paths.length === 0) return;
      questions[index] = { ...q, _stemImages: [...(q._stemImages || []), ...paths] };
      this.setData({ questions });
    });
  },

  onRemoveStemImage(e) {
    const { index, imgUrl } = e.currentTarget.dataset;
    const questions = [...this.data.questions];
    const q = questions[index];
    questions[index] = { ...q, _stemImages: (q._stemImages || []).filter(function(p) { return p !== imgUrl; }) };
    this.setData({ questions });
  },

  onChooseOptionImage(e) {
    const { index, optIndex } = e.currentTarget.dataset;
    imageUploader.chooseImages(1, 1).then((paths) => {
      if (paths.length === 0) return;
      const questions = [...this.data.questions];
      const q = questions[index];
      const options = [...q.options];
      options[optIndex] = { ...options[optIndex], _image: paths[0] };
      questions[index] = { ...q, options };
      this.setData({ questions });
    });
  },

  onRemoveOptionImage(e) {
    const { index, optIndex } = e.currentTarget.dataset;
    const questions = [...this.data.questions];
    const q = questions[index];
    const options = [...q.options];
    options[optIndex] = { ...options[optIndex], _image: '' };
    questions[index] = { ...q, options };
    this.setData({ questions });
  },

  onChooseExplanationImage(e) {
    const { index } = e.currentTarget.dataset;
    const questions = [...this.data.questions];
    const q = questions[index];
    const currentCount = (q._explanationImages || []).length;
    if (currentCount >= 3) {
      wx.showToast({ title: '解析最多添加3张图片', icon: 'none' });
      return;
    }
    imageUploader.chooseImages(3 - currentCount, 3 - currentCount).then((paths) => {
      if (paths.length === 0) return;
      questions[index] = { ...q, _explanationImages: [...(q._explanationImages || []), ...paths] };
      this.setData({ questions });
    });
  },

  onRemoveExplanationImage(e) {
    const { index, imgUrl } = e.currentTarget.dataset;
    const questions = [...this.data.questions];
    const q = questions[index];
    questions[index] = { ...q, _explanationImages: (q._explanationImages || []).filter(function(p) { return p !== imgUrl; }) };
    this.setData({ questions });
  },

  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset;
    if (url) imageUploader.previewImage(url);
  },

  /* ─── 选项增删 ─── */
  addOption(e) {
    const { index } = e.currentTarget.dataset;
    const questions = [...this.data.questions];
    const q = questions[index];
    const options = [...q.options];
    if (options.length >= MAX_OPTIONS) return;
    const nextKey = String.fromCharCode(65 + options.length);
    options.push({ key: nextKey, text: '', _image: '', _sel: false });
    questions[index] = { ...q, options: options };
    this.setData({ questions });
  },

  deleteOption(e) {
    const { index, optIndex } = e.currentTarget.dataset;
    const questions = [...this.data.questions];
    const options = questions[index].options.filter((_, i) => i !== optIndex);
    // 重新编号 key
    const rekeyed = options.map((opt, i) => ({
      ...opt,
      key: String.fromCharCode(65 + i),
      _sel: false,
    }));
    // 删除选项后自动清除答案，避免答案与选项不匹配
    questions[index] = { ...questions[index], options: rekeyed, answer: '' };
    this.setData({ questions });
  },

  /* ─── 答案选择 ─── */
  toggleOptionAnswer(e) {
    try {
      var idx = Number(e.currentTarget.dataset.qIdx);
      var key = e.currentTarget.dataset.optKey;

      console.log('[toggleOptionAnswer] idx:', idx, 'key:', key);

      if (isNaN(idx) || typeof key === 'undefined') return;

      var questions = this.data.questions.slice(); // 浅拷贝数组
      var q = questions[idx];
      if (!q) return;

      // 计算新答案
      var newAnswer;
      if (q.type === 'single_choice' || q.type === 'true_false') {
        newAnswer = key;
      } else if (q.type === 'multi_choice') {
        var parts = (q.answer || '').split(/[,，]/).map(function(s){return s.trim();}).filter(Boolean);
        var pos = parts.indexOf(key);
        if (pos > -1) parts.splice(pos, 1);
        else parts.push(key);
        newAnswer = parts.sort().join(',');
      } else {
        return;
      }

      // 创建全新 options 数组（每个 option 是新对象，让框架检测到变化）
      var newOpts = q.options.map(function(opt) {
        return {
          key: opt.key,
          text: opt.text || '',
          _image: opt._image || '',
          _sel: newAnswer.indexOf(opt.key) > -1
        };
      });

      // 创建全新 question 对象替换旧引用
      questions[idx] = {
        _idx: q._idx,
        type: q.type,
        stem: q.stem,
        _stemImages: q._stemImages,
        _explanationImages: q._explanationImages,
        options: newOpts,
        answer: newAnswer,
        explanation: q.explanation,
        _editing: q._editing,
        _typeLabel: q._typeLabel,
        _detectionConfidence: q._detectionConfidence,
        _detectionNote: q._detectionNote
      };

      this.setData({ questions: questions });

    } catch (err) {
      console.error('[toggleOptionAnswer] ERROR:', err);
    }
  },

  /* ─── 确认导入 ─── */
  confirmImport() {
    const { questions, bankName, importing, source, filePath } = this.data;
    if (importing) return;

    // 最终校验
    const invalidQuestions = questions.filter(
      (q) => !q.stem || !q.stem.trim() || !q.answer
    );
    if (invalidQuestions.length > 0) {
      wx.showModal({
        title: '存在不完整题目',
        content: `有 ${invalidQuestions.length} 道题缺少题干或答案，是否跳过这些题目继续导入？`,
        success: (res) => {
          if (res.confirm) {
            const valid = questions.filter(
              (q) => q.stem && q.stem.trim() && q.answer
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

    // 收集所有待上传的图片临时路径
    const allTempPaths = [];
    questions.forEach(function (q) {
      (q._stemImages || []).forEach(function (p) { allTempPaths.push(p); });
      (q._explanationImages || []).forEach(function (p) { allTempPaths.push(p); });
      (q.options || []).forEach(function (opt) {
        if (opt._image) allTempPaths.push(opt._image);
      });
    });

    // 如果没有任何图片需要上传，直接导入
    if (allTempPaths.length === 0) {
      this._doSendImport(bankName, questions, source, filePath);
      return;
    }

    wx.showLoading({ title: '上传图片中...', mask: true });

    var that = this;
    imageUploader.uploadImages(allTempPaths, 'q').then(function (result) {
      wx.hideLoading();

      // 将临时路径替换为 cloudFileID
      var updatedQuestions = questions.map(function (q) {
        return {
          ...q,
          _stemImages: (q._stemImages || []).map(function (p) { return result.pathMap[p] || p; }),
          _explanationImages: (q._explanationImages || []).map(function (p) { return result.pathMap[p] || p; }),
          options: (q.options || []).map(function (opt) {
            return { ...opt, _image: result.pathMap[opt._image] || opt._image || '' };
          }),
        };
      });

      that._doSendImport(bankName, updatedQuestions, source, filePath);
    }).catch(function (err) {
      wx.hideLoading();
      console.error('图片上传失败:', err);
      wx.showModal({
        title: '上传失败',
        content: '图片上传失败: ' + (err.errMsg || '网络异常') + '。是否跳过图片直接导入？',
        confirmText: '跳过图片导入',
        cancelText: '返回修改',
        success: function (res) {
          if (res.confirm) {
            // 清除图片，直接导入
            var noImgQuestions = questions.map(function (q) {
              return { ...q, _stemImages: [], _explanationImages: [], options: (q.options || []).map(function(opt) { return { ...opt, _image: '' }; }) };
            });
            that._doSendImport(bankName, noImgQuestions, source, filePath);
          } else {
            that.setData({ importing: false });
          }
        },
      });
    });
  },

  _doSendImport(bankName, questions, source, filePath) {
    var that = this;

    // 清理内部字段
    var cleanQuestions = questions.map(function (q) {
      return {
        type: q.type,
        stem: (q.stem || '').trim(),
        options: (q.options || []).map(function(opt) {
          return { key: opt.key, text: (opt.text || '').trim(), image: opt._image || '' };
        }),
        answer: q.answer ? q.answer.trim() : '',
        explanation: q.explanation ? q.explanation.trim() : '',
        stemImages: (q._stemImages || []).filter(function(p) { return p && p.indexOf('cloud://') === 0; }),
        explanationImages: (q._explanationImages || []).filter(function(p) { return p && p.indexOf('cloud://') === 0; }),
      };
    });

    var importData = {
      type: 'importBank',
      bankName: bankName.trim(),
      bankType: 'custom',
      questions: cleanQuestions,
      source: source || 'manual',
    };

    if (source === 'excel' && filePath) {
      // Excel 文件上传路径保持原逻辑
      wx.showLoading({ title: '上传文件中...', mask: true });
      const cloudPath = 'imports/' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.xlsx';
      wx.cloud.uploadFile({ cloudPath, filePath }).then(function (uploadRes) {
        wx.showLoading({ title: '解析导入中...', mask: true });
        return wx.cloud.callFunction({ name: 'quickstartFunctions', data: { type: 'importBankByExcel', fileID: uploadRes.fileID, bankName: bankName.trim() } });
      }).then(function (res) {
        wx.hideLoading();
        if (res.result && res.result.success) {
          that.onImportSuccess(res.result);
        } else {
          that.onImportFail(res.result ? res.result.errMsg : '解析失败');
        }
      }).catch(function (err) {
        wx.hideLoading();
        console.error('导入失败:', err);
        that.onImportFail(err.errMsg || '文件上传失败，请重试');
      });
      return;
    }

    wx.showLoading({ title: '导入中...', mask: true });

    wx.cloud.callFunction({ name: 'quickstartFunctions', data: importData })
      .then(function (res) {
        wx.hideLoading();
        if (res.result && res.result.success) {
          that.onImportSuccess(res.result);
        } else {
          that.onImportFail(res.result ? res.result.errMsg : '未知错误');
        }
      })
      .catch(function (err) {
        wx.hideLoading();
        console.error('导入失败:', err);
        that.onImportFail(err.errMsg || '网络异常，请重试');
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
