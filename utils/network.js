/**
 * 网络工具类
 * 处理云函数调用和网络错误，提供自动回退机制
 */

class NetworkUtil {
  // 检查网络状态
  static async checkNetworkStatus() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          resolve({
            isConnected: res.networkType !== 'none',
            networkType: res.networkType
          })
        },
        fail: () => {
          resolve({
            isConnected: false,
            networkType: 'unknown'
          })
        }
      })
    })
  }

  // 检查云开发是否可用
  static isCloudAvailable() {
    return typeof wx !== 'undefined' && wx.cloud && getApp().globalData.isCloudEnabled
  }

  // 安全的云函数调用
  static async safeCloudCall(functionName, data = {}) {
    try {
      // 检查网络
      const network = await this.checkNetworkStatus()
      if (!network.isConnected) {
        console.log('网络未连接，使用本地数据')
        return this.getLocalFallback(functionName, data)
      }

      // 检查云开发
      if (!this.isCloudAvailable()) {
        console.log('云开发不可用，使用本地数据')
        return this.getLocalFallback(functionName, data)
      }

      // 设置超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 8000)
      })

      // 调用云函数
      const callPromise = wx.cloud.callFunction({
        name: functionName,
        data: data
      })

      const result = await Promise.race([callPromise, timeoutPromise])

      if (result.errMsg === 'cloud.callFunction:ok') {
        console.log(`云函数 ${functionName} 调用成功`)
        return result.result
      } else {
        throw new Error(result.errMsg)
      }

    } catch (error) {
      console.error(`云函数 ${functionName} 调用失败:`, error)

      // 显示用户友好的错误提示
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('网络请求错误') ||
          error.message.includes('请求超时')) {
        wx.showToast({
          title: '网络异常，使用离线模式',
          icon: 'none',
          duration: 2000
        })
      }

      // 返回本地数据
      return this.getLocalFallback(functionName, data)
    }
  }

  // 本地数据回退
  static getLocalFallback(functionName, data) {
    console.log(`使用本地数据回退: ${functionName}`)

    switch (functionName) {
      case 'manageBudget':
        return this.getLocalBudgets(data)
      case 'manageCategory':
        return this.getLocalCategories(data)
      case 'updateAccount':
        return this.getLocalAccounts(data)
      case 'createTransaction':
        return this.createLocalTransaction(data)
      case 'getTransactions':
        return this.getLocalTransactions(data)
      default:
        return { 
          success: false, 
          data: [], 
          message: '离线模式',
          isOffline: true 
        }
    }
  }

  // 获取本地预算数据
  static getLocalBudgets(data) {
    const budgets = wx.getStorageSync('budgets') || []

    switch (data.action) {
      case 'list':
        return { success: true, data: budgets, isOffline: true }
        
      case 'create':
        const newBudget = { 
          ...data.budget, 
          id: Date.now().toString(),
          createTime: new Date().toISOString()
        }
        budgets.push(newBudget)
        wx.setStorageSync('budgets', budgets)
        this.addOfflineChange('budget', 'create', newBudget)
        return { success: true, data: budgets, isOffline: true }
        
      case 'update':
        const updateIndex = budgets.findIndex(b => b.id === data.budget.id)
        if (updateIndex !== -1) {
          budgets[updateIndex] = { ...budgets[updateIndex], ...data.budget }
          wx.setStorageSync('budgets', budgets)
          this.addOfflineChange('budget', 'update', budgets[updateIndex])
        }
        return { success: true, data: budgets, isOffline: true }
        
      case 'delete':
        const filtered = budgets.filter(b => b.id !== data.budgetId)
        wx.setStorageSync('budgets', filtered)
        this.addOfflineChange('budget', 'delete', { id: data.budgetId })
        return { success: true, data: filtered, isOffline: true }
        
      default:
        return { success: true, data: budgets, isOffline: true }
    }
  }

  // 获取本地分类数据
  static getLocalCategories(data) {
    const categories = wx.getStorageSync('categories') || this.getDefaultCategories()

    switch (data.action) {
      case 'list':
        return { success: true, data: categories, isOffline: true }
        
      case 'create':
        const newCategory = { 
          ...data.category, 
          id: Date.now().toString(),
          createTime: new Date().toISOString()
        }
        categories.push(newCategory)
        wx.setStorageSync('categories', categories)
        this.addOfflineChange('category', 'create', newCategory)
        return { success: true, data: categories, isOffline: true }
        
      case 'update':
        const updateIndex = categories.findIndex(c => c.id === data.category.id)
        if (updateIndex !== -1) {
          categories[updateIndex] = { ...categories[updateIndex], ...data.category }
          wx.setStorageSync('categories', categories)
          this.addOfflineChange('category', 'update', categories[updateIndex])
        }
        return { success: true, data: categories, isOffline: true }
        
      case 'delete':
        const filtered = categories.filter(c => c.id !== data.categoryId)
        wx.setStorageSync('categories', filtered)
        this.addOfflineChange('category', 'delete', { id: data.categoryId })
        return { success: true, data: filtered, isOffline: true }
        
      default:
        return { success: true, data: categories, isOffline: true }
    }
  }

  // 获取本地账户数据
  static getLocalAccounts(data) {
    const accounts = wx.getStorageSync('accounts') || this.getDefaultAccounts()

    switch (data.action) {
      case 'list':
        return { success: true, data: accounts, isOffline: true }
        
      case 'update':
        const updateIndex = accounts.findIndex(a => a.id === data.account.id)
        if (updateIndex !== -1) {
          accounts[updateIndex] = { ...accounts[updateIndex], ...data.account }
          wx.setStorageSync('accounts', accounts)
          this.addOfflineChange('account', 'update', accounts[updateIndex])
        }
        return { success: true, data: accounts, isOffline: true }
        
      case 'create':
        const newAccount = { 
          ...data.account, 
          id: Date.now().toString(),
          createTime: new Date().toISOString()
        }
        accounts.push(newAccount)
        wx.setStorageSync('accounts', accounts)
        this.addOfflineChange('account', 'create', newAccount)
        return { success: true, data: accounts, isOffline: true }
        
      default:
        return { success: true, data: accounts, isOffline: true }
    }
  }

  // 创建本地交易记录
  static createLocalTransaction(data) {
    const transactions = wx.getStorageSync('transactions') || []
    const newTransaction = {
      ...data.transaction,
      id: Date.now().toString(),
      createTime: new Date().toISOString()
    }
    
    transactions.unshift(newTransaction)
    wx.setStorageSync('transactions', transactions)
    
    // 更新账户余额
    this.updateAccountBalance(newTransaction)
    
    this.addOfflineChange('transaction', 'create', newTransaction)
    return { success: true, data: newTransaction, isOffline: true }
  }

  // 获取本地交易记录
  static getLocalTransactions(data) {
    const transactions = wx.getStorageSync('transactions') || []
    
    // 根据查询条件过滤
    let filteredTransactions = transactions
    
    if (data.month) {
      filteredTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.createTime || t.date)
        return transactionDate.getMonth() + 1 === data.month
      })
    }
    
    if (data.category) {
      filteredTransactions = filteredTransactions.filter(t => t.category === data.category)
    }
    
    if (data.type) {
      filteredTransactions = filteredTransactions.filter(t => t.type === data.type)
    }
    
    return { success: true, data: filteredTransactions, isOffline: true }
  }

  // 更新账户余额
  static updateAccountBalance(transaction) {
    const accounts = wx.getStorageSync('accounts') || []
    const accountIndex = accounts.findIndex(a => a.id === transaction.accountId)
    
    if (accountIndex !== -1) {
      const account = accounts[accountIndex]
      
      if (transaction.type === 'expense') {
        account.balance -= transaction.amount
      } else if (transaction.type === 'income') {
        account.balance += transaction.amount
      }
      
      accounts[accountIndex] = account
      wx.setStorageSync('accounts', accounts)
    }
  }

  // 添加离线变更记录
  static addOfflineChange(type, action, data) {
    const offlineChanges = wx.getStorageSync('offline_changes') || []
    
    offlineChanges.push({
      type,
      action,
      data,
      timestamp: Date.now()
    })
    
    wx.setStorageSync('offline_changes', offlineChanges)
  }

  // 获取默认分类
  static getDefaultCategories() {
    return [
      { id: '1', name: '餐饮', type: 'expense', icon: 'food', color: '#FF6B6B' },
      { id: '2', name: '交通', type: 'expense', icon: 'transport', color: '#4ECDC4' },
      { id: '3', name: '购物', type: 'expense', icon: 'shopping', color: '#45B7D1' },
      { id: '4', name: '娱乐', type: 'expense', icon: 'entertainment', color: '#96CEB4' },
      { id: '5', name: '医疗', type: 'expense', icon: 'medical', color: '#FFEAA7' },
      { id: '6', name: '教育', type: 'expense', icon: 'education', color: '#DDA0DD' },
      { id: '7', name: '工资', type: 'income', icon: 'salary', color: '#98D8C8' },
      { id: '8', name: '奖金', type: 'income', icon: 'bonus', color: '#F7DC6F' },
      { id: '9', name: '投资', type: 'income', icon: 'investment', color: '#BB8FCE' },
      { id: '10', name: '其他收入', type: 'income', icon: 'other', color: '#85C1E9' }
    ]
  }

  // 获取默认账户
  static getDefaultAccounts() {
    return [
      { id: '1', name: '现金', balance: 0, type: 'cash', icon: 'cash' },
      { id: '2', name: '银行卡', balance: 0, type: 'bank', icon: 'bank' },
      { id: '3', name: '支付宝', balance: 0, type: 'alipay', icon: 'alipay' },
      { id: '4', name: '微信', balance: 0, type: 'wechat', icon: 'wechat' }
    ]
  }

  // 同步离线数据
  static async syncOfflineData() {
    const offlineChanges = wx.getStorageSync('offline_changes') || []
    
    if (offlineChanges.length === 0) {
      return { success: true, synced: 0 }
    }

    console.log(`发现 ${offlineChanges.length} 条离线变更，开始同步...`)

    let syncedCount = 0
    const failedChanges = []

    for (const change of offlineChanges) {
      try {
        const functionName = this.getFunctionNameByType(change.type)
        const result = await this.safeCloudCall(functionName, {
          action: change.action,
          [change.type]: change.data,
          userId: 'current-user'
        })

        if (result.success && !result.isOffline) {
          syncedCount++
        } else {
          failedChanges.push(change)
        }
      } catch (error) {
        console.error('同步失败:', change, error)
        failedChanges.push(change)
      }
    }

    // 更新离线变更队列
    wx.setStorageSync('offline_changes', failedChanges)

    console.log(`同步完成: ${syncedCount}/${offlineChanges.length}`)

    return {
      success: true,
      synced: syncedCount,
      failed: failedChanges.length,
      total: offlineChanges.length
    }
  }

  // 根据数据类型获取对应的云函数名
  static getFunctionNameByType(type) {
    const functionMap = {
      'budget': 'manageBudget',
      'category': 'manageCategory',
      'account': 'updateAccount',
      'transaction': 'createTransaction'
    }
    return functionMap[type] || 'manageBudget'
  }

  // 显示网络状态
  static async showNetworkStatus() {
    const network = await this.checkNetworkStatus()
    const cloudAvailable = this.isCloudAvailable()
    const offlineChanges = wx.getStorageSync('offline_changes') || []

    let statusText = ''
    if (network.isConnected && cloudAvailable) {
      statusText = '在线模式'
      if (offlineChanges.length > 0) {
        statusText += ` (${offlineChanges.length}条待同步)`
      }
    } else {
      statusText = '离线模式'
      if (offlineChanges.length > 0) {
        statusText += ` (${offlineChanges.length}条待同步)`
      }
    }

    return {
      isOnline: network.isConnected && cloudAvailable,
      networkType: network.networkType,
      statusText,
      pendingChanges: offlineChanges.length
    }
  }

  // 强制同步数据
  static async forceSyncData() {
    wx.showLoading({ title: '同步中...' })

    try {
      const result = await this.syncOfflineData()
      
      wx.hideLoading()
      
      if (result.synced > 0) {
        wx.showToast({
          title: `同步成功 ${result.synced} 条`,
          icon: 'success'
        })
      } else if (result.failed > 0) {
        wx.showToast({
          title: '部分同步失败',
          icon: 'none'
        })
      } else {
        wx.showToast({
          title: '暂无数据需要同步',
          icon: 'none'
        })
      }

      return result
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '同步失败',
        icon: 'none'
      })
      throw error
    }
  }
}

module.exports = NetworkUtil
