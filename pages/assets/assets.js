// pages/assets/assets.js
const dataConsistency = require('../../services/data-consistency')
const { updateAccountBalance, deleteAccount } = require('../../services/account')

Page({
  data: {
    totalAssets: 0,
    showEditDialog: false,
    editingAccount: null,
    editAmount: '',
    lastUpdateTime: 0,
    accounts: [
      {
        id: '1',
        name: '现金',
        type: 'cash',
        balance: 100000,
        icon: '💰'
      },
      {
        id: '2', 
        name: '招商银行',
        type: 'bank',
        balance: 500000,
        icon: '🏦'
      },
      {
        id: '3',
        name: '支付宝',
        type: 'wallet', 
        balance: 50000,
        icon: '📱'
      }
    ],
    investments: [
      {
        id: '1',
        name: '余额宝',
        type: 'fund',
        amount: 200000,
        profit: 1500,
        profitRate: 0.75,
        icon: '📈'
      }
    ],
    // 数据一致性状态
    dataConsistency: {
      checking: false,
      hasIssues: false,
      issues: [],
      detailedMessage: ''
    }
  },

  onLoad() {
    this.calculateTotalAssets()
  },

  onShow() {
    this.loadData()
    // 监听账户变更
    const accountChanged = wx.getStorageSync('accountChanged')
    if (accountChanged && accountChanged > this.data.lastUpdateTime) {
      this.loadData()
      this.setData({ lastUpdateTime: Date.now() })
    }
    
    // 执行数据一致性检查
    this.checkDataConsistency()
  },

  // 计算总资产
  calculateTotalAssets() {
    const { accounts, investments } = this.data
    const accountsTotal = accounts.reduce((sum, item) => sum + item.balance, 0)
    const investmentsTotal = investments.reduce((sum, item) => sum + item.amount, 0)
    const totalAssets = accountsTotal + investmentsTotal

    // 格式化显示数据
    const formattedAccounts = accounts.map(item => ({
      ...item,
      balanceDisplay: (item.balance / 100).toFixed(2)
    }))

    const formattedInvestments = investments.map(item => ({
      ...item,
      amountDisplay: (item.amount / 100).toFixed(2),
      profitDisplay: (item.profit / 100).toFixed(2)
    }))

    this.setData({ 
      totalAssets,
      totalAssetsDisplay: (totalAssets / 100).toFixed(2),
      accounts: formattedAccounts,
      investments: formattedInvestments
    })
    
    // 保存总资产到本地存储，用于数据一致性校验
    wx.setStorageSync('totalAssets', totalAssets)
  },

  // 加载账户数据
  loadAccountData() {
    // 这里可以从本地存储或云端加载真实数据
    this.calculateTotalAssets()
  },

  // 添加账户
  onAddAccount() {
    wx.navigateTo({
      url: '/pages/account-manage/account-manage?mode=create'
    })
  },

  // 账户详情
  onAccountTap(e) {
    const accountId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/account-detail/account-detail?id=${accountId}`
    })
  },

  // 投资详情
  onInvestmentTap(e) {
    const investmentId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/investment-detail/investment-detail?id=${investmentId}`
    })
  },

  // 加载数据
  async loadData() {
    try {
      // 加载账户数据
      const accounts = wx.getStorageSync('accounts') || this.data.accounts
      const investments = wx.getStorageSync('investments') || this.data.investments
      
      this.setData({ accounts, investments })
      this.calculateTotalAssets()
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  },

  // 编辑账户金额
  onEditAmount(e) {
    const account = e.currentTarget.dataset.account
    this.setData({
      showEditDialog: true,
      editingAccount: account,
      editAmount: (account.balance / 100).toString()
    })
  },

  // 关闭编辑对话框
  closeEditDialog() {
    this.setData({
      showEditDialog: false,
      editingAccount: null,
      editAmount: ''
    })
  },

  // 金额输入
  onAmountInput(e) {
    let value = e.detail.value.replace(/[^\d.]/g, '')
    const parts = value.split('.')
    if (parts.length > 2) {
      value = parts[0] + '.' + parts[1]
    }
    if (parts[1] && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2)
    }
    this.setData({ editAmount: value })
  },

  // 保存金额修改
  async saveAmount() {
    const amount = parseFloat(this.data.editAmount)
    if (isNaN(amount) || amount < 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'error' })
      return
    }

    try {
      const accounts = wx.getStorageSync('accounts') || this.data.accounts
      const index = accounts.findIndex(a => a.id === this.data.editingAccount.id)
      
      if (index !== -1) {
        accounts[index].balance = Math.round(amount * 100)
        wx.setStorageSync('accounts', accounts)
        wx.setStorageSync('accountChanged', Date.now())
        
        wx.showToast({ title: '修改成功', icon: 'success' })
        this.closeEditDialog()
        this.loadData()
        
        // 执行数据一致性检查
        this.checkDataConsistency()
      }
    } catch (error) {
      console.error('保存失败:', error)
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },
  
  // 执行数据一致性检查 - 优化为提示性检查
  async checkDataConsistency() {
    this.setData({
      'dataConsistency.checking': true
    })
    
    try {
      // 执行全面数据一致性检查，但不自动弹出修复提示
      const result = await dataConsistency.performFullConsistencyCheck(false)
      
      this.setData({
        'dataConsistency.checking': false,
        'dataConsistency.hasIssues': result.needFix,
        'dataConsistency.detailedMessage': result.detailedMessage || '',
        'dataConsistency.issues': result.needFix ? [
          ...(!result.accountValidation.isAllValid ? [{
            type: 'account',
            message: '账户余额与交易记录不一致',
            details: result.accountValidation.results.filter(r => !r.isValid).map(account => ({
              ...account,
              differenceDisplay: (Math.abs(account.difference) / 100).toFixed(2)
            }))
          }] : []),
          ...(!result.assetValidation.isValid ? [{
            type: 'asset',
            message: '资产总额与账户余额之和不一致',
            details: {
              calculatedTotal: result.assetValidation.calculatedTotal,
              storedTotal: result.assetValidation.storedTotal,
              difference: result.assetValidation.difference
            }
          }] : [])
        ] : []
      })
      
      // 如果有数据一致性问题，只在UI上显示提示，不弹窗打扰用户
      if (result.needFix) {
        console.log('检测到数据一致性问题，用户可以手动修复')
      }
    } catch (error) {
      console.error('数据一致性检查失败:', error)
      this.setData({
        'dataConsistency.checking': false
      })
    }
  },
  
  // 修复数据一致性问题 - 优化用户体验
  async fixDataConsistency() {
    wx.showLoading({
      title: '正在修复...',
      mask: true
    })
    
    try {
      // 执行自动修复
      const result = await dataConsistency.performFullConsistencyCheck(true)
      
      wx.hideLoading()
      
      if (result.fixed) {
        wx.showToast({
          title: '修复成功',
          icon: 'success'
        })
        
        // 重新加载数据
        this.loadData()
        
        // 更新数据一致性状态
        this.setData({
          'dataConsistency.hasIssues': false,
          'dataConsistency.issues': [],
          'dataConsistency.detailedMessage': ''
        })
      } else {
        wx.showToast({
          title: '数据已是最新',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('修复数据一致性失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '修复失败',
        icon: 'error'
      })
    }
  },
  
  // 手动触发数据一致性检查
  onCheckConsistency() {
    wx.showModal({
      title: '数据一致性检查',
      content: '是否执行数据一致性检查？如发现问题将提供修复选项。',
      confirmText: '检查',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          this.setData({
            'dataConsistency.checking': true
          })
          
          try {
            // 执行全面数据一致性检查
            const result = await dataConsistency.performFullConsistencyCheck(false)
            
            this.setData({
              'dataConsistency.checking': false,
              'dataConsistency.hasIssues': result.needFix,
              'dataConsistency.detailedMessage': result.detailedMessage || '',
              'dataConsistency.issues': result.needFix ? [
                ...(!result.accountValidation.isAllValid ? [{
                  type: 'account',
                  message: '账户余额与交易记录不一致',
                  details: result.accountValidation.results.filter(r => !r.isValid)
                }] : []),
                ...(!result.assetValidation.isValid ? [{
                  type: 'asset',
                  message: '资产总额与账户余额之和不一致',
                  details: {
                    calculatedTotal: result.assetValidation.calculatedTotal,
                    storedTotal: result.assetValidation.storedTotal,
                    difference: result.assetValidation.difference
                  }
                }] : [])
              ] : []
            })
            
            // 显示检查结果
            if (result.needFix) {
              wx.showModal({
                title: '发现数据问题',
                content: result.detailedMessage || '检测到账户数据存在不一致问题，是否立即修复？',
                confirmText: '立即修复',
                cancelText: '稍后处理',
                success: async (res) => {
                  if (res.confirm) {
                    await this.fixDataConsistency()
                  }
                }
              })
            } else {
              wx.showToast({
                title: '数据一致性良好',
                icon: 'success'
              })
            }
          } catch (error) {
            console.error('数据一致性检查失败:', error)
            this.setData({
              'dataConsistency.checking': false
            })
            wx.showToast({
              title: '检查失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },
  
  // 添加投资
  onAddInvestment() {
    wx.navigateTo({
      url: '/pages/investment-add/investment-add'
    })
  },
  
  // 编辑账户
  onEditAccount(e) {
    const accountId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/account-manage/account-manage?mode=edit&id=${accountId}`
    })
  },
  
  // 查看数据一致性详情
  viewConsistencyDetails() {
    if (this.data.dataConsistency.hasIssues && this.data.dataConsistency.detailedMessage) {
      wx.showModal({
        title: '数据一致性问题详情',
        content: this.data.dataConsistency.detailedMessage,
        confirmText: '立即修复',
        cancelText: '关闭',
        success: async (res) => {
          if (res.confirm) {
            await this.fixDataConsistency()
          }
        }
      })
    }
  }
})