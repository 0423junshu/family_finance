// pages/record/record.js
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
      tags: [],
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
    errors: {},
    
    // 隐藏金额状态
    hideAmount: false
  },

  onLoad(options) {
    this.initPage(options)
  },

  onShow() {
    this.loadData()
  },

  // 全局数据更新回调
  onGlobalDataUpdate(event, data) {
    if (event === 'hideAmountChanged') {
      this.setData({
        hideAmount: data.hideAmount
      })
    }
  },

  // 初始化页面
  async initPage(options) {
    const { mode = 'create', id, type = 'expense' } = options
    const today = new Date().toISOString().split('T')[0]
    
    this.setData({
      mode,
      transactionId: id,
      'formData.date': today,
      'formData.type': type,
      hideAmount: getApp().globalData.hideAmount || false
    })

    if (mode === 'edit' && id) {
      await this.loadTransactionDetail(id)
    }
  },

  // 加载数据
  async loadData() {
    this.setData({ loading: true })
    
    try {
      const promises = [
        this.loadCategories(),
        this.loadAccounts(),
        this.loadTags()
      ]
      
      await Promise.all(promises)
      this.updateDisplayData()
    } catch (error) {
      console.error('加载数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 更新显示数据
  updateDisplayData() {
    const selectedCategory = this.data.categories.find(cat => cat._id === this.data.formData.categoryId)
    const selectedAccount = this.data.accounts.find(acc => acc._id === this.data.formData.accountId || acc.id === this.data.formData.accountId)
    const selectedTargetAccount = this.data.accounts.find(acc => acc._id === this.data.formData.targetAccountId || acc.id === this.data.formData.targetAccountId)
    const selectedTags = this.data.tags.filter(tag => this.data.formData.tags.includes(tag._id))
    
    // 处理账户余额显示
    const processedAccounts = this.data.accounts.map(account => ({
      ...account,
      balanceDisplay: (account.balance / 100).toFixed(2)
    }))
    
    this.setData({
      selectedCategory,
      selectedAccount,
      selectedTargetAccount,
      selectedTags,
      accounts: processedAccounts
    })
  },

  // 加载分类
  async loadCategories() {
    try {
      // 获取自定义分类
      const customCategories = wx.getStorageSync('customCategories') || []
      
      // 默认分类
      const defaultCategories = [
        // 支出分类
        { _id: 'expense_1', name: '餐饮', icon: '🍽️', type: 'expense', color: '#FF6B6B' },
        { _id: 'expense_2', name: '交通', icon: '🚗', type: 'expense', color: '#4ECDC4' },
        { _id: 'expense_3', name: '购物', icon: '🛒', type: 'expense', color: '#45B7D1' },
        { _id: 'expense_4', name: '娱乐', icon: '🎬', type: 'expense', color: '#96CEB4' },
        { _id: 'expense_5', name: '医疗', icon: '🏥', type: 'expense', color: '#FFEAA7' },
        { _id: 'expense_6', name: '教育', icon: '📚', type: 'expense', color: '#DDA0DD' },
        { _id: 'expense_7', name: '住房', icon: '🏠', type: 'expense', color: '#FFB6C1' },
        { _id: 'expense_8', name: '通讯', icon: '📱', type: 'expense', color: '#87CEEB' },
        
        // 收入分类
        { _id: 'income_1', name: '工资', icon: '💰', type: 'income', color: '#32CD32' },
        { _id: 'income_2', name: '奖金', icon: '🎁', type: 'income', color: '#FFD700' },
        { _id: 'income_3', name: '投资收益', icon: '📈', type: 'income', color: '#00CED1' },
        { _id: 'income_4', name: '兼职', icon: '💼', type: 'income', color: '#9370DB' },
        { _id: 'income_5', name: '礼金', icon: '🧧', type: 'income', color: '#FF69B4' },
        { _id: 'income_6', name: '退款', icon: '↩️', type: 'income', color: '#20B2AA' },
        
        // 转账分类
        { _id: 'transfer_1', name: '转账', icon: '🔄', type: 'transfer', color: '#808080' }
      ]
      
      // 合并分类
      const allCategories = [...defaultCategories, ...customCategories]
      
      this.setData({ categories: allCategories })
    } catch (error) {
      console.error('加载分类失败:', error)
    }
  },

  // 加载账户
  async loadAccounts() {
    try {
      // 从本地存储获取账户数据，移除默认的农业银行
      const accounts = wx.getStorageSync('accounts') || [
        { _id: '1', id: '1', name: '现金', type: 'cash', balance: 100000, icon: '💰' },
        { _id: '2', id: '2', name: '招商银行', type: 'bank', balance: 500000, icon: '🏦' },
        { _id: '3', id: '3', name: '支付宝', type: 'wallet', balance: 50000, icon: '📱' }
      ]
      
      this.setData({ accounts })
      
      // 不设置默认账户，让用户主动选择
      // 这样可以避免默认选择农业银行的问题
    } catch (error) {
      console.error('加载账户失败:', error)
    }
  },

  // 加载标签
  async loadTags() {
    try {
      // 这里应该调用实际的API
      const tags = [
        { _id: '1', name: '必需品' },
        { _id: '2', name: '娱乐' },
        { _id: '3', name: '投资' },
        { _id: '4', name: '礼品' }
      ]
      
      this.setData({ tags })
    } catch (error) {
      console.error('加载标签失败:', error)
    }
  },

  // 加载交易详情（编辑模式）
  async loadTransactionDetail(id) {
    try {
      const transaction = await transactionService.getTransactionDetail(id)
      
      this.setData({
        formData: {
          ...transaction,
          date: transaction.date.split('T')[0], // 格式化日期
          amount: (transaction.amount / 100).toString() // 转换为元
        }
      })
      
      this.updateDisplayData()
    } catch (error) {
      console.error('加载交易详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 切换交易类型
  onTypeChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      'formData.type': type,
      'formData.categoryId': '', // 重置分类
      'formData.targetAccountId': '' // 重置目标账户
    })
    
    this.updateDisplayData()
  },

  // 金额输入
  onAmountInput(e) {
    const value = e.detail.value
    // 限制小数点后两位，允许输入过程中的临时状态
    let formattedValue = value.replace(/[^\d.]/g, '')
    
    // 防止多个小数点
    const dotIndex = formattedValue.indexOf('.')
    if (dotIndex !== -1) {
      formattedValue = formattedValue.substring(0, dotIndex + 1) + 
                     formattedValue.substring(dotIndex + 1).replace(/\./g, '')
    }
    
    // 限制小数点后最多两位，但不在输入过程中强制格式化
    if (dotIndex !== -1 && formattedValue.length > dotIndex + 3) {
      formattedValue = formattedValue.substring(0, dotIndex + 3)
    }
    
    // 限制最大金额（防止输入过大数字）
    const numValue = parseFloat(formattedValue)
    if (numValue > 999999.99) {
      wx.showToast({
        title: '金额不能超过999999.99',
        icon: 'none'
      })
      return
    }
    
    this.setData({
      'formData.amount': formattedValue
    })
    
    this.clearFieldError('amount')
  },

  // 金额输入完成（失去焦点时）
  onAmountBlur(e) {
    const value = e.detail.value
    if (value && !isNaN(parseFloat(value))) {
      // 格式化为两位小数
      const formattedValue = parseFloat(value).toFixed(2)
      this.setData({
        'formData.amount': formattedValue
      })
    }
  },

  // 金额输入框获得焦点
  onAmountFocus(e) {
    // 清除格式化，方便编辑
    const value = this.data.formData.amount
    if (value && value.endsWith('.00')) {
      this.setData({
        'formData.amount': value.replace('.00', '')
      })
    }
  },

  // 选择分类
  onCategoryTap() {
    this.setData({ showCategoryPicker: true })
  },

  onCategorySelect(e) {
    const categoryId = e.currentTarget.dataset.id
    const selectedCategory = this.data.categories.find(cat => cat._id === categoryId)
    
    if (selectedCategory) {
      this.setData({
        'formData.categoryId': categoryId,
        'formData.category': selectedCategory.name, // 确保分类名称也被保存
        showCategoryPicker: false
      })
      
      this.updateDisplayData()
      this.clearFieldError('categoryId')
      
      console.log('选择分类:', selectedCategory.name, 'ID:', categoryId)
    }
  },

  // 显示新增分类对话框
  onAddCategoryTap() {
    this.setData({
      showAddCategoryDialog: true,
      showCategoryPicker: false,
      newCategory: {
        name: '',
        icon: '💰',
        color: '#007AFF'
      }
    })
  },

  // 新增分类名称输入
  onNewCategoryNameInput(e) {
    this.setData({
      'newCategory.name': e.detail.value
    })
  },

  // 选择分类图标
  onCategoryIconSelect(e) {
    const icon = e.currentTarget.dataset.icon
    this.setData({
      'newCategory.icon': icon
    })
  },

  // 选择分类颜色
  onCategoryColorSelect(e) {
    const color = e.currentTarget.dataset.color
    this.setData({
      'newCategory.color': color
    })
  },

  // 保存新分类
  async saveNewCategory() {
    const { name, icon, color } = this.data.newCategory
    const { type } = this.data.formData
    
    if (!name.trim()) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'error'
      })
      return
    }
    
    try {
      // 获取现有自定义分类
      const customCategories = wx.getStorageSync('customCategories') || []
      
      // 生成新分类ID
      const newId = `custom_${type}_${Date.now()}`
      
      // 创建新分类
      const newCategory = {
        _id: newId,
        name: name.trim(),
        icon,
        color,
        type,
        isCustom: true
      }
      
      // 保存到本地存储
      customCategories.push(newCategory)
      wx.setStorageSync('customCategories', customCategories)
      
      // 重新加载分类
      await this.loadCategories()
      
      // 自动选择新创建的分类
      this.setData({
        'formData.categoryId': newId,
        showAddCategoryDialog: false
      })
      
      this.updateDisplayData()
      
      wx.showToast({
        title: '分类创建成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('保存分类失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      })
    }
  },

  // 取消新增分类
  cancelAddCategory() {
    this.setData({
      showAddCategoryDialog: false,
      newCategory: {
        name: '',
        icon: '💰',
        color: '#007AFF'
      }
    })
  },

  // 选择账户
  onAccountTap() {
    this.setData({ 
      showAccountPicker: true,
      currentPickerType: 'account'
    })
  },

  onAccountSelect(e) {
    const accountId = e.currentTarget.dataset.id
    
    if (this.data.currentPickerType === 'targetAccount') {
      this.setData({
        'formData.targetAccountId': accountId,
        showAccountPicker: false
      })
      this.clearFieldError('targetAccountId')
    } else {
      this.setData({
        'formData.accountId': accountId,
        showAccountPicker: false
      })
      this.clearFieldError('accountId')
    }
    
    this.updateDisplayData()
  },

  // 选择目标账户（转账）
  onTargetAccountTap() {
    this.setData({ 
      showAccountPicker: true,
      currentPickerType: 'targetAccount'
    })
  },

  // 日期选择
  onDateChange(e) {
    this.setData({
      'formData.date': e.detail.value
    })
    
    this.clearFieldError('date')
  },

  // 备注输入
  onDescriptionInput(e) {
    this.setData({
      'formData.description': e.detail.value
    })
  },

  // 选择标签
  onTagTap() {
    this.setData({ showTagPicker: true })
  },

  onTagSelect(e) {
    const tagId = e.currentTarget.dataset.id
    const tags = [...this.data.formData.tags]
    const index = tags.indexOf(tagId)
    
    if (index > -1) {
      tags.splice(index, 1)
    } else {
      tags.push(tagId)
    }
    
    this.setData({
      'formData.tags': tags
    })
    
    this.updateDisplayData()
  },

  // 拍照上传
  onCameraTap() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        this.uploadImage(res.tempFiles[0].tempFilePath)
      }
    })
  },

  // 选择图片
  onImageTap() {
    wx.chooseMedia({
      count: 3 - this.data.formData.images.length,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        res.tempFiles.forEach(file => {
          this.uploadImage(file.tempFilePath)
        })
      }
    })
  },

  // 上传图片
  async uploadImage(tempFilePath) {
    try {
      wx.showLoading({ title: '上传中...' })
      
      // 模拟上传，实际应该使用云存储
      const images = [...this.data.formData.images, tempFilePath]
      this.setData({
        'formData.images': images
      })
      
      wx.hideLoading()
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('上传图片失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '上传失败',
        icon: 'error'
      })
    }
  },

  // 删除图片
  onImageDelete(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.formData.images]
    images.splice(index, 1)
    
    this.setData({
      'formData.images': images
    })
  },

  // 获取位置
  onLocationTap() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        // 这里可以调用地理编码API获取地址
        this.setData({
          'formData.location': `${res.latitude},${res.longitude}`
        })
        
        wx.showToast({
          title: '位置已获取',
          icon: 'success'
        })
      },
      fail: () => {
        wx.showToast({
          title: '获取位置失败',
          icon: 'error'
        })
      }
    })
  },

  // 表单验证
  validateForm() {
    const errors = {}
    const { formData } = this.data
    
    // 验证金额
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = '请输入有效金额'
    }
    
    // 验证分类
    if (!formData.categoryId) {
      errors.categoryId = '请选择分类'
    }
    
    // 验证账户 - 修复账户选择校验异常问题
    // 同时检查id和_id字段，因为数据可能使用不同的字段名
    if (!formData.accountId) {
      errors.accountId = '请选择账户'
    } else {
      // 确认选择的账户确实存在
      const accountExists = this.data.accounts.some(acc => 
        acc.id === formData.accountId || acc._id === formData.accountId
      )
      
      if (!accountExists) {
        errors.accountId = '请选择有效账户'
      }
    }
    
    // 验证转账目标账户
    if (formData.type === 'transfer') {
      if (!formData.targetAccountId) {
        errors.targetAccountId = '请选择转入账户'
      } else {
        // 确认选择的目标账户确实存在
        const targetAccountExists = this.data.accounts.some(acc => 
          acc.id === formData.targetAccountId || acc._id === formData.targetAccountId
        )
        
        if (!targetAccountExists) {
          errors.targetAccountId = '请选择有效的转入账户'
        }
      }
      
      // 验证转账账户不能相同
      if (formData.accountId === formData.targetAccountId) {
        errors.targetAccountId = '转出和转入账户不能相同'
      }
    }
    
    this.setData({ errors })
    return Object.keys(errors).length === 0
  },

  // 清除字段错误
  clearFieldError(field) {
    const errors = { ...this.data.errors }
    delete errors[field]
    this.setData({ errors })
  },

  // 提交表单
  async onSubmit() {
    if (this.data.submitting) return
    
    // 表单验证
    if (!this.validateForm()) {
      wx.showToast({
        title: Object.values(this.data.errors)[0],
        icon: 'error'
      })
      return
    }

    this.setData({ submitting: true })
    
    try {
      const formData = {
        ...this.data.formData,
        amount: Math.round(parseFloat(this.data.formData.amount) * 100) // 转换为分
      }

      if (this.data.mode === 'create') {
        await transactionService.createTransaction(formData)
        wx.showToast({
          title: '记录成功',
          icon: 'success'
        })
      } else {
        await transactionService.updateTransaction(this.data.transactionId, formData)
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
      }

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('提交失败:', error)
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'error'
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 关闭选择器
  onPickerClose() {
    this.setData({
      showCategoryPicker: false,
      showAccountPicker: false,
      showTagPicker: false,
      showAddCategoryDialog: false
    })
  }
})