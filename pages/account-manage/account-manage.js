// pages/account-manage/account-manage.js
const { showLoading, hideLoading, showToast } = require('../../utils/uiUtil')

Page({
  data: {
    mode: 'create', // create, edit
    loading: false,
    submitting: false,
    
    // 表单数据
    formData: {
      name: '',
      type: 'cash',
      balance: '',
      description: '',
      icon: '💰'
    },
    
    // 账户类型选项
    accountTypes: [
      { value: 'cash', label: '现金', icon: '💰' },
      { value: 'bank', label: '银行卡', icon: '🏦' },
      { value: 'wallet', label: '电子钱包', icon: '📱' },
      { value: 'credit', label: '信用卡', icon: '💳' },
      { value: 'investment', label: '投资账户', icon: '📈' },
      { value: 'other', label: '其他', icon: '🔖' }
    ],
    
    // 图标选项
    iconOptions: [
      '💰', '🏦', '📱', '💳', '📈', '🔖',
      '💵', '💴', '💶', '💷', '🪙', '💎',
      '🏧', '🏪', '🏬', '🏢', '🏛️', '🏠'
    ],
    
    // UI状态
    showTypePicker: false,
    showIconPicker: false,
    
    // 验证错误
    errors: {}
  },

  onLoad(options) {
    const mode = options.mode || 'create'
    const accountId = options.id
    
    this.setData({ mode })
    
    // 初始化当前类型名称
    this.updateCurrentTypeName()
    
    if (mode === 'edit' && accountId) {
      this.loadAccountData(accountId)
    }
  },

  // 加载账户数据（编辑模式）
  async loadAccountData(accountId) {
    try {
      this.setData({ loading: true })
      
      // 模拟从存储中获取账户数据
      const accounts = wx.getStorageSync('accounts') || []
      const account = accounts.find(acc => acc.id === accountId)
      
      if (account) {
        this.setData({
          formData: {
            name: account.name,
            type: account.type,
            balance: (account.balance / 100).toFixed(2),
            description: account.description || '',
            icon: account.icon
          }
        })
        
        // 更新当前类型名称
        this.updateCurrentTypeName()
      }
      
      this.setData({ loading: false })
    } catch (error) {
      console.error('加载账户数据失败:', error)
      this.setData({ loading: false })
      showToast('加载失败', 'error')
    }
  },

  // 账户名称输入
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
    this.clearFieldError('name')
  },

  // 余额输入
  onBalanceInput(e) {
    const value = e.detail.value
    let formattedValue = value.replace(/[^\d.]/g, '')
    
    // 防止多个小数点
    const dotIndex = formattedValue.indexOf('.')
    if (dotIndex !== -1) {
      formattedValue = formattedValue.substring(0, dotIndex + 1) + 
                     formattedValue.substring(dotIndex + 1).replace(/\./g, '')
    }
    
    // 限制小数点后最多两位
    if (dotIndex !== -1 && formattedValue.length > dotIndex + 3) {
      formattedValue = formattedValue.substring(0, dotIndex + 3)
    }
    
    // 限制最大金额
    const numValue = parseFloat(formattedValue)
    if (numValue > 9999999.99) {
      showToast('金额不能超过9999999.99', 'none')
      return
    }
    
    this.setData({
      'formData.balance': formattedValue
    })
    
    this.clearFieldError('balance')
  },

  // 余额输入完成
  onBalanceBlur(e) {
    const value = e.detail.value
    if (value && !isNaN(parseFloat(value))) {
      const formattedValue = parseFloat(value).toFixed(2)
      this.setData({
        'formData.balance': formattedValue
      })
    }
  },

  // 描述输入
  onDescriptionInput(e) {
    this.setData({
      'formData.description': e.detail.value
    })
  },

  // 显示类型选择器
  showTypePicker() {
    this.setData({ showTypePicker: true })
  },

  // 选择账户类型
  onTypeSelect(e) {
    const type = e.currentTarget.dataset.type
    const typeInfo = this.data.accountTypes.find(t => t.value === type)
    
    this.setData({
      'formData.type': type,
      'formData.icon': typeInfo.icon,
      showTypePicker: false
    })
    
    // 更新当前类型名称
    this.updateCurrentTypeName()
    
    this.clearFieldError('type')
  },

  // 显示图标选择器
  showIconPicker() {
    this.setData({ showIconPicker: true })
  },

  // 选择图标
  onIconSelect(e) {
    const icon = e.currentTarget.dataset.icon
    this.setData({
      'formData.icon': icon,
      showIconPicker: false
    })
  },

  // 表单验证
  validateForm() {
    const errors = {}
    
    // 验证账户名称
    if (!this.data.formData.name.trim()) {
      errors.name = '请输入账户名称'
    } else if (this.data.formData.name.trim().length > 20) {
      errors.name = '账户名称不能超过20个字符'
    }
    
    // 验证余额
    if (!this.data.formData.balance || parseFloat(this.data.formData.balance) < 0) {
      errors.balance = '请输入有效的余额'
    }
    
    // 验证账户类型
    if (!this.data.formData.type) {
      errors.type = '请选择账户类型'
    }
    
    this.setData({ errors })
    return Object.keys(errors).length === 0
  },

  // 更新当前类型名称
  updateCurrentTypeName() {
    const currentType = this.data.accountTypes.find(t => t.value === this.data.formData.type)
    this.setData({
      currentTypeName: currentType ? currentType.label : '现金'
    })
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
      showToast(Object.values(this.data.errors)[0], 'error')
      return
    }

    this.setData({ submitting: true })
    
    try {
      const accountData = {
        id: this.data.mode === 'edit' ? this.data.accountId : Date.now().toString(),
        name: this.data.formData.name.trim(),
        type: this.data.formData.type,
        balance: Math.round(parseFloat(this.data.formData.balance) * 100), // 转换为分
        description: this.data.formData.description.trim(),
        icon: this.data.formData.icon,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
      
      // 保存到本地存储
      let accounts = wx.getStorageSync('accounts') || []
      
      if (this.data.mode === 'create') {
        accounts.push(accountData)
        showToast('账户创建成功', 'success')
      } else {
        const index = accounts.findIndex(acc => acc.id === accountData.id)
        if (index !== -1) {
          accounts[index] = { ...accounts[index], ...accountData }
          showToast('账户更新成功', 'success')
        }
      }
      
      wx.setStorageSync('accounts', accounts)
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('保存账户失败:', error)
      showToast(error.message || '保存失败', 'error')
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 删除账户
  onDelete() {
    if (this.data.mode !== 'edit') return
    
    wx.showModal({
      title: '确认删除',
      content: '删除账户后，相关的交易记录将无法关联到此账户，确定要删除吗？',
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: (res) => {
        if (res.confirm) {
          this.deleteAccount()
        }
      }
    })
  },

  // 执行删除
  async deleteAccount() {
    try {
      let accounts = wx.getStorageSync('accounts') || []
      accounts = accounts.filter(acc => acc.id !== this.data.accountId)
      wx.setStorageSync('accounts', accounts)
      
      showToast('账户删除成功', 'success')
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('删除账户失败:', error)
      showToast('删除失败', 'error')
    }
  },

  // 关闭选择器
  onPickerClose() {
    this.setData({
      showTypePicker: false,
      showIconPicker: false
    })
  }
})