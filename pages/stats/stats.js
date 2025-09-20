// pages/stats/stats.js
Page({
  data: {
    pageMoneyVisible: true,
    currentTab: 0,
    dateRange: 'month',
    chartData: {
      expense: [],
      income: [],
      categories: []
    },
    summary: {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0
    },
    categoryStats: [],
    trendData: []
  },

  onLoad() {
    const app = getApp()
    const route = this.route
    const g = app.globalData || {}
    const v = (g.pageVisibility && Object.prototype.hasOwnProperty.call(g.pageVisibility, route))
      ? g.pageVisibility[route]
      : !g.hideAmount
    this.setData({ pageMoneyVisible: v })
    this.loadStatsData()
  },

  onShow() {
    this.loadStatsData()
  },

  // 切换标签
  onTabChange(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ currentTab: index })
  },

  // 切换显示/隐藏
  onEyeChange(e) {
    const v = e.detail.value
    const app = getApp()
    const route = this.route
    if (app.globalData && app.globalData.pageVisibility) {
      app.globalData.pageVisibility[route] = v
    }
    this.setData({ pageMoneyVisible: v })
  },

  // 切换时间范围
  onDateRangeChange(e) {
    const range = e.currentTarget.dataset.range
    this.setData({ dateRange: range })
    this.loadStatsData()
  },

  // 加载统计数据
  async loadStatsData() {
    try {
      const transactions = wx.getStorageSync('transactions') || []
      const stats = this.calculateStats(transactions)
      
      this.setData({
        summary: stats.summary,
        categoryStats: stats.categoryStats,
        trendData: stats.trendData
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  },

  // 计算统计数据
  calculateStats(transactions) {
    const now = new Date()
    let startDate, endDate
    
    // 根据时间范围筛选数据
    switch (this.data.dateRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    
    const filteredTransactions = transactions.filter(t => {
      const date = new Date(t.createTime || t.date)
      return date >= startDate
    })
    
    // 计算总收支
    let totalIncome = 0
    let totalExpense = 0
    const categoryMap = {}
    
    filteredTransactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount
      } else if (t.type === 'expense') {
        totalExpense += t.amount
        
        // 分类统计
        const categoryName = t.categoryName || '其他'
        if (!categoryMap[categoryName]) {
          categoryMap[categoryName] = 0
        }
        categoryMap[categoryName] += t.amount
      }
    })
    
    // 分类统计排序
    const categoryStats = Object.entries(categoryMap)
      .map(([name, amount]) => ({ 
        name, 
        amount,
        amountDisplay: (amount / 100).toFixed(2),
        progressWidth: categoryMap[Object.keys(categoryMap)[0]] > 0 ? 
          (amount / categoryMap[Object.keys(categoryMap)[0]] * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
    
    const balance = totalIncome - totalExpense
    
    return {
      summary: {
        totalIncome,
        totalExpense,
        balance,
        totalIncomeDisplay: (totalIncome / 100).toFixed(2),
        totalExpenseDisplay: (totalExpense / 100).toFixed(2),
        balanceDisplay: (balance / 100).toFixed(2)
      },
      categoryStats,
      trendData: [] // 简化版本暂不实现趋势图
    }
  }
})