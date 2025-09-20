/**
 * 创建测试预算数据
 * 为预算管理页面提供测试数据
 */

function createTestBudgetData() {
  console.log('🚀 创建测试预算数据...')
  
  // 创建测试预算数据
  const testBudgets = [
    {
      id: 'budget-1',
      categoryId: 'food',
      categoryName: '餐饮',
      amount: 100000, // 1000元，以分为单位
      period: 'monthly',
      type: 'expense',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    },
    {
      id: 'budget-2',
      categoryId: 'transport',
      categoryName: '交通',
      amount: 50000, // 500元
      period: 'monthly',
      type: 'expense',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    },
    {
      id: 'budget-3',
      categoryId: 'shopping',
      categoryName: '购物',
      amount: 200000, // 2000元
      period: 'monthly',
      type: 'expense',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    }
  ]
  
  // 创建测试收入预期数据
  const testIncomeExpectations = [
    {
      id: 'income-1',
      categoryId: 'salary',
      categoryName: '工资',
      amount: 800000, // 8000元
      period: 'monthly',
      type: 'income',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    },
    {
      id: 'income-2',
      categoryId: 'bonus',
      categoryName: '奖金',
      amount: 200000, // 2000元
      period: 'monthly',
      type: 'income',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    }
  ]
  
  // 创建一些测试交易记录
  const testTransactions = [
    {
      id: 'trans-1',
      amount: 15000, // 150元
      category: '餐饮',
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      description: '午餐',
      accountId: '1',
      createTime: new Date().toISOString()
    },
    {
      id: 'trans-2',
      amount: 8000, // 80元
      category: '交通',
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      description: '地铁费',
      accountId: '1',
      createTime: new Date().toISOString()
    },
    {
      id: 'trans-3',
      amount: 800000, // 8000元
      category: '工资',
      type: 'income',
      date: new Date().toISOString().split('T')[0],
      description: '月工资',
      accountId: '2',
      createTime: new Date().toISOString()
    }
  ]
  
  try {
    // 保存到本地存储
    wx.setStorageSync('budgets', testBudgets)
    wx.setStorageSync('incomeExpectations', testIncomeExpectations)
    wx.setStorageSync('transactions', testTransactions)
    
    console.log('✅ 测试数据创建成功!')
    console.log(`- 预算数据: ${testBudgets.length} 条`)
    console.log(`- 收入预期: ${testIncomeExpectations.length} 条`)
    console.log(`- 交易记录: ${testTransactions.length} 条`)
    
    return {
      success: true,
      data: {
        budgets: testBudgets,
        incomeExpectations: testIncomeExpectations,
        transactions: testTransactions
      }
    }
  } catch (error) {
    console.error('❌ 创建测试数据失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 清理测试数据
function clearTestData() {
  console.log('🧹 清理测试数据...')
  
  try {
    wx.removeStorageSync('budgets')
    wx.removeStorageSync('incomeExpectations')
    wx.removeStorageSync('transactions')
    
    console.log('✅ 测试数据清理完成!')
    return { success: true }
  } catch (error) {
    console.error('❌ 清理测试数据失败:', error)
    return { success: false, error: error.message }
  }
}

// 验证数据完整性
function validateTestData() {
  console.log('🔍 验证测试数据...')
  
  try {
    const budgets = wx.getStorageSync('budgets') || []
    const incomeExpectations = wx.getStorageSync('incomeExpectations') || []
    const transactions = wx.getStorageSync('transactions') || []
    
    const validation = {
      budgets: {
        count: budgets.length,
        valid: budgets.every(b => b.id && b.categoryName && b.amount && b.type === 'expense')
      },
      incomeExpectations: {
        count: incomeExpectations.length,
        valid: incomeExpectations.every(i => i.id && i.categoryName && i.amount && i.type === 'income')
      },
      transactions: {
        count: transactions.length,
        valid: transactions.every(t => t.id && t.amount && t.category && t.type)
      }
    }
    
    console.log('📊 数据验证结果:', validation)
    
    const allValid = validation.budgets.valid && 
                    validation.incomeExpectations.valid && 
                    validation.transactions.valid
    
    return {
      success: allValid,
      validation
    }
  } catch (error) {
    console.error('❌ 数据验证失败:', error)
    return { success: false, error: error.message }
  }
}

// 导出函数
module.exports = {
  createTestBudgetData,
  clearTestData,
  validateTestData
}

// 如果直接运行此文件，创建测试数据
if (require.main === module) {
  createTestBudgetData()
  validateTestData()
}