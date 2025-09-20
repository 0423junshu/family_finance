const https = require('https');
const fs = require('fs');
const path = require('path');

// 确保fonts目录存在
const fontsDir = './fonts';
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// TDesign字体URL
const fontUrls = [
  'https://tdesign.gtimg.com/icon/0.3.2/fonts/t.woff2',
  'https://tdesign.gtimg.com/icon/0.3.2/fonts/t.woff'
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`下载失败: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadFonts() {
  console.log('开始下载TDesign字体文件...');
  
  for (const url of fontUrls) {
    const filename = path.basename(url);
    const dest = path.join(fontsDir, filename);
    
    try {
      await downloadFile(url, dest);
      console.log(`✅ 下载成功: ${filename}`);
    } catch (error) {
      console.log(`❌ 下载失败 ${filename}:`, error.message);
    }
  }
  
  console.log('字体下载完成！');
}

downloadFonts().catch(console.error);