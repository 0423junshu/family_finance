/**
 * 数据冲突检测和解决服务
 * 处理多成员同时编辑时的数据冲突问题
 */

const db = (wx.cloud && wx.cloud.database) ? wx.cloud.database() : null;
const _ = db ? db.command : {};

class ConflictService {
  constructor() {
    // 使用与initDatabase云函数中一致的集合名称（安全获取，集合可能未创建）
    this.conflictCollection = this.safeCollection('data_conflicts');
    this.lockCollection = this.safeCollection('data_locks');
    this.versionCollection = this.safeCollection('data_versions');
    
    // 冲突解决策略
    this.resolutionStrategies = {
      'last_write_wins': this.lastWriteWins.bind(this),
      'merge': this.mergeChanges.bind(this),
      'manual': this.manualResolve.bind(this),
      'priority_based': this.priorityBasedResolve.bind(this)
    };
  }

  // 安全获取集合，云未初始化或集合异常时返回 null，调用处需兜底
  safeCollection(name) {
    try {
      if (!db || !db.collection) {
        console.warn('[conflict] wx.cloud 未初始化，跳过集合访问：', name);
        return null;
      }
      return db.collection(name);
    } catch (e) {
      console.warn('[conflict] 获取集合失败（可能未创建）：', name, e);
      return null;
    }
  }

  /**
   * 检测数据冲突
   */
  async detectConflict(data, options = {}) {
    const {
      collection = 'shared_data',
      documentId,
      userId,
      operation = 'update', // update, delete
      currentVersion
    } = options;

    try {
      // 检查是否有其他用户正在编辑
      const activeLocks = await this.checkActiveLocks(collection, documentId, userId);
      
      if (activeLocks.length > 0) {
        return {
          hasConflict: true,
          type: 'concurrent_edit',
          conflictUsers: activeLocks.map(lock => lock.userId),
          message: '其他用户正在编辑此数据'
        };
      }

      // 检查版本冲突
      const versionConflict = await this.checkVersionConflict(
        collection, 
        documentId, 
        currentVersion
      );

      if (versionConflict) {
        return {
          hasConflict: true,
          type: 'version_conflict',
          currentVersion: versionConflict.currentVersion,
          userVersion: currentVersion,
          message: '数据已被其他用户修改'
        };
      }

      return {
        hasConflict: false,
        message: '无冲突'
      };

    } catch (error) {
      console.error('检测冲突失败:', error);
      throw error;
    }
  }

  /**
   * 检查活跃锁
   */
  async checkActiveLocks(collection, documentId, excludeUserId) {
    try {
      if (!this.lockCollection) {
        console.warn('[conflict] data_locks 集合不存在，返回空锁列表');
        return [];
      }
      const result = await this.lockCollection
        .where({
          collection: collection,
          documentId: documentId,
          userId: _.neq(excludeUserId),
          status: 'active',
          expiresAt: _.gt(new Date())
        })
        .get();

      return result.data;
    } catch (error) {
      console.error('检查活跃锁失败:', error);
      // 如果是数据库集合不存在错误，返回空数组并记录警告
      if (error.errCode === -502005) {
        console.warn('数据库集合不存在，请运行initDatabase云函数初始化');
        return [];
      }
      return [];
    }
  }

  /**
   * 检查版本冲突
   */
  async checkVersionConflict(collection, documentId, userVersion) {
    try {
      if (!this.versionCollection) {
        console.warn('[conflict] data_versions 集合不存在，认为无版本冲突');
        return null;
      }
      const result = await this.versionCollection
        .where({
          collection: collection,
          documentId: documentId
        })
        .orderBy('version', 'desc')
        .limit(1)
        .get();

      if (result.data.length === 0) {
        return null;
      }

      const latestVersion = result.data[0];
      
      if (latestVersion.version > userVersion) {
        return {
          currentVersion: latestVersion.version,
          lastModifiedBy: latestVersion.modifiedBy,
          lastModifiedAt: latestVersion.modifiedAt
        };
      }

      return null;
    } catch (error) {
      console.error('检查版本冲突失败:', error);
      // 如果是数据库集合不存在错误，返回null并记录警告
      if (error.errCode === -502005) {
        console.warn('数据库集合不存在，请运行initDatabase云函数初始化');
        return null;
      }
      return null;
    }
  }

  /**
   * 创建数据锁
   */
  async createLock(collection, documentId, userId, duration = 300000) { // 5分钟
    try {
      if (!this.lockCollection) {
        console.warn('[conflict] data_locks 集合不存在，跳过加锁逻辑');
        return { lockId: null, expiresAt: new Date(Date.now() + duration) };
      }
      const lockId = this.generateLockId();
      const expiresAt = new Date(Date.now() + duration);

      await this.lockCollection.add({
        data: {
          lockId: lockId,
          collection: collection,
          documentId: documentId,
          userId: userId,
          status: 'active',
          createdAt: new Date(),
          expiresAt: expiresAt,
          heartbeat: new Date()
        }
      });

      // 启动心跳维持锁
      this.startHeartbeat(lockId);

      return {
        lockId: lockId,
        expiresAt: expiresAt
      };

    } catch (error) {
      console.error('创建锁失败:', error);
      // 如果是数据库集合不存在错误，提供友好提示
      if (error.errCode === -502005) {
        console.warn('数据库集合不存在，请运行initDatabase云函数初始化');
        throw new Error('数据库未初始化，请联系管理员');
      }
      throw error;
    }
  }

  /**
   * 释放数据锁
   */
  async releaseLock(lockId) {
    try {
      if (!this.lockCollection) {
        console.warn('[conflict] data_locks 集合不存在，跳过释放锁');
        return { success: true, skipped: true };
      }
      await this.lockCollection
        .where({
          lockId: lockId
        })
        .update({
          data: {
            status: 'released',
            releasedAt: new Date()
          }
        });

      // 停止心跳
      this.stopHeartbeat(lockId);

      return { success: true };
    } catch (error) {
      console.error('释放锁失败:', error);
      // 如果是数据库集合不存在错误，提供友好提示
      if (error.errCode === -502005) {
        console.warn('数据库集合不存在，请运行initDatabase云函数初始化');
        // 释放锁失败不抛出异常，避免阻塞后续操作
        return { success: false, error: '数据库未初始化' };
      }
      throw error;
    }
  }

  /**
   * 启动心跳维持锁
   */
  startHeartbeat(lockId) {
    const heartbeatInterval = setInterval(async () => {
      try {
        if (!this.lockCollection) {
          clearInterval(heartbeatInterval);
          return;
        }
        await this.lockCollection
          .where({
            lockId: lockId,
            status: 'active'
          })
          .update({
            data: {
              heartbeat: new Date()
            }
          });
      } catch (error) {
        console.error('心跳更新失败:', error);
        clearInterval(heartbeatInterval);
      }
    }, 30000); // 30秒心跳

    // 存储心跳定时器
    if (!this.heartbeats) {
      this.heartbeats = new Map();
    }
    this.heartbeats.set(lockId, heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  stopHeartbeat(lockId) {
    if (this.heartbeats && this.heartbeats.has(lockId)) {
      clearInterval(this.heartbeats.get(lockId));
      this.heartbeats.delete(lockId);
    }
  }

  /**
   * 记录数据版本
   */
  async recordVersion(collection, documentId, data, userId, operation) {
    try {
      if (!this.versionCollection) {
        console.warn('[conflict] data_versions 集合不存在，跳过记录版本');
        return 0;
      }
      // 获取当前最新版本号
      const latestVersion = await this.getLatestVersion(collection, documentId);
      const newVersion = latestVersion + 1;

      await this.versionCollection.add({
        data: {
          collection: collection,
          documentId: documentId,
          version: newVersion,
          data: data,
          operation: operation,
          modifiedBy: userId,
          modifiedAt: new Date(),
          checksum: this.calculateChecksum(data)
        }
      });

      return newVersion;
    } catch (error) {
      console.error('记录版本失败:', error);
      // 如果是数据库集合不存在错误，提供友好提示
      if (error.errCode === -502005) {
        console.warn('数据库集合不存在，请运行initDatabase云函数初始化');
        throw new Error('数据库未初始化，请联系管理员');
      }
      throw error;
    }
  }

  /**
   * 获取最新版本号
   */
  async getLatestVersion(collection, documentId) {
    try {
      if (!this.versionCollection) {
        console.warn('[conflict] data_versions 集合不存在，返回版本0');
        return 0;
      }
      const result = await this.versionCollection
        .where({
          collection: collection,
          documentId: documentId
        })
        .orderBy('version', 'desc')
        .limit(1)
        .get();

      return result.data.length > 0 ? result.data[0].version : 0;
    } catch (error) {
      console.error('获取最新版本失败:', error);
      // 如果是数据库集合不存在错误，返回默认版本0
      if (error.errCode === -502005) {
        console.warn('数据库集合不存在，请运行initDatabase云函数初始化');
        return 0;
      }
      return 0;
    }
  }

  /**
   * 创建冲突记录
   */
  async createConflictRecord(conflictData) {
    try {
      if (!this.conflictCollection) {
        console.warn('[conflict] data_conflicts 集合不存在，跳过创建冲突记录');
        return null;
      }
      const conflictId = this.generateConflictId();

      await this.conflictCollection.add({
        data: {
          conflictId: conflictId,
          ...conflictData,
          status: 'pending',
          createdAt: new Date(),
          resolvedAt: null,
          resolutionStrategy: null
        }
      });

      return conflictId;
    } catch (error) {
      console.error('创建冲突记录失败:', error);
      throw error;
    }
  }

  /**
   * 解决冲突
   */
  async resolveConflict(conflictId, strategy, resolution = {}) {
    try {
      if (!this.conflictCollection) {
        console.warn('[conflict] data_conflicts 集合不存在，无法更新冲突状态');
        return { success: false, error: 'collection_missing' };
      }
      const conflict = await this.getConflictById(conflictId);
      if (!conflict) {
        throw new Error('冲突记录不存在');
      }

      const resolveFunction = this.resolutionStrategies[strategy];
      if (!resolveFunction) {
        throw new Error(`不支持的解决策略: ${strategy}`);
      }

      const result = await resolveFunction(conflict, resolution);

      // 更新冲突记录状态
      await this.conflictCollection
        .where({
          conflictId: conflictId
        })
        .update({
          data: {
            status: 'resolved',
            resolvedAt: new Date(),
            resolutionStrategy: strategy,
            resolution: result
          }
        });

      return result;
    } catch (error) {
      console.error('解决冲突失败:', error);
      throw error;
    }
  }

  /**
   * 最后写入获胜策略
   */
  async lastWriteWins(conflict, resolution) {
    try {
      // 使用最新的数据版本
      const latestVersion = await this.versionCollection
        .where({
          collection: conflict.collection,
          documentId: conflict.documentId
        })
        .orderBy('version', 'desc')
        .limit(1)
        .get();

      if (latestVersion.data.length > 0) {
        const latest = latestVersion.data[0];
        
        // 应用最新版本的数据（集合缺失时静默跳过）
        const targetCol1 = this.safeCollection(conflict.collection);
        if (targetCol1) {
          await targetCol1
            .doc(conflict.documentId)
            .update({
              data: latest.data
            });
        } else {
          console.warn('[conflict] 目标集合不存在，跳过 lastWriteWins 应用：', conflict.collection);
        }

        return {
          strategy: 'last_write_wins',
          appliedVersion: latest.version,
          appliedBy: latest.modifiedBy,
          message: '应用了最新版本的数据'
        };
      }

      throw new Error('未找到有效的数据版本');
    } catch (error) {
      console.error('最后写入获胜策略失败:', error);
      throw error;
    }
  }

  /**
   * 合并变更策略
   */
  async mergeChanges(conflict, resolution) {
    try {
      // 获取冲突的两个版本
      const versions = await this.versionCollection
        .where({
          collection: conflict.collection,
          documentId: conflict.documentId,
          version: _.in([conflict.version1, conflict.version2])
        })
        .get();

      if (versions.data.length !== 2) {
        throw new Error('无法获取冲突版本数据');
      }

      const [version1, version2] = versions.data.sort((a, b) => a.version - b.version);
      
      // 执行三路合并
      const mergedData = this.performThreeWayMerge(
        conflict.baseData,
        version1.data,
        version2.data
      );

      // 应用合并后的数据（集合缺失时静默跳过）
      const targetCol2 = this.safeCollection(conflict.collection);
      if (targetCol2) {
        await targetCol2
          .doc(conflict.documentId)
          .update({
            data: mergedData
          });
      } else {
        console.warn('[conflict] 目标集合不存在，跳过 mergeChanges 应用：', conflict.collection);
      }

      // 记录新版本
      const newVersion = await this.recordVersion(
        conflict.collection,
        conflict.documentId,
        mergedData,
        'system',
        'merge'
      );

      return {
        strategy: 'merge',
        mergedVersion: newVersion,
        mergedData: mergedData,
        message: '成功合并冲突数据'
      };
    } catch (error) {
      console.error('合并变更策略失败:', error);
      throw error;
    }
  }

  /**
   * 手动解决策略
   */
  async manualResolve(conflict, resolution) {
    try {
      if (!resolution.selectedData) {
        throw new Error('手动解决需要提供选择的数据');
      }

      // 应用用户选择的数据（集合缺失时静默跳过）
      const targetCol3 = this.safeCollection(conflict.collection);
      if (targetCol3) {
        await targetCol3
          .doc(conflict.documentId)
          .update({
            data: resolution.selectedData
          });
      } else {
        console.warn('[conflict] 目标集合不存在，跳过 manualResolve 应用：', conflict.collection);
      }

      // 记录新版本
      const newVersion = await this.recordVersion(
        conflict.collection,
        conflict.documentId,
        resolution.selectedData,
        resolution.resolvedBy || 'user',
        'manual'
      );

      return {
        strategy: 'manual',
        resolvedVersion: newVersion,
        resolvedBy: resolution.resolvedBy,
        message: '用户手动解决了冲突'
      };
    } catch (error) {
      console.error('手动解决策略失败:', error);
      throw error;
    }
  }

  /**
   * 基于优先级的解决策略
   */
  async priorityBasedResolve(conflict, resolution) {
    try {
      // 获取用户权限信息
      const userPriorities = await this.getUserPriorities(conflict.involvedUsers);
      
      // 找到优先级最高的用户
      const highestPriorityUser = userPriorities.reduce((prev, current) => 
        (prev.priority > current.priority) ? prev : current
      );

      // 获取该用户的版本数据
      const userVersion = await this.versionCollection
        .where({
          collection: conflict.collection,
          documentId: conflict.documentId,
          modifiedBy: highestPriorityUser.userId
        })
        .orderBy('version', 'desc')
        .limit(1)
        .get();

      if (userVersion.data.length === 0) {
        throw new Error('未找到优先级用户的数据版本');
      }

      const selectedVersion = userVersion.data[0];

      // 应用优先级用户的数据
      await db.collection(conflict.collection)
        .doc(conflict.documentId)
        .update({
          data: selectedVersion.data
        });

      return {
        strategy: 'priority_based',
        appliedVersion: selectedVersion.version,
        priorityUser: highestPriorityUser.userId,
        priority: highestPriorityUser.priority,
        message: `应用了优先级最高用户(${highestPriorityUser.userId})的数据`
      };
    } catch (error) {
      console.error('基于优先级的解决策略失败:', error);
      throw error;
    }
  }

  /**
   * 执行三路合并
   */
  performThreeWayMerge(base, version1, version2) {
    const merged = { ...base };

    // 简单的字段级合并逻辑
    Object.keys(version1).forEach(key => {
      if (version1[key] !== base[key]) {
        merged[key] = version1[key];
      }
    });

    Object.keys(version2).forEach(key => {
      if (version2[key] !== base[key]) {
        // 如果两个版本都修改了同一个字段，优先使用version2
        if (version1[key] !== base[key] && version1[key] !== version2[key]) {
          // 这里可以实现更复杂的合并逻辑
          merged[key] = version2[key];
        } else {
          merged[key] = version2[key];
        }
      }
    });

    return merged;
  }

  /**
   * 获取用户优先级
   */
  async getUserPriorities(userIds) {
    try {
      // 这里应该从家庭成员表获取用户角色和优先级
      const familyService = require('./family');
      const members = await familyService.getFamilyMembers();
      
      const priorities = {
        'owner': 100,
        'admin': 80,
        'member': 60,
        'viewer': 40
      };

      return userIds.map(userId => {
        const member = members.find(m => m.userId === userId);
        return {
          userId: userId,
          role: member ? member.role : 'member',
          priority: member ? priorities[member.role] : priorities['member']
        };
      });
    } catch (error) {
      console.error('获取用户优先级失败:', error);
      return userIds.map(userId => ({
        userId: userId,
        role: 'member',
        priority: 60
      }));
    }
  }

  /**
   * 获取冲突记录
   */
  async getConflictById(conflictId) {
    try {
      if (!this.conflictCollection) {
        console.warn('[conflict] data_conflicts 集合不存在，返回 null');
        return null;
      }
      const result = await this.conflictCollection
        .where({
          conflictId: conflictId
        })
        .get();

      return result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      console.error('获取冲突记录失败:', error);
      return null;
    }
  }

  /**
   * 获取待解决的冲突列表
   */
  async getPendingConflicts(userId) {
    try {
      if (!this.conflictCollection) {
        console.warn('[conflict] data_conflicts 集合不存在，返回空列表');
        // 可提示一次，但避免频繁弹 Toast
        return [];
      }
      const result = await this.conflictCollection
        .where({
          involvedUsers: _.in([userId]),
          status: 'pending'
        })
        .orderBy('createdAt', 'desc')
        .get();

      return result.data;
    } catch (error) {
      console.error('获取待解决冲突失败:', error);
      // 如果是数据库集合不存在错误，返回空数组并记录警告（静默降级）
      if (error.errCode === -502005) {
        console.warn('数据库集合不存在（data_conflicts），已降级为空列表');
        return [];
      }
      return [];
    }
  }

  /**
   * 清理过期锁
   */
  async cleanupExpiredLocks() {
    try {
      if (!this.lockCollection) {
        console.warn('[conflict] data_locks 集合不存在，跳过清理过期锁');
        return;
      }
      await this.lockCollection
        .where({
          status: 'active',
          expiresAt: _.lt(new Date())
        })
        .update({
          data: {
            status: 'expired',
            expiredAt: new Date()
          }
        });
    } catch (error) {
      console.error('清理过期锁失败:', error);
      // 如果是数据库集合不存在错误，记录警告但不抛出异常
      if (error.errCode === -502005) {
        console.warn('数据库集合不存在，请运行initDatabase云函数初始化');
      }
    }
  }

  /**
   * 计算数据校验和
   */
  calculateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }

  /**
   * 生成锁ID
   */
  generateLockId() {
    return 'lock_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 生成冲突ID
   */
  generateConflictId() {
    return 'conflict_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.heartbeats) {
      this.heartbeats.forEach(interval => {
        clearInterval(interval);
      });
      this.heartbeats.clear();
    }
  }
}

module.exports = new ConflictService();