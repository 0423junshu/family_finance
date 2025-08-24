// pages/template-manage/template-manage.js
Page({
  data: {
    templates: [
      {
        id: '1',
        name: '早餐',
        type: 'expense',
        amount: 1500,
        categoryId: '1',
        categoryName: '餐饮',
        accountId: '1',
        accountName: '现金',
        icon: '🍳'
      },
      {
        id: '2',
        name: '午餐',
        type: 'expense',
        amount: 2500,
        categoryId: '1',
        categoryName: '餐饮',
        accountId: '2',
        accountName: '支付宝',
        icon: '🍽️'
      },
      {
        id: '3',
        name: '工资',
        type: 'income',
        amount: 800000,
        categoryId: '3',
        categoryName: '工资',
        accountId: '2',
        accountName: '招商银行',
        icon: '💰'
      }
    ]
  },

  onLoad() {
    this.loadTemplates()
  },

  // 加载模板
  loadTemplates() {
    const templates = wx.getStorageSync('templates') || this.data.templates
    
    // 格式化显示数据
    const formattedTemplates = templates.map(item => ({
      ...item,
      amountDisplay: (item.amount / 100).toFixed(2)
    }))
    
    this.setData({ templates: formattedTemplates })
  },

  // 使用模板
  onUseTemplate(e) {
    const templateId = e.currentTarget.dataset.id
    const template = this.data.templates.find(t => t.id === templateId)
    
    if (template) {
      // 跳转到记账页面，并传递模板数据
      const params = new URLSearchParams({
        type: template.type,
        amount: (template.amount / 100).toString(),
        categoryId: template.categoryId,
        accountId: template.accountId,
        description: template.name
      }).toString()
      
      wx.navigateTo({
        url: `/pages/record/record?${params}`
      })
    }
  },

  // 编辑模板
  onEditTemplate(e) {
    const templateId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/template-edit/template-edit?id=${templateId}`
    })
  },

  // 删除模板
  onDeleteTemplate(e) {
    const templateId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '提示',
      content: '确定要删除这个模板吗？',
      success: (res) => {
        if (res.confirm) {
          const templates = this.data.templates.filter(t => t.id !== templateId)
          this.setData({ templates })
          wx.setStorageSync('templates', templates)
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
        }
      }
    })
  },

  // 添加模板
  onAddTemplate() {
    wx.navigateTo({
      url: '/pages/template-edit/template-edit?mode=create'
    })
  }
})