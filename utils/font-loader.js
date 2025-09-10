// 字体加载状态检测工具
const fontLoader = {
  // 检查字体是否加载成功
  checkFontLoaded(fontName = 't-icon') {
    return new Promise((resolve) => {
      if (typeof document === 'undefined') {
        // 小程序环境，使用wx.loadFontFace
        if (typeof wx !== 'undefined' && wx.loadFontFace) {
          wx.loadFontFace({
            family: fontName,
            source: 'url("/fonts/t.woff")',
            success: () => resolve(true),
            fail: () => resolve(false)
          });
        } else {
          resolve(false);
        }
      } else {
        // Web环境
        const span = document.createElement('span');
        span.style.fontFamily = fontName;
        span.style.fontSize = '48px';
        span.style.position = 'absolute';
        span.style.left = '-9999px';
        span.textContent = 'ABC';
        
        document.body.appendChild(span);
        
        setTimeout(() => {
          const width1 = span.offsetWidth;
          const height1 = span.offsetHeight;
          
          span.style.fontFamily = 'monospace';
          
          setTimeout(() => {
            const width2 = span.offsetWidth;
            const height2 = span.offsetHeight;
            
            document.body.removeChild(span);
            resolve(width1 !== width2 || height1 !== height2);
          }, 100);
        }, 100);
      }
    });
  },

  // 加载字体并返回状态
  async loadFont(fontName = 't-icon') {
    try {
      if (typeof wx !== 'undefined' && wx.loadFontFace) {
        const result = await new Promise((resolve) => {
          wx.loadFontFace({
            family: fontName,
            source: 'url("/fonts/t.woff")',
            success: () => resolve({ loaded: true }),
            fail: (err) => resolve({ loaded: false, error: err })
          });
        });
        return result;
      }
      return { loaded: false, error: 'wx.loadFontFace not available' };
    } catch (error) {
      return { loaded: false, error: error.message };
    }
  },

  // 获取字体加载状态信息
  getFontStatus() {
    return {
      hasLocalFont: this.checkLocalFontExists(),
      fontUrls: [
        '/fonts/t.woff',
        'https://tdesign.gtimg.com/icon/0.3.2/fonts/t.woff'
      ],
      lastChecked: new Date().toISOString()
    };
  },

  // 检查本地字体文件是否存在（模拟）
  checkLocalFontExists() {
    // 在小程序环境中，我们假设文件存在，因为已经下载了
    return true;
  }
};

// 导出供其他模块使用
module.exports = fontLoader;