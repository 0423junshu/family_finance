// pages/template-edit/template-edit.js
const { showLoading, hideLoading, showToast } = require('../../utils/uiUtil')
const { formatAmount } = require('../../utils/formatter')

Page({
  data: {
    // 页面模式：create-创建，edit-编辑
    mode: 'create',
    
    // 模板数据
    template: {
      id: '',
      name: '',
      type: 'expense', // expense, income
      amount: '',
      categoryId: '',
      categoryName: '',
      accountId: '',
      accountName: '',
      icon: '💰',
      description: ''
    },
    
    // 分类数据
    expenseCategories: [],
    incomeCategories: [],
    
    // 账户数据
    accounts: [],
    
    // 图标选择
    showIconPicker: false,
    iconList: [
      '💰', '🍽️', '🚗', '🛒', '🎬', '🏥', '📚', '✈️', 
      '🏠', '👕', '⚡', '📱', '🎮', '🎵', '🏃', '💊',
      '🎁', '🧧', '📈', '💼', '🎯', '⭐', '🔥', '💎'
    ],
    
    // 表单验证错误
    errors: {},
    
    // UI状态
    loading: false
  },

  onLoad(options) {
    const mode = options.mode || 'create'
    const templateId = options.id
    
    this.setData({ mode })
    
    // 加载基础数据
    this.loadCategories()
    this.loadAccounts()
    
    // 如果是编辑模式，加载模板数据
    if (mode === 'edit' && templateId) {
      this.loadTemplate(templateId)
    }
  },

  // 加载分类数据
  async loadCategories() {
    try {
      // 获取自定义分类
      const customCategories = wx.getStorageSync('customCategories') || []
      
      // 默认支出分类
      const defaultExpenseCategories = [
        { id: 'food', name: '餐饮', icon: '🍽️', color: '#FF6B6B' },
        { id: 'transport', name: '交通', icon: '🚗', color: '#4ECDC4' },
        { id: 'shopping', name: '购物', icon: '🛒', color: '#45B7D1' },
        { id: 'entertainment', name: '娱乐', icon: '🎬', color: '#96CEB4' },
        { id: 'medical', name: '医疗', icon: '🏥', color: '#FFEAA7' },
        { id: 'education', name: '教育', icon: '📚', color: '#DDA0DD' },
        { id: 'housing', name: '住房', icon: '🏠', color: '#74B9FF' },
        { id: 'clothing', name: '服饰', icon: '👕', color: '#FD79A8' }
      ]
      
      // 默认收入分类
      const defaultIncomeCategories = [
        { id: 'salary', name: '工资', icon: '💰', color: '#00D2FF' },
        { id: 'bonus', name: '奖金', icon: '🎁', color: '#3742FA' },
        { id: 'investment', name: '投资收益', icon: '📈', color: '#2ED573' },
        { id: 'parttime', name: '兼职', icon: '💼', color: '#FFA502' },
        { id: 'gift', name: '礼金', icon: '🧧', color: '#FF4757' },
        { id: 'other', name: '其他收入', icon: '💸', color: '#747D8C' }
      ]
      
      // 合并分类
      const expenseCategories = [
        ...defaultExpenseCategories,
        ...customCategories.filter(c => c.type === 'expense')
      ]
      
      const incomeCategories = [
        ...defaultIncomeCategories,
        ...customCategories.filter(c => c.type === 'income')
      ]
      
      this.setData({ 
        expenseCategories,
        incomeCategories
      })
    } catch (error) {
      console.error('加载分类失败:', error)
    }
  },

  // 加载账户数据
  async loadAccounts() {
    try {
      // 默认账户
      const defaultAccounts = [
        { id: 'cash', name: '现金', icon: '💵', color: '#34C759' },
        { id: 'alipay', name: '支付宝', icon: '💙', color: '#1890FF' },
        { id: 'wechat', name: '微信支付', icon: '💚', color: '#07C160' },
        { id: 'bank_icbc', name: '工商银行', icon: '🏦', color: '#C41E3A' },
        { id: 'bank_ccb', name: '建设银行', icon: '🏦', color: '#003DA5' },
        { id: 'bank_abc', name: '农业银行', icon: '🏦', color: '#00A651' },
        { id: 'bank_boc', name: '中国银行', icon: '🏦', color: '#B8860B' }
      ]
      
      // 获取自定义账户
      const customAccounts = wx.getStorageSync('customAccounts') || []
      
      const accounts = [...defaultAccounts, ...customAccounts]
      
      this.setData({ accounts })
    } catch (error) {
      console.error('加载账户失败:', error)
    }
  },

  // 加载模板数据（编辑模式）
  async loadTemplate(templateId) {
    try {
      const templates = wx.getStorageSync('templates') || []
      const template = templates.find(t => t.id === templateId)
      
      if (template) {
        // 格式化金额显示
        const amountDisplay = template.amount ? (template.amount / 100).toFixed(2) : ''
        
        this.setData({
          template: {
            ...template,
            amount: amountDisplay
          }
        })
      } else {
        showToast('模板不存在', 'error')
        wx.navigateBack()
      }
    } catch (error) {
      console.error('加载模板失败:', error)
      showToast('加载失败', 'error')
    }
  },

  // 模板名称输入
  onNameInput(e) {
    this.setData({
      'template.name': e.detail.value
    })
    this.clearFieldError('name')
  },

  // 收支类型切换
  onTypeChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      'template.type': type,
      'template.categoryId': '',
      'template.categoryName': ''
    })
    this.clearFieldError('category')
  },

  // 分类选择
  onCategoryChange(e) {
    const index = parseInt(e.detail.value)
    const categories = this.data.template.type === 'expense' ? 
                      this.data.expenseCategories : 
                      this.data.incomeCategories
    const category = categories[index]
    
    if (category) {
      this.setData({
        'template.categoryId': category.id,
        'template.categoryName': category.name
      })
      this.clearFieldError('category')
    }
  },

  // 账户选择
  onAccountChange(e) {
    const index = parseInt(e.detail.value)
    const account = this.data.accounts[index]
    
    if (account) {
      this.setData({
        'template.accountId': account.id,
        'template.accountName': account.name
      })
      this.clearFieldError('account')
    }
  },

  // 金额输入
  onAmountInput(e) {
    let value = e.detail.value.replace(/[^\d.]/g, '')
    
    // 限制小数点后两位
    const parts = value.split('.')
    if (parts.length > 2) {
      value = parts[0] + '.' + parts[1]
    }
    if (parts[1] && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2)
    }
    
    this.setData({
      'template.amount': value
    })
    this.clearFieldError('amount')
  },

  // 备注输入
  onDescriptionInput(e) {
    this.setData({
      'template.description': e.detail.value
    })
  },

  // 显示图标选择器
  showIconPicker() {
    this.setData({ showIconPicker: true })
  },

  // 隐藏图标选择器
  hideIconPicker() {
    this.setData({ showIconPicker: false })
  },

  // 选择图标
  onIconSelect(e) {
    const icon = e.currentTarget.dataset.icon
    this.setData({
      'template.icon': icon,
      showIconPicker: false
    })
  },

  // 表单验证
  validateForm() {
    const errors = {}
    const { template } = this.data
    
    if (!template.name.trim()) {
      errors.name = '请输入模板名称'
    }
    
    if (!template.categoryId) {
      errors.category = '请选择分类'
    }
    
    if (!template.accountId) {
      errors.account = '请选择账户'
    }
    
    if (!template.amount) {
      errors.amount = '请输入金额'
    } else {
      const amount = parseFloat(template.amount)
      if (isNaN(amount) || amount <= 0) {
        errors.amount = '请输入有效的金额'
      } else if (amount > 999999.99) {
        errors.amount = '金额不能超过999999.99'
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

  // 保存模板
  async onSave() {
    if (!this.validateForm()) {
      const firstError = Object.values(this.data.errors)[0]
      showToast(firstError, 'error')
      return
    }

    try {
      this.setData({ loading: true })
      showLoading('保存中...')
      
      const { template, mode } = this.data
      
      // 构建模板数据
      const templateData = {
        id: mode === 'create' ? Date.now().toString() : template.id,
        name: template.name.trim(),
        type: template.type,
        amount: Math.round(parseFloat(template.amount) * 100), // 转换为分
        categoryId: template.categoryId,
        categoryName: template.categoryName,
        accountId: template.accountId,
        accountName: template.accountName,
        icon: template.icon,
        description: template.description.trim(),
        createTime: mode === 'create' ? new Date().toISOString() : template.createTime,
        updateTime: new Date().toISOString()
      }
      
      // 获取现有模板
      const templates = wx.getStorageSync('templates') || []
      
      if (mode === 'create') {
        // 检查是否已存在同名模板
        const existingTemplate = templates.find(t => t.name === templateData.name)
        if (existingTemplate) {
          hideLoading()
          this.setData({ loading: false })
          showToast('模板名称已存在', 'error')
          return
        }
        
        // 添加新模板
        templates.push(templateData)
        showToast('模板创建成功', 'success')
      } else {
        // 更新现有模板
        const index = templates.findIndex(t => t.id === templateData.id)
        if (index !== -1) {
          templates[index] = templateData
          showToast('模板更新成功', 'success')
        } else {
          hideLoading()
          this.setData({ loading: false })
          showToast('模板不存在', 'error')
          return
        }
      }
      
      // 保存到本地存储
      wx.setStorageSync('templates', templates)
      
      hideLoading()
      this.setData({ loading: false })
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
      
    } catch (error) {
      console.error('保存模板失败:', error)
      hideLoading()
      this.setData({ loading: false })
      showToast('保存失败', 'error')
    }
  },

  // 取消编辑
  onCancel() {
    wx.showModal({
      title: '提示',
      content: '确定要取消编辑吗？未保存的内容将丢失。',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack()
        }
      }
    })
  },

  // 阻止冒泡
  noop() {}
})