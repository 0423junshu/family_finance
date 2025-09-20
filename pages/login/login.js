// pages/login/login.js
Page({
  data: {
    loading: false
  },

  onLoad(options) {
    // 记录重定向目标（用于登录后返回）
    this.redirect = (options && options.redirect) ? decodeURIComponent(options.redirect) : ''
    console.log('[LOGIN] onLoad, redirect=', this.redirect)
    // 检查是否已经登录
    this.checkLoginStatus()
  },

  // 检查登录状态（严格校验 openid/_id）
  checkLoginStatus() {
    const app = getApp()
    const u = app.globalData.userInfo || wx.getStorageSync('userInfo')
    if (u && (u.openid || u._id)) {
      console.log('[LOGIN] 已登录，准备跳转')
      app.globalData.isLogin = true
      this.navigateAfterLogin()
    } else {
      console.log('[LOGIN] 未登录')
      app.globalData.isLogin = false
    }
  },

  // 微信登录
  async onWechatLogin() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      // 获取用户授权
      const { userInfo } = await this.getUserProfile()
      console.log('[LOGIN] 获取用户授权成功:', userInfo)
      
      // 调用登录接口（确保云环境已就绪）
      const app = getApp()
      if (!(typeof wx !== 'undefined' && wx.cloud)) {
        console.log('[LOGIN] 等待云环境就绪...')
        const start = Date.now()
        while (!(typeof wx !== 'undefined' && wx.cloud) && Date.now() - start < 5000) {
          await new Promise(r => setTimeout(r, 100))
        }
      }
      
      const loginRaw = await app.login()
      console.log('[LOGIN] 云函数返回:', loginRaw)
      
      // 兼容云函数返回 {success, data} 或直接返回用户对象
      const loginData = (loginRaw && typeof loginRaw === 'object' && 'data' in loginRaw) ? loginRaw.data : loginRaw
      console.log('[LOGIN] 解析后数据:', loginData)
      
      // 合并用户信息，优先使用微信授权的信息；确保包含 openid/_id
      const mergedUserInfo = {
        ...(loginData || {}),
        nickName: (userInfo && userInfo.nickName) || (loginData && loginData.nickName) || (loginData && loginData.nickname) || '用户',
        avatarUrl: (userInfo && userInfo.avatarUrl) || (loginData && loginData.avatarUrl) || (loginData && loginData.avatar) || ''
      }
      console.log('[LOGIN] 合并用户信息:', mergedUserInfo)
      console.log('[LOGIN] 检查关键字段 - openid:', mergedUserInfo.openid, '_id:', mergedUserInfo._id)
      
      // 验证必要字段
      if (!mergedUserInfo.openid && !mergedUserInfo._id) {
        throw new Error('登录返回数据缺少用户标识(openid/_id)')
      }
      
      // 更新用户信息与登录态
      app.globalData.userInfo = mergedUserInfo
      app.globalData.isLogin = true
      wx.setStorageSync('userInfo', mergedUserInfo)
      console.log('[LOGIN] 登录态已更新:', app.globalData.isLogin)
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
      
      // 登录成功后的跳转（支持返回原目标页）
      setTimeout(() => {
        this.navigateAfterLogin()
      }, 1000)
      
    } catch (error) {
      console.error('[LOGIN] 登录失败:', error)
      wx.showToast({
        title: '登录失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 登录后跳转逻辑（支持重定向回原页面，tabBar/失败自动兜底）
  navigateAfterLogin() {
    const redirect = this.redirect || ''
    console.log('[LOGIN] 准备跳转，redirect=', redirect)
    
    if (redirect && typeof redirect === 'string') {
      // 识别 tabBar 页面
      const tabBarPages = ['/pages/index/index', '/pages/reports/reports-simple', '/pages/assets/assets', '/pages/investments/investments', '/pages/profile/profile']
      const isTabBar = tabBarPages.some(page => redirect.startsWith(page))
      
      if (isTabBar) {
        console.log('[LOGIN] 跳转到 tabBar 页面:', redirect)
        wx.switchTab({
          url: redirect,
          success: () => console.log('[LOGIN] switchTab 成功'),
          fail: (err) => console.error('[LOGIN] switchTab 失败:', err)
        })
        return
      }
      
      // 普通页面跳转
      console.log('[LOGIN] 跳转到普通页面:', redirect)
      wx.redirectTo({
        url: redirect,
        success: () => console.log('[LOGIN] redirectTo 成功'),
        fail: (err) => {
          console.error('[LOGIN] redirectTo 失败，尝试 switchTab:', err)
          wx.switchTab({
            url: redirect,
            success: () => console.log('[LOGIN] switchTab 兜底成功'),
            fail: (err2) => console.error('[LOGIN] switchTab 兜底失败:', err2)
          })
        }
      })
      return
    }
    
    // 无重定向参数，回首页
    console.log('[LOGIN] 无重定向参数，跳转首页')
    wx.switchTab({
      url: '/pages/index/index',
      success: () => console.log('[LOGIN] 跳转首页成功'),
      fail: (err) => console.error('[LOGIN] 跳转首页失败:', err)
    })
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

  // 游客模式（补齐 openid，避免后续判断为未登录）
  onGuestMode() {
    const app = getApp()
    const guestId = 'guest_' + Date.now()
    app.globalData.userInfo = {
      openid: guestId,
      _id: guestId,
      nickName: '游客用户',
      avatarUrl: '/images/default-avatar.svg'
    }
    app.globalData.isLogin = true
    console.log('[LOGIN] 游客模式登录成功')
    wx.switchTab({ url: '/pages/index/index' })
  }
})