/**
 * 操作日志服务
 * 记录和管理家庭成员的所有操作历史
 */

const db = wx.cloud && wx.cloud.database ? wx.cloud.database() : null;
const _ = db ? db.command : {};

class OperationLogService {
  constructor() {
    // 集合安全获取（容错：集合不存在/云未初始化时不抛错）
    this.logCollection = this.safeCollection('operation_logs');
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

  // 安全获取集合
  safeCollection(name) {
    try {
      if (!db || !db.collection) {
        console.warn('[operationLog] wx.cloud 未初始化，跳过集合访问：', name);
        return null;
      }
      return db.collection(name);
    } catch (e) {
      console.warn('[operationLog] 获取集合失败，可能未创建：', name, e);
      return null;
    }
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
      if (!this.logCollection) {
        console.warn('[operationLog] 集合缺失，跳过写入（立即）');
        return { success: false, skipped: true };
      }
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
    // 若集合缺失，直接标记已队列但不写入，避免异常
    if (!this.logCollection) {
      return { success: false, skipped: true, logId: logEntry.id };
    }
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
    if (!this.logCollection) {
      console.warn('[operationLog] 集合缺失，清空临时队列避免堆积');
      this.batchLogs = [];
      return;
    }

    const logsToProcess = this.batchLogs.splice(0, this.maxBatchSize);
    
    try {
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
   * 页面兼容：获取日志（对齐 pages/operation-logs 调用）
   * params: { page, pageSize, keyword, type, level, userId, timeRange, sortOrder, showMemberActivity, activeTab }
   * 返回: { data, hasMore }
   */
  async getLogs(params = {}) {
    const {
      page = 0,
      pageSize = 20,
      keyword = '',
      type = '',
      level = '',
      userId = '',
      timeRange = '',
      sortOrder = 'desc',
    } = params;

    // 解析时间范围
    let startTime, endTime;
    const now = Date.now();
    if (timeRange === 'today') {
      const d = new Date(); d.setHours(0,0,0,0); startTime = d.getTime(); endTime = now;
    } else if (timeRange === 'yesterday') {
      const d1 = new Date(); d1.setHours(0,0,0,0); const d0 = new Date(d1.getTime() - 24*60*60*1000);
      startTime = d0.getTime(); endTime = d1.getTime();
    } else if (timeRange === 'week') {
      startTime = now - 7*24*60*60*1000; endTime = now;
    } else if (timeRange === 'month') {
      startTime = now - 30*24*60*60*1000; endTime = now;
    }

    // 基础过滤
    const filters = {
      userId: userId || undefined,
      operationType: type || undefined,
      level: level || undefined,
      startTime,
      endTime,
      limit: pageSize,
      offset: page * pageSize,
      orderBy: 'createdAt',
      order: sortOrder === 'asc' ? 'asc' : 'desc'
    };

    // 查询
    const res = await this.queryLogs(filters, { includeDetails: true, includeMetadata: false });

    // 关键字过滤（云端不一定支持模糊检索，前端兜底）
    let data = res.data || [];
    if (keyword) {
      const kw = String(keyword).toLowerCase();
      data = data.filter(log => {
        const txt = `${log.operationName||''} ${log.operationType||''} ${log.levelName||''} ${JSON.stringify(log.details||{})}`.toLowerCase();
        return txt.includes(kw);
      });
    }

    return {
      data,
      hasMore: res.hasMore === true
    };
  }

  /**
   * 查询操作日志
   */
  async queryLogs(filters = {}, options = {}) {
    try {
      if (!this.logCollection) {
        console.warn('[operationLog] 集合不存在，返回空日志');
        return { success: true, data: [], total: 0, hasMore: false };
      }
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

      let result;
      try {
        result = await query.get();
      } catch (e) {
        console.warn('[operationLog] 查询失败，可能集合未创建：', e);
        return { success: true, data: [], total: 0, hasMore: false };
      }
      
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
   * 页面兼容：获取统计（对齐 pages/operation-logs 调用）
   * 返回: 直接返回汇总对象，页面用 setData({ stats })
   */
  async getStats(params = {}) {
    const result = await this.getLogStats(params);
    if (!result || !result.success) {
      return { total: 0, todayCount: 0, activeUsers: 0, byLevel: [] };
    }

    const { stats } = result;
    // 组装页面期望的结构
    const byLevelArr = Object.keys(stats.byLevel || {}).map(k => ({
      level: k,
      name: this.operationLevels[k] || k,
      count: stats.byLevel[k],
      theme: k === 'error' ? 'danger' : (k === 'warning' ? 'warning' : (k === 'critical' ? 'danger' : 'default'))
    }));

    // todayCount/activeUsers 简化估算：再次查询近一天与用户数
    let todayCount = 0;
    try {
      const d = new Date(); d.setHours(0,0,0,0);
      const todayRes = await this.queryLogs({ startTime: d.getTime(), endTime: Date.now(), limit: 1000 }, { includeDetails: false, includeMetadata: false });
      todayCount = todayRes.data?.length || 0;
    } catch(_) {}

    let activeUsers = 0;
    try {
      const users = await this.getTopUsers({}, 1000);
      activeUsers = users.length;
    } catch(_) {}

    return {
      total: stats.total || 0,
      todayCount,
      activeUsers,
      byLevel: byLevelArr
    };
  }

  /**
   * 获取日志统计信息
   */
  async getLogStats(filters = {}) {
    try {
      if (!this.logCollection) {
        console.warn('[operationLog] 集合不存在，返回默认统计');
        return { success: true, stats: { total: 0, byLevel: {}, byType: [], byUser: [], period: {} } };
      }
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
      let totalResult = { total: 0 };
      try {
        totalResult = await this.logCollection.where(conditions).count();
      } catch (e) {
        console.warn('[operationLog] 统计 count 失败：', e);
        return { success: true, stats: { total: 0, byLevel: {}, byType: [], byUser: [], period: {} } };
      }
      
      // 按级别统计
      const levelStats = {};
      for (const level of Object.keys(this.operationLevels)) {
        try {
          const levelResult = await this.logCollection
            .where({
              ...conditions,
              level: level
            })
            .count();
          levelStats[level] = levelResult.total;
        } catch (e) {
          levelStats[level] = 0;
        }
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
      if (!this.logCollection) return [];
      let result;
      try {
        result = await this.logCollection
          .where(conditions)
          .orderBy('createdAt', 'desc')
          .limit(1000)
          .get();
      } catch (e) {
        console.warn('[operationLog] getTopOperationTypes 查询失败：', e);
        return [];
      }

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
      if (!this.logCollection) return [];
      let result;
      try {
        result = await this.logCollection
          .where(conditions)
          .orderBy('createdAt', 'desc')
          .limit(1000)
          .get();
      } catch (e) {
        console.warn('[operationLog] getTopUsers 查询失败：', e);
        return [];
      }

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
   * 页面兼容：清理日志（对齐 clearLogs 调用）
   * params.keepDays: 保留天数
   */
  async clearLogs(params = {}) {
    const keep = typeof params.keepDays === 'number' ? params.keepDays : 30;
    return this.cleanupExpiredLogs(keep);
  }

  /**
   * 删除过期日志
   */
  async cleanupExpiredLogs(retentionDays = 90) {
    try {
      if (!this.logCollection) {
        console.warn('[operationLog] 集合不存在，跳过清理');
        return { success: true, deletedCount: 0 };
      }
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