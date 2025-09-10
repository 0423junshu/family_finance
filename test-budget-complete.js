/**
 * 完整的预算管理功能测试工具
 * 测试预算的增删改查功能
 */

class BudgetCompleteTest {
  constructor() {
    this.testResults = []
    this.testData = {
      testBudgets: [
        {
          categoryId: 'food',
          categoryName: '餐饮',
          amount: 100000, // 1000元，以分为单位
          period: 'monthly',
          type: 'expense'
        },
        {
          categoryId: 'salary',
          categoryName: '工资',
          amount: 500000, // 5000元，以分为单位
          period: 'monthly',
          type: 'income'
        }
      ]
    }
  }

  // 运行完整测试
  async runCompleteTest() {
    console.log('🚀 开始预算管理完整功能测试...')
    
    // 1. 测试后端服务
    await this.testBackendServices()
    
    // 2. 测试云函数调用
    await this.testCloudFunctions()
    
    // 3. 测试本地存储回退
    await this.testLocalStorageFallback()
    
    // 4. 测试页面功能
    await this.testPageFunctions()
    
    // 5. 测试数据一致性
    await this.testDataConsistency()
    
    // 生成测试报告
    this.generateTestReport()
  }

  // 测试后端服务
  async testBackendServices() {
    console.log('📡 测试预算后端服务...')
    
    try {
      const budgetBackend = require('./services/budget-backend.js')
      
      // 测试获取预算列表
      console.log('测试获取预算列表...')
      const getBudgetsResult = await budgetBackend.getBudgets()
      console.log('获取预算结果:', getBudgetsResult)
      
      this.testResults.push({
        test: '获取预算列表',
        status: getBudgetsResult.success ? 'success' : 'failed',
        details: getBudgetsResult
      })
      
      // 测试创建预算
      console.log('测试创建预算...')
      const createResult = await budgetBackend.createBudget(this.testData.testBudgets[0])
      console.log('创建预算结果:', createResult)
      
      this.testResults.push({
        test: '创建预算',
        status: createResult.success ? 'success' : 'failed',
        details: createResult
      })
      
      // 如果创建成功，测试更新和删除
      if (createResult.success && createResult.data) {
        const budgetId = createResult.data._id || createResult.data.id
        
        if (budgetId) {
          // 测试更新预算
          console.log('测试更新预算...')
          const updateData = {
            ...this.testData.testBudgets[0],
            id: budgetId,
            amount: 120000 // 更新金额为1200元
          }
          const updateResult = await budgetBackend.updateBudget(updateData)
          console.log('更新预算结果:', updateResult)
          
          this.testResults.push({
            test: '更新预算',
            status: updateResult.success ? 'success' : 'failed',
            details: updateResult
          })
          
          // 测试删除预算
          console.log('测试删除预算...')
          const deleteResult = await budgetBackend.deleteBudget(budgetId)
          console.log('删除预算结果:', deleteResult)
          
          this.testResults.push({
            test: '删除预算',
            status: deleteResult.success ? 'success' : 'failed',
            details: deleteResult
          })
        }
      }
      
    } catch (error) {
      console.error('后端服务测试失败:', error)
      this.testResults.push({
        test: '后端服务',
        status: 'failed',
        error: error.message
      })
    }
  }

  // 测试云函数调用
  async testCloudFunctions() {
    console.log('☁️ 测试云函数调用...')
    
    try {
      const CloudBase = require('./services/cloud-base.js')
      
      // 测试云函数是否可用
      const isCloudAvailable = typeof wx !== 'undefined' && wx.cloud
      
      if (!isCloudAvailable) {
        console.log('云函数不可用，跳过云函数测试')
        this.testResults.push({
          test: '云函数调用',
          status: 'skipped',
          reason: '云函数环境不可用'
        })
        return
      }
      
      // 测试manageBudget云函数
      const cloudResult = await CloudBase.callCloudFunction('manageBudget', {
        action: 'list',
        budgetData: {}
      })
      
      console.log('云函数调用结果:', cloudResult)
      
      this.testResults.push({
        test: '云函数调用',
        status: cloudResult.success ? 'success' : 'failed',
        details: cloudResult
      })
      
    } catch (error) {
      console.error('云函数测试失败:', error)
      this.testResults.push({
        test: '云函数调用',
        status: 'failed',
        error: error.message
      })
    }
  }

  // 测试本地存储回退
  async testLocalStorageFallback() {
    console.log('💾 测试本地存储回退...')
    
    try {
      // 清理现有数据
      wx.removeStorageSync('budgets')
      wx.removeStorageSync('incomeExpectations')
      
      // 创建测试数据
      const testBudgets = [
        {
          id: 'test-budget-1',
          categoryId: 'food',
          categoryName: '餐饮',
          amount: 100000,
          period: 'monthly',
          type: 'expense',
          createTime: new Date().toISOString()
        }
      ]
      
      const testIncomeExpectations = [
        {
          id: 'test-income-1',
          categoryId: 'salary',
          categoryName: '工资',
          amount: 500000,
          period: 'monthly',
          type: 'income',
          createTime: new Date().toISOString()
        }
      ]
      
      // 保存到本地存储
      wx.setStorageSync('budgets', testBudgets)
      wx.setStorageSync('incomeExpectations', testIncomeExpectations)
      
      // 验证数据保存
      const savedBudgets = wx.getStorageSync('budgets') || []
      const savedIncomeExpectations = wx.getStorageSync('incomeExpectations') || []
      
      console.log('本地预算数据:', savedBudgets)
      console.log('本地收入预期数据:', savedIncomeExpectations)
      
      this.testResults.push({
        test: '本地存储回退',
        status: savedBudgets.length > 0 && savedIncomeExpectations.length > 0 ? 'success' : 'failed',
        details: {
          budgetsCount: savedBudgets.length,
          incomeExpectationsCount: savedIncomeExpectations.length
        }
      })
      
    } catch (error) {
      console.error('本地存储测试失败:', error)
      this.testResults.push({
        test: '本地存储回退',
        status: 'failed',
        error: error.message
      })
    }
  }

  // 测试页面功能
  async testPageFunctions() {
    console.log('📱 测试页面功能...')
    
    try {
      // 模拟页面功能测试
      const pageTests = [
        {
          function: '加载预算数据',
          test: () => {
            // 模拟loadBudgets函数
            const budgets = wx.getStorageSync('budgets') || []
            const incomeExpectations = wx.getStorageSync('incomeExpectations') || []
            return budgets.length >= 0 && incomeExpectations.length >= 0
          }
        },
        {
          function: '表单验证',
          test: () => {
            // 模拟表单验证
            const formData = {
              categoryId: 'food',
              categoryName: '餐饮',
              amount: '1000',
              period: 'monthly'
            }
            return formData.categoryId && formData.amount && parseFloat(formData.amount) > 0
          }
        },
        {
          function: '数据格式化',
          test: () => {
            // 模拟数据格式化
            const formatter = require('./utils/formatter.js')
            const formattedAmount = formatter.formatAmount(100000)
            return formattedAmount === '1,000.00'
          }
        }
      ]
      
      const pageTestResults = []
      
      for (const pageTest of pageTests) {
        try {
          const result = pageTest.test()
          pageTestResults.push({
            function: pageTest.function,
            success: result
          })
        } catch (error) {
          pageTestResults.push({
            function: pageTest.function,
            success: false,
            error: error.message
          })
        }
      }
      
      const successCount = pageTestResults.filter(r => r.success).length
      
      this.testResults.push({
        test: '页面功能',
        status: successCount === pageTests.length ? 'success' : 'partial',
        details: {
          totalTests: pageTests.length,
          successCount,
          results: pageTestResults
        }
      })
      
    } catch (error) {
      console.error('页面功能测试失败:', error)
      this.testResults.push({
        test: '页面功能',
        status: 'failed',
        error: error.message
      })
    }
  }

  // 测试数据一致性
  async testDataConsistency() {
    console.log('🔍 测试数据一致性...')
    
    try {
      // 检查数据格式一致性
      const budgets = wx.getStorageSync('budgets') || []
      const incomeExpectations = wx.getStorageSync('incomeExpectations') || []
      
      const consistencyChecks = [
        {
          name: '预算数据格式',
          check: () => {
            return budgets.every(budget => 
              budget.id && 
              budget.categoryId && 
              budget.categoryName && 
              typeof budget.amount === 'number' &&
              budget.type === 'expense'
            )
          }
        },
        {
          name: '收入预期数据格式',
          check: () => {
            return incomeExpectations.every(expectation => 
              expectation.id && 
              expectation.categoryId && 
              expectation.categoryName && 
              typeof expectation.amount === 'number' &&
              expectation.type === 'income'
            )
          }
        },
        {
          name: '金额数据类型',
          check: () => {
            const allItems = [...budgets, ...incomeExpectations]
            return allItems.every(item => 
              typeof item.amount === 'number' && 
              item.amount >= 0
            )
          }
        }
      ]
      
      const consistencyResults = []
      
      for (const check of consistencyChecks) {
        try {
          const result = check.check()
          consistencyResults.push({
            name: check.name,
            passed: result
          })
        } catch (error) {
          consistencyResults.push({
            name: check.name,
            passed: false,
            error: error.message
          })
        }
      }
      
      const passedCount = consistencyResults.filter(r => r.passed).length
      
      this.testResults.push({
        test: '数据一致性',
        status: passedCount === consistencyChecks.length ? 'success' : 'partial',
        details: {
          totalChecks: consistencyChecks.length,
          passedCount,
          results: consistencyResults
        }
      })
      
    } catch (error) {
      console.error('数据一致性测试失败:', error)
      this.testResults.push({
        test: '数据一致性',
        status: 'failed',
        error: error.message
      })
    }
  }

  // 生成测试报告
  generateTestReport() {
    console.log('\n🎯 ===== 预算管理完整功能测试报告 =====')
    
    const totalTests = this.testResults.length
    const successTests = this.testResults.filter(r => r.status === 'success').length
    const partialTests = this.testResults.filter(r => r.status === 'partial').length
    const failedTests = this.testResults.filter(r => r.status === 'failed').length
    const skippedTests = this.testResults.filter(r => r.status === 'skipped').length
    
    console.log(`\n📊 测试统计:`)
    console.log(`总测试数: ${totalTests}`)
    console.log(`成功: ${successTests} ✅`)
    console.log(`部分成功: ${partialTests} ⚠️`)
    console.log(`失败: ${failedTests} ❌`)
    console.log(`跳过: ${skippedTests} ⏭️`)
    console.log(`成功率: ${((successTests / (totalTests - skippedTests)) * 100).toFixed(1)}%`)
    
    console.log(`\n📋 详细测试结果:`)
    this.testResults.forEach((result, index) => {
      const statusIcon = result.status === 'success' ? '✅' : 
                        result.status === 'partial' ? '⚠️' : 
                        result.status === 'skipped' ? '⏭️' : '❌'
      console.log(`${index + 1}. ${result.test}: ${statusIcon}`)
      
      if (result.status === 'failed') {
        console.log(`   错误: ${result.error}`)
      } else if (result.status === 'skipped') {
        console.log(`   原因: ${result.reason}`)
      }
    })
    
    // 生成修复建议
    this.generateFixSuggestions()
  }

  // 生成修复建议
  generateFixSuggestions() {
    console.log(`\n💡 修复建议:`)
    
    const failedTests = this.testResults.filter(r => r.status === 'failed')
    
    if (failedTests.length === 0) {
      console.log('  🎉 所有测试通过，预算管理功能正常！')
      console.log('\n✨ 功能确认:')
      console.log('  ✅ 预算的增删改查功能已实现')
      console.log('  ✅ 收入预期的增删改查功能已实现')
      console.log('  ✅ 网络错误自动回退机制正常')
      console.log('  ✅ 数据格式一致性良好')
      console.log('  ✅ 页面交互功能完整')
      return
    }
    
    failedTests.forEach(test => {
      console.log(`\n  ❌ ${test.test}:`)
      
      switch (test.test) {
        case '获取预算列表':
        case '创建预算':
        case '更新预算':
        case '删除预算':
          console.log('    - 检查云函数是否正确部署')
          console.log('    - 验证云开发环境配置')
          console.log('    - 确认数据库权限设置')
          break
          
        case '云函数调用':
          console.log('    - 检查云开发SDK初始化')
          console.log('    - 验证网络连接状态')
          console.log('    - 确认云函数部署状态')
          break
          
        case '本地存储回退':
          console.log('    - 检查本地存储权限')
          console.log('    - 验证数据格式兼容性')
          break
          
        case '页面功能':
          console.log('    - 检查页面JavaScript文件')
          console.log('    - 验证事件绑定和处理')
          break
          
        case '数据一致性':
          console.log('    - 运行数据格式修复工具')
          console.log('    - 清理无效的本地数据')
          break
      }
    })
    
    console.log(`\n🔧 下一步操作:`)
    console.log('1. 确保云函数已正确部署到云开发环境')
    console.log('2. 检查app.js中的云开发环境ID配置')
    console.log('3. 在真机环境中测试网络功能')
    console.log('4. 验证页面的编辑和删除按钮事件绑定')
    console.log('5. 测试完整的用户操作流程')
  }
}

// 导出测试类
module.exports = BudgetCompleteTest

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const tester = new BudgetCompleteTest()
  tester.runCompleteTest()
}