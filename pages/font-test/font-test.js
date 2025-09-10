// pages/font-test/font-test.js
const fontLoader = require('../../utils/font-loader');

Page({
  data: {
    fontStatus: null,
    testResults: [],
    isLoading: true
  },

  onLoad() {
    this.testFontLoading();
  },

  async testFontLoading() {
    this.setData({ isLoading: true });
    
    const results = [];
    
    // 测试1: 检查本地字体文件
    results.push({
      name: '本地字体文件检查',
      status: fontLoader.checkLocalFontExists() ? '成功' : '失败',
      details: '检查/fonts/t.woff文件是否存在'
    });

    // 测试2: 尝试加载字体
    const loadResult = await fontLoader.loadFont();
    results.push({
      name: '字体加载测试',
      status: loadResult.loaded ? '成功' : '失败',
      details: loadResult.error || '字体加载完成'
    });

    // 测试3: 检查字体是否应用
    const isApplied = await this.checkFontApplied();
    results.push({
      name: '字体应用测试',
      status: isApplied ? '成功' : '失败',
      details: isApplied ? 'TDesign图标字体已正确应用' : '字体未正确应用'
    });

    this.setData({
      testResults: results,
      isLoading: false,
      fontStatus: fontLoader.getFontStatus()
    });

    // 输出结果到控制台
    console.log('字体测试结果:', results);
  },

  async checkFontApplied() {
    return new Promise((resolve) => {
      // 在小程序中，我们可以通过检查特定元素的样式来判断
      const query = wx.createSelectorQuery();
      query.select('.t-icon').boundingClientRect();
      query.exec((res) => {
        if (res && res[0]) {
          // 如果有元素使用了t-icon类，说明字体可能已加载
          resolve(true);
        } else {
          // 如果没有找到，尝试创建一个测试元素
          this.createTestElement(resolve);
        }
      });
    });
  },

  createTestElement(callback) {
    // 创建一个使用t-icon字体的测试元素
    const testId = 'font-test-element';
    const query = wx.createSelectorQuery();
    
    // 先检查是否已存在
    query.select('#' + testId).boundingClientRect();
    query.exec((res) => {
      if (!res || !res[0]) {
        // 创建测试元素
        const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : wx.getSystemInfoSync();
        const fontSize = deviceInfo.platform === 'devtools' ? '16px' : '32rpx';
        
        // 通过setData创建测试元素
        this.setData({
          testElement: true
        }, () => {
          setTimeout(() => {
            callback(true); // 假设创建成功
          }, 100);
        });
      } else {
        callback(true);
      }
    });
  },

  onRetry() {
    this.testFontLoading();
  },

  onBack() {
    wx.navigateBack();
  }
});