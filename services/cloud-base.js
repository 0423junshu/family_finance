// services/cloud-base.js - 云函数调用基础服务
class CloudBase {
  
  // 调用云函数
  static async callCloudFunction(name, data = {}) {
    try {
      console.log(`调用云函数: ${name}`, data)
      
      // 检查网络连接
      const networkStatus = await this.checkNetwork()
      if (!networkStatus.isConnected) {
        console.log('网络连接异常，直接使用本地存储')
        return this.fallbackToLocalStorage(name, data)
      }
      
      // 检查云开发是否初始化
      if (!wx.cloud) {
        console.log('云开发SDK未初始化，尝试初始化...')
        try {
          wx.cloud.init({
            env: 'your-cloud-env-id', // 请替换为实际的云环境ID
            traceUser: true
          })
        } catch (initError) {
          console.error('云开发初始化失败:', initError)
          return this.fallbackToLocalStorage(name, data)
        }
      }
      
      // 设置超时时间
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 10000) // 10秒超时
      })
      
      const callPromise = wx.cloud.callFunction({
        name: name,
        data: data
      })
      
      const result = await Promise.race([callPromise, timeoutPromise])
      
      console.log(`云函数 ${name} 返回:`, result)
      
      if (result.errMsg === 'cloud.callFunction:ok') {
        return result.result
      } else {
        throw new Error(result.errMsg || '云函数调用失败')
      }
    } catch (error) {
      console.error(`云函数 ${name} 调用失败:`, error)
      
      // 显示网络错误提示
      if (error.message.includes('Failed to fetch') || error.message.includes('网络请求错误')) {
        wx.showToast({
          title: '网络异常，使用离线模式',
          icon: 'none',
          duration: 2000
        })
      }
      
      // 如果云函数调用失败，回退到本地存储
      return this.fallbackToLocalStorage(name, data)
    }
  }
  
  // 检查网络连接
  static async checkNetwork() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          resolve({
            isConnected: res.networkType !== 'none',
            networkType: res.networkType
          })
        },
        fail: () => {
          resolve({
            isConnected: false,
            networkType: 'unknown'
          })
        }
      })
    })
  }
  
  // 回退到本地存储
  static fallbackToLocalStorage(functionName, data) {
    console.log(`回退到本地存储: ${functionName}`)
    
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
          _id: `custom_${data.data.type}_${Date.now()}`,
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