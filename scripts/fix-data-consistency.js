// 数据一致性修复工具
const FixDataConsistency = {
  
  // 修复账户余额一致性
  async fixAccountBalance() {
    console.log('=== 修复账户余额一致性 ===')
    
    try {
      const accounts = wx.getStorageSync('accounts') || []
      const transactions = wx.getStorageSync('transactions') || []
      
      let hasChanges = false
      
      accounts.forEach(account => {
        // 计算账户的实际余额
        const accountTransactions = transactions.filter(t => 
          t.accountId === account.id || t.fromAccountId === account.id || t.toAccountId === account.id
        )
        
        let calculatedBalance = 0
        
        accountTransactions.forEach(transaction => {
          if (transaction.type === 'income' && transaction.accountId === account.id) {
            calculatedBalance += transaction.amount
          } else if (transaction.type === 'expense' && transaction.accountId === account.id) {
            calculatedBalance -= transaction.amount
          } else if (transaction.type === 'transfer') {
            if (transaction.fromAccountId === account.id) {
              calculatedBalance -= transaction.amount
            } else if (transaction.toAccountId === account.id) {
              calculatedBalance += transaction.amount
            }
          }
        })
        
        // 如果计算余额与存储余额不一致，进行修复
        if (Math.abs(calculatedBalance - account.balance) > 1) { // 允许1分的误差
          console.log(`修复账户 ${account.name} 余额: ${account.balance} -> ${calculatedBalance}`)
          account.balance = calculatedBalance
          hasChanges = true
        }
      })
      
      if (hasChanges) {
        wx.setStorageSync('accounts', accounts)
        wx.setStorageSync('accountChanged', Date.now())
        console.log('✓ 账户余额修复完成')
      }
      
      // 重新计算总资产
      const totalAssets = accounts.reduce((sum, account) => sum + account.balance, 0)
      wx.setStorageSync('totalAssets', totalAssets)
      
      return true
    } catch (error) {
      console.error('修复账户余额失败:', error)
      return false
    }
  },
  
  // 修复周期设置
  fixCycleSetting() {
    console.log('=== 修复周期设置 ===')
    
    try {
      let cycleSetting = wx.getStorageSync('cycleSetting')
      
      if (!cycleSetting || !cycleSetting.startDay) {
        // 设置默认周期
        cycleSetting = {
          startDay: 1,
          type: 'monthly'
        }
        wx.setStorageSync('cycleSetting', cycleSetting)
        console.log('✓ 设置默认周期配置')
      }
      
      // 验证周期设置有效性
      if (cycleSetting.startDay < 1 || cycleSetting.startDay > 31) {
        cycleSetting.startDay = 1
        wx.setStorageSync('cycleSetting', cycleSetting)
        console.log('✓ 修复无效的周期起始日')
      }
      
      return true
    } catch (error) {
      console.error('修复周期设置失败:', error)
      return false
    }
  },
  
  // 修复预算数据格式
  fixBudgetDataFormat() {
    console.log('=== 修复预算数据格式 ===')
    
    try {
      const budgets = wx.getStorageSync('budgets') || []
      const incomeExpectations = wx.getStorageSync('incomeExpectations') || []
      
      let hasChanges = false
      
      // 修复预算数据格式
      budgets.forEach(budget => {
        if (typeof budget.amount === 'string') {
          budget.amount = parseInt(budget.amount) || 0
          hasChanges = true
        }
        if (!budget.id) {
          budget.id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
          hasChanges = true
        }
        if (!budget.createTime) {
          budget.createTime = new Date().toISOString()
          hasChanges = true
        }
      })
      
      // 修复收入预期数据格式
      incomeExpectations.forEach(expectation => {
        if (typeof expectation.amount === 'string') {
          expectation.amount = parseInt(expectation.amount) || 0
          hasChanges = true
        }
        if (!expectation.id) {
          expectation.id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
          hasChanges = true
        }
        if (!expectation.createTime) {
          expectation.createTime = new Date().toISOString()
          hasChanges = true
        }
      })
      
      if (hasChanges) {
        wx.setStorageSync('budgets', budgets)
        wx.setStorageSync('incomeExpectations', incomeExpectations)
        console.log('✓ 预算数据格式修复完成')
      }
      
      return true
    } catch (error) {
      console.error('修复预算数据格式失败:', error)
      return false
    }
  },
  
  // 修复分类数据格式
  fixCategoryDataFormat() {
    console.log('=== 修复分类数据格式 ===')
    
    try {
      const customCategories = wx.getStorageSync('customCategories') || []
      
      let hasChanges = false
      
      customCategories.forEach(category => {
        if (!category._id) {
          category._id = `custom_${category.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          hasChanges = true
        }
        if (!category.createTime) {
          category.createTime = new Date().toISOString()
          hasChanges = true
        }
        if (category.isCustom === undefined) {
          category.isCustom = true
          hasChanges = true
        }
      })
      
      if (hasChanges) {
        wx.setStorageSync('customCategories', customCategories)
        console.log('✓ 分类数据格式修复完成')
      }
      
      return true
    } catch (error) {
      console.error('修复分类数据格式失败:', error)
      return false
    }
  },
  
  // 运行完整的数据一致性修复
  async runFullFix() {
    console.log('开始数据一致性修复...\n')
    
    const results = {
      accountBalance: false,
      cycleSetting: false,
      budgetDataFormat: false,
      categoryDataFormat: false
    }
    
    try {
      // 依次执行各项修复
      results.accountBalance = await this.fixAccountBalance()
      results.cycleSetting = this.fixCycleSetting()
      results.budgetDataFormat = this.fixBudgetDataFormat()
      results.categoryDataFormat = this.fixCategoryDataFormat()
      
      // 统计修复结果
      const successCount = Object.values(results).filter(r => r).length
      const totalCount = Object.keys(results).length
      
      console.log('\n=== 数据一致性修复结果 ===')
      console.log(`成功修复: ${successCount}/${totalCount}`)
      
      if (successCount === totalCount) {
        console.log('🎉 数据一致性修复完成！')
        
        wx.showModal({
          title: '修复完成',
          content: '数据一致性问题已修复，所有功能现在应该正常工作。',
          showCancel: false,
          confirmText: '知道了'
        })
      } else {
        console.log('⚠️ 部分修复未成功，请检查具体错误信息')
        
        const failedItems = Object.entries(results)
          .filter(([key, value]) => !value)
          .map(([key]) => key)
        
        wx.showModal({
          title: '修复部分完成',
          content: `以下项目修复失败: ${failedItems.join(', ')}`,
          showCancel: false,
          confirmText: '知道了'
        })
      }
      
      return results
    } catch (error) {
      console.error('数据一致性修复过程中发生错误:', error)
      
      wx.showModal({
        title: '修复失败',
        content: `修复过程中发生错误: ${error.message}`,
        showCancel: false,
        confirmText: '知道了'
      })
      
      return results
    }
  }
}

// 导出修复工具
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FixDataConsistency
}

// 如果在小程序环境中，提供全局访问
if (typeof wx !== 'undefined') {
  getApp().globalData.fixDataConsistency = FixDataConsistency
}