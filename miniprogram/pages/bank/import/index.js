const { parseQuestions } = require('../../../utils/questionParser');

const TYPE_LABELS = {
  single_choice: '单选题',
  multi_choice: '多选题',
  true_false: '判断题',
  fill_blank: '填空题',
  short_answer: '简答题',
};

Page({
  data: {
    isDark: false,
    currentMethod: 'excel',
    methods: [
      { id: 'excel', label: 'Excel', icon: '/images/kzg/file-blue.svg' },
      { id: 'word', label: 'Word文档', icon: '/images/kzg/book-blue.svg' },
      { id: 'text', label: '文本粘贴', icon: '/images/kzg/pen-blue.svg' },
      { id: 'ocr', label: '拍照OCR', icon: '/images/kzg/chat-blue.svg' },
      { id: 'manual', label: '手动录入', icon: '/images/kzg/plus-blue.svg' },
    ],
    // Excel
    uploadFile: null,
    // Word
    uploadWordFile: null,
    // 文本粘贴
    textContent: '',
    showFormatHelp: false,
    parsedQuestions: [],
    parseStatsText: '',
    // OCR
    ocrImagePath: '',
    ocrRemaining: 20,
    // 手动录入
    manualQuestions: [],
    // 题库名称
    bankName: '',
    // 状态
    canProceed: false,
  },

  onLoad() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
    this.loadOcrRemaining();
    this.updateCanProceed();
  },

  onShow() {
    var app = getApp();
    var effectiveTheme = app.globalData.effectiveTheme || 'light';
    this.setData({ isDark: effectiveTheme === 'dark' });
    // 从手动录入页返回时刷新列表
    const manualQuestions = wx.getStorageSync('manualDraft') || [];
    if (manualQuestions.length > 0) {
      this.setData({
        manualQuestions: manualQuestions.map((q) => ({
          ...q,
          typeLabel: TYPE_LABELS[q.type] || '未知题型',
        })),
      });
    }
    this.updateCanProceed();
  },

  /* ─── Tab 切换 ─── */
  switchMethod(e) {
    const { method } = e.currentTarget.dataset;
    this.setData({ currentMethod: method });
    this.updateCanProceed();
  },

  /* ─── 格式帮助 ─── */
  toggleFormatHelp() {
    this.setData({ showFormatHelp: !this.data.showFormatHelp });
  },

  /* ─── 题库名称 ─── */
  onBankNameInput(e) {
    this.setData({ bankName: e.detail.value });
    this.updateCanProceed();
  },

  /* ─── 文本输入 ─── */
  onTextInput(e) {
    const textContent = e.detail.value;
    this.setData({ textContent });

    // 实时解析预览
    if (textContent.trim().length > 10) {
      const result = parseQuestions(textContent);
      // 构建带题型分布的统计文本
      let statsText = `识别到 ${result.stats.parsed} 题`;
      if (result.typeDistribution) {
        const typeLabels = { single_choice: '单选', multi_choice: '多选', true_false: '判断', fill_blank: '填空', short_answer: '简答' };
        const parts = [];
        Object.keys(result.typeDistribution).forEach(function (t) {
          const label = typeLabels[t] || t;
          parts.push(label + result.typeDistribution[t] + '题');
        });
        if (parts.length > 0) {
          statsText += '（' + parts.join(' ') + '）';
        }
      }
      this.setData({
        parsedQuestions: result.questions,
        parseStatsText: statsText,
      });
    } else {
      this.setData({ parsedQuestions: [], parseStatsText: '' });
    }
    this.updateCanProceed();
  },

  /* ─── Excel 操作 ─── */
  downloadTemplate() {
    wx.showLoading({ title: '生成模板中...' });
    // 调用云函数生成 Excel 模板并下载
    wx.cloud
      .callFunction({
        name: 'quickstartFunctions',
        data: { type: 'downloadImportTemplate' },
      })
      .then((res) => {
        wx.hideLoading();
        if (res.result && res.result.fileID) {
          wx.cloud.downloadFile({
            fileID: res.result.fileID,
            success: (downloadRes) => {
              wx.openDocument({
                filePath: downloadRes.tempFilePath,
                showMenu: true,
              });
            },
          });
        }
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('下载模板失败:', err);
        wx.showToast({ title: '模板下载失败，请重试', icon: 'none' });
      });
  },

  chooseExcel() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success: (res) => {
        const file = res.tempFiles[0];
        if (file.size > 10 * 1024 * 1024) {
          wx.showToast({ title: '文件大小不能超过10MB', icon: 'none' });
          return;
        }
        this.setData({
          uploadFile: {
            name: file.name,
            size: this.formatSize(file.size),
            path: file.path,
          },
        });
        this.updateCanProceed();
      },
      fail: (err) => {
        if (err.errMsg.includes('cancel')) return;
        wx.showToast({ title: '选择文件失败', icon: 'none' });
      },
    });
  },

  /* ─── Word 文档 ─── */
  downloadWordTemplate() {
    wx.showLoading({ title: '生成模板中...' });
    wx.cloud
      .callFunction({
        name: 'quickstartFunctions',
        data: { type: 'downloadImportTemplate' },
      })
      .then((res) => {
        wx.hideLoading();
        if (res.result && res.result.fileID) {
          wx.cloud.downloadFile({
            fileID: res.result.fileID,
            success: (downloadRes) => {
              wx.openDocument({
                filePath: downloadRes.tempFilePath,
                showMenu: true,
              });
            },
          });
        }
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('下载模板失败:', err);
        wx.showToast({ title: '模板下载失败，请重试', icon: 'none' });
      });
  },

  chooseWord() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['docx', 'doc'],
      success: (res) => {
        const file = res.tempFiles[0];
        if (file.size > 10 * 1024 * 1024) {
          wx.showToast({ title: '文件大小不能超过10MB', icon: 'none' });
          return;
        }
        this.setData({
          uploadWordFile: {
            name: file.name,
            size: this.formatSize(file.size),
            path: file.path,
          },
        });
        this.updateCanProceed();
      },
      fail: (err) => {
        if (err.errMsg.includes('cancel')) return;
        wx.showToast({ title: '选择文件失败', icon: 'none' });
      },
    });
  },

  processWordDocument() {
    const { uploadWordFile } = this.data;
    if (!uploadWordFile) return;

    console.log('[processWordDocument] Starting, file:', uploadWordFile.name, 'size:', uploadWordFile.size, 'path type:', typeof uploadWordFile.path);

    wx.showLoading({ title: '解析Word文档中...', mask: true });

    // 微信 Windows 开发者工具中 wx.chooseMessageFile 返回的临时路径无法被 cloud.uploadFile 直接访问。
    // 解决方案：用 FileSystemManager 先读后写，将文件持久化到用户目录
    const fs = wx.getFileSystemManager();
    let filePath = uploadWordFile.path;
    try {
      const fileData = fs.readFileSync(uploadWordFile.path);
      const persistentPath = `${wx.env.USER_DATA_PATH}/word_import_${Date.now()}.docx`;
      fs.writeFileSync(persistentPath, fileData);
      filePath = persistentPath;
      console.log('[processWordDocument] File persisted:', persistentPath, 'size:', fileData.length);
    } catch (e) {
      console.warn('[processWordDocument] readFile/writeFile failed:', e.message);
      // 尝试 saveFileSync 作为备选
      try {
        filePath = fs.saveFileSync(uploadWordFile.path);
        console.log('[processWordDocument] saveFileSync succeeded:', filePath);
      } catch (e2) {
        console.warn('[processWordDocument] saveFileSync also failed:', e2.message);
      }
    }

    console.log('[processWordDocument] Uploading with filePath:', filePath);

    const cloudPath = `word/${Date.now()}_${Math.random().toString(36).slice(2)}.docx`;
    wx.cloud
      .uploadFile({ cloudPath, filePath: filePath })
      .then((uploadRes) => {
        return wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'parseWordDocument',
            fileID: uploadRes.fileID,
          },
        });
      })
      .then((res) => {
        wx.hideLoading();

        console.log('[processWordDocument] Cloud function result:', {
          hasResult: !!res,
          success: res && res.result ? res.result.success : undefined,
          questionCount: res && res.result && res.result.questions ? res.result.questions.length : 0,
          fullResultKeys: res && res.result ? Object.keys(res.result) : [],
        });

        if (res.result && res.result.success) {
          const rawQuestions = res.result.questions || [];
          console.log('[processWordDocument] Raw questions received:', rawQuestions.length);

          const questions = rawQuestions.map(function (q, idx) {
            // 记录异常题目
            if (!q.stem || q.stem.trim() === '') {
              console.warn('[processWordDocument] Question at index', idx, 'has empty stem:', q);
            }
            return {
              type: q.type || 'single_choice',
              stem: q.stem || '',
              options: q.options || [],
              answer: q.answer || '',
              explanation: q.explanation || '',
            };
          });

          // 过滤完全空题干的题目
          const validQuestions = questions.filter(function (q) {
            return q.stem.trim() !== '';
          });
          if (validQuestions.length < questions.length) {
            console.warn('[processWordDocument] Filtered out', questions.length - validQuestions.length, 'empty-stem questions');
          }

          console.log('[processWordDocument] Mapped valid questions:', validQuestions.length);

          // 构建题型分布统计
          const typeLabels = { single_choice: '单选', multi_choice: '多选', true_false: '判断', fill_blank: '填空', short_answer: '简答' };
          const typeCount = {};
          validQuestions.forEach(function (q) {
            typeCount[q.type] = (typeCount[q.type] || 0) + 1;
          });
          let statsText = 'Word文档识别到 ' + validQuestions.length + ' 题';
          const typeParts = [];
          Object.keys(typeCount).forEach(function (t) {
            typeParts.push((typeLabels[t] || t) + typeCount[t] + '题');
          });
          if (typeParts.length > 0) {
            statsText += '（' + typeParts.join(' ') + '）';
          }

          this.setData({
            parsedQuestions: validQuestions,
            parseStatsText: statsText,
          });

          console.log('[processWordDocument] Calling goPreviewWithData with', validQuestions.length, 'questions');
          this.goPreviewWithData(validQuestions, 'word');
        } else {
          const errMsg = (res.result && res.result.errMsg) ? res.result.errMsg : '解析失败';
          console.warn('[processWordDocument] Cloud function returned failure:', errMsg);
          wx.showToast({
            title: errMsg,
            icon: 'none',
            duration: 3000,
          });
        }
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('[processWordDocument] Promise chain caught error:', err);
        console.error('[processWordDocument] Error details:', JSON.stringify(err));
        wx.showToast({
          title: 'Word文档解析失败，请检查网络后重试',
          icon: 'none',
          duration: 3000,
        });
      });
  },

  /* ─── OCR ─── */
  takePhoto() {
    if (!this.checkOcrAvailable()) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      sizeType: ['compressed'],
      success: (res) => this.processOcrImage(res.tempFiles[0].tempFilePath),
    });
  },

  chooseImage() {
    if (!this.checkOcrAvailable()) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      sizeType: ['compressed'],
      success: (res) => this.processOcrImage(res.tempFiles[0].tempFilePath),
    });
  },

  checkOcrAvailable() {
    if (this.data.ocrRemaining <= 0) {
      wx.showToast({ title: '今日OCR次数已用完，请使用Excel导入', icon: 'none' });
      return false;
    }
    return true;
  },

  processOcrImage(filePath) {
    wx.showLoading({ title: 'OCR识别中...' });

    // 持久化临时文件（防止 Windows 开发者工具上临时路径失效）
    const fs = wx.getFileSystemManager();
    let uploadPath = filePath;
    try {
      uploadPath = fs.saveFileSync(filePath);
    } catch (e) {
      // 回退到原始路径
    }

    // 先上传到云存储
    const cloudPath = `ocr/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    wx.cloud
      .uploadFile({ cloudPath, filePath: uploadPath })
      .then((uploadRes) => {
        // 调用云函数进行OCR
        return wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'parseOCR',
            fileID: uploadRes.fileID,
          },
        });
      })
      .then((res) => {
        wx.hideLoading();
        if (res.result && res.result.questions) {
          const questions = res.result.questions;
          // 构建题型分布统计
          const typeLabels = { single_choice: '单选', multi_choice: '多选', true_false: '判断', fill_blank: '填空', short_answer: '简答' };
          const typeCount = {};
          questions.forEach(function (q) { typeCount[q.type] = (typeCount[q.type] || 0) + 1; });
          let statsText = 'OCR识别到 ' + questions.length + ' 题';
          const typeParts = [];
          Object.keys(typeCount).forEach(function (t) {
            typeParts.push((typeLabels[t] || t) + typeCount[t] + '题');
          });
          if (typeParts.length > 0) {
            statsText += '（' + typeParts.join(' ') + '）';
          }

          this.setData({
            parsedQuestions: this.mapOcrResult(questions),
            parseStatsText: statsText,
            ocrRemaining: Math.max(0, this.data.ocrRemaining - 1),
          });
          this.saveOcrRemaining();
          // 跳转到预览页
          this.goPreviewWithData(res.result.questions);
        } else {
          wx.showToast({ title: '未识别到题目，请重试', icon: 'none' });
        }
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('OCR失败:', err);
        wx.showToast({ title: 'OCR识别失败，请检查网络后重试', icon: 'none' });
      });
  },

  mapOcrResult(rawQuestions) {
    return rawQuestions.map((q) => ({
      type: q.type || 'single_choice',
      stem: q.stem || '',
      options: q.options || [],
      answer: q.answer || '',
      explanation: q.explanation || '',
    }));
  },

  // TODO: 后续接入云函数端 OCR 次数校验，防止客户端绕过本地 Storage 限制
  loadOcrRemaining() {
    const today = new Date().toISOString().slice(0, 10);
    const stored = wx.getStorageSync('ocrUsage');
    if (stored && stored.date === today) {
      this.setData({ ocrRemaining: Math.max(0, 20 - stored.count) });
    } else {
      this.setData({ ocrRemaining: 20 });
    }
  },

  saveOcrRemaining() {
    const today = new Date().toISOString().slice(0, 10);
    const stored = wx.getStorageSync('ocrUsage');
    const prevCount = (stored && stored.date === today) ? stored.count : 0;
    wx.setStorageSync('ocrUsage', {
      date: today,
      count: prevCount + 1,
    });
  },

  /* ─── 手动录入 ─── */
  goManualEntry() {
    wx.navigateTo({
      url: '/pages/bank/import-manual/index',
    });
  },

  editManualQuestion(e) {
    const { index } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/bank/import-manual/index?editIndex=${index}`,
    });
  },

  deleteManualQuestion(e) {
    const { index } = e.currentTarget.dataset;
    // 过滤掉被删除的题目，同时清除 typeLabel 防止污染存储
    const cleanQuestions = this.data.manualQuestions
      .filter((_, i) => i !== index)
      .map(({ typeLabel, ...q }) => q);
    wx.setStorageSync('manualDraft', cleanQuestions);
    this.setData({
      manualQuestions: cleanQuestions.map((q) => ({
        ...q,
        typeLabel: TYPE_LABELS[q.type] || '未知题型',
      })),
    });
    this.updateCanProceed();
  },

  /* ─── 预览跳转 ─── */
  goPreview() {
    const { currentMethod, parsedQuestions, manualQuestions, bankName, uploadFile, uploadWordFile } = this.data;

    if (!bankName.trim()) {
      wx.showToast({ title: '请先输入题库名称', icon: 'none' });
      return;
    }

    let questions = [];
    if (currentMethod === 'text') {
      questions = parsedQuestions;
    } else if (currentMethod === 'manual') {
      questions = manualQuestions;
    } else if (currentMethod === 'excel') {
      // Excel 在服务端解析，预览页只需文件信息即可
      if (!uploadFile) {
        wx.showToast({ title: '请先选择 Excel 文件', icon: 'none' });
        return;
      }
      questions = [];
    } else if (currentMethod === 'word') {
      // Word 点击预览按钮 → 触发解析后跳转
      if (!uploadWordFile) {
        wx.showToast({ title: '请先选择 Word 文件', icon: 'none' });
        return;
      }
      this.processWordDocument();
      return;
    }

    if (currentMethod !== 'excel' && questions.length === 0) {
      wx.showToast({ title: '请先添加题目', icon: 'none' });
      return;
    }

    if (questions.length > 500) {
      wx.showToast({ title: '单次最多导入500题，请删减后重试', icon: 'none' });
      return;
    }

    // 存入缓存传递给预览页
    wx.setStorageSync('importPreviewData', {
      bankName,
      questions,
      source: currentMethod,
      filePath: uploadFile ? uploadFile.path : null,
    });

    wx.navigateTo({
      url: '/pages/bank/import-preview/index',
    });
  },

  goPreviewWithData(questions, source) {
    var bankName = this.data.bankName;
    var finalSource = source || 'ocr';

    console.log('[goPreviewWithData] Called, questionCount:', questions ? questions.length : 0, 'source:', finalSource);

    // 空题目数组保护
    if (!questions || questions.length === 0) {
      console.error('[goPreviewWithData] Empty questions array, aborting navigation');
      wx.showToast({
        title: '未解析到有效题目，请检查文档格式后重试',
        icon: 'none',
        duration: 3000,
      });
      return;
    }

    var importData = {
      bankName: bankName,
      questions: questions,
      source: finalSource,
      filePath: null,
    };

    try {
      wx.setStorageSync('importPreviewData', importData);
      console.log('[goPreviewWithData] Storage written successfully');
    } catch (storageErr) {
      console.error('[goPreviewWithData] Storage write failed:', storageErr);
      wx.showToast({
        title: '数据暂存失败，请重试',
        icon: 'none',
        duration: 2000,
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/bank/import-preview/index',
      success: function (navRes) {
        console.log('[goPreviewWithData] Navigation succeeded', navRes);
      },
      fail: function (navErr) {
        console.error('[goPreviewWithData] Navigation FAILED:', navErr);
        wx.showToast({
          title: '页面跳转失败，请重试。' + (navErr.errMsg || ''),
          icon: 'none',
          duration: 3000,
        });
      },
      complete: function () {
        console.log('[goPreviewWithData] Navigation complete');
      },
    });
  },

  /* ─── 状态 ─── */
  updateCanProceed() {
    const { currentMethod, parsedQuestions, manualQuestions, uploadFile, uploadWordFile, bankName } = this.data;
    let canProceed = false;
    let parseStatsText = this.data.parseStatsText;

    if (!bankName.trim()) {
      canProceed = false;
    } else if (currentMethod === 'excel') {
      canProceed = !!uploadFile;
    } else if (currentMethod === 'word') {
      canProceed = !!uploadWordFile;
    } else if (currentMethod === 'text') {
      canProceed = parsedQuestions.length > 0;
      if (canProceed && !parseStatsText) {
        parseStatsText = `识别到 ${parsedQuestions.length} 题`;
      }
    } else if (currentMethod === 'manual') {
      canProceed = manualQuestions.length > 0;
      parseStatsText = `已录入 ${manualQuestions.length} 题`;
    } else if (currentMethod === 'ocr') {
      canProceed = false; // OCR 由拍照后自动跳转
    }

    this.setData({ canProceed, parseStatsText });
  },

  /* ─── 工具 ─── */
  formatSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  },
});
