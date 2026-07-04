/**
 * 云端背景图配置模板
 *
 * 使用步骤：
 * 1. 通过微信开发者工具 → 云开发 → 存储，上传 miniprogram/images/bg-light 与 bg-dark 下的图片
 *    推荐路径：backgrounds/bg-light/1.jpg、backgrounds/bg-dark/夜间1.jpg
 * 2. 复制每个文件的 fileID（格式类似 cloud://ENV_ID-xxx/backgrounds/bg-light/1.jpg）
 * 3. 将本文件重命名为 bg-cloud.js，并把 fileID 填入下面数组
 * 4. app.js 会自动检测该配置并优先使用云端背景图
 *
 * 注意：fileID 必须以 cloud:// 开头，且与当前小程序的云环境一致。
 */

module.exports = {
  light: [
    // 示例：'cloud://your-env-id-xxx/backgrounds/bg-light/1.jpg',
    // 示例：'cloud://your-env-id-xxx/backgrounds/bg-light/2.jpg',
    // 示例：'cloud://your-env-id-xxx/backgrounds/bg-light/3.jpg',
    // 示例：'cloud://your-env-id-xxx/backgrounds/bg-light/4.jpg',
    // 示例：'cloud://your-env-id-xxx/backgrounds/bg-light/5.jpg',
    // 示例：'cloud://your-env-id-xxx/backgrounds/bg-light/7.jpg',
  ],
  dark: [
    // 示例：'cloud://your-env-id-xxx/backgrounds/bg-dark/夜间1.jpg',
    // 示例：'cloud://your-env-id-xxx/backgrounds/bg-dark/夜间2.jpg',
    // 示例：'cloud://your-env-id-xxx/backgrounds/bg-dark/夜间3.jpg',
    // 示例：'cloud://your-env-id-xxx/backgrounds/bg-dark/夜间4.jpg',
    // 示例：'cloud://your-env-id-xxx/backgrounds/bg-dark/夜间5.jpg',
    // 示例：'cloud://your-env-id-xxx/backgrounds/bg-dark/夜间6.jpg',
  ]
};
