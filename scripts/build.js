/**
 * 小程序构建脚本
 */

console.log('开始构建小程序...');

// 1. 检查依赖
console.log('检查依赖...');
try {
  // 检查是否在 node_modules 目录中
  const fs = require('fs');
  const path = require('path');
  const tdesignPath = path.join(__dirname, '../node_modules/tdesign-miniprogram');
  
  if (fs.existsSync(tdesignPath)) {
    console.log('✅ TDesign组件已安装');
  } else {
    throw new Error('TDesign组件未找到');
  }
} catch (e) {
  console.error('❌ TDesign组件未安装，请运行: npm install tdesign-miniprogram');
  process.exit(1);
}

// 2. 构建npm
console.log('构建npm...');
const { execSync } = require('child_process');
try {
  // 微信小程序构建命令 - 需要指定项目路径
  const path = require('path');
  const projectPath = path.resolve(__dirname, '..');
  execSync(`npx miniprogram-ci build --project-path "${projectPath}"`, { stdio: 'inherit' });
  console.log('✅ npm构建成功');
} catch (e) {
  console.error('❌ npm构建失败，请使用微信开发者工具进行构建');
  console.log('💡 提示：请在微信开发者工具中打开项目，然后点击"工具"->"构建npm"');
}

console.log('🎉 构建完成！请使用微信开发者工具打开项目');