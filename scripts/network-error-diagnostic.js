/**
 * 网络错误诊断和修复工具
 * 专门解决 "TypeError: Failed to fetch" 错误
 */

class NetworkErrorDiagnostic {
  
  // 诊断网络错误
  static async diagnoseNetworkError() {
    console.log('=== 开始网络错误诊断 ===')
    
    const diagnosticResult = {
      timestamp: new Date().toISOString(),
      errors: [],
      fixes: [],
      recommendations: []
    }
    
    // 1. 检查网络连接状态
    const networkStatus = await this.checkNetworkConnection()
    console.log('网络连接状态:', networkStatus)
    
    if (!networkStatus.isConnected) {
      diagnosticResult.errors.push({
        type: 'NETWORK_DISCONNECTED',
        message: '设备未连接到网络',
        severity: 'HIGH'
      })
      diagnosticResult.fixes.push('请检查设备网络连接')
    }
    
    // 2. 检查云开发初始化状态
    const cloudStatus = this.checkCloudInitialization()
    console.log('云开发状态:', cloudStatus)
    
    if (!cloudStatus.initialized) {
      diagnosticResult.errors.push({
        type: 'CLOUD_NOT_INITIALIZED',
        message: '云开发未正确初始化',
        severity: 'HIGH'
      })
      diagnosticResult.fixes.push('检查 app.js 中的云开发配置')
    }
    
    // 3. 检查云函数可用性
    const cloudFunctionStatus = await this.testCloudFunctions()
    console.log('云函数状态:', cloudFunctionStatus)
    
    if (cloudFunctionStatus.hasErrors) {
      diagnosticResult.errors.push({
        type: 'CLOUD_FUNCTION_ERROR',
        message: '云函数调用失败',
        severity: 'MEDIUM',
        details: cloudFunctionStatus.errors
      })
      diagnosticResult.fixes.push('启用离线模式或检查云函数部署')
    }
    
    // 4. 检查本地存储回退机制
    const fallbackStatus = this.checkFallbackMechanism()
    console.log('回退机制状态:', fallbackStatus)
    
    if (!fallbackStatus.available) {
      diagnosticResult.errors.push({
        type: 'FALLBACK_UNAVAILABLE',
        message: '本地存储回退机制不可用',
        severity: 'MEDIUM'
      })
      diagnosticResult.fixes.push('确保 NetworkUtil 正确加载')
    }
    
    // 5. 生成修复建议
    this.generateRecommendations(diagnosticResult)
    
    console.log('=== 诊断完成 ===')
    console.log('发现错误:', diagnosticResult.errors.length)
    console.log('修复建议:', diagnosticResult.fixes.length)
    
    return diagnosticResult
  }
  
  // 检查网络连接
  static async checkNetworkConnection() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          resolve({
            isConnected: res.networkType !== 'none',
            networkType: res.networkType,
            timestamp: Date.now()
          })
        },
        fail: (error) => {
          resolve({
            isConnected: false,
            networkType: 'unknown',
            error: error.errMsg,
            timestamp: Date.now()
          })
        }
      })
    })
  }
  
  // 检查云开发初始化
  static checkCloudInitialization() {
    const app = getApp()
    
    return {
      initialized: !!(wx.cloud && app.globalData.isCloudEnabled),
      cloudSDK: !!wx.cloud,
      globalDataFlag: !!(app.globalData && app.globalData.isCloudEnabled),
      envId: app.globalData.cloudEnvId || 'unknown'
    }
  }
  
  // 测试云函数
  static async testCloudFunctions() {
    const testFunctions = ['login', 'manageBudget', 'manageCategory']
    const results = {
      hasErrors: false,
      errors: [],
      successful: [],
      total: testFunctions.length
    }
    
    for (const functionName of testFunctions) {
      try {
        // 使用超时测试
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('测试超时')), 3000)
        })
        
        const testPromise = wx.cloud.callFunction({
          name: functionName,
          data: { action: 'test' }
        })
        
        await Promise.race([testPromise, timeoutPromise])
        results.successful.push(functionName)
        
      } catch (error) {
        results.hasErrors = true
        results.errors.push({
          function: functionName,
          error: error.message || error.errMsg,
          code: error.errCode
        })
      }
    }
    
    return results
  }
  
  // 检查回退机制
  static checkFallbackMechanism() {
    try {
      const NetworkUtil = require('./utils/network.js')
      
      return {
        available: !!NetworkUtil,
        methods: {
          safeCloudCall: typeof NetworkUtil.safeCloudCall === 'function',
          getLocalFallback: typeof NetworkUtil.getLocalFallback === 'function',
          checkNetworkStatus: typeof NetworkUtil.checkNetworkStatus === 'function'
        }
      }
    } catch (error) {
      return {
        available: false,
        error: error.message
      }
    }
  }
  
  // 生成修复建议
  static generateRecommendations(diagnosticResult) {
    const { errors } = diagnosticResult
    
    // 基于错误类型生成建议
    if (errors.some(e => e.type === 'NETWORK_DISCONNECTED')) {
      diagnosticResult.recommendations.push({
        priority: 'HIGH',
        action: '检查网络连接',
        description: '确保设备连接到稳定的网络'
      })
    }
    
    if (errors.some(e => e.type === 'CLOUD_NOT_INITIALIZED')) {
      diagnosticResult.recommendations.push({
        priority: 'HIGH',
        action: '修复云开发配置',
        description: '检查 app.js 中的云环境ID配置'
      })
    }
    
    if (errors.some(e => e.type === 'CLOUD_FUNCTION_ERROR')) {
      diagnosticResult.recommendations.push({
        priority: 'MEDIUM',
        action: '启用离线模式',
        description: '使用本地存储确保应用正常运行'
      })
    }
    
    // 通用建议
    diagnosticResult.recommendations.push({
      priority: 'LOW',
      action: '定期同步数据',
      description: '网络恢复后同步离线期间的数据变更'
    })
  }
  
  // 自动修复网络错误
  static async autoFixNetworkErrors() {
    console.log('=== 开始自动修复网络错误 ===')
    
    const fixes = []
    
    try {
      // 1. 重新初始化云开发
      if (wx.cloud) {
        wx.cloud.init({
          env: 'cloud1-7gb1x63o23c1e5f2',
          traceUser: true
        })
        fixes.push('重新初始化云开发')
      }
      
      // 2. 清理异常的网络请求缓存
      this.clearNetworkCache()
      fixes.push('清理网络缓存')
      
      // 3. 重置网络工具状态
      this.resetNetworkUtil()
      fixes.push('重置网络工具')
      
      // 4. 验证本地数据完整性
      this.validateLocalData()
      fixes.push('验证本地数据')
      
      console.log('自动修复完成:', fixes)
      
      wx.showToast({
        title: '网络错误已修复',
        icon: 'success',
        duration: 2000
      })
      
      return { success: true, fixes }
      
    } catch (error) {
      console.error('自动修复失败:', error)
      
      wx.showToast({
        title: '修复失败，请手动处理',
        icon: 'none',
        duration: 3000
      })
      
      return { success: false, error: error.message }
    }
  }
  
  // 清理网络缓存
  static clearNetworkCache() {
    try {
      // 清理可能的异常请求缓存
      wx.removeStorageSync('network_cache')
      wx.removeStorageSync('failed_requests')
      console.log('网络缓存已清理')
    } catch (error) {
      console.error('清理网络缓存失败:', error)
    }
  }
  
  // 重置网络工具
  static resetNetworkUtil() {
    try {
      const app = getApp()
      if (app.globalData.NetworkUtil) {
        // 重新检查网络状态
        app.globalData.NetworkUtil.checkNetworkStatus().then(status => {
          app.globalData.networkStatus = status
          console.log('网络状态已更新:', status)
        })
      }
    } catch (error) {
      console.error('重置网络工具失败:', error)
    }
  }
  
  // 验证本地数据
  static validateLocalData() {
    try {
      const requiredKeys = ['categories', 'accounts', 'budgets']
      
      requiredKeys.forEach(key => {
        const data = wx.getStorageSync(key)
        if (!data || !Array.isArray(data)) {
          console.warn(`本地数据 ${key} 异常，将重置为默认值`)
          this.resetDefaultData(key)
        }
      })
      
      console.log('本地数据验证完成')
    } catch (error) {
      console.error('验证本地数据失败:', error)
    }
  }
  
  // 重置默认数据
  static resetDefaultData(key) {
    const NetworkUtil = require('./utils/network.js')
    
    switch (key) {
      case 'categories':
        wx.setStorageSync('categories', NetworkUtil.getDefaultCategories())
        break
      case 'accounts':
        wx.setStorageSync('accounts', NetworkUtil.getDefaultAccounts())
        break
      case 'budgets':
        wx.setStorageSync('budgets', [])
        break
    }
  }
  
  // 显示诊断报告
  static showDiagnosticReport(diagnosticResult) {
    const { errors, fixes, recommendations } = diagnosticResult
    
    let reportText = '=== 网络诊断报告 ===\n'
    reportText += `诊断时间: ${new Date(diagnosticResult.timestamp).toLocaleString()}\n\n`
    
    if (errors.length > 0) {
      reportText += '发现问题:\n'
      errors.forEach((error, index) => {
        reportText += `${index + 1}. ${error.message} (${error.severity})\n`
      })
      reportText += '\n'
    }
    
    if (fixes.length > 0) {
      reportText += '修复建议:\n'
      fixes.forEach((fix, index) => {
        reportText += `${index + 1}. ${fix}\n`
      })
      reportText += '\n'
    }
    
    if (recommendations.length > 0) {
      reportText += '优化建议:\n'
      recommendations.forEach((rec, index) => {
        reportText += `${index + 1}. [${rec.priority}] ${rec.action}: ${rec.description}\n`
      })
    }
    
    console.log(reportText)
    
    // 显示简化的用户提示
    if (errors.length === 0) {
      wx.showToast({
        title: '网络状态正常',
        icon: 'success'
      })
    } else {
      wx.showModal({
        title: '网络诊断',
        content: `发现 ${errors.length} 个问题，建议查看控制台获取详细信息`,
        showCancel: false
      })
    }
    
    return reportText
  }
  
  // 运行完整诊断
  static async runFullDiagnostic() {
    wx.showLoading({ title: '诊断中...' })
    
    try {
      const diagnosticResult = await this.diagnoseNetworkError()
      wx.hideLoading()
      
      const report = this.showDiagnosticReport(diagnosticResult)
      
      // 如果有严重错误，提供自动修复选项
      const hasHighSeverityErrors = diagnosticResult.errors.some(e => e.severity === 'HIGH')
      
      if (hasHighSeverityErrors) {
        wx.showModal({
          title: '发现严重网络问题',
          content: '是否尝试自动修复？',
          success: async (res) => {
            if (res.confirm) {
              await this.autoFixNetworkErrors()
            }
          }
        })
      }
      
      return { diagnosticResult, report }
      
    } catch (error) {
      wx.hideLoading()
      console.error('诊断过程出错:', error)
      
      wx.showToast({
        title: '诊断失败',
        icon: 'none'
      })
      
      throw error
    }
  }
}

// 导出诊断工具
module.exports = NetworkErrorDiagnostic

// 如果在小程序环境中，添加到全局
if (typeof getApp === 'function') {
  const app = getApp()
  if (app.globalData) {
    app.globalData.NetworkErrorDiagnostic = NetworkErrorDiagnostic
  }
}

// 自动运行诊断（仅在开发环境）
if (typeof wx !== 'undefined' && wx.getSystemInfoSync().platform === 'devtools') {
  console.log('开发环境检测到，运行网络诊断...')
  setTimeout(() => {
    NetworkErrorDiagnostic.runFullDiagnostic().catch(console.error)
  }, 2000)
}