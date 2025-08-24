// services/transaction-sync.js
// 交易与账户同步服务

/**
 * 处理交易与账户余额同步
 * @param {Object} transaction 交易记录
 * @param {String} action 操作类型：create, update, delete
 * @param {Object} oldTransaction 更新前的交易记录（仅update操作需要）
 */
async function syncTransactionWithAccount(transaction, action, oldTransaction = null) {
  try {
    // 获取当前账户列表
    const accounts = wx.getStorageSync('accounts') || []
    
    // 根据操作类型处理账户余额
    switch (action) {
      case 'create':
        await handleCreateTransaction(transaction, accounts)
        break
      case 'update':
        await handleUpdateTransaction(transaction, oldTransaction, accounts)
        break
      case 'delete':
        await handleDeleteTransaction(transaction, accounts)
        break
      default:
        console.error('未知的操作类型:', action)
    }
    
    // 保存更新后的账户数据
    wx.setStorageSync('accounts', accounts)
    
    // 标记账户数据已更新
    wx.setStorageSync('accountChanged', Date.now())
    
    return true
  } catch (error) {
    console.error('同步交易与账户失败:', error)
    throw error
  }
}

/**
 * 处理新增交易
 */
async function handleCreateTransaction(transaction, accounts) {
  const { type, amount, accountId, targetAccountId } = transaction
  
  // 查找相关账户
  const sourceAccountIndex = accounts.findIndex(a => a.id === accountId)
  
  if (sourceAccountIndex === -1) {
    throw new Error('账户不存在')
  }
  
  // 根据交易类型调整账户余额
  switch (type) {
    case 'expense':
      // 支出：减少账户余额
      if (accounts[sourceAccountIndex].balance < amount) {
        throw new Error('账户余额不足')
      }
      accounts[sourceAccountIndex].balance -= amount
      break
      
    case 'income':
      // 收入：增加账户余额
      accounts[sourceAccountIndex].balance += amount
      break
      
    case 'transfer':
      // 转账：减少源账户余额，增加目标账户余额
      if (!targetAccountId) {
        throw new Error('转账目标账户不能为空')
      }
      
      const targetAccountIndex = accounts.findIndex(a => a.id === targetAccountId)
      
      if (targetAccountIndex === -1) {
        throw new Error('目标账户不存在')
      }
      
      if (accounts[sourceAccountIndex].balance < amount) {
        throw new Error('账户余额不足')
      }
      
      accounts[sourceAccountIndex].balance -= amount
      accounts[targetAccountIndex].balance += amount
      break
      
    default:
      throw new Error('未知的交易类型')
  }
}

/**
 * 处理更新交易
 */
async function handleUpdateTransaction(transaction, oldTransaction, accounts) {
  // 先还原旧交易对账户的影响
  await handleDeleteTransaction(oldTransaction, accounts)
  
  // 再应用新交易的影响
  await handleCreateTransaction(transaction, accounts)
}

/**
 * 处理删除交易
 */
async function handleDeleteTransaction(transaction, accounts) {
  const { type, amount, accountId, targetAccountId } = transaction
  
  // 查找相关账户
  const sourceAccountIndex = accounts.findIndex(a => a.id === accountId)
  
  if (sourceAccountIndex === -1) {
    throw new Error('账户不存在')
  }
  
  // 根据交易类型反向调整账户余额
  switch (type) {
    case 'expense':
      // 删除支出：增加账户余额
      accounts[sourceAccountIndex].balance += amount
      break
      
    case 'income':
      // 删除收入：减少账户余额
      if (accounts[sourceAccountIndex].balance < amount) {
        throw new Error('账户余额不足')
      }
      accounts[sourceAccountIndex].balance -= amount
      break
      
    case 'transfer':
      // 删除转账：增加源账户余额，减少目标账户余额
      if (!targetAccountId) {
        throw new Error('转账目标账户不能为空')
      }
      
      const targetAccountIndex = accounts.findIndex(a => a.id === targetAccountId)
      
      if (targetAccountIndex === -1) {
        throw new Error('目标账户不存在')
      }
      
      accounts[sourceAccountIndex].balance += amount
      
      if (accounts[targetAccountIndex].balance < amount) {
        throw new Error('目标账户余额不足')
      }
      
      accounts[targetAccountIndex].balance -= amount
      break
      
    default:
      throw new Error('未知的交易类型')
  }
}

/**
 * 验证账户余额一致性
 * 检查所有交易记录的总和是否与账户余额相符
 */
async function validateAccountBalance() {
  try {
    // 获取所有账户
    const accounts = wx.getStorageSync('accounts') || []
    
    // 获取所有交易记录
    const transactions = wx.getStorageSync('transactions') || []
    
    // 计算每个账户的理论余额
    const theoreticalBalances = {}
    
    // 初始化每个账户的理论余额为0
    accounts.forEach(account => {
      theoreticalBalances[account.id] = 0
    })
    
    // 根据交易记录计算理论余额
    transactions.forEach(transaction => {
      const { type, amount, accountId, targetAccountId } = transaction
      
      switch (type) {
        case 'expense':
          theoreticalBalances[accountId] -= amount
          break
          
        case 'income':
          theoreticalBalances[accountId] += amount
          break
          
        case 'transfer':
          theoreticalBalances[accountId] -= amount
          theoreticalBalances[targetAccountId] += amount
          break
      }
    })
    
    // 检查每个账户的实际余额与理论余额是否一致
    const inconsistentAccounts = []
    
    accounts.forEach(account => {
      const theoreticalBalance = theoreticalBalances[account.id] || 0
      
      // 允许小额误差（例如1分钱）
      if (Math.abs(account.balance - theoreticalBalance) > 1) {
        inconsistentAccounts.push({
          id: account.id,
          name: account.name,
          actualBalance: account.balance,
          theoreticalBalance: theoreticalBalance,
          difference: account.balance - theoreticalBalance
        })
      }
    })
    
    return {
      isConsistent: inconsistentAccounts.length === 0,
      inconsistentAccounts
    }
  } catch (error) {
    console.error('验证账户余额一致性失败:', error)
    throw error
  }
}

/**
 * 修复账户余额不一致问题
 */
async function fixAccountBalance() {
  try {
    const validationResult = await validateAccountBalance()
    
    if (validationResult.isConsistent) {
      return { success: true, message: '账户余额已一致，无需修复' }
    }
    
    // 获取所有账户
    const accounts = wx.getStorageSync('accounts') || []
    
    // 修复不一致的账户余额
    validationResult.inconsistentAccounts.forEach(inconsistentAccount => {
      const accountIndex = accounts.findIndex(a => a.id === inconsistentAccount.id)
      
      if (accountIndex !== -1) {
        accounts[accountIndex].balance = inconsistentAccount.theoreticalBalance
      }
    })
    
    // 保存修复后的账户数据
    wx.setStorageSync('accounts', accounts)
    
    // 标记账户数据已更新
    wx.setStorageSync('accountChanged', Date.now())
    
    return {
      success: true,
      message: `已修复${validationResult.inconsistentAccounts.length}个账户的余额不一致问题`,
      fixedAccounts: validationResult.inconsistentAccounts
    }
  } catch (error) {
    console.error('修复账户余额不一致失败:', error)
    throw error
  }
}

module.exports = {
  syncTransactionWithAccount,
  validateAccountBalance,
  fixAccountBalance
}
