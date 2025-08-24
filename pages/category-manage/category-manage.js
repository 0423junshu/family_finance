// pages/category-manage/category-manage.js
const { createCategory, updateCategory, deleteCategory, getCategories } = require('../../services/category-backend')

Page({
  data: {
    currentTab: 0, // 0: 支出分类, 1: 收入分类
    loading: false,
    
    // 分类数据
    expenseCategories: [],
    incomeCategories: [],
    
    // 新增分类对话框
    showAddDialog: false,
    newCategory: {
      name: '',
      icon: '💰',
      color: '#007AFF'
    },
    
    // 编辑分类对话框
    showEditDialog: false,
    editingCategory: null,
    
    // 可选图标
    availableIcons: [
      '🍽️', '🚗', '🛒', '🎬', '🏥', '📚', '🏠', '📱',
      '💰', '🎁', '📈', '💼', '🧧', '↩️', '⚡', '🎯',
      '🎨', '🏃', '🎵', '📷', '✈️', '🎪', '🌟', '🔧'
    ],
    
    // 可选颜色
    availableColors: [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#FFB6C1', '#87CEEB', '#32CD32', '#FFD700',
      '#00CED1', '#9370DB', '#FF69B4', '#20B2AA', '#FF8C00',
      '#8A2BE2', '#DC143C', '#00BFFF', '#228B22', '#FF1493'
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

  // 加载分类数据 - 使用后端服务
  async loadCategories() {
    try {
      this.setData({ loading: true })
      
      // 调用后端获取分类数据
      const result = await getCategories()
      
      if (result.success) {
        // 默认分类
        const defaultCategories = [
          // 支出分类
          { _id: 'expense_1', name: '餐饮', icon: '🍽️', type: 'expense', color: '#FF6B6B', isDefault: true },
          { _id: 'expense_2', name: '交通', icon: '🚗', type: 'expense', color: '#4ECDC4', isDefault: true },
          { _id: 'expense_3', name: '购物', icon: '🛒', type: 'expense', color: '#45B7D1', isDefault: true },
          { _id: 'expense_4', name: '娱乐', icon: '🎬', type: 'expense', color: '#96CEB4', isDefault: true },
          { _id: 'expense_5', name: '医疗', icon: '🏥', type: 'expense', color: '#FFEAA7', isDefault: true },
          { _id: 'expense_6', name: '教育', icon: '📚', type: 'expense', color: '#DDA0DD', isDefault: true },
          { _id: 'expense_7', name: '住房', icon: '🏠', type: 'expense', color: '#FFB6C1', isDefault: true },
          { _id: 'expense_8', name: '通讯', icon: '📱', type: 'expense', color: '#87CEEB', isDefault: true },
          
          // 收入分类
          { _id: 'income_1', name: '工资', icon: '💰', type: 'income', color: '#32CD32', isDefault: true },
          { _id: 'income_2', name: '奖金', icon: '🎁', type: 'income', color: '#FFD700', isDefault: true },
          { _id: 'income_3', name: '投资收益', icon: '📈', type: 'income', color: '#00CED1', isDefault: true },
          { _id: 'income_4', name: '兼职', icon: '💼', type: 'income', color: '#9370DB', isDefault: true },
          { _id: 'income_5', name: '礼金', icon: '🧧', type: 'income', color: '#FF69B4', isDefault: true },
          { _id: 'income_6', name: '退款', icon: '↩️', type: 'income', color: '#20B2AA', isDefault: true }
        ]
        
        // 合并默认分类和自定义分类
        const allCategories = [...defaultCategories, ...result.data]
        
        // 分离支出和收入分类
        const expenseCategories = allCategories.filter(cat => cat.type === 'expense')
        const incomeCategories = allCategories.filter(cat => cat.type === 'income')
        
        this.setData({
          expenseCategories,
          incomeCategories,
          loading: false
        })
      } else {
        throw new Error(result.error || '获取分类数据失败')
      }
    } catch (error) {
      console.error('加载分类失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'error'
      })
    }
  },

  // 切换标签页
  onTabChange(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ currentTab: index })
  },

  // 显示新增分类对话框
  showAddCategory() {
    const type = this.data.currentTab === 0 ? 'expense' : 'income'
    this.setData({
      showAddDialog: true,
      newCategory: {
        name: '',
        icon: type === 'expense' ? '🛒' : '💰',
        color: type === 'expense' ? '#FF6B6B' : '#32CD32',
        type
      },
      errors: {}
    })
  },

  // 显示编辑分类对话框
  showEditCategory(e) {
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
      showEditDialog: true,
      editingCategory: { ...category },
      newCategory: {
        name: category.name,
        icon: category.icon,
        color: category.color,
        type: category.type
      },
      errors: {}
    })
  },

  // 删除分类
  deleteCategory(e) {
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
      content: `确定要删除分类"${category.name}"吗？删除后相关记录的分类将显示为"其他"。`,
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (res.confirm) {
          await this.performDeleteCategory(category)
        }
      }
    })
  },

  // 执行删除分类 - 使用后端服务
  async performDeleteCategory(category) {
    try {
      wx.showLoading({ title: '删除中...' })
      
      // 调用后端删除分类
      const result = await deleteCategory(category._id)
      
      if (result.success) {
        // 更新使用该分类的交易记录
        await this.updateTransactionsAfterCategoryDelete(category._id)
        
        wx.hideLoading()
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })
        
        // 重新加载分类
        this.loadCategories()
      } else {
        throw new Error(result.error || '删除失败')
      }
    } catch (error) {
      console.error('删除分类失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'error'
      })
    }
  },

  // 更新交易记录中被删除的分类
  async updateTransactionsAfterCategoryDelete(categoryId) {
    try {
      const transactions = wx.getStorageSync('transactions') || []
      let updated = false
      
      transactions.forEach(transaction => {
        if (transaction.categoryId === categoryId) {
          transaction.categoryId = ''
          transaction.category = '其他'
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

  // 分类名称输入
  onCategoryNameInput(e) {
    this.setData({
      'newCategory.name': e.detail.value
    })
    this.clearFieldError('name')
  },

  // 选择图标
  onIconSelect(e) {
    const icon = e.currentTarget.dataset.icon
    this.setData({
      'newCategory.icon': icon
    })
  },

  // 选择颜色
  onColorSelect(e) {
    const color = e.currentTarget.dataset.color
    this.setData({
      'newCategory.color': color
    })
  },

  // 表单验证
  validateForm() {
    const errors = {}
    const { name } = this.data.newCategory
    
    if (!name || !name.trim()) {
      errors.name = '请输入分类名称'
    } else if (name.trim().length > 10) {
      errors.name = '分类名称不能超过10个字符'
    } else {
      // 检查分类名称是否重复
      const currentCategories = this.data.currentTab === 0 ? 
                               this.data.expenseCategories : 
                               this.data.incomeCategories
      
      const isDuplicate = currentCategories.some(cat => {
        // 编辑时排除自己
        if (this.data.showEditDialog && cat._id === this.data.editingCategory._id) {
          return false
        }
        return cat.name === name.trim()
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

  // 保存分类 - 使用后端服务
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
      
      const { name, icon, color, type } = this.data.newCategory
      
      const categoryData = {
        name: name.trim(),
        icon,
        color,
        type
      }
      
      let result
      if (this.data.showAddDialog) {
        // 调用后端创建分类
        result = await createCategory(categoryData)
        if (result.success) {
          wx.showToast({
            title: '分类添加成功',
            icon: 'success'
          })
        } else {
          throw new Error(result.error || '创建失败')
        }
      } else {
        // 调用后端更新分类
        categoryData.id = this.data.editingCategory._id
        result = await updateCategory(categoryData)
        if (result.success) {
          // 更新交易记录中的分类名称
          await this.updateTransactionsAfterCategoryEdit(this.data.editingCategory._id, name.trim())
          
          wx.showToast({
            title: '分类修改成功',
            icon: 'success'
          })
        } else {
          throw new Error(result.error || '更新失败')
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

  // 更新交易记录中的分类名称
  async updateTransactionsAfterCategoryEdit(categoryId, newName) {
    try {
      const transactions = wx.getStorageSync('transactions') || []
      let updated = false
      
      transactions.forEach(transaction => {
        if (transaction.categoryId === categoryId) {
          transaction.category = newName
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

  // 关闭对话框
  closeDialog() {
    this.setData({
      showAddDialog: false,
      showEditDialog: false,
      editingCategory: null,
      newCategory: {
        name: '',
        icon: '💰',
        color: '#007AFF'
      },
      errors: {}
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})