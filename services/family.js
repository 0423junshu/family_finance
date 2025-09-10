/**
 * 家庭管理服务
 * 提供家庭码管理、成员邀请、权限控制等功能
 */

let db = null;
let _ = null;
function getDB() {
  if (!(typeof wx !== 'undefined' && wx.cloud)) {
    const e = new Error('CLOUD_NOT_READY');
    e.errCode = -99999;
    throw e;
  }
  if (!db) {
    db = wx.cloud.database();
    _ = db.command;
  }
  return db;
}
const { getAvatarUrl, generateInitialAvatar } = require('../utils/defaultAvatar.js');

class FamilyService {
  constructor() {
    // 延迟获取集合，避免云未初始化时抛错
    this.dbInitialized = false;
    Object.defineProperty(this, 'familiesCollection', {
      configurable: true,
      enumerable: true,
      get() { return getDB().collection('families'); }
    });
    Object.defineProperty(this, 'membersCollection', {
      configurable: true,
      enumerable: true,
      get() { return getDB().collection('family_members'); }
    });
    Object.defineProperty(this, 'invitesCollection', {
      configurable: true,
      enumerable: true,
      get() { return getDB().collection('family_invites'); }
    });
  }

  /**
   * 初始化数据库集合
   */
  async initDatabase() {
    if (this.dbInitialized) return;
    
    try {
      console.log('正在初始化数据库集合...');
      const result = await wx.cloud.callFunction({
        name: 'initDatabase'
      });
      
      if (result.result.success) {
        console.log('✅ 数据库初始化成功');
        this.dbInitialized = true;
      } else {
        throw new Error(result.result.message);
      }
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      throw new Error('数据库初始化失败，请联系管理员');
    }
  }

  /**
   * 处理数据库集合不存在的错误
   */
  async handleDatabaseError(error, operation) {
    if (error && (error.errCode === -99999 || error.message === 'CLOUD_NOT_READY')) {
      // 云未就绪：等待云初始化后重试
      try {
        wx.showLoading({ title: '初始化云环境...', mask: true });
        const start = Date.now();
        while (!(typeof wx !== 'undefined' && wx.cloud) && Date.now() - start < 5000) {
          await new Promise(r => setTimeout(r, 100));
        }
        wx.hideLoading();
        return await operation();
      } catch (e) {
        wx.hideLoading();
        throw e;
      }
    } else if (error.errCode === -502005) {
      console.log('检测到数据库集合不存在，正在初始化...');
      
      // 显示初始化提示
      wx.showLoading({
        title: '正在初始化数据库...',
        mask: true
      });
      
      try {
        await this.initDatabase();
        wx.hideLoading();
        
        // 重新执行原操作
        return await operation();
        
      } catch (initError) {
        wx.hideLoading();
        wx.showModal({
          title: '数据库初始化失败',
          content: '请检查网络连接或联系管理员',
          showCancel: false
        });
        throw initError;
      }
    } else {
      throw error;
    }
  }

  /**
   * 获取当前用户的家庭信息
   */
  async getFamilyInfo() {
    const operation = async () => {
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !userInfo.openid) {
        // 返回友好的错误信息而不是抛出异常
        return {
          success: false,
          code: 'USER_NOT_LOGGED_IN',
          message: '用户未登录'
        };
      }

      // 查找用户所属的家庭
      const memberResult = await this.membersCollection
        .where({
          userId: userInfo.openid,
          status: 'active'
        })
        .get();

      if (memberResult.data.length === 0) {
        // 用户未加入家庭，返回友好信息
        return {
          success: false,
          code: 'FAMILY_NOT_FOUND',
          message: '用户未加入任何家庭'
        };
      }

      const memberInfo = memberResult.data[0];
      
      // 获取家庭详细信息
      const familyResult = await this.familiesCollection
        .doc(memberInfo.familyId)
        .get();

      if (!familyResult.data) {
        throw new Error('家庭信息不存在');
      }

      const familyData = familyResult.data;

      return {
        success: true,
        data: {
          id: familyData._id,
          name: familyData.name,
          familyCode: familyData.familyCode,
          role: memberInfo.role,
          createdAt: familyData.createdAt,
          ownerId: familyData.ownerId
        }
      };
    };

    try {
      return await operation();
    } catch (error) {
      console.error('获取家庭信息失败:', error);
      return await this.handleDatabaseError(error, operation);
    }
  }

  /**
   * 获取家庭成员列表
   */
  async getFamilyMembers() {
    const operation = async () => {
      const familyResult = await this.getFamilyInfo();
      
      if (!familyResult.success || !familyResult.data) {
        return { success: false, members: [] };
      }
      
      const result = await this.membersCollection
        .where({
          familyId: familyResult.data.id,
          status: 'active'
        })
        .orderBy('joinedAt', 'asc')
        .get();

      const members = result.data.map(member => ({
        id: member._id,
        userId: member.userId,
        nickname: member.nickname || '未设置昵称',
        avatar: getAvatarUrl(member.avatar) || generateInitialAvatar(member.nickname || '用户'),
        role: member.role,
        joinedAt: member.joinedAt,
        lastActiveTime: member.lastActiveTime,
        permissions: member.permissions || this.getDefaultPermissions(member.role)
      }));

      return { success: true, members };
    };

    try {
      return await operation();
    } catch (error) {
      console.error('获取家庭成员失败:', error);
      return await this.handleDatabaseError(error, operation);
    }
  }

  /**
   * 创建新家庭
   */
  async createFamily(familyName = '我的家庭') {
    const operation = async () => {
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || (!userInfo.openid && !userInfo._id)) {
        throw new Error('用户未登录');
      }
      
      // 统一使用openid作为用户标识
      const userId = userInfo.openid || userInfo._id;

      // 检查用户是否已经加入其他家庭
      const existingMember = await this.membersCollection
        .where({
          userId: userId,
          status: 'active'
        })
        .get();

      if (existingMember.data.length > 0) {
        throw new Error('用户已加入其他家庭');
      }

      // 生成唯一的家庭码
      const familyCode = this.generateFamilyCode();

      // 创建家庭记录
      const familyResult = await this.familiesCollection.add({
        data: {
          name: familyName,
          familyCode: familyCode,
          ownerId: userId,  // 使用统一的userId
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: {
            maxMembers: 10,
            allowInvite: true,
            syncStrategy: 'hybrid' // hybrid, realtime, batch
          }
        }
      });

      // 添加创建者为家庭成员
      await this.membersCollection.add({
        data: {
          familyId: familyResult._id,
          userId: userId,  // 使用统一的userId
          nickname: userInfo.nickName || '家庭创建者',
          avatar: userInfo.avatarUrl || '/images/default-avatar.svg',
          role: 'owner',
          status: 'active',
          joinedAt: new Date(),
          lastActiveTime: new Date(),
          permissions: this.getDefaultPermissions('owner')
        }
      });

      return {
        familyId: familyResult._id,
        familyCode: familyCode,
        message: '家庭创建成功'
      };
    };

    try {
      return await operation();
    } catch (error) {
      console.error('创建家庭失败:', error);
      return await this.handleDatabaseError(error, operation);
    }
  }

  /**
   * 通过家庭码加入家庭
   */
  async joinFamilyByCode(familyCode) {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !userInfo.openid) {
        throw new Error('用户未登录');
      }

      // 检查用户是否已经加入其他家庭
      const existingMember = await this.membersCollection
        .where({
          userId: userInfo.openid,
          status: 'active'
        })
        .get();

      if (existingMember.data.length > 0) {
        throw new Error('用户已加入其他家庭，请先退出当前家庭');
      }

      // 查找家庭
      const familyResult = await this.familiesCollection
        .where({
          familyCode: familyCode
        })
        .get();

      if (familyResult.data.length === 0) {
        throw new Error('家庭码不存在或已失效');
      }

      const family = familyResult.data[0];

      // 检查家庭成员数量限制
      const memberCount = await this.membersCollection
        .where({
          familyId: family._id,
          status: 'active'
        })
        .count();

      if (memberCount.total >= family.settings.maxMembers) {
        throw new Error('家庭成员已达上限');
      }

      // 添加用户为家庭成员
      await this.membersCollection.add({
        data: {
          familyId: family._id,
          userId: userInfo.openid,
          nickname: userInfo.nickName || '新成员',
          avatar: userInfo.avatarUrl || '/images/default-avatar.svg',
          role: 'member',
          status: 'active',
          joinedAt: new Date(),
          lastActiveTime: new Date(),
          permissions: this.getDefaultPermissions('member')
        }
      });

      return {
        familyId: family._id,
        familyName: family.name,
        message: '成功加入家庭'
      };

    } catch (error) {
      console.error('加入家庭失败:', error);
      throw error;
    }
  }

  /**
   * 生成家庭码
   */
  generateFamilyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 获取默认权限
   */
  getDefaultPermissions(role) {
    const permissions = {
      owner: {
        // 数据权限
        canViewAllData: true,
        canEditAllData: true,
        canDeleteAllData: true,
        
        // 成员管理
        canInviteMembers: true,
        canRemoveMembers: true,
        canEditPermissions: true,
        
        // 家庭管理
        canEditFamilySettings: true,
        canDeleteFamily: true,
        canTransferOwnership: true,
        
        // 功能权限
        canManageCategories: true,
        canManageBudgets: true,
        canViewReports: true,
        canExportData: true
      },
      admin: {
        // 数据权限
        canViewAllData: true,
        canEditAllData: true,
        canDeleteAllData: false, // 不能删除他人数据
        
        // 成员管理
        canInviteMembers: true,
        canRemoveMembers: false,
        canEditPermissions: false,
        
        // 家庭管理
        canEditFamilySettings: false,
        canDeleteFamily: false,
        canTransferOwnership: false,
        
        // 功能权限
        canManageCategories: true,
        canManageBudgets: true,
        canViewReports: true,
        canExportData: true
      },
      member: {
        // 数据权限
        canViewAllData: true,
        canEditAllData: false, // 只能编辑自己的数据
        canDeleteAllData: false,
        
        // 成员管理
        canInviteMembers: false,
        canRemoveMembers: false,
        canEditPermissions: false,
        
        // 家庭管理
        canEditFamilySettings: false,
        canDeleteFamily: false,
        canTransferOwnership: false,
        
        // 功能权限
        canManageCategories: false,
        canManageBudgets: false,
        canViewReports: true,
        canExportData: false
      }
    };

    return permissions[role] || permissions.member;
  }
  /**
   * 检查用户权限
   */
  async checkPermission(permission) {
    try {
      // 获取当前用户的家庭信息
      const familyInfo = await this.getFamilyInfo();
      if (!familyInfo || !familyInfo.role) {
        return false;
      }

      // 权限映射表
      const permissions = {
        'canEditPermissions': ['owner', 'admin'],
        'canManageMembers': ['owner', 'admin'],
        'canViewReports': ['owner', 'admin', 'member'],
        'canEditData': ['owner', 'admin', 'member'],
        'canDeleteFamily': ['owner']
      };

      const allowedRoles = permissions[permission] || [];
      return allowedRoles.includes(familyInfo.role);
    } catch (error) {
      console.error('检查权限失败:', error);
      return false;
    }
  }
}

module.exports = new FamilyService();