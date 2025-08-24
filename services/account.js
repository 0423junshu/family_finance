// services/account.js
const { request } = require('../utils/request')

/**
 * 获取账户列表
 */
async function getAccounts() {
  try {
    // 模拟数据，实际项目中应该调用云函数
    return [
      {
        id: '1',
        name: '现金',
        icon: '💰',
        balance: 50000, // 500元
        type: 'cash'
      },
      {
        id: '2', 
        name: '支付宝',
        icon: '💳',
        balance: 120000, // 1200元
        type: 'alipay'
      },
      {
        id: '3',
        name: '银行卡',
        icon: '🏦',
        balance: 800000, // 8000元
        type: 'bank'
      }
    ]
  } catch (error) {
    console.error('获取账户列表失败:', error)
    return []
  }
}

/**
 * 创建账户
 */
async function createAccount(accountData) {
  try {
    // 实际项目中调用云函数
    console.log('创建账户:', accountData)
    return { success: true, id: Date.now().toString() }
  } catch (error) {
    console.error('创建账户失败:', error)
    throw error
  }
}

/**
 * 更新账户
 */
async function updateAccount(id, accountData) {
  try {
    // 调用云函数更新账户
    const result = await wx.cloud.callFunction({
      name: 'updateAccount',
      data: {
        accountId: id,
        updates: accountData
      }
    })

    if (result.result.success) {
      return { success: true, data: result.result.data }
    } else {
      throw new Error(result.result.error || '更新账户失败')
    }
  } catch (error) {
    console.error('更新账户失败:', error)
    throw error
  }
}

/**
 * 更新账户余额
 */
async function updateAccountBalance(accountId, newBalance, oldBalance) {
  try {
    // 调用云函数更新账户余额
    const result = await wx.cloud.callFunction({
      name: 'updateAccount',
      data: {
        accountId,
        updates: {
          balance: newBalance,
          oldBalance: oldBalance
        }
      }
    })

    if (result.result.success) {
      return { 
        success: true, 
        data: {
          accountId,
          oldBalance,
          newBalance
        }
      }
    } else {
      throw new Error(result.result.error || '更新账户余额失败')
    }
  } catch (error) {
    console.error('更新账户余额失败:', error)
    // 如果云函数调用失败，返回错误信息
    return {
      success: false,
      error: error.message || '更新账户余额失败'
    }
  }
}

/**
 * 删除账户
 */
async function deleteAccount(accountId) {
  try {
    // 检查账户是否有交易记录
    const transactions = await wx.cloud.database().collection('transactions')
      .where({
        $or: [
          { fromAccountId: accountId },
          { toAccountId: accountId }
        ]
      })
      .limit(1)
      .get()

    if (transactions.data.length > 0) {
      return {
        success: false,
        error: '该账户存在交易记录，无法删除'
      }
    }

    // 删除账户
    const result = await wx.cloud.database().collection('accounts')
      .doc(accountId)
      .remove()

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('删除账户失败:', error)
    return {
      success: false,
      error: error.message || '删除账户失败'
    }
  }
}

module.exports = {
  getAccounts,
  createAccount,
  updateAccount,
  updateAccountBalance,
  deleteAccount
}
