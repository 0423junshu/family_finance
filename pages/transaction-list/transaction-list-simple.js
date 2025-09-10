// pages/transaction-list/transaction-list-simple.js
// 简化版交易列表页面

const { formatDate: fmtDate } = require('../../utils/formatter')
Page({
  data: {
    loading: true,
    transactions: [],
    filteredTransactions: [],
    
    // 筛选条件
    filters: {
      type: 'all', // all, income, expense
      category: 'all',
      dateRange: 'month', // week, month, quarter, year, custom
      startDate: '',
      endDate: ''
    },
    
    // 分类列表
    categories: [],
    
    // UI状态
    showFilterPanel: false,
    
    // 日期选择
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    
    // 统计数据
    totalIncome: 0,
    totalExpense: 0,
    netAmount: 0
  },

  onLoad(options) {
    // 处理页面参数
    if (options.type) {
      this.setData({
        'filters.type': options.type
      })
    }
    
    if (options.category) {
      this.setData({
        'filters.category': options.category
      })
    }
    
    // 初始化日期范围
    this.initDateRange()
    
    // 加载分类数据
    this.loadCategories()
  },
  
  onShow() {
    // 加载交易数据
    this.loadTransactions()
  },
  
  // 初始化日期范围
  initDateRange() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    
    let startDate, endDate
    
    switch (this.data.filters.dateRange) {
      case 'week':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        startDate = fmtDate(weekStart)
        endDate = fmtDate(now)
        break
      case 'month':
        startDate = fmtDate(new Date(year, month, 1))
        endDate = fmtDate(new Date(year, month + 1, 0))
        break
      case 'quarter':
        const quarterMonth = Math.floor(month / 3) * 3
        startDate = fmtDate(new Date(year, quarterMonth, 1))
        endDate = fmtDate(new Date(year, quarterMonth + 3, 0))
        break
      case 'year':
        startDate = fmtDate(new Date(year, 0, 1))
        endDate = fmtDate(new Date(year, 11, 31))
        break
      case 'custom':
        // 自定义日期范围，默认为当前月
        startDate = fmtDate(new Date(year, month, 1))
        endDate = fmtDate(new Date(year, month + 1, 0))
        break
    }
    
    this.setData({
      'filters.startDate': startDate,
      'filters.endDate': endDate,
      currentYear: year,
      currentMonth: month
    })
  },
  
  // 加载分类数据
  loadCategories() {
    // 从本地存储获取分类数据
    const categories = wx.getStorageSync('categories') || {
      income: [
        { id: 'salary', name: '工资' },
        { id: 'bonus', name: '奖金' },
        { id: 'investment', name: '投资收益' }
      ],
      expense: [
        { id: 'food', name: '餐饮' },
        { id: 'shopping', name: '购物' },
        { id: 'transport', name: '交通' }
      ]
    }
    
    // 合并收入和支出分类
    const allCategories = [
      ...categories.income.map(c => ({ ...c, type: 'income' })),
      ...categories.expense.map(c => ({ ...c, type: 'expense' }))
    ]
    
    this.setData({ categories: allCategories })
  },
  
  // 加载交易数据
  async loadTransactions() {
    this.setData({ loading: true })
    
    try {
      // 从本地存储获取交易记录
      const transactions = wx.getStorageSync('transactions') || []
      
      // 按日期倒序排序
      const sortedTransactions = transactions.sort((a, b) => {
        return new Date(b.date) - new Date(a.date)
      })
      
      // 格式化显示数据
      const formattedTransactions = sortedTransactions.map(t => ({
        ...t,
        amountDisplay: (t.amount / 100).toFixed(2),
        dateDisplay: this.formatDate(t.date)
      }))
      
      this.setData({ 
        transactions: formattedTransactions,
        loading: false
      })
      
      // 应用筛选条件
      this.applyFilters()
    } catch (error) {
      console.error('加载交易数据失败:', error)
      this.setData({ loading: false })
    }
  },
  
  // 应用筛选条件
  applyFilters() {
    const { transactions, filters } = this.data
    
    // 筛选交易记录
    let filtered = [...transactions]
    
    // 按类型筛选
    if (filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type)
    }
    
    // 按分类筛选
    if (filters.category !== 'all') {
      filtered = filtered.filter(t => t.category === filters.category)
    }
    
    // 按日期范围筛选（改为时间戳比较，避免字符串比较误判与时区偏移）
    const startTime = new Date(`${filters.startDate}T00:00:00`).getTime()
    const endTime = new Date(`${filters.endDate}T23:59:59`).getTime()
    filtered = filtered.filter(t => {
      const txTime = new Date(t.date).getTime()
      return txTime >= startTime && txTime <= endTime
    })
    
    // 计算统计数据
    let totalIncome = 0
    let totalExpense = 0
    
    filtered.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount
      } else if (t.type === 'expense') {
        totalExpense += t.amount
      }
    })
    
    const netAmount = totalIncome - totalExpense
    
    this.setData({
      filteredTransactions: filtered,
      totalIncome,
      totalExpense,
      netAmount,
      totalIncomeDisplay: (totalIncome / 100).toFixed(2),
      totalExpenseDisplay: (totalExpense / 100).toFixed(2),
      netAmountDisplay: (netAmount / 100).toFixed(2)
    })
  },
  
  // 格式化日期
  formatDate(dateString) {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}月${day}日`
  },
  
  // 切换筛选面板
  toggleFilterPanel() {
    this.setData({
      showFilterPanel: !this.data.showFilterPanel
    })
  },
  
  // 切换交易类型筛选
  onTypeChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      'filters.type': type
    }, () => {
      this.applyFilters()
    })
  },
  
  // 切换分类筛选
  onCategoryChange(e) {
    const category = e.detail.value
    this.setData({
      'filters.category': category
    }, () => {
      this.applyFilters()
    })
  },
  
  // 切换日期范围
  onDateRangeChange(e) {
    const range = e.currentTarget.dataset.range
    this.setData({
      'filters.dateRange': range
    }, () => {
      this.initDateRange()
      this.applyFilters()
    })
  },
  
  // 选择年份
  onYearChange(e) {
    const year = parseInt(e.detail.value) + 2020
    this.setData({
      currentYear: year
    }, () => {
      this.updateDateRange()
    })
  },
  
  // 选择月份
  onMonthChange(e) {
    const month = parseInt(e.detail.value)
    this.setData({
      currentMonth: month
    }, () => {
      this.updateDateRange()
    })
  },
  
  // 更新日期范围
  updateDateRange() {
    const { currentYear, currentMonth, filters } = this.data
    
    let startDate, endDate
    
    switch (filters.dateRange) {
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
    
    this.setData({
      'filters.startDate': startDate,
      'filters.endDate': endDate
    }, () => {
      this.applyFilters()
    })
  },
  
  // 查看交易详情
  viewTransactionDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/transaction-detail/transaction-detail-simple?id=${id}`
    })
  },
  
  // 新增记账
  onAddRecord() {
    wx.navigateTo({
      url: '/pages/record/record'
    })
  }
})