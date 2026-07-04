/**
 * 资源体积分析脚本
 *
 * 扫描 miniprogram/ 目录下所有图片与音频资源，输出总大小、各类别占比，
 * 用于判断微信小程序「图片与音频资源超过 200k」审查项是否通过。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../miniprogram');
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
const AUDIO_EXTS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg'];
const ALL_EXTS = IMAGE_EXTS.concat(AUDIO_EXTS);

function walk(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walk(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ALL_EXTS.includes(ext)) {
        files.push({ path: fullPath, ext });
      }
    }
  }
  return files;
}

function main() {
  const files = walk(ROOT);
  const imageFiles = files.filter(f => IMAGE_EXTS.includes(f.ext));
  const audioFiles = files.filter(f => AUDIO_EXTS.includes(f.ext));

  let imageSize = 0;
  let audioSize = 0;

  imageFiles.forEach(f => { f.size = fs.statSync(f.path).size; imageSize += f.size; });
  audioFiles.forEach(f => { f.size = fs.statSync(f.path).size; audioSize += f.size; });

  const totalSize = imageSize + audioSize;

  console.log('=== 小程序资源体积分析 ===\n');
  console.log(`图片资源：${imageFiles.length} 个，${(imageSize / 1024).toFixed(2)} KB`);
  imageFiles.sort((a, b) => b.size - a.size).forEach(f => {
    const rel = path.relative(ROOT, f.path);
    console.log(`  ${(f.size / 1024).toFixed(2)} KB  ${rel}`);
  });

  console.log(`\n音频资源：${audioFiles.length} 个，${(audioSize / 1024).toFixed(2)} KB`);

  console.log(`\n合计：${(totalSize / 1024).toFixed(2)} KB`);
  if (totalSize > 200 * 1024) {
    console.warn(`⚠️ 超过 200 KB 阈值，超出 ${((totalSize - 200 * 1024) / 1024).toFixed(2)} KB`);
  } else {
    console.log('✅ 已通过 200 KB 阈值检查');
  }
}

main();
