/**
 * 数据同步服务
 * 实现混合同步策略：关键数据实时同步，一般数据批量同步
 */

const db = wx.cloud.database();
const _ = db.command;
const conflictService = require('./conflict');

class SyncService {
  constructor() {
    this.syncQueue = [];
    this.isRealTimeEnabled = true;
    this.batchInterval = 30000; // 30秒批量同步
    this.maxBatchSize = 10;
    this.syncTimer = null;
    this.watchers = new Map(); // 存储数据监听器
    this.activeLocks = new Map(); // 存储活跃的数据锁
    this.conflictQueue = []; // 冲突处理队列
    
    this.initBatchSync();
  }

  /**
   * 初始化批量同步
   */
  initBatchSync() {
    this.syncTimer = setInterval(() => {
      this.processBatch();
    }, this.batchInterval);
  }

  /**
   * 智能同步决策（带冲突检测）
   */
  async sync(data, options = {}) {
    const {
      priority = 'normal', // critical, important, normal
      collection = 'shared_data',
      operation = 'add', // add, update, delete
      immediate = false,
      documentId,
      userId,
      currentVersion
    } = options;

    try {
      // 对于更新和删除操作，进行冲突检测
      if (operation !== 'add' && documentId) {
        const conflictResult = await conflictService.detectConflict(data, {
          collection,
          documentId,
          userId,
          operation,
          currentVersion
        });

        if (conflictResult.hasConflict) {
          return await this.handleConflict(conflictResult, data, options);
        }
      }

      // 检查网络状况
      const networkType = await this.getNetworkType();
      const syncStrategy = this.decideSyncStrategy(priority, networkType, immediate);

      if (syncStrategy === 'immediate') {
        return await this.syncImmediately(data, collection, operation, options);
      } else {
        return this.addToBatch(data, { collection, operation, priority, ...options });
      }

    } catch (error) {
      console.error('同步失败:', error);
      // 失败时加入批量队列重试
      this.addToBatch(data, { collection, operation, priority, retry: true, ...options });
      throw error;
    }
  }

  /**
   * 决定同步策略
   */
  decideSyncStrategy(priority, networkType, immediate) {
    if (immediate) return 'immediate';
    
    // 关键数据且网络良好时实时同步
    if (priority === 'critical' && this.isRealTimeEnabled) {
      if (networkType === 'wifi' || networkType === '4g') {
        return 'immediate';
      }
    }

    // 重要数据在WiFi环境下实时同步
    if (priority === 'important' && networkType === 'wifi' && this.isRealTimeEnabled) {
      return 'immediate';
    }

    return 'batch';
  }

  /**
   * 立即同步（带版本控制和锁机制）
   */
  async syncImmediately(data, collection, operation, options = {}) {
    const { documentId, userId } = options;
    let lockId = null;

    try {
      // 对于更新操作，创建数据锁
      if (operation === 'update' && documentId) {
        const lockResult = await conflictService.createLock(collection, documentId, userId);
        lockId = lockResult.lockId;
        this.activeLocks.set(documentId, lockId);
      }

      let result;
      const collectionRef = db.collection(collection);

      switch (operation) {
        case 'add':
          result = await collectionRef.add({
            data: {
              ...data,
              version: 1,
              createdBy: userId,
              createdAt: new Date(),
              modifiedBy: userId,
              modifiedAt: new Date(),
              syncedAt: new Date(),
              syncType: 'realtime'
            }
          });

          // 记录版本
          await conflictService.recordVersion(
            collection,
            result._id,
            data,
            userId,
            'create'
          );
          break;

        case 'update':
          // 获取当前版本
          const currentDoc = await collectionRef.doc(documentId).get();
          if (currentDoc.data.length === 0) {
            throw new Error('文档不存在');
          }

          const currentVersion = currentDoc.data[0].version || 0;
          const newVersion = currentVersion + 1;

          result = await collectionRef.doc(documentId).update({
            data: {
              ...data,
              version: newVersion,
              modifiedBy: userId,
              modifiedAt: new Date(),
              syncedAt: new Date(),
              syncType: 'realtime'
            }
          });

          // 记录版本
          await conflictService.recordVersion(
            collection,
            documentId,
            data,
            userId,
            'update'
          );
          break;

        case 'delete':
          result = await collectionRef.doc(documentId).remove();

          // 记录删除版本
          await conflictService.recordVersion(
            collection,
            documentId,
            { deleted: true },
            userId,
            'delete'
          );
          break;

        default:
          throw new Error(`不支持的操作类型: ${operation}`);
      }

      // 释放锁
      if (lockId) {
        await conflictService.releaseLock(lockId);
        this.activeLocks.delete(documentId);
      }

      // 通知其他客户端
      this.notifyOtherClients(data, collection, operation);

      return result;

    } catch (error) {
      // 释放锁
      if (lockId) {
        try {
          await conflictService.releaseLock(lockId);
          this.activeLocks.delete(documentId);
        } catch (lockError) {
          console.error('释放锁失败:', lockError);
        }
      }

      console.error('立即同步失败:', error);
      throw error;
    }
  }

  /**
   * 添加到批量队列
   */
  addToBatch(data, options) {
    const batchItem = {
      id: this.generateId(),
      data,
      options,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.syncQueue.push(batchItem);

    // 队列满时立即处理
    if (this.syncQueue.length >= this.maxBatchSize) {
      this.processBatch();
    }

    return Promise.resolve({ queued: true, batchId: batchItem.id });
  }

  /**
   * 处理批量同步
   */
  async processBatch() {
    if (this.syncQueue.length === 0) return;

    const batch = this.syncQueue.splice(0, this.maxBatchSize);
    
    try {
      // 按集合分组
      const groupedByCollection = this.groupByCollection(batch);

      // 并行处理不同集合
      const promises = Object.keys(groupedByCollection).map(collection => 
        this.processBatchForCollection(collection, groupedByCollection[collection])
      );

      await Promise.allSettled(promises);

    } catch (error) {
      console.error('批量同步失败:', error);
      
      // 失败的项目重新加入队列
      batch.forEach(item => {
        if (item.retryCount < 3) {
          item.retryCount++;
          this.syncQueue.unshift(item);
        }
      });
    }
  }

  /**
   * 处理单个集合的批量同步
   */
  async processBatchForCollection(collection, items) {
    try {
      const collectionRef = db.collection(collection);
      
      // 分别处理不同操作类型
      const addItems = items.filter(item => item.options.operation === 'add');
      const updateItems = items.filter(item => item.options.operation === 'update');
      const deleteItems = items.filter(item => item.options.operation === 'delete');

      // 批量添加
      if (addItems.length > 0) {
        const addData = addItems.map(item => ({
          ...item.data,
          syncedAt: new Date(),
          syncType: 'batch'
        }));
        
        // 云数据库不支持批量添加，需要逐个添加
        for (const data of addData) {
          await collectionRef.add({ data });
        }
      }

      // 批量更新
      for (const item of updateItems) {
        await collectionRef.doc(item.data._id).update({
          data: {
            ...item.data,
            syncedAt: new Date(),
            syncType: 'batch'
          }
        });
      }

      // 批量删除
      for (const item of deleteItems) {
        await collectionRef.doc(item.data._id).remove();
      }

      // 通知其他客户端
      items.forEach(item => {
        this.notifyOtherClients(item.data, collection, item.options.operation);
      });

    } catch (error) {
      console.error(`集合 ${collection} 批量同步失败:`, error);
      throw error;
    }
  }

  /**
   * 按集合分组
   */
  groupByCollection(batch) {
    return batch.reduce((groups, item) => {
      const collection = item.options.collection;
      if (!groups[collection]) {
        groups[collection] = [];
      }
      groups[collection].push(item);
      return groups;
    }, {});
  }

  /**
   * 通知其他客户端
   */
  notifyOtherClients(data, collection, operation) {
    // 这里可以实现WebSocket推送或其他实时通知机制
    // 暂时使用云数据库的watch功能
    try {
      wx.cloud.callFunction({
        name: 'notifyDataChange',
        data: {
          collection,
          operation,
          data: data,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('通知其他客户端失败:', error);
    }
  }

  /**
   * 监听数据变更
   */
  watchCollection(collection, callback) {
    try {
      const watcher = db.collection(collection).watch({
        onChange: (snapshot) => {
          if (snapshot.type === 'init') return;
          
          snapshot.docChanges.forEach(change => {
            callback({
              type: change.queueType, // enqueue, update, remove
              doc: change.doc,
              collection: collection
            });
          });
        },
        onError: (error) => {
          console.error(`监听集合 ${collection} 失败:`, error);
        }
      });

      this.watchers.set(collection, watcher);
      return watcher;

    } catch (error) {
      console.error('设置数据监听失败:', error);
      throw error;
    }
  }

  /**
   * 停止监听
   */
  unwatchCollection(collection) {
    const watcher = this.watchers.get(collection);
    if (watcher) {
      watcher.close();
      this.watchers.delete(collection);
    }
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus() {
    try {
      const queueLength = this.syncQueue.length;
      const lastSyncTime = wx.getStorageSync('lastSyncTime') || 0;
      
      let status = 'synced';
      if (queueLength > 0) {
        status = 'syncing';
      }

      // 检查是否有同步错误
      const hasErrors = this.syncQueue.some(item => item.retryCount > 0);
      if (hasErrors) {
        status = 'error';
      }

      return {
        status,
        queueLength,
        lastSyncTime,
        isRealTimeEnabled: this.isRealTimeEnabled,
        networkType: await this.getNetworkType()
      };

    } catch (error) {
      console.error('获取同步状态失败:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * 手动触发同步
   */
  async forcSync() {
    try {
      await this.processBatch();
      wx.setStorageSync('lastSyncTime', Date.now());
      return { success: true, message: '同步完成' };
    } catch (error) {
      console.error('强制同步失败:', error);
      throw error;
    }
  }

  /**
   * 设置同步策略
   */
  setSyncStrategy(strategy) {
    switch (strategy) {
      case 'realtime':
        this.isRealTimeEnabled = true;
        this.batchInterval = 10000; // 10秒
        break;
      case 'batch':
        this.isRealTimeEnabled = false;
        this.batchInterval = 60000; // 1分钟
        break;
      case 'hybrid':
      default:
        this.isRealTimeEnabled = true;
        this.batchInterval = 30000; // 30秒
        break;
    }

    // 重新设置定时器
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.initBatchSync();
  }

  /**
   * 获取网络类型
   */
  async getNetworkType() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          resolve(res.networkType);
        },
        fail: () => {
          resolve('unknown');
        }
      });
    });
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 处理冲突
   */
  async handleConflict(conflictResult, data, options) {
    try {
      // 创建冲突记录
      const conflictId = await conflictService.createConflictRecord({
        collection: options.collection,
        documentId: options.documentId,
        type: conflictResult.type,
        involvedUsers: [options.userId, ...conflictResult.conflictUsers || []],
        conflictData: {
          userData: data,
          conflictInfo: conflictResult
        }
      });

      // 添加到冲突队列
      this.conflictQueue.push({
        conflictId,
        conflictResult,
        data,
        options,
        timestamp: Date.now()
      });

      // 触发冲突事件
      this.emitSyncEvent('conflict_detected', {
        conflictId,
        conflictResult,
        options
      });

      return {
        success: false,
        conflict: true,
        conflictId,
        conflictResult,
        message: '检测到数据冲突，需要解决'
      };

    } catch (error) {
      console.error('处理冲突失败:', error);
      throw error;
    }
  }

  /**
   * 解决冲突并重新同步
   */
  async resolveConflictAndSync(conflictId, strategy, resolution = {}) {
    try {
      // 解决冲突
      const resolveResult = await conflictService.resolveConflict(conflictId, strategy, resolution);

      // 从冲突队列中移除
      this.conflictQueue = this.conflictQueue.filter(item => item.conflictId !== conflictId);

      // 触发冲突解决事件
      this.emitSyncEvent('conflict_resolved', {
        conflictId,
        strategy,
        resolveResult
      });

      return {
        success: true,
        resolved: true,
        resolveResult
      };

    } catch (error) {
      console.error('解决冲突并重新同步失败:', error);
      throw error;
    }
  }

  /**
   * 获取待解决的冲突
   */
  async getPendingConflicts(userId) {
    try {
      return await conflictService.getPendingConflicts(userId);
    } catch (error) {
      console.error('获取待解决冲突失败:', error);
      return [];
    }
  }

  /**
   * 触发同步事件
   */
  emitSyncEvent(eventType, eventData) {
    try {
      // 这里可以实现事件系统，通知UI层更新
      wx.eventBus && wx.eventBus.emit(eventType, eventData);
      
      // 也可以使用小程序的全局事件
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const currentPage = pages[pages.length - 1];
        if (currentPage.onSyncEvent) {
          currentPage.onSyncEvent(eventType, eventData);
        }
      }
    } catch (error) {
      console.error('触发同步事件失败:', error);
    }
  }

  /**
   * 获取同步统计信息
   */
  async getSyncStats() {
    try {
      const status = await this.getSyncStatus();
      const conflictCount = this.conflictQueue.length;
      const activeLockCount = this.activeLocks.size;

      return {
        ...status,
        conflictCount,
        activeLockCount,
        totalSynced: wx.getStorageSync('totalSynced') || 0,
        lastConflictTime: wx.getStorageSync('lastConflictTime') || 0
      };
    } catch (error) {
      console.error('获取同步统计失败:', error);
      return null;
    }
  }

  /**
   * 获取同步设置
   */
  async getSyncSettings() {
    try {
      const settings = wx.getStorageSync('syncSettings') || {
        autoSync: true,
        wifiOnly: false,
        syncInterval: 30000,
        strategy: 'hybrid'
      };
      
      return {
        success: true,
        data: settings
      };
    } catch (error) {
      console.error('获取同步设置失败:', error);
      return {
        success: false,
        error: error.message,
        data: {
          autoSync: true,
          wifiOnly: false,
          syncInterval: 30000,
          strategy: 'hybrid'
        }
      };
    }
  }

  /**
   * 更新同步设置
   */
  async updateSyncSettings(settings) {
    try {
      wx.setStorageSync('syncSettings', settings);
      
      // 应用新的同步策略
      this.setSyncStrategy(settings.strategy);
      
      return {
        success: true,
        message: '同步设置已更新'
      };
    } catch (error) {
      console.error('更新同步设置失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.watchers.forEach(watcher => {
      watcher.close();
    });
    this.watchers.clear();
    
    // 释放所有活跃锁
    this.activeLocks.forEach(async (lockId) => {
      try {
        await conflictService.releaseLock(lockId);
      } catch (error) {
        console.error('释放锁失败:', error);
      }
    });
    
    this.activeLocks.clear();
    this.syncQueue = [];
    this.conflictQueue = [];
  }
}

module.exports = new SyncService();