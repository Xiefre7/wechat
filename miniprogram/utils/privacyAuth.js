/**
 * 隐私API授权检查工具
 *
 * 微信小程序隐私合规要求：
 * - 调用 wx.chooseMedia / wx.chooseMessageFile / wx.getLocation 等隐私API前
 *   必须先确保用户已同意《隐私保护指引》
 * - 用户拒绝或未同意时，应引导用户到设置页开启
 *
 * 使用方法：
 *   const privacyAuth = require('./privacyAuth');
 *   privacyAuth.ensureAuthorized().then(() => {
 *     wx.chooseMedia({ ... });
 *   });
 */

/**
 * 确保用户已授权隐私API访问
 * - 已授权 → resolve()
 * - 未授权 → 弹出微信原生授权窗 → 同意则 resolve()，拒绝则 reject()
 *
 * @returns {Promise<void>}
 */
function ensureAuthorized() {
  // 防止递归循环：限制最多重试 1 次
  var retryCount = 0;

  function _doCheck() {
    return new Promise(function (resolve, reject) {
    // 微信基础库 2.32.3+ 支持 getPrivacySetting
    if (!wx.getPrivacySetting) {
      // 旧版本基础库无需隐私授权检查，直接放行
      resolve();
      return;
    }

    wx.getPrivacySetting({
      success: function (res) {
        // res.needAuthorization: 是否需要用户授权
        if (res.needAuthorization) {
          // 需要授权 → 触发微信原生隐私授权弹窗
          wx.requirePrivacyAuthorize({
            success: function () {
              // 用户已同意
              resolve();
            },
            fail: function (err) {
              // 用户拒绝授权
              console.warn('[privacyAuth] 用户拒绝隐私授权:', err);
              wx.showModal({
                title: '需要隐私授权',
                content: '该功能需要您同意《隐私保护指引》后才能使用。是否前往设置开启？',
                confirmText: '去设置',
                cancelText: '取消',
                success: function (modalRes) {
                  if (modalRes.confirm) {
                    wx.openPrivacyContract({
                      success: function () {
                        // 用户查看完隐私协议后返回，仅重试一次，防止无限循环
                        if (retryCount < 1) {
                          retryCount++;
                          _doCheck().then(resolve).catch(reject);
                        } else {
                          reject(new Error('用户查看协议后仍未授权'));
                        }
                      },
                      fail: function () {
                        reject(new Error('打开隐私协议失败'));
                      },
                    });
                  } else {
                    reject(new Error('用户取消授权'));
                  }
                },
              });
            },
          });
        } else {
          // 已授权，直接放行
          resolve();
        }
      },
      fail: function (err) {
        // getPrivacySetting 失败时拒绝调用，由调用方决定降级策略
        // 隐私合规是强制要求，不能静默放行
        console.warn('[privacyAuth] getPrivacySetting failed:', err);
        reject(new Error('隐私授权检查失败，请稍后重试'));
      },
    });
    });
  }

  return _doCheck();
}

/**
 * 包装器：在调用隐私API前自动检查授权
 *
 * @param {Function} apiCall - 实际调用隐私API的函数
 * @returns {Promise<any>} API调用的结果
 *
 * @example
 *   privacyAuth.wrap(() => {
 *     return new Promise((resolve) => {
 *       wx.chooseMedia({ ..., success: (res) => resolve(res) });
 *     });
 *   }).then(res => { ... });
 */
function wrap(apiCall) {
  return ensureAuthorized().then(function () {
    return apiCall();
  });
}

module.exports = {
  ensureAuthorized: ensureAuthorized,
  wrap: wrap,
};
