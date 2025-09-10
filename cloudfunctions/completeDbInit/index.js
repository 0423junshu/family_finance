// cloudfunctions/completeDbInit/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 所有需要的集合定义
const COLLECTIONS = {
  // 核心业务集合
  families: {
    name: 'families',
    description: '家庭信息',
    sampleData: {
      name: '示例家庭',
      createdBy: 'system',
      createdAt: new Date(),
      members: [],
      settings: {
        currency: 'CNY',
        timezone: 'Asia/Shanghai'
      }
    }
  },
  
  family_members: {
    name: 'family_members',
    description: '家庭成员',
    sampleData: {
      familyId: 'temp',
      userId: 'system',
      role: 'admin',
      joinedAt: new Date(),
      permissions: ['read', 'write', 'admin']
    }
  },
  
  transactions: {
    name: 'transactions',
    description: '交易记录',
    sampleData: {
      amount: 0,
      type: 'expense',
      category: '其他',
      description: '示例交易',
      date: new Date(),
      userId: 'system',
      familyId: 'temp',
      account: 'cash'
    }
  },
  
  categories: {
    name: 'categories',
    description: '分类管理',
    sampleData: {
      name: '其他',
      type: 'expense',
      icon: 'other',
      color: '#999999',
      isDefault: true,
      userId: 'system'
    }
  },
  
  accounts: {
    name: 'accounts',
    description: '账户管理',
    sampleData: {
      name: '现金',
      type: 'cash',
      balance: 0,
      userId: 'system',
      familyId: 'temp',
      isDefault: true
    }
  },
  
  // 协作功能集合
  family_invites: {
    name: 'family_invites',
    description: '家庭邀请',
    sampleData: {
      familyId: 'temp',
      inviterUserId: 'system',
      inviteeUserId: 'temp',
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  },
  
  data_conflicts: {
    name: 'data_conflicts',
    description: '数据冲突',
    sampleData: {
      type: 'transaction',
      recordId: 'temp',
      conflictData: {},
      status: 'pending',
      createdAt: new Date(),
      resolvedAt: null,
      resolvedBy: null
    }
  },
  
  data_locks: {
    name: 'data_locks',
    description: '数据锁定',
    sampleData: {
      resourceType: 'transaction',
      resourceId: 'temp',
      lockedBy: 'system',
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    }
  },
  
  data_versions: {
    name: 'data_versions',
    description: '数据版本',
    sampleData: {
      recordType: 'transaction',
      recordId: 'temp',
      version: 1,
      data: {},
      createdBy: 'system',
      createdAt: new Date()
    }
  },
  
  // 日志和统计集合
  operation_logs: {
    name: 'operation_logs',
    description: '操作日志',
    sampleData: {
      action: 'init',
      userId: 'system',
      timestamp: new Date(),
      details: '系统初始化',
      resourceType: 'system',
      resourceId: 'init'
    }
  },
  
  user_statistics: {
    name: 'user_statistics',
    description: '用户统计',
    sampleData: {
      userId: 'system',
      totalIncome: 0,
      totalExpense: 0,
      transactionCount: 0,
      lastUpdated: new Date(),
      monthlyStats: {}
    }
  },
  
  system_logs: {
    name: 'system_logs',
    description: '系统日志',
    sampleData: {
      level: 'info',
      message: '系统初始化完成',
      timestamp: new Date(),
      source: 'completeDbInit',
      details: {}
    }
  },
  
  // 扩展功能集合
  budgets: {
    name: 'budgets',
    description: '预算管理',
    sampleData: {
      name: '月度预算',
      amount: 0,
      period: 'monthly',
      category: '全部',
      userId: 'system',
      familyId: 'temp',
      startDate: new Date(),
      endDate: new Date()
    }
  },
  
  templates: {
    name: 'templates',
    description: '交易模板',
    sampleData: {
      name: '示例模板',
      type: 'expense',
      category: '其他',
      amount: 0,
      description: '模板描述',
      userId: 'system',
      isPublic: false
    }
  },
  
  sync_records: {
    name: 'sync_records',
    description: '同步记录',
    sampleData: {
      userId: 'system',
      familyId: 'temp',
      lastSyncTime: new Date(),
      syncStatus: 'success',
      recordCount: 0,
      errors: []
    }
  },
  
  conflict_resolutions: {
    name: 'conflict_resolutions',
    description: '冲突解决',
    sampleData: {
      conflictId: 'temp',
      resolution: 'auto',
      resolvedBy: 'system',
      resolvedAt: new Date(),
      finalData: {},
      notes: '自动解决'
    }
  }
};

exports.main = async (event, context) => {
  console.log('[COMPLETE-DB-INIT] 开始完整数据库初始化');
  
  const results = {
    success: true,
    message: '数据库初始化完成',
    collections: {},
    errors: [],
    summary: {
      total: 0,
      created: 0,
      existing: 0,
      failed: 0
    }
  };
  
  try {
    // 检查和创建所有集合
    for (const [key, config] of Object.entries(COLLECTIONS)) {
      results.summary.total++;
      
      try {
        // 检查集合是否存在
        await db.collection(config.name).limit(1).get();
        
        results.collections[config.name] = {
          status: 'existing',
          message: '集合已存在'
        };
        results.summary.existing++;
        
      } catch (error) {
        if (error.errCode === -502005) {
          // 集合不存在，创建它
          try {
            const createResult = await createCollection(config);
            results.collections[config.name] = {
              status: 'created',
              message: '集合创建成功',
              docId: createResult._id
            };
            results.summary.created++;
            
          } catch (createError) {
            console.error(`[COMPLETE-DB-INIT] 创建集合 ${config.name} 失败:`, createError);
            results.collections[config.name] = {
              status: 'failed',
              message: `创建失败: ${createError.message}`
            };
            results.errors.push(`${config.name}: ${createError.message}`);
            results.summary.failed++;
          }
        } else {
          console.error(`[COMPLETE-DB-INIT] 检查集合 ${config.name} 失败:`, error);
          results.collections[config.name] = {
            status: 'error',
            message: `检查失败: ${error.message}`
          };
          results.errors.push(`${config.name}: ${error.message}`);
          results.summary.failed++;
        }
      }
    }
    
    // 记录初始化日志
    try {
      await db.collection('system_logs').add({
        data: {
          level: 'info',
          message: '完整数据库初始化完成',
          timestamp: new Date(),
          source: 'completeDbInit',
          details: results.summary
        }
      });
    } catch (logError) {
      console.warn('[COMPLETE-DB-INIT] 记录日志失败:', logError);
    }
    
    // 设置最终状态
    if (results.summary.failed > 0) {
      results.success = false;
      results.message = `部分集合创建失败 (${results.summary.failed}/${results.summary.total})`;
    }
    
    console.log('[COMPLETE-DB-INIT] 初始化完成:', results.summary);
    return results;
    
  } catch (error) {
    console.error('[COMPLETE-DB-INIT] 初始化失败:', error);
    return {
      success: false,
      message: `初始化失败: ${error.message}`,
      error: error.message,
      collections: results.collections,
      summary: results.summary
    };
  }
};

// 创建集合的辅助函数
async function createCollection(config) {
  console.log(`[COMPLETE-DB-INIT] 创建集合: ${config.name}`);
  
  // 添加示例文档来创建集合
  const result = await db.collection(config.name).add({
    data: {
      ...config.sampleData,
      _temp: true,
      _created: new Date(),
      _purpose: `初始化集合 ${config.name}`
    }
  });
  
  // 立即删除示例文档
  try {
    await db.collection(config.name).doc(result._id).remove();
  } catch (removeError) {
    console.warn(`[COMPLETE-DB-INIT] 删除示例文档失败: ${removeError.message}`);
  }
  
  return result;
}