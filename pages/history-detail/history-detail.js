// pages/history-detail/history-detail.js
const { showLoading, hideLoading, showToast } = require('../../utils/uiUtil')
const { formatDate, formatAmount } = require('../../utils/formatter')

Page({
  data: {
    loading: false,
    
    // 选择的年月
    selectedYear: 2024,
    selectedMonth: 8,
    
    // 交易数据
    transactions: [],
    
    // 统计数据
    monthlyStats: {
      income: 0,
      expense: 0,
      balance: 0,
      transactionCount: 0
    },
    
    // 分组数据
    groupedTransactions: [],
    
    // UI状态
    showDatePicker: false,
    
    // 筛选状态
    activeFilter: 'all', // all, income, expense
    
    // 年月选择器数据
    years: [],
    months: [
      '1月', '2月', '3月', '4月', '5月', '6月',
      '7月', '8月', '9月', '10月', '11月', '12月'
    ]
  },

  onLoad(options) {
    // 从参数获取年月，默认为当前月
    const now = new Date()
    const year = options.year ? parseInt(options.year) : now.getFullYear()
    const month = options.month ? parseInt(options.month) : now.getMonth() + 1
    
    this.setData({
      selectedYear: year,
      selectedMonth: month
    })
    
    this.initYears()
    this.loadHistoryData()
  },

  // 初始化年份选择器
  initYears() {
    const currentYear = new Date().getFullYear()
    const years = []
    
    // 生成最近5年的年份选项
    for (let i = currentYear; i >= currentYear - 4; i--) {
      years.push(`${i}年`)
    }
    
    this.setData({ years })
  },

  // 加载历史数据
  async loadHistoryData() {
    try {
      this.setData({ loading: true })
      showLoading('加载中...')
      
      // 获取指定月份的交易记录
      const { selectedYear, selectedMonth } = this.data
      const startDate = new Date(selectedYear, selectedMonth - 1, 1)
      const endDate = new Date(selectedYear, selectedMonth, 0)
      
      // 从本地存储获取交易记录
      const allTransactions = wx.getStorageSync('transactions') || []
      
      const transactions = allTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.date)
        return transactionDate >= startDate && transactionDate <= endDate
      })
      
      // 计算统计数据
      const stats = this.calculateStats(transactions)
      
      // 按日期分组
      const groupedTransactions = this.groupTransactionsByDate(transactions)
      
      this.setData({
        transactions,
        monthlyStats: stats,
        groupedTransactions,
        loading: false
      })
      
      hideLoading()
    } catch (error) {
      console.error('加载历史数据失败:', error)
      hideLoading()
      showToast('加载失败', 'error')
      this.setData({ loading: false })
    }
  },

  // 计算统计数据
  calculateStats(transactions) {
    let income = 0
    let expense = 0
    
    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        income += transaction.amount
      } else if (transaction.type === 'expense') {
        expense += transaction.amount
      }
    })
    
    return {
      income,
      expense,
      balance: income - expense,
      transactionCount: transactions.length,
      incomeDisplay: formatAmount(income),
      expenseDisplay: formatAmount(expense),
      balanceDisplay: formatAmount(income - expense)
    }
  },

  // 按日期分组交易记录
  groupTransactionsByDate(transactions) {
    const groups = {}
    
    transactions.forEach(transaction => {
      const date = formatDate(transaction.date, 'YYYY-MM-DD')
      if (!groups[date]) {
        groups[date] = {
          date,
          dateDisplay: formatDate(transaction.date, 'MM月DD日'),
          weekday: this.getWeekday(new Date(transaction.date)),
          transactions: [],
          dayIncome: 0,
          dayExpense: 0
        }
      }
      
      // 格式化交易记录
      const formattedTransaction = {
        ...transaction,
        amountDisplay: formatAmount(transaction.amount),
        timeDisplay: formatDate(transaction.date, 'HH:mm')
      }
      
      groups[date].transactions.push(formattedTransaction)
      
      // 计算当日收支
      if (transaction.type === 'income') {
        groups[date].dayIncome += transaction.amount
      } else if (transaction.type === 'expense') {
        groups[date].dayExpense += transaction.amount
      }
    })
    
    // 转换为数组并排序
    const groupedArray = Object.values(groups).map(group => ({
      ...group,
      dayIncomeDisplay: formatAmount(group.dayIncome),
      dayExpenseDisplay: formatAmount(group.dayExpense),
      dayBalanceDisplay: formatAmount(group.dayIncome - group.dayExpense)
    }))
    
    return groupedArray.sort((a, b) => new Date(b.date) - new Date(a.date))
  },

  // 获取星期几
  getWeekday(date) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekdays[date.getDay()]
  },

  // 显示日期选择器
  showDatePicker() {
    this.setData({ showDatePicker: true })
  },

  // 关闭日期选择器
  closeDatePicker() {
    this.setData({ showDatePicker: false })
  },

  // 年份选择
  onYearChange(e) {
    const yearIndex = parseInt(e.detail.value)
    const year = parseInt(this.data.years[yearIndex].replace('年', ''))
    this.setData({ selectedYear: year })
  },

  // 月份选择
  onMonthChange(e) {
    const month = parseInt(e.detail.value) + 1
    this.setData({ selectedMonth: month })
  },

  // 确认日期选择
  confirmDatePicker() {
    this.closeDatePicker()
    this.loadHistoryData()
  },

  // 筛选类型切换
  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ activeFilter: filter })
    this.applyFilter(filter)
  },

  // 应用筛选
  applyFilter(filter) {
    const { transactions } = this.data
    
    let filteredTransactions = transactions
    if (filter === 'income') {
      filteredTransactions = transactions.filter(t => t.type === 'income')
    } else if (filter === 'expense') {
      filteredTransactions = transactions.filter(t => t.type === 'expense')
    }
    
    const groupedTransactions = this.groupTransactionsByDate(filteredTransactions)
    this.setData({ groupedTransactions })
  },

  // 查看交易详情
  onTransactionTap(e) {
    const { transaction } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/transaction-detail/transaction-detail?id=${transaction.id}`
    })
  },

  // 编辑交易
  onEditTransaction(e) {
    const { transaction } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/record/record?id=${transaction.id}&mode=edit`
    })
  },

  // 删除交易
  onDeleteTransaction(e) {
    const { transaction } = e.currentTarget.dataset
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: (res) => {
        if (res.confirm) {
          this.deleteTransaction(transaction.id)
        }
      }
    })
  },

  // 执行删除
  async deleteTransaction(transactionId) {
    try {
      const transactions = wx.getStorageSync('transactions') || []
      const filteredTransactions = transactions.filter(t => t.id !== transactionId)
      
      wx.setStorageSync('transactions', filteredTransactions)
      
      showToast('删除成功', 'success')
      this.loadHistoryData()
    } catch (error) {
      console.error('删除失败:', error)
      showToast('删除失败', 'error')
    }
  },

  // 长按交易记录
  onTransactionLongPress(e) {
    const { transaction } = e.currentTarget.dataset
    
    wx.showActionSheet({
      itemList: ['编辑', '删除', '复制'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.onEditTransaction(e)
            break
          case 1:
            this.onDeleteTransaction(e)
            break
          case 2:
            this.copyTransaction(transaction)
            break
        }
      }
    })
  },

  // 复制交易
  copyTransaction(transaction) {
    const params = new URLSearchParams({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      account: transaction.account,
      description: transaction.description || ''
    }).toString()
    
    wx.navigateTo({
      url: `/pages/record/record?${params}&mode=copy`
    })
  }
})