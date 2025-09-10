// services/account-sync.js
/**
 * 账户同步服务
 * 负责处理账户余额的更新和同步，确保记账账户与资产模块实时同步
 */

/**
 * 更新账户余额
 * @param {String} accountId 账户ID
 * @param {Number} amount 金额变动（正数为增加，负数为减少）
 * @param {String} transactionType 交易类型（income, expense, transfer）
 * @param {String} transactionId 交易ID（用于记录日志）
 * @returns {Object} 更新结果
 */
async function updateAccountBalance(accountId, amount, transactionType, transactionId) {
  try {
    // 获取所有账户
    const accounts = wx.getStorageSync('accounts') || []
    
    // 查找账户
    const accountIndex = accounts.findIndex(a => a.id === accountId || a._id === accountId)
    
    if (accountIndex === -1) {
      throw new Error(`账户不存在: ${accountId}`)
    }
    
    // 检查余额是否足够（如果是减少余额的操作）
    if (amount < 0 && accounts[accountIndex].balance < Math.abs(amount)) {
      throw new Error('账户余额不足')
    }
    
    // 更新账户余额
    accounts[accountIndex].balance += amount
    
    // 记录余额变动日志
    const balanceLog = {
      accountId,
      amount,
      transactionType,
      transactionId,
      balanceAfter: accounts[accountIndex].balance,
      timestamp: new Date().toISOString()
    }
    
    // 保存余额变动日志
    const balanceLogs = wx.getStorageSync('balanceLogs') || []
    balanceLogs.push(balanceLog)
    wx.setStorageSync('balanceLogs', balanceLogs)
    
    // 保存更新后的账户数据
    wx.setStorageSync('accounts', accounts)
    
    // 标记账户数据已更新
    wx.setStorageSync('accountChanged', Date.now())
    
    return {
      success: true,
      accountId,
      newBalance: accounts[accountIndex].balance,
      message: `账户余额已${amount > 0 ? '增加' : '减少'} ${Math.abs(amount / 100).toFixed(2)} 元`
    }
  } catch (error) {
    console.error('更新账户余额失败:', error)
    throw error
  }
}

/**
 * 处理交易对账户余额的影响
 * @param {Object} transaction 交易记录
 * @param {String} action 操作类型：create, update, delete
 * @param {Object} oldTransaction 更新前的交易记录（仅update操作需要）
 */
async function syncTransactionWithAccount(transaction, action, oldTransaction = null) {
  try {
    switch (action) {
      case 'create':
        await handleCreateTransaction(transaction)
        break
      case 'update':
        await handleUpdateTransaction(transaction, oldTransaction)
        break
      case 'delete':
        await handleDeleteTransaction(transaction)
        break
      default:
        throw new Error(`未知的操作类型: ${action}`)
    }
    
    return true
  } catch (error) {
    console.error('同步交易与账户失败:', error)
    throw error
  }
}

/**
 * 处理新增交易
 */
async function handleCreateTransaction(transaction) {
  const { type, amount, accountId, targetAccountId, id } = transaction
  
  switch (type) {
    case 'expense':
      // 支出：减少账户余额
      await updateAccountBalance(accountId, -amount, 'expense', id)
      break
      
    case 'income':
      // 收入：增加账户余额
      await updateAccountBalance(accountId, amount, 'income', id)
      break
      
    case 'transfer':
      // 转账：减少源账户余额，增加目标账户余额
      if (!targetAccountId) {
        throw new Error('转账目标账户不能为空')
      }
      
      await updateAccountBalance(accountId, -amount, 'transfer_out', id)
      await updateAccountBalance(targetAccountId, amount, 'transfer_in', id)
      break
      
    default:
      throw new Error(`未知的交易类型: ${type}`)
  }
}

/**
 * 处理更新交易
 */
async function handleUpdateTransaction(transaction, oldTransaction) {
  // 如果账户ID或金额没有变化，无需更新账户余额
  if (
    transaction.type === oldTransaction.type &&
    transaction.amount === oldTransaction.amount &&
    transaction.accountId === oldTransaction.accountId &&
    (transaction.type !== 'transfer' || transaction.targetAccountId === oldTransaction.targetAccountId)
  ) {
    return
  }
  
  // 先还原旧交易对账户的影响
  await handleDeleteTransaction(oldTransaction)
  
  // 再应用新交易的影响
  await handleCreateTransaction(transaction)
}

/**
 * 处理删除交易
 */
async function handleDeleteTransaction(transaction) {
  const { type, amount, accountId, targetAccountId, id } = transaction
  
  switch (type) {
    case 'expense':
      // 删除支出：增加账户余额
      await updateAccountBalance(accountId, amount, 'expense_delete', id)
      break
      
    case 'income':
      // 删除收入：减少账户余额
      await updateAccountBalance(accountId, -amount, 'income_delete', id)
      break
      
    case 'transfer':
      // 删除转账：增加源账户余额，减少目标账户余额
      if (!targetAccountId) {
        throw new Error('转账目标账户不能为空')
      }
      
      await updateAccountBalance(accountId, amount, 'transfer_out_delete', id)
      await updateAccountBalance(targetAccountId, -amount, 'transfer_in_delete', id)
      break
      
    default:
      throw new Error(`未知的交易类型: ${type}`)
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
    
    // 初始化每个账户的理论余额为初始余额（如果有）
    accounts.forEach(account => {
      const accountId = account.id || account._id
      theoreticalBalances[accountId] = account.initialBalance || 0
    })
    
    // 根据交易记录计算理论余额
    transactions.forEach(transaction => {
      const { type, amount, accountId, targetAccountId } = transaction
      
      // 确保账户ID存在
      if (!accountId && type !== 'transfer') {
        console.warn('交易记录缺少账户ID:', transaction)
        return
      }
      
      if (type === 'transfer' && (!accountId || !targetAccountId)) {
        console.warn('转账记录缺少源账户或目标账户ID:', transaction)
        return
      }
      
      switch (type) {
        case 'expense':
          if (theoreticalBalances[accountId] !== undefined) {
            theoreticalBalances[accountId] -= amount
          }
          break
          
        case 'income':
          if (theoreticalBalances[accountId] !== undefined) {
            theoreticalBalances[accountId] += amount
          }
          break
          
        case 'transfer':
          if (theoreticalBalances[accountId] !== undefined) {
            theoreticalBalances[accountId] -= amount
          }
          if (theoreticalBalances[targetAccountId] !== undefined) {
            theoreticalBalances[targetAccountId] += amount
          }
          break
      }
    })
    
    // 检查每个账户的实际余额与理论余额是否一致
    const inconsistentAccounts = []
    
    accounts.forEach(account => {
      const accountId = account.id || account._id
      const theoreticalBalance = theoreticalBalances[accountId] || 0
      
      // 允许小额误差（例如1分钱）
      if (Math.abs(account.balance - theoreticalBalance) > 1) {
        inconsistentAccounts.push({
          id: accountId,
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
  updateAccountBalance,
  syncTransactionWithAccount,
  validateAccountBalance,
  fixAccountBalance
}