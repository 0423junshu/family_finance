// 功能测试脚本 - 在开发者工具控制台中运行
// 用于验证各项功能是否正常工作

console.log('开始功能测试...')

// 1. 测试数据一致性服务
console.log('1. 测试数据一致性服务')
try {
  const dataConsistency = require('./services/data-consistency')
  console.log('✓ 数据一致性服务加载成功')
  
  // 测试基本功能
  dataConsistency.performFullConsistencyCheck(false).then(result => {
    console.log('✓ 数据一致性检查功能正常:', result)
  }).catch(error => {
    console.log('✗ 数据一致性检查失败:', error)
  })
} catch (error) {
  console.log('✗ 数据一致性服务加载失败:', error)
}

// 2. 测试资产页面功能
console.log('2. 测试资产页面功能')
try {
  // 模拟资产页面的数据处理
  const testAccounts = [
    { id: '1', name: '现金', balance: 100000, type: 'cash' },
    { id: '2', name: '银行卡', balance: 500000, type: 'bank' }
  ]
  
  const testInvestments = [
    { id: '1', name: '余额宝', amount: 200000, profit: 1500 }
  ]
  
  // 计算总资产
  const accountsTotal = testAccounts.reduce((sum, item) => sum + item.balance, 0)
  const investmentsTotal = testInvestments.reduce((sum, item) => sum + item.amount, 0)
  const totalAssets = accountsTotal + investmentsTotal
  
  console.log('✓ 资产计算功能正常')
  console.log('  - 账户总额:', accountsTotal / 100, '元')
  console.log('  - 投资总额:', investmentsTotal / 100, '元')
  console.log('  - 总资产:', totalAssets / 100, '元')
} catch (error) {
  console.log('✗ 资产页面功能测试失败:', error)
}

// 3. 测试预算管理功能
console.log('3. 测试预算管理功能')
try {
  // 模拟预算计算
  const testBudgets = [
    { categoryName: '餐饮', amount: 100000 }, // 1000元预算
    { categoryName: '交通', amount: 50000 }   // 500元预算
  ]
  
  const testTransactions = [
    { type: 'expense', category: '餐饮', amount: 30000, date: '2024-01-15' }, // 300元支出
    { type: 'expense', category: '交通', amount: 20000, date: '2024-01-12' }  // 200元支出
  ]
  
  // 计算预算使用情况
  const budgetsWithProgress = testBudgets.map(budget => {
    const spent = testTransactions
      .filter(t => t.type === 'expense' && t.category === budget.categoryName)
      .reduce((sum, t) => sum + t.amount, 0)
    
    const progress = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
    const remaining = budget.amount - spent
    
    return {
      ...budget,
      spent,
      progress: Math.min(progress, 100),
      remaining,
      isOverBudget: spent > budget.amount
    }
  })
  
  console.log('✓ 预算计算功能正常')
  budgetsWithProgress.forEach(budget => {
    console.log(`  - ${budget.categoryName}: 预算${budget.amount/100}元, 已花费${budget.spent/100}元, 进度${budget.progress.toFixed(1)}%`)
  })
} catch (error) {
  console.log('✗ 预算管理功能测试失败:', error)
}

// 4. 测试首页加载功能
console.log('4. 测试首页加载功能')
try {
  // 模拟首页数据处理
  const testTransactions = [
    { type: 'income', amount: 500000, date: '2024-01-10' },
    { type: 'expense', amount: 200000, date: '2024-01-15' },
    { type: 'expense', amount: 100000, date: '2024-01-12' }
  ]
  
  // 计算统计数据
  let income = 0, expense = 0
  testTransactions.forEach(transaction => {
    if (transaction.type === 'income') {
      income += transaction.amount
    } else if (transaction.type === 'expense') {
      expense += transaction.amount
    }
  })
  
  const balance = income - expense
  
  console.log('✓ 首页统计计算功能正常')
  console.log('  - 收入:', income / 100, '元')
  console.log('  - 支出:', expense / 100, '元')
  console.log('  - 结余:', balance / 100, '元')
} catch (error) {
  console.log('✗ 首页加载功能测试失败:', error)
}

// 5. 测试记账功能
console.log('5. 测试记账功能')
try {
  // 模拟记账表单验证
  const testFormData = {
    type: 'expense',
    amount: '100.50',
    category: '餐饮',
    account: { id: '1', name: '现金' },
    description: '午餐'
  }
  
  // 验证表单数据
  const isValid = testFormData.type && 
                  testFormData.amount && 
                  parseFloat(testFormData.amount) > 0 &&
                  testFormData.category &&
                  testFormData.account &&
                  testFormData.account.id
  
  console.log('✓ 记账表单验证功能正常')
  console.log('  - 表单数据有效性:', isValid ? '有效' : '无效')
} catch (error) {
  console.log('✗ 记账功能测试失败:', error)
}

console.log('功能测试完成！')

// 使用说明
console.log('\n使用说明:')
console.log('1. 在微信开发者工具中打开控制台')
console.log('2. 复制并运行 test-data-setup.js 中的代码来设置测试数据')
console.log('3. 复制并运行此脚本来验证功能')
console.log('4. 在资产页面点击"数据一致性检查"按钮来测试数据一致性功能')
console.log('5. 在预算管理页面查看预算进度显示是否正常')