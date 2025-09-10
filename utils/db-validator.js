// 数据库集合验证工具
const db = wx.cloud.database();

class DBValidator {
  constructor() {
    this.requiredCollections = [
      'families',
      'family_members',
      'family_invites',
      'transactions',
      'categories',
      'accounts',
      'data_conflicts',
      'data_locks',
      'data_versions'
    ];
  }

  // 验证所有必要集合是否存在
  async validateAllCollections() {
    const results = [];
    
    for (const collection of this.requiredCollections) {
      const result = await this.checkCollectionExists(collection);
      results.push({
        collection: collection,
        exists: result.exists,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  // 检查单个集合是否存在
  async checkCollectionExists(collectionName) {
    try {
      // 尝试执行一个简单的查询
      const result = await db.collection(collectionName).limit(1).get();
      return {
        exists: true,
        count: result.data.length,
        message: `集合 ${collectionName} 存在`
      };
    } catch (error) {
      if (error.errCode === -502005) {
        // 集合不存在错误
        return {
          exists: false,
          error: `集合 ${collectionName} 不存在 (错误码: ${error.errCode})`,
          message: '请运行initDatabase云函数初始化数据库'
        };
      } else {
        // 其他错误
        return {
          exists: false,
          error: `检查集合 ${collectionName} 时出错: ${error.message}`,
          errCode: error.errCode
        };
      }
    }
  }

  // 获取集合统计信息
  async getCollectionStats(collectionName) {
    try {
      const countResult = await db.collection(collectionName).count();
      const sampleResult = await db.collection(collectionName)
        .orderBy('_createTime', 'desc')
        .limit(5)
        .get();

      return {
        collection: collectionName,
        total: countResult.total,
        sample: sampleResult.data,
        lastUpdated: sampleResult.data.length > 0 ? 
          sampleResult.data[0]._createTime : null
      };
    } catch (error) {
      return {
        collection: collectionName,
        error: error.message,
        errCode: error.errCode
      };
    }
  }

  // 验证冲突管理相关集合
  async validateConflictCollections() {
    const conflictCollections = [
      'data_conflicts',
      'data_locks',
      'data_versions'
    ];

    const results = [];
    
    for (const collection of conflictCollections) {
      const result = await this.checkCollectionExists(collection);
      results.push({
        collection: collection,
        status: result.exists ? '正常' : '缺失',
        details: result.exists ? '集合已存在' : result.error
      });
    }

    return results;
  }

  // 运行初始化数据库云函数
  async runInitDatabase() {
    try {
      console.log('正在运行数据库初始化...');
      
      const result = await wx.cloud.callFunction({
        name: 'initDatabase',
        data: {}
      });

      console.log('数据库初始化结果:', result);
      return {
        success: true,
        result: result.result,
        message: '数据库初始化云函数执行成功'
      };
    } catch (error) {
      console.error('运行initDatabase失败:', error);
      return {
        success: false,
        error: error.message,
        errCode: error.errCode,
        message: '请确保initDatabase云函数已部署且配置正确'
      };
    }
  }

  // 生成验证报告
  async generateValidationReport() {
    const collectionResults = await this.validateAllCollections();
    const conflictResults = await this.validateConflictCollections();
    
    const missingCollections = collectionResults.filter(r => !r.exists);
    const existingCollections = collectionResults.filter(r => r.exists);

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalCollections: this.requiredCollections.length,
        existing: existingCollections.length,
        missing: missingCollections.length,
        status: missingCollections.length === 0 ? '正常' : '异常'
      },
      details: {
        collections: collectionResults,
        conflictManagement: conflictResults
      },
      recommendations: missingCollections.length > 0 ? [
        '请运行 initDatabase 云函数初始化缺失的数据库集合',
        '检查云函数部署状态和权限配置',
        '确认数据库环境设置正确'
      ] : ['所有必要集合都已正确初始化']
    };
  }

  // 检查云函数状态
  async checkCloudFunctionStatus(functionName) {
    try {
      // 尝试调用云函数来检查状态
      const result = await wx.cloud.callFunction({
        name: functionName,
        data: { action: 'ping' }
      });

      return {
        available: true,
        response: result,
        message: `云函数 ${functionName} 可用`
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        errCode: error.errCode,
        message: `云函数 ${functionName} 不可用或未部署`
      };
    }
  }
}

// 创建单例实例
const dbValidator = new DBValidator();

// 导出供其他模块使用
module.exports = dbValidator;