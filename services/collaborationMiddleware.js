// services/collaborationMiddleware.js
/**
 * 协作权限中间件
 * 用于在现有财务模块中集成协作功能
 */

const familyService = require('./family');
const conflictService = require('./conflict');
const operationLogService = require('./operationLog');
const { eventBus, EventTypes, EventUtils, syncStatusManager } = require('../utils/eventBus');

class CollaborationMiddleware {
  constructor() {
    this.currentUser = null;
    this.familyInfo = null;
    this.permissions = {};
    this.activeOperations = new Map(); // 跟踪正在进行的操作
    this.lockManager = new Map(); // 数据锁管理
    this.conflictPreventionEnabled = true;
  }

  /**
   * 初始化中间件
   */
  async initialize() {
    try {
      // 获取当前用户信息
      this.currentUser = wx.getStorageSync('userInfo');
      
      // 获取家庭信息和权限
      await this.loadFamilyInfo();
      await this.loadPermissions();
      
      // 设置事件监听
      this.setupEventListeners();
      
      console.log('协作中间件初始化完成');
      return true;
    } catch (error) {
      console.error('协作中间件初始化失败:', error);
      return false;
    }
  }

  /**
   * 加载家庭信息
   */
  async loadFamilyInfo() {
    try {
      const result = await familyService.getFamilyInfo();
      if (result.success && result.data) {
        this.familyInfo = result.data;
      }
    } catch (error) {
      console.error('加载家庭信息失败:', error);
    }
  }

  /**
   * 加载权限信息
   */
  async loadPermissions() {
    try {
      if (!this.familyInfo) return;
      
      const result = await familyService.getUserPermissions(this.currentUser.userId);
      if (result.success) {
        this.permissions = result.permissions;
      }
    } catch (error) {
      console.error('加载权限信息失败:', error);
    }
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 监听权限变更
    eventBus.on(EventTypes.PERMISSION_CHANGED, this.handlePermissionChanged.bind(this));
    
    // 监听成员活动
    eventBus.on(EventTypes.MEMBER_ACTIVITY, this.handleMemberActivity.bind(this));
    
    // 监听数据冲突
    eventBus.on(EventTypes.CONFLICT_DETECTED, this.handleConflictDetected.bind(this));
  }

  /**
   * 权限检查装饰器
   * @param {string} operation 操作类型
   * @param {string} resource 资源类型
   * @param {object} options 选项
   */
  requirePermission(operation, resource, options = {}) {
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args) {
        // 检查权限
        const hasPermission = await this.checkPermission(operation, resource, options);
        if (!hasPermission) {
          throw new Error(`没有权限执行 ${operation} 操作`);
        }
        
        // 执行原方法
        return originalMethod.apply(this, args);
      };
      
      return descriptor;
    };
  }

  /**
   * 检查操作权限
   * @param {string} operation 操作类型 (create, read, update, delete)
   * @param {string} resource 资源类型 (transaction, account, budget, category)
   * @param {object} options 选项
   * @returns {boolean} 是否有权限
   */
  async checkPermission(operation, resource, options = {}) {
    try {
      // 如果不在家庭中，使用个人权限
      if (!this.familyInfo) {
        return true;
      }

      // 检查基础权限
      const permissionKey = `${resource}.${operation}`;
      const hasBasicPermission = this.permissions[permissionKey] === true;
      
      if (!hasBasicPermission) {
        // 触发权限拒绝事件
        eventBus.emit(EventTypes.PERMISSION_DENIED, {
          userId: this.currentUser.userId,
          operation,
          resource,
          reason: 'insufficient_permission'
        });
        return false;
      }

      // 检查特殊条件
      if (options.checkOwnership && options.dataOwnerId) {
        const isOwner = options.dataOwnerId === this.currentUser.userId;
        const canModifyOthers = this.permissions[`${resource}.modify_others`] === true;
        
        if (!isOwner && !canModifyOthers) {
          eventBus.emit(EventTypes.PERMISSION_DENIED, {
            userId: this.currentUser.userId,
            operation,
            resource,
            reason: 'not_owner'
          });
          return false;
        }
      }

      // 检查数据锁定状态
      if (options.dataId && this.isDataLocked(resource, options.dataId)) {
        const lockInfo = this.getLockInfo(resource, options.dataId);
        if (lockInfo.userId !== this.currentUser.userId) {
          eventBus.emit(EventTypes.PERMISSION_DENIED, {
            userId: this.currentUser.userId,
            operation,
            resource,
            reason: 'data_locked',
            lockInfo
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('权限检查失败:', error);
      return false;
    }
  }

  /**
   * 执行协作操作
   * @param {string} operation 操作类型
   * @param {string} resource 资源类型
   * @param {function} operationFn 操作函数
   * @param {object} options 选项
   */
  async executeCollaborativeOperation(operation, resource, operationFn, options = {}) {
    const operationId = this.generateOperationId();
    
    try {
      // 1. 权限检查
      const hasPermission = await this.checkPermission(operation, resource, options);
      if (!hasPermission) {
        throw new Error('权限不足');
      }

      // 2. 冲突预防检查
      if (this.conflictPreventionEnabled && options.dataId) {
        await this.preventConflict(resource, options.dataId, operation);
      }

      // 3. 获取数据锁
      if (options.requireLock && options.dataId) {
        await this.acquireLock(resource, options.dataId, operationId);
      }

      // 4. 记录操作开始
      this.activeOperations.set(operationId, {
        operation,
        resource,
        startTime: Date.now(),
        userId: this.currentUser.userId,
        dataId: options.dataId
      });

      // 5. 触发操作开始事件
      eventBus.emit(EventTypes.MEMBER_ACTIVITY, EventUtils.createMemberActivityEvent(
        this.currentUser.userId,
        `开始${this.getOperationName(operation, resource)}`,
        { operationId, activityType: 'operation_start' }
      ));

      // 6. 执行实际操作
      const result = await operationFn();

      // 7. 记录操作日志
      await this.logOperation(operation, resource, result, options);

      // 8. 触发数据同步
      if (options.syncAfterOperation !== false) {
        this.triggerSync(resource, result);
      }

      // 9. 触发操作完成事件
      eventBus.emit(EventTypes.MEMBER_ACTIVITY, EventUtils.createMemberActivityEvent(
        this.currentUser.userId,
        `完成${this.getOperationName(operation, resource)}`,
        { operationId, activityType: 'operation_complete' }
      ));

      return result;

    } catch (error) {
      // 记录错误日志
      await this.logOperationError(operation, resource, error, options);
      
      // 触发错误事件
      eventBus.emit(EventTypes.MEMBER_ACTIVITY, EventUtils.createMemberActivityEvent(
        this.currentUser.userId,
        `${this.getOperationName(operation, resource)}失败`,
        { operationId, activityType: 'operation_error', error: error.message }
      ));

      throw error;
    } finally {
      // 清理资源
      this.activeOperations.delete(operationId);
      
      if (options.requireLock && options.dataId) {
        this.releaseLock(resource, options.dataId, operationId);
      }
    }
  }

  /**
   * 冲突预防检查
   * @param {string} resource 资源类型
   * @param {string} dataId 数据ID
   * @param {string} operation 操作类型
   */
  async preventConflict(resource, dataId, operation) {
    try {
      // 检查是否有其他用户正在编辑相同数据
      const conflicts = await conflictService.checkPotentialConflicts(resource, dataId);
      
      if (conflicts.length > 0) {
        // 显示冲突警告
        const conflictWarning = {
          type: 'potential_conflict',
          resource,
          dataId,
          conflicts,
          message: `其他成员正在编辑此${this.getResourceName(resource)}，可能会产生冲突`
        };

        eventBus.emit(EventTypes.CONFLICT_DETECTED, [conflictWarning]);
        
        // 根据配置决定是否继续
        if (this.permissions.conflict_prevention_strict) {
          throw new Error('检测到潜在冲突，操作被阻止');
        }
      }
    } catch (error) {
      console.error('冲突预防检查失败:', error);
      // 非严格模式下继续执行
      if (!this.permissions.conflict_prevention_strict) {
        console.warn('冲突预防检查失败，但继续执行操作');
      } else {
        throw error;
      }
    }
  }

  /**
   * 获取数据锁
   * @param {string} resource 资源类型
   * @param {string} dataId 数据ID
   * @param {string} operationId 操作ID
   */
  async acquireLock(resource, dataId, operationId) {
    const lockKey = `${resource}:${dataId}`;
    
    // 检查是否已被锁定
    if (this.lockManager.has(lockKey)) {
      const existingLock = this.lockManager.get(lockKey);
      if (existingLock.userId !== this.currentUser.userId) {
        throw new Error(`数据正在被其他用户编辑: ${existingLock.userName}`);
      }
    }

    // 创建锁
    const lockInfo = {
      userId: this.currentUser.userId,
      userName: this.currentUser.nickName || `用户${this.currentUser.userId.substr(-4)}`,
      operationId,
      acquiredAt: Date.now(),
      heartbeat: Date.now()
    };

    this.lockManager.set(lockKey, lockInfo);

    // 启动心跳维护
    this.startLockHeartbeat(lockKey);

    // 通知其他用户
    eventBus.emit(EventTypes.MEMBER_ACTIVITY, EventUtils.createMemberActivityEvent(
      this.currentUser.userId,
      `正在编辑${this.getResourceName(resource)}`,
      { activityType: 'data_lock', resource, dataId }
    ));
  }

  /**
   * 释放数据锁
   * @param {string} resource 资源类型
   * @param {string} dataId 数据ID
   * @param {string} operationId 操作ID
   */
  releaseLock(resource, dataId, operationId) {
    const lockKey = `${resource}:${dataId}`;
    const lockInfo = this.lockManager.get(lockKey);
    
    if (lockInfo && lockInfo.operationId === operationId) {
      this.lockManager.delete(lockKey);
      
      // 通知其他用户
      eventBus.emit(EventTypes.MEMBER_ACTIVITY, EventUtils.createMemberActivityEvent(
        this.currentUser.userId,
        `完成编辑${this.getResourceName(resource)}`,
        { activityType: 'data_unlock', resource, dataId }
      ));
    }
  }

  /**
   * 检查数据是否被锁定
   * @param {string} resource 资源类型
   * @param {string} dataId 数据ID
   * @returns {boolean} 是否被锁定
   */
  isDataLocked(resource, dataId) {
    const lockKey = `${resource}:${dataId}`;
    const lockInfo = this.lockManager.get(lockKey);
    
    if (!lockInfo) return false;
    
    // 检查锁是否过期（5分钟无心跳则过期）
    const lockTimeout = 5 * 60 * 1000;
    if (Date.now() - lockInfo.heartbeat > lockTimeout) {
      this.lockManager.delete(lockKey);
      return false;
    }
    
    return true;
  }

  /**
   * 获取锁信息
   * @param {string} resource 资源类型
   * @param {string} dataId 数据ID
   * @returns {object|null} 锁信息
   */
  getLockInfo(resource, dataId) {
    const lockKey = `${resource}:${dataId}`;
    return this.lockManager.get(lockKey) || null;
  }

  /**
   * 启动锁心跳维护
   * @param {string} lockKey 锁键
   */
  startLockHeartbeat(lockKey) {
    const heartbeatInterval = setInterval(() => {
      const lockInfo = this.lockManager.get(lockKey);
      if (lockInfo) {
        lockInfo.heartbeat = Date.now();
        this.lockManager.set(lockKey, lockInfo);
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // 每30秒发送一次心跳
  }

  /**
   * 记录操作日志
   * @param {string} operation 操作类型
   * @param {string} resource 资源类型
   * @param {object} result 操作结果
   * @param {object} options 选项
   */
  async logOperation(operation, resource, result, options = {}) {
    try {
      const logData = {
        operationType: `${resource}.${operation}`,
        operationName: this.getOperationName(operation, resource),
        userId: this.currentUser.userId,
        familyId: this.familyInfo?.id,
        level: 'info',
        details: {
          resource,
          operation,
          dataId: options.dataId,
          result: this.sanitizeLogData(result),
          timestamp: Date.now()
        },
        metadata: {
          userAgent: wx.getDeviceInfo ? wx.getDeviceInfo() : wx.getSystemInfoSync(),
          version: wx.getAccountInfoSync().miniProgram.version
        }
      };

      await operationLogService.createLog(logData);
      
      // 触发日志记录事件
      eventBus.emit(EventTypes.OPERATION_LOGGED, EventUtils.createOperationLoggedEvent(logData));
      
    } catch (error) {
      console.error('记录操作日志失败:', error);
    }
  }

  /**
   * 记录操作错误日志
   * @param {string} operation 操作类型
   * @param {string} resource 资源类型
   * @param {Error} error 错误对象
   * @param {object} options 选项
   */
  async logOperationError(operation, resource, error, options = {}) {
    try {
      const logData = {
        operationType: `${resource}.${operation}`,
        operationName: this.getOperationName(operation, resource),
        userId: this.currentUser.userId,
        familyId: this.familyInfo?.id,
        level: 'error',
        details: {
          resource,
          operation,
          dataId: options.dataId,
          error: {
            message: error.message,
            stack: error.stack
          },
          timestamp: Date.now()
        }
      };

      await operationLogService.createLog(logData);
    } catch (logError) {
      console.error('记录错误日志失败:', logError);
    }
  }

  /**
   * 触发数据同步
   * @param {string} resource 资源类型
   * @param {object} data 数据
   */
  triggerSync(resource, data) {
    // 根据资源类型决定同步策略
    const syncPriority = this.getSyncPriority(resource);
    
    if (syncPriority === 'high') {
      // 高优先级数据立即同步
      syncStatusManager.startSync({
        type: 'realtime',
        resource,
        data,
        priority: 'high'
      });
    } else {
      // 低优先级数据批量同步
      eventBus.emit(EventTypes.DATA_UPDATED, {
        resource,
        data,
        timestamp: Date.now(),
        userId: this.currentUser.userId
      });
    }
  }

  /**
   * 获取同步优先级
   * @param {string} resource 资源类型
   * @returns {string} 优先级 (high, medium, low)
   */
  getSyncPriority(resource) {
    const priorityMap = {
      'transaction': 'high',    // 交易记录高优先级
      'account': 'high',        // 账户信息高优先级
      'budget': 'medium',       // 预算中等优先级
      'category': 'low',        // 分类低优先级
      'tag': 'low'             // 标签低优先级
    };

    return priorityMap[resource] || 'medium';
  }

  /**
   * 事件处理方法
   */
  handlePermissionChanged(event) {
    console.log('权限变更:', event);
    this.loadPermissions();
  }

  handleMemberActivity(activity) {
    console.log('成员活动:', activity);
    // 可以在这里实现活动通知逻辑
  }

  handleConflictDetected(conflicts) {
    console.log('检测到冲突:', conflicts);
    // 可以在这里实现冲突处理逻辑
  }

  /**
   * 工具方法
   */
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getOperationName(operation, resource) {
    const operationNames = {
      'create': '创建',
      'read': '查看',
      'update': '修改',
      'delete': '删除'
    };

    const resourceNames = {
      'transaction': '交易记录',
      'account': '账户',
      'budget': '预算',
      'category': '分类',
      'tag': '标签'
    };

    return `${operationNames[operation] || operation}${resourceNames[resource] || resource}`;
  }

  getResourceName(resource) {
    const resourceNames = {
      'transaction': '交易记录',
      'account': '账户',
      'budget': '预算',
      'category': '分类',
      'tag': '标签'
    };

    return resourceNames[resource] || resource;
  }

  sanitizeLogData(data) {
    // 移除敏感信息
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.secret;
      return sanitized;
    }
    return data;
  }

  /**
   * 获取当前协作状态
   * @returns {object} 协作状态信息
   */
  getCollaborationStatus() {
    return {
      isInFamily: !!this.familyInfo,
      familyInfo: this.familyInfo,
      permissions: this.permissions,
      activeOperations: Array.from(this.activeOperations.values()),
      lockedData: Array.from(this.lockManager.entries()).map(([key, info]) => ({
        key,
        ...info
      })),
      conflictPreventionEnabled: this.conflictPreventionEnabled
    };
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 清理所有锁
    this.lockManager.clear();
    
    // 清理活动操作
    this.activeOperations.clear();
    
    // 移除事件监听
    eventBus.off(EventTypes.PERMISSION_CHANGED, this.handlePermissionChanged);
    eventBus.off(EventTypes.MEMBER_ACTIVITY, this.handleMemberActivity);
    eventBus.off(EventTypes.CONFLICT_DETECTED, this.handleConflictDetected);
  }
}

// 创建全局实例
const collaborationMiddleware = new CollaborationMiddleware();

// 导出
module.exports = {
  CollaborationMiddleware,
  collaborationMiddleware
};