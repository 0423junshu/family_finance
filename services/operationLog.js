/**
 * 操作日志服务
 * 记录和管理家庭成员的所有操作历史
 */

const db = wx.cloud.database();
const _ = db.command;

class OperationLogService {
  constructor() {
    this.logCollection = db.collection('operation_logs');
    this.batchLogs = []; // 批量日志缓存
    this.batchTimer = null;
    this.batchInterval = 5000; // 5秒批量提交
    this.maxBatchSize = 20;
    
    // 操作类型定义
    this.operationTypes = {
      // 数据操作
      'data.create': '创建数据',
      'data.update': '更新数据', 
      'data.delete': '删除数据',
      'data.import': '导入数据',
      'data.export': '导出数据',
      
      // 账户操作
      'account.create': '创建账户',
      'account.update': '更新账户',
      'account.delete': '删除账户',
      'account.transfer': '账户转账',
      
      // 交易操作
      'transaction.create': '添加交易',
      'transaction.update': '修改交易',
      'transaction.delete': '删除交易',
      'transaction.batch': '批量操作',
      
      // 预算操作
      'budget.create': '创建预算',
      'budget.update': '修改预算',
      'budget.delete': '删除预算',
      'budget.reset': '重置预算',
      
      // 分类操作
      'category.create': '创建分类',
      'category.update': '修改分类',
      'category.delete': '删除分类',
      'category.sort': '排序分类',
      
      // 家庭管理
      'family.create': '创建家庭',
      'family.join': '加入家庭',
      'family.leave': '离开家庭',
      'family.invite': '邀请成员',
      'family.remove': '移除成员',
      
      // 权限管理
      'permission.grant': '授予权限',
      'permission.revoke': '撤销权限',
      'permission.update': '更新权限',
      
      // 系统操作
      'system.login': '用户登录',
      'system.logout': '用户登出',
      'system.sync': '数据同步',
      'system.backup': '数据备份',
      'system.restore': '数据恢复'
    };
    
    // 操作级别
    this.operationLevels = {
      'info': '信息',
      'warning': '警告', 
      'error': '错误',
      'critical': '严重'
    };
    
    this.initBatchLogging();
  }

  /**
   * 初始化批量日志记录
   */
  initBatchLogging() {
    this.batchTimer = setInterval(() => {
      this.flushBatchLogs();
    }, this.batchInterval);
  }

  /**
   * 记录操作日志
   */
  async log(operationType, details = {}, options = {}) {
    try {
      const {
        userId = wx.getStorageSync('userInfo')?.userId,
        familyId = wx.getStorageSync('currentFamily')?.familyId,
        level = 'info',
        immediate = false,
        metadata = {}
      } = options;

      if (!userId) {
        console.warn('记录日志失败：缺少用户ID');
        return;
      }

      const logEntry = {
        id: this.generateLogId(),
        operationType: operationType,
        operationName: this.operationTypes[operationType] || operationType,
        userId: userId,
        familyId: familyId,
        level: level,
        details: details,
        metadata: {
          ...metadata,
          userAgent: this.getUserAgent(),
          timestamp: Date.now(),
          sessionId: this.getSessionId()
        },
        createdAt: new Date(),
        processed: false
      };

      if (immediate || level === 'critical' || level === 'error') {
        // 立即记录重要日志
        return await this.writeLogImmediately(logEntry);
      } else {
        // 加入批量队列
        return this.addToBatch(logEntry);
      }

    } catch (error) {
      console.error('记录操作日志失败:', error);
      // 日志记录失败不应该影响主要功能
    }
  }

  /**
   * 立即写入日志
   */
  async writeLogImmediately(logEntry) {
    try {
      const result = await this.logCollection.add({
        data: logEntry
      });

      return {
        success: true,
        logId: logEntry.id,
        _id: result._id
      };

    } catch (error) {
      console.error('立即写入日志失败:', error);
      // 失败时加入批量队列重试
      this.addToBatch(logEntry);
      throw error;
    }
  }

  /**
   * 添加到批量队列
   */
  addToBatch(logEntry) {
    this.batchLogs.push(logEntry);
    
    // 队列满时立即提交
    if (this.batchLogs.length >= this.maxBatchSize) {
      this.flushBatchLogs();
    }

    return {
      success: true,
      queued: true,
      logId: logEntry.id
    };
  }

  /**
   * 提交批量日志
   */
  async flushBatchLogs() {
    if (this.batchLogs.length === 0) return;

    const logsToProcess = this.batchLogs.splice(0, this.maxBatchSize);
    
    try {
      // 批量写入
      const promises = logsToProcess.map(log => 
        this.logCollection.add({ data: log })
      );

      await Promise.allSettled(promises);

    } catch (error) {
      console.error('批量提交日志失败:', error);
      
      // 失败的日志重新加入队列
      logsToProcess.forEach(log => {
        if (log.retryCount < 3) {
          log.retryCount = (log.retryCount || 0) + 1;
          this.batchLogs.unshift(log);
        }
      });
    }
  }

  /**
   * 查询操作日志
   */
  async queryLogs(filters = {}, options = {}) {
    try {
      const {
        familyId = wx.getStorageSync('currentFamily')?.familyId,
        userId,
        operationType,
        level,
        startTime,
        endTime,
        limit = 50,
        offset = 0,
        orderBy = 'createdAt',
        order = 'desc'
      } = filters;

      const {
        includeDetails = true,
        includeMetadata = false
      } = options;

      let query = this.logCollection.where({});

      // 构建查询条件
      const conditions = {};
      
      if (familyId) {
        conditions.familyId = familyId;
      }
      
      if (userId) {
        conditions.userId = userId;
      }
      
      if (operationType) {
        if (Array.isArray(operationType)) {
          conditions.operationType = _.in(operationType);
        } else {
          conditions.operationType = operationType;
        }
      }
      
      if (level) {
        if (Array.isArray(level)) {
          conditions.level = _.in(level);
        } else {
          conditions.level = level;
        }
      }
      
      if (startTime || endTime) {
        const timeCondition = {};
        if (startTime) {
          timeCondition[_.gte] = new Date(startTime);
        }
        if (endTime) {
          timeCondition[_.lte] = new Date(endTime);
        }
        conditions.createdAt = timeCondition;
      }

      // 应用查询条件
      if (Object.keys(conditions).length > 0) {
        query = query.where(conditions);
      }

      // 排序和分页
      query = query.orderBy(orderBy, order).skip(offset).limit(limit);

      const result = await query.get();
      
      // 处理返回数据
      const logs = result.data.map(log => {
        const processedLog = {
          ...log,
          operationName: this.operationTypes[log.operationType] || log.operationType,
          levelName: this.operationLevels[log.level] || log.level,
          formattedTime: this.formatTime(log.createdAt)
        };

        if (!includeDetails) {
          delete processedLog.details;
        }
        
        if (!includeMetadata) {
          delete processedLog.metadata;
        }

        return processedLog;
      });

      return {
        success: true,
        data: logs,
        total: result.data.length,
        hasMore: result.data.length === limit
      };

    } catch (error) {
      console.error('查询操作日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取日志统计信息
   */
  async getLogStats(filters = {}) {
    try {
      const {
        familyId = wx.getStorageSync('currentFamily')?.familyId,
        startTime,
        endTime
      } = filters;

      const conditions = {};
      
      if (familyId) {
        conditions.familyId = familyId;
      }
      
      if (startTime || endTime) {
        const timeCondition = {};
        if (startTime) {
          timeCondition[_.gte] = new Date(startTime);
        }
        if (endTime) {
          timeCondition[_.lte] = new Date(endTime);
        }
        conditions.createdAt = timeCondition;
      }

      // 获取总数统计
      const totalResult = await this.logCollection.where(conditions).count();
      
      // 按级别统计
      const levelStats = {};
      for (const level of Object.keys(this.operationLevels)) {
        const levelResult = await this.logCollection
          .where({
            ...conditions,
            level: level
          })
          .count();
        levelStats[level] = levelResult.total;
      }

      // 按操作类型统计（取前10）
      const typeStats = await this.getTopOperationTypes(conditions, 10);

      // 按用户统计（取前10）
      const userStats = await this.getTopUsers(conditions, 10);

      return {
        success: true,
        stats: {
          total: totalResult.total,
          byLevel: levelStats,
          byType: typeStats,
          byUser: userStats,
          period: {
            startTime: startTime,
            endTime: endTime
          }
        }
      };

    } catch (error) {
      console.error('获取日志统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取热门操作类型
   */
  async getTopOperationTypes(conditions, limit = 10) {
    try {
      // 由于小程序云数据库不支持聚合查询，这里使用简化实现
      const result = await this.logCollection
        .where(conditions)
        .orderBy('createdAt', 'desc')
        .limit(1000) // 取最近1000条记录进行统计
        .get();

      const typeCount = {};
      result.data.forEach(log => {
        const type = log.operationType;
        typeCount[type] = (typeCount[type] || 0) + 1;
      });

      const sortedTypes = Object.entries(typeCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([type, count]) => ({
          operationType: type,
          operationName: this.operationTypes[type] || type,
          count: count
        }));

      return sortedTypes;

    } catch (error) {
      console.error('获取热门操作类型失败:', error);
      return [];
    }
  }

  /**
   * 获取活跃用户
   */
  async getTopUsers(conditions, limit = 10) {
    try {
      const result = await this.logCollection
        .where(conditions)
        .orderBy('createdAt', 'desc')
        .limit(1000)
        .get();

      const userCount = {};
      result.data.forEach(log => {
        const userId = log.userId;
        userCount[userId] = (userCount[userId] || 0) + 1;
      });

      const sortedUsers = Object.entries(userCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([userId, count]) => ({
          userId: userId,
          count: count
        }));

      return sortedUsers;

    } catch (error) {
      console.error('获取活跃用户失败:', error);
      return [];
    }
  }

  /**
   * 删除过期日志
   */
  async cleanupExpiredLogs(retentionDays = 90) {
    try {
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() - retentionDays);

      const result = await this.logCollection
        .where({
          createdAt: _.lt(expireDate)
        })
        .remove();

      return {
        success: true,
        deletedCount: result.stats.removed
      };

    } catch (error) {
      console.error('清理过期日志失败:', error);
      throw error;
    }
  }

  /**
   * 导出日志
   */
  async exportLogs(filters = {}, format = 'json') {
    try {
      const result = await this.queryLogs(filters, {
        includeDetails: true,
        includeMetadata: true
      });

      if (!result.success) {
        throw new Error('查询日志失败');
      }

      let exportData;
      switch (format.toLowerCase()) {
        case 'csv':
          exportData = this.convertToCSV(result.data);
          break;
        case 'json':
        default:
          exportData = JSON.stringify(result.data, null, 2);
          break;
      }

      return {
        success: true,
        data: exportData,
        format: format,
        count: result.data.length
      };

    } catch (error) {
      console.error('导出日志失败:', error);
      throw error;
    }
  }

  /**
   * 转换为CSV格式
   */
  convertToCSV(logs) {
    if (logs.length === 0) return '';

    const headers = [
      '时间', '操作类型', '操作名称', '用户ID', '级别', '详情'
    ];

    const rows = logs.map(log => [
      log.formattedTime,
      log.operationType,
      log.operationName,
      log.userId,
      log.levelName,
      JSON.stringify(log.details || {})
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * 生成日志ID
   */
  generateLogId() {
    return 'log_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 获取用户代理信息
   */
  getUserAgent() {
    try {
      const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : wx.getSystemInfoSync();
      const appInfo = wx.getAppBaseInfo ? wx.getAppBaseInfo() : wx.getSystemInfoSync();
      return `${deviceInfo.platform} ${deviceInfo.system} WeChat/${appInfo.version}`;
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * 获取会话ID
   */
  getSessionId() {
    let sessionId = wx.getStorageSync('sessionId');
    if (!sessionId) {
      sessionId = 'session_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
      wx.setStorageSync('sessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * 格式化时间
   */
  formatTime(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hour = d.getHours().toString().padStart(2, '0');
    const minute = d.getMinutes().toString().padStart(2, '0');
    const second = d.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    // 提交剩余的批量日志
    this.flushBatchLogs();
  }
}

module.exports = new OperationLogService();