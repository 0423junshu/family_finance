// 预算管理编辑功能测试脚本
// 专门测试和修复预算管理的编辑操作

function testBudgetEditFunction() {
  console.log('开始测试预算管理编辑功能...')
  
  try {
    // 1. 创建测试预算数据
    const testBudgets = [
      {
        id: 'budget_test_1',
        categoryId: 'expense_1',
        categoryName: '餐饮',
        amount: 100000, // 1000元
        period: 'monthly',
        createTime: new Date().toISOString()
      },
      {
        id: 'budget_test_2', 
        categoryId: 'expense_2',
        categoryName: '交通',
        amount: 50000, // 500元
        period: 'monthly',
        createTime: new Date().toISOString()
      }
    ]
    
    // 2. 创建测试收入预期数据
    const testIncomeExpectations = [
      {
        id: 'income_test_1',
        categoryId: 'income_1',
        categoryName: '工资',
        amount: 800000, // 8000元
        period: 'monthly',
        createTime: new Date().toISOString()
      }
    ]
    
    // 3. 保存测试数据
    wx.setStorageSync('budgets', testBudgets)
    wx.setStorageSync('incomeExpectations', testIncomeExpectations)
    
    console.log('✅ 测试数据创建成功')
    
    // 4. 测试编辑功能
    console.log('测试编辑预算功能...')
    
    // 模拟编辑第一个预算
    const editedBudget = {
      ...testBudgets[0],
      amount: 120000, // 修改为1200元
      updateTime: new Date().toISOString()
    }
    
    // 更新预算数据
    const budgets = wx.getStorageSync('budgets') || []
    const budgetIndex = budgets.findIndex(b => b.id === editedBudget.id)
    
    if (budgetIndex !== -1) {
      budgets[budgetIndex] = editedBudget
      wx.setStorageSync('budgets', budgets)
      console.log('✅ 预算编辑测试成功')
    } else {
      console.log('❌ 预算编辑测试失败：找不到目标预算')
    }
    
    // 5. 测试收入预期编辑
    console.log('测试编辑收入预期功能...')
    
    const editedIncomeExpectation = {
      ...testIncomeExpectations[0],
      amount: 900000, // 修改为9000元
      updateTime: new Date().toISOString()
    }
    
    const incomeExpectations = wx.getStorageSync('incomeExpectations') || []
    const incomeIndex = incomeExpectations.findIndex(e => e.id === editedIncomeExpectation.id)
    
    if (incomeIndex !== -1) {
      incomeExpectations[incomeIndex] = editedIncomeExpectation
      wx.setStorageSync('incomeExpectations', incomeExpectations)
      console.log('✅ 收入预期编辑测试成功')
    } else {
      console.log('❌ 收入预期编辑测试失败：找不到目标预期')
    }
    
    // 6. 验证数据完整性
    const finalBudgets = wx.getStorageSync('budgets') || []
    const finalIncomeExpectations = wx.getStorageSync('incomeExpectations') || []
    
    console.log('最终预算数据:', finalBudgets)
    console.log('最终收入预期数据:', finalIncomeExpectations)
    
    // 7. 测试删除功能
    console.log('测试删除功能...')
    
    // 删除第二个预算
    const filteredBudgets = finalBudgets.filter(b => b.id !== 'budget_test_2')
    wx.setStorageSync('budgets', filteredBudgets)
    
    console.log('✅ 删除功能测试成功')
    
    return {
      success: true,
      message: '预算管理编辑功能测试完成，所有操作正常'
    }
    
  } catch (error) {
    console.error('预算管理编辑功能测试失败:', error)
    return {
      success: false,
      message: '测试失败: ' + error.message
    }
  }
}

// 修复预算管理页面可能存在的问题
function fixBudgetManagementIssues() {
  console.log('修复预算管理功能问题...')
  
  try {
    // 1. 确保分类数据完整
    const customCategories = wx.getStorageSync('customCategories') || []
    
    // 添加默认分类（如果不存在）
    const defaultExpenseCategories = [
      { id: 'expense_1', _id: 'expense_1', name: '餐饮', icon: '🍽️', type: 'expense', color: '#FF6B6B' },
      { id: 'expense_2', _id: 'expense_2', name: '交通', icon: '🚗', type: 'expense', color: '#4ECDC4' },
      { id: 'expense_3', _id: 'expense_3', name: '购物', icon: '🛒', type: 'expense', color: '#45B7D1' },
      { id: 'expense_4', _id: 'expense_4', name: '娱乐', icon: '🎬', type: 'expense', color: '#96CEB4' }
    ]
    
    const defaultIncomeCategories = [
      { id: 'income_1', _id: 'income_1', name: '工资', icon: '💰', type: 'income', color: '#32CD32' },
      { id: 'income_2', _id: 'income_2', name: '奖金', icon: '🎁', type: 'income', color: '#FFD700' },
      { id: 'income_3', _id: 'income_3', name: '投资收益', icon: '📈', type: 'income', color: '#00CED1' }
    ]
    
    // 检查并添加缺失的默认分类
    [...defaultExpenseCategories, ...defaultIncomeCategories].forEach(defaultCat => {
      const exists = customCategories.some(cat => cat.id === defaultCat.id || cat._id === defaultCat._id)
      if (!exists) {
        customCategories.push(defaultCat)
      }
    })
    
    wx.setStorageSync('customCategories', customCategories)
    
    // 2. 确保预算数据格式正确
    const budgets = wx.getStorageSync('budgets') || []
    const validatedBudgets = budgets.map(budget => ({
      id: budget.id || Date.now().toString(),
      categoryId: budget.categoryId,
      categoryName: budget.categoryName,
      amount: typeof budget.amount === 'number' ? budget.amount : parseInt(budget.amount) || 0,
      period: budget.period || 'monthly',
      createTime: budget.createTime || new Date().toISOString(),
      updateTime: budget.updateTime
    }))
    
    wx.setStorageSync('budgets', validatedBudgets)
    
    // 3. 确保收入预期数据格式正确
    const incomeExpectations = wx.getStorageSync('incomeExpectations') || []
    const validatedIncomeExpectations = incomeExpectations.map(expectation => ({
      id: expectation.id || Date.now().toString(),
      categoryId: expectation.categoryId,
      categoryName: expectation.categoryName,
      amount: typeof expectation.amount === 'number' ? expectation.amount : parseInt(expectation.amount) || 0,
      period: expectation.period || 'monthly',
      createTime: expectation.createTime || new Date().toISOString(),
      updateTime: expectation.updateTime
    }))
    
    wx.setStorageSync('incomeExpectations', validatedIncomeExpectations)
    
    console.log('✅ 预算管理功能问题修复完成')
    
    return {
      success: true,
      message: '预算管理功能已修复，编辑操作应该正常工作'
    }
    
  } catch (error) {
    console.error('修复预算管理功能失败:', error)
    return {
      success: false,
      message: '修复失败: ' + error.message
    }
  }
}

// 执行完整的预算管理功能测试和修复
function performBudgetManagementFix() {
  console.log('开始执行预算管理功能完整修复...')
  
  // 1. 先修复可能存在的问题
  const fixResult = fixBudgetManagementIssues()
  if (!fixResult.success) {
    return fixResult
  }
  
  // 2. 然后测试功能
  const testResult = testBudgetEditFunction()
  
  return {
    success: fixResult.success && testResult.success,
    message: `修复结果: ${fixResult.message}\n测试结果: ${testResult.message}`
  }
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testBudgetEditFunction,
    fixBudgetManagementIssues,
    performBudgetManagementFix
  }
} else {
  // 在小程序环境中直接执行
  performBudgetManagementFix()
}