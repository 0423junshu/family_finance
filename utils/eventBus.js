// utils/eventBus.js
/**
 * 全局事件总线
 * 用于组件间通信和状态同步
 */
class EventBus {
  constructor() {
    this.events = {};
  }

  /**
   * 注册事件监听器
   * @param {string} eventName 事件名称
   * @param {function} callback 回调函数
   * @param {object} context 上下文对象
   */
  on(eventName, callback, context = null) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    this.events[eventName].push({
      callback,
      context,
      id: this.generateId()
    });
  }

  /**
   * 注册一次性事件监听器
   * @param {string} eventName 事件名称
   * @param {function} callback 回调函数
   * @param {object} context 上下文对象
   */
  once(eventName, callback, context = null) {
    const onceCallback = (...args) => {
      callback.apply(context, args);
      this.off(eventName, onceCallback);
    };

    this.on(eventName, onceCallback, context);
  }

  /**
   * 移除事件监听器
   * @param {string} eventName 事件名称
   * @param {function} callback 回调函数
   */
  off(eventName, callback) {
    if (!this.events[eventName]) return;

    if (callback) {
      this.events[eventName] = this.events[eventName].filter(
        listener => listener.callback !== callback
      );
    } else {
      delete this.events[eventName];
    }
  }

  /**
   * 触发事件
   * @param {string} eventName 事件名称
   * @param {...any} args 参数
   */
  emit(eventName, ...args) {
    if (!this.events[eventName]) return;

    // 复制监听器数组，避免在执行过程中被修改
    const listeners = [...this.events[eventName]];

    listeners.forEach(listener => {
      try {
        if (listener.context) {
          listener.callback.apply(listener.context, args);
        } else {
          listener.callback(...args);
        }
      } catch (error) {
        console.error(`事件处理器执行错误 [${eventName}]:`, error);
      }
    });
  }

  /**
   * 清除所有事件监听器
   */
  clear() {
    this.events = {};
  }

  /**
   * 获取事件监听器数量
   * @param {string} eventName 事件名称
   * @returns {number} 监听器数量
   */
  listenerCount(eventName) {
    return this.events[eventName] ? this.events[eventName].length : 0;
  }

  /**
   * 获取所有事件名称
   * @returns {string[]} 事件名称数组
   */
  eventNames() {
    return Object.keys(this.events);
  }

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

// 创建全局实例
const eventBus = new EventBus();

// 预定义的事件类型
const EventTypes = {
  // 同步相关事件
  SYNC_START: 'sync:start',
  SYNC_PROGRESS: 'sync:progress',
  SYNC_COMPLETE: 'sync:complete',
  SYNC_ERROR: 'sync:error',
  SYNC_CONFLICT: 'sync:conflict',

  // 冲突相关事件
  CONFLICT_DETECTED: 'conflict:detected',
  CONFLICT_RESOLVED: 'conflict:resolved',
  CONFLICT_IGNORED: 'conflict:ignored',

  // 成员相关事件
  MEMBER_JOINED: 'member:joined',
  MEMBER_LEFT: 'member:left',
  MEMBER_ACTIVITY: 'member:activity',
  MEMBER_ONLINE: 'member:online',
  MEMBER_OFFLINE: 'member:offline',

  // 权限相关事件
  PERMISSION_CHANGED: 'permission:changed',
  PERMISSION_DENIED: 'permission:denied',

  // 数据相关事件
  DATA_CREATED: 'data:created',
  DATA_UPDATED: 'data:updated',
  DATA_DELETED: 'data:deleted',
  DATA_SYNCED: 'data:synced',

  // 网络相关事件
  NETWORK_ONLINE: 'network:online',
  NETWORK_OFFLINE: 'network:offline',
  NETWORK_SLOW: 'network:slow',

  // 操作日志事件
  OPERATION_LOGGED: 'operation:logged',
  LOG_EXPORTED: 'log:exported',

  // 家庭相关事件
  FAMILY_CREATED: 'family:created',
  FAMILY_JOINED: 'family:joined',
  FAMILY_LEFT: 'family:left',
  FAMILY_UPDATED: 'family:updated',

  // UI相关事件
  UI_REFRESH: 'ui:refresh',
  UI_LOADING: 'ui:loading',
  UI_ERROR: 'ui:error',
  UI_SUCCESS: 'ui:success'
};

// 事件工具函数
const EventUtils = {
  /**
   * 创建同步开始事件数据
   * @param {object} options 选项
   * @returns {object} 事件数据
   */
  createSyncStartEvent(options = {}) {
    return {
      type: 'sync_start',
      timestamp: Date.now(),
      totalCount: options.totalCount || 0,
      syncType: options.syncType || 'manual',
      ...options
    };
  },

  /**
   * 创建同步进度事件数据
   * @param {number} completed 已完成数量
   * @param {number} total 总数量
   * @param {object} options 选项
   * @returns {object} 事件数据
   */
  createSyncProgressEvent(completed, total, options = {}) {
    return {
      type: 'sync_progress',
      timestamp: Date.now(),
      completed,
      total,
      percentage: Math.round((completed / total) * 100),
      ...options
    };
  },

  /**
   * 创建同步完成事件数据
   * @param {object} result 同步结果
   * @returns {object} 事件数据
   */
  createSyncCompleteEvent(result = {}) {
    return {
      type: 'sync_complete',
      timestamp: Date.now(),
      success: true,
      syncedCount: result.syncedCount || 0,
      duration: result.duration || 0,
      ...result
    };
  },

  /**
   * 创建同步错误事件数据
   * @param {Error} error 错误对象
   * @param {object} options 选项
   * @returns {object} 事件数据
   */
  createSyncErrorEvent(error, options = {}) {
    return {
      type: 'sync_error',
      timestamp: Date.now(),
      success: false,
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      ...options
    };
  },

  /**
   * 创建冲突检测事件数据
   * @param {array} conflicts 冲突列表
   * @returns {object} 事件数据
   */
  createConflictDetectedEvent(conflicts) {
    return {
      type: 'conflict_detected',
      timestamp: Date.now(),
      conflicts: conflicts.map(conflict => ({
        id: conflict.id,
        type: conflict.type,
        field: conflict.field,
        severity: conflict.severity || 'medium'
      })),
      count: conflicts.length
    };
  },

  /**
   * 创建成员活动事件数据
   * @param {string} memberId 成员ID
   * @param {string} activity 活动描述
   * @param {object} options 选项
   * @returns {object} 事件数据
   */
  createMemberActivityEvent(memberId, activity, options = {}) {
    return {
      type: 'member_activity',
      timestamp: Date.now(),
      memberId,
      memberName: options.memberName || `用户${memberId.substr(-4)}`,
      activity,
      activityType: options.activityType || 'general',
      ...options
    };
  },

  /**
   * 创建操作日志事件数据
   * @param {object} logData 日志数据
   * @returns {object} 事件数据
   */
  createOperationLoggedEvent(logData) {
    return {
      type: 'operation_logged',
      timestamp: Date.now(),
      logId: logData.id,
      operationType: logData.operationType,
      operationName: logData.operationName,
      userId: logData.userId,
      level: logData.level || 'info'
    };
  }
};

// 同步状态管理器
class SyncStatusManager {
  constructor() {
    this.status = 'idle';
    this.progress = 0;
    this.conflicts = [];
    this.lastSyncTime = null;
    this.isOnline = true;
  }

  /**
   * 开始同步
   * @param {object} options 选项
   */
  startSync(options = {}) {
    this.status = 'syncing';
    this.progress = 0;
    
    const eventData = EventUtils.createSyncStartEvent(options);
    eventBus.emit(EventTypes.SYNC_START, eventData);
  }

  /**
   * 更新同步进度
   * @param {number} completed 已完成数量
   * @param {number} total 总数量
   */
  updateProgress(completed, total) {
    this.progress = Math.round((completed / total) * 100);
    
    const eventData = EventUtils.createSyncProgressEvent(completed, total);
    eventBus.emit(EventTypes.SYNC_PROGRESS, eventData);
  }

  /**
   * 完成同步
   * @param {object} result 同步结果
   */
  completeSync(result = {}) {
    this.status = 'success';
    this.progress = 100;
    this.lastSyncTime = Date.now();
    
    const eventData = EventUtils.createSyncCompleteEvent(result);
    eventBus.emit(EventTypes.SYNC_COMPLETE, eventData);

    // 延迟重置状态
    setTimeout(() => {
      if (this.status === 'success') {
        this.status = 'idle';
      }
    }, 3000);
  }

  /**
   * 同步错误
   * @param {Error} error 错误对象
   */
  errorSync(error) {
    this.status = 'error';
    
    const eventData = EventUtils.createSyncErrorEvent(error);
    eventBus.emit(EventTypes.SYNC_ERROR, eventData);
  }

  /**
   * 检测到冲突
   * @param {array} conflicts 冲突列表
   */
  detectConflicts(conflicts) {
    this.conflicts = conflicts;
    this.status = 'conflict';
    
    const eventData = EventUtils.createConflictDetectedEvent(conflicts);
    eventBus.emit(EventTypes.CONFLICT_DETECTED, eventData);
  }

  /**
   * 解决冲突
   * @param {string} conflictId 冲突ID
   * @param {string} resolution 解决方案
   */
  resolveConflict(conflictId, resolution) {
    this.conflicts = this.conflicts.filter(c => c.id !== conflictId);
    
    eventBus.emit(EventTypes.CONFLICT_RESOLVED, {
      conflictId,
      resolution,
      timestamp: Date.now()
    });

    // 如果没有更多冲突，重置状态
    if (this.conflicts.length === 0) {
      this.status = 'idle';
    }
  }

  /**
   * 网络状态变化
   * @param {boolean} isOnline 是否在线
   */
  setNetworkStatus(isOnline) {
    const wasOnline = this.isOnline;
    this.isOnline = isOnline;

    if (wasOnline !== isOnline) {
      eventBus.emit(isOnline ? EventTypes.NETWORK_ONLINE : EventTypes.NETWORK_OFFLINE, {
        isOnline,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 获取当前状态
   * @returns {object} 状态信息
   */
  getStatus() {
    return {
      status: this.status,
      progress: this.progress,
      conflicts: this.conflicts,
      lastSyncTime: this.lastSyncTime,
      isOnline: this.isOnline,
      conflictCount: this.conflicts.length
    };
  }
}

// 创建全局同步状态管理器实例
const syncStatusManager = new SyncStatusManager();

// 导出
module.exports = {
  eventBus,
  EventTypes,
  EventUtils,
  syncStatusManager
};