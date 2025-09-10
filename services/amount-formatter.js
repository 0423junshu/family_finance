// services/amount-formatter.js
/**
 * 金额格式化服务
 * 统一处理金额单位和显示格式
 */

class AmountFormatter {
  constructor() {
    this.isInCents = null;
    this.detectUnit();
  }

  /**
   * 检测金额单位
   * @returns {boolean} 是否以分为单位
   */
  detectUnit() {
    if (this.isInCents !== null) {
      return this.isInCents;
    }

    try {
      const transactions = wx.getStorageSync('transactions') || [];
      const sampleSize = Math.min(transactions.length, 20);

      if (sampleSize === 0) {
        this.isInCents = false;
        return false;
      }

      let centsCount = 0;
      let validCount = 0;

      for (let i = 0; i < sampleSize; i++) {
        const transaction = transactions[i];
        const amount = transaction?.amount;

        if (typeof amount === 'number' && amount > 0) {
          validCount++;

          // 判断是否可能以分为单位：
          // 1. 金额大于100（如果是元，通常不会有这么多小数位）
          // 2. 是整数（分通常是整数）
          // 3. 金额看起来合理（不会太大）
          if (amount >= 100 && amount % 1 === 0 && amount < 1000000) {
            centsCount++;
          }
        }
      }

      // 如果超过60%的样本符合"分"的特征，则认为是以分为单位
      this.isInCents = validCount > 0 && (centsCount / validCount) > 0.6;
      
      // 保存检测结果
      wx.setStorageSync('amount_unit_is_cents', this.isInCents);
      
      return this.isInCents;
    } catch (error) {
      console.error('检测金额单位失败:', error);
      this.isInCents = false;
      return false;
    }
  }

  /**
   * 格式化金额（不带货币符号）
   * @param {number} amount 原始金额
   * @returns {string} 格式化后的金额
   */
  formatAmount(amount) {
    if (!amount || isNaN(amount)) return '0.00';

    const value = this.isInCents ? amount / 100 : amount;
    return Math.abs(value).toFixed(2);
  }

  /**
   * 格式化金额（带货币符号）
   * @param {number} amount 原始金额
   * @param {boolean} showSign 是否显示正负号
   * @returns {string} 格式化后的金额
   */
  formatAmountWithSymbol(amount, showSign = false) {
    if (!amount || isNaN(amount)) return '¥0.00';

    const value = this.isInCents ? amount / 100 : amount;
    const absValue = Math.abs(value);
    const formatted = absValue.toFixed(2);

    let result = `¥${formatted}`;

    if (showSign && value !== 0) {
      result = value > 0 ? `+${result}` : `-${result}`;
    }

    return result;
  }

  /**
   * 格式化大额金额（自动选择单位）
   * @param {number} amount 原始金额
   * @param {boolean} withSymbol 是否包含货币符号
   * @returns {string} 格式化后的金额
   */
  formatLargeAmount(amount, withSymbol = true) {
    if (!amount || isNaN(amount)) return withSymbol ? '¥0' : '0';

    const value = this.isInCents ? amount / 100 : amount;
    const absValue = Math.abs(value);
    let formatted;
    let unit = '';

    if (absValue >= 100000000) {
      // 1亿及以上
      formatted = (absValue / 100000000).toFixed(1);
      unit = '亿';
    } else if (absValue >= 10000) {
      // 1万及以上
      formatted = (absValue / 10000).toFixed(1);
      unit = '万';
    } else if (absValue >= 1000) {
      // 1千及以上
      formatted = (absValue / 1000).toFixed(1);
      unit = 'k';
    } else {
      formatted = absValue.toFixed(0);
    }

    // 去除不必要的小数点
    if (formatted.endsWith('.0')) {
      formatted = formatted.slice(0, -2);
    }

    const result = `${formatted}${unit}`;
    return withSymbol ? `¥${result}` : result;
  }

  /**
   * 解析金额字符串为数值
   * @param {string} amountStr 金额字符串
   * @returns {number} 数值金额
   */
  parseAmount(amountStr) {
    if (!amountStr || typeof amountStr !== 'string') return 0;

    // 移除货币符号和空格
    const cleaned = amountStr.replace(/[¥￥$\s,]/g, '');
    
    // 处理单位
    let multiplier = 1;
    if (cleaned.includes('万')) {
      multiplier = 10000;
    } else if (cleaned.includes('亿')) {
      multiplier = 100000000;
    } else if (cleaned.includes('k') || cleaned.includes('K')) {
      multiplier = 1000;
    }

    const numStr = cleaned.replace(/[万亿kK]/g, '');
    const value = parseFloat(numStr) * multiplier;

    // 如果当前使用分为单位，需要转换
    return this.isInCents ? Math.round(value * 100) : value;
  }

  /**
   * 获取金额的原始值（统一为元）
   * @param {number} amount 原始金额
   * @returns {number} 以元为单位的金额
   */
  getAmountInYuan(amount) {
    if (!amount || isNaN(amount)) return 0;
    return this.isInCents ? amount / 100 : amount;
  }

  /**
   * 获取金额的存储值（根据当前单位）
   * @param {number} yuanAmount 以元为单位的金额
   * @returns {number} 存储用的金额值
   */
  getStorageAmount(yuanAmount) {
    if (!yuanAmount || isNaN(yuanAmount)) return 0;
    return this.isInCents ? Math.round(yuanAmount * 100) : yuanAmount;
  }

  /**
   * 重置单位检测（用于数据变化后重新检测）
   */
  resetUnitDetection() {
    this.isInCents = null;
    wx.removeStorageSync('amount_unit_is_cents');
    this.detectUnit();
  }

  /**
   * 手动设置金额单位
   * @param {boolean} isInCents 是否以分为单位
   */
  setUnit(isInCents) {
    this.isInCents = isInCents;
    wx.setStorageSync('amount_unit_is_cents', isInCents);
  }

  /**
   * 获取当前金额单位
   * @returns {string} 单位名称
   */
  getCurrentUnit() {
    return this.isInCents ? '分' : '元';
  }

  /**
   * 格式化百分比
   * @param {number} value 数值
   * @param {number} total 总数
   * @returns {string} 百分比字符串
   */
  formatPercentage(value, total) {
    if (!total || total === 0) return '0%';
    const percentage = (value / total) * 100;
    return `${Math.round(percentage)}%`;
  }
}

// 创建单例实例
const amountFormatter = new AmountFormatter();

module.exports = amountFormatter;