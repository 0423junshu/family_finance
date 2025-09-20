// pages/transaction-detail/transaction-detail.js
const transactionService = require('../../services/transaction-simple')
const { formatDate, formatAmount } = require('../../utils/formatter')

Page({
  data: {
    pageMoneyVisible: true,
    loading: true,
    transaction: null,
    formattedDate: '',
    formattedAmount: '',
    showDeleteConfirm: false
  },

  onLoad(options) {
    const app = getApp()
    const route = this.route
    const g = app.globalData || {}
    const v = (g.pageVisibility && Object.prototype.hasOwnProperty.call(g.pageVisibility, route))
      ? g.pageVisibility[route]
      : !g.hideAmount
    this.setData({ pageMoneyVisible: v })

    const { id } = options
    if (id) {
      this.loadTransactionDetail(id)
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 800)
    }
  },

  // 加载交易详情
  async loadTransactionDetail(id) {
    try {
      this.setData({ loading: true })
      
      const transaction = await transactionService.getTransactionDetail(id)
      
      // 格式化数据
      const formattedDate = formatDate(transaction.date || transaction.createTime)
      const formattedAmount = formatAmount(transaction.amount)
      
      this.setData({
        transaction,
        formattedDate,
        formattedAmount,
        loading: false
      })
    } catch (error) {
      console.error('加载交易详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 800)
    }
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

  // 编辑交易
  onEditTap() {
    const { transaction } = this.data
    wx.navigateTo({
      url: `/pages/record/record?mode=edit&id=${transaction.id || transaction._id}`
    })
  },

  // 显示删除确认
  onDeleteTap() {
    this.setData({
      showDeleteConfirm: true
    })
  },

  // 取消删除
  onCancelDelete() {
    this.setData({
      showDeleteConfirm: false
    })
  },

  // 确认删除
  async onConfirmDelete() {
    try {
      const { transaction } = this.data
      await transactionService.deleteTransaction(transaction.id || transaction._id)
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      
      setTimeout(() => {
        wx.navigateBack()
      }, 800)
    } catch (error) {
      console.error('删除失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      })
    } finally {
      this.setData({
        showDeleteConfirm: false
      })
    }
  },

  // 返回上一页
  onBackTap() {
    wx.navigateBack()
  },
  
  // 阻止冒泡空函数（用于对话框容器 catchtap）
  noop() {}
})
