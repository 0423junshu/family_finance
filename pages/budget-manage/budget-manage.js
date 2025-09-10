// pages/budget-manage/budget-manage.js
const { showLoading, hideLoading, showToast } = require('../../utils/uiUtil')
const { formatAmount } = require('../../utils/formatter')
const CycleCalculator = require('../../utils/cycle-calculator')

Page({
  data: {
    loading: false,
    
    // 当前标签页：0-支出预算，1-收入预期
    currentTab: 0,
    
    // 预算数据
    expenseBudgets: [],
    incomeExpectations: [],
    
    // 统计数据
    expenseStats: {
      totalBudget: 0,
      totalSpent: 0,
      remainingBudget: 0,
      progressPercent: 0
    },
    incomeStats: {
      totalExpected: 0,
      totalReceived: 0,
      remainingExpected: 0,
      progressPercent: 0
    },
    
    // 分类数据
    expenseCategories: [],
    incomeCategories: [],
    
    // UI状态
    showAddDialog: false,
    showEditDialog: false,
    editingItem: null,
    
    // 表单数据
    formData: {
      type: 'expense', // expense, income
      categoryId: '',
      categoryName: '',
      amount: '',
      period: 'monthly' // monthly, yearly
    },
    
    // 当前月份
    currentMonth: '',
    
    // 验证错误
    errors: {}
  },

  onLoad() {
    this.initCurrentMonth()
    this.loadCategories()
    this.loadBudgets()
  },

  onShow() {
    this.loadBudgets()
  },

  // 初始化当前月份
  initCurrentMonth() {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}年${now.getMonth() + 1}月`
    this.setData({ currentMonth })
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
        { id: 'education', name: '教育', icon: '📚', color: '#DDA0DD' }
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
      
      // 规范自定义分类ID为 id 字段，统一全链路标识
      const normalizedCustom = (customCategories || []).map(c => ({ ...c, id: c.id || c._id }))
      // 合并分类
      const expenseCategories = [
        ...defaultExpenseCategories,
        ...normalizedCustom.filter(c => c.type === 'expense')
      ]
      
      const incomeCategories = [
        ...defaultIncomeCategories,
        ...normalizedCustom.filter(c => c.type === 'income')
      ]
      
      this.setData({ 
        expenseCategories,
        incomeCategories
      })
    } catch (error) {
      console.error('加载分类失败:', error)
    }
  },

  // 加载预算数据 - 直接使用本地存储
  async loadBudgets() {
    try {
      this.setData({ loading: true })
      
      // 直接从本地存储获取预算数据（兼容历史数据：规范 id 字段）
      const rawBudgets = wx.getStorageSync('budgets') || []
      const rawIncomeExpectations = wx.getStorageSync('incomeExpectations') || []
      const budgets = rawBudgets.map(b => ({ ...b, id: b.id || b._id }))
      const incomeExpectations = rawIncomeExpectations.map(e => ({ ...e, id: e.id || e._id }))
      const transactions = wx.getStorageSync('transactions') || []
      
      console.log('加载预算数据:', { budgets: budgets.length, incomeExpectations: incomeExpectations.length })
      
      // 使用统一的周期计算工具
      CycleCalculator.fixCycleSetting() // 确保周期设置有效
      const currentCycle = CycleCalculator.getCurrentCycle()
      
      // 筛选当前周期的交易
      const currentCycleTransactions = transactions.filter(t => {
        return CycleCalculator.isDateInCycle(t.date, currentCycle)
      })
      
      // 处理支出预算
      const expenseBudgetsWithProgress = budgets.map(budget => {
        const spent = currentCycleTransactions
          .filter(t => t.type === 'expense' && t.category === budget.categoryName)
          .reduce((sum, t) => sum + t.amount, 0)
        
        const progress = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
        const remaining = budget.amount - spent
        
        return {
          ...budget,
          spent,
          progress: Math.min(progress, 100),
          progressPercent: (Math.min(progress, 100)).toFixed(1),
          remaining,
          isOverBudget: spent > budget.amount,
          formattedAmount: formatAmount(budget.amount),
          formattedSpent: formatAmount(spent),
          formattedRemaining: formatAmount(Math.abs(remaining))
        }
      })
      
      // 处理收入预期
      const incomeExpectationsWithProgress = incomeExpectations.map(expectation => {
        const received = currentCycleTransactions
          .filter(t => t.type === 'income' && t.category === expectation.categoryName)
          .reduce((sum, t) => sum + t.amount, 0)
        
        const progress = expectation.amount > 0 ? (received / expectation.amount) * 100 : 0
        const remaining = expectation.amount - received
        
        return {
          ...expectation,
          received,
          progress: Math.min(progress, 100),
          progressPercent: (Math.min(progress, 100)).toFixed(1),
          remaining,
          isUnderExpected: received < expectation.amount,
          formattedAmount: formatAmount(expectation.amount),
          formattedReceived: formatAmount(received),
          formattedRemaining: formatAmount(Math.abs(remaining))
        }
      })
      
      // 计算支出统计
      const totalExpenseBudget = budgets.reduce((sum, b) => sum + b.amount, 0)
      const totalExpenseSpent = expenseBudgetsWithProgress.reduce((sum, b) => sum + b.spent, 0)
      const remainingExpenseBudget = totalExpenseBudget - totalExpenseSpent
      const expenseProgress = totalExpenseBudget > 0 ? (totalExpenseSpent / totalExpenseBudget) * 100 : 0
      
      // 计算收入统计
      const totalIncomeExpected = incomeExpectations.reduce((sum, e) => sum + e.amount, 0)
      const totalIncomeReceived = incomeExpectationsWithProgress.reduce((sum, e) => sum + e.received, 0)
      const remainingIncomeExpected = totalIncomeExpected - totalIncomeReceived
      const incomeProgress = totalIncomeExpected > 0 ? (totalIncomeReceived / totalIncomeExpected) * 100 : 0
      
      this.setData({
        expenseBudgets: expenseBudgetsWithProgress,
        incomeExpectations: incomeExpectationsWithProgress,
        expenseStats: {
          totalBudget: formatAmount(totalExpenseBudget),
          totalSpent: formatAmount(totalExpenseSpent),
          remainingBudget: formatAmount(remainingExpenseBudget),
          progressPercent: expenseProgress.toFixed(1),
          progressWidth: Math.min(expenseProgress, 100)
        },
        incomeStats: {
          totalExpected: formatAmount(totalIncomeExpected),
          totalReceived: formatAmount(totalIncomeReceived),
          remainingExpected: formatAmount(remainingIncomeExpected),
          progressPercent: incomeProgress.toFixed(1),
          progressWidth: Math.min(incomeProgress, 100)
        },
        loading: false
      })
    } catch (error) {
      console.error('加载预算失败:', error)
      this.setData({ loading: false })
      showToast('加载失败', 'error')
    }
  },

  // 切换标签页
  onTabChange(e) {
    const ds = (e && (e.currentTarget && e.currentTarget.dataset)) || (e && e.target && e.target.dataset) || {}
    const tab = parseInt(ds.tab)
    if (isNaN(tab)) return
    this.setData({ currentTab: tab })
  },

  // 显示添加对话框
  showAddDialog() {
    const type = this.data.currentTab === 0 ? 'expense' : 'income'
    this.setData({
      showAddDialog: true,
      formData: {
        type,
        categoryId: '',
        categoryName: '',
        amount: '',
        period: 'monthly'
      },
      errors: {}
    })
  },

  // 显示编辑对话框
  showEditDialog(e) {
    // 阻止事件冒泡（兼容基础库差异）
    if (e && e.stopPropagation) e.stopPropagation()
    
    const ds = (e && (e.currentTarget && e.currentTarget.dataset)) || (e && e.target && e.target.dataset) || {}
    const passedItem = ds.item || ds.budget
    const id = ds.id || (passedItem && (passedItem.id || passedItem._id))
    const list = this.data.currentTab === 0 ? this.data.expenseBudgets : this.data.incomeExpectations
    let item = passedItem || list.find(it => String(it.id || it._id) === String(id))
    if (!item) {
      showToast('未找到要编辑的项目', 'error')
      return
    }
    const type = this.data.currentTab === 0 ? 'expense' : 'income'
    
    console.log('编辑项目:', item)
    
    // 金额统一以分存储，弹窗以元展示；兼容历史字符串
    let amountInYuan = '0.00'
    const amtNum = Number(item.amount)
    if (!isNaN(amtNum)) {
      amountInYuan = (amtNum / 100).toFixed(2)
    }
    
    this.setData({
      showEditDialog: true,
      editingItem: { ...item, id: item.id || item._id },
      formData: {
        type,
        categoryId: item.categoryId || item.id,
        categoryName: item.categoryName || item.name,
        amount: amountInYuan,
        period: item.period || 'monthly'
      },
      errors: {}
    })
  },

  // 关闭对话框
  closeDialog() {
    this.setData({
      showAddDialog: false,
      showEditDialog: false,
      editingItem: null,
      formData: {
        type: 'expense',
        categoryId: '',
        categoryName: '',
        amount: '',
        period: 'monthly'
      },
      errors: {}
    })
  },

  // 选择分类
  onCategoryChange(e) {
    const index = parseInt(e.detail.value)
    const categories = this.data.formData.type === 'expense' ? 
                      this.data.expenseCategories : 
                      this.data.incomeCategories
    const category = categories[index]
    
    this.setData({
      'formData.categoryId': category.id || category._id,
      'formData.categoryName': category.name
    })
    this.clearFieldError('category')
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
      'formData.amount': value
    })
    this.clearFieldError('amount')
  },

  // 周期选择
  onPeriodChange(e) {
    const periods = ['monthly', 'yearly']
    this.setData({
      'formData.period': periods[e.detail.value]
    })
  },

  // 表单验证
  validateForm() {
    const errors = {}
    
    if (!this.data.formData.categoryId) {
      errors.category = '请选择分类'
    }
    
    if (!this.data.formData.amount) {
      errors.amount = this.data.formData.type === 'expense' ? '请输入预算金额' : '请输入预期金额'
    } else {
      const amount = parseFloat(this.data.formData.amount)
      if (isNaN(amount) || amount <= 0) {
        errors.amount = '请输入有效的金额'
      } else if (amount > 999999.99) {
        errors.amount = '金额不能超过999999.99'
      }
    }
    
    // 检查是否已存在该分类的预算/预期
    const existingItems = this.data.formData.type === 'expense' ? 
                         this.data.expenseBudgets : 
                         this.data.incomeExpectations
    
    const currentId = this.data.editingItem ? (this.data.editingItem.id || this.data.editingItem._id) : null
    const existingItem = existingItems.find(item => 
      item.categoryId === this.data.formData.categoryId &&
      (!currentId || String(item.id || item._id) !== String(currentId))
    )
    
    if (existingItem) {
      errors.category = this.data.formData.type === 'expense' ? '该分类已设置预算' : '该分类已设置预期'
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

  // 阻止冒泡空函数（用于对话框容器 catchtap）
  noop() {},

  // 保存预算/预期 - 直接使用本地存储
  async onSave() {
    if (!this.validateForm()) {
      showToast(Object.values(this.data.errors)[0], 'error')
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })
      
      const amount = Math.round(parseFloat(this.data.formData.amount) * 100) // 转换为分
      const isExpense = this.data.formData.type === 'expense'
      
      const budgetData = {
        id: this.data.editingItem?.id || Date.now().toString(),
        categoryId: this.data.formData.categoryId,
        categoryName: this.data.formData.categoryName,
        amount,
        period: this.data.formData.period,
        type: this.data.formData.type,
        createTime: this.data.editingItem?.createTime || new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
      
      if (this.data.showAddDialog) {
        // 添加新预算
        if (isExpense) {
          const budgets = wx.getStorageSync('budgets') || []
          budgets.push(budgetData)
          wx.setStorageSync('budgets', budgets)
        } else {
          const incomeExpectations = wx.getStorageSync('incomeExpectations') || []
          incomeExpectations.push(budgetData)
          wx.setStorageSync('incomeExpectations', incomeExpectations)
        }
        showToast(isExpense ? '预算添加成功' : '收入预期添加成功', 'success')
      } else {
        // 更新现有预算
        if (isExpense) {
          const budgets = wx.getStorageSync('budgets') || []
          const index = budgets.findIndex(b => String(b.id || b._id) === String(budgetData.id))
          if (index !== -1) {
            budgets[index] = budgetData
            wx.setStorageSync('budgets', budgets)
          }
        } else {
          const incomeExpectations = wx.getStorageSync('incomeExpectations') || []
          const index = incomeExpectations.findIndex(e => String(e.id || e._id) === String(budgetData.id))
          if (index !== -1) {
            incomeExpectations[index] = budgetData
            wx.setStorageSync('incomeExpectations', incomeExpectations)
          }
        }
        showToast(isExpense ? '预算更新成功' : '收入预期更新成功', 'success')
      }
      
      wx.hideLoading()
      this.closeDialog()
      this.loadBudgets()
    } catch (error) {
      console.error('保存失败:', error)
      wx.hideLoading()
      showToast(error.message || '保存失败', 'error')
    }
  },

  // 删除预算/预期
  onDelete(e) {
    // 阻止事件冒泡（兼容基础库差异）
    if (e && e.stopPropagation) e.stopPropagation()
    
    const ds = (e && (e.currentTarget && e.currentTarget.dataset)) || (e && e.target && e.target.dataset) || {}
    const passedItem = ds.item || ds.budget
    const id = ds.id || (passedItem && (passedItem.id || passedItem._id))
    const list = this.data.currentTab === 0 ? this.data.expenseBudgets : this.data.incomeExpectations
    let item = passedItem || list.find(it => String(it.id || it._id) === String(id))
    if (!item) {
      showToast('未找到要删除的项目', 'error')
      return
    }
    const isExpense = this.data.currentTab === 0
    const itemType = isExpense ? '预算' : '收入预期'
    
    console.log('删除项目:', item)
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${item.categoryName || item.name}"的${itemType}吗？`,
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: (res) => {
        if (res.confirm) {
          this.deleteItem(item.id || item._id, isExpense)
        }
      }
    })
  },

  // 执行删除 - 直接使用本地存储
  async deleteItem(itemId, isExpense) {
    try {
      wx.showLoading({ title: '删除中...' })
      
      if (isExpense) {
        const budgets = wx.getStorageSync('budgets') || []
        const filteredBudgets = budgets.filter(b => String(b.id || b._id) !== String(itemId))
        wx.setStorageSync('budgets', filteredBudgets)
      } else {
        const incomeExpectations = wx.getStorageSync('incomeExpectations') || []
        const filteredExpectations = incomeExpectations.filter(e => String(e.id || e._id) !== String(itemId))
        wx.setStorageSync('incomeExpectations', filteredExpectations)
      }
      
      showToast(isExpense ? '预算删除成功' : '收入预期删除成功', 'success')
      this.loadBudgets()
      
      wx.hideLoading()
    } catch (error) {
      console.error('删除失败:', error)
      wx.hideLoading()
      showToast(error.message || '删除失败', 'error')
    }
  },

  // 查看详情
  viewDetail(e) {
    const item = e.currentTarget.dataset.item || e.currentTarget.dataset.budget
    const isExpense = this.data.currentTab === 0
    
    // 使用统一的周期计算工具
    const currentCycle = CycleCalculator.getCurrentCycle()
    const cycleText = CycleCalculator.formatCycle(currentCycle)
    
    let content = `当前周期：${cycleText}\n`
    
    if (isExpense) {
      content += `预算金额：¥${item.formattedAmount}\n已花费：¥${item.formattedSpent}\n${item.remaining >= 0 ? '剩余' : '超支'}：¥${item.formattedRemaining}\n使用进度：${item.progressPercent}%`
    } else {
      content += `预期金额：¥${item.formattedAmount}\n已收入：¥${item.formattedReceived}\n${item.remaining >= 0 ? '未达成' : '超额完成'}：¥${item.formattedRemaining}\n完成进度：${item.progressPercent}%`
    }
    
    wx.showModal({
      title: item.categoryName + (isExpense ? '预算详情' : '收入预期详情'),
      content,
      showCancel: false,
      confirmText: '知道了'
    })
  }
})