// pages/custom-cycle/custom-cycle.js
const { showLoading, hideLoading, showToast } = require('../../utils/uiUtil')

Page({
  data: {
    loading: false,
    
    // 当前周期设置
    currentCycle: null,
    
    // 周期类型
    cycleType: 'natural', // natural, salary, custom
    
    // 自定义周期设置
    customSettings: {
      startDay: 1,
      startMonth: 1,
      endDay: 31,
      endMonth: 12
    },
    
    // 工资周期设置
    salarySettings: {
      payDay: 15, // 发薪日
      cycleLength: 30 // 周期长度（天）
    },
    
    // 预设模板
    templates: [
      {
        id: 'natural',
        name: '自然月',
        description: '每月1日-月末',
        type: 'natural'
      },
      {
        id: 'salary_15',
        name: '工资周期(15日)',
        description: '每月15日-次月14日',
        type: 'salary',
        payDay: 15
      },
      {
        id: 'salary_25',
        name: '工资周期(25日)',
        description: '每月25日-次月24日',
        type: 'salary',
        payDay: 25
      },
      {
        id: 'custom_semester',
        name: '学期制',
        description: '9月1日-次年8月31日',
        type: 'custom',
        startMonth: 9,
        startDay: 1,
        endMonth: 8,
        endDay: 31
      }
    ],
    
    // UI状态
    showCustomDialog: false,
    showSalaryDialog: false,
    
    // 当前预览
    previewText: '',
    
    // 验证错误
    errors: {}
  },

  onLoad() {
    this.loadCurrentCycle()
    this.updatePreview()
  },

  // 加载当前周期设置
  async loadCurrentCycle() {
    try {
      this.setData({ loading: true })
      
      const currentCycle = wx.getStorageSync('accountingCycle') || {
        type: 'natural',
        name: '自然月',
        description: '每月1日-月末'
      }
      
      this.setData({
        currentCycle,
        cycleType: currentCycle.type
      })
      
      // 如果是自定义周期，加载设置
      if (currentCycle.type === 'custom' && currentCycle.settings) {
        this.setData({
          customSettings: currentCycle.settings
        })
      }
      
      // 如果是工资周期，加载设置
      if (currentCycle.type === 'salary' && currentCycle.settings) {
        this.setData({
          salarySettings: currentCycle.settings
        })
      }
      
      this.updatePreview()
      this.setData({ loading: false })
    } catch (error) {
      console.error('加载周期设置失败:', error)
      this.setData({ loading: false })
      showToast('加载失败', 'error')
    }
  },

  // 选择模板
  onTemplateSelect(e) {
    const template = e.currentTarget.dataset.template
    
    if (template.type === 'natural') {
      this.applyCycle({
        type: 'natural',
        name: template.name,
        description: template.description
      })
    } else if (template.type === 'salary') {
      this.setData({
        cycleType: 'salary',
        'salarySettings.payDay': template.payDay
      })
      this.updatePreview()
    } else if (template.type === 'custom') {
      this.setData({
        cycleType: 'custom',
        'customSettings.startMonth': template.startMonth,
        'customSettings.startDay': template.startDay,
        'customSettings.endMonth': template.endMonth,
        'customSettings.endDay': template.endDay
      })
      this.updatePreview()
    }
  },

  // 周期类型切换
  onCycleTypeChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ cycleType: type })
    this.updatePreview()
  },

  // 显示自定义设置对话框
  showCustomDialog() {
    this.setData({
      showCustomDialog: true,
      errors: {}
    })
  },

  // 显示工资周期设置对话框
  showSalaryDialog() {
    this.setData({
      showSalaryDialog: true,
      errors: {}
    })
  },

  // 关闭对话框
  closeDialog() {
    this.setData({
      showCustomDialog: false,
      showSalaryDialog: false,
      errors: {}
    })
  },

  // 自定义周期 - 开始月份选择
  onStartMonthChange(e) {
    const month = parseInt(e.detail.value) + 1
    this.setData({
      'customSettings.startMonth': month
    })
    this.updatePreview()
    this.clearFieldError('startMonth')
  },

  // 自定义周期 - 开始日期选择
  onStartDayChange(e) {
    const day = parseInt(e.detail.value) + 1
    this.setData({
      'customSettings.startDay': day
    })
    this.updatePreview()
    this.clearFieldError('startDay')
  },

  // 自定义周期 - 结束月份选择
  onEndMonthChange(e) {
    const month = parseInt(e.detail.value) + 1
    this.setData({
      'customSettings.endMonth': month
    })
    this.updatePreview()
    this.clearFieldError('endMonth')
  },

  // 自定义周期 - 结束日期选择
  onEndDayChange(e) {
    const day = parseInt(e.detail.value) + 1
    this.setData({
      'customSettings.endDay': day
    })
    this.updatePreview()
    this.clearFieldError('endDay')
  },

  // 工资周期 - 发薪日选择
  onPayDayChange(e) {
    const day = parseInt(e.detail.value) + 1
    this.setData({
      'salarySettings.payDay': day
    })
    this.updatePreview()
    this.clearFieldError('payDay')
  },

  // 工资周期 - 周期长度输入
  onCycleLengthInput(e) {
    const length = parseInt(e.detail.value) || 30
    this.setData({
      'salarySettings.cycleLength': Math.max(1, Math.min(365, length))
    })
    this.updatePreview()
    this.clearFieldError('cycleLength')
  },

  // 更新预览
  updatePreview() {
    let previewText = ''
    
    switch (this.data.cycleType) {
      case 'natural':
        previewText = '每月1日 - 月末'
        break
        
      case 'salary':
        const payDay = this.data.salarySettings.payDay
        const prevDay = payDay === 1 ? 31 : payDay - 1
        previewText = `每月${payDay}日 - 次月${prevDay}日`
        break
        
      case 'custom':
        const { startMonth, startDay, endMonth, endDay } = this.data.customSettings
        if (startMonth === endMonth) {
          previewText = `每年${startMonth}月${startDay}日 - ${endDay}日`
        } else {
          previewText = `每年${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`
        }
        break
    }
    
    this.setData({ previewText })
  },

  // 表单验证
  validateCustomSettings() {
    const errors = {}
    const { startMonth, startDay, endMonth, endDay } = this.data.customSettings
    
    // 验证日期有效性
    if (startMonth < 1 || startMonth > 12) {
      errors.startMonth = '开始月份无效'
    }
    
    if (endMonth < 1 || endMonth > 12) {
      errors.endMonth = '结束月份无效'
    }
    
    if (startDay < 1 || startDay > 31) {
      errors.startDay = '开始日期无效'
    }
    
    if (endDay < 1 || endDay > 31) {
      errors.endDay = '结束日期无效'
    }
    
    // 验证逻辑合理性
    if (startMonth === endMonth && startDay >= endDay) {
      errors.general = '同月内开始日期不能晚于或等于结束日期'
    }
    
    this.setData({ errors })
    return Object.keys(errors).length === 0
  },

  // 验证工资周期设置
  validateSalarySettings() {
    const errors = {}
    const { payDay, cycleLength } = this.data.salarySettings
    
    if (payDay < 1 || payDay > 31) {
      errors.payDay = '发薪日无效'
    }
    
    if (cycleLength < 1 || cycleLength > 365) {
      errors.cycleLength = '周期长度应在1-365天之间'
    }
    
    this.setData({ errors })
    return Object.keys(errors).length === 0
  },

  // 清除字段错误
  clearFieldError(field) {
    const errors = { ...this.data.errors }
    delete errors[field]
    delete errors.general
    this.setData({ errors })
  },

  // 应用周期设置
  async applyCycle(cycleConfig) {
    try {
      let finalConfig = cycleConfig
      
      if (!finalConfig) {
        // 根据当前类型生成配置
        switch (this.data.cycleType) {
          case 'natural':
            finalConfig = {
              type: 'natural',
              name: '自然月',
              description: '每月1日-月末'
            }
            break
            
          case 'salary':
            if (!this.validateSalarySettings()) {
              showToast(Object.values(this.data.errors)[0], 'error')
              return
            }
            
            const payDay = this.data.salarySettings.payDay
            const prevDay = payDay === 1 ? 31 : payDay - 1
            
            finalConfig = {
              type: 'salary',
              name: `工资周期(${payDay}日)`,
              description: `每月${payDay}日-次月${prevDay}日`,
              settings: this.data.salarySettings
            }
            break
            
          case 'custom':
            if (!this.validateCustomSettings()) {
              showToast(Object.values(this.data.errors)[0], 'error')
              return
            }
            
            const { startMonth, startDay, endMonth, endDay } = this.data.customSettings
            let description = ''
            
            if (startMonth === endMonth) {
              description = `每年${startMonth}月${startDay}日-${endDay}日`
            } else {
              description = `每年${startMonth}月${startDay}日-${endMonth}月${endDay}日`
            }
            
            finalConfig = {
              type: 'custom',
              name: '自定义周期',
              description,
              settings: this.data.customSettings
            }
            break
        }
      }
      
      // 保存设置
      wx.setStorageSync('accountingCycle', finalConfig)
      
      this.setData({
        currentCycle: finalConfig
      })
      
      this.closeDialog()
      showToast('周期设置已保存', 'success')
      
      // 通知其他页面刷新
      getApp().globalData.cycleChanged = true
      
    } catch (error) {
      console.error('保存周期设置失败:', error)
      showToast('保存失败', 'error')
    }
  },

  // 重置为默认
  resetToDefault() {
    wx.showModal({
      title: '确认重置',
      content: '确定要重置为自然月周期吗？',
      confirmText: '重置',
      success: (res) => {
        if (res.confirm) {
          this.applyCycle({
            type: 'natural',
            name: '自然月',
            description: '每月1日-月末'
          })
        }
      }
    })
  },

  // 获取当前周期的日期范围
  getCurrentCycleDates() {
    const cycle = this.data.currentCycle
    const now = new Date()
    
    let startDate, endDate
    
    switch (cycle.type) {
      case 'natural':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
        
      case 'salary':
        const payDay = cycle.settings.payDay
        const currentDay = now.getDate()
        
        if (currentDay >= payDay) {
          // 当前周期
          startDate = new Date(now.getFullYear(), now.getMonth(), payDay)
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, payDay - 1)
        } else {
          // 上个周期
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, payDay)
          endDate = new Date(now.getFullYear(), now.getMonth(), payDay - 1)
        }
        break
        
      case 'custom':
        const { startMonth, startDay, endMonth, endDay } = cycle.settings
        const currentYear = now.getFullYear()
        
        startDate = new Date(currentYear, startMonth - 1, startDay)
        
        if (endMonth >= startMonth) {
          endDate = new Date(currentYear, endMonth - 1, endDay)
        } else {
          // 跨年
          endDate = new Date(currentYear + 1, endMonth - 1, endDay)
        }
        
        // 如果当前日期在周期之前，使用上一个周期
        if (now < startDate) {
          startDate = new Date(currentYear - 1, startMonth - 1, startDay)
          if (endMonth >= startMonth) {
            endDate = new Date(currentYear - 1, endMonth - 1, endDay)
          } else {
            endDate = new Date(currentYear, endMonth - 1, endDay)
          }
        }
        break
    }
    
    return { startDate, endDate }
  }
})