// services/transaction-simple.js
// 简化版交易服务，用于解决首页加载问题
const accountSync = require('./account-sync')

/**
 * 获取交易记录列表
 * @param {Object} params 查询参数
 * @returns {Object} 交易记录数据
 */
async function getTransactions(params = {}) {
  try {
    // 从本地存储获取交易记录
    const transactions = wx.getStorageSync('transactions') || []
    
    // 获取周期设置
    const cycleSettings = wx.getStorageSync('cycleSettings') || {
      cycleStartDay: 1,
      customCycleEnabled: false
    }
    
    // 生成一些模拟数据（如果本地没有数据）
    if (transactions.length === 0) {
      const mockTransactions = generateMockTransactions()
      wx.setStorageSync('transactions', mockTransactions)
      return {
        list: mockTransactions,
        total: mockTransactions.length,
        hasMore: false
      }
    }
    
    // 过滤数据（如果有日期范围）
    let filteredTransactions = [...transactions]
    
    if (params.startDate && params.endDate) {
      // 如果指定了日期范围，直接使用
      const startTime = new Date(params.startDate).getTime()
      const endTime = new Date(params.endDate).getTime()
      
      filteredTransactions = transactions.filter(t => {
        const transactionTime = new Date(t.date || t.createTime).getTime()
        return transactionTime >= startTime && transactionTime <= endTime
      })
    } else if (params.year && params.month !== undefined) {
      // 如果指定了年月，根据自定义周期计算日期范围
      const { year, month } = params
      let startDate, endDate
      
      if (cycleSettings.customCycleEnabled) {
        // 使用自定义周期
        const cycleStartDay = cycleSettings.cycleStartDay || 1
        
        // 计算周期开始日期
        startDate = new Date(year, month, cycleStartDay)
        
        // 计算周期结束日期（下个月的周期开始日期前一天）
        endDate = new Date(year, month + 1, cycleStartDay)
        endDate.setDate(endDate.getDate() - 1)
      } else {
        // 使用自然月
        startDate = new Date(year, month, 1)
        endDate = new Date(year, month + 1, 0) // 当月最后一天
      }
      
      const startTime = startDate.getTime()
      const endTime = endDate.getTime()
      
      filteredTransactions = transactions.filter(t => {
        const transactionTime = new Date(t.date || t.createTime).getTime()
        return transactionTime >= startTime && transactionTime <= endTime
      })
    }
    
    // 按日期排序
    filteredTransactions.sort((a, b) => {
      const dateA = new Date(a.date || a.createTime)
      const dateB = new Date(b.date || b.createTime)
      return dateB - dateA
    })
    
    return {
      list: filteredTransactions,
      total: filteredTransactions.length,
      hasMore: false
    }
  } catch (error) {
    console.error('获取交易记录失败:', error)
    return {
      list: [],
      total: 0,
      hasMore: false
    }
  }
}

/**
 * 获取指定周期的日期范围
 * @param {Number} year 年份
 * @param {Number} month 月份（0-11）
 * @returns {Object} 日期范围对象 {startDate, endDate}
 */
const { formatDate: fmtDate } = require('../utils/formatter')
function getCycleDateRange(year, month) {
  // 获取周期设置
  const cycleSettings = wx.getStorageSync('cycleSettings') || {
    cycleStartDay: 1,
    customCycleEnabled: false
  }
  
  let startDate, endDate
  
  if (cycleSettings.customCycleEnabled) {
    // 使用自定义周期
    const cycleStartDay = cycleSettings.cycleStartDay || 1
    
    // 计算周期开始日期
    startDate = new Date(year, month, cycleStartDay)
    
    // 计算周期结束日期（下个月的周期开始日期前一天）
    endDate = new Date(year, month + 1, cycleStartDay)
    endDate.setDate(endDate.getDate() - 1)
  } else {
    // 使用自然月
    startDate = new Date(year, month, 1)
    endDate = new Date(year, month + 1, 0) // 当月最后一天
  }
  
  return {
    startDate,
    endDate,
    startDateString: fmtDate(startDate),
    endDateString: fmtDate(endDate)
  }
}

/**
 * 生成模拟交易数据
 */
function generateMockTransactions() {
  const categories = [
    { name: '餐饮', type: 'expense' },
    { name: '交通', type: 'expense' },
    { name: '购物', type: 'expense' },
    { name: '娱乐', type: 'expense' },
    { name: '工资', type: 'income' },
    { name: '奖金', type: 'income' }
  ]
  
  const accounts = ['现金', '招商银行', '支付宝']
  const descriptions = [
    '午餐', '地铁', '超市购物', '电影票', '月薪', '年终奖',
    '咖啡', '打车', '网购', '聚餐', '兼职收入', '投资收益'
  ]
  
  const transactions = []
  const now = new Date()
  
  // 生成最近30天的数据
  for (let i = 0; i < 30; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const randomCount = Math.floor(Math.random() * 3) + 1 // 每天1-3条记录
    
    for (let j = 0; j < randomCount; j++) {
      const category = categories[Math.floor(Math.random() * categories.length)]
      const account = accounts[Math.floor(Math.random() * accounts.length)]
      const description = descriptions[Math.floor(Math.random() * descriptions.length)]
      
      // 生成随机金额
      let amount
      if (category.type === 'income') {
        amount = Math.floor(Math.random() * 500000) + 100000 // 1000-6000元
      } else {
        amount = Math.floor(Math.random() * 20000) + 500 // 5-205元
      }
      
      transactions.push({
        id: `mock_${Date.now()}_${i}_${j}`,
        _id: `mock_${Date.now()}_${i}_${j}`,
        type: category.type,
        amount: amount,
        category: category.name,
        account: account,
        accountId: getAccountIdByName(account),
        description: description,
        date: date.toISOString(),
        createTime: date.toISOString(),
        updateTime: date.toISOString()
      })
    }
  }
  
  return transactions
}

/**
 * 根据账户名称获取账户ID
 */
function getAccountIdByName(accountName) {
  const accountMap = {
    '现金': '1',
    '招商银行': '2',
    '支付宝': '3'
  }
  
  return accountMap[accountName] || '1'
}

/**
 * 创建交易记录
 */
async function createTransaction(data) {
  try {
    const transactions = wx.getStorageSync('transactions') || []
    
    // 获取分类信息，确保分类名称正确保存
    let categoryName = data.category
    if (!categoryName && data.categoryId) {
      // 从分类数据中查找分类名称
      const categories = await getCategoriesData()
      const category = categories.find(cat => cat._id === data.categoryId)
      if (category) {
        categoryName = category.name
      }
    }
    
    // 获取账户信息，确保账户名称正确保存
    let accountName = data.account
    if (!accountName && data.accountId) {
      const accounts = wx.getStorageSync('accounts') || []
      const account = accounts.find(acc => acc._id === data.accountId || acc.id === data.accountId)
      if (account) {
        accountName = account.name
      }
    }
    
    const newTransaction = {
      id: Date.now().toString(),
      _id: Date.now().toString(),
      ...data,
      category: categoryName, // 确保分类名称被保存
      account: accountName, // 确保账户名称被保存
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    }
    
    // 同步账户余额
    await accountSync.syncTransactionWithAccount(newTransaction, 'create')
    
    transactions.unshift(newTransaction)
    wx.setStorageSync('transactions', transactions)
    
    return newTransaction
  } catch (error) {
    console.error('创建交易记录失败:', error)
    throw error
  }
}

/**
 * 更新交易记录
 */
async function updateTransaction(id, data) {
  try {
    const transactions = wx.getStorageSync('transactions') || []
    const index = transactions.findIndex(t => t.id === id || t._id === id)
    
    if (index === -1) {
      throw new Error('记录不存在')
    }
    
    const oldTransaction = { ...transactions[index] }
    
    transactions[index] = {
      ...transactions[index],
      ...data,
      updateTime: new Date().toISOString()
    }
    
    // 同步账户余额
    await accountSync.syncTransactionWithAccount(transactions[index], 'update', oldTransaction)
    
    wx.setStorageSync('transactions', transactions)
    return transactions[index]
  } catch (error) {
    console.error('更新交易记录失败:', error)
    throw error
  }
}

/**
 * 删除交易记录
 */
async function deleteTransaction(id) {
  try {
    const transactions = wx.getStorageSync('transactions') || []
    const index = transactions.findIndex(t => t.id === id || t._id === id)
    
    if (index === -1) {
      throw new Error('记录不存在')
    }
    
    const deletedTransaction = transactions[index]
    
    // 同步账户余额
    await accountSync.syncTransactionWithAccount(deletedTransaction, 'delete')
    
    const filteredTransactions = transactions.filter(t => t.id !== id && t._id !== id)
    
    wx.setStorageSync('transactions', filteredTransactions)
    return true
  } catch (error) {
    console.error('删除交易记录失败:', error)
    throw error
  }
}

/**
 * 获取交易记录详情
 */
async function getTransactionDetail(id) {
  try {
    const transactions = wx.getStorageSync('transactions') || []
    const transaction = transactions.find(t => t.id === id || t._id === id)
    
    if (!transaction) {
      throw new Error('记录不存在')
    }
    
    return transaction
  } catch (error) {
    console.error('获取交易记录详情失败:', error)
    throw error
  }
}

/**
 * 验证数据一致性
 */
async function validateDataConsistency() {
  try {
    return await accountSync.validateAccountBalance()
  } catch (error) {
    console.error('验证数据一致性失败:', error)
    throw error
  }
}

/**
 * 修复数据一致性问题
 */
async function fixDataConsistency() {
  try {
    return await accountSync.fixAccountBalance()
  } catch (error) {
    console.error('修复数据一致性失败:', error)
    throw error
  }
}

/**
 * 获取分类数据
 */
async function getCategoriesData() {
  try {
    // 获取自定义分类
    const customCategories = wx.getStorageSync('customCategories') || []
    
    // 默认分类
    const defaultCategories = [
      // 支出分类
      { _id: 'expense_1', name: '餐饮', icon: '🍽️', type: 'expense', color: '#FF6B6B' },
      { _id: 'expense_2', name: '交通', icon: '🚗', type: 'expense', color: '#4ECDC4' },
      { _id: 'expense_3', name: '购物', icon: '🛒', type: 'expense', color: '#45B7D1' },
      { _id: 'expense_4', name: '娱乐', icon: '🎬', type: 'expense', color: '#96CEB4' },
      { _id: 'expense_5', name: '医疗', icon: '🏥', type: 'expense', color: '#FFEAA7' },
      { _id: 'expense_6', name: '教育', icon: '📚', type: 'expense', color: '#DDA0DD' },
      { _id: 'expense_7', name: '住房', icon: '🏠', type: 'expense', color: '#FFB6C1' },
      { _id: 'expense_8', name: '通讯', icon: '📱', type: 'expense', color: '#87CEEB' },
      
      // 收入分类
      { _id: 'income_1', name: '工资', icon: '💰', type: 'income', color: '#32CD32' },
      { _id: 'income_2', name: '奖金', icon: '🎁', type: 'income', color: '#FFD700' },
      { _id: 'income_3', name: '投资收益', icon: '📈', type: 'income', color: '#00CED1' },
      { _id: 'income_4', name: '兼职', icon: '💼', type: 'income', color: '#9370DB' },
      { _id: 'income_5', name: '礼金', icon: '🧧', type: 'income', color: '#FF69B4' },
      { _id: 'income_6', name: '退款', icon: '↩️', type: 'income', color: '#20B2AA' },
      
      // 转账分类
      { _id: 'transfer_1', name: '转账', icon: '🔄', type: 'transfer', color: '#808080' }
    ]
    
    // 合并分类
    return [...defaultCategories, ...customCategories]
  } catch (error) {
    console.error('获取分类数据失败:', error)
    return []
  }
}

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionDetail,
  validateDataConsistency,
  fixDataConsistency,
  getCycleDateRange,
  getCategoriesData
}
