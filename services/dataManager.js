// services/dataManager.js
// 全局数据管理服务 - 单一数据源与联动刷新机制

const eventBus = require('../utils/eventBus');

class DataManager {
  constructor() {
    this.cache = new Map(); // 数据缓存
    this.snapshots = new Map(); // 数据快照
    this.eventBus = eventBus; // 使用全局事件总线实例
    this.refreshCallbacks = new Map(); // 页面刷新回调
  }

  /**
   * 设置数据快照
   * @param {string} key - 数据键
   * @param {any} data - 数据内容
   */
  setSnapshot(key, data) {
    this.snapshots.set(key, JSON.parse(JSON.stringify(data)));
    this.cache.set(key, JSON.parse(JSON.stringify(data)));
    console.log(`[DataManager] 设置快照: ${key}`, data);
  }

  /**
   * 获取数据快照
   * @param {string} key - 数据键
   * @returns {any} 数据内容
   */
  getSnapshot(key) {
    return this.snapshots.get(key);
  }

  /**
   * 获取缓存数据
   * @param {string} key - 数据键
   * @returns {any} 数据内容
   */
  getCache(key) {
    return this.cache.get(key);
  }

  /**
   * 更新数据并广播刷新
   * @param {string} key - 数据键
   * @param {any} data - 新数据
   * @param {Object} options - 选项
   */
  updateData(key, data, options = {}) {
    const { 
      broadcast = true, 
      updateSnapshot = true,
      source = 'unknown'
    } = options;

    // 更新缓存
    this.cache.set(key, JSON.parse(JSON.stringify(data)));
    
    // 更新快照
    if (updateSnapshot) {
      this.snapshots.set(key, JSON.parse(JSON.stringify(data)));
    }

    console.log(`[DataManager] 更新数据: ${key}, 来源: ${source}`, data);

    // 广播数据变更事件
    if (broadcast) {
      this.broadcastDataChange(key, data, source);
    }
  }

  /**
   * 广播数据变更事件
   * @param {string} key - 数据键
   * @param {any} data - 数据内容
   * @param {string} source - 变更来源
   */
  broadcastDataChange(key, data, source) {
    const event = {
      key,
      data,
      source,
      timestamp: Date.now()
    };

    // 发送全局数据变更事件
    this.eventBus.emit('dataChanged', event);
    
    // 发送特定数据类型的变更事件
    this.eventBus.emit(`${key}Changed`, event);

    console.log(`[DataManager] 广播数据变更: ${key}, 来源: ${source}`);
  }

  /**
   * 注册页面刷新回调
   * @param {string} pageId - 页面标识
   * @param {Function} callback - 刷新回调函数
   */
  registerRefreshCallback(pageId, callback) {
    this.refreshCallbacks.set(pageId, callback);
    console.log(`[DataManager] 注册页面刷新回调: ${pageId}`);
  }

  /**
   * 注销页面刷新回调
   * @param {string} pageId - 页面标识
   */
  unregisterRefreshCallback(pageId) {
    this.refreshCallbacks.delete(pageId);
    console.log(`[DataManager] 注销页面刷新回调: ${pageId}`);
  }

  /**
   * 触发页面刷新
   * @param {string|Array} pageIds - 页面标识或页面标识数组
   * @param {Object} data - 刷新数据
   */
  triggerPageRefresh(pageIds, data = {}) {
    const ids = Array.isArray(pageIds) ? pageIds : [pageIds];
    
    ids.forEach(pageId => {
      const callback = this.refreshCallbacks.get(pageId);
      if (callback && typeof callback === 'function') {
        try {
          callback(data);
          console.log(`[DataManager] 触发页面刷新: ${pageId}`);
        } catch (error) {
          console.error(`[DataManager] 页面刷新回调执行失败: ${pageId}`, error);
        }
      }
    });
  }

  /**
   * 监听数据变更事件
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(eventName, callback) {
    this.eventBus.on(eventName, callback);
  }

  /**
   * 移除数据变更事件监听
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(eventName, callback) {
    this.eventBus.off(eventName, callback);
  }

  /**
   * 家庭名称变更处理
   * @param {string} newName - 新名称
   * @param {string} familyId - 家庭ID
   */
  handleFamilyNameChange(newName, familyId) {
    const familyData = this.getCache('familyInfo') || {};
    familyData.name = newName;
    familyData.updatedAt = Date.now();

    // 更新家庭信息数据
    this.updateData('familyInfo', familyData, {
      source: 'familyNameChange',
      broadcast: true
    });

    // 触发相关页面刷新
    this.triggerPageRefresh(['family', 'me', 'settings'], {
      type: 'familyNameChange',
      newName,
      familyId
    });
  }

  /**
   * 权限更新处理
   * @param {Object} permissionData - 权限数据
   * @param {string} source - 更新来源
   */
  handlePermissionUpdate(permissionData, source = 'permissionUpdate') {
    // 更新权限数据
    this.updateData('permissions', permissionData, {
      source,
      broadcast: true
    });

    // 更新用户信息中的权限部分
    const userInfo = this.getCache('userInfo') || {};
    userInfo.permissions = permissionData.userPermissions || {};
    userInfo.role = permissionData.userRole || userInfo.role;
    
    this.updateData('userInfo', userInfo, {
      source: `${source}_userInfo`,
      broadcast: false // 避免重复广播
    });

    // 触发相关页面刷新
    this.triggerPageRefresh(['family', 'family-permissions', 'settings'], {
      type: 'permissionUpdate',
      permissions: permissionData,
      source
    });
  }

  /**
   * 同步操作处理
   * @param {Object} syncResult - 同步结果
   * @param {string} syncType - 同步类型
   */
  handleSyncOperation(syncResult, syncType = 'manual') {
    const syncData = this.getCache('syncStatus') || {};
    
    // 更新同步状态
    syncData.lastSyncTime = Date.now();
    syncData.lastSyncResult = syncResult;
    syncData.syncType = syncType;
    syncData.isSync = syncResult.success || false;

    this.updateData('syncStatus', syncData, {
      source: 'syncOperation',
      broadcast: true
    });

    // 如果同步成功，更新相关业务数据
    if (syncResult.success && syncResult.data) {
      Object.keys(syncResult.data).forEach(key => {
        this.updateData(key, syncResult.data[key], {
          source: 'syncUpdate',
          broadcast: false // 统一在最后广播
        });
      });
    }

    // 触发相关页面刷新
    this.triggerPageRefresh(['settings', 'family', 'me'], {
      type: 'syncOperation',
      result: syncResult,
      syncType
    });
  }

  /**
   * 成员信息更新处理
   * @param {Array} members - 成员列表
   * @param {string} source - 更新来源
   */
  handleMembersUpdate(members, source = 'membersUpdate') {
    this.updateData('familyMembers', members, {
      source,
      broadcast: true
    });

    // 更新家庭信息中的成员数量
    const familyData = this.getCache('familyInfo') || {};
    familyData.memberCount = members.length;
    familyData.members = members;

    this.updateData('familyInfo', familyData, {
      source: `${source}_familyInfo`,
      broadcast: false
    });

    // 触发相关页面刷新
    this.triggerPageRefresh(['family', 'family-permissions', 'settings'], {
      type: 'membersUpdate',
      members,
      source
    });
  }

  /**
   * 清理缓存
   * @param {string|Array} keys - 要清理的键，不传则清理所有
   */
  clearCache(keys) {
    if (!keys) {
      this.cache.clear();
      console.log('[DataManager] 清理所有缓存');
      return;
    }

    const keysToDelete = Array.isArray(keys) ? keys : [keys];
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      console.log(`[DataManager] 清理缓存: ${key}`);
    });
  }

  /**
   * 获取所有分类数据
   * @returns {Array} 分类列表
   */
  getAllCategories() {
    try {
      const defaultCategories = [
        { id: '1', name: '餐饮', type: 'expense', icon: '🍽️' },
        { id: '2', name: '交通', type: 'expense', icon: '🚗' },
        { id: '3', name: '购物', type: 'expense', icon: '🛍️' },
        { id: '4', name: '娱乐', type: 'expense', icon: '🎮' },
        { id: '5', name: '医疗', type: 'expense', icon: '🏥' },
        { id: '6', name: '工资', type: 'income', icon: '💰' },
        { id: '7', name: '奖金', type: 'income', icon: '🎁' },
        { id: '8', name: '投资', type: 'income', icon: '📈' }
      ]
      
      const customCategories = wx.getStorageSync('customCategories') || []
      return [...defaultCategories, ...customCategories]
    } catch (error) {
      console.error('获取分类数据失败:', error)
      return []
    }
  }

  /**
   * 获取所有账户数据
   * @returns {Array} 账户列表
   */
  getAllAccounts() {
    try {
      return wx.getStorageSync('accounts') || []
    } catch (error) {
      console.error('获取账户数据失败:', error)
      return []
    }
  }

  /**
   * 获取所有交易记录
   * @returns {Array} 交易记录列表
   */
  getAllTransactions() {
    try {
      return wx.getStorageSync('transactions') || []
    } catch (error) {
      console.error('获取交易记录失败:', error)
      return []
    }
  }

  /**
   * 刷新数据快照
   */
  async refreshSnapshot() {
    try {
      // 刷新各类数据快照
      const categories = this.getAllCategories()
      const accounts = this.getAllAccounts()
      const transactions = this.getAllTransactions()
      
      this.setSnapshot('categories', categories)
      this.setSnapshot('accounts', accounts)
      this.setSnapshot('transactions', transactions)
      
      console.log('[DataManager] 数据快照刷新完成')
    } catch (error) {
      console.error('[DataManager] 刷新数据快照失败:', error)
      throw error
    }
  }

  /**
   * 获取数据管理器状态
   */
  getStatus() {
    return {
      cacheSize: this.cache.size,
      snapshotSize: this.snapshots.size,
      callbackCount: this.refreshCallbacks.size,
      cacheKeys: Array.from(this.cache.keys()),
      snapshotKeys: Array.from(this.snapshots.keys()),
      registeredPages: Array.from(this.refreshCallbacks.keys())
    };
  }
}

// 创建全局单例
const dataManager = new DataManager();

module.exports = dataManager;