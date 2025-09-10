// pages/tag-manage/tag-manage.js
/**
 * 标签管理页面
 * - 支持添加、编辑、删除自定义标签
 * - 标签可关联到分类（支出/收入）
 * - 自定义标签存储于 localStorage key: 'customTags'
 */

Page({
  data: {
    loading: false,
    tags: [],

    // 新增/编辑对话框
    showAddDialog: false,
    showEditDialog: false,
    editingTag: null,

    newTag: {
      name: '',
      color: '#007AFF',
      categoryIds: []
    },

    // 分类数据
    categories: [],

    // 选中映射（修复 includes 在模板中失效/低版本兼容问题）
    categorySelectedMap: {},

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
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  // 加载数据
  async loadData() {
    try {
      this.setData({ loading: true })
      await this.loadTags()
      await this.loadCategories()
      this.setData({ loading: false })
    } catch (error) {
      console.error('加载数据失败:', error)
      this.setData({ loading: false })
      wx.showToast({ title: error.message || '加载失败', icon: 'error' })
    }
  },

  // 加载标签
  async loadTags() {
    try {
      const customTags = wx.getStorageSync('customTags') || []
      const defaultTags = [
        { _id: 'tag_1', name: '必需品', color: '#007AFF', isDefault: true },
        { _id: 'tag_2', name: '娱乐', color: '#FF6B6B', isDefault: true },
        { _id: 'tag_3', name: '投资', color: '#32CD32', isDefault: true },
        { _id: 'tag_4', name: '礼品', color: '#FFD700', isDefault: true }
      ]
      const allTags = [...defaultTags, ...customTags]
      this.setData({ tags: allTags })
    } catch (error) {
      console.error('加载标签失败:', error)
    }
  },

  // 加载分类
  async loadCategories() {
    try {
      const customCategories = wx.getStorageSync('customCategories') || []
      const defaultCategories = [
        // 支出
        { _id: 'expense_1', name: '餐饮', type: 'expense' },
        { _id: 'expense_2', name: '交通', type: 'expense' },
        { _id: 'expense_3', name: '购物', type: 'expense' },
        { _id: 'expense_4', name: '娱乐', type: 'expense' },
        { _id: 'expense_5', name: '医疗', type: 'expense' },
        { _id: 'expense_6', name: '教育', type: 'expense' },
        { _id: 'expense_7', name: '住房', type: 'expense' },
        { _id: 'expense_8', name: '通讯', type: 'expense' },
        // 收入
        { _id: 'income_1', name: '工资', type: 'income' },
        { _id: 'income_2', name: '奖金', type: 'income' },
        { _id: 'income_3', name: '投资收益', type: 'income' },
        { _id: 'income_4', name: '兼职', type: 'income' },
        { _id: 'income_5', name: '礼金', type: 'income' },
        { _id: 'income_6', name: '退款', type: 'income' }
      ]
      const allCategories = [...defaultCategories, ...customCategories]
      this.setData({ categories: allCategories })
    } catch (error) {
      console.error('加载分类失败:', error)
    }
  },

  // 构建选中映射
  buildSelectedMap(ids = []) {
    const map = {}
    ids.forEach(id => { map[id] = true })
    return map
  },

  // 新增
  showAddTag() {
    this.setData({
      showAddDialog: true,
      showEditDialog: false,
      editingTag: null,
      newTag: {
        name: '',
        color: '#007AFF',
        categoryIds: []
      },
      categorySelectedMap: {},
      errors: {}
    })
  },

  // 编辑
  showEditTag(e) {
    const tag = e.currentTarget.dataset.tag
    if (tag.isDefault) {
      wx.showToast({ title: '默认标签不能编辑', icon: 'none' })
      return
    }
    this.setData({
      showEditDialog: true,
      showAddDialog: false,
      editingTag: { ...tag },
      newTag: {
        name: tag.name,
        color: tag.color,
        categoryIds: tag.categoryIds || []
      },
      categorySelectedMap: this.buildSelectedMap(tag.categoryIds || []),
      errors: {}
    })
  },

  // 删除
  deleteTag(e) {
    const tag = e.currentTarget.dataset.tag
    if (tag.isDefault) {
      wx.showToast({ title: '默认标签不能删除', icon: 'none' })
      return
    }
    wx.showModal({
      title: '确认删除',
      content: `确定要删除标签"${tag.name}"吗？删除后相关记录的标签将被移除。`,
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (res.confirm) {
          await this.performDeleteTag(tag)
        }
      }
    })
  },

  async performDeleteTag(tag) {
    try {
      wx.showLoading({ title: '删除中...' })
      const customTags = wx.getStorageSync('customTags') || []
      const filtered = customTags.filter(t => t._id !== tag._id)
      wx.setStorageSync('customTags', filtered)
      await this.updateTransactionsAfterTagDelete(tag._id)
      wx.hideLoading()
      wx.showToast({ title: '删除成功', icon: 'success' })
      this.loadTags()
    } catch (error) {
      console.error('删除标签失败:', error)
      wx.hideLoading()
      wx.showToast({ title: error.message || '删除失败', icon: 'error' })
    }
  },

  async updateTransactionsAfterTagDelete(tagId) {
    try {
      const transactions = wx.getStorageSync('transactions') || []
      let updated = false
      transactions.forEach(tr => {
        if (tr.tags && tr.tags.includes(tagId)) {
          tr.tags = tr.tags.filter(id => id !== tagId)
          updated = true
        }
      })
      if (updated) wx.setStorageSync('transactions', transactions)
    } catch (error) {
      console.error('更新交易记录失败:', error)
    }
  },

  // 输入
  onTagNameInput(e) {
    this.setData({ 'newTag.name': e.detail.value })
    this.clearFieldError('name')
  },

  onColorSelect(e) {
    const color = e.currentTarget.dataset.color
    this.setData({ 'newTag.color': color })
  },

  // 切换分类选中（修复：用映射维护）
  toggleCategorySelection(e) {
    const id = e.currentTarget.dataset.id
    const map = { ...this.data.categorySelectedMap }
    const ids = [...this.data.newTag.categoryIds]
    if (map[id]) {
      delete map[id]
      const idx = ids.indexOf(id)
      if (idx > -1) ids.splice(idx, 1)
    } else {
      map[id] = true
      if (!ids.includes(id)) ids.push(id)
    }
    this.setData({
      categorySelectedMap: map,
      'newTag.categoryIds': ids
    })
  },

  // 校验
  validateForm() {
    const errors = {}
    const { name } = this.data.newTag
    if (!name || !name.trim()) {
      errors.name = '请输入标签名称'
    } else if (name.trim().length > 10) {
      errors.name = '标签名称不能超过10个字符'
    } else {
      const isDuplicate = this.data.tags.some(tag => {
        if (this.data.showEditDialog && tag._id === this.data.editingTag._id) return false
        return tag.name === name.trim()
      })
      if (isDuplicate) errors.name = '标签名称已存在'
    }
    this.setData({ errors })
    return Object.keys(errors).length === 0
  },

  clearFieldError(field) {
    const errors = { ...this.data.errors }
    delete errors[field]
    this.setData({ errors })
  },

  // 保存
  async saveTag() {
    if (!this.validateForm()) {
      wx.showToast({ title: Object.values(this.data.errors)[0], icon: 'error' })
      return
    }
    try {
      wx.showLoading({ title: '保存中...' })
      const { name, color, categoryIds } = this.data.newTag
      const trimmedName = name.trim()
      const now = new Date().toISOString()
      let customTags = wx.getStorageSync('customTags') || []

      if (this.data.showAddDialog) {
        const newTag = {
          _id: 'tag_custom_' + Date.now().toString(),
          name: trimmedName,
          color,
          categoryIds,
          isDefault: false,
          createTime: now,
          updateTime: now
        }
        customTags.push(newTag)
        wx.setStorageSync('customTags', customTags)
        wx.showToast({ title: '标签添加成功', icon: 'success' })
      } else {
        const targetId = this.data.editingTag._id
        const idx = customTags.findIndex(t => t._id === targetId)
        if (idx !== -1) {
          customTags[idx] = {
            ...customTags[idx],
            name: trimmedName,
            color,
            categoryIds,
            updateTime: now
          }
          wx.setStorageSync('customTags', customTags)
          wx.showToast({ title: '标签修改成功', icon: 'success' })
        } else {
          throw new Error('仅可修改自定义标签')
        }
      }

      wx.hideLoading()
      this.closeDialog()
      this.loadTags()
    } catch (error) {
      console.error('保存标签失败:', error)
      wx.hideLoading()
      wx.showToast({ title: error.message || '保存失败', icon: 'error' })
    }
  },

  // 关闭对话框
  closeDialog() {
    this.setData({
      showAddDialog: false,
      showEditDialog: false,
      editingTag: null,
      newTag: {
        name: '',
        color: '#007AFF',
        categoryIds: []
      },
      categorySelectedMap: {},
      errors: {}
    })
  },

  // 占位
  noop() {},

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})