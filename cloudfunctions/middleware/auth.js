// cloudfunctions/middleware/auth.js
/**
 * 用户身份验证中间件
 * 提供统一的用户身份验证和权限检查
 */

const cloud = require('wx-server-sdk');

/**
 * 验证用户身份
 * @param {string} openid 用户openid
 * @returns {Promise<Object>} 用户信息
 */
async function validateUser(openid) {
  if (!openid) {
    throw new Error('用户身份验证失败：缺少openid');
  }

  const db = cloud.database();
  
  try {
    const userResult = await db.collection('users').where({
      openid: openid
    }).get();

    if (userResult.data.length === 0) {
      throw new Error('用户不存在，请先注册');
    }

    const user = userResult.data[0];

    // 检查用户状态
    if (user.status === 'disabled') {
      throw new Error('用户账户已被禁用，请联系管理员');
    }

    if (user.status === 'pending') {
      throw new Error('用户账户待审核，请稍后再试');
    }

    if (user.status !== 'active') {
      throw new Error('用户账户状态异常');
    }

    // 检查用户是否有基本权限
    if (!user.permissions || !Array.isArray(user.permissions)) {
      // 为老用户设置默认权限
      const defaultPermissions = [
        'view_transactions',
        'create_transaction',
        'edit_transaction',
        'delete_transaction',
        'view_reports',
        'manage_categories',
        'manage_accounts'
      ];

      await db.collection('users').doc(user._id).update({
        data: {
          permissions: defaultPermissions,
          updatedAt: new Date()
        }
      });

      user.permissions = defaultPermissions;
    }

    // 更新最后登录时间
    await db.collection('users').doc(user._id).update({
      data: {
        lastLoginAt: new Date(),
        lastLoginIP: cloud.getWXContext().CLIENTIP || 'unknown'
      }
    });

    return user;
  } catch (error) {
    console.error('用户身份验证失败:', error);
    
    if (error.message.includes('用户')) {
      throw error;
    } else {
      throw new Error('用户身份验证失败，请重试');
    }
  }
}

/**
 * 检查用户权限
 * @param {Object} user 用户信息
 * @param {string|Array} requiredPermissions 需要的权限
 * @returns {boolean} 是否有权限
 */
function checkPermission(user, requiredPermissions) {
  if (!user || !user.permissions) {
    return false;
  }

  const userPermissions = user.permissions;
  
  // 如果是字符串，转换为数组
  const permissions = Array.isArray(requiredPermissions) 
    ? requiredPermissions 
    : [requiredPermissions];

  // 检查是否有所有需要的权限
  return permissions.every(permission => userPermissions.includes(permission));
}

/**
 * 权限验证装饰器
 * @param {string|Array} requiredPermissions 需要的权限
 * @returns {Function} 装饰器函数
 */
function requirePermissions(requiredPermissions) {
  return function(target, propertyName, descriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args) {
      const [event, context] = args;
      const { OPENID } = cloud.getWXContext();

      try {
        // 验证用户身份
        const user = await validateUser(OPENID);

        // 检查权限
        if (!checkPermission(user, requiredPermissions)) {
          throw new Error(`权限不足，需要权限: ${Array.isArray(requiredPermissions) ? requiredPermissions.join(', ') : requiredPermissions}`);
        }

        // 将用户信息添加到事件中
        event._user = user;

        // 调用原方法
        return await method.apply(this, args);
      } catch (error) {
        console.error('权限验证失败:', error);
        return {
          success: false,
          message: error.message,
          code: 'PERMISSION_ERROR'
        };
      }
    };

    return descriptor;
  };
}

/**
 * 创建权限验证中间件
 * @param {string|Array} requiredPermissions 需要的权限
 * @returns {Function} 中间件函数
 */
function createAuthMiddleware(requiredPermissions) {
  return async (event, context, next) => {
    const { OPENID } = cloud.getWXContext();

    try {
      // 验证用户身份
      const user = await validateUser(OPENID);

      // 检查权限
      if (requiredPermissions && !checkPermission(user, requiredPermissions)) {
        throw new Error(`权限不足，需要权限: ${Array.isArray(requiredPermissions) ? requiredPermissions.join(', ') : requiredPermissions}`);
      }

      // 将用户信息添加到事件中
      event._user = user;

      // 继续执行
      return await next();
    } catch (error) {
      console.error('权限验证失败:', error);
      return {
        success: false,
        message: error.message,
        code: 'PERMISSION_ERROR'
      };
    }
  };
}

/**
 * 管理员权限检查
 * @param {Object} user 用户信息
 * @returns {boolean} 是否为管理员
 */
function isAdmin(user) {
  return user && user.role === 'admin';
}

/**
 * 家庭管理员权限检查
 * @param {Object} user 用户信息
 * @param {string} familyId 家庭ID
 * @returns {Promise<boolean>} 是否为家庭管理员
 */
async function isFamilyAdmin(user, familyId) {
  if (!user || !familyId) {
    return false;
  }

  const db = cloud.database();
  
  try {
    const memberResult = await db.collection('family_members').where({
      userId: user._id,
      familyId: familyId,
      role: 'admin',
      status: 'active'
    }).get();

    return memberResult.data.length > 0;
  } catch (error) {
    console.error('检查家庭管理员权限失败:', error);
    return false;
  }
}

module.exports = {
  validateUser,
  checkPermission,
  requirePermissions,
  createAuthMiddleware,
  isAdmin,
  isFamilyAdmin
};