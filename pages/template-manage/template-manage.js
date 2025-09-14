// pages/template-manage/template-manage.js
Page({
  data: {
    templates: [],
    showGuide: false
  },

  onLoad() {
    this.loadTemplates()
    // 检查是否需要显示指引
    this.checkShowGuide()
  },

  onShow() {
    // 返回本页时刷新一次，确保在编辑/新增后立即可见
    this.loadTemplates()
  },

  // 加载模板（仅从 storage 读取，不写入默认样例，防止覆盖用户数据）
  loadTemplates() {
    const templates = wx.getStorageSync('templates') || []
    // 空态时提供一个轻量引导（不写回存储）
    const source = Array.isArray(templates) ? templates : []
    const formattedTemplates = source.map(item => ({
      ...item,
      amountDisplay: (item.amount / 100).toFixed(2)
    }))
    this.setData({ templates: formattedTemplates })
  },

  // 使用模板
  onUseTemplate(e) {
    const templateId = e.currentTarget.dataset.id
    const template = this.data.templates.find(t => t.id === templateId)
    
    if (!template) {
      wx.showToast({
        title: '模板不存在',
        icon: 'error'
      })
      return
    }

    // 显示加载提示
    wx.showLoading({
      title: '正在跳转...'
    })

    try {
      // 跳转到记账页面，并传递模板数据
      console.log('使用模板数据:', template)
      
      const params = []
      if (template.type) {
        params.push(`type=${template.type}`)
      }
      if (template.amount) {
        // 金额转换为元
        const amountInYuan = (template.amount / 100).toFixed(2)
        params.push(`amount=${amountInYuan}`)
      }
      if (template.categoryId) {
        params.push(`categoryId=${template.categoryId}`)
      }
      if (template.accountId) {
        params.push(`accountId=${template.accountId}`)
      }
      if (template.name) {
        // 使用简单的字符串传递，避免编码问题
        params.push(`templateName=${encodeURIComponent(template.name)}`)
      }
      
      const queryString = params.join('&')
      console.log('跳转参数:', queryString)
      
      wx.navigateTo({
        url: `/pages/record/record${queryString ? '?' + queryString : ''}`,
        success: () => {
          wx.hideLoading()
          wx.showToast({
            title: '模板已应用',
            icon: 'success'
          })
        },
        fail: (error) => {
          wx.hideLoading()
          console.error('跳转失败:', error)
          wx.showToast({
            title: '跳转失败',
            icon: 'error'
          })
        }
      })
    } catch (error) {
      wx.hideLoading()
      console.error('使用模板失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      })
    }
  },

  // 编辑模板
  onEditTemplate(e) {
    const templateId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/template-edit/template-edit?mode=edit&id=${templateId}`
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
          const remain = (wx.getStorageSync('templates') || []).filter(t => t.id !== templateId)
          wx.setStorageSync('templates', remain)
          const formatted = remain.map(item => ({ ...item, amountDisplay: (item.amount / 100).toFixed(2) }))
          this.setData({ templates: formatted })
          wx.showToast({ title: '删除成功', icon: 'success' })
        }
      }
    })
  },

  // 添加模板
  onAddTemplate() {
    wx.navigateTo({
      url: '/pages/template-edit/template-edit?mode=create'
    })
  },

  // 检查是否需要显示指引
  checkShowGuide() {
    const hasShownGuide = wx.getStorageSync('template_guide_shown')
    if (!hasShownGuide && this.data.templates.length > 0) {
      this.setData({
        showGuide: true
      })
    }
  },

  // 显示指引
  showGuide() {
    this.setData({
      showGuide: true
    })
  },

  // 隐藏指引
  hideGuide() {
    this.setData({
      showGuide: false
    })
    // 记录已显示过指引
    wx.setStorageSync('template_guide_shown', true)
  },

  // 防止点击内容区域关闭指引
  preventClose() {
    // 空函数，阻止事件冒泡
  }
})