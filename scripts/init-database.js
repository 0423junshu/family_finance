/**
 * 初始化云数据库集合
 * 创建家庭协作功能所需的数据库集合
 */

const cloud = require('wx-server-sdk');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

async function initDatabase() {
  console.log('开始初始化数据库集合...');

  try {
    // 创建家庭集合
    await createCollection('families', {
      name: '家庭名称',
      familyCode: '家庭码',
      ownerId: '创建者ID',
      createdAt: '创建时间',
      updatedAt: '更新时间',
      settings: {
        maxMembers: 10,
        allowInvite: true,
        syncStrategy: 'hybrid'
      }
    });

    // 创建家庭成员集合
    await createCollection('family_members', {
      familyId: '家庭ID',
      userId: '用户ID',
      nickname: '昵称',
      avatar: '头像',
      role: '角色(owner/admin/member)',
      status: '状态(active/removed/left)',
      joinedAt: '加入时间',
      lastActiveTime: '最后活跃时间',
      permissions: '权限配置'
    });

    // 创建家庭邀请集合
    await createCollection('family_invites', {
      familyId: '家庭ID',
      familyCode: '家庭码',
      inviterId: '邀请者ID',
      createdAt: '创建时间',
      expiresAt: '过期时间',
      status: '状态(active/expired/used)'
    });

    // 创建交易记录集合（如果不存在）
    await createCollection('transactions', {
      userId: '用户ID',
      familyId: '家庭ID',
      amount: '金额',
      type: '类型(income/expense)',
      categoryId: '分类ID',
      accountId: '账户ID',
      description: '描述',
      date: '日期',
      createdAt: '创建时间',
      updatedAt: '更新时间'
    });

    // 创建分类集合（如果不存在）
    await createCollection('categories', {
      name: '分类名称',
      icon: '图标',
      type: '类型(income/expense)',
      userId: '用户ID',
      familyId: '家庭ID',
      isDefault: '是否默认分类',
      createdAt: '创建时间'
    });

    // 创建账户集合（如果不存在）
    await createCollection('accounts', {
      name: '账户名称',
      type: '账户类型',
      balance: '余额',
      userId: '用户ID',
      familyId: '家庭ID',
      createdAt: '创建时间',
      updatedAt: '更新时间'
    });

    console.log('✅ 数据库集合初始化完成！');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
}

async function createCollection(collectionName, sampleData) {
  try {
    console.log(`创建集合: ${collectionName}`);
    
    // 尝试获取集合信息，如果不存在会抛出错误
    try {
      await db.collection(collectionName).limit(1).get();
      console.log(`✅ 集合 ${collectionName} 已存在`);
    } catch (error) {
      if (error.errCode === -502005) {
        // 集合不存在，创建集合
        console.log(`📝 集合 ${collectionName} 不存在，正在创建...`);
        
        // 通过添加一个临时文档来创建集合
        const tempDoc = {
          _temp: true,
          _createdAt: new Date(),
          _sampleData: sampleData
        };
        
        const result = await db.collection(collectionName).add({
          data: tempDoc
        });
        
        // 删除临时文档
        await db.collection(collectionName).doc(result._id).remove();
        
        console.log(`✅ 集合 ${collectionName} 创建成功`);
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error(`❌ 创建集合 ${collectionName} 失败:`, error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase().catch(console.error);
}

module.exports = {
  initDatabase,
  createCollection
};