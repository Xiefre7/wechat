/**
 * 重新生成背景图：
 * 从高清 PNG 源图压缩为小体积 JPG，替换现有背景图库
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC_LIGHT = path.resolve(__dirname, '../背景图库/白天.亮色模式背景图');
const SRC_DARK = path.resolve(__dirname, '../背景图库/夜间.深色模式背景图');
const DST_LIGHT = path.resolve(__dirname, '../miniprogram/images/bg-light');
const DST_DARK = path.resolve(__dirname, '../miniprogram/images/bg-dark');

const LIGHT_FILES = ['1.png', '2.png', '3.png', '7.png'];
const DARK_FILES = ['夜间1.png', '夜间2.png', '夜间6.png'];

async function convert(srcPng, dstJpg) {
  const before = fs.statSync(srcPng).size;
  await sharp(srcPng)
    .resize(375, 667, { fit: 'cover', position: 'center' }) // 适配小程序尺寸
    .jpeg({
      quality: 28,
      chromaSubsampling: '4:2:0',
      progressive: false,
      mozjpeg: false,
      force: true
    })
    .toFile(dstJpg);
  const after = fs.statSync(dstJpg).size;
  console.log(`  ${path.basename(srcPng)}: ${(before / 1024 / 1024).toFixed(2)} MB → ${path.basename(dstJpg)}: ${(after / 1024).toFixed(1)} KB`);
  return after;
}

(async () => {
  console.log('清空旧背景图...');
  // 清空目标目录
  [DST_LIGHT, DST_DARK].forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(f => {
        if (/\.(jpg|png|webp)$/i.test(f)) {
          fs.unlinkSync(path.join(dir, f));
        }
      });
    } else {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  console.log('\n转换亮色背景图...');
  let total = 0;
  for (const file of LIGHT_FILES) {
    total += await convert(path.join(SRC_LIGHT, file), path.join(DST_LIGHT, file.replace('.png', '.jpg')));
  }

  console.log('\n转换深色背景图...');
  for (const file of DARK_FILES) {
    total += await convert(path.join(SRC_DARK, file), path.join(DST_DARK, file.replace('.png', '.jpg')));
  }

  console.log(`\n总计: ${(total / 1024).toFixed(1)} KB`);
  if (total > 200 * 1024) {
    console.warn('⚠️ 超过 200 KB');
  } else {
    console.log('✅ 通过 200 KB 阈值');
  }
})();
