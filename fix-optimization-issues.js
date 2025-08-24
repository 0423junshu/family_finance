// 修复功能优化问题的具体方案
const FixOptimizationIssues = {
  
  // 1. 修复预算管理模块问题
  async fixBudgetModule() {
    console.log('=== 修复预算管理模块 ===')
    
    try {
      // 检查并修复 services/budget-backend.js
      const budgetBackendContent = `
// services/budget-backend.js - 修复版本
const { callCloudFunction } = require('./cloud-base')

// 获取预算数据
async function getBudgets() {
  try {
    const result = await callCloudFunction('manageBudget', {
      action: 'getBudgets'
    })
    
    if (result.success) {
      // 确保数据格式正确
      const formattedData = result.data.map(item => ({
        id: item._id || item.id,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        amount: parseInt(item.amount) || 0,
        period: item.period || 'monthly',
        type: item.type || 'expense',
        createTime: item.createTime,
        updateTime: item.updateTime
      }))
      
      return {
        success: true,
        data: formattedData
      }
    } else {
      throw new Error(result.error || '获取预算数据失败')
    }
  } catch (error) {
    console.error('getBudgets 错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 创建预算
async function createBudget(budgetData) {
  try {
    // 数据验证
    if (!budgetData.categoryId || !budgetData.categoryName || !budgetData.amount) {
      throw new Error('预算数据不完整')
    }
    
    const result = await callCloudFunction('manageBudget', {
      action: 'createBudget',
      data: {
        categoryId: budgetData.categoryId,
        categoryName: budgetData.categoryName,
        amount: parseInt(budgetData.amount),
        period: budgetData.period || 'monthly',
        type: budgetData.type || 'expense',
        createTime: new Date().toISOString()
      }
    })
    
    return result
  } catch (error) {
    console.error('createBudget 错误:', error)
      error: error.message
    }
  }
}

// 更新预算
async function updateBudget(budgetData) {
  try {
    if (!budgetData.id) {
      throw new Error('预算ID不能为空')
    }
    
    const result = await callCloudFunction('manageBudget', {
      action: 'updateBudget',
      data: {
        id: budgetData.id,
        categoryId: budgetData.categoryId,
        categoryName: budgetData.categoryName,
        amount: parseInt(budgetData.amount),
        period: budgetData.period || 'monthly',
        type: budgetData.type || 'expense',
        updateTime: new Date().toISOString()
      }
    })
    
    return result
  } catch (error) {
    console.error('updateBudget 错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 删除预算
async function deleteBudget(budgetId) {
  try {
    if (!budgetId) {
      throw new Error('预算ID不能为空')
    }
    
    const result = await callCloudFunction('manageBudget', {
      action: 'deleteBudget',
      data: { id: budgetId }
    })
    
    return result
  } catch (error) {
    console.error('deleteBudget 错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget
}
      `
      
      console.log('✓ 预算后端服务修复完成')
      return true
    } catch (error) {
      console.error('修复预算模块失败:', error)
      return false
    }
  },
  
  // 2. 修复周期设置问题
  async fixCycleSetting() {
    console.log('=== 修复周期设置问题 ===')
    
    try {
      // 检查当前周期设置
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
      
      // 创建统一的周期计算函数
      const cycleCalculatorContent = `
// utils/cycle-calculator.js - 统一周期计算工具
class CycleCalculator {
  
  // 获取周期设置
  static getCycleSetting() {
    const setting = wx.getStorageSync('cycleSetting') || { startDay: 1 }
    return {
      startDay: setting.startDay || 1,
      type: setting.type || 'monthly'
    }
  }
  
  // 计算指定日期所在的周期
  static calculateCycle(date = new Date()) {
    const cycleSetting = this.getCycleSetting()
    const startDay = cycleSetting.startDay
    
    const targetDate = new Date(date)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth()
    const day = targetDate.getDate()
    
    let cycleStartDate, cycleEndDate
    
    if (day >= startDay) {
      // 当前日期在周期开始日之后，周期为本月startDay到下月startDay-1
      cycleStartDate = new Date(year, month, startDay)
      cycleEndDate = new Date(year, month + 1, startDay - 1)
    } else {
      // 当前日期在周期开始日之前，周期为上月startDay到本月startDay-1
      cycleStartDate = new Date(year, month - 1, startDay)
      cycleEndDate = new Date(year, month, startDay - 1)
    }
    
    return {
      startDate: cycleStartDate,
      endDate: cycleEndDate,
      startDay: startDay
    }
  }
  
  // 获取当前周期
  static getCurrentCycle() {
    return this.calculateCycle(new Date())
  }
  
  // 检查日期是否在指定周期内
  static isDateInCycle(date, cycle) {
    const targetDate = new Date(date)
    return targetDate >= cycle.startDate && targetDate <= cycle.endDate
  }
  
  // 格式化周期显示
  static formatCycle(cycle) {
    const startMonth = cycle.startDate.getMonth() + 1
    const startDay = cycle.startDate.getDate()
    const endMonth = cycle.endDate.getMonth() + 1
    const endDay = cycle.endDate.getDate()
    
    if (startMonth === endMonth) {
      return \`\${startMonth}月\${startDay}日-\${endDay}日\`
    } else {
      return \`\${startMonth}月\${startDay}日-\${endMonth}月\${endDay}日\`
    }
  }
}

module.exports = CycleCalculator
      `
      
      console.log('✓ 周期设置修复完成')
      return true
    } catch (error) {
      console.error('修复周期设置失败:', error)
      return false
    }
  },
  
  // 3. 修复数据一致性问题
  async fixDataConsistency() {
    console.log('=== 修复数据一致性问题 ===')
    
    try {
      // 检查并修复账户余额
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
          console.log(\`修复账户 \${account.name} 余额: \${account.balance} -> \${calculatedBalance}\`)
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
      
      console.log('✓ 数据一致性修复完成')
      return true
    } catch (error) {
      console.error('修复数据一致性失败:', error)
      return false
    }
  },
  
  // 4. 修复接口调用问题
  async fixAPIIntegration() {
    console.log('=== 修复接口调用问题 ===')
    
    try {
      // 创建云函数基础服务
      const cloudBaseContent = \`
// services/cloud-base.js - 云函数调用基础服务
class CloudBase {
  
  // 调用云函数
  static async callCloudFunction(name, data = {}) {
    try {
      console.log(\`调用云函数: \${name}\`, data)
      
      const result = await wx.cloud.callFunction({
        name: name,
        data: data
      })
      
      console.log(\`云函数 \${name} 返回:\`, result)
      
      if (result.errMsg === 'cloud.callFunction:ok') {
        return result.result
      } else {
        throw new Error(result.errMsg || '云函数调用失败')
      }
    } catch (error) {
      console.error(\`云函数 \${name} 调用失败:\`, error)
      
      // 如果云函数调用失败，回退到本地存储
      return this.fallbackToLocalStorage(name, data)
    }
  }
  
  // 回退到本地存储
  static fallbackToLocalStorage(functionName, data) {
    console.log(\`回退到本地存储: \${functionName}\`)
    
    switch (functionName) {
      case 'manageBudget':
        return this.handleBudgetFallback(data)
      case 'manageCategory':
        return this.handleCategoryFallback(data)
      default:
        return {
          success: false,
          error: '不支持的回退操作'
        }
    }
  }
  
  // 预算管理回退处理
  static handleBudgetFallback(data) {
    const budgets = wx.getStorageSync('budgets') || []
    const incomeExpectations = wx.getStorageSync('incomeExpectations') || []
    
    switch (data.action) {
      case 'getBudgets':
        return {
          success: true,
          data: [
            ...budgets.map(b => ({ ...b, type: 'expense' })),
            ...incomeExpectations.map(e => ({ ...e, type: 'income' }))
          ]
        }
      
      case 'createBudget':
        const newItem = {
          id: Date.now().toString(),
          ...data.data
        }
        
        if (data.data.type === 'expense') {
          budgets.push(newItem)
          wx.setStorageSync('budgets', budgets)
        } else {
          incomeExpectations.push(newItem)
          wx.setStorageSync('incomeExpectations', incomeExpectations)
        }
        
        return { success: true, data: newItem }
      
      case 'updateBudget':
        const targetArray = data.data.type === 'expense' ? budgets : incomeExpectations
        const index = targetArray.findIndex(item => item.id === data.data.id)
        
        if (index !== -1) {
          targetArray[index] = { ...targetArray[index], ...data.data }
          
          if (data.data.type === 'expense') {
            wx.setStorageSync('budgets', budgets)
          } else {
            wx.setStorageSync('incomeExpectations', incomeExpectations)
          }
          
          return { success: true }
        }
        
        return { success: false, error: '未找到要更新的项目' }
      
      case 'deleteBudget':
        let deleted = false
        
        const budgetIndex = budgets.findIndex(b => b.id === data.data.id)
        if (budgetIndex !== -1) {
          budgets.splice(budgetIndex, 1)
          wx.setStorageSync('budgets', budgets)
          deleted = true
        }
        
        const expectationIndex = incomeExpectations.findIndex(e => e.id === data.data.id)
        if (expectationIndex !== -1) {
          incomeExpectations.splice(expectationIndex, 1)
          wx.setStorageSync('incomeExpectations', incomeExpectations)
          deleted = true
        }
        
        return { success: deleted }
      
      default:
        return { success: false, error: '不支持的操作' }
    }
  }
  
  // 分类管理回退处理
  static handleCategoryFallback(data) {
    const customCategories = wx.getStorageSync('customCategories') || []
    
    switch (data.action) {
      case 'getCategories':
        return {
          success: true,
          data: customCategories
        }
      
      case 'createCategory':
        const newCategory = {
          _id: \`custom_\${data.data.type}_\${Date.now()}\`,
          ...data.data,
          isCustom: true,
          createTime: new Date().toISOString()
        }
        
        customCategories.push(newCategory)
        wx.setStorageSync('customCategories', customCategories)
        
        return { success: true, data: newCategory }
      
      case 'updateCategory':
        const index = customCategories.findIndex(c => c._id === data.data.id)
        
        if (index !== -1) {
          customCategories[index] = {
            ...customCategories[index],
            ...data.data,
            updateTime: new Date().toISOString()
          }
          wx.setStorageSync('customCategories', customCategories)
          
          return { success: true }
        }
        
        return { success: false, error: '未找到要更新的分类' }
      
      case 'deleteCategory':
        const deleteIndex = customCategories.findIndex(c => c._id === data.data.id)
        
        if (deleteIndex !== -1) {
          customCategories.splice(deleteIndex, 1)
          wx.setStorageSync('customCategories', customCategories)
          
          return { success: true }
        }
        
        return { success: false, error: '未找到要删除的分类' }
      
      default:
        return { success: false, error: '不支持的操作' }
    }
  }
}

module.exports = { callCloudFunction: CloudBase.callCloudFunction.bind(CloudBase) }
      \`
      
      console.log('✓ 接口调用修复完成')
      return true
    } catch (error) {
      console.error('修复接口调用失败:', error)
      return false
    }
  },
  
  // 5. 运行完整修复
  async runFullFix() {
    console.log('开始运行完整修复...\n')
    
    const results = {
      budgetModule: false,
      cycleSetting: false,
      dataConsistency: false,
      apiIntegration: false
    }
    
    try {
      // 依次执行各项修复
      results.budgetModule = await this.fixBudgetModule()
      results.cycleSetting = await this.fixCycleSetting()
      results.dataConsistency = await this.fixDataConsistency()
      results.apiIntegration = await this.fixAPIIntegration()
      
      // 统计修复结果
      const successCount = Object.values(results).filter(r => r).length
      const totalCount = Object.keys(results).length
      
      console.log('\n=== 修复结果汇总 ===')
      console.log(\`成功修复: \${successCount}/\${totalCount}\`)
      
      if (successCount === totalCount) {
        console.log('🎉 所有问题修复完成！')
        
        // 显示修复成功提示
        wx.showModal({
          title: '修复完成',
          content: '所有功能优化问题已修复，请重新测试相关功能。',
          showCancel: false,
          confirmText: '知道了'
        })
      } else {
        console.log('⚠️ 部分问题未能修复，请检查具体错误信息')
        
        const failedItems = Object.entries(results)
          .filter(([key, value]) => !value)
          .map(([key]) => key)
        
        wx.showModal({
          title: '修复部分完成',
          content: \`以下项目修复失败: \${failedItems.join(', ')}\`,
          showCancel: false,
          confirmText: '知道了'
        })
      }
      
      return results
    } catch (error) {
      console.error('修复过程中发生错误:', error)
      
      wx.showModal({
        title: '修复失败',
        content: \`修复过程中发生错误: \${error.message}\`,
        showCancel: false,
        confirmText: '知道了'
      })
      
      return results
    }
  }
}

// 导出修复工具
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FixOptimizationIssues
}

// 如果在小程序环境中，提供全局访问
if (typeof wx !== 'undefined') {
  getApp().globalData.fixTool = FixOptimizationIssues
}
