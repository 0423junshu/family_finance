// utils/collaborationHelper.js
/**
 * 协作功能辅助工具
 * 用于在现有财务页面中快速集成协作功能
 */

const { collaborationMiddleware } = require('../services/collaborationMiddleware');
const { eventBus, EventTypes } = require('./eventBus');
const { getAvatarUrl } = require('./defaultAvatar');

class CollaborationHelper {
  constructor() {
    this.initialized = false;
    this.pageInstances = new Map(); // 存储页面实例
  }

  /**
   * 初始化协作功能
   * @param {object} pageInstance 页面实例
   * @param {object} options 配置选项
   */
  async initCollaboration(pageInstance, options = {}) {
    try {
      // 初始化中间件
      if (!this.initialized) {
        await collaborationMiddleware.initialize();
        this.initialized = true;
      }

      // 存储页面实例
      const pageId = this.generatePageId();
      this.pageInstances.set(pageId, pageInstance);

      // 扩展页面方法
      this.enhancePageMethods(pageInstance, options);

      // 添加协作数据
      this.addCollaborationData(pageInstance);

      // 设置事件监听
      this.setupPageEventListeners(pageInstance, pageId);

      console.log(`页面协作功能初始化完成: ${pageId}`);
      return pageId;

    } catch (error) {
      console.error('协作功能初始化失败:', error);
      throw error;
    }
  }

  /**
   * 扩展页面方法
   * @param {object} pageInstance 页面实例
   * @param {object} options 配置选项
   */
  enhancePageMethods(pageInstance, options) {
    // 保存原始方法
    const originalMethods = {};

    // 需要增强的方法列表
    const methodsToEnhance = [
      'onLoad',
      'onShow',
      'onHide',
      'onUnload',
      'onPullDownRefresh'
    ];

    methodsToEnhance.forEach(methodName => {
      if (typeof pageInstance[methodName] === 'function') {
        originalMethods[methodName] = pageInstance[methodName];
      }
    });

    // 增强 onLoad 方法
    pageInstance.onLoad = function(query) {
      // 执行原始方法
      if (originalMethods.onLoad) {
        originalMethods.onLoad.call(this, query);
      }

      // 添加协作功能
      this.initCollaborationFeatures();
    };

    // 增强 onShow 方法
    pageInstance.onShow = function() {
      // 执行原始方法
      if (originalMethods.onShow) {
        originalMethods.onShow.call(this);
      }

      // 刷新协作状态
      this.refreshCollaborationStatus();
    };

    // 增强 onHide 方法
    pageInstance.onHide = function() {
      // 释放数据锁
      this.releaseDataLocks();

      // 执行原始方法
      if (originalMethods.onHide) {
        originalMethods.onHide.call(this);
      }
    };

    // 增强 onUnload 方法
    pageInstance.onUnload = function() {
      // 清理协作资源
      this.cleanupCollaboration();

      // 执行原始方法
      if (originalMethods.onUnload) {
        originalMethods.onUnload.call(this);
      }
    };

    // 增强 onPullDownRefresh 方法
    pageInstance.onPullDownRefresh = function() {
      // 执行原始方法
      if (originalMethods.onPullDownRefresh) {
        originalMethods.onPullDownRefresh.call(this);
      }

      // 刷新协作数据
      this.refreshCollaborationData();
    };
  }

  /**
   * 添加协作相关数据
   * @param {object} pageInstance 页面实例
   */
  addCollaborationData(pageInstance) {
    // 添加协作状态数据
    const collaborationData = {
      // 协作状态
      collaborationEnabled: false,
      isInFamily: false,
      familyInfo: null,
      currentUserPermissions: {},
      
      // 成员信息
      familyMembers: [],
      onlineMembers: [],
      memberActivities: [],
      
      // 数据锁定状态
      lockedData: [],
      currentUserLocks: [],
      
      // 冲突信息
      conflicts: [],
      conflictCount: 0,
      
      // 同步状态
      syncStatus: 'idle',
      syncProgress: 0,
      lastSyncTime: null,
      
      // UI状态
      showCollaborationPanel: false,
      showMemberList: false,
      showConflictDialog: false,
      
      // 操作状态
      pendingOperations: [],
      operationHistory: []
    };

    // 合并到页面数据
    if (pageInstance.data) {
      Object.assign(pageInstance.data, collaborationData);
    } else {
      pageInstance.data = collaborationData;
    }

    // 添加协作方法
    this.addCollaborationMethods(pageInstance);
  }

  /**
   * 添加协作相关方法
   * @param {object} pageInstance 页面实例
   */
  addCollaborationMethods(pageInstance) {
    // 初始化协作功能
    pageInstance.initCollaborationFeatures = async function() {
      try {
        const status = collaborationMiddleware.getCollaborationStatus();
        
        this.setData({
          collaborationEnabled: true,
          isInFamily: status.isInFamily,
          familyInfo: status.familyInfo,
          currentUserPermissions: status.permissions,
          lockedData: status.lockedData
        });

        // 加载成员信息
        if (status.isInFamily) {
          await this.loadFamilyMembers();
          await this.loadMemberActivities();
        }

      } catch (error) {
        console.error('初始化协作功能失败:', error);
      }
    };

    // 刷新协作状态
    pageInstance.refreshCollaborationStatus = async function() {
      try {
        const status = collaborationMiddleware.getCollaborationStatus();
        
        this.setData({
          currentUserPermissions: status.permissions,
          lockedData: status.lockedData,
          pendingOperations: status.activeOperations
        });

      } catch (error) {
        console.error('刷新协作状态失败:', error);
      }
    };

    // 刷新协作数据
    pageInstance.refreshCollaborationData = async function() {
      try {
        if (this.data.isInFamily) {
          await this.loadFamilyMembers();
          await this.loadMemberActivities();
          await this.checkConflicts();
        }
        
        wx.stopPullDownRefresh();
      } catch (error) {
        console.error('刷新协作数据失败:', error);
        wx.stopPullDownRefresh();
      }
    };

    // 加载家庭成员
    pageInstance.loadFamilyMembers = async function() {
      try {
        // 这里应该调用家庭服务获取成员列表
        const members = [
          {
            id: 'user1',
            name: '张三',
            avatar: getAvatarUrl('/images/default-avatar.png'),
            role: 'owner',
            isOnline: true,
            lastActive: Date.now()
          },
          {
            id: 'user2',
            name: '李四',
            avatar: getAvatarUrl('/images/default-avatar.png'),
            role: 'member',
            isOnline: false,
            lastActive: Date.now() - 300000
          }
        ];

        const onlineMembers = members.filter(m => m.isOnline);

        this.setData({
          familyMembers: members,
          onlineMembers: onlineMembers
        });

      } catch (error) {
        console.error('加载家庭成员失败:', error);
      }
    };

    // 加载成员活动
    pageInstance.loadMemberActivities = async function() {
      try {
        // 这里应该调用操作日志服务获取最新活动
        const activities = [
          {
            id: '1',
            memberId: 'user1',
            memberName: '张三',
            activity: '添加了一笔支出记录',
            timestamp: Date.now() - 120000,
            type: 'transaction.create'
          },
          {
            id: '2',
            memberId: 'user2',
            memberName: '李四',
            activity: '修改了预算设置',
            timestamp: Date.now() - 300000,
            type: 'budget.update'
          }
        ];

        this.setData({
          memberActivities: activities.slice(0, 5)
        });

      } catch (error) {
        console.error('加载成员活动失败:', error);
      }
    };

    // 检查冲突
    pageInstance.checkConflicts = async function() {
      try {
        // 这里应该调用冲突服务检查冲突
        const conflicts = [];

        this.setData({
          conflicts: conflicts,
          conflictCount: conflicts.length
        });

      } catch (error) {
        console.error('检查冲突失败:', error);
      }
    };

    // 执行协作操作
    pageInstance.executeCollaborativeOperation = async function(operation, resource, operationFn, options = {}) {
      try {
        return await collaborationMiddleware.executeCollaborativeOperation(
          operation,
          resource,
          operationFn,
          options
        );
      } catch (error) {
        // 显示错误提示
        this.showCollaborationError(error.message);
        throw error;
      }
    };

    // 检查权限
    pageInstance.checkPermission = async function(operation, resource, options = {}) {
      return await collaborationMiddleware.checkPermission(operation, resource, options);
    };

    // 获取数据锁
    pageInstance.acquireDataLock = async function(resource, dataId) {
      try {
        const operationId = collaborationMiddleware.generateOperationId();
        await collaborationMiddleware.acquireLock(resource, dataId, operationId);
        
        // 更新UI状态
        const currentLocks = [...this.data.currentUserLocks];
        currentLocks.push({ resource, dataId, operationId });
        
        this.setData({
          currentUserLocks: currentLocks
        });

        return operationId;
      } catch (error) {
        this.showCollaborationError(`无法锁定数据: ${error.message}`);
        throw error;
      }
    };

    // 释放数据锁
    pageInstance.releaseDataLock = function(resource, dataId, operationId) {
      collaborationMiddleware.releaseLock(resource, dataId, operationId);
      
      // 更新UI状态
      const currentLocks = this.data.currentUserLocks.filter(
        lock => !(lock.resource === resource && lock.dataId === dataId && lock.operationId === operationId)
      );
      
      this.setData({
        currentUserLocks: currentLocks
      });
    };

    // 释放所有数据锁
    pageInstance.releaseDataLocks = function() {
      this.data.currentUserLocks.forEach(lock => {
        collaborationMiddleware.releaseLock(lock.resource, lock.dataId, lock.operationId);
      });
      
      this.setData({
        currentUserLocks: []
      });
    };

    // 显示协作面板
    pageInstance.showCollaborationPanel = function() {
      this.setData({
        showCollaborationPanel: true
      });
    };

    // 隐藏协作面板
    pageInstance.hideCollaborationPanel = function() {
      this.setData({
        showCollaborationPanel: false
      });
    };

    // 显示成员列表
    pageInstance.showMemberList = function() {
      this.setData({
        showMemberList: true
      });
    };

    // 隐藏成员列表
    pageInstance.hideMemberList = function() {
      this.setData({
        showMemberList: false
      });
    };

    // 显示冲突对话框
    pageInstance.showConflictDialog = function(conflicts) {
      this.setData({
        showConflictDialog: true,
        conflicts: conflicts
      });
    };

    // 隐藏冲突对话框
    pageInstance.hideConflictDialog = function() {
      this.setData({
        showConflictDialog: false
      });
    };

    // 显示协作错误
    pageInstance.showCollaborationError = function(message) {
      wx.showToast({
        title: message,
        icon: 'error',
        duration: 3000
      });
    };

    // 显示协作成功
    pageInstance.showCollaborationSuccess = function(message) {
      wx.showToast({
        title: message,
        icon: 'success',
        duration: 2000
      });
    };

    // 清理协作资源
    pageInstance.cleanupCollaboration = function() {
      // 释放所有锁
      this.releaseDataLocks();
      
      // 清理事件监听
      // 这里会在 setupPageEventListeners 中设置的清理函数中处理
    };
  }

  /**
   * 设置页面事件监听
   * @param {object} pageInstance 页面实例
   * @param {string} pageId 页面ID
   */
  setupPageEventListeners(pageInstance, pageId) {
    // 监听同步状态变化
    const onSyncStatusChange = (status) => {
      pageInstance.setData({
        syncStatus: status.status,
        syncProgress: status.progress,
        lastSyncTime: status.lastSyncTime
      });
    };

    // 监听成员活动
    const onMemberActivity = (activity) => {
      const activities = [activity, ...pageInstance.data.memberActivities].slice(0, 5);
      pageInstance.setData({
        memberActivities: activities
      });
    };

    // 监听冲突检测
    const onConflictDetected = (conflicts) => {
      pageInstance.setData({
        conflicts: conflicts,
        conflictCount: conflicts.length
      });

      if (conflicts.length > 0) {
        pageInstance.showConflictDialog(conflicts);
      }
    };

    // 监听权限变更
    const onPermissionChanged = (permissions) => {
      pageInstance.setData({
        currentUserPermissions: permissions
      });
    };

    // 注册事件监听
    eventBus.on(EventTypes.SYNC_START, onSyncStatusChange);
    eventBus.on(EventTypes.SYNC_PROGRESS, onSyncStatusChange);
    eventBus.on(EventTypes.SYNC_COMPLETE, onSyncStatusChange);
    eventBus.on(EventTypes.SYNC_ERROR, onSyncStatusChange);
    eventBus.on(EventTypes.MEMBER_ACTIVITY, onMemberActivity);
    eventBus.on(EventTypes.CONFLICT_DETECTED, onConflictDetected);
    eventBus.on(EventTypes.PERMISSION_CHANGED, onPermissionChanged);

    // 存储清理函数
    pageInstance._collaborationCleanup = () => {
      eventBus.off(EventTypes.SYNC_START, onSyncStatusChange);
      eventBus.off(EventTypes.SYNC_PROGRESS, onSyncStatusChange);
      eventBus.off(EventTypes.SYNC_COMPLETE, onSyncStatusChange);
      eventBus.off(EventTypes.SYNC_ERROR, onSyncStatusChange);
      eventBus.off(EventTypes.MEMBER_ACTIVITY, onMemberActivity);
      eventBus.off(EventTypes.CONFLICT_DETECTED, onConflictDetected);
      eventBus.off(EventTypes.PERMISSION_CHANGED, onPermissionChanged);
      
      // 从实例映射中移除
      this.pageInstances.delete(pageId);
    };

    // 重写清理方法
    const originalCleanup = pageInstance.cleanupCollaboration;
    pageInstance.cleanupCollaboration = function() {
      if (originalCleanup) {
        originalCleanup.call(this);
      }
      if (this._collaborationCleanup) {
        this._collaborationCleanup();
      }
    };
  }

  /**
   * 创建协作操作包装器
   * @param {string} operation 操作类型
   * @param {string} resource 资源类型
   * @param {object} options 选项
   */
  createOperationWrapper(operation, resource, options = {}) {
    return (originalFn) => {
      return async function(...args) {
        // 检查是否启用协作
        if (!this.data.collaborationEnabled) {
          return originalFn.apply(this, args);
        }

        // 执行协作操作
        return await this.executeCollaborativeOperation(
          operation,
          resource,
          () => originalFn.apply(this, args),
          options
        );
      };
    };
  }

  /**
   * 创建权限检查装饰器
   * @param {string} operation 操作类型
   * @param {string} resource 资源类型
   * @param {object} options 选项
   */
  createPermissionDecorator(operation, resource, options = {}) {
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args) {
        // 检查权限
        const hasPermission = await this.checkPermission(operation, resource, options);
        if (!hasPermission) {
          this.showCollaborationError(`没有权限执行此操作`);
          return;
        }
        
        // 执行原方法
        return originalMethod.apply(this, args);
      };
      
      return descriptor;
    };
  }

  /**
   * 生成页面ID
   * @returns {string} 页面ID
   */
  generatePageId() {
    return `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取所有活跃页面
   * @returns {Map} 页面实例映射
   */
  getActivePages() {
    return this.pageInstances;
  }

  /**
   * 广播消息到所有页面
   * @param {string} eventType 事件类型
   * @param {object} data 数据
   */
  broadcastToPages(eventType, data) {
    this.pageInstances.forEach(pageInstance => {
      if (typeof pageInstance[eventType] === 'function') {
        pageInstance[eventType](data);
      }
    });
  }

  /**
   * 清理所有资源
   */
  cleanup() {
    this.pageInstances.forEach(pageInstance => {
      if (pageInstance._collaborationCleanup) {
        pageInstance._collaborationCleanup();
      }
    });
    
    this.pageInstances.clear();
    this.initialized = false;
  }
}

// 创建全局实例
const collaborationHelper = new CollaborationHelper();

// 导出便捷方法
const CollaborationMixins = {
  /**
   * 财务页面协作混入
   */
  FinancialPageMixin: {
    async onLoad(options) {
      // 初始化协作功能
      await collaborationHelper.initCollaboration(this, {
        enableConflictPrevention: true,
        enableDataLocking: true,
        enableActivityTracking: true
      });
    },

    // 创建交易记录（带协作）
    async createTransaction(transactionData) {
      return await this.executeCollaborativeOperation(
        'create',
        'transaction',
        async () => {
          // 这里调用原始的创建交易方法
          return await this.originalCreateTransaction(transactionData);
        },
        {
          syncAfterOperation: true,
          requireLock: false
        }
      );
    },

    // 更新交易记录（带协作）
    async updateTransaction(transactionId, updateData) {
      return await this.executeCollaborativeOperation(
        'update',
        'transaction',
        async () => {
          // 这里调用原始的更新交易方法
          return await this.originalUpdateTransaction(transactionId, updateData);
        },
        {
          dataId: transactionId,
          requireLock: true,
          checkOwnership: true,
          dataOwnerId: updateData.userId
        }
      );
    },

    // 删除交易记录（带协作）
    async deleteTransaction(transactionId, ownerId) {
      return await this.executeCollaborativeOperation(
        'delete',
        'transaction',
        async () => {
          // 这里调用原始的删除交易方法
          return await this.originalDeleteTransaction(transactionId);
        },
        {
          dataId: transactionId,
          requireLock: true,
          checkOwnership: true,
          dataOwnerId: ownerId
        }
      );
    }
  }
};

// 导出
module.exports = {
  CollaborationHelper,
  collaborationHelper,
  CollaborationMixins
};