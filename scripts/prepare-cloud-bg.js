/**
 * 自动生成云端背景图上传清单
 *
 * 输出：
 * 1. 推荐的上传目录结构
 * 2. 需要替换到 bg-cloud.js 的 fileID 占位符列表
 * 3. 一键复制到微信开发者工具「云存储」面板的说明
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../miniprogram/images');
const LIGHT_DIR = path.join(ROOT, 'bg-light');
const DARK_DIR = path.join(ROOT, 'bg-dark');

function listFiles(dir, cloudPrefix) {
  return fs.readdirSync(dir)
    .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
    .map(f => ({
      local: `miniprogram/images/${path.basename(dir)}/${f}`,
      cloudPath: `${cloudPrefix}/${f}`,
      fileIdPlaceholder: `cloud://YOUR_ENV_ID/${cloudPrefix}/${f}`
    }));
}

const lightFiles = listFiles(LIGHT_DIR, 'backgrounds/bg-light');
const darkFiles = listFiles(DARK_DIR, 'backgrounds/bg-dark');

console.log('=== 云端背景图上传清单 ===\n');
console.log('请在微信开发者工具中执行：');
console.log('1. 点击顶部「云开发」→「存储」');
console.log('2. 新建文件夹 backgrounds/bg-light 与 backgrounds/bg-dark');
console.log('3. 分别上传以下文件：\n');

console.log('【bg-light】');
lightFiles.forEach(f => console.log(`  本地: ${f.local}  →  云端路径: ${f.cloudPath}`));

console.log('\n【bg-dark】');
darkFiles.forEach(f => console.log(`  本地: ${f.local}  →  云端路径: ${f.cloudPath}`));

console.log('\n=== 配置 bg-cloud.js ===\n');
console.log('上传完成后，复制 fileID 到 miniprogram/config/bg-cloud.js：\n');
console.log('module.exports = {');
console.log('  light: [');
lightFiles.forEach(f => console.log(`    '${f.fileIdPlaceholder}',`));
console.log('  ],');
console.log('  dark: [');
darkFiles.forEach(f => console.log(`    '${f.fileIdPlaceholder}',`));
console.log('  ]');
console.log('};');

console.log('\n=== 删除本地背景图 ===\n');
console.log('确认云端加载正常后，可删除 miniprogram/images/bg-light 与 bg-dark 文件夹，');
console.log('使小程序包内图片资源降至约 13KB（仅 SVG 图标）。');
