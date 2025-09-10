// pages/cycle-edit/cycle-edit.js
const { showLoading, hideLoading, showToast } = require('../../utils/uiUtil')

Page({
  data: {
    mode: 'create', // create, edit
    loading: false,
    submitting: false,
    cycleId: '',
    
    // 表单数据
    formData: {
      name: '',
      type: 'daily',
      time: '21:00',
      day: 0, // 周几 (0=周日, 1=周一...)
      date: 1, // 每月几号
      interval: 1, // 间隔天数/周数/月数
      enabled: true,
      description: ''
    },
    
    // 周期类型选项
    cycleTypes: [
      { value: 'daily', label: '每日', icon: '📅' },
      { value: 'weekly', label: '每周', icon: '📆' },
      { value: 'monthly', label: '每月', icon: '🗓️' },
      { value: 'custom', label: '自定义', icon: '⚙️' }
    ],
    
    // 星期选项
    weekDays: [
      { value: 0, label: '周日' },
      { value: 1, label: '周一' },
      { value: 2, label: '周二' },
      { value: 3, label: '周三' },
      { value: 4, label: '周四' },
      { value: 5, label: '周五' },
      { value: 6, label: '周六' }
    ],
    
    // UI状态
    showTypePicker: false,
    showDayPicker: false,
    showTimePicker: false,
    
    // 验证错误
    errors: {}
  },

  onLoad(options) {
    const mode = options.mode || 'create'
    const cycleId = options.id
    
    this.setData({ 
      mode,
      cycleId 
    })
    
    // 初始化当前类型名称
    this.updateCurrentTypeName()
    
    if (mode === 'edit' && cycleId) {
      this.loadCycleData(cycleId)
    }
  },

  // 更新当前类型名称
  updateCurrentTypeName() {
    const currentType = this.data.cycleTypes.find(t => t.value === this.data.formData.type)
    const currentDay = this.data.weekDays.find(d => d.value === this.data.formData.day)
    
    this.setData({
      currentTypeName: currentType ? currentType.label : '每日',
      currentTypeIcon: currentType ? currentType.icon : '📅',
      currentDayName: currentDay ? currentDay.label : '周日'
    })
  },

  // 加载周期数据（编辑模式）
  async loadCycleData(cycleId) {
    try {
      this.setData({ loading: true })
      
      // 从系统周期和自定义周期中查找
      const cycles = wx.getStorageSync('cycles') || []
      const customCycles = wx.getStorageSync('customCycles') || []
      const allCycles = [...cycles, ...customCycles]
      
      const cycle = allCycles.find(c => c.id === cycleId)
      
      if (cycle) {
        this.setData({
          formData: {
            name: cycle.name,
            type: cycle.type,
            time: cycle.time,
            day: cycle.day || 0,
            date: cycle.date || 1,
            interval: cycle.interval || 1,
            enabled: cycle.enabled !== false,
            description: cycle.description || ''
          }
        })
      }
      
      this.setData({ loading: false })
    } catch (error) {
      console.error('加载周期数据失败:', error)
      this.setData({ loading: false })
      showToast('加载失败', 'error')
    }
  },

  // 周期名称输入
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
    this.clearFieldError('name')
  },

  // 描述输入
  onDescriptionInput(e) {
    this.setData({
      'formData.description': e.detail.value
    })
  },

  // 间隔输入
  onIntervalInput(e) {
    const value = parseInt(e.detail.value) || 1
    if (value > 0 && value <= 365) {
      this.setData({
        'formData.interval': value
      })
    }
  },

  // 显示类型选择器
  showTypePicker() {
    this.setData({ showTypePicker: true })
  },

  // 选择周期类型
  onTypeSelect(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      'formData.type': type,
      showTypePicker: false
    })
    
    // 更新当前类型名称
    this.updateCurrentTypeName()
    
    this.clearFieldError('type')
  },

  // 显示星期选择器
  showDayPicker() {
    this.setData({ showDayPicker: true })
  },

  // 选择星期
  onDaySelect(e) {
    const day = parseInt(e.currentTarget.dataset.day)
    this.setData({
      'formData.day': day,
      showDayPicker: false
    })
    
    // 更新当前星期名称
    this.updateCurrentTypeName()
  },

  // 显示时间选择器
  showTimePicker() {
    this.setData({ showTimePicker: true })
  },

  // 时间选择
  onTimeChange(e) {
    this.setData({
      'formData.time': e.detail.value,
      showTimePicker: false
    })
  },

  // 日期输入
  onDateInput(e) {
    const value = parseInt(e.detail.value)
    if (value >= 1 && value <= 31) {
      this.setData({
        'formData.date': value
      })
    }
  },

  // 开关切换
  onEnabledToggle(e) {
    this.setData({
      'formData.enabled': e.detail.value
    })
  },

  // 表单验证
  validateForm() {
    const errors = {}
    
    // 验证周期名称
    if (!this.data.formData.name.trim()) {
      errors.name = '请输入周期名称'
    } else if (this.data.formData.name.trim().length > 20) {
      errors.name = '周期名称不能超过20个字符'
    }
    
    // 验证周期类型
    if (!this.data.formData.type) {
      errors.type = '请选择周期类型'
    }
    
    // 验证时间格式
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(this.data.formData.time)) {
      errors.time = '请选择有效的时间'
    }
    
    // 验证月度日期
    if (this.data.formData.type === 'monthly') {
      if (this.data.formData.date < 1 || this.data.formData.date > 31) {
        errors.date = '日期必须在1-31之间'
      }
    }
    
    // 验证自定义间隔
    if (this.data.formData.type === 'custom') {
      if (this.data.formData.interval < 1 || this.data.formData.interval > 365) {
        errors.interval = '间隔必须在1-365之间'
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

  // 提交表单
  async onSubmit() {
    if (this.data.submitting) return
    
    // 表单验证
    if (!this.validateForm()) {
      showToast(Object.values(this.data.errors)[0], 'error')
      return
    }

    this.setData({ submitting: true })
    
    try {
      const cycleData = {
        id: this.data.mode === 'edit' ? this.data.cycleId : Date.now().toString(),
        name: this.data.formData.name.trim(),
        type: this.data.formData.type,
        time: this.data.formData.time,
        day: this.data.formData.day,
        date: this.data.formData.date,
        interval: this.data.formData.interval,
        enabled: this.data.formData.enabled,
        description: this.data.formData.description.trim(),
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
      
      if (this.data.mode === 'create') {
        // 添加到自定义周期
        let customCycles = wx.getStorageSync('customCycles') || []
        customCycles.push(cycleData)
        wx.setStorageSync('customCycles', customCycles)
        showToast('周期创建成功', 'success')
      } else {
        // 更新周期
        const isSystemCycle = this.isSystemCycle(this.data.cycleId)
        
        if (isSystemCycle) {
          // 更新系统周期
          let cycles = wx.getStorageSync('cycles') || []
          const index = cycles.findIndex(c => c.id === this.data.cycleId)
          if (index !== -1) {
            cycles[index] = { ...cycles[index], ...cycleData }
            wx.setStorageSync('cycles', cycles)
          }
        } else {
          // 更新自定义周期
          let customCycles = wx.getStorageSync('customCycles') || []
          const index = customCycles.findIndex(c => c.id === this.data.cycleId)
          if (index !== -1) {
            customCycles[index] = { ...customCycles[index], ...cycleData }
            wx.setStorageSync('customCycles', customCycles)
          }
        }
        
        showToast('周期更新成功', 'success')
      }
      
      // 更新通知设置
      this.updateNotifications()
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 800)
    } catch (error) {
      console.error('保存周期失败:', error)
      showToast(error.message || '保存失败', 'error')
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 判断是否为系统周期
  isSystemCycle(cycleId) {
    const systemCycleIds = ['1', '2', '3'] // 系统预设周期ID
    return systemCycleIds.includes(cycleId)
  },

  // 更新通知设置
  updateNotifications() {
    try {
      // 重新设置所有通知
      wx.cancelAllLocalNotifications()
      
      const cycles = wx.getStorageSync('cycles') || []
      const customCycles = wx.getStorageSync('customCycles') || []
      const allCycles = [...cycles, ...customCycles]
      
      const enabledCycles = allCycles.filter(cycle => cycle.enabled)
      
      enabledCycles.forEach(cycle => {
        this.scheduleNotification(cycle)
      })
    } catch (error) {
      console.error('更新通知失败:', error)
    }
  },

  // 安排通知
  scheduleNotification(cycle) {
    const now = new Date()
    let triggerTime = new Date()
    
    const [hour, minute] = cycle.time.split(':').map(Number)
    triggerTime.setHours(hour, minute, 0, 0)
    
    switch (cycle.type) {
      case 'daily':
        if (triggerTime <= now) {
          triggerTime.setDate(triggerTime.getDate() + 1)
        }
        break
      case 'weekly':
        const dayDiff = (cycle.day - now.getDay() + 7) % 7
        triggerTime.setDate(now.getDate() + dayDiff)
        if (triggerTime <= now) {
          triggerTime.setDate(triggerTime.getDate() + 7)
        }
        break
      case 'monthly':
        triggerTime.setDate(cycle.date)
        if (triggerTime <= now) {
          triggerTime.setMonth(triggerTime.getMonth() + 1)
        }
        break
      case 'custom':
        triggerTime.setDate(now.getDate() + cycle.interval)
        break
    }
    
    wx.setLocalNotification({
      id: parseInt(cycle.id),
      title: cycle.name,
      content: cycle.description,
      triggerTime: triggerTime.getTime()
    })
  },

  // 删除周期
  onDelete() {
    if (this.data.mode !== 'edit') return
    
    // 系统周期不能删除，只能禁用
    if (this.isSystemCycle(this.data.cycleId)) {
      showToast('系统周期不能删除，只能禁用', 'none')
      return
    }
    
    wx.showModal({
      title: '确认删除',
      content: '删除周期后，相关的提醒将被取消，确定要删除吗？',
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: (res) => {
        if (res.confirm) {
          this.deleteCycle()
        }
      }
    })
  },

  // 执行删除
  async deleteCycle() {
    try {
      let customCycles = wx.getStorageSync('customCycles') || []
      customCycles = customCycles.filter(c => c.id !== this.data.cycleId)
      wx.setStorageSync('customCycles', customCycles)
      
      // 取消对应的通知
      wx.cancelLocalNotification({
        id: parseInt(this.data.cycleId)
      })
      
      showToast('周期删除成功', 'success')
      
      setTimeout(() => {
        wx.navigateBack()
      }, 800)
    } catch (error) {
      console.error('删除周期失败:', error)
      showToast('删除失败', 'error')
    }
  },

  // 关闭选择器
  onPickerClose() {
    this.setData({
      showTypePicker: false,
      showDayPicker: false,
      showTimePicker: false
    })
  }
})