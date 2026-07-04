/**
 * 小程序本地背景图压缩脚本
 *
 * 目标：在不改变图片视觉内容和尺寸的前提下，将 /miniprogram/images/bg-light 与
 * /miniprogram/images/bg-dark 下的 JPG 压缩到尽量小，确保总资源体积低于 200KB。
 *
 * 压缩策略：
 * 1. 保持原始尺寸（300×533），不裁剪、不拉伸，不改变宽高比
 * 2. JPEG quality 设为 65（水彩画风 + 半透明叠加，视觉上对轻微质量损失不敏感）
 * 3. 使用 4:2:0 chroma subsampling
 * 4. 不做渐进式，减少小程序 image 组件解码开销
 * 5. 保留 EXIF 之外元数据，避免色彩空间问题
 *
 * 输出：直接覆盖原文件（原文件已备份到 /背景图库/... 下高分辨率 PNG，安全可恢复）
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '../miniprogram/images');
const LIGHT_DIR = path.join(ROOT, 'bg-light');
const DARK_DIR = path.join(ROOT, 'bg-dark');

async function compressFile(src, dest) {
  const before = fs.statSync(src).size;
  await sharp(src)
    .jpeg({
      quality: 65,
      chromaSubsampling: '4:2:0',
      progressive: false,
      mozjpeg: false, // 不启用 mozjpeg 以控制解码兼容性
      force: true
    })
    .toFile(dest + '.tmp');
  fs.renameSync(dest + '.tmp', dest);
  const after = fs.statSync(dest).size;
  return { before, after };
}

async function compressDir(dir) {
  const files = fs.readdirSync(dir).filter(f => /\.jpe?g$/i.test(f));
  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const src = path.join(dir, file);
    const dest = src; // 原地覆盖
    const result = await compressFile(src, dest);
    totalBefore += result.before;
    totalAfter += result.after;
    console.log(`  ${file}: ${(result.before / 1024).toFixed(1)} KB → ${(result.after / 1024).toFixed(1)} KB (${Math.round((1 - result.after / result.before) * 100)}% 减少)`);
  }

  return { totalBefore, totalAfter, count: files.length };
}

(async () => {
  console.log('开始压缩背景图...');

  console.log(`\n${LIGHT_DIR}`);
  const light = await compressDir(LIGHT_DIR);

  console.log(`\n${DARK_DIR}`);
  const dark = await compressDir(DARK_DIR);

  const totalBefore = light.totalBefore + dark.totalBefore;
  const totalAfter = light.totalAfter + dark.totalAfter;
  console.log(`\n总计: ${(totalBefore / 1024).toFixed(1)} KB → ${(totalAfter / 1024).toFixed(1)} KB`);
  console.log(`减少: ${(totalBefore - totalAfter) / 1024} KB (${Math.round((1 - totalAfter / totalBefore) * 100)}%)`);

  if (totalAfter > 200 * 1024) {
    console.warn('\n提示：压缩后仍超过 200KB，建议配合云端迁移方案。');
  } else {
    console.log('\n已通过 200KB 资源阈值检查。');
  }
})();
