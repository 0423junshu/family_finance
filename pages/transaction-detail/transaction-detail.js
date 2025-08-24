// pages/transaction-detail/transaction-detail.js
const transactionService = require('../../services/transaction-simple')
const { formatDate, formatAmount } = require('../../utils/formatter')

Page({
  data: {
    loading: true,
    transaction: null,
    formattedDate: '',
    formattedAmount: '',
    showDeleteConfirm: false
  },

  onLoad(options) {
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
      }, 1500)
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
      }, 1500)
    }
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
      }, 1500)
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
  }
})