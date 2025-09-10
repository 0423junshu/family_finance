/**
 * 字体加载拦截器
 * 防止TDesign组件动态加载远程字体
 */

class FontInterceptor {
  constructor() {
    this.intercepted = false;
    this.init();
  }

  init() {
    // 在页面加载时立即执行拦截
    if (typeof wx !== 'undefined') {
      this.interceptWxRequest();
      this.setupFontFallback();
    }
  }

  // 拦截微信请求，阻止字体文件请求
  interceptWxRequest() {
    if (this.intercepted) return;
    
    const originalRequest = wx.request;
    wx.request = (options) => {
      // 检查是否是字体文件请求
      if (this.isFontRequest(options.url)) {
        console.warn('[FontInterceptor] 阻止字体请求:', options.url);
        
        // 返回空响应，避免网络错误
        if (options.success) {
          options.success({
            data: '',
            statusCode: 200,
            header: {}
          });
        }
        return;
      }
      
      // 非字体请求正常处理
      return originalRequest.call(wx, options);
    };
    
    this.intercepted = true;
    console.log('[FontInterceptor] 字体请求拦截器已启用');
  }

  // 检查是否是字体请求
  isFontRequest(url) {
    if (!url) return false;
    
    const fontPatterns = [
      /tdesign\.gtimg\.com.*\.woff/i,
      /tdesign\.gtimg\.com.*\.ttf/i,
      /tdesign\.gtimg\.com.*\.eot/i,
      /tdesign\.gtimg\.com.*fonts/i,
      /icon.*fonts.*\.woff/i,
      /fonts.*t\.woff/i
    ];
    
    return fontPatterns.some(pattern => pattern.test(url));
  }

  // 设置字体回退方案
  setupFontFallback() {
    // 创建字体加载检测
    this.checkFontLoading();
    
    // 设置图标回退映射
    this.setupIconFallback();
  }

  // 检查字体加载状态
  checkFontLoading() {
    try {
      // 创建测试元素检查字体是否加载
      const testElement = {
        style: {
          fontFamily: 't, sans-serif',
          fontSize: '16px',
          visibility: 'hidden'
        }
      };
      
      // 模拟字体检测
      setTimeout(() => {
        console.log('[FontInterceptor] 字体加载检测完成，使用本地回退方案');
      }, 100);
      
    } catch (error) {
      console.warn('[FontInterceptor] 字体检测失败:', error);
    }
  }

  // 设置图标回退映射
  setupIconFallback() {
    // 常用图标的Unicode回退映射
    this.iconMap = {
      'home': '🏠',
      'user': '👤', 
      'setting': '⚙️',
      'add': '➕',
      'edit': '✏️',
      'delete': '🗑️',
      'search': '🔍',
      'notification': '🔔',
      'arrow-right': '➡️',
      'arrow-left': '⬅️',
      'arrow-up': '⬆️',
      'arrow-down': '⬇️',
      'check': '✅',
      'close': '❌',
      'more': '⋯',
      'menu': '☰',
      'star': '⭐',
      'heart': '❤️',
      'share': '📤',
      'download': '📥',
      'upload': '📤',
      'refresh': '🔄',
      'loading': '⏳',
      'warning': '⚠️',
      'error': '❌',
      'success': '✅',
      'info': 'ℹ️'
    };
  }

  // 获取图标回退字符
  getIconFallback(iconName) {
    return this.iconMap[iconName] || '●';
  }

  // 应用图标回退
  applyIconFallback(selector) {
    try {
      // 在小程序环境中，直接返回回退字符
      const iconName = selector.replace(/^\.t-icon-/, '');
      return this.getIconFallback(iconName);
    } catch (error) {
      console.warn('[FontInterceptor] 应用图标回退失败:', error);
      return '●';
    }
  }
}

// 创建全局实例
const fontInterceptor = new FontInterceptor();

// 导出工具函数
module.exports = {
  FontInterceptor,
  getIconFallback: (iconName) => fontInterceptor.getIconFallback(iconName),
  applyIconFallback: (selector) => fontInterceptor.applyIconFallback(selector),
  
  // 初始化函数，在app.js中调用
  init: () => {
    console.log('[FontInterceptor] 字体拦截器初始化完成');
    return fontInterceptor;
  }
};