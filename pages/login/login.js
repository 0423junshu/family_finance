// pages/login/login.js
Page({
  data: {
    loading: false
  },

  onLoad() {
    // 检查是否已经登录
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const app = getApp()
    if (app.globalData.isLogin) {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  },

  // 微信登录
  async onWechatLogin() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      // 获取用户授权
      const { userInfo } = await this.getUserProfile()
      
      // 调用登录接口
      const app = getApp()
      const loginResult = await app.login()
      
      // 更新用户信息
      app.globalData.userInfo = {
        ...loginResult,
        ...userInfo
      }
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
      
      // 跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 1000)
      
    } catch (error) {
      console.error('登录失败:', error)
      wx.showToast({
        title: '登录失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 获取用户信息
  getUserProfile() {
    return new Promise((resolve, reject) => {
      if (wx.getUserProfile) {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: resolve,
          fail: reject
        })
      } else {
        // 兼容旧版本
        wx.getUserInfo({
          success: resolve,
          fail: reject
        })
      }
    })
  },

  // 游客模式
  onGuestMode() {
    const app = getApp()
    app.globalData.userInfo = {
      nickName: '游客用户',
      avatarUrl: '/images/default-avatar.png'
    }
    app.globalData.isLogin = true
    
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})