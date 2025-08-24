// 简化版本的 index.js - 用于测试
Page({
  data: {
    loading: false,
    userInfo: {
      nickName: '演示用户'
    },
    monthlyStats: {
      income: 0,
      expense: 0,
      balance: 0
    },
    incomeDisplay: '0.00',
    expenseDisplay: '0.00',
    balanceDisplay: '0.00',
    transactions: [],
    hasMore: false,
    hideAmount: false,
    syncStatus: 'idle',
    newTransactionCount: 0,
    refreshing: false
  },

  onLoad() {
    console.log('简化版页面加载')
    this.setData({ 
      loading: false,
      transactions: [
        {
          _id: '1',
          description: '早餐',
          categoryName: '餐饮',
          categoryIcon: '🍳',
          type: 'expense',
          amount: 1500,
          amountDisplay: '-15.00',
          dateDisplay: '今天',
          accountName: '现金'
        },
        {
          _id: '2',
          description: '工资',
          categoryName: '收入',
          categoryIcon: '💰',
          type: 'income',
          amount: 500000,
          amountDisplay: '+5000.00',
          dateDisplay: '昨天',
          accountName: '银行卡'
        }
      ],
      monthlyStats: {
        income: 500000,
        expense: 1500,
        balance: 498500
      },
      incomeDisplay: '5000.00',
      expenseDisplay: '15.00',
      balanceDisplay: '+4985.00'
    })
    console.log('简化版页面加载完成')
  },

  onShow() {
    console.log('简化版页面显示')
  },

  onPullDownRefresh() {
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    console.log('到达底部')
  },

  // 记一笔按钮点击
  onRecordTap() {
    wx.navigateTo({
      url: '/pages/record/record'
    })
  },

  // 快速支出
  onQuickExpense() {
    wx.navigateTo({
      url: '/pages/record/record?type=expense'
    })
  },

  // 快速收入
  onQuickIncome() {
    wx.navigateTo({
      url: '/pages/record/record?type=income'
    })
  },

  // 快速转账
  onQuickTransfer() {
    wx.navigateTo({
      url: '/pages/transfer/transfer'
    })
  },

  // 查看全部记录
  onViewAllTap() {
    wx.switchTab({
      url: '/pages/stats/stats'
    })
  },

  // 同步按钮点击
  onSyncTap() {
    wx.showToast({
      title: '同步成功',
      icon: 'success'
    })
  },

  // 点击交易记录
  onTransactionTap(e) {
    console.log('点击交易记录')
  },

  // 长按交易记录
  onTransactionLongPress(e) {
    console.log('长按交易记录')
  },

  // 新交易提示点击
  onNewTransactionTap() {
    console.log('新交易提示点击')
  },

  // 关闭提示
  onCloseTip() {
    console.log('关闭提示')
  }
})