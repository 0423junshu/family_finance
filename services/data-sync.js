// services/data-sync.js
/**
 * 数据同步服务
 * 统一管理云端和本地数据，确保数据一致性
 */

class DataSyncService {
  constructor() {
    this.isOnline = true;
    this.syncInProgress = false;
  }

  /**
   * 统一获取交易数据
   * @param {Object} params 查询参数
   * @returns {Promise<Array>} 交易数据
   */
  async getTransactions(params = {}) {
    try {
      // 优先使用云端数据
      if (this.isOnline && !params.forceLocal) {
        const cloudData = await this.getCloudTransactions(params);
        // 更新本地缓存
        this.updateLocalCache('transactions', cloudData);
        return cloudData;
      }
    } catch (error) {
      console.warn('云端数据获取失败，使用本地数据:', error);
      this.isOnline = false;
    }

    // 降级使用本地数据
    return this.getLocalTransactions(params);
  }

  /**
   * 从云端获取交易数据
   * @param {Object} params 查询参数
   * @returns {Promise<Array>} 交易数据
   */
  async getCloudTransactions(params) {
    const { startDate, endDate, type, categoryId, accountId } = params;

    const result = await wx.cloud.callFunction({
      name: 'getTransactions',
      data: {
        startDate,
        endDate,
        type,
        categoryId,
        accountId,
        page: 1,
        pageSize: 1000 // 获取足够多的数据用于报表
      }
    });

    if (!result.result.success) {
      throw new Error(result.result.message || '云端数据获取失败');
    }

    return result.result.data.list || [];
  }

  /**
   * 从本地获取交易数据
   * @param {Object} params 查询参数
   * @returns {Array} 交易数据
   */
  getLocalTransactions(params = {}) {
    const transactions = wx.getStorageSync('transactions') || [];
    const { startDate, endDate, type, categoryId, accountId } = params;

    return transactions.filter(transaction => {
      // 数据有效性验证
      if (!this.validateTransaction(transaction)) {
        return false;
      }

      // 日期范围过滤
      if (startDate || endDate) {
        if (!this.isDateInRange(transaction.date, startDate, endDate)) {
          return false;
        }
      }

      // 类型过滤
      if (type && transaction.type !== type) {
        return false;
      }

      // 分类过滤
      if (categoryId && transaction.categoryId !== categoryId) {
        return false;
      }

      // 账户过滤
      if (accountId && transaction.accountId !== accountId) {
        return false;
      }

      return true;
    });
  }

  /**
   * 验证交易数据有效性
   * @param {Object} transaction 交易数据
   * @returns {boolean} 是否有效
   */
  validateTransaction(transaction) {
    if (!transaction) return false;

    // 必需字段检查
    const requiredFields = ['date', 'amount', 'type'];
    for (const field of requiredFields) {
      if (!transaction[field]) return false;
    }

    // 数据类型检查
    if (typeof transaction.amount !== 'number' || transaction.amount <= 0) {
      return false;
    }

    if (!['income', 'expense', 'transfer'].includes(transaction.type)) {
      return false;
    }

    // 日期有效性检查
    const date = new Date(transaction.date);
    if (isNaN(date.getTime())) return false;

    return true;
  }

  /**
   * 检查日期是否在范围内
   * @param {string} dateStr 日期字符串
   * @param {string} startDate 开始日期
   * @param {string} endDate 结束日期
   * @returns {boolean} 是否在范围内
   */
  isDateInRange(dateStr, startDate, endDate) {
    if (!dateStr) return false;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;

    if (startDate) {
      const start = new Date(startDate);
      if (date < start) return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // 包含结束日期的全天
      if (date > end) return false;
    }

    return true;
  }

  /**
   * 更新本地缓存
   * @param {string} key 缓存键
   * @param {any} data 数据
   */
  updateLocalCache(key, data) {
    try {
      wx.setStorageSync(key, data);
      wx.setStorageSync(`${key}_updated`, Date.now());
    } catch (error) {
      console.error('更新本地缓存失败:', error);
    }
  }

  /**
   * 数据同步
   * @returns {Promise<boolean>} 同步是否成功
   */
  async syncData() {
    if (this.syncInProgress) {
      return false;
    }

    this.syncInProgress = true;

    try {
      // 获取本地数据时间戳
      const lastSync = wx.getStorageSync('last_sync_time') || 0;
      const now = Date.now();

      // 如果距离上次同步不到5分钟，跳过同步
      if (now - lastSync < 5 * 60 * 1000) {
        return true;
      }

      // 同步交易数据
      const cloudTransactions = await this.getCloudTransactions({});
      this.updateLocalCache('transactions', cloudTransactions);

      // 同步其他数据...
      // await this.syncAccounts();
      // await this.syncCategories();

      // 更新同步时间
      wx.setStorageSync('last_sync_time', now);

      this.isOnline = true;
      return true;
    } catch (error) {
      console.error('数据同步失败:', error);
      this.isOnline = false;
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 检查网络状态
   * @returns {Promise<boolean>} 是否在线
   */
  async checkNetworkStatus() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          this.isOnline = res.networkType !== 'none';
          resolve(this.isOnline);
        },
        fail: () => {
          this.isOnline = false;
          resolve(false);
        }
      });
    });
  }
}

// 创建单例实例
const dataSyncService = new DataSyncService();

module.exports = dataSyncService;