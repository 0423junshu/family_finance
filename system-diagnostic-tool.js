// 系统诊断工具 - 检查功能优化问题
const SystemDiagnostic = {
  
  // 1. 预算管理模块诊断
  async diagnoseBudgetModule() {
    console.log('=== 预算管理模块诊断 ===')
    const issues = []
    
    try {
      // 检查云函数服务是否可用
      console.log('检查预算后端服务...')
      const { getBudgets, createBudget } = require('../../services/budget-backend')
      
      // 测试获取预算数据
      try {
        const result = await getBudgets()
        console.log('✓ getBudgets() 调用成功:', result)
        
        if (!result.success) {
          issues.push({
            type: 'API_ERROR',
            module: 'budget',
            message: `getBudgets() 返回错误: ${result.error}`,
            severity: 'HIGH'
          })
        }
      } catch (error) {
        issues.push({
          type: 'FUNCTION_ERROR',
          module: 'budget',
          message: `getBudgets() 调用失败: ${error.message}`,
          severity: 'CRITICAL',
          stack: error.stack
        })
      }
      
      // 检查本地存储数据格式
      const localBudgets = wx.getStorageSync('budgets') || []
      console.log('本地预算数据:', localBudgets)
      
      if (localBudgets.length > 0) {
        const sampleBudget = localBudgets[0]
        const requiredFields = ['id', 'categoryId', 'categoryName', 'amount', 'period']
        
        requiredFields.forEach(field => {
          if (!sampleBudget.hasOwnProperty(field)) {
            issues.push({
              type: 'DATA_FORMAT',
              module: 'budget',
              message: `预算数据缺少必需字段: ${field}`,
              severity: 'MEDIUM'
            })
          }
        })
      }
      
    } catch (error) {
      issues.push({
        type: 'MODULE_ERROR',
        module: 'budget',
        message: `预算模块加载失败: ${error.message}`,
        severity: 'CRITICAL'
      })
    }
    
    return issues
  },
  
  // 2. 周期设置诊断
  async diagnoseCycleSetting() {
    console.log('=== 周期设置诊断 ===')
    const issues = []
    
    try {
      // 检查周期设置数据
      const cycleSetting = wx.getStorageSync('cycleSetting')
      console.log('当前周期设置:', cycleSetting)
      
      if (!cycleSetting) {
        issues.push({
          type: 'CONFIG_MISSING',
          module: 'cycle',
          message: '周期设置数据不存在，使用默认值',
          severity: 'LOW'
        })
      } else {
        // 验证周期设置格式
        if (!cycleSetting.startDay || cycleSetting.startDay < 1 || cycleSetting.startDay > 31) {
          issues.push({
            type: 'CONFIG_INVALID',
            module: 'cycle',
            message: `周期起始日设置无效: ${cycleSetting.startDay}`,
            severity: 'HIGH'
          })
        }
      }
      
      // 测试周期计算逻辑
      const testDate = new Date('2024-01-20')
      const startDay = cycleSetting?.startDay || 1
      
      let cycleStartDate, cycleEndDate
      if (testDate.getDate() >= startDay) {
        cycleStartDate = new Date(testDate.getFullYear(), testDate.getMonth(), startDay)
        cycleEndDate = new Date(testDate.getFullYear(), testDate.getMonth() + 1, startDay - 1)
      } else {
        cycleStartDate = new Date(testDate.getFullYear(), testDate.getMonth() - 1, startDay)
        cycleEndDate = new Date(testDate.getFullYear(), testDate.getMonth(), startDay - 1)
      }
      
      console.log('周期计算测试:')
      console.log(`测试日期: ${testDate.toLocaleDateString()}`)
      console.log(`周期开始: ${cycleStartDate.toLocaleDateString()}`)
      console.log(`周期结束: ${cycleEndDate.toLocaleDateString()}`)
      
      // 检查各模块是否使用相同的周期逻辑
      const modulesToCheck = [
        'pages/budget-manage/budget-manage.js',
        'pages/reports/reports.js',
        'pages/stats/stats.js'
      ]
      
      // 这里需要实际检查各模块的周期计算逻辑是否一致
      console.log('需要检查以下模块的周期计算逻辑一致性:', modulesToCheck)
      
    } catch (error) {
      issues.push({
        type: 'CYCLE_ERROR',
        module: 'cycle',
        message: `周期设置检查失败: ${error.message}`,
        severity: 'HIGH'
      })
    }
    
    return issues
  },
  
  // 3. 数据一致性诊断
  async diagnoseDataConsistency() {
    console.log('=== 数据一致性诊断 ===')
    const issues = []
    
    try {
      // 检查各种数据存储
      const storageKeys = [
        'budgets',
        'incomeExpectations', 
        'customCategories',
        'accounts',
        'transactions',
        'cycleSetting'
      ]
      
      const storageData = {}
      storageKeys.forEach(key => {
        storageData[key] = wx.getStorageSync(key)
        console.log(`${key}:`, storageData[key])
      })
      
      // 检查数据格式一致性
      if (storageData.budgets && Array.isArray(storageData.budgets)) {
        storageData.budgets.forEach((budget, index) => {
          if (typeof budget.amount !== 'number') {
            issues.push({
              type: 'DATA_TYPE',
              module: 'budget',
              message: `预算${index}的金额字段类型错误: ${typeof budget.amount}`,
              severity: 'MEDIUM'
            })
          }
        })
      }
      
      // 检查分类数据一致性
      if (storageData.customCategories && Array.isArray(storageData.customCategories)) {
        storageData.customCategories.forEach((category, index) => {
          const requiredFields = ['_id', 'name', 'type', 'icon', 'color']
          requiredFields.forEach(field => {
            if (!category.hasOwnProperty(field)) {
              issues.push({
                type: 'DATA_FORMAT',
                module: 'category',
                message: `分类${index}缺少字段: ${field}`,
                severity: 'MEDIUM'
              })
            }
          })
        })
      }
      
      // 检查账户余额一致性
      if (storageData.accounts && storageData.transactions) {
        console.log('执行账户余额一致性检查...')
        // 这里可以调用现有的数据一致性检查服务
        try {
          const dataConsistency = require('../../services/data-consistency')
          const consistencyResult = await dataConsistency.performFullConsistencyCheck(false)
          
          if (consistencyResult.needFix) {
            issues.push({
              type: 'CONSISTENCY_ERROR',
              module: 'account',
              message: '账户余额与交易记录不一致',
              severity: 'HIGH',
              details: consistencyResult.detailedMessage
            })
          }
        } catch (error) {
          issues.push({
            type: 'CONSISTENCY_CHECK_ERROR',
            module: 'account',
            message: `数据一致性检查失败: ${error.message}`,
            severity: 'MEDIUM'
          })
        }
      }
      
    } catch (error) {
      issues.push({
        type: 'DIAGNOSTIC_ERROR',
        module: 'consistency',
        message: `数据一致性诊断失败: ${error.message}`,
        severity: 'HIGH'
      })
    }
    
    return issues
  },
  
  // 4. 接口调用诊断
  async diagnoseAPIIntegration() {
    console.log('=== 接口调用诊断 ===')
    const issues = []
    
    try {
      // 检查云函数配置
      const app = getApp()
      if (!app.globalData.cloud) {
        issues.push({
          type: 'CLOUD_CONFIG',
          module: 'api',
          message: '云开发环境未初始化',
          severity: 'CRITICAL'
        })
      }
      
      // 测试各个后端服务
      const services = [
        { name: 'budget-backend', path: '../../services/budget-backend' },
        { name: 'category-backend', path: '../../services/category-backend' }
      ]
      
      for (const service of services) {
        try {
          const serviceModule = require(service.path)
          console.log(`✓ ${service.name} 服务加载成功`)
          
          // 检查服务方法是否存在
          const expectedMethods = {
            'budget-backend': ['getBudgets', 'createBudget', 'updateBudget', 'deleteBudget'],
            'category-backend': ['getCategories', 'createCategory', 'updateCategory', 'deleteCategory']
          }
          
          const methods = expectedMethods[service.name] || []
          methods.forEach(method => {
            if (typeof serviceModule[method] !== 'function') {
              issues.push({
                type: 'METHOD_MISSING',
                module: service.name,
                message: `服务方法不存在: ${method}`,
                severity: 'HIGH'
              })
            }
          })
          
        } catch (error) {
          issues.push({
            type: 'SERVICE_LOAD_ERROR',
            module: service.name,
            message: `服务加载失败: ${error.message}`,
            severity: 'CRITICAL'
          })
        }
      }
      
    } catch (error) {
      issues.push({
        type: 'API_DIAGNOSTIC_ERROR',
        module: 'api',
        message: `接口诊断失败: ${error.message}`,
        severity: 'HIGH'
      })
    }
    
    return issues
  },
  
  // 5. 环境信息收集
  collectEnvironmentInfo() {
    console.log('=== 环境信息收集 ===')
    
    const envInfo = {
      // 系统信息
      systemInfo: await this.getSystemInfoCompat(),
      
      // 小程序版本信息
      appVersion: wx.getAccountInfoSync(),
      
      // 存储使用情况
      storageInfo: wx.getStorageInfoSync(),
      
      // 网络状态
      networkType: 'unknown', // 需要异步获取
      
      // 云开发环境
      cloudEnvironment: getApp().globalData.cloudEnvironment || 'unknown',
      
      // 当前时间
      currentTime: new Date().toISOString(),
      
      // 本地存储数据概览
      localDataSummary: {
        budgets: (wx.getStorageSync('budgets') || []).length,
        categories: (wx.getStorageSync('customCategories') || []).length,
        accounts: (wx.getStorageSync('accounts') || []).length,
        transactions: (wx.getStorageSync('transactions') || []).length
      }
    }
    
    // 异步获取网络信息
    wx.getNetworkType({
      success: (res) => {
        envInfo.networkType = res.networkType
      }
    })
    
    console.log('环境信息:', envInfo)
    return envInfo
  },
  
  // 6. 运行完整诊断
  async runFullDiagnostic() {
    console.log('开始系统诊断...\n')
    
    const diagnosticResults = {
      timestamp: new Date().toISOString(),
      environment: this.collectEnvironmentInfo(),
      issues: []
    }
    
    try {
      // 运行各项诊断
      const budgetIssues = await this.diagnoseBudgetModule()
      const cycleIssues = await this.diagnoseCycleSetting()
      const consistencyIssues = await this.diagnoseDataConsistency()
      const apiIssues = await this.diagnoseAPIIntegration()
      
      diagnosticResults.issues = [
        ...budgetIssues,
        ...cycleIssues,
        ...consistencyIssues,
        ...apiIssues
      ]
      
      // 按严重程度分类
      const criticalIssues = diagnosticResults.issues.filter(i => i.severity === 'CRITICAL')
      const highIssues = diagnosticResults.issues.filter(i => i.severity === 'HIGH')
      const mediumIssues = diagnosticResults.issues.filter(i => i.severity === 'MEDIUM')
      const lowIssues = diagnosticResults.issues.filter(i => i.severity === 'LOW')
      
      console.log('\n=== 诊断结果汇总 ===')
      console.log(`严重问题: ${criticalIssues.length}`)
      console.log(`高优先级问题: ${highIssues.length}`)
      console.log(`中优先级问题: ${mediumIssues.length}`)
      console.log(`低优先级问题: ${lowIssues.length}`)
      
      if (criticalIssues.length > 0) {
        console.log('\n🚨 严重问题需要立即修复:')
        criticalIssues.forEach(issue => {
          console.log(`- [${issue.module}] ${issue.message}`)
        })
      }
      
      if (highIssues.length > 0) {
        console.log('\n⚠️ 高优先级问题:')
        highIssues.forEach(issue => {
          console.log(`- [${issue.module}] ${issue.message}`)
        })
      }
      
      // 生成修复建议
      const suggestions = this.generateFixSuggestions(diagnosticResults.issues)
      console.log('\n💡 修复建议:')
      suggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion}`)
      })
      
    } catch (error) {
      console.error('诊断过程中发生错误:', error)
      diagnosticResults.error = error.message
    }
    
    return diagnosticResults
  },
  
  // 7. 生成修复建议
  generateFixSuggestions(issues) {
    const suggestions = []
    
    // 根据问题类型生成建议
    const issueTypes = [...new Set(issues.map(i => i.type))]
    
    issueTypes.forEach(type => {
      switch (type) {
        case 'FUNCTION_ERROR':
          suggestions.push('检查云函数部署状态，确保所有云函数正确部署并配置权限')
          break
        case 'API_ERROR':
          suggestions.push('检查云函数返回数据格式，确保与前端期望格式一致')
          break
        case 'DATA_FORMAT':
          suggestions.push('统一数据格式标准，建立数据模型验证机制')
          break
        case 'CONFIG_MISSING':
        case 'CONFIG_INVALID':
          suggestions.push('检查配置数据完整性，提供默认配置和验证机制')
          break
        case 'CONSISTENCY_ERROR':
          suggestions.push('运行数据一致性修复工具，重新计算账户余额')
          break
        case 'CLOUD_CONFIG':
          suggestions.push('初始化云开发环境，检查 app.js 中的云开发配置')
          break
        case 'SERVICE_LOAD_ERROR':
          suggestions.push('检查服务文件路径和依赖关系，确保所有服务正确导入')
          break
      }
    })
    
    // 去重
    return [...new Set(suggestions)]
  }
}

// 导出诊断工具
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SystemDiagnostic
}

// 如果在小程序环境中，自动运行诊断
if (typeof wx !== 'undefined') {
  // 延迟执行，避免影响页面加载
  setTimeout(() => {
    SystemDiagnostic.runFullDiagnostic()
  }, 2000)
}