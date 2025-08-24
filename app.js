// app.js
const { globalData } = require('./utils/globalData')

App({
  globalData: globalData,

  onLaunch() {
    // 快速初始化，不显示加载提示
    this.initCloudBase()
    this.initGlobalConfig()
    this.performSystemFix()
    this.checkLoginStatus()
  },

  onShow() {
    // 检查更新
    this.checkUpdate()
  },

  // 初始化云开发
  initCloudBase() {
    if (!wx.cloud) {
      console.log('云开发不可用，使用本地存储模式')
      this.globalData.cloudAvailable = false
      return
    }
    
    try {
      wx.cloud.init({
        env: 'cloud1-7gb1x63o23c1e5f2', // 您的云开发环境ID
        traceUser: true
      })
      
      this.globalData.cloud = wx.cloud
      this.globalData.cloudAvailable = true
      console.log('云开发初始化成功')
    } catch (error) {
      console.log('云开发初始化失败，使用本地存储模式:', error)
      this.globalData.cloudAvailable = false
    }
  },

  // 检查登录状态
  async checkLoginStatus() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        this.globalData.userInfo = userInfo
        this.globalData.isLogin = true
      }
    } catch (error) {
      console.error('检查登录状态失败:', error)
    }
  },

  // 初始化全局配置
  initGlobalConfig() {
    // 隐藏金额设置
    const hideAmount = wx.getStorageSync('hideAmount') || false
    this.globalData.hideAmount = hideAmount
    
    // 主题设置
    const theme = wx.getStorageSync('theme') || 'light'
    this.globalData.theme = theme
    
    // 语言设置
    const language = wx.getStorageSync('language') || 'zh-cn'
    this.globalData.language = language
  },

  // 检查更新
  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经准备好，是否重启应用？',
              success: (res) => {
                if (res.confirm) {
                  updateManager.applyUpdate()
                }
              }
            })
          })
        }
      })
    }
  },

  // 用户登录
  async login() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'login'
      })
      
      if (result.success) {
        this.globalData.userInfo = result.userInfo
        this.globalData.isLogin = true
        wx.setStorageSync('userInfo', result.userInfo)
        return result.userInfo
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('登录失败:', error)
      wx.showToast({
        title: '登录失败',
        icon: 'error'
      })
      throw error
    }
  },

  // 用户登出
  logout() {
    this.globalData.userInfo = null
    this.globalData.isLogin = false
    this.globalData.currentFamily = null
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('currentFamily')
    
    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/login/login'
    })
  },

  // 切换隐藏金额状态
  toggleHideAmount() {
    this.globalData.hideAmount = !this.globalData.hideAmount
    wx.setStorageSync('hideAmount', this.globalData.hideAmount)
    
    // 通知所有页面更新
    this.notifyPageUpdate('hideAmountChanged', {
      hideAmount: this.globalData.hideAmount
    })
  },

  // 通知页面更新
  notifyPageUpdate(event, data) {
    const pages = getCurrentPages()
    pages.forEach(page => {
      if (page.onGlobalDataUpdate) {
        page.onGlobalDataUpdate(event, data)
      }
    })
  },

  // 执行系统功能修复
  performSystemFix() {
    try {
      console.log('执行系统功能修复...')
      
      // 检查是否已经修复过
      const systemFixed = wx.getStorageSync('systemFixed')
      const currentVersion = '1.0.0'
      
      if (systemFixed && systemFixed.version === currentVersion) {
        console.log('系统已修复，跳过修复流程')
        return
      }
      
      // 1. 修复记账功能的账户选择问题
      this.fixRecordingFunction()
      
      // 2. 修复转账功能
      this.fixTransferFunction()
      
      // 3. 修复预算管理功能
      this.fixBudgetManagement()
      
      // 4. 修复分类管理功能
      this.fixCategoryManagement()
      
      // 5. 设置修复完成标记
      wx.setStorageSync('systemFixed', {
        timestamp: Date.now(),
        version: currentVersion,
        features: [
          '记账功能账户选择修复',
          '转账功能账户验证修复', 
          '预算管理编辑功能修复',
          '分类管理自定义功能完善'
        ]
      })
      
      console.log('✅ 系统功能修复完成')
    } catch (error) {
      console.error('系统功能修复失败:', error)
    }
  },

  // 修复记账功能
  fixRecordingFunction() {
    const accounts = wx.getStorageSync('accounts') || []
    
    if (accounts.length === 0) {
      const defaultAccounts = [
        { _id: '1', id: '1', name: '现金', type: 'cash', balance: 100000, icon: '💰' },
        { _id: '2', id: '2', name: '招商银行', type: 'bank', balance: 500000, icon: '🏦' },
        { _id: '3', id: '3', name: '支付宝', type: 'wallet', balance: 50000, icon: '📱' }
      ]
      wx.setStorageSync('accounts', defaultAccounts)
    } else {
      // 确保现有账户数据格式正确
      const validatedAccounts = accounts.map(account => ({
        ...account,
        _id: account._id || account.id,
        id: account.id || account._id,
        balance: typeof account.balance === 'number' ? account.balance : parseInt(account.balance) || 0
      }))
      wx.setStorageSync('accounts', validatedAccounts)
    }
  },

  // 修复转账功能
  fixTransferFunction() {
    const customCategories = wx.getStorageSync('customCategories') || []
    const hasTransferCategory = customCategories.some(cat => cat.id === 'transfer_1')
    
    if (!hasTransferCategory) {
      const transferCategory = {
        _id: 'transfer_1', id: 'transfer_1', name: '转账', 
        icon: '🔄', type: 'transfer', color: '#808080'
      }
      customCategories.push(transferCategory)
      wx.setStorageSync('customCategories', customCategories)
    }
  },

  // 修复预算管理功能
  fixBudgetManagement() {
    const budgets = wx.getStorageSync('budgets') || []
    const incomeExpectations = wx.getStorageSync('incomeExpectations') || []
    
    const validatedBudgets = budgets.map(budget => ({
      ...budget,
      id: budget.id || Date.now().toString(),
      amount: typeof budget.amount === 'number' ? budget.amount : parseInt(budget.amount) || 0,
      period: budget.period || 'monthly',
      createTime: budget.createTime || new Date().toISOString()
    }))
    
    const validatedIncomeExpectations = incomeExpectations.map(expectation => ({
      ...expectation,
      id: expectation.id || Date.now().toString(),
      amount: typeof expectation.amount === 'number' ? expectation.amount : parseInt(expectation.amount) || 0,
      period: expectation.period || 'monthly',
      createTime: expectation.createTime || new Date().toISOString()
    }))
    
    wx.setStorageSync('budgets', validatedBudgets)
    wx.setStorageSync('incomeExpectations', validatedIncomeExpectations)
  },

  // 修复分类管理功能
  fixCategoryManagement() {
    const customCategories = wx.getStorageSync('customCategories') || []
    
    const validatedCategories = customCategories.map(category => ({
      ...category,
      _id: category._id || category.id || `custom_${category.type}_${Date.now()}`,
      id: category.id || category._id,
      isCustom: true
    }))
    
    wx.setStorageSync('customCategories', validatedCategories)
  }
})
