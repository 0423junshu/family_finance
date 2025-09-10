// pages/transfer/transfer.js
const { getAccounts } = require('../../services/account')
const { createTransaction } = require('../../services/transaction-simple')
const { formatAmount } = require('../../utils/formatter')
const { showLoading, hideLoading, showToast } = require('../../utils/uiUtil')

Page({
  data: {
    loading: true,
    submitting: false,
    
    // 表单数据
    formData: {
      amount: '',
      fromAccountId: '',
      toAccountId: '',
      description: '',
      date: ''
    },
    
    // 账户数据
    accounts: [],
    fromAccount: null,
    toAccount: null,
    
    // UI状态
    showFromAccountPicker: false,
    showToAccountPicker: false,
    
    // 验证错误
    errors: {}
  },

  onLoad() {
    this.initPage()
  },

  // 初始化页面
  async initPage() {
    const today = new Date().toISOString().split('T')[0]
    this.setData({
      'formData.date': today
    })
    
    await this.loadAccounts()
  },

  // 加载账户列表
  async loadAccounts() {
    try {
      this.setData({ loading: true })
      
      // 从本地存储获取账户数据，确保与记账页面一致
      const storedAccounts = wx.getStorageSync('accounts') || []
      
      // 如果没有存储的账户，使用默认账户
      const defaultAccounts = [
        { 
          _id: '1', 
          id: '1',
          name: '现金', 
          type: 'cash', 
          balance: 100000, // 1000元
          icon: '💰'
        },
        { 
          _id: '2', 
          id: '2',
          name: '招商银行', 
          type: 'bank', 
          balance: 500000, // 5000元
          icon: '🏦'
        },
        { 
          _id: '3', 
          id: '3',
          name: '支付宝', 
          type: 'wallet', 
          balance: 50000, // 500元
          icon: '📱'
        }
      ]
      
      const accounts = storedAccounts.length > 0 ? storedAccounts : defaultAccounts
      
      // 处理账户余额显示
      const processedAccounts = accounts.map(account => ({
        ...account,
        balanceDisplay: formatAmount(account.balance)
      }))
      
      this.setData({ 
        accounts: processedAccounts,
        loading: false 
      })
    } catch (error) {
      console.error('加载账户失败:', error)
      this.setData({ loading: false })
      showToast('加载账户失败', 'error')
    }
  },

  // 金额输入
  onAmountInput(e) {
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
    if (numValue > 999999.99) {
      showToast('金额不能超过999999.99', 'none')
      return
    }
    
    this.setData({
      'formData.amount': formattedValue
    })
    
    this.clearFieldError('amount')
  },

  // 金额输入完成
  onAmountBlur(e) {
    const value = e.detail.value
    if (value && !isNaN(parseFloat(value))) {
      const formattedValue = parseFloat(value).toFixed(2)
      this.setData({
        'formData.amount': formattedValue
      })
    }
  },

  // 选择转出账户
  onFromAccountTap() {
    this.setData({ showFromAccountPicker: true })
  },

  onFromAccountSelect(e) {
    const accountId = e.currentTarget.dataset.id
    // 同时检查_id和id字段，确保兼容性
    const account = this.data.accounts.find(acc => acc._id === accountId || acc.id === accountId)
    
    if (!account) {
      showToast('账户不存在', 'error')
      return
    }
    
    this.setData({
      'formData.fromAccountId': accountId,
      fromAccount: account,
      showFromAccountPicker: false
    })
    
    this.clearFieldError('fromAccountId')
  },

  // 选择转入账户
  onToAccountTap() {
    this.setData({ showToAccountPicker: true })
  },

  onToAccountSelect(e) {
    const accountId = e.currentTarget.dataset.id
    // 同时检查_id和id字段，确保兼容性
    const account = this.data.accounts.find(acc => acc._id === accountId || acc.id === accountId)
    
    if (!account) {
      showToast('账户不存在', 'error')
      return
    }
    
    this.setData({
      'formData.toAccountId': accountId,
      toAccount: account,
      showToAccountPicker: false
    })
    
    this.clearFieldError('toAccountId')
  },

  // 备注输入
  onDescriptionInput(e) {
    this.setData({
      'formData.description': e.detail.value
    })
  },

  // 日期选择
  onDateChange(e) {
    this.setData({
      'formData.date': e.detail.value
    })
  },

  // 表单验证
  validateForm() {
    const errors = {}
    
    // 验证金额
    if (!this.data.formData.amount || parseFloat(this.data.formData.amount) <= 0) {
      errors.amount = '请输入有效金额'
    }
    
    // 验证转出账户
    if (!this.data.formData.fromAccountId) {
      errors.fromAccountId = '请选择转出账户'
    } else {
      // 确认选择的账户确实存在
      const accountExists = this.data.accounts.some(acc => 
        acc.id === this.data.formData.fromAccountId || acc._id === this.data.formData.fromAccountId
      )
      
      if (!accountExists) {
        errors.fromAccountId = '请选择有效的转出账户'
      }
    }
    
    // 验证转入账户
    if (!this.data.formData.toAccountId) {
      errors.toAccountId = '请选择转入账户'
    } else {
      // 确认选择的账户确实存在
      const accountExists = this.data.accounts.some(acc => 
        acc.id === this.data.formData.toAccountId || acc._id === this.data.formData.toAccountId
      )
      
      if (!accountExists) {
        errors.toAccountId = '请选择有效的转入账户'
      }
    }
    
    // 验证账户不能相同
    if (this.data.formData.fromAccountId === this.data.formData.toAccountId) {
      errors.toAccountId = '转出和转入账户不能相同'
    }
    
    // 验证余额是否充足
    const amount = parseFloat(this.data.formData.amount) * 100 // 转换为分
    if (this.data.fromAccount && this.data.fromAccount.balance < amount) {
      errors.amount = '转出账户余额不足'
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

  // 提交转账
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
      
      // 获取当前交易记录，用于生成ID
      const existingTransactions = wx.getStorageSync('transactions') || []
      const newId = Date.now().toString()
      
      // 创建转出记录
      const outTransaction = {
        id: newId + '_out',
        type: 'expense',
        amount: amount,
        category: '转账',
        categoryId: 'transfer_1',
        account: this.data.fromAccount.name,
        accountId: this.data.fromAccount._id || this.data.fromAccount.id,
        description: `转账到${this.data.toAccount.name}${this.data.formData.description ? ' - ' + this.data.formData.description : ''}`,
        date: this.data.formData.date,
        tags: ['转账'],
        createTime: new Date().toISOString()
      }
      
      // 创建转入记录
      const inTransaction = {
        id: newId + '_in',
        type: 'income',
        amount: amount,
        category: '转账',
        categoryId: 'transfer_1',
        account: this.data.toAccount.name,
        accountId: this.data.toAccount._id || this.data.toAccount.id,
        description: `从${this.data.fromAccount.name}转入${this.data.formData.description ? ' - ' + this.data.formData.description : ''}`,
        date: this.data.formData.date,
        tags: ['转账'],
        createTime: new Date().toISOString()
      }
      
      // 保存交易记录
      const updatedTransactions = [...existingTransactions, outTransaction, inTransaction]
      wx.setStorageSync('transactions', updatedTransactions)
      
      // 更新账户余额
      const accounts = [...this.data.accounts]
      const fromAccountIndex = accounts.findIndex(acc => 
        (acc._id || acc.id) === (this.data.fromAccount._id || this.data.fromAccount.id)
      )
      const toAccountIndex = accounts.findIndex(acc => 
        (acc._id || acc.id) === (this.data.toAccount._id || this.data.toAccount.id)
      )
      
      if (fromAccountIndex !== -1) {
        accounts[fromAccountIndex].balance -= amount
      }
      
      if (toAccountIndex !== -1) {
        accounts[toAccountIndex].balance += amount
      }
      
      // 保存更新后的账户数据
      wx.setStorageSync('accounts', accounts)
      wx.setStorageSync('accountChanged', Date.now())

      showToast('转账成功', 'success')
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 800)
    } catch (error) {
      console.error('转账失败:', error)
      showToast(error.message || '转账失败', 'error')
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 关闭选择器
  onPickerClose() {
    this.setData({
      showFromAccountPicker: false,
      showToAccountPicker: false
    })
  }
})