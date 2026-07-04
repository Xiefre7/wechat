/**
 * 小程序背景图 WebP 转换与压缩脚本
 *
 * WebP 在微信小程序中得到支持，通常比 JPEG 体积小 25~35%。
 * 本脚本将 bg-light / bg-dark 下的 JPG 转为 WebP，并对比体积。
 * 默认输出到同名 .webp 文件，不直接覆盖原 JPG，便于对比与回滚。
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '../miniprogram/images');
const LIGHT_DIR = path.join(ROOT, 'bg-light');
const DARK_DIR = path.join(ROOT, 'bg-dark');

async function convertToWebp(src) {
  const webpPath = src.replace(/\.jpe?g$/i, '.webp');
  const before = fs.statSync(src).size;
  await sharp(src)
    .webp({
      quality: 70,
      effort: 6,        // 压缩 effort，越高体积越小（耗时越长）
      smartSubsample: true,
      nearLossless: false
    })
    .toFile(webpPath);
  const after = fs.statSync(webpPath).size;
  return { webpPath, before, after };
}

async function convertDir(dir) {
  const files = fs.readdirSync(dir).filter(f => /\.jpe?g$/i.test(f));
  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const src = path.join(dir, file);
    const result = await convertToWebp(src);
    totalBefore += result.before;
    totalAfter += result.after;
    console.log(`  ${file}: ${(result.before / 1024).toFixed(1)} KB → ${path.basename(result.webpPath)}: ${(result.after / 1024).toFixed(1)} KB (${Math.round((1 - result.after / result.before) * 100)}% 减少)`);
  }

  return { totalBefore, totalAfter, count: files.length };
}

(async () => {
  console.log('开始生成 WebP 并对比体积...');

  console.log(`\n${LIGHT_DIR}`);
  const light = await convertDir(LIGHT_DIR);

  console.log(`\n${DARK_DIR}`);
  const dark = await convertDir(DARK_DIR);

  const totalBefore = light.totalBefore + dark.totalBefore;
  const totalAfter = light.totalAfter + dark.totalAfter;
  console.log(`\n总计 JPG: ${(totalBefore / 1024).toFixed(1)} KB`);
  console.log(`总计 WebP: ${(totalAfter / 1024).toFixed(1)} KB`);
  console.log(`可减少: ${(totalBefore - totalAfter) / 1024} KB (${Math.round((1 - totalAfter / totalBefore) * 100)}%)`);

  if (totalAfter > 200 * 1024) {
    console.warn('\n提示：WebP 后仍超过 200KB，建议配合云端迁移或进一步减少本地张数。');
  } else {
    console.log('\nWebP 方案已通过 200KB 资源阈值检查。');
  }
})();
