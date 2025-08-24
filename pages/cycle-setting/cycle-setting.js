// pages/cycle-setting/cycle-setting.js
Page({
  data: {
    cycleStartDay: 1, // 默认为每月1号
    customCycleEnabled: false,
    days: Array.from({length: 31}, (_, i) => i + 1)
  },

  onLoad() {
    this.loadSettings()
  },

  // 加载设置
  loadSettings() {
    try {
      const settings = wx.getStorageSync('cycleSettings') || {}
      this.setData({
        cycleStartDay: settings.cycleStartDay || 1,
        customCycleEnabled: settings.customCycleEnabled || false
      })
    } catch (error) {
      console.error('加载周期设置失败:', error)
    }
  },

  // 切换自定义周期
  onSwitchChange(e) {
    const customCycleEnabled = e.detail.value
    this.setData({ customCycleEnabled })
    this.saveSettings()
  },

  // 选择起始日
  onDayChange(e) {
    const cycleStartDay = parseInt(e.detail.value) + 1
    this.setData({ cycleStartDay })
    this.saveSettings()
  },

  // 保存设置
  saveSettings() {
    try {
      const { cycleStartDay, customCycleEnabled } = this.data
      wx.setStorageSync('cycleSettings', {
        cycleStartDay,
        customCycleEnabled
      })
      
      // 通知其他页面设置已更新
      wx.setStorageSync('settingsChanged', Date.now())
      
      wx.showToast({
        title: '设置已保存',
        icon: 'success'
      })
    } catch (error) {
      console.error('保存周期设置失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      })
    }
  }
})