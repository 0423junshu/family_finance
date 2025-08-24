// 更新账户信息的云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { accountId, updates } = event
  
  try {
    // 参数验证
    if (!accountId) {
      return {
        success: false,
        error: '账户ID不能为空'
      }
    }

    if (!updates || Object.keys(updates).length === 0) {
      return {
        success: false,
        error: '更新数据不能为空'
      }
    }

    // 更新账户信息
    const result = await db.collection('accounts').doc(accountId).update({
      data: {
        ...updates,
        updatedAt: new Date()
      }
    })

    // 如果更新了余额，需要记录变动日志
    if (updates.balance !== undefined) {
      await db.collection('account_logs').add({
        data: {
          accountId,
          type: 'balance_update',
          oldBalance: updates.oldBalance || 0,
          newBalance: updates.balance,
          reason: '手动调整',
          createdAt: new Date()
        }
      })
    }

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('更新账户失败:', error)
    return {
      success: false,
      error: '更新账户失败: ' + error.message
    }
  }
}