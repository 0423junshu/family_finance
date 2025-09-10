/**
 * 测试工具函数
 */

class TestUtils {
  /**
   * 延迟执行
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成随机字符串
   */
  static randomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成测试ID
   */
  static generateTestId() {
    return `test_${Date.now()}_${this.randomString(6)}`;
  }

  /**
   * 模拟微信API
   */
  static mockWxAPI() {
    return {
      navigateTo: (options) => {
        console.log(`模拟导航到: ${options.url}`);
        return Promise.resolve();
      },
      showToast: (options) => {
        console.log(`模拟显示Toast: ${options.title}`);
        return Promise.resolve();
      },
      showModal: (options) => {
        console.log(`模拟显示Modal: ${options.title}`);
        return Promise.resolve({ confirm: true });
      },
      setClipboardData: (options) => {
        console.log(`模拟复制到剪贴板: ${options.data}`);
        return Promise.resolve();
      },
      getStorageSync: (key) => {
        const mockData = {
          userInfo: {
            openid: 'test_openid_001',
            nickName: '测试用户',
            avatarUrl: '/images/test-avatar.png'
          }
        };
        return mockData[key];
      }
    };
  }

  /**
   * 验证CSS属性值是否在范围内
   */
  static isValueInRange(value, range) {
    if (typeof range === 'string' && range.includes('-')) {
      const [min, max] = range.split('-').map(v => parseInt(v));
      const numValue = parseInt(value);
      return numValue >= min && numValue <= max;
    }
    return value === range;
  }

  /**
   * 验证颜色值
   */
  static isValidColor(color, expected) {
    // 简化的颜色验证
    return color.includes(expected.replace(/[()]/g, ''));
  }

  /**
   * 计算性能分数
   */
  static calculatePerformanceScore(metrics, benchmarks) {
    let score = 100;
    
    Object.keys(metrics).forEach(key => {
      if (benchmarks[key]) {
        const ratio = metrics[key] / benchmarks[key];
        if (ratio > 1) {
          score -= (ratio - 1) * 20; // 超出基准扣分
        }
      }
    });
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 格式化测试结果
   */
  static formatTestResult(result) {
    return {
      ...result,
      timestamp: new Date().toISOString(),
      duration: result.endTime - result.startTime
    };
  }

  /**
   * 生成测试报告摘要
   */
  static generateSummary(results) {
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = total - passed;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(2) : '0.00';
    
    return {
      total,
      passed,
      failed,
      successRate: `${successRate}%`,
      totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0)
    };
  }
}

module.exports = TestUtils;