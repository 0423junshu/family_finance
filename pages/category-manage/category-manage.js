// pages/category-manage/category-manage.js
Page({
  data: {
    loading: false,
    categories: [],
    
    // 分类类型
    activeType: 'expense', // expense, income, transfer
    
    // 新增/编辑分类对话框
    showDialog: false,
    dialogMode: 'create', // create, edit
    editingCategory: null,
    
    // 表单数据
    formData: {
      name: '',
      icon: '💰',
      color: '#007AFF',
      type: 'expense'
    },
    
    // 可选图标
    availableIcons: [
      '💰', '🍽️', '🚗', '🛒', '🎮', '🏥', '📚', '🏠', '📱', '🎁', '📈', '💼', '🧧', '↩️', '🔄',
      '✈️', '🏨', '🎭', '🎓', '👕', '💄', '🎸', '🎬', '🏋️', '🚌', '🚇', '🚕', '⛽', '🚲', '🛵',
      '🧾', '💊', '🧸', '🖥️', '📷', '🎮', '🎧', '📺', '🏆', '🎯', '🎨', '🎪', '🎟️', '🎫', '🎭',
      '🎤', '🎹', '🎺', '🎻', '🎲', '🎯', '🎳', '🎾', '🏀', '⚽', '🏈', '⚾', '🏐', '🏉', '🎱'
    ],
    
    // 可选颜色
    availableColors: [
      '#007AFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#FFB6C1', '#87CEEB', '#32CD32', 
      '#FFD700', '#00CED1', '#9370DB', '#FF69B4', '#20B2AA'
    ],
    
    // 错误信息
    errors: {}
  },

  onLoad() {
    this.loadCategories()
  },

  onShow() {
    this.loadCategories()
  },

  // 加载分类数据
  async loadCategories() {
    try {
      this.setData({ loading: true })
      
      // 获取自定义分类
      const customCategories = wx.getStorageSync('customCategories') || []
      
      // 默认分类
      const defaultCategories = [
        // 支出分类
        { _id: 'default_expense_1', name: '餐饮', icon: '🍽️', type: 'expense', color: '#FF6B6B', isDefault: true },
        { _id: 'default_expense_2', name: '交通', icon: '🚗', type: 'expense', color: '#4ECDC4', isDefault: true },
        { _id: 'default_expense_3', name: '购物', icon: '🛒', type: 'expense', color: '#45B7D1', isDefault: true },
        { _id: 'default_expense_4', name: '娱乐', icon: '🎮', type: 'expense', color: '#96CEB4', isDefault: true },
        { _id: 'default_expense_5', name: '医疗', icon: '🏥', type: 'expense', color: '#FFEAA7', isDefault: true },
        { _id: 'default_expense_6', name: '教育', icon: '📚', type: 'expense', color: '#DDA0DD', isDefault: true },
        { _id: 'default_expense_7', name: '住房', icon: '🏠', type: 'expense', color: '#FFB6C1', isDefault: true },
        { _id: 'default_expense_8', name: '通讯', icon: '📱', type: 'expense', color: '#87CEEB', isDefault: true },
        
        // 收入分类
        { _id: 'default_income_1', name: '工资', icon: '💰', type: 'income', color: '#32CD32', isDefault: true },
        { _id: 'default_income_2', name: '奖金', icon: '🎁', type: 'income', color: '#FFD700', isDefault: true },
        { _id: 'default_income_3', name: '投资收益', icon: '📈', type: 'income', color: '#00CED1', isDefault: true },
        { _id: 'default_income_4', name: '兼职', icon: '💼', type: 'income', color: '#9370DB', isDefault: true },
        { _id: 'default_income_5', name: '礼金', icon: '🧧', type: 'income', color: '#FF69B4', isDefault: true },
        { _id: 'default_income_6', name: '退款', icon: '↩️', type: 'income', color: '#20B2AA', isDefault: true },
        
        // 转账分类
        { _id: 'default_transfer_1', name: '转账', icon: '🔄', type: 'transfer', color: '#808080', isDefault: true }
      ]
      
      // 合并分类
      const allCategories = [...defaultCategories, ...customCategories]
      
      this.setData({ 
        categories: allCategories,
        loading: false
      })
    } catch (error) {
      console.error('加载分类失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 切换分类类型
  onTypeChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ activeType: type })
  },

  // 显示新增分类对话框
  showAddDialog() {
    this.setData({
      showDialog: true,
      dialogMode: 'create',
      formData: {
        name: '',
        icon: '💰',
        color: '#007AFF',
        type: this.data.activeType
      },
      errors: {}
    })
  },

  // 显示编辑分类对话框
  showEditDialog(e) {
    const category = e.currentTarget.dataset.category
    
    // 默认分类不能编辑
    if (category.isDefault) {
      wx.showToast({
        title: '默认分类不能编辑',
        icon: 'none'
      })
      return
    }
    
    this.setData({
      showDialog: true,
      dialogMode: 'edit',
      editingCategory: category,
      formData: {
        name: category.name,
        icon: category.icon,
        color: category.color,
        type: category.type
      },
      errors: {}
    })
  },

  // 关闭对话框
  closeDialog() {
    this.setData({
      showDialog: false,
      editingCategory: null,
      errors: {}
    })
  },

  // 名称输入
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
    this.clearFieldError('name')
  },

  // 选择图标
  onIconSelect(e) {
    const icon = e.currentTarget.dataset.icon
    this.setData({
      'formData.icon': icon
    })
  },

  // 选择颜色
  onColorSelect(e) {
    const color = e.currentTarget.dataset.color
    this.setData({
      'formData.color': color
    })
  },

  // 表单验证
  validateForm() {
    const errors = {}
    const { name } = this.data.formData
    
    if (!name || !name.trim()) {
      errors.name = '请输入分类名称'
    } else if (name.trim().length > 10) {
      errors.name = '分类名称不能超过10个字符'
    } else {
      // 检查分类名称是否重复
      const isDuplicate = this.data.categories.some(category => {
        // 编辑时排除自己
        if (this.data.dialogMode === 'edit' && this.data.editingCategory._id === category._id) {
          return false
        }
        return category.name === name.trim() && category.type === this.data.formData.type
      })
      
      if (isDuplicate) {
        errors.name = '分类名称已存在'
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

  // 保存分类
  async saveCategory() {
    if (!this.validateForm()) {
      wx.showToast({
        title: Object.values(this.data.errors)[0],
        icon: 'error'
      })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })

      const { name, icon, color, type } = this.data.formData
      const trimmedName = name.trim()
      const now = new Date().toISOString()
      let customCategories = wx.getStorageSync('customCategories') || []

      if (this.data.dialogMode === 'create') {
        // 新增
        const newCategory = {
          _id: `custom_${type}_${Date.now().toString()}`,
          name: trimmedName,
          icon,
          color,
          type,
          isCustom: true,
          createTime: now,
          updateTime: now
        }
        customCategories.push(newCategory)
        wx.setStorageSync('customCategories', customCategories)
        wx.showToast({ title: '分类添加成功', icon: 'success' })
      } else {
        // 更新（仅限自定义分类）
        const targetId = this.data.editingCategory._id
        const idx = customCategories.findIndex(c => c._id === targetId)
        if (idx !== -1) {
          customCategories[idx] = {
            ...customCategories[idx],
            name: trimmedName,
            icon,
            color,
            updateTime: now
          }
          wx.setStorageSync('customCategories', customCategories)
          wx.showToast({ title: '分类修改成功', icon: 'success' })
        } else {
          throw new Error('仅可修改自定义分类')
        }
      }

      wx.hideLoading()
      // 关闭对话框并重新加载数据
      this.closeDialog()
      this.loadCategories()
    } catch (error) {
      console.error('保存分类失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'error'
      })
    }
  },

  // 删除分类
  onDeleteCategory(e) {
    const category = e.currentTarget.dataset.category
    
    // 默认分类不能删除
    if (category.isDefault) {
      wx.showToast({
        title: '默认分类不能删除',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除分类"${category.name}"吗？删除后相关记录的分类将被重置。`,
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (res.confirm) {
          await this.performDeleteCategory(category)
        }
      }
    })
  },

  // 执行删除分类
  async performDeleteCategory(category) {
    try {
      wx.showLoading({ title: '删除中...' })

      // 仅允许删除自定义分类
      const customCategories = wx.getStorageSync('customCategories') || []
      const filtered = customCategories.filter(c => c._id !== category._id)
      wx.setStorageSync('customCategories', filtered)

      // 更新使用该分类的交易记录
      await this.updateTransactionsAfterCategoryDelete(category._id)

      wx.hideLoading()
      wx.showToast({ title: '删除成功', icon: 'success' })

      // 重新加载分类
      this.loadCategories()
    } catch (error) {
      console.error('删除分类失败:', error)
      wx.hideLoading()
      wx.showToast({ title: error.message || '删除失败', icon: 'error' })
    }
  },

  // 更新交易记录中被删除的分类
  async updateTransactionsAfterCategoryDelete(categoryId) {
    try {
      const transactions = wx.getStorageSync('transactions') || []
      let updated = false
      
      transactions.forEach(transaction => {
        if (transaction.categoryId === categoryId) {
          // 重置为默认分类
          const defaultCategoryId = transaction.type === 'income' ? 'income_1' : 
                                   transaction.type === 'expense' ? 'expense_1' : 'transfer_1'
          const defaultCategory = this.data.categories.find(c => c._id === defaultCategoryId)
          
          transaction.categoryId = defaultCategoryId
          transaction.category = defaultCategory ? defaultCategory.name : '其他'
          updated = true
        }
      })
      
      if (updated) {
        wx.setStorageSync('transactions', transactions)
      }
    } catch (error) {
      console.error('更新交易记录失败:', error)
    }
  },

  // 阻止冒泡空函数（用于对话框容器 catchtap）
  noop() {},

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})