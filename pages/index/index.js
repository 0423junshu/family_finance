// pages/index/index.js
const app = getApp()
const { formatDate, formatAmount } = require('../../utils/formatter')
const { getTransactions } = require('../../services/transaction-simple')
const { showLoading, hideLoading, showToast } = require('../../utils/uiUtil')

Page({
  data: {
    // 基础数据
    loading: true,
    transactions: [],
    currentMonth: '',
    selectedYear: 0,
    selectedMonth: 0,
    
    // 统计数据
    monthlyStats: {
      income: 0,
      expense: 0,
      balance: 0
    },
    
    // 显示控制
    hideAmount: false,
    syncStatus: 'success', // success, error, syncing
    newTransactionCount: 0,
    showMonthPicker: false,
    
    // 格式化显示
    incomeDisplay: '0.00',
    expenseDisplay: '0.00',
    balanceDisplay: '0.00',
    
    // 月份选择器数据
    monthPickerData: [],
    monthPickerIndex: [0, 0] // [年份索引, 月份索引]
  },

  onLoad() {
    console.log('首页加载开始')
    this.initPage()
  },
  
  onShow() {
    console.log('首页显示')
    this.loadData()
  },
  
  // 初始化页面
  initPage() {
    try {
      // 设置当前月份
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      
      this.setData({ 
        selectedYear: currentYear,
        selectedMonth: currentMonth,
        currentMonth: `${currentYear}年${currentMonth}月`
      })
      
      // 初始化月份选择器数据
      this.initMonthPicker()
      
      // 加载数据
      this.loadData()
    } catch (error) {
      console.error('页面初始化失败:', error)
      this.setData({ loading: false })
      showToast('页面初始化失败', 'error')
    }
  },
  
  // 初始化月份选择器
  initMonthPicker() {
    const currentYear = new Date().getFullYear()
    const years = []
    const months = []
    
    // 生成年份数据（当前年份前后各3年）
    for (let i = currentYear - 3; i <= currentYear + 1; i++) {
      years.push(`${i}年`)
    }
    
    // 生成月份数据
    for (let i = 1; i <= 12; i++) {
      months.push(`${i}月`)
    }
    
    // 计算当前选中的索引
    const yearIndex = years.findIndex(year => year === `${this.data.selectedYear}年`)
    const monthIndex = this.data.selectedMonth - 1
    
    this.setData({
      monthPickerData: [years, months],
      monthPickerIndex: [yearIndex >= 0 ? yearIndex : 3, monthIndex]
    })
  },
  
  // 加载数据
  async loadData() {
    try {
      this.setData({ loading: true })
      showLoading('加载中...')
      
      // 获取选中月份的交易记录
      const year = this.data.selectedYear
      const month = this.data.selectedMonth - 1 // JavaScript月份从0开始
      
      // 使用自定义周期获取日期范围
      let dateRange;
      try {
        dateRange = getTransactions.getCycleDateRange(year, month)
      } catch (error) {
        console.error('获取周期日期范围失败:', error)
        // 使用默认日期范围
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0)
        dateRange = {
          startDate,
          endDate,
          startDateString: startDate.toISOString().split('T')[0],
          endDateString: endDate.toISOString().split('T')[0]
        }
      }
      
      const { startDateString, endDateString } = dateRange
      
      let result;
      try {
        result = await getTransactions({ startDate: startDateString, endDate: endDateString })
      } catch (error) {
        console.error('获取交易记录失败:', error)
        result = { list: [] }
      }
      
      const transactions = result.list || []
      
      // 计算统计数据
      const stats = this.calculateStats(transactions)
      
      // 格式化交易记录
      const formattedTransactions = this.formatTransactions(transactions)
      
      // 更新页面数据
      this.setData({
        transactions: formattedTransactions.slice(0, 10), // 只显示最近10条
        monthlyStats: stats,
        incomeDisplay: formatAmount(stats.income),
        expenseDisplay: formatAmount(stats.expense),
        balanceDisplay: formatAmount(stats.balance),
        loading: false
      })
      
      hideLoading()
    } catch (error) {
      console.error('加载数据失败:', error)
      hideLoading()
      showToast('加载失败，请重试', 'error')
      this.setData({ 
        loading: false,
        transactions: [],
        monthlyStats: { income: 0, expense: 0, balance: 0 }
      })
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
      balance: income - expense
    }
  },
  
  // 格式化交易记录
  formatTransactions(transactions) {
    return transactions.map(transaction => {
      return {
        ...transaction,
        dateDisplay: formatDate(transaction.date),
        amountDisplay: formatAmount(transaction.amount),
        categoryIcon: this.getCategoryIcon(transaction.category),
        categoryName: transaction.category || '其他',
        accountName: transaction.account || '默认账户'
      }
    })
  },
  
  // 获取分类图标
  getCategoryIcon(category) {
    const iconMap = {
      '餐饮': '🍽️',
      '交通': '🚗',
      '购物': '🛍️',
      '娱乐': '🎮',
      '医疗': '🏥',
      '教育': '📚',
      '住房': '🏠',
      '通讯': '📱',
      '工资': '💰',
      '奖金': '🎁',
      '投资': '📈',
      '兼职': '💼',
      '转账': '🔄'
    }
    return iconMap[category] || '💰'
  },
  
  // 点击月份标题，显示月份选择器
  onMonthTitleTap() {
    this.setData({ showMonthPicker: true })
  },
  
  // 月份选择器变化
  onMonthPickerChange(e) {
    const [yearIndex, monthIndex] = e.detail.value
    const years = this.data.monthPickerData[0]
    const months = this.data.monthPickerData[1]
    
    const selectedYear = parseInt(years[yearIndex].replace('年', ''))
    const selectedMonth = monthIndex + 1
    
    this.setData({
      selectedYear,
      selectedMonth,
      currentMonth: `${selectedYear}年${selectedMonth}月`,
      monthPickerIndex: [yearIndex, monthIndex],
      showMonthPicker: false
    })
    
    // 重新加载数据
    this.loadData()
  },
  
  // 取消月份选择
  onMonthPickerCancel() {
    this.setData({ showMonthPicker: false })
  },
  
  // 切换金额显示/隐藏
  onToggleAmount() {
    this.setData({
      hideAmount: !this.data.hideAmount
    })
  },
  
  // 同步数据
  async onSyncTap() {
    try {
      this.setData({ syncStatus: 'syncing' })
      
      // 模拟同步过程
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 重新加载数据
      await this.loadData()
      
      this.setData({ 
        syncStatus: 'success',
        newTransactionCount: Math.floor(Math.random() * 3)
      })
      
      showToast('同步成功', 'success')
    } catch (error) {
      console.error('同步失败:', error)
      this.setData({ syncStatus: 'error' })
      showToast('同步失败', 'error')
    }
  },
  
  // 查看全部记录
  onViewAllTap() {
    const year = this.data.selectedYear
    const month = this.data.selectedMonth
    wx.navigateTo({
      url: `/pages/transaction-list/transaction-list-simple?year=${year}&month=${month}`
    })
  },
  
  // 点击交易记录
  onTransactionTap(e) {
    const { item } = e.currentTarget.dataset
    if (item && item.id) {
      wx.navigateTo({
        url: `/pages/transaction-detail/transaction-detail-simple?id=${item.id}`
      })
    }
  },
  
  // 长按交易记录
  onTransactionLongPress(e) {
    const { item } = e.currentTarget.dataset
    wx.showActionSheet({
      itemList: ['编辑', '删除', '复制'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.editTransaction(item)
            break
          case 1:
            this.deleteTransaction(item)
            break
          case 2:
            this.copyTransaction(item)
            break
        }
      }
    })
  },
  
  // 编辑交易
  editTransaction(item) {
    wx.navigateTo({
      url: `/pages/record/record?id=${item.id}&mode=edit`
    })
  },
  
  // 删除交易
  deleteTransaction(item) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 从本地存储删除记录
            const transactions = wx.getStorageSync('transactions') || []
            const updatedTransactions = transactions.filter(t => t.id !== item.id)
            wx.setStorageSync('transactions', updatedTransactions)
            
            // 如果是转账记录，需要恢复账户余额
            if (item.category === '转账') {
              const accounts = wx.getStorageSync('accounts') || []
              const accountIndex = accounts.findIndex(acc => 
                acc.name === item.account || acc._id === item.accountId || acc.id === item.accountId
              )
              
              if (accountIndex !== -1) {
                if (item.type === 'expense') {
                  // 转出记录，恢复余额
                  accounts[accountIndex].balance += item.amount
                } else if (item.type === 'income') {
                  // 转入记录，扣减余额
                  accounts[accountIndex].balance -= item.amount
                }
                wx.setStorageSync('accounts', accounts)
              }
            } else {
              // 普通收支记录，恢复账户余额
              const accounts = wx.getStorageSync('accounts') || []
              const accountIndex = accounts.findIndex(acc => 
                acc.name === item.account || acc._id === item.accountId || acc.id === item.accountId
              )
              
              if (accountIndex !== -1) {
                if (item.type === 'expense') {
                  // 支出记录，恢复余额
                  accounts[accountIndex].balance += item.amount
                } else if (item.type === 'income') {
                  // 收入记录，扣减余额
                  accounts[accountIndex].balance -= item.amount
                }
                wx.setStorageSync('accounts', accounts)
              }
            }
            
            showToast('删除成功', 'success')
            this.loadData()
          } catch (error) {
            console.error('删除记录失败:', error)
            showToast('删除失败', 'error')
          }
        }
      }
    })
  },
  
  // 复制交易
  copyTransaction(item) {
    const params = new URLSearchParams({
      type: item.type,
      category: item.category,
      amount: (item.amount / 100).toFixed(2), // 转换为元
      account: item.account,
      description: item.description || ''
    }).toString()
    
    wx.navigateTo({
      url: `/pages/record/record?${params}&mode=copy`
    })
  },
  
  // 快速支出
  onQuickExpense() {
    wx.navigateTo({
      url: '/pages/record/record?type=expense&quick=true'
    })
  },
  
  // 快速收入
  onQuickIncome() {
    wx.navigateTo({
      url: '/pages/record/record?type=income&quick=true'
    })
  },
  
  // 账户转账
  onQuickTransfer() {
    wx.navigateTo({
      url: '/pages/transfer/transfer'
    })
  },
  
  // 记账按钮
  onRecordTap() {
    wx.navigateTo({
      url: '/pages/record/record'
    })
  },

  // 跳转到分类管理
  navigateToCategoryManage() {
    wx.navigateTo({
      url: '/pages/category-manage/category-manage'
    })
  },

  // 跳转到预算管理
  navigateToBudgetManage() {
    wx.navigateTo({
      url: '/pages/budget-manage/budget-manage'
    })
  },

  // 跳转到自定义周期
  navigateToCustomCycle() {
    wx.navigateTo({
      url: '/pages/custom-cycle/custom-cycle'
    })
  },
  
  // 新交易提示
  onNewTransactionTap() {
    this.loadData()
    this.setData({ newTransactionCount: 0 })
  },
  
  // 关闭提示
  onCloseTip(e) {
    e.stopPropagation()
    this.setData({ newTransactionCount: 0 })
  }
})