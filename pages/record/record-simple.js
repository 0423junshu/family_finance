// pages/record/record-simple.js
/**
 * 简化版记账页面
 * 移除了复杂的协作功能依赖
 */

const transactionService = require('../../services/transaction-simple')
const validator = require('../../utils/validator')

Page({
  data: {
    mode: 'create', // create, edit
    loading: true,
    submitting: false,
    
    // 表单数据
    formData: {
      type: 'expense', // expense, income, transfer
      amount: '',
      categoryId: '',
      accountId: '',
      targetAccountId: '', // 转账目标账户
      date: '',
      description: '',
      tags: [], // 确保初始化为空数组
      images: [],
      location: null
    },
    
    // 显示数据
    selectedCategory: null,
    selectedAccount: null,
    selectedTargetAccount: null,
    selectedTags: [],
    
    // 选项数据
    categories: [],
    accounts: [],
    tags: [],
    
    // UI状态
    showCategoryPicker: false,
    showAccountPicker: false,
    showTagPicker: false,
    showDatePicker: false,
    showAddCategoryDialog: false,
    
    // 新增分类表单
    newCategory: {
      name: '',
      icon: '💰',
      color: '#007AFF'
    },
    
    // 验证错误
    validationErrors: {}
  },

  async onLoad(options) {
    try {
      this.setData({ loading: true })
      
      // 解析页面参数
      if (options.mode) {
        this.setData({ mode: options.mode })
      }
      
      if (options.id && this.data.mode === 'edit') {
        await this.loadTransactionData(options.id)
      }
      
      // 加载选项数据
      await this.loadOptionsData()
      
      // 初始化表单数据
      this.initFormData()
      
      this.setData({ loading: false })
      
    } catch (error) {
      console.error('页面加载失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '页面加载失败',
        icon: 'error'
      })
    }
  },

  // 加载交易数据（编辑模式）
  async loadTransactionData(id) {
    try {
      const transaction = await transactionService.getTransactionById(id)
      if (transaction) {
        this.prepareFormData(transaction)
      }
    } catch (error) {
      console.error('加载交易数据失败:', error)
      throw error
    }
  },

  // 加载选项数据
  async loadOptionsData() {
    try {
      // 这里可以添加分类、账户、标签的加载逻辑
      // 暂时使用空数组
      this.setData({
        categories: [],
        accounts: [],
        tags: []
      })
    } catch (error) {
      console.error('加载选项数据失败:', error)
    }
  },

  // 初始化表单数据
  initFormData() {
    const currentDate = new Date().toISOString().split('T')[0]
    this.setData({
      'formData.date': currentDate
    })
  },

  // 准备表单数据（编辑模式）
  prepareFormData(transaction) {
    const formData = {
      type: transaction.type,
      amount: transaction.amount.toString(),
      categoryId: transaction.categoryId || '',
      accountId: transaction.accountId || '',
      targetAccountId: transaction.targetAccountId || '',
      date: transaction.date || '',
      description: transaction.description || '',
      tags: transaction.tags || [],
      images: transaction.images || [],
      location: transaction.location || null
    }
    
    this.setData({ formData })
  },

  // 表单提交
  async onSubmit() {
    try {
      // 表单验证
      if (!this.validateForm()) {
        return
      }
      
      this.setData({ submitting: true })
      
      const formData = this.data.formData
      const transactionData = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        categoryId: formData.categoryId,
        accountId: formData.accountId,
        targetAccountId: formData.targetAccountId,
        date: formData.date,
        description: formData.description,
        tags: formData.tags,
        images: formData.images,
        location: formData.location
      }
      
      let result
      if (this.data.mode === 'create') {
        result = await transactionService.createTransaction(transactionData)
      } else {
        result = await transactionService.updateTransaction(options.id, transactionData)
      }
      
      if (result) {
        wx.showToast({
          title: this.data.mode === 'create' ? '记账成功' : '更新成功',
          icon: 'success'
        })
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
      
    } catch (error) {
      console.error('提交失败:', error)
      wx.showToast({
        title: '提交失败',
        icon: 'error'
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 表单验证
  validateForm() {
    const errors = {}
    const formData = this.data.formData
    
    // 金额验证
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = '请输入有效的金额'
    }
    
    // 分类验证
    if (!formData.categoryId) {
      errors.categoryId = '请选择分类'
    }
    
    // 账户验证
    if (!formData.accountId) {
      errors.accountId = '请选择账户'
    }
    
    // 日期验证
    if (!formData.date) {
      errors.date = '请选择日期'
    }
    
    this.setData({ validationErrors: errors })
    return Object.keys(errors).length === 0
  },

  // 输入框变化处理
  onInputChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    
    this.setData({
      [`formData.${field}`]: value
    })
    
    // 清除该字段的错误信息
    if (this.data.validationErrors[field]) {
      this.setData({
        [`validationErrors.${field}`]: ''
      })
    }
  },

  // 选择器变化处理
  onPickerChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    
    this.setData({
      [`formData.${field}`]: value
    })
  },

  onShow() {
    // 页面显示时的逻辑
  },

  onHide() {
    // 页面隐藏时的逻辑
  },

  onUnload() {
    // 页面卸载时的逻辑
  }
})