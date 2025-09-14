// pages/index/index.js
const app = getApp()
const { formatDate, formatAmount } = require('../../utils/formatter')
const { getTransactions, getCycleDateRange } = require('../../services/transaction-simple')
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
    monthPickerIndex: [0, 0], // [年份索引, 月份索引]
    
    // 顶部安全区 JS 兜底（默认关闭，仅问题机型开启）
    useJsSafeTop: false,
    paddingTopPx: 0
  },

  async onLoad() {
    console.log('首页加载开始')
    this.initPage()
    // 注册窗口尺寸变化监听（节流内部处理）
    if (wx && wx.onWindowResize) {
      wx.onWindowResize(this.updateSafeTop)
    }
    // 首次尝试计算（仅当开启兜底时生效）
    this.updateSafeTop()
  },
  
  onShow() {
    console.log('首页显示')
    
    // 添加缓存检查，避免重复加载
    const now = Date.now()
    const lastLoadTime = this.data.lastLoadTime || 0
    
    // 只有在超过2秒未加载时才重新加载
    if (now - lastLoadTime > 2000) {
      this.loadData()
      this.setData({ lastLoadTime: now })
    }

    // 显示时也尝试更新一次（方向可能发生变化）
    this.updateSafeTop()
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
        dateRange = getCycleDateRange(year, month)
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
    try {
      const year = this.data.selectedYear
      const monthIndex = this.data.selectedMonth - 1
      let range
      
      try {
        range = getCycleDateRange(year, monthIndex)
      } catch (e) {
        console.warn('获取周期日期范围失败，使用默认范围:', e)
        const startDate = new Date(year, monthIndex, 1)
        const endDate = new Date(year, monthIndex + 1, 0)
        const { formatDate: fmtDate } = require('../../utils/formatter')
        range = {
          startDateString: fmtDate(startDate),
          endDateString: fmtDate(endDate)
        }
      }
      
      // 确保日期格式正确
      const startDate = range.startDateString || range.startDate
      const endDate = range.endDateString || range.endDate
      
      if (!startDate || !endDate) {
        throw new Error('日期范围无效')
      }
      
      const title = `${year}年${this.data.selectedMonth}月全部记录`
      const url = `/pages/transaction-list/transaction-list?startDate=${startDate}&endDate=${endDate}&title=${encodeURIComponent(title)}&year=${year}&month=${this.data.selectedMonth}`
      
      console.log('跳转到交易列表:', url)
      wx.navigateTo({ url })
      
    } catch (error) {
      console.error('跳转到交易列表失败:', error)
      wx.showToast({
        title: '跳转失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  },
  
  // 点击交易记录（统一为编辑页）
  onTransactionTap(e) {
    const ds = (e && e.currentTarget && e.currentTarget.dataset) || (e && e.target && e.target.dataset) || {}
    const item = ds.item
    const id = ds.id || (item && (item.id || item._id))
    if (id) {
      // 先将交易记录保存到本地缓存，确保编辑页面可以找到
      try {
        const transactions = wx.getStorageSync('transactions') || []
        if (item && !transactions.some(t => (t.id || t._id) === id)) {
          transactions.unshift(item)
          wx.setStorageSync('transactions', transactions)
        }
      } catch (err) {
        console.error('缓存交易记录失败:', err)
      }
      
      wx.navigateTo({
        url: `/pages/record/record?id=${id}&mode=edit`
      })
    } else {
      wx.showToast({ title: '记录无效，无法打开', icon: 'none' })
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
    const id = item && (item.id || item._id)
    if (!id) {
      wx.showToast({ title: '记录无效', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/record/record?id=${id}&mode=edit`
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
            // 使用交易服务删除记录
            const { deleteTransaction } = require('../../services/transaction-simple')
            await deleteTransaction(item.id || item._id)
            
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

  // ========== 顶部安全区 JS 兜底 ==========
  // 注意：默认 useJsSafeTop=false，不会生效；仅在问题机型将其置为 true。
  updateSafeTop: (() => {
    let timer = null
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
    const BASE_PX = 12
    const EXTRA_PX = 16
    const MIN_PX = 10
    const MAX_PX = 88
    return function() {
      if (!this || !this.setData) return
      if (!this.data || !this.data.useJsSafeTop) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        try {
          const info = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {}
          const statusBar = (info && info.statusBarHeight) || 0
          const padding = clamp(BASE_PX + EXTRA_PX + statusBar, MIN_PX, MAX_PX)
          this.setData({ paddingTopPx: padding })
        } catch (e) {
          // 读取失败时给一个基础兜底
          this.setData({ paddingTopPx: 24 })
        }
      }, 120)
    }
  })(),
  
  // 关闭提示
  onCloseTip(e) {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation()
    }
    this.setData({ newTransactionCount: 0 })
  },

  // 阻止冒泡空函数（用于弹层容器 catchtap）
  noop() {},

  onUnload() {
    // 解除窗口监听
    if (wx && wx.offWindowResize) {
      wx.offWindowResize(this.updateSafeTop)
    }
  }

})
