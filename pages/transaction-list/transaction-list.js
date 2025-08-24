// pages/transaction-list/transaction-list.js
const { getTransactions } = require('../../services/transaction-simple')
const { formatDate, formatAmount } = require('../../utils/formatter')
const { showLoading, hideLoading, showToast } = require('../../utils/uiUtil')

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
    showDatePicker: false,
    datePickerType: '', // start, end
    
    // 统计数据
    totalIncome: 0,
    totalExpense: 0,
    netAmount: 0,
    
    // 分页
    currentPage: 1,
    pageSize: 20,
    hasMore: true
  },

  onLoad(options) {
    // 获取传入的筛选参数
    if (options.type) {
      this.setData({
        'filters.type': options.type
      })
    }
    
    this.initPage()
  },

  onShow() {
    this.loadTransactions()
  },

  // 初始化页面
  async initPage() {
    this.initDateRange()
    await this.loadCategories()
    await this.loadTransactions()
  },

  // 初始化日期范围
  initDateRange() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    
    // 获取URL参数中的年月
    const { selectedYear, selectedMonth } = this.data
    
    let startDate, endDate
    let targetYear = selectedYear || year
    let targetMonth = selectedMonth !== undefined ? selectedMonth : month
    
    switch (this.data.filters.dateRange) {
      case 'week':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        startDate = weekStart.toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        break
      case 'month':
        startDate = new Date(targetYear, targetMonth, 1).toISOString().split('T')[0]
        endDate = new Date(targetYear, targetMonth + 1, 0).toISOString().split('T')[0]
        break
      case 'quarter':
        const quarterMonth = Math.floor(targetMonth / 3) * 3
        const quarterStart = new Date(targetYear, quarterMonth, 1)
        const quarterEnd = new Date(targetYear, quarterMonth + 3, 0)
        startDate = quarterStart.toISOString().split('T')[0]
        endDate = quarterEnd.toISOString().split('T')[0]
        break
      case 'year':
        startDate = new Date(targetYear, 0, 1).toISOString().split('T')[0]
        endDate = new Date(targetYear, 11, 31).toISOString().split('T')[0]
        break
      case 'custom':
        // 保持自定义日期不变
        startDate = this.data.filters.startDate || new Date(targetYear, targetMonth, 1).toISOString().split('T')[0]
        endDate = this.data.filters.endDate || new Date(targetYear, targetMonth + 1, 0).toISOString().split('T')[0]
        break
      default:
        startDate = new Date(targetYear, targetMonth, 1).toISOString().split('T')[0]
        endDate = new Date(targetYear, targetMonth + 1, 0).toISOString().split('T')[0]
    }
    
    this.setData({
      'filters.startDate': startDate,
      'filters.endDate': endDate,
      currentYear: targetYear,
      currentMonth: targetMonth
    })
  },

  // 加载分类列表
  async loadCategories() {
    try {
      // 模拟分类数据
      const categories = [
        { id: 'food', name: '餐饮', type: 'expense' },
        { id: 'transport', name: '交通', type: 'expense' },
        { id: 'shopping', name: '购物', type: 'expense' },
        { id: 'entertainment', name: '娱乐', type: 'expense' },
        { id: 'medical', name: '医疗', type: 'expense' },
        { id: 'education', name: '教育', type: 'expense' },
        { id: 'salary', name: '工资', type: 'income' },
        { id: 'bonus', name: '奖金', type: 'income' },
        { id: 'investment', name: '投资收益', type: 'income' }
      ]
      
      this.setData({ categories })
    } catch (error) {
      console.error('加载分类失败:', error)
    }
  },

  // 加载交易记录
  async loadTransactions() {
    try {
      this.setData({ loading: true })
      showLoading('加载中...')
      
      const params = {
        startDate: this.data.filters.startDate,
        endDate: this.data.filters.endDate
      }
      
      const result = await getTransactions(params)
      const allTransactions = result.list || []
      
      // 应用筛选条件
      const filteredTransactions = this.applyFilters(allTransactions)
      
      // 计算统计数据
      this.calculateStats(filteredTransactions)
      
      // 格式化数据
      const formattedTransactions = filteredTransactions.map(transaction => ({
        ...transaction,
        formattedDate: formatDate(transaction.date || transaction.createTime),
        formattedAmount: formatAmount(transaction.amount)
      }))
      
      this.setData({
        transactions: allTransactions,
        filteredTransactions: formattedTransactions,
        loading: false
      })
      
      hideLoading()
    } catch (error) {
      console.error('加载交易记录失败:', error)
      hideLoading()
      showToast('加载失败，请重试', 'error')
      this.setData({ loading: false })
    }
  },

  // 应用筛选条件
  applyFilters(transactions) {
    let filtered = [...transactions]
    
    // 按类型筛选
    if (this.data.filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === this.data.filters.type)
    }
    
    // 按分类筛选
    if (this.data.filters.category !== 'all') {
      filtered = filtered.filter(t => t.category === this.data.filters.category)
    }
    
    // 按日期排序（最新的在前）
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
    
    return filtered
  },

  // 计算统计数据
  calculateStats(transactions) {
    let totalIncome = 0
    let totalExpense = 0
    
    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        totalIncome += transaction.amount
      } else if (transaction.type === 'expense') {
        totalExpense += transaction.amount
      }
    })
    
    const netAmount = totalIncome - totalExpense
    
    this.setData({
      totalIncome,
      totalExpense,
      netAmount
    })
  },

  // 显示筛选面板
  showFilterPanel() {
    this.setData({ showFilterPanel: true })
  },

  // 隐藏筛选面板
  hideFilterPanel() {
    this.setData({ showFilterPanel: false })
  },

  // 类型筛选
  onTypeFilter(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      'filters.type': type
    })
    this.applyFiltersAndReload()
  },

  // 分类筛选
  onCategoryFilter(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      'filters.category': category
    })
    this.applyFiltersAndReload()
  },

  // 日期范围筛选
  onDateRangeFilter(e) {
    const range = e.currentTarget.dataset.range
    this.setData({
      'filters.dateRange': range
    })
    this.initDateRange()
    this.applyFiltersAndReload()
  },

  // 自定义日期选择
  onCustomDateTap(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      showDatePicker: true,
      datePickerType: type
    })
  },

  onDateChange(e) {
    const value = e.detail.value
    const type = this.data.datePickerType
    
    this.setData({
      [`filters.${type}Date`]: value,
      showDatePicker: false,
      'filters.dateRange': 'custom'
    })
    
    this.applyFiltersAndReload()
  },

  // 日期选择器取消
  onDatePickerCancel() {
    this.setData({
      showDatePicker: false
    })
  },

  // 应用筛选并重新加载
  applyFiltersAndReload() {
    const filteredTransactions = this.applyFilters(this.data.transactions)
    this.calculateStats(filteredTransactions)
    
    const formattedTransactions = filteredTransactions.map(transaction => ({
      ...transaction,
      formattedDate: formatDate(transaction.date),
      formattedAmount: formatAmount(transaction.amount)
    }))
    
    this.setData({
      filteredTransactions: formattedTransactions
    })
  },

  // 重置筛选条件
  resetFilters() {
    this.setData({
      filters: {
        type: 'all',
        category: 'all',
        dateRange: 'month',
        startDate: '',
        endDate: ''
      }
    })
    this.initDateRange()
    this.applyFiltersAndReload()
  },

  // 查看交易详情
  viewTransactionDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/transaction-detail/transaction-detail?id=${id}`
    })
  },

  // 导出数据
  exportData() {
    showToast('导出功能开发中', 'none')
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadTransactions().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore) {
      this.loadMoreTransactions()
    }
  },

  // 加载更多交易记录
  async loadMoreTransactions() {
    // 这里可以实现分页加载逻辑
    showToast('已加载全部数据', 'none')
  }
})