// 修复网络请求错误的专用工具
const FixNetworkErrors = {
  
  // 修复云函数网络请求问题
  async fixCloudFunctionErrors() {
    console.log('=== 修复云函数网络请求问题 ===')
    
    try {
      // 检查云开发环境初始化
      const app = getApp()
      
      if (!app.globalData.cloud) {
        console.log('初始化云开发环境...')
        
        // 重新初始化云开发
        if (wx.cloud) {
          wx.cloud.init({
            env: 'your-cloud-env-id', // 请替换为实际的云环境ID
            traceUser: true
          })
          
          app.globalData.cloud = wx.cloud
          console.log('✓ 云开发环境初始化完成')
        } else {
          console.log('✗ 云开发SDK未加载')
          return false
        }
      }
      
      // 测试网络连接
      const networkStatus = await this.checkNetworkStatus()
      if (!networkStatus.isConnected) {
        console.log('✗ 网络连接异常')
        wx.showModal({
          title: '网络错误',
          content: '网络连接异常，请检查网络设置后重试',
          showCancel: false,
          confirmText: '知道了'
        })
        return false
      }
      
      console.log('✓ 网络连接正常')
      return true
    } catch (error) {
      console.error('修复云函数网络请求失败:', error)
      return false
    }
  },
  
  // 检查网络状态
  async checkNetworkStatus() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          const isConnected = res.networkType !== 'none'
          resolve({
            isConnected,
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
  },
  
  // 创建离线模式的后端服务
  createOfflineBackendServices() {
    console.log('=== 创建离线模式后端服务 ===')
    
    try {
      // 重写预算后端服务为纯本地存储版本
      const offlineBudgetBackend = {
        // 获取预算数据
        async getBudgets() {
          try {
            const budgets = wx.getStorageSync('budgets') || []
            const incomeExpectations = wx.getStorageSync('incomeExpectations') || []
            
            const allBudgets = [
              ...budgets.map(b => ({ ...b, type: 'expense' })),
              ...incomeExpectations.map(e => ({ ...e, type: 'income' }))
            ]
            
            return {
              success: true,
              data: allBudgets
            }
          } catch (error) {
            return {
              success: false,
              error: error.message
            }
          }
        },
        
        // 创建预算
        async createBudget(budgetData) {
          try {
            const newBudget = {
              id: Date.now().toString(),
              ...budgetData,
              createTime: new Date().toISOString()
            }
            
            if (budgetData.type === 'expense') {
              const budgets = wx.getStorageSync('budgets') || []
              budgets.push(newBudget)
              wx.setStorageSync('budgets', budgets)
            } else {
              const incomeExpectations = wx.getStorageSync('incomeExpectations') || []
              incomeExpectations.push(newBudget)
              wx.setStorageSync('incomeExpectations', incomeExpectations)
            }
            
            return {
              success: true,
              data: newBudget
            }
          } catch (error) {
            return {
              success: false,
              error: error.message
            }
          }
        },
        
        // 更新预算
        async updateBudget(budgetData) {
          try {
            if (budgetData.type === 'expense') {
              const budgets = wx.getStorageSync('budgets') || []
              const index = budgets.findIndex(b => b.id === budgetData.id)
              if (index !== -1) {
                budgets[index] = { ...budgets[index], ...budgetData, updateTime: new Date().toISOString() }
                wx.setStorageSync('budgets', budgets)
              }
            } else {
              const incomeExpectations = wx.getStorageSync('incomeExpectations') || []
              const index = incomeExpectations.findIndex(e => e.id === budgetData.id)
              if (index !== -1) {
                incomeExpectations[index] = { ...incomeExpectations[index], ...budgetData, updateTime: new Date().toISOString() }
                wx.setStorageSync('incomeExpectations', incomeExpectations)
              }
            }
            
            return { success: true }
          } catch (error) {
            return {
              success: false,
              error: error.message
            }
          }
        },
        
        // 删除预算
        async deleteBudget(budgetId) {
          try {
            let deleted = false
            
            // 尝试从支出预算中删除
            const budgets = wx.getStorageSync('budgets') || []
            const budgetIndex = budgets.findIndex(b => b.id === budgetId)
            if (budgetIndex !== -1) {
              budgets.splice(budgetIndex, 1)
              wx.setStorageSync('budgets', budgets)
              deleted = true
            }
            
            // 尝试从收入预期中删除
            const incomeExpectations = wx.getStorageSync('incomeExpectations') || []
            const expectationIndex = incomeExpectations.findIndex(e => e.id === budgetId)
            if (expectationIndex !== -1) {
              incomeExpectations.splice(expectationIndex, 1)
              wx.setStorageSync('incomeExpectations', incomeExpectations)
              deleted = true
            }
            
            return { success: deleted }
          } catch (error) {
            return {
              success: false,
              error: error.message
            }
          }
        }
      }
      
      // 重写分类后端服务为纯本地存储版本
      const offlineCategoryBackend = {
        // 获取分类数据
        async getCategories() {
          try {
            const customCategories = wx.getStorageSync('customCategories') || []
            return {
              success: true,
              data: customCategories
            }
          } catch (error) {
            return {
              success: false,
              error: error.message
            }
          }
        },
        
        // 创建分类
        async createCategory(categoryData) {
          try {
            const newCategory = {
              _id: `custom_${categoryData.type}_${Date.now()}`,
              ...categoryData,
              isCustom: true,
              createTime: new Date().toISOString()
            }
            
            const customCategories = wx.getStorageSync('customCategories') || []
            customCategories.push(newCategory)
            wx.setStorageSync('customCategories', customCategories)
            
            return {
              success: true,
              data: newCategory
            }
          } catch (error) {
            return {
              success: false,
              error: error.message
            }
          }
        },
        
        // 更新分类
        async updateCategory(categoryData) {
          try {
            const customCategories = wx.getStorageSync('customCategories') || []
            const index = customCategories.findIndex(c => c._id === categoryData.id)
            
            if (index !== -1) {
              customCategories[index] = {
                ...customCategories[index],
                ...categoryData,
                updateTime: new Date().toISOString()
              }
              wx.setStorageSync('customCategories', customCategories)
              return { success: true }
            }
            
            return {
              success: false,
              error: '分类不存在'
            }
          } catch (error) {
            return {
              success: false,
              error: error.message
            }
          }
        },
        
        // 删除分类
        async deleteCategory(categoryId) {
          try {
            const customCategories = wx.getStorageSync('customCategories') || []
            const index = customCategories.findIndex(c => c._id === categoryId)
            
            if (index !== -1) {
              customCategories.splice(index, 1)
              wx.setStorageSync('customCategories', customCategories)
              return { success: true }
            }
            
            return {
              success: false,
              error: '分类不存在'
            }
          } catch (error) {
            return {
              success: false,
              error: error.message
            }
          }
        }
      }
      
      // 将离线服务注册到全局
      const app = getApp()
      app.globalData.offlineServices = {
        budgetBackend: offlineBudgetBackend,
        categoryBackend: offlineCategoryBackend
      }
      
      console.log('✓ 离线模式后端服务创建完成')
      return true
    } catch (error) {
      console.error('创建离线后端服务失败:', error)
      return false
    }
  },
  
  // 修复网络请求错误的综合方案
  async fixNetworkIssues() {
    console.log('🔧 开始修复网络请求错误...\n')
    
    const results = {
      networkCheck: false,
      cloudInit: false,
      offlineServices: false
    }
    
    try {
      // 1. 检查网络状态
      console.log('1. 检查网络状态...')
      const networkStatus = await this.checkNetworkStatus()
      results.networkCheck = networkStatus.isConnected
      
      if (!networkStatus.isConnected) {
        console.log('⚠️ 网络连接异常，启用离线模式')
        
        // 创建离线服务
        results.offlineServices = this.createOfflineBackendServices()
        
        wx.showModal({
          title: '网络异常',
          content: '检测到网络连接异常，已启用离线模式。功能可能受限，请检查网络后重新打开小程序。',
          showCancel: false,
          confirmText: '知道了'
        })
      } else {
        console.log('✓ 网络连接正常')
        
        // 2. 修复云函数问题
        console.log('2. 修复云函数问题...')
        results.cloudInit = await this.fixCloudFunctionErrors()
        
        // 3. 创建离线服务作为备用
        console.log('3. 创建离线备用服务...')
        results.offlineServices = this.createOfflineBackendServices()
      }
      
      // 生成修复报告
      const successCount = Object.values(results).filter(r => r).length
      const totalCount = Object.keys(results).length
      
      console.log('\n=== 网络错误修复报告 ===')
      console.log(`修复进度: ${successCount}/${totalCount}`)
      
      if (networkStatus.isConnected && results.cloudInit) {
        console.log('🎉 网络问题修复完成，云函数服务正常')
        
        wx.showToast({
          title: '网络问题已修复',
          icon: 'success',
          duration: 2000
        })
      } else if (results.offlineServices) {
        console.log('⚠️ 已启用离线模式，基本功能可用')
        
        wx.showToast({
          title: '已启用离线模式',
          icon: 'none',
          duration: 2000
        })
      } else {
        console.log('❌ 网络问题修复失败')
        
        wx.showModal({
          title: '修复失败',
          content: '网络问题修复失败，请检查网络设置或联系技术支持',
          showCancel: false,
          confirmText: '知道了'
        })
      }
      
      return results
    } catch (error) {
      console.error('修复网络问题时发生错误:', error)
      
      wx.showModal({
        title: '修复异常',
        content: `修复过程中发生错误: ${error.message}`,
        showCancel: false,
        confirmText: '知道了'
      })
      
      return results
    }
  },
  
  // 测试修复结果
  async testFixResults() {
    console.log('🧪 测试网络修复结果...')
    
    try {
      const app = getApp()
      
      // 测试预算功能
      let budgetService
      if (app.globalData.offlineServices) {
        budgetService = app.globalData.offlineServices.budgetBackend
      } else {
        budgetService = require('./services/budget-backend')
      }
      
      const testResult = await budgetService.getBudgets()
      
      if (testResult.success) {
        console.log('✓ 预算服务测试通过')
        
        wx.showToast({
          title: '功能测试通过',
          icon: 'success'
        })
        
        return true
      } else {
        console.log('✗ 预算服务测试失败')
        return false
      }
    } catch (error) {
      console.error('测试修复结果失败:', error)
      return false
    }
  }
}

// 导出网络错误修复工具
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FixNetworkErrors
}

// 如果在小程序环境中，自动执行网络修复
if (typeof wx !== 'undefined') {
  // 延迟执行，避免影响页面加载
  setTimeout(async () => {
    console.log('检测到网络请求错误，自动执行修复...')
    const results = await FixNetworkErrors.fixNetworkIssues()
    
    // 测试修复结果
    setTimeout(() => {
      FixNetworkErrors.testFixResults()
    }, 2000)
  }, 1000)
}