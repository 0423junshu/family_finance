// services/data-consistency.js
// 数据一致性校验服务

/**
 * 校验账户余额与交易记录的一致性
 * 确保所有账户余额等于初始余额加上所有收入减去所有支出
 */
async function validateAccountBalances() {
  try {
    // 获取所有账户和交易记录
    const accounts = wx.getStorageSync('accounts') || []
    const transactions = wx.getStorageSync('transactions') || []
    
    // 存储校验结果
    const validationResults = []
    
    // 遍历每个账户进行校验
    for (const account of accounts) {
      const accountId = account.id || account._id
      
      // 计算该账户的所有交易
      const accountTransactions = transactions.filter(t => 
        t.accountId === accountId || 
        (t.type === 'transfer' && t.targetAccountId === accountId)
      )
      
      // 计算理论上的账户余额
      let calculatedBalance = account.initialBalance || 0
      
      // 遍历该账户的所有交易
      for (const transaction of accountTransactions) {
        if (transaction.accountId === accountId) {
          // 该账户作为源账户
          switch (transaction.type) {
            case 'income':
              calculatedBalance += transaction.amount
              break
            case 'expense':
              calculatedBalance -= transaction.amount
              break
            case 'transfer':
              calculatedBalance -= transaction.amount
              break
          }
        } else if (transaction.targetAccountId === accountId) {
          // 该账户作为目标账户（转账）
          calculatedBalance += transaction.amount
        }
      }
      
      // 比较计算余额与实际余额
      const isValid = Math.abs(calculatedBalance - account.balance) < 0.01 // 允许0.01的误差
      
      validationResults.push({
        accountId: accountId,
        accountName: account.name,
        actualBalance: account.balance,
        calculatedBalance,
        isValid,
        difference: calculatedBalance - account.balance
      })
    }
    
    return {
      isAllValid: validationResults.every(r => r.isValid),
      results: validationResults
    }
  } catch (error) {
    console.error('校验账户余额失败:', error)
    throw error
  }
}

/**
 * 修复账户余额与交易记录的不一致
 * @param {Boolean} autoFix 是否自动修复（true: 自动修复所有账户余额, false: 仅返回修复建议）
 */
async function fixAccountBalances(autoFix = false) {
  try {
    // 获取校验结果
    const validation = await validateAccountBalances()
    
    // 如果全部有效，无需修复
    if (validation.isAllValid) {
      return {
        needFix: false,
        message: '所有账户余额与交易记录一致，无需修复'
      }
    }
    
    // 需要修复的账户
    const accountsToFix = validation.results.filter(r => !r.isValid)
    
    // 如果不自动修复，返回修复建议
    if (!autoFix) {
      return {
        needFix: true,
        accountsToFix,
        message: '发现账户余额与交易记录不一致，建议修复'
      }
    }
    
    // 自动修复
    const accounts = wx.getStorageSync('accounts') || []
    let fixedCount = 0
    
    for (const account of accounts) {
      const accountId = account.id || account._id
      const validationResult = validation.results.find(r => r.accountId === accountId)
      
      if (validationResult && !validationResult.isValid) {
        // 更新账户余额为计算值
        account.balance = validationResult.calculatedBalance
        fixedCount++
      }
    }
    
    // 保存修复后的账户数据
    wx.setStorageSync('accounts', accounts)
    
    // 同步更新资产总额
    await syncTotalAssets()
    
    return {
      needFix: true,
      fixedCount,
      accountsFixed: accountsToFix,
      message: `已修复 ${fixedCount} 个账户的余额不一致问题`
    }
  } catch (error) {
    console.error('修复账户余额失败:', error)
    throw error
  }
}

/**
 * 校验资产总额与各账户余额之和的一致性
 */
async function validateTotalAssets() {
  try {
    // 获取所有账户
    const accounts = wx.getStorageSync('accounts') || []
    
    // 计算所有账户余额之和
    const calculatedTotal = accounts.reduce((sum, account) => sum + account.balance, 0)
    
    // 获取存储的资产总额
    const storedTotal = wx.getStorageSync('totalAssets') || 0
    
    // 比较计算总额与存储总额
    const isValid = Math.abs(calculatedTotal - storedTotal) < 0.01 // 允许0.01的误差
    
    return {
      isValid,
      calculatedTotal,
      storedTotal,
      difference: calculatedTotal - storedTotal
    }
  } catch (error) {
    console.error('校验资产总额失败:', error)
    throw error
  }
}

/**
 * 修复资产总额与各账户余额之和的不一致
 */
async function fixTotalAssets() {
  try {
    // 获取校验结果
    const validation = await validateTotalAssets()
    
    // 如果已经一致，无需修复
    if (validation.isValid) {
      return {
        needFix: false,
        message: '资产总额与各账户余额之和一致，无需修复'
      }
    }
    
    // 更新资产总额为计算值
    wx.setStorageSync('totalAssets', validation.calculatedTotal)
    
    return {
      needFix: true,
      oldTotal: validation.storedTotal,
      newTotal: validation.calculatedTotal,
      difference: validation.difference,
      message: '已修复资产总额与各账户余额之和的不一致问题'
    }
  } catch (error) {
    console.error('修复资产总额失败:', error)
    throw error
  }
}

/**
 * 同步更新资产总额
 * 根据所有账户余额之和更新资产总额
 */
async function syncTotalAssets() {
  try {
    // 获取所有账户
    const accounts = wx.getStorageSync('accounts') || []
    
    // 计算所有账户余额之和
    const totalAssets = accounts.reduce((sum, account) => sum + account.balance, 0)
    
    // 更新资产总额
    wx.setStorageSync('totalAssets', totalAssets)
    
    return {
      success: true,
      totalAssets
    }
  } catch (error) {
    console.error('同步更新资产总额失败:', error)
    throw error
  }
}

/**
 * 执行全面数据一致性检查
 * @param {Boolean} autoFix 是否自动修复问题
 */
async function performFullConsistencyCheck(autoFix = false) {
  try {
    // 校验账户余额
    const accountValidation = await validateAccountBalances()
    
    // 校验资产总额
    const assetValidation = await validateTotalAssets()
    
    // 是否需要修复
    const needFix = !accountValidation.isAllValid || !assetValidation.isValid
    
    // 生成详细的问题描述
    let detailedMessage = '';
    if (!accountValidation.isAllValid) {
      const invalidAccounts = accountValidation.results.filter(r => !r.isValid);
      detailedMessage += `发现${invalidAccounts.length}个账户余额不一致:\n`;
      invalidAccounts.forEach(acc => {
        const diffAmount = ((acc.difference) / 100).toFixed(2);
        const diffDirection = acc.difference > 0 ? '少了' : '多了';
        detailedMessage += `- ${acc.accountName}: 实际余额比应有余额${diffDirection}${Math.abs(diffAmount)}元\n`;
      });
    }
    
    if (!assetValidation.isValid) {
      const diffAmount = ((assetValidation.difference) / 100).toFixed(2);
      const diffDirection = assetValidation.difference > 0 ? '少了' : '多了';
      detailedMessage += `资产总额比账户余额之和${diffDirection}${Math.abs(diffAmount)}元`;
    }
    
    // 如果需要修复且启用了自动修复
    if (needFix && autoFix) {
      // 修复账户余额
      const accountFixResult = await fixAccountBalances(true)
      
      // 修复资产总额
      const assetFixResult = await fixTotalAssets()
      
      return {
        needFix,
        fixed: true,
        accountValidation,
        assetValidation,
        accountFixResult,
        assetFixResult,
        detailedMessage,
        message: '数据一致性检查完成，已自动修复发现的问题'
      }
    }
    
    return {
      needFix,
      fixed: false,
      accountValidation,
      assetValidation,
      detailedMessage,
      message: needFix 
        ? '数据一致性检查完成，发现问题需要修复' 
        : '数据一致性检查完成，所有数据一致'
    }
  } catch (error) {
    console.error('执行数据一致性检查失败:', error)
    throw error
  }
}

/**
 * 校验交易记录与账户的关联一致性
 * 确保所有交易记录都关联到有效的账户
 */
async function validateTransactionAccountLinks() {
  try {
    // 获取所有账户和交易记录
    const accounts = wx.getStorageSync('accounts') || []
    const transactions = wx.getStorageSync('transactions') || []
    
    // 提取所有账户ID
    const accountIds = accounts.map(account => account.id || account._id)
    
    // 检查每个交易记录的账户关联
    const invalidTransactions = []
    
    transactions.forEach(transaction => {
      const { id, type, accountId, targetAccountId, amount, date, description } = transaction
      
      let isValid = true
      const issues = []
      
      // 检查源账户
      if (!accountId) {
        isValid = false
        issues.push('缺少源账户ID')
      } else if (!accountIds.includes(accountId)) {
        isValid = false
        issues.push('源账户不存在')
      }
      
      // 检查目标账户（仅转账类型）
      if (type === 'transfer') {
        if (!targetAccountId) {
          isValid = false
          issues.push('缺少目标账户ID')
        } else if (!accountIds.includes(targetAccountId)) {
          isValid = false
          issues.push('目标账户不存在')
        }
      }
      
      if (!isValid) {
        invalidTransactions.push({
          id,
          type,
          amount,
          date,
          description,
          accountId,
          targetAccountId,
          issues
        })
      }
    })
    
    return {
      isAllValid: invalidTransactions.length === 0,
      invalidCount: invalidTransactions.length,
      invalidTransactions
    }
  } catch (error) {
    console.error('校验交易记录与账户关联失败:', error)
    throw error
  }
}

/**
 * 修复交易记录与账户的关联问题
 * @param {Boolean} autoFix 是否自动修复（true: 自动删除无效交易, false: 仅返回修复建议）
 */
async function fixTransactionAccountLinks(autoFix = false) {
  try {
    // 获取校验结果
    const validation = await validateTransactionAccountLinks()
    
    // 如果全部有效，无需修复
    if (validation.isAllValid) {
      return {
        needFix: false,
        message: '所有交易记录都关联到有效账户，无需修复'
      }
    }
    
    // 如果不自动修复，返回修复建议
    if (!autoFix) {
      return {
        needFix: true,
        invalidTransactions: validation.invalidTransactions,
        message: `发现${validation.invalidCount}条交易记录存在账户关联问题，建议修复`
      }
    }
    
    // 自动修复：删除无效的交易记录
    const transactions = wx.getStorageSync('transactions') || []
    const invalidIds = validation.invalidTransactions.map(t => t.id)
    
    const validTransactions = transactions.filter(t => !invalidIds.includes(t.id))
    
    // 保存修复后的交易记录
    wx.setStorageSync('transactions', validTransactions)
    
    // 重新校验账户余额
    await performFullConsistencyCheck(true)
    
    return {
      needFix: true,
      removedCount: transactions.length - validTransactions.length,
      removedTransactions: validation.invalidTransactions,
      message: `已删除${transactions.length - validTransactions.length}条无效交易记录并重新校验账户余额`
    }
  } catch (error) {
    console.error('修复交易记录与账户关联失败:', error)
    throw error
  }
}

/**
 * 自动同步账户变动到资产总览
 * 在账户余额变动后自动更新资产总览
 * @param {String} accountId 变动的账户ID
 * @param {Number} oldBalance 变动前的余额
 * @param {Number} newBalance 变动后的余额
 */
async function syncAccountChangeToAssets(accountId, oldBalance, newBalance) {
  try {
    // 计算变动金额
    const changeAmount = newBalance - oldBalance
    
    // 获取当前资产总额
    let totalAssets = wx.getStorageSync('totalAssets') || 0
    
    // 更新资产总额
    totalAssets += changeAmount
    
    // 保存更新后的资产总额
    wx.setStorageSync('totalAssets', totalAssets)
    
    return {
      success: true,
      accountId,
      changeAmount,
      newTotalAssets: totalAssets
    }
  } catch (error) {
    console.error('同步账户变动到资产总览失败:', error)
    throw error
  }
}

module.exports = {
  validateAccountBalances,
  fixAccountBalances,
  validateTotalAssets,
  fixTotalAssets,
  syncTotalAssets,
  performFullConsistencyCheck,
  validateTransactionAccountLinks,
  fixTransactionAccountLinks,
  syncAccountChangeToAssets
}