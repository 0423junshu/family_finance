// pages/investment-add/investment-add.js
const { showLoading, hideLoading, showToast } = require('../../utils/uiUtil')

Page({
  data: {
    mode: 'create', // create, edit
    loading: false,
    submitting: false,
    
    // 表单数据
    formData: {
      name: '',
      type: 'fund',
      amount: '',
      cost: '',
      description: '',
      purchaseDate: '',
      expectedReturn: ''
    },
    
    // 投资类型选项
    investmentTypes: [
      { value: 'fund', label: '基金', icon: '💰' },
      { value: 'bank', label: '银行理财', icon: '🏦' },
      { value: 'stock', label: '股票', icon: '📈' },
      { value: 'bond', label: '债券', icon: '📋' },
      { value: 'crypto', label: '数字货币', icon: '₿' },
      { value: 'other', label: '其他', icon: '🔖' }
    ],
    
    // UI状态
    showTypePicker: false,
    
    // 验证错误
    errors: {}
  },

  onLoad(options) {
    const mode = options.mode || 'create'
    const investmentId = options.id
    
    this.setData({ mode })
    
    // 设置默认购买日期为今天
    const today = new Date().toISOString().split('T')[0]
    this.setData({
      'formData.purchaseDate': today
    })
    
    // 初始化当前类型名称
    this.updateCurrentTypeName()
    
    if (mode === 'edit' && investmentId) {
      this.loadInvestmentData(investmentId)
    }
  },

  // 更新当前类型名称
  updateCurrentTypeName() {
    const currentType = this.data.investmentTypes.find(t => t.value === this.data.formData.type)
    this.setData({
      currentTypeName: currentType ? currentType.label : '基金',
      currentTypeIcon: currentType ? currentType.icon : '📈'
    })
  },

  // 加载投资数据（编辑模式）
  async loadInvestmentData(investmentId) {
    try {
      this.setData({ loading: true })
      
      const investments = wx.getStorageSync('investments') || []
      const investment = investments.find(inv => inv.id === investmentId)
      
      if (investment) {
        this.setData({
          formData: {
            name: investment.name,
            type: investment.type,
            amount: (investment.amount / 100).toFixed(2),
            cost: (investment.cost / 100).toFixed(2),
            description: investment.description || '',
            purchaseDate: investment.purchaseDate || new Date().toISOString().split('T')[0],
            expectedReturn: investment.expectedReturn || ''
          }
        })
        
        // 更新当前类型名称
        this.updateCurrentTypeName()
        // 计算收益
        this.calculateProfit()
      }
      
      this.setData({ loading: false })
    } catch (error) {
      console.error('加载投资数据失败:', error)
      this.setData({ loading: false })
      showToast('加载失败', 'error')
    }
  },

  // 投资名称输入
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
    this.clearFieldError('name')
  },

  // 当前价值输入
  onAmountInput(e) {
    const value = this.formatAmountInput(e.detail.value)
    this.setData({
      'formData.amount': value
    })
    this.clearFieldError('amount')
    this.calculateProfit()
  },

  // 成本输入
  onCostInput(e) {
    const value = this.formatAmountInput(e.detail.value)
    this.setData({
      'formData.cost': value
    })
    this.clearFieldError('cost')
    this.calculateProfit()
  },

  // 计算收益
  calculateProfit() {
    const amount = parseFloat(this.data.formData.amount) || 0
    const cost = parseFloat(this.data.formData.cost) || 0
    
    if (amount > 0 && cost > 0) {
      const profitAmount = amount - cost
      const profitRate = (profitAmount / cost) * 100
      const isPositive = profitAmount >= 0
      
      this.setData({
        showProfitDisplay: true,
        profitData: {
          isPositive: isPositive,
          profitAmountText: `${isPositive ? '+' : ''}${profitAmount.toFixed(2)}`,
          profitRateText: `${isPositive ? '+' : ''}${profitRate.toFixed(2)}%`
        }
      })
    } else {
      this.setData({
        showProfitDisplay: false
      })
    }
  },

  // 预期收益率输入
  onExpectedReturnInput(e) {
    let value = e.detail.value.replace(/[^\d.]/g, '')
    
    // 防止多个小数点
    const dotIndex = value.indexOf('.')
    if (dotIndex !== -1) {
      value = value.substring(0, dotIndex + 1) + 
              value.substring(dotIndex + 1).replace(/\./g, '')
    }
    
    // 限制小数点后最多两位
    if (dotIndex !== -1 && value.length > dotIndex + 3) {
      value = value.substring(0, dotIndex + 3)
    }
    
    // 限制最大值
    const numValue = parseFloat(value)
    if (numValue > 100) {
      showToast('预期收益率不能超过100%', 'none')
      return
    }
    
    this.setData({
      'formData.expectedReturn': value
    })
  },

  // 格式化金额输入
  formatAmountInput(value) {
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
      return this.data.formData.amount || this.data.formData.cost
    }
    
    return formattedValue
  },

  // 金额输入完成
  onAmountBlur(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    if (value && !isNaN(parseFloat(value))) {
      const formattedValue = parseFloat(value).toFixed(2)
      this.setData({
        [`formData.${field}`]: formattedValue
      })
    }
  },

  // 描述输入
  onDescriptionInput(e) {
    this.setData({
      'formData.description': e.detail.value
    })
  },

  // 购买日期选择
  onDateChange(e) {
    this.setData({
      'formData.purchaseDate': e.detail.value
    })
  },

  // 显示类型选择器
  showTypePicker() {
    this.setData({ showTypePicker: true })
  },

  // 选择投资类型
  onTypeSelect(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      'formData.type': type,
      showTypePicker: false
    })
    
    // 更新当前类型名称
    this.updateCurrentTypeName()
    
    this.clearFieldError('type')
  },

  // 表单验证
  validateForm() {
    const errors = {}
    
    // 验证投资名称
    if (!this.data.formData.name.trim()) {
      errors.name = '请输入投资名称'
    } else if (this.data.formData.name.trim().length > 30) {
      errors.name = '投资名称不能超过30个字符'
    }
    
    // 验证当前价值
    if (!this.data.formData.amount || parseFloat(this.data.formData.amount) <= 0) {
      errors.amount = '请输入有效的当前价值'
    }
    
    // 验证成本
    if (!this.data.formData.cost || parseFloat(this.data.formData.cost) <= 0) {
      errors.cost = '请输入有效的投资成本'
    }
    
    // 验证投资类型
    if (!this.data.formData.type) {
      errors.type = '请选择投资类型'
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
      showToast(Object.values(this.data.errors)[0], 'error')
      return
    }

    this.setData({ submitting: true })
    
    try {
      const amount = Math.round(parseFloat(this.data.formData.amount) * 100) // 转换为分
      const cost = Math.round(parseFloat(this.data.formData.cost) * 100) // 转换为分
      const returnAmount = amount - cost
      const returnRate = cost > 0 ? (returnAmount / cost * 100) : 0
      
      const investmentData = {
        id: this.data.mode === 'edit' ? this.data.investmentId : Date.now().toString(),
        name: this.data.formData.name.trim(),
        type: this.data.formData.type,
        amount: amount,
        cost: cost,
        return: returnAmount,
        returnRate: returnRate,
        description: this.data.formData.description.trim(),
        purchaseDate: this.data.formData.purchaseDate,
        expectedReturn: this.data.formData.expectedReturn ? parseFloat(this.data.formData.expectedReturn) : 0,
        icon: this.getTypeIcon(this.data.formData.type),
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
      
      // 保存到本地存储
      let investments = wx.getStorageSync('investments') || []
      
      if (this.data.mode === 'create') {
        investments.push(investmentData)
        showToast('投资添加成功', 'success')
      } else {
        const index = investments.findIndex(inv => inv.id === investmentData.id)
        if (index !== -1) {
          investments[index] = { ...investments[index], ...investmentData }
          showToast('投资更新成功', 'success')
        }
      }
      
      wx.setStorageSync('investments', investments)
      
      // 同步到资产页面
      this.syncToAssetsPage(investments)
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('保存投资失败:', error)
      showToast(error.message || '保存失败', 'error')
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 获取类型图标
  getTypeIcon(type) {
    const iconMap = {
      'fund': '💰',
      'bank': '🏦',
      'stock': '📈',
      'bond': '📋',
      'crypto': '₿',
      'other': '🔖'
    }
    return iconMap[type] || '💰'
  },

  // 同步到资产页面
  syncToAssetsPage(investments) {
    try {
      const assetsData = wx.getStorageSync('assetsData') || {}
      assetsData.investments = investments.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        amount: item.amount,
        profit: item.return,
        profitRate: item.returnRate,
        icon: item.icon
      }))
      wx.setStorageSync('assetsData', assetsData)
    } catch (error) {
      console.error('同步资产数据失败:', error)
    }
  },

  // 删除投资
  onDelete() {
    if (this.data.mode !== 'edit') return
    
    wx.showModal({
      title: '确认删除',
      content: '删除投资后，相关数据将无法恢复，确定要删除吗？',
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: (res) => {
        if (res.confirm) {
          this.deleteInvestment()
        }
      }
    })
  },

  // 执行删除
  async deleteInvestment() {
    try {
      let investments = wx.getStorageSync('investments') || []
      investments = investments.filter(inv => inv.id !== this.data.investmentId)
      wx.setStorageSync('investments', investments)
      
      // 同步到资产页面
      this.syncToAssetsPage(investments)
      
      showToast('投资删除成功', 'success')
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('删除投资失败:', error)
      showToast('删除失败', 'error')
    }
  },

  // 关闭选择器
  onPickerClose() {
    this.setData({
      showTypePicker: false
    })
  }
})