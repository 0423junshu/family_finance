// pages/reports/reports.js
const { getTransactions } = require('../../services/transaction-simple')
const { formatDate, formatAmount } = require('../../utils/formatter')
const { showLoading, hideLoading, showToast } = require('../../utils/uiUtil')

Page({
  data: {
    loading: true,
    currentTab: 0, // 0: 收支概览, 1: 分类统计, 2: 趋势图, 3: 资产分析, 4: 标签分析
    dateRange: 'month', // week, month, quarter, year, custom
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    
    // 日期选择器
    showYearPicker: false,
    showMonthPicker: false,
    showDateRangePicker: false,
    customStartDate: '',
    customEndDate: '',
    
    // 统计数据
    summary: {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0
    },
    
    // 分类统计
    categoryStats: {
      expense: [],
      income: []
    },
    
    // 标签统计
    tagStats: {
      expense: [],
      income: []
    },
    
    // 趋势数据
    trendData: [],
    
    // 资产数据
    assetData: {
      accounts: [],
      investments: [],
      totalAssets: 0,
      assetsDistribution: []
    },
    
    // 显示选项
    showOptions: false,
    
    // 周期设置
    cycleStartDay: 1, // 默认为1号
    
    // 查看全部按钮状态
    viewAllEnabled: true
  },

  onLoad() {
    this.initData()
  },

  onShow() {
    // 获取周期设置
    const cycleSettings = wx.getStorageSync('cycleSettings') || { startDay: 1 }
    this.setData({
      cycleStartDay: cycleSettings.startDay || 1
    })
    
    this.loadReportData()
  },

  // 初始化数据
  initData() {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    // 设置默认的自定义日期范围为当月
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth(),
      customStartDate: startOfMonth,
      customEndDate: today
    })
  },

  // 加载报表数据
  async loadReportData() {
    try {
      this.setData({ loading: true })
      showLoading('加载中...')
      
      // 根据当前选择的时间范围获取开始和结束日期
      const { startDate, endDate } = this.getDateRange()
      
      // 获取交易数据
      const params = { startDate, endDate }
      const result = await getTransactions(params)
      const transactions = result.list || []
      
      // 计算统计数据
      this.calculateSummary(transactions)
      
      // 计算分类统计
      this.calculateCategoryStats(transactions)
      
      // 计算标签统计
      this.calculateTagStats(transactions)
      
      // 计算趋势数据
      this.calculateTrendData(transactions)
      
      // 加载资产数据
      await this.loadAssetData()
      
      this.setData({ loading: false })
      hideLoading()
    } catch (error) {
      console.error('加载报表数据失败:', error)
      hideLoading()
      showToast('加载失败，请重试', 'error')
      this.setData({ loading: false })
    }
  },

  // 获取日期范围
  getDateRange() {
    const { currentYear, currentMonth, dateRange, customStartDate, customEndDate, cycleStartDay } = this.data
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
        // 使用自定义周期起始日
        const today = new Date()
        const currentDay = today.getDate()
        
        if (currentDay >= cycleStartDay) {
          // 当前日期大于等于周期起始日，则统计本月cycleStartDay到下月cycleStartDay-1
          startDate = new Date(today.getFullYear(), today.getMonth(), cycleStartDay).toISOString().split('T')[0]
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, cycleStartDay - 1).toISOString().split('T')[0]
        } else {
          // 当前日期小于周期起始日，则统计上月cycleStartDay到本月cycleStartDay-1
          startDate = new Date(today.getFullYear(), today.getMonth() - 1, cycleStartDay).toISOString().split('T')[0]
          endDate = new Date(today.getFullYear(), today.getMonth(), cycleStartDay - 1).toISOString().split('T')[0]
        }
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
      case 'custom':
        startDate = customStartDate
        endDate = customEndDate
        break
      default:
        startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
        endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
    }
    
    return { startDate, endDate }
  },

  // 计算总收支
  calculateSummary(transactions) {
    let totalIncome = 0
    let totalExpense = 0
    
    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        totalIncome += transaction.amount
      } else if (transaction.type === 'expense') {
        totalExpense += transaction.amount
      }
    })
    
    const balance = totalIncome - totalExpense
    
    this.setData({
      summary: {
        totalIncome,
        totalExpense,
        balance,
        totalIncomeDisplay: formatAmount(totalIncome),
        totalExpenseDisplay: formatAmount(totalExpense),
        balanceDisplay: formatAmount(balance)
      }
    })
  },

  // 计算分类统计
  calculateCategoryStats(transactions) {
    const expenseMap = {}
    const incomeMap = {}
    
    // 按分类统计金额
    transactions.forEach(transaction => {
      const category = transaction.category || '其他'
      
      if (transaction.type === 'expense') {
        if (!expenseMap[category]) {
          expenseMap[category] = 0
        }
        expenseMap[category] += transaction.amount
      } else if (transaction.type === 'income') {
        if (!incomeMap[category]) {
          incomeMap[category] = 0
        }
        incomeMap[category] += transaction.amount
      }
    })
    
    // 转换为数组并排序
    const expenseStats = Object.entries(expenseMap)
      .map(([name, amount]) => ({
        name,
        amount,
        amountDisplay: formatAmount(amount),
        percentage: 0 // 先初始化为0
      }))
      .sort((a, b) => b.amount - a.amount)
    
    const incomeStats = Object.entries(incomeMap)
      .map(([name, amount]) => ({
        name,
        amount,
        amountDisplay: formatAmount(amount),
        percentage: 0 // 先初始化为0
      }))
      .sort((a, b) => b.amount - a.amount)
    
    // 计算百分比
    const totalExpense = expenseStats.reduce((sum, item) => sum + item.amount, 0)
    const totalIncome = incomeStats.reduce((sum, item) => sum + item.amount, 0)
    
    expenseStats.forEach(item => {
      item.percentage = totalExpense > 0 ? ((item.amount / totalExpense) * 100).toFixed(1) : 0
      item.progressWidth = `${item.percentage}%`
    })
    
    incomeStats.forEach(item => {
      item.percentage = totalIncome > 0 ? ((item.amount / totalIncome) * 100).toFixed(1) : 0
      item.progressWidth = `${item.percentage}%`
    })
    
    this.setData({
      'categoryStats.expense': expenseStats,
      'categoryStats.income': incomeStats
    })
  },
  
  // 计算标签统计
  calculateTagStats(transactions) {
    const expenseMap = {}
    const incomeMap = {}
    
    // 按标签统计金额
    transactions.forEach(transaction => {
      if (!transaction.tags || transaction.tags.length === 0) {
        // 处理没有标签的交易
        const tagName = '无标签'
        
        if (transaction.type === 'expense') {
          if (!expenseMap[tagName]) {
            expenseMap[tagName] = 0
          }
          expenseMap[tagName] += transaction.amount
        } else if (transaction.type === 'income') {
          if (!incomeMap[tagName]) {
            incomeMap[tagName] = 0
          }
          incomeMap[tagName] += transaction.amount
        }
      } else {
        // 处理有标签的交易
        transaction.tags.forEach(tagId => {
          // 这里应该根据tagId获取标签名称，但为简化处理，直接使用tagId
          const tagName = this.getTagNameById(tagId) || tagId
          
          if (transaction.type === 'expense') {
            if (!expenseMap[tagName]) {
              expenseMap[tagName] = 0
            }
            expenseMap[tagName] += transaction.amount
          } else if (transaction.type === 'income') {
            if (!incomeMap[tagName]) {
              incomeMap[tagName] = 0
            }
            incomeMap[tagName] += transaction.amount
          }
        })
      }
    })
    
    // 转换为数组并排序
    const expenseStats = Object.entries(expenseMap)
      .map(([name, amount]) => ({
        name,
        amount,
        amountDisplay: formatAmount(amount),
        percentage: 0 // 先初始化为0
      }))
      .sort((a, b) => b.amount - a.amount)
    
    const incomeStats = Object.entries(incomeMap)
      .map(([name, amount]) => ({
        name,
        amount,
        amountDisplay: formatAmount(amount),
        percentage: 0 // 先初始化为0
      }))
      .sort((a, b) => b.amount - a.amount)
    
    // 计算百分比
    const totalExpense = expenseStats.reduce((sum, item) => sum + item.amount, 0)
    const totalIncome = incomeStats.reduce((sum, item) => sum + item.amount, 0)
    
    expenseStats.forEach(item => {
      item.percentage = totalExpense > 0 ? ((item.amount / totalExpense) * 100).toFixed(1) : 0
      item.progressWidth = `${item.percentage}%`
    })
    
    incomeStats.forEach(item => {
      item.percentage = totalIncome > 0 ? ((item.amount / totalIncome) * 100).toFixed(1) : 0
      item.progressWidth = `${item.percentage}%`
    })
    
    this.setData({
      'tagStats.expense': expenseStats,
      'tagStats.income': incomeStats
    })
  },
  
  // 根据标签ID获取标签名称
  getTagNameById(tagId) {
    // 从本地存储获取标签数据
    const tags = wx.getStorageSync('tags') || [
      { _id: '1', name: '必需品' },
      { _id: '2', name: '娱乐' },
      { _id: '3', name: '投资' },
      { _id: '4', name: '礼品' }
    ]
    
    const tag = tags.find(t => t._id === tagId || t.id === tagId)
    return tag ? tag.name : '未知标签'
  },

  // 计算趋势数据
  calculateTrendData(transactions) {
    const { dateRange, currentYear, currentMonth, customStartDate, customEndDate } = this.data
    let trendData = []
    
    if (dateRange === 'week') {
      // 按天统计
      const dailyData = {}
      const now = new Date()
      
      // 初始化最近7天的数据
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(now.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        dailyData[dateStr] = { date: dateStr, income: 0, expense: 0 }
      }
      
      // 统计交易数据
      transactions.forEach(transaction => {
        const date = (transaction.date || transaction.createTime).split('T')[0]
        if (dailyData[date]) {
          if (transaction.type === 'income') {
            dailyData[date].income += transaction.amount
          } else if (transaction.type === 'expense') {
            dailyData[date].expense += transaction.amount
          }
        }
      })
      
      trendData = Object.values(dailyData).map(item => ({
        ...item,
        dateDisplay: item.date.substring(5), // 只显示月-日
        incomeDisplay: formatAmount(item.income),
        expenseDisplay: formatAmount(item.expense)
      }))
    } else if (dateRange === 'month') {
      // 按天统计
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
      const dailyData = {}
      
      // 初始化当月每天的数据
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentYear, currentMonth, i)
        const dateStr = date.toISOString().split('T')[0]
        dailyData[dateStr] = { date: dateStr, income: 0, expense: 0 }
      }
      
      // 统计交易数据
      transactions.forEach(transaction => {
        const date = (transaction.date || transaction.createTime).split('T')[0]
        if (dailyData[date]) {
          if (transaction.type === 'income') {
            dailyData[date].income += transaction.amount
          } else if (transaction.type === 'expense') {
            dailyData[date].expense += transaction.amount
          }
        }
      })
      
      trendData = Object.values(dailyData).map(item => ({
        ...item,
        dateDisplay: item.date.substring(8), // 只显示日
        incomeDisplay: formatAmount(item.income),
        expenseDisplay: formatAmount(item.expense)
      }))
    } else if (dateRange === 'year') {
      // 按月统计
      const monthlyData = {}
      
      // 初始化每月的数据
      for (let i = 0; i < 12; i++) {
        const monthStr = `${i + 1}月`
        monthlyData[monthStr] = { date: monthStr, income: 0, expense: 0 }
      }
      
      // 统计交易数据
      transactions.forEach(transaction => {
        const date = new Date(transaction.date || transaction.createTime)
        if (date.getFullYear() === currentYear) {
          const monthStr = `${date.getMonth() + 1}月`
          if (transaction.type === 'income') {
            monthlyData[monthStr].income += transaction.amount
          } else if (transaction.type === 'expense') {
            monthlyData[monthStr].expense += transaction.amount
          }
        }
      })
      
      trendData = Object.values(monthlyData).map(item => ({
        ...item,
        dateDisplay: item.date,
        incomeDisplay: formatAmount(item.income),
        expenseDisplay: formatAmount(item.expense)
      }))
    } else if (dateRange === 'custom') {
      // 自定义日期范围，按天统计
      const start = new Date(customStartDate)
      const end = new Date(customEndDate)
      const dailyData = {}
      
      // 初始化日期范围内每天的数据
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        dailyData[dateStr] = { date: dateStr, income: 0, expense: 0 }
      }
      
      // 统计交易数据
      transactions.forEach(transaction => {
        const date = (transaction.date || transaction.createTime).split('T')[0]
        if (dailyData[date]) {
          if (transaction.type === 'income') {
            dailyData[date].income += transaction.amount
          } else if (transaction.type === 'expense') {
            dailyData[date].expense += transaction.amount
          }
        }
      })
      
      trendData = Object.values(dailyData).map(item => ({
        ...item,
        dateDisplay: item.date.substring(5), // 只显示月-日
        incomeDisplay: formatAmount(item.income),
        expenseDisplay: formatAmount(item.expense)
      }))
    }
    
    this.setData({ trendData })
  },

  // 加载资产数据
  async loadAssetData() {
    try {
      // 获取账户数据
      const accounts = wx.getStorageSync('accounts') || []
      
      // 获取投资数据
      const investments = wx.getStorageSync('investments') || []
      
      // 计算总资产
      const accountsTotal = accounts.reduce((sum, item) => sum + item.balance, 0)
      const investmentsTotal = investments.reduce((sum, item) => sum + item.amount, 0)
      const totalAssets = accountsTotal + investmentsTotal
      
      // 计算资产分布
      const assetsDistribution = [
        {
          name: '现金账户',
          amount: accountsTotal,
          percentage: totalAssets > 0 ? ((accountsTotal / totalAssets) * 100).toFixed(1) : 0,
          color: '#54a0ff'
        },
        {
          name: '投资理财',
          amount: investmentsTotal,
          percentage: totalAssets > 0 ? ((investmentsTotal / totalAssets) * 100).toFixed(1) : 0,
          color: '#ff9f43'
        }
      ]
      
      // 格式化账户数据
      const formattedAccounts = accounts.map(account => ({
        ...account,
        balanceDisplay: formatAmount(account.balance)
      }))
      
      // 格式化投资数据
      const formattedInvestments = investments.map(investment => ({
        ...investment,
        amountDisplay: formatAmount(investment.amount),
        profitDisplay: investment.profit ? formatAmount(investment.profit) : '0.00'
      }))
      
      this.setData({
        'assetData.accounts': formattedAccounts,
        'assetData.investments': formattedInvestments,
        'assetData.totalAssets': totalAssets,
        'assetData.totalAssetsDisplay': formatAmount(totalAssets),
        'assetData.assetsDistribution': assetsDistribution
      })
    } catch (error) {
      console.error('加载资产数据失败:', error)
    }
  },

  // 切换标签
  onTabChange(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ currentTab: index })
  },

  // 切换日期范围
  onDateRangeChange(e) {
    const range = e.currentTarget.dataset.range
    this.setData({ dateRange: range })
    this.loadReportData()
  },

  // 显示年份选择器
  showYearPicker() {
    this.setData({ showYearPicker: true })
  },

  // 年份变化
  onYearChange(e) {
    const year = parseInt(e.detail.value) + 2020 // 从2020年开始
    this.setData({
      currentYear: year,
      showYearPicker: false
    })
    this.loadReportData()
  },

  // 显示月份选择器
  showMonthPicker() {
    this.setData({ showMonthPicker: true })
  },

  // 月份变化
  onMonthChange(e) {
    const month = parseInt(e.detail.value)
    this.setData({
      currentMonth: month,
      showMonthPicker: false
    })
    this.loadReportData()
  },
  
  // 显示自定义日期范围选择器
  showCustomDatePicker() {
    this.setData({ showDateRangePicker: true })
  },
  
  // 自定义开始日期变化
  onStartDateChange(e) {
    this.setData({
      customStartDate: e.detail.value
    })
  },
  
  // 自定义结束日期变化
  onEndDateChange(e) {
    this.setData({
      customEndDate: e.detail.value
    })
  },
  
  // 确认自定义日期范围
  confirmCustomDateRange() {
    const { customStartDate, customEndDate } = this.data
    
    if (!customStartDate || !customEndDate) {
      wx.showToast({
        title: '请选择开始和结束日期',
        icon: 'none'
      })
      return
    }
    
    if (new Date(customStartDate) > new Date(customEndDate)) {
      wx.showToast({
        title: '开始日期不能晚于结束日期',
        icon: 'none'
      })
      return
    }
    
    this.setData({
      dateRange: 'custom',
      showDateRangePicker: false
    })
    
    this.loadReportData()
  },

  // 取消选择器
  cancelPicker() {
    this.setData({
      showYearPicker: false,
      showMonthPicker: false,
      showDateRangePicker: false
    })
  },

  // 查看分类详情
  viewCategoryDetail(e) {
    const { category, type } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/transaction-list/transaction-list?category=${category}&type=${type}`
    })
  },
  
  // 查看标签详情
  viewTagDetail(e) {
    const { tag, type } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/transaction-list/transaction-list?tag=${tag}&type=${type}`
    })
  },

  // 查看账户详情
  viewAccountDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/account-detail/account-detail?id=${id}`
    })
  },

  // 查看投资详情
  viewInvestmentDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/investment-detail/investment-detail?id=${id}`
    })
  },
  
  // 显示/隐藏选项
  toggleOptions() {
    this.setData({
      showOptions: !this.data.showOptions
    })
  },
  
  // 查看全部记录
  viewAllTransactions() {
    if (!this.data.viewAllEnabled) return
    
    const { startDate, endDate } = this.getDateRange()
    wx.navigateTo({
      url: `/pages/transaction-list/transaction-list?startDate=${startDate}&endDate=${endDate}&title=时段内所有记录`
    })
  },
  
  // 导出报表
  exportReport() {
    wx.showToast({
      title: '导出功能开发中',
      icon: 'none'
    })
  },
  
  // 设置周期
  setCycle() {
    wx.navigateTo({
      url: '/pages/cycle-setting/cycle-setting'
    })
  }
})