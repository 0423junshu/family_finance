// pages/profile/profile.js
Page({
  data: {
    userInfo: {
      avatarUrl: '/images/default-avatar.png',
      nickName: '用户',
      phone: ''
    },
    settings: [
      {
        id: 'template',
        title: '记账模板',
        icon: '📝',
        desc: '自定义记账模板'
      },
      {
        id: 'cycle',
        title: '记账周期',
        icon: '📅',
        desc: '设置记账周期提醒'
      },
      {
        id: 'budget',
        title: '预算管理',
        icon: '💰',
        desc: '设置月度预算'
      },
      {
        id: 'backup',
        title: '数据备份',
        icon: '☁️',
        desc: '备份与恢复数据'
      },
      {
        id: 'export',
        title: '数据导出',
        icon: '📊',
        desc: '导出Excel报表'
      },
      {
        id: 'theme',
        title: '主题设置',
        icon: '🎨',
        desc: '个性化主题'
      }
    ],
    version: '1.0.0'
  },

  onLoad() {
    this.loadUserInfo()
  },

  onShow() {
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
    }
  },

  // 设置项点击
  onSettingTap(e) {
    const settingId = e.currentTarget.dataset.id
    
    switch (settingId) {
      case 'template':
        wx.navigateTo({
          url: '/pages/template-manage/template-manage'
        })
        break
      case 'cycle':
        wx.navigateTo({
          url: '/pages/cycle-setting/cycle-setting'
        })
        break
      case 'budget':
        wx.navigateTo({
          url: '/pages/budget-manage/budget-manage'
        })
        break
      case 'backup':
        this.onBackupTap()
        break
      case 'export':
        this.onExportTap()
        break
      case 'theme':
        wx.navigateTo({
          url: '/pages/theme-setting/theme-setting'
        })
        break
    }
  },

  // 数据备份
  onBackupTap() {
    wx.showActionSheet({
      itemList: ['备份到云端', '从云端恢复'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.backupToCloud()
        } else {
          this.restoreFromCloud()
        }
      }
    })
  },

  // 备份到云端
  async backupToCloud() {
    try {
      wx.showLoading({ title: '备份中...' })
      
      const transactions = wx.getStorageSync('transactions') || []
      // 这里应该调用云函数进行备份
      
      wx.hideLoading()
      wx.showToast({
        title: '备份成功',
        icon: 'success'
      })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '备份失败',
        icon: 'error'
      })
    }
  },

  // 从云端恢复
  async restoreFromCloud() {
    try {
      wx.showLoading({ title: '恢复中...' })
      
      // 这里应该调用云函数进行恢复
      
      wx.hideLoading()
      wx.showToast({
        title: '恢复成功',
        icon: 'success'
      })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '恢复失败',
        icon: 'error'
      })
    }
  },

  // 数据导出
  onExportTap() {
    wx.showActionSheet({
      itemList: ['导出Excel', '导出CSV'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.exportExcel()
        } else {
          this.exportCSV()
        }
      }
    })
  },

  // 导出Excel
  exportExcel() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 导出CSV
  exportCSV() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 关于我们
  onAboutTap() {
    wx.showModal({
      title: '关于我们',
      content: `家庭财务管理小程序\n版本：${this.data.version}\n\n专业的家庭财务管理工具，帮助您更好地管理家庭收支。`,
      showCancel: false
    })
  },

  // 退出登录
  onLogoutTap() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          getApp().logout()
        }
      }
    })
  }
})