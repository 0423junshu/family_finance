// pages/transaction-detail/transaction-detail-simple.js
// 简化版交易详情页面

Page({
  data: {
    transaction: null,
    loading: true,
    isEditing: false,
    accounts: [],
    categories: {
      income: [],
      expense: []
    },
    editForm: {
      amount: '',
      category: '',
      accountId: '',
      date: '',
      note: ''
    }
  },

  onLoad(options) {
    const { id } = options
    
    if (id) {
      this.loadTransaction(id)
    } else {
      wx.showToast({
        title: '交易ID不能为空',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },
  
  // 加载交易详情
  async loadTransaction(id) {
    this.setData({ loading: true })
    
    try {
      // 从本地存储获取交易记录
      const transactions = wx.getStorageSync('transactions') || []
      const transaction = transactions.find(t => t.id === id)
      
      if (!transaction) {
        throw new Error('交易记录不存在')
      }
      
      // 加载账户和分类数据
      await this.loadAccountsAndCategories()
      
      // 格式化金额显示
      const formattedTransaction = {
        ...transaction,
        amountDisplay: (transaction.amount / 100).toFixed(2)
      }
      
      // 设置表单初始值
      this.setData({
        transaction: formattedTransaction,
        editForm: {
          amount: formattedTransaction.amountDisplay,
          category: formattedTransaction.category,
          accountId: formattedTransaction.accountId,
          date: formattedTransaction.date,
          note: formattedTransaction.note || ''
        },
        loading: false
      })
    } catch (error) {
      console.error('加载交易详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },
  
  // 加载账户和分类数据
  async loadAccountsAndCategories() {
    // 加载账户
    const accounts = wx.getStorageSync('accounts') || []
    
    // 加载分类
    const categories = wx.getStorageSync('categories') || {
      income: [
        { id: 'salary', name: '工资' },
        { id: 'bonus', name: '奖金' },
        { id: 'investment', name: '投资收益' }
      ],
      expense: [
        { id: 'food', name: '餐饮' },
        { id: 'shopping', name: '购物' },
        { id: 'transport', name: '交通' }
      ]
    }
    
    this.setData({ accounts, categories })
  },
  
  // 切换编辑模式
  toggleEditMode() {
    this.setData({
      isEditing: !this.data.isEditing
    })
  },
  
  // 表单输入处理
  onAmountInput(e) {
    let value = e.detail.value.replace(/[^\d.]/g, '')
    const parts = value.split('.')
    if (parts.length > 2) {
      value = parts[0] + '.' + parts[1]
    }
    if (parts[1] && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2)
    }
    this.setData({ 'editForm.amount': value })
  },
  
  onCategoryChange(e) {
    this.setData({ 'editForm.category': e.detail.value })
  },
  
  onAccountChange(e) {
    this.setData({ 'editForm.accountId': e.detail.value })
  },
  
  onDateChange(e) {
    this.setData({ 'editForm.date': e.detail.value })
  },
  
  onNoteInput(e) {
    this.setData({ 'editForm.note': e.detail.value })
  },
  
  // 保存编辑
  async saveEdit() {
    const { transaction, editForm } = this.data
    
    // 验证表单
    if (!editForm.amount || isNaN(parseFloat(editForm.amount))) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'error'
      })
      return
    }
    
    if (!editForm.category) {
      wx.showToast({
        title: '请选择分类',
        icon: 'error'
      })
      return
    }
    
    if (!editForm.accountId) {
      wx.showToast({
        title: '请选择账户',
        icon: 'error'
      })
      return
    }
    
    if (!editForm.date) {
      wx.showToast({
        title: '请选择日期',
        icon: 'error'
      })
      return
    }
    
    try {
      // 获取所有交易
      const transactions = wx.getStorageSync('transactions') || []
      
      // 找到当前交易的索引
      const index = transactions.findIndex(t => t.id === transaction.id)
      
      if (index === -1) {
        throw new Error('交易记录不存在')
      }
      
      // 保存旧交易记录，用于账户余额调整
      const oldTransaction = { ...transactions[index] }
      
      // 更新交易记录
      transactions[index] = {
        ...oldTransaction,
        amount: Math.round(parseFloat(editForm.amount) * 100),
        category: editForm.category,
        accountId: editForm.accountId,
        date: editForm.date,
        note: editForm.note,
        updatedAt: new Date().toISOString()
      }
      
      // 保存更新后的交易记录
      wx.setStorageSync('transactions', transactions)
      
      // 同步账户余额
      await this.syncAccountBalance(oldTransaction, transactions[index])
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
      
      // 重新加载交易详情
      this.loadTransaction(transaction.id)
      
      // 退出编辑模式
      this.setData({ isEditing: false })
    } catch (error) {
      console.error('保存交易失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      })
    }
  },
  
  // 同步账户余额
  async syncAccountBalance(oldTransaction, newTransaction) {
    // 获取账户列表
    const accounts = wx.getStorageSync('accounts') || []
    
    // 如果账户ID或交易类型发生变化，需要处理多个账户
    if (oldTransaction.accountId !== newTransaction.accountId || 
        oldTransaction.type !== newTransaction.type) {
      
      // 处理旧账户：还原之前的影响
      const oldAccountIndex = accounts.findIndex(a => a.id === oldTransaction.accountId)
      if (oldAccountIndex !== -1) {
        if (oldTransaction.type === 'income') {
          accounts[oldAccountIndex].balance -= oldTransaction.amount
        } else if (oldTransaction.type === 'expense') {
          accounts[oldAccountIndex].balance += oldTransaction.amount
        }
      }
      
      // 处理新账户：应用新的影响
      const newAccountIndex = accounts.findIndex(a => a.id === newTransaction.accountId)
      if (newAccountIndex !== -1) {
        if (newTransaction.type === 'income') {
          accounts[newAccountIndex].balance += newTransaction.amount
        } else if (newTransaction.type === 'expense') {
          accounts[newAccountIndex].balance -= newTransaction.amount
        }
      }
    } else {
      // 同一账户，只需要处理金额差异
      const accountIndex = accounts.findIndex(a => a.id === newTransaction.accountId)
      if (accountIndex !== -1) {
        const amountDiff = newTransaction.amount - oldTransaction.amount
        
        if (newTransaction.type === 'income') {
          accounts[accountIndex].balance += amountDiff
        } else if (newTransaction.type === 'expense') {
          accounts[accountIndex].balance -= amountDiff
        }
      }
    }
    
    // 保存更新后的账户数据
    wx.setStorageSync('accounts', accounts)
    wx.setStorageSync('accountChanged', Date.now())
  },
  
  // 删除交易
  deleteTransaction() {
    const { transaction } = this.data
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条交易记录吗？',
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 获取所有交易
            const transactions = wx.getStorageSync('transactions') || []
            
            // 找到当前交易的索引
            const index = transactions.findIndex(t => t.id === transaction.id)
            
            if (index === -1) {
              throw new Error('交易记录不存在')
            }
            
            // 保存交易记录，用于账户余额调整
            const deletedTransaction = { ...transactions[index] }
            
            // 删除交易记录
            transactions.splice(index, 1)
            
            // 保存更新后的交易记录
            wx.setStorageSync('transactions', transactions)
            
            // 同步账户余额
            await this.revertAccountBalance(deletedTransaction)
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            
            // 返回上一页
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } catch (error) {
            console.error('删除交易失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },
  
  // 还原账户余额
  async revertAccountBalance(transaction) {
    // 获取账户列表
    const accounts = wx.getStorageSync('accounts') || []
    
    // 查找相关账户
    const accountIndex = accounts.findIndex(a => a.id === transaction.accountId)
    
    if (accountIndex !== -1) {
      // 根据交易类型反向调整账户余额
      if (transaction.type === 'income') {
        accounts[accountIndex].balance -= transaction.amount
      } else if (transaction.type === 'expense') {
        accounts[accountIndex].balance += transaction.amount
      }
      
      // 保存更新后的账户数据
      wx.setStorageSync('accounts', accounts)
      wx.setStorageSync('accountChanged', Date.now())
    }
  }
})