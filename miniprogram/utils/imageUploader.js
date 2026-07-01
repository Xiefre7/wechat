/**
 * 导题斩题小工具 - 题目图片上传工具
 *
 * 提供图片选择、压缩、批量上传云存储的统一入口。
 * 用于预览/编辑页、手动录入页为题目添加配图。
 *
 * 使用微信原生 API：
 *   wx.chooseMedia   — 选择图片/视频（替代废弃的 chooseImage）
 *   wx.compressImage — 压缩图片
 *   wx.cloud.uploadFile  — 上传到云存储
 *   wx.previewImage  — 全屏预览
 */

'use strict';

/** 图片最大宽度（px），超过则压缩 */
const MAX_WIDTH = 1024;
/** 压缩质量 0-100 */
const COMPRESS_QUALITY = 80;
/** 上传失败最大重试次数 */
const MAX_RETRIES = 2;

/**
 * 持久化临时文件
 *
 * 微信 Windows 开发者工具中，chooseMedia/compressImage 返回的临时路径
 * 无法被 cloud.uploadFile 直接访问（file not found）。
 * 需要先用 FileSystemManager 将文件持久化到用户目录。
 *
 * @param {string} tempPath - 临时路径
 * @returns {string} 持久化后的路径
 */
function persistFile(tempPath) {
  // 已是云存储路径或永久本地路径，无需持久化
  if (!tempPath || tempPath.indexOf('cloud://') === 0 || tempPath.indexOf('wxfile://') === 0) {
    return tempPath;
  }

  var fs = wx.getFileSystemManager();
  // 策略1: saveFileSync（复制到持久存储）
  try {
    var savedPath = fs.saveFileSync(tempPath);
    console.log('[imageUploader] File persisted via saveFileSync:', savedPath);
    return savedPath;
  } catch (e1) {
    console.warn('[imageUploader] saveFileSync failed:', e1.message);
  }

  // 策略2: readFileSync + writeFileSync（手动复制到 USER_DATA_PATH）
  try {
    var data = fs.readFileSync(tempPath);
    var ext = getExt(tempPath);
    var persistentPath = wx.env.USER_DATA_PATH + '/img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + '.' + ext;
    fs.writeFileSync(persistentPath, data);
    console.log('[imageUploader] File persisted via writeFileSync:', persistentPath);
    return persistentPath;
  } catch (e2) {
    console.warn('[imageUploader] writeFileSync also failed:', e2.message);
  }

  // 策略3: 都失败了，返回原始路径（真机上通常不需要持久化）
  return tempPath;
}

/**
 * 选择图片（从相册或拍照）
 *
 * @param {number} count - 最多可选张数
 * @param {number} [maxCount] - 已选张数上限（用于判断剩余可添加数）
 * @returns {Promise<string[]>} tempFilePaths 数组
 */
function chooseImages(count, maxCount) {
  var remaining = maxCount !== undefined ? Math.max(1, maxCount) : count;
  if (remaining <= 0) {
    wx.showToast({ title: '已达图片数量上限', icon: 'none' });
    return Promise.resolve([]);
  }

  return new Promise(function (resolve) {
    wx.chooseMedia({
      count: Math.min(count, remaining),
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: function (res) {
        // 持久化临时文件（Windows 开发者工具兼容）
        var paths = (res.tempFiles || []).map(function (f) {
          return persistFile(f.tempFilePath);
        });
        resolve(paths);
      },
      fail: function (err) {
        // 用户取消不算错误
        if (err.errMsg && err.errMsg.indexOf('cancel') > -1) {
          resolve([]);
          return;
        }
        console.error('[imageUploader] chooseMedia failed:', err);
        wx.showToast({ title: '选择图片失败，请重试', icon: 'none' });
        resolve([]);
      },
    });
  });
}

/**
 * 压缩单张图片
 *
 * @param {string} src - 图片临时路径
 * @returns {Promise<string>} 压缩后的临时路径
 */
function compressImage(src) {
  return new Promise(function (resolve) {
    wx.compressImage({
      src: src,
      quality: COMPRESS_QUALITY,
      compressedWidth: MAX_WIDTH,
      success: function (res) {
        resolve(persistFile(res.tempFilePath));
      },
      fail: function () {
        // 压缩失败使用原图
        console.warn('[imageUploader] compressImage failed, using original:', src);
        resolve(src);
      },
    });
  });
}

/**
 * 获取文件扩展名
 *
 * @param {string} path - 文件路径
 * @returns {string}
 */
function getExt(path) {
  var m = path.match(/\.(\w+)(?:\?.*)?$/);
  return m ? m[1].toLowerCase() : 'jpg';
}

/**
 * 单张上传（带重试）
 *
 * @param {string} tempPath - 本地临时路径
 * @param {string} cloudPath - 云存储目标路径
 * @param {number} [retries] - 剩余重试次数
 * @returns {Promise<string>} cloudFileID
 */
function uploadOne(tempPath, cloudPath, retries) {
  var remaining = typeof retries === 'number' ? retries : MAX_RETRIES;
  // 安全网：上传前确保文件已持久化
  var safePath = persistFile(tempPath);

  return new Promise(function (resolve, reject) {
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: safePath,
      success: function (res) {
        resolve(res.fileID);
      },
      fail: function (err) {
        if (remaining > 0) {
          console.warn('[imageUploader] Upload retry, remaining:', remaining, 'path:', cloudPath);
          setTimeout(function () {
            uploadOne(safePath, cloudPath, remaining - 1).then(resolve).catch(reject);
          }, 1000);
        } else {
          console.error('[imageUploader] Upload failed after retries:', err);
          reject(err);
        }
      },
    });
  });
}

/**
 * 批量上传图片到云存储
 *
 * 云存储路径：question-images/{prefix}/{timestamp}_{random}.{ext}
 *
 * @param {string[]} tempPaths - 本地临时路径数组
 * @param {string} [prefix] - 路径前缀（如 'stem'、'option'、'explanation'）
 * @returns {Promise<Object>} { fileIDs: string[], pathMap: {[tempPath]: cloudFileID} }
 */
function uploadImages(tempPaths, prefix) {
  if (!tempPaths || tempPaths.length === 0) {
    return Promise.resolve({ fileIDs: [], pathMap: {} });
  }

  var pfx = prefix || 'img';
  var ts = Date.now();

  // 先去重
  var unique = [];
  var seen = {};
  for (var i = 0; i < tempPaths.length; i++) {
    if (!seen[tempPaths[i]]) {
      seen[tempPaths[i]] = true;
      unique.push(tempPaths[i]);
    }
  }

  // 分离：已上传的云存储路径直接保留，本地路径需要压缩+上传
  var localPaths = [];
  var cloudPaths = {};
  for (var j = 0; j < unique.length; j++) {
    if (unique[j].indexOf('cloud://') === 0 || unique[j].indexOf('wxfile://') === 0) {
      // 已是云端/持久路径，无需再上传
      cloudPaths[unique[j]] = unique[j];
    } else {
      localPaths.push(unique[j]);
    }
  }

  // 没有需要上传的本地文件，直接返回已有云路径
  if (localPaths.length === 0) {
    var existingIDs = [];
    var existingKeys = Object.keys(cloudPaths);
    for (var ek = 0; ek < existingKeys.length; ek++) {
      existingIDs.push(cloudPaths[existingKeys[ek]]);
    }
    return Promise.resolve({ fileIDs: existingIDs, pathMap: cloudPaths });
  }

  // 先压缩所有本地图片
  var compressPromises = localPaths.map(function (path) {
    return compressImage(path);
  });

  return Promise.all(compressPromises).then(function (compressedPaths) {
    // 逐个上传
    var pathMap = {};
    // 先填入已有的云路径映射
    var cloudKeys = Object.keys(cloudPaths);
    for (var ck = 0; ck < cloudKeys.length; ck++) {
      pathMap[cloudKeys[ck]] = cloudPaths[cloudKeys[ck]];
    }
    var fileIDs = [];
    var cloudValues = [];
    for (var vk = 0; vk < cloudKeys.length; vk++) {
      cloudValues.push(cloudPaths[cloudKeys[vk]]);
    }
    fileIDs = fileIDs.concat(cloudValues);

    function uploadNext(index) {
      if (index >= compressedPaths.length) {
        return { fileIDs: fileIDs, pathMap: pathMap };
      }

      var originalPath = localPaths[index];
      var compressedPath = compressedPaths[index];
      var ext = getExt(compressedPath);
      var cloudPath = 'question-images/' + pfx + '/' + ts + '_' + index + '_' +
        Math.random().toString(36).slice(2, 8) + '.' + ext;

      return uploadOne(compressedPath, cloudPath).then(function (fileID) {
        pathMap[originalPath] = fileID;
        pathMap[compressedPath] = fileID;
        fileIDs.push(fileID);
        return uploadNext(index + 1);
      });
    }

    return uploadNext(0);
  });
}

/**
 * 上传单张图片（便捷方法）
 *
 * @param {string} tempPath - 本地临时路径
 * @param {string} [prefix] - 路径前缀
 * @returns {Promise<string>} cloudFileID
 */
function uploadSingleImage(tempPath, prefix) {
  return uploadImages([tempPath], prefix).then(function (result) {
    return result.fileIDs[0] || '';
  });
}

/**
 * 预览图片（全屏）
 *
 * @param {string} url - 图片 URL/cloudFileID
 * @param {string[]} [urls] - 图片列表（用于左右滑动预览）
 */
function previewImage(url, urls) {
  var list = urls && urls.length > 0 ? urls : [url];
  var current = url || (list[0] || '');
  if (!current) return;

  wx.previewImage({
    current: current,
    urls: list,
  });
}

module.exports = {
  chooseImages: chooseImages,
  uploadImages: uploadImages,
  uploadSingleImage: uploadSingleImage,
  previewImage: previewImage,
  compressImage: compressImage,
  persistFile: persistFile,
};
