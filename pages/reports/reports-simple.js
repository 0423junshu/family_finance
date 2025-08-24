// pages/reports/reports-simple.js
// 简化版财务报表页面

Page({
  data: {
    // 日期相关
    dateRange: 'month', // week, month, quarter, year
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    
    // 标签页
    currentTab: 0,
    
    // 加载状态
    loading: true,
    
    // 统计数据
    summary: {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      totalIncomeDisplay: '0.00',
      totalExpenseDisplay: '0.00',
      balanceDisplay: '0.00'
    },
    
    // 分类统计
    categoryStats: {
      income: [],
      expense: []
    }
  },

  onLoad() {
    this.initData()
  },
  
  onShow() {
    this.loadData()
  },
  
  // 初始化数据
  initData() {
    const now = new Date()
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth()
    })
  },
  
  // 加载数据
  async loadData() {
    this.setData({ loading: true })
    
    try {
      // 获取日期范围
      const { startDate, endDate } = this.getDateRange()
      
      // 获取交易数据
      const transactions = this.getTransactionsInRange(startDate, endDate)
      
      // 计算统计数据
      this.calculateSummary(transactions)
      
      // 计算分类统计
      this.calculateCategoryStats(transactions)
      
      this.setData({ loading: false })
    } catch (error) {
      console.error('加载报表数据失败:', error)
      this.setData({ loading: false })
    }
  },
  
  // 获取日期范围
  getDateRange() {
    const { dateRange, currentYear, currentMonth } = this.data
    let startDate, endDate
    
    switch (dateRange) {
      case 'week':
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        startDate = weekStart.toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        break
      case 'month':
        startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
        endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
        break
      case 'quarter':
        const quarterMonth = Math.floor(currentMonth / 3) * 3
        startDate = new Date(currentYear, quarterMonth, 1).toISOString().split('T')[0]
        endDate = new Date(currentYear, quarterMonth + 3, 0).toISOString().split('T')[0]
        break
      case 'year':
        startDate = new Date(currentYear, 0, 1).toISOString().split('T')[0]
        endDate = new Date(currentYear, 11, 31).toISOString().split('T')[0]
        break
    }
    
    return { startDate, endDate }
  },
  
  // 获取指定日期范围内的交易
  getTransactionsInRange(startDate, endDate) {
    // 从本地存储获取交易记录
    const allTransactions = wx.getStorageSync('transactions') || []
    
    // 过滤日期范围内的交易
    return allTransactions.filter(t => {
      const transactionDate = t.date
      return transactionDate >= startDate && transactionDate <= endDate
    })
  },
  
  // 计算统计数据
  calculateSummary(transactions) {
    let totalIncome = 0
    let totalExpense = 0
    
    transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount
      } else if (t.type === 'expense') {
        totalExpense += t.amount
      }
    })
    
    const balance = totalIncome - totalExpense
    
    this.setData({
      'summary.totalIncome': totalIncome,
      'summary.totalExpense': totalExpense,
      'summary.balance': balance,
      'summary.totalIncomeDisplay': (totalIncome / 100).toFixed(2),
      'summary.totalExpenseDisplay': (totalExpense / 100).toFixed(2),
      'summary.balanceDisplay': (balance / 100).toFixed(2)
    })
  },
  
  // 计算分类统计
  calculateCategoryStats(transactions) {
    // 按类型和分类分组
    const incomeByCategory = {}
    const expenseByCategory = {}
    
    transactions.forEach(t => {
      if (t.type === 'income') {
        if (!incomeByCategory[t.category]) {
          incomeByCategory[t.category] = 0
        }
        incomeByCategory[t.category] += t.amount
      } else if (t.type === 'expense') {
        if (!expenseByCategory[t.category]) {
          expenseByCategory[t.category] = 0
        }
        expenseByCategory[t.category] += t.amount
      }
    })
    
    // 转换为数组并计算百分比
    const incomeCategories = Object.keys(incomeByCategory).map(name => {
      const amount = incomeByCategory[name]
      const percentage = this.data.summary.totalIncome > 0 
        ? Math.round(amount / this.data.summary.totalIncome * 100) 
        : 0
      
      return {
        name,
        amount,
        amountDisplay: (amount / 100).toFixed(2),
        percentage,
        progressWidth: `${percentage}%`
      }
    }).sort((a, b) => b.amount - a.amount)
    
    const expenseCategories = Object.keys(expenseByCategory).map(name => {
      const amount = expenseByCategory[name]
      const percentage = this.data.summary.totalExpense > 0 
        ? Math.round(amount / this.data.summary.totalExpense * 100) 
        : 0
      
      return {
        name,
        amount,
        amountDisplay: (amount / 100).toFixed(2),
        percentage,
        progressWidth: `${percentage}%`
      }
    }).sort((a, b) => b.amount - a.amount)
    
    this.setData({
      'categoryStats.income': incomeCategories,
      'categoryStats.expense': expenseCategories
    })
  },
  
  // 切换日期范围
  onDateRangeChange(e) {
    const range = e.currentTarget.dataset.range
    this.setData({ dateRange: range }, () => {
      this.loadData()
    })
  },
  
  // 切换标签页
  onTabChange(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    this.setData({ currentTab: index })
  },
  
  // 显示年份选择器
  showYearPicker() {
    // 实现年份选择器
    wx.showActionSheet({
      itemList: ['2023年', '2024年', '2025年'],
      success: (res) => {
        const year = 2023 + res.tapIndex
        this.setData({ currentYear: year }, () => {
          this.loadData()
        })
      }
    })
  },
  
  // 显示月份选择器
  showMonthPicker() {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    wx.showActionSheet({
      itemList: months,
      success: (res) => {
        this.setData({ currentMonth: res.tapIndex }, () => {
          this.loadData()
        })
      }
    })
  },
  
  // 查看分类详情
  viewCategoryDetail(e) {
    const { category, type } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/transaction-list/transaction-list?category=${category}&type=${type}`
    })
  }
})