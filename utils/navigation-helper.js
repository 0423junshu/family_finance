// utils/navigation-helper.js - 页面跳转安全检查工具

/**
 * 安全的页面跳转工具
 * 提供统一的跳转方法和错误处理
 */
class NavigationHelper {
  constructor() {
    this.navigationLock = false;
    this.lockTimeout = 500; // 防抖锁定时间
  }

  /**
   * 安全的页面跳转
   * @param {string} url 目标页面URL
   * @param {object} options 跳转选项
   */
  async navigateTo(url, options = {}) {
    if (this.navigationLock) {
      console.warn('页面跳转被防抖锁定，忽略重复调用');
      return false;
    }

    try {
      // 验证URL格式
      if (!this.validateUrl(url)) {
        throw new Error(`无效的页面URL: ${url}`);
      }

      // 设置防抖锁
      this.setNavigationLock();

      // 执行跳转
      await new Promise((resolve, reject) => {
        wx.navigateTo({
          url,
          success: resolve,
          fail: reject,
          ...options
        });
      });

      console.log(`页面跳转成功: ${url}`);
      return true;

    } catch (error) {
      console.error('页面跳转失败:', error);
      
      // 显示用户友好的错误提示
      wx.showToast({
        title: '页面跳转失败',
        icon: 'error',
        duration: 2000
      });

      return false;
    }
  }

  /**
   * 安全的页面重定向
   */
  async redirectTo(url, options = {}) {
    if (this.navigationLock) return false;

    try {
      if (!this.validateUrl(url)) {
        throw new Error(`无效的页面URL: ${url}`);
      }

      this.setNavigationLock();

      await new Promise((resolve, reject) => {
        wx.redirectTo({
          url,
          success: resolve,
          fail: reject,
          ...options
        });
      });

      return true;
    } catch (error) {
      console.error('页面重定向失败:', error);
      wx.showToast({ title: '页面跳转失败', icon: 'error' });
      return false;
    }
  }

  /**
   * 安全的Tab页面切换
   */
  async switchTab(url, options = {}) {
    if (this.navigationLock) return false;

    try {
      if (!this.validateTabUrl(url)) {
        throw new Error(`无效的Tab页面URL: ${url}`);
      }

      this.setNavigationLock();

      await new Promise((resolve, reject) => {
        wx.switchTab({
          url,
          success: resolve,
          fail: reject,
          ...options
        });
      });

      return true;
    } catch (error) {
      console.error('Tab页面切换失败:', error);
      wx.showToast({ title: '页面切换失败', icon: 'error' });
      return false;
    }
  }

  /**
   * 安全的页面返回
   */
  async navigateBack(delta = 1) {
    if (this.navigationLock) return false;

    try {
      const pages = getCurrentPages();
      
      if (pages.length <= delta) {
        // 如果返回层数超过页面栈，跳转到首页
        return await this.switchTab('/pages/index/index');
      }

      this.setNavigationLock();

      await new Promise((resolve, reject) => {
        wx.navigateBack({
          delta,
          success: resolve,
          fail: reject
        });
      });

      return true;
    } catch (error) {
      console.error('页面返回失败:', error);
      // 降级到首页
      return await this.switchTab('/pages/index/index');
    }
  }

  /**
   * 验证普通页面URL
   */
  validateUrl(url) {
    if (!url || typeof url !== 'string') return false;

    // 检查URL格式
    if (!url.startsWith('/pages/')) return false;

    // 验证页面是否存在（基于项目结构）
    const validPages = [
      '/pages/index/index',
      '/pages/assets/assets',
      '/pages/record/record',
      '/pages/reports/reports',
      '/pages/budget/budget',
      '/pages/settings/settings',
      '/pages/me/me',
      '/pages/account-manage/account-manage',
      '/pages/category-manage/category-manage',
      '/pages/tag-manage/tag-manage',
      '/pages/template-manage/template-manage',
      '/pages/budget-manage/budget-manage',
      '/pages/cycle-setting/cycle-setting',
      '/pages/transaction-list/transaction-list',
      '/pages/transaction-detail/transaction-detail',
      '/pages/investment-add/investment-add',
      '/pages/investments/investments',
      '/pages/transfer/transfer',
      '/pages/history-detail/history-detail',
      '/pages/profile/profile',
      '/pages/login/login',
      '/pages/stats/stats',
      '/pages/goals/goals',
      '/pages/custom-cycle/custom-cycle',
      '/pages/cycle-edit/cycle-edit'
    ];

    // 提取页面路径（去除参数）
    const pagePath = url.split('?')[0];
    return validPages.includes(pagePath);
  }

  /**
   * 验证Tab页面URL
   */
  validateTabUrl(url) {
    const tabPages = [
      '/pages/index/index',
      '/pages/assets/assets', 
      '/pages/record/record',
      '/pages/reports/reports',
      '/pages/me/me'
    ];

    const pagePath = url.split('?')[0];
    return tabPages.includes(pagePath);
  }

  /**
   * 设置防抖锁
   */
  setNavigationLock() {
    this.navigationLock = true;
    setTimeout(() => {
      this.navigationLock = false;
    }, this.lockTimeout);
  }

  /**
   * 构建带参数的URL
   */
  buildUrl(basePath, params = {}) {
    if (!params || Object.keys(params).length === 0) {
      return basePath;
    }

    const queryString = Object.entries(params)
      .filter(([key, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return queryString ? `${basePath}?${queryString}` : basePath;
  }

  /**
   * 解析URL参数
   */
  parseUrlParams(url) {
    const [, queryString] = url.split('?');
    if (!queryString) return {};

    const params = {};
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    });

    return params;
  }
}

// 创建全局实例
const navigationHelper = new NavigationHelper();

// 导出便捷方法
module.exports = {
  NavigationHelper,
  
  // 便捷的跳转方法
  navigateTo: (url, options) => navigationHelper.navigateTo(url, options),
  redirectTo: (url, options) => navigationHelper.redirectTo(url, options),
  switchTab: (url, options) => navigationHelper.switchTab(url, options),
  navigateBack: (delta) => navigationHelper.navigateBack(delta),
  
  // URL工具方法
  buildUrl: (basePath, params) => navigationHelper.buildUrl(basePath, params),
  parseUrlParams: (url) => navigationHelper.parseUrlParams(url),
  validateUrl: (url) => navigationHelper.validateUrl(url),
  
  // 获取实例
  getInstance: () => navigationHelper
};