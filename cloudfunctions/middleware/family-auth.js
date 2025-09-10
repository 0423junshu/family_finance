// cloudfunctions/middleware/family-auth.js
/**
 * 家庭数据权限验证中间件
 * 确保用户只能访问自己有权限的家庭数据
 */

const cloud = require('wx-server-sdk');

/**
 * 验证家庭访问权限
 * @param {string} userId 用户ID
 * @param {string} familyId 家庭ID
 * @returns {Promise<Object>} 家庭成员信息
 */
async function validateFamilyAccess(userId, familyId) {
  if (!userId || !familyId) {
    throw new Error('参数错误：缺少用户ID或家庭ID');
  }

  const db = cloud.database();

  try {
    // 检查用户是否属于该家庭
    const memberResult = await db.collection('family_members').where({
      userId: userId,
      familyId: familyId,
      status: 'active'
    }).get();

    if (memberResult.data.length === 0) {
      throw new Error('用户不属于该家庭或权限不足');
    }

    const member = memberResult.data[0];

    // 检查成员权限
    if (!member.permissions || !Array.isArray(member.permissions)) {
      // 为老成员设置默认权限
      const defaultPermissions = [
        'view_transactions',
        'create_transaction',
        'view_reports'
      ];

      await db.collection('family_members').doc(member._id).update({
        data: {
          permissions: defaultPermissions,
          updatedAt: new Date()
        }
      });

      member.permissions = defaultPermissions;
    }

    // 获取家庭信息
    const familyResult = await db.collection('families').doc(familyId).get();
    
    if (!familyResult.data) {
      throw new Error('家庭不存在');
    }

    const family = familyResult.data;

    // 检查家庭状态
    if (family.status !== 'active') {
      throw new Error('家庭状态异常，无法访问');
    }

    return {
      member,
      family,
      userId,
      familyId,
      role: member.role || 'member',
      permissions: member.permissions
    };
  } catch (error) {
    console.error('家庭权限验证失败:', error);
    
    if (error.message.includes('用户') || error.message.includes('家庭')) {
      throw error;
    } else {
      throw new Error('家庭权限验证失败，请重试');
    }
  }
}

/**
 * 检查家庭权限
 * @param {Object} familyAccess 家庭访问信息
 * @param {string|Array} requiredPermissions 需要的权限
 * @returns {boolean} 是否有权限
 */
function checkFamilyPermission(familyAccess, requiredPermissions) {
  if (!familyAccess || !familyAccess.permissions) {
    return false;
  }

  const userPermissions = familyAccess.permissions;
  
  // 如果是字符串，转换为数组
  const permissions = Array.isArray(requiredPermissions) 
    ? requiredPermissions 
    : [requiredPermissions];

  // 管理员拥有所有权限
  if (familyAccess.role === 'admin') {
    return true;
  }

  // 检查是否有所有需要的权限
  return permissions.every(permission => userPermissions.includes(permission));
}

/**
 * 获取用户的默认家庭ID
 * @param {string} userId 用户ID
 * @returns {Promise<string>} 家庭ID
 */
async function getDefaultFamilyId(userId) {
  if (!userId) {
    throw new Error('缺少用户ID');
  }

  const db = cloud.database();

  try {
    // 首先查找用户的默认家庭
    const userResult = await db.collection('users').doc(userId).get();
    
    if (userResult.data && userResult.data.defaultFamilyId) {
      return userResult.data.defaultFamilyId;
    }

    // 如果没有默认家庭，查找用户参与的第一个家庭
    const memberResult = await db.collection('family_members').where({
      userId: userId,
      status: 'active'
    }).orderBy('createdAt', 'asc').limit(1).get();

    if (memberResult.data.length > 0) {
      const familyId = memberResult.data[0].familyId;
      
      // 设置为默认家庭
      await db.collection('users').doc(userId).update({
        data: {
          defaultFamilyId: familyId,
          updatedAt: new Date()
        }
      });

      return familyId;
    }

    throw new Error('用户未加入任何家庭');
  } catch (error) {
    console.error('获取默认家庭ID失败:', error);
    
    if (error.message.includes('用户')) {
      throw error;
    } else {
      throw new Error('获取家庭信息失败，请重试');
    }
  }
}

/**
 * 创建家庭权限验证中间件
 * @param {string|Array} requiredPermissions 需要的权限
 * @param {boolean} allowAutoFamily 是否允许自动获取家庭ID
 * @returns {Function} 中间件函数
 */
function createFamilyAuthMiddleware(requiredPermissions, allowAutoFamily = true) {
  return async (event, context, next) => {
    try {
      // 确保用户已经通过基本身份验证
      if (!event._user) {
        throw new Error('用户身份验证失败');
      }

      const user = event._user;
      let familyId = event.familyId;

      // 如果没有提供家庭ID，尝试获取默认家庭ID
      if (!familyId && allowAutoFamily) {
        familyId = await getDefaultFamilyId(user._id);
      }

      if (!familyId) {
        throw new Error('未指定家庭ID');
      }

      // 验证家庭访问权限
      const familyAccess = await validateFamilyAccess(user._id, familyId);

      // 检查特定权限
      if (requiredPermissions && !checkFamilyPermission(familyAccess, requiredPermissions)) {
        throw new Error(`权限不足，需要权限: ${Array.isArray(requiredPermissions) ? requiredPermissions.join(', ') : requiredPermissions}`);
      }

      // 将家庭访问信息添加到事件中
      event._familyAccess = familyAccess;
      event.familyId = familyId;

      // 继续执行
      return await next();
    } catch (error) {
      console.error('家庭权限验证失败:', error);
      return {
        success: false,
        message: error.message,
        code: 'FAMILY_PERMISSION_ERROR'
      };
    }
  };
}

/**
 * 获取用户在家庭中的角色
 * @param {string} userId 用户ID
 * @param {string} familyId 家庭ID
 * @returns {Promise<string>} 用户角色
 */
async function getUserFamilyRole(userId, familyId) {
  const db = cloud.database();

  try {
    const memberResult = await db.collection('family_members').where({
      userId: userId,
      familyId: familyId,
      status: 'active'
    }).get();

    if (memberResult.data.length === 0) {
      return null;
    }

    return memberResult.data[0].role || 'member';
  } catch (error) {
    console.error('获取用户家庭角色失败:', error);
    return null;
  }
}

/**
 * 检查是否为家庭创建者
 * @param {string} userId 用户ID
 * @param {string} familyId 家庭ID
 * @returns {Promise<boolean>} 是否为创建者
 */
async function isFamilyCreator(userId, familyId) {
  const db = cloud.database();

  try {
    const familyResult = await db.collection('families').doc(familyId).get();
    
    if (!familyResult.data) {
      return false;
    }

    return familyResult.data.createdBy === userId;
  } catch (error) {
    console.error('检查家庭创建者失败:', error);
    return false;
  }
}

module.exports = {
  validateFamilyAccess,
  checkFamilyPermission,
  getDefaultFamilyId,
  createFamilyAuthMiddleware,
  getUserFamilyRole,
  isFamilyCreator
};