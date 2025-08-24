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
      // 计算该账户的所有交易
      const accountTransactions = transactions.filter(t => 
        t.accountId === account.id || 
        (t.type === 'transfer' && t.targetAccountId === account.id)
      )
      
      // 计算理论上的账户余额
      let calculatedBalance = account.initialBalance || 0
      
      // 遍历该账户的所有交易
      for (const transaction of accountTransactions) {
        if (transaction.accountId === account.id) {
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
        } else if (transaction.targetAccountId === account.id) {
          // 该账户作为目标账户（转账）
          calculatedBalance += transaction.amount
        }
      }
      
      // 比较计算余额与实际余额
      const isValid = Math.abs(calculatedBalance - account.balance) < 0.01 // 允许0.01的误差
      
      validationResults.push({
        accountId: account.id,
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
      const validationResult = validation.results.find(r => r.accountId === account.id)
      
      if (validationResult && !validationResult.isValid) {
        // 更新账户余额为计算值
        account.balance = validationResult.calculatedBalance
        fixedCount++
      }
    }
    
    // 保存修复后的账户数据
    wx.setStorageSync('accounts', accounts)
    
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

module.exports = {
  validateAccountBalances,
  fixAccountBalances,
  validateTotalAssets,
  fixTotalAssets,
  performFullConsistencyCheck
}