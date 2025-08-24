// pages/investments/investments.js
Page({
  data: {
    totalAssets: 0,
    totalReturn: 0,
    returnRate: 0,
    investments: [
      {
        id: '1',
        name: '余额宝',
        type: 'fund',
        amount: 50000,
        cost: 48000,
        return: 2000,
        returnRate: 4.17,
        icon: '💰'
      },
      {
        id: '2',
        name: '招商银行理财',
        type: 'bank',
        amount: 100000,
        cost: 100000,
        return: 0,
        returnRate: 3.5,
        icon: '🏦'
      },
      {
        id: '3',
        name: '股票投资',
        type: 'stock',
        amount: 80000,
        cost: 85000,
        return: -5000,
        returnRate: -5.88,
        icon: '📈'
      }
    ],
    currentTab: 0,
    tabs: ['全部', '基金', '理财', '股票']
  },

  onLoad() {
    this.loadInvestments()
    this.calculateTotals()
  },

  onShow() {
    this.loadInvestments()
    this.calculateTotals()
  },

  // 加载投资数据
  loadInvestments() {
    try {
      // 从本地存储获取投资数据，如果没有则使用默认数据
      let investments = wx.getStorageSync('investments')
      
      if (!investments || investments.length === 0) {
        // 初始化默认投资数据并保存到本地存储
        investments = this.data.investments
        wx.setStorageSync('investments', investments)
      }
      
      // 同步资产页面的投资数据
      this.syncWithAssetsPage(investments)
      
      this.setData({ investments })
    } catch (error) {
      console.error('加载投资数据失败:', error)
      this.setData({ investments: this.data.investments })
    }
  },

  // 与资产页面同步投资数据
  syncWithAssetsPage(investments) {
    try {
      // 获取资产页面的投资数据
      const assetsData = wx.getStorageSync('assetsData') || {}
      
      // 更新资产页面的投资数据
      assetsData.investments = investments.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        amount: item.amount,
        profit: item.return,
        profitRate: item.returnRate,
        icon: item.icon
      }))
      
      // 保存回本地存储
      wx.setStorageSync('assetsData', assetsData)
    } catch (error) {
      console.error('同步资产数据失败:', error)
    }
  },

  // 计算总计
  calculateTotals() {
    const { investments } = this.data
    const totalAssets = investments.reduce((sum, item) => sum + item.amount, 0)
    const totalCost = investments.reduce((sum, item) => sum + item.cost, 0)
    const totalReturn = totalAssets - totalCost
    const returnRate = totalCost > 0 ? (totalReturn / totalCost * 100) : 0

    // 格式化显示数据
    const formattedInvestments = investments.map(item => ({
      ...item,
      amountDisplay: (item.amount / 100).toFixed(2),
      returnDisplay: (item.return / 100).toFixed(2),
      returnRateDisplay: item.returnRate.toFixed(2)
    }))

    this.setData({
      totalAssets,
      totalReturn,
      returnRate,
      totalAssetsDisplay: (totalAssets / 100).toFixed(2),
      totalReturnDisplay: (totalReturn / 100).toFixed(2),
      returnRateDisplay: returnRate.toFixed(2),
      investments: formattedInvestments
    })
  },

  // 切换标签
  onTabChange(e) {
    const currentTab = e.currentTarget.dataset.index
    this.setData({ currentTab })
  },

  // 获取过滤后的投资列表
  getFilteredInvestments() {
    const { investments, currentTab, tabs } = this.data
    if (currentTab === 0) return investments
    
    const typeMap = {
      1: 'fund',
      2: 'bank', 
      3: 'stock'
    }
    
    return investments.filter(item => item.type === typeMap[currentTab])
  },

  // 添加投资
  onAddInvestment() {
    wx.navigateTo({
      url: '/pages/investment-add/investment-add'
    })
  },

  // 投资详情
  onInvestmentDetail(e) {
    const investmentId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/investment-detail/investment-detail?id=${investmentId}`
    })
  },

  // 刷新数据
  onRefresh() {
    wx.showLoading({ title: '刷新中...' })
    
    // 模拟刷新延迟
    setTimeout(() => {
      this.loadInvestments()
      this.calculateTotals()
      wx.hideLoading()
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      })
    }, 1000)
  }
})