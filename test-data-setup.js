// 测试数据设置 - 用于验证功能是否正常工作
// 这个文件可以在开发者工具控制台中运行来设置测试数据

// 设置测试账户数据
const testAccounts = [
  {
    id: '1',
    name: '现金',
    type: 'cash',
    balance: 100000, // 1000元
    initialBalance: 50000, // 初始500元
    icon: '💰'
  },
  {
    id: '2', 
    name: '招商银行',
    type: 'bank',
    balance: 500000, // 5000元
    initialBalance: 400000, // 初始4000元
    icon: '🏦'
  },
  {
    id: '3',
    name: '支付宝',
    type: 'wallet', 
    balance: 50000, // 500元
    initialBalance: 30000, // 初始300元
    icon: '📱'
  }
]

// 设置测试交易数据（故意制造不一致）
const testTransactions = [
  {
    id: '1',
    type: 'expense',
    amount: 20000, // 200元支出
    accountId: '1',
    category: '餐饮',
    date: '2024-01-15',
    description: '午餐'
  },
  {
    id: '2',
    type: 'income',
    amount: 50000, // 500元收入
    accountId: '2',
    category: '工资',
    date: '2024-01-10',
    description: '工资'
  },
  {
    id: '3',
    type: 'expense',
    amount: 10000, // 100元支出
    accountId: '3',
    category: '交通',
    date: '2024-01-12',
    description: '打车'
  }
]

// 设置测试投资数据
const testInvestments = [
  {
    id: '1',
    name: '余额宝',
    type: 'fund',
    amount: 200000, // 2000元
    profit: 1500, // 15元收益
    profitRate: 0.75,
    icon: '📈'
  }
]

// 在控制台中运行以下代码来设置测试数据：
console.log('设置测试数据...')
wx.setStorageSync('accounts', testAccounts)
wx.setStorageSync('transactions', testTransactions)
wx.setStorageSync('investments', testInvestments)
wx.setStorageSync('totalAssets', 850000) // 故意设置错误的总资产值来触发不一致检查

console.log('测试数据设置完成！')
console.log('账户数据:', testAccounts)
console.log('交易数据:', testTransactions)
console.log('投资数据:', testInvestments)

// 计算预期的账户余额（用于验证）
console.log('预期账户余额计算：')
testAccounts.forEach(account => {
  const accountTransactions = testTransactions.filter(t => t.accountId === account.id)
  let expectedBalance = account.initialBalance
  
  accountTransactions.forEach(t => {
    if (t.type === 'income') {
      expectedBalance += t.amount
    } else if (t.type === 'expense') {
      expectedBalance -= t.amount
    }
  })
  
  console.log(`${account.name}: 当前余额 ${account.balance/100}元, 预期余额 ${expectedBalance/100}元, 差异 ${(expectedBalance - account.balance)/100}元`)
})