// 云函数：初始化数据库集合
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  console.log('开始初始化数据库集合...');

  try {
    const results = [];

    // 创建家庭集合
    const familiesResult = await createCollectionIfNotExists('families');
    results.push({ collection: 'families', ...familiesResult });

    // 创建家庭成员集合
    const membersResult = await createCollectionIfNotExists('family_members');
    results.push({ collection: 'family_members', ...membersResult });

    // 创建家庭邀请集合
    const invitesResult = await createCollectionIfNotExists('family_invites');
    results.push({ collection: 'family_invites', ...invitesResult });

    // 创建交易记录集合
    const transactionsResult = await createCollectionIfNotExists('transactions');
    results.push({ collection: 'transactions', ...transactionsResult });

    // 创建分类集合
    const categoriesResult = await createCollectionIfNotExists('categories');
    results.push({ collection: 'categories', ...categoriesResult });

    // 创建账户集合
    const accountsResult = await createCollectionIfNotExists('accounts');
    results.push({ collection: 'accounts', ...accountsResult });

    // 创建冲突管理相关集合
    const conflictsResult = await createCollectionIfNotExists('data_conflicts');
    results.push({ collection: 'data_conflicts', ...conflictsResult });

    const locksResult = await createCollectionIfNotExists('data_locks');
    results.push({ collection: 'data_locks', ...locksResult });

    const versionsResult = await createCollectionIfNotExists('data_versions');
    results.push({ collection: 'data_versions', ...versionsResult });

    console.log('✅ 数据库集合初始化完成！');

    return {
      success: true,
      message: '数据库初始化成功',
      results: results
    };

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    return {
      success: false,
      message: '数据库初始化失败',
      error: error.message
    };
  }
};

async function createCollectionIfNotExists(collectionName) {
  try {
    // 尝试查询集合，如果不存在会抛出错误
    await db.collection(collectionName).limit(1).get();
    return { status: 'exists', message: `集合 ${collectionName} 已存在` };
    
  } catch (error) {
    if (error.errCode === -502005) {
      // 集合不存在，创建集合
      console.log(`创建集合: ${collectionName}`);
      
      // 通过添加一个临时文档来创建集合
      const tempDoc = {
        _temp: true,
        _createdAt: new Date(),
        _purpose: `临时文档用于创建集合 ${collectionName}`
      };
      
      const result = await db.collection(collectionName).add({
        data: tempDoc
      });
      
      // 立即删除临时文档
      await db.collection(collectionName).doc(result._id).remove();
      
      return { status: 'created', message: `集合 ${collectionName} 创建成功` };
    } else {
      throw error;
    }
  }
}