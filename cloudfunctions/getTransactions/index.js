// cloudfunctions/getTransactions/index.js
/**
 * 获取交易记录云函数（修复版）
 * 增强了权限验证、错误处理和数据安全性
 */

const cloud = require('wx-server-sdk');
const { validateUser } = require('../middleware/auth');
const { validateFamilyAccess, getDefaultFamilyId } = require('../middleware/family-auth');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { OPENID, CLIENTIP } = cloud.getWXContext();
  
  console.log('获取交易记录请求:', {
    openid: OPENID,
    clientIP: CLIENTIP,
    params: event
  });

  try {
    // 1. 验证用户身份
    const user = await validateUser(OPENID);
    console.log('用户验证成功:', user._id);

    // 2. 获取家庭ID
    let familyId = event.familyId;
    if (!familyId) {
      familyId = await getDefaultFamilyId(user._id);
    }

    // 3. 验证家庭访问权限
    const familyAccess = await validateFamilyAccess(user._id, familyId);
    
    // 检查查看交易记录权限
    if (!familyAccess.permissions.includes('view_transactions')) {
      throw new Error('权限不足：无法查看交易记录');
    }

    console.log('家庭权限验证成功:', {
      familyId: familyId,
      role: familyAccess.role,
      permissions: familyAccess.permissions
    });

    // 4. 构建查询条件
    const queryConditions = buildQueryConditions(event, familyId);
    console.log('查询条件:', queryConditions);

    // 5. 执行查询
    const result = await executeQuery(queryConditions, event);
    
    // 6. 处理返回数据
    const processedData = processTransactionData(result.data, familyAccess);

    console.log('查询成功:', {
      total: result.total,
      returned: processedData.length
    });

    return {
      success: true,
      data: {
        list: processedData,
        total: result.total,
        page: event.page || 1,
        pageSize: event.pageSize || 20,
        hasMore: processedData.length === (event.pageSize || 20)
      },
      message: '获取交易记录成功'
    };

  } catch (error) {
    console.error('获取交易记录失败:', error);
    
    // 错误分类处理
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = '获取交易记录失败';

    if (error.message.includes('用户')) {
      errorCode = 'USER_ERROR';
      errorMessage = error.message;
    } else if (error.message.includes('权限')) {
      errorCode = 'PERMISSION_ERROR';
      errorMessage = error.message;
    } else if (error.message.includes('家庭')) {
      errorCode = 'FAMILY_ERROR';
      errorMessage = error.message;
    } else if (error.message.includes('参数')) {
      errorCode = 'PARAM_ERROR';
      errorMessage = error.message;
    } else if (error.message.includes('数据库')) {
      errorCode = 'DATABASE_ERROR';
      errorMessage = '数据库查询失败，请稍后重试';
    }

    return {
      success: false,
      message: errorMessage,
      code: errorCode,
      data: {
        list: [],
        total: 0,
        page: event.page || 1,
        pageSize: event.pageSize || 20,
        hasMore: false
      }
    };
  }
};

/**
 * 构建查询条件
 * @param {Object} event 事件参数
 * @param {string} familyId 家庭ID
 * @returns {Object} 查询条件
 */
function buildQueryConditions(event, familyId) {
  const conditions = {
    familyId: familyId
  };

  // 日期范围过滤
  if (event.startDate || event.endDate) {
    conditions.date = {};
    
    if (event.startDate) {
      conditions.date[_.gte] = event.startDate;
    }
    
    if (event.endDate) {
      // 确保包含结束日期的全天
      const endDate = new Date(event.endDate);
      endDate.setHours(23, 59, 59, 999);
      conditions.date[_.lte] = endDate.toISOString();
    }
  }

  // 交易类型过滤
  if (event.type && ['income', 'expense', 'transfer'].includes(event.type)) {
    conditions.type = event.type;
  }

  // 分类过滤
  if (event.categoryId) {
    conditions.categoryId = event.categoryId;
  }

  // 账户过滤
  if (event.accountId) {
    conditions.accountId = event.accountId;
  }

  // 金额范围过滤
  if (event.minAmount !== undefined || event.maxAmount !== undefined) {
    conditions.amount = {};
    
    if (event.minAmount !== undefined) {
      conditions.amount[_.gte] = Number(event.minAmount);
    }
    
    if (event.maxAmount !== undefined) {
      conditions.amount[_.lte] = Number(event.maxAmount);
    }
  }

  // 标签过滤
  if (event.tags && Array.isArray(event.tags) && event.tags.length > 0) {
    conditions.tags = _.in(event.tags);
  }

  // 关键词搜索
  if (event.keyword) {
    conditions.description = new RegExp(event.keyword, 'i');
  }

  return conditions;
}

/**
 * 执行查询
 * @param {Object} conditions 查询条件
 * @param {Object} event 事件参数
 * @returns {Promise<Object>} 查询结果
 */
async function executeQuery(conditions, event) {
  const page = Math.max(1, Number(event.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(event.pageSize) || 20));
  const skip = (page - 1) * pageSize;

  // 排序字段
  const orderBy = event.orderBy || 'date';
  const order = event.order === 'asc' ? 'asc' : 'desc';

  try {
    // 构建查询
    let query = db.collection('transactions').where(conditions);

    // 添加排序
    if (orderBy === 'date') {
      query = query.orderBy('date', order).orderBy('createdAt', order);
    } else if (orderBy === 'amount') {
      query = query.orderBy('amount', order).orderBy('date', 'desc');
    } else {
      query = query.orderBy('createdAt', order);
    }

    // 分页查询
    const result = await query.skip(skip).limit(pageSize).get();

    // 获取总数（仅在第一页时查询，提高性能）
    let total = 0;
    if (page === 1) {
      const countResult = await db.collection('transactions').where(conditions).count();
      total = countResult.total;
    } else {
      // 对于非第一页，使用估算值
      total = skip + result.data.length + (result.data.length === pageSize ? pageSize : 0);
    }

    return {
      data: result.data,
      total: total
    };

  } catch (error) {
    console.error('数据库查询失败:', error);
    throw new Error('数据库查询失败：' + error.message);
  }
}

/**
 * 处理交易数据
 * @param {Array} transactions 原始交易数据
 * @param {Object} familyAccess 家庭访问权限
 * @returns {Array} 处理后的交易数据
 */
function processTransactionData(transactions, familyAccess) {
  return transactions.map(transaction => {
    // 基础数据清理
    const processed = {
      _id: transaction._id,
      type: transaction.type,
      amount: transaction.amount || 0,
      description: transaction.description || '',
      date: transaction.date,
      categoryId: transaction.categoryId,
      accountId: transaction.accountId,
      tags: transaction.tags || [],
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    };

    // 根据权限决定是否显示敏感信息
    if (familyAccess.permissions.includes('view_transaction_details')) {
      processed.location = transaction.location;
      processed.images = transaction.images || [];
      processed.notes = transaction.notes;
    }

    // 管理员可以看到创建者信息
    if (familyAccess.role === 'admin') {
      processed.createdBy = transaction.createdBy;
      processed.updatedBy = transaction.updatedBy;
    }

    // 数据格式化
    if (processed.date) {
      processed.dateFormatted = formatDate(processed.date);
    }

    if (processed.amount) {
      processed.amountFormatted = formatAmount(processed.amount);
    }

    return processed;
  });
}

/**
 * 格式化日期
 * @param {string|Date} date 日期
 * @returns {string} 格式化后的日期
 */
function formatDate(date) {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
}

/**
 * 格式化金额
 * @param {number} amount 金额
 * @returns {string} 格式化后的金额
 */
function formatAmount(amount) {
  try {
    if (!amount || isNaN(amount)) return '0.00';
    
    // 假设金额以分为单位存储
    const yuan = amount / 100;
    return yuan.toFixed(2);
  } catch (error) {
    return '0.00';
  }
}