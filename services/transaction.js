// services/transaction.js
// 交易记录服务

const request = require('../utils/request')
const storage = require('../utils/storage')
const validator = require('../utils/validator')
const accountSync = require('./account-sync')

class TransactionService {
  // 创建交易记录
  async createTransaction(data) {
    try {
      // 数据验证
      const schema = validator.getTransactionSchema()
      const { isValid, errors } = validator.validateForm(data, schema)
      
      if (!isValid) {
        throw new Error(Object.values(errors)[0])
      }

      // 尝试云函数调用
      try {
        const result = await request.callFunction('createTransaction', data)
        
        if (result.success) {
          // 更新本地缓存
          this.updateLocalCache('add', result.data)
          return result.data
        } else {
          throw new Error(result.message)
        }
      } catch (cloudError) {
        console.log('云函数调用失败，使用本地存储:', cloudError)
        return this.createTransactionLocal(data)
      }
    } catch (error) {
      console.error('创建交易记录失败:', error)
      
      // 如果是网络错误或云开发错误，使用本地存储
      if (error.code === 'NETWORK_ERROR' || error.message.includes('云开发') || error.message.includes('权限')) {
        return this.createTransactionLocal(data)
      }
      
      throw error
    }
  }

  // 本地创建交易记录
  createTransactionLocal(data) {
    const transactions = wx.getStorageSync('transactions') || []
    const nowId = Date.now().toString()
    const newTransaction = {
      _id: nowId,
      id: nowId,
      ...data,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    }

    // 尝试回填 accountId（若缺失且仅有账户名）
    try {
      if ((!newTransaction.accountId || newTransaction.accountId === '') && newTransaction.account) {
        const accounts = wx.getStorageSync('accounts') || []
        const acc = accounts.find(a => a.name === newTransaction.account)
        if (acc) newTransaction.accountId = acc.id || acc._id
      }
    } catch (_) {}

    // 同步账户余额（本地模式）
    try {
      accountSync.syncTransactionWithAccount(newTransaction, 'create')
    } catch (e) {
      console.warn('本地创建交易联动账户失败（已继续保存）：', e && e.message)
    }
    
    transactions.unshift(newTransaction)
    wx.setStorageSync('transactions', transactions)
    
    // 保存到离线队列
    this.saveOfflineTransaction('create', newTransaction)
    
    return newTransaction
  }

  // 更新交易记录
  async updateTransaction(id, data) {
    try {
      const schema = validator.getTransactionSchema()
      const { isValid, errors } = validator.validateForm(data, schema)
      
      if (!isValid) {
        throw new Error(Object.values(errors)[0])
      }

      try {
        const result = await request.callFunction('updateTransaction', {
          id,
          ...data
        })
        
        if (result.success) {
          this.updateLocalCache('update', result.data)
          return result.data
        } else {
          throw new Error(result.message)
        }
      } catch (cloudError) {
        console.log('云函数调用失败，使用本地存储:', cloudError)
        return this.updateTransactionLocal(id, data)
      }
    } catch (error) {
      console.error('更新交易记录失败:', error)
      
      if (error.code === 'NETWORK_ERROR' || error.message.includes('云开发') || error.message.includes('权限')) {
        return this.updateTransactionLocal(id, data)
      }
      
      throw error
    }
  }

  // 本地更新交易记录
  updateTransactionLocal(id, data) {
    const transactions = wx.getStorageSync('transactions') || []
    const index = transactions.findIndex(t => t._id === id || t.id === id)
    
    if (index > -1) {
      const oldTransaction = { ...transactions[index] }
      const updated = {
        ...transactions[index],
        ...data,
        updateTime: new Date().toISOString()
      }

      // 确保 id 存在
      if (!updated.id) updated.id = updated._id

      // 尝试回填 accountId（若缺失）
      try {
        if ((!updated.accountId || updated.accountId === '') && updated.account) {
          const accounts = wx.getStorageSync('accounts') || []
          const acc = accounts.find(a => a.name === updated.account)
          if (acc) updated.accountId = acc.id || acc._id
        }
      } catch (_) {}

      // 先写回再联动（或相反顺序均可，这里先联动再保存出错更明显）
      try {
        accountSync.syncTransactionWithAccount(updated, 'update', oldTransaction)
      } catch (e) {
        console.warn('本地更新交易联动账户失败（已继续保存）：', e && e.message)
      }

      transactions[index] = updated
      wx.setStorageSync('transactions', transactions)
      
      this.saveOfflineTransaction('update', { id: updated.id || id, ...data })
      return updated
    }
    
    throw new Error('记录不存在')
  }

  // 删除交易记录
  async deleteTransaction(id) {
    try {
      try {
        const result = await request.callFunction('deleteTransaction', { id })
        
        if (result.success) {
          this.updateLocalCache('delete', { _id: id })
          return true
        } else {
          throw new Error(result.message)
        }
      } catch (cloudError) {
        console.log('云函数调用失败，使用本地存储:', cloudError)
        return this.deleteTransactionLocal(id)
      }
    } catch (error) {
      console.error('删除交易记录失败:', error)
      
      if (error.code === 'NETWORK_ERROR' || error.message.includes('云开发') || error.message.includes('权限')) {
        return this.deleteTransactionLocal(id)
      }
      
      throw error
    }
  }

  // 本地删除交易记录
  deleteTransactionLocal(id) {
    const transactions = wx.getStorageSync('transactions') || []
    const idx = transactions.findIndex(t => t._id === id || t.id === id)
    if (idx === -1) throw new Error('记录不存在')

    const deleted = transactions[idx]
    // 确保 id 存在
    if (!deleted.id) deleted.id = deleted._id

    // 尝试回填 accountId（若缺失）
    try {
      if ((!deleted.accountId || deleted.accountId === '') && deleted.account) {
        const accounts = wx.getStorageSync('accounts') || []
        const acc = accounts.find(a => a.name === deleted.account)
        if (acc) deleted.accountId = acc.id || acc._id
      }
    } catch (_) {}

    // 联动账户余额（删除反向操作）
    try {
      accountSync.syncTransactionWithAccount(deleted, 'delete')
    } catch (e) {
      console.warn('本地删除交易联动账户失败（已继续保存）：', e && e.message)
    }

    const filteredTransactions = transactions.filter((_, i) => i !== idx)
    wx.setStorageSync('transactions', filteredTransactions)
    this.saveOfflineTransaction('delete', { id: deleted.id || id })
    return true
  }

  // 获取交易记录列表
  async getTransactions(params = {}) {
    try {
      try {
        const result = await request.callFunction('getTransactions', params)
        
        if (result.success) {
          // 缓存数据
          const cacheKey = `transactions_${JSON.stringify(params)}`
          storage.set(cacheKey, result.data, 5 * 60 * 1000) // 缓存5分钟
          
          return result.data
        } else {
          throw new Error(result.message)
        }
      } catch (cloudError) {
        console.log('云函数调用失败，使用本地存储:', cloudError)
        return this.getTransactionsLocal(params)
      }
    } catch (error) {
      console.error('获取交易记录失败:', error)
      
      // 尝试从缓存获取
      const cacheKey = `transactions_${JSON.stringify(params)}`
      const cachedData = storage.get(cacheKey)
      if (cachedData) {
        return cachedData
      }
      
      // 使用本地数据
      return this.getTransactionsLocal(params)
    }
  }

  // 本地获取交易记录
  getTransactionsLocal(params = {}) {
    const transactions = wx.getStorageSync('transactions') || []
    
    // 简单的分页和排序
    const { page = 1, pageSize = 20, orderBy = 'createTime', order = 'desc' } = params
    
    let filteredTransactions = [...transactions]
    
    // 排序
    filteredTransactions.sort((a, b) => {
      const aValue = a[orderBy] || a.createTime
      const bValue = b[orderBy] || b.createTime
      
      if (order === 'desc') {
        return new Date(bValue) - new Date(aValue)
      } else {
        return new Date(aValue) - new Date(bValue)
      }
    })
    
    // 分页
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const list = filteredTransactions.slice(startIndex, endIndex)
    
    // 计算统计数据
    const stats = this.calculateStats(transactions)
    
    return {
      list,
      total: transactions.length,
      hasMore: endIndex < transactions.length,
      stats
    }
  }

  // 计算统计数据
  calculateStats(transactions) {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    const monthlyTransactions = transactions.filter(t => {
      const date = new Date(t.createTime || t.date)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
    
    let income = 0
    let expense = 0
    
    monthlyTransactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount
      } else if (t.type === 'expense') {
        expense += t.amount
      }
    })
    
    return {
      income,
      expense,
      balance: income - expense
    }
  }

  // 获取交易记录详情
  async getTransactionDetail(id) {
    try {
      try {
        const result = await request.callFunction('getTransactionDetail', { id })
        
        if (result.success) {
          return result.data
        } else {
          throw new Error(result.message)
        }
      } catch (cloudError) {
        console.log('云函数调用失败，使用本地存储:', cloudError)
        return this.getTransactionDetailLocal(id)
      }
    } catch (error) {
      console.error('获取交易记录详情失败:', error)
      return this.getTransactionDetailLocal(id)
    }
  }

  // 本地获取交易记录详情
  getTransactionDetailLocal(id) {
    const transactions = wx.getStorageSync('transactions') || []
    const transaction = transactions.find(t => t._id === id)
    
    if (!transaction) {
      throw new Error('记录不存在')
    }
    
    return transaction
  }

  // 批量导入交易记录
  async importTransactions(data) {
    try {
      const result = await request.callFunction('importTransactions', { data })
      
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('批量导入失败:', error)
      throw error
    }
  }

  // 同步银行交易
  async syncBankTransactions() {
    try {
      const result = await request.callFunction('syncBankTransactions')
      
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('同步银行交易失败:', error)
      // 模拟同步成功
      return { count: 0, message: '暂无新交易' }
    }
  }

  // 更新本地缓存
  updateLocalCache(action, data) {
    // 这里可以实现本地缓存更新逻辑
    console.log(`本地缓存${action}:`, data)
  }

  // 保存离线交易
  saveOfflineTransaction(action, data) {
    const app = getApp()
    const offlineTransactions = app.globalData.offlineTransactions || []
    
    offlineTransactions.push({
      action,
      data,
      timestamp: Date.now()
    })
    
    app.globalData.offlineTransactions = offlineTransactions
    storage.set('offlineTransactions', offlineTransactions)
  }

  // 同步离线交易
  async syncOfflineTransactions() {
    const app = getApp()
    const offlineTransactions = app.globalData.offlineTransactions || []
    
    if (offlineTransactions.length === 0) {
      return
    }

    try {
      const result = await request.callFunction('syncOfflineTransactions', {
        transactions: offlineTransactions
      })
      
      if (result.success) {
        // 清空离线数据
        app.globalData.offlineTransactions = []
        storage.remove('offlineTransactions')
        
        wx.showToast({
          title: '同步成功',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('同步离线交易失败:', error)
      // 不抛出错误，允许继续使用本地数据
    }
  }
}

// 创建单例
const transactionService = new TransactionService()

module.exports = transactionService