// services/auth.js
// 用户认证服务

const request = require('../utils/request')
const storage = require('../utils/storage')
const { updateGlobalData } = require('../utils/globalData')

class AuthService {
  // 用户登录
  async login() {
    try {
      // 获取微信登录凭证
      const loginRes = await wx.login()
      if (!loginRes.code) {
        throw new Error('获取登录凭证失败')
      }

      // 调用云函数进行登录
      const result = await request.callFunction('login', {
        code: loginRes.code
      })

      if (result.success) {
        const userInfo = result.data
        
        // 更新全局状态
        updateGlobalData('userInfo', userInfo)
        updateGlobalData('isLogin', true)
        
        // 本地存储
        storage.set('userInfo', userInfo)
        storage.set('isLogin', true)
        
        return userInfo
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    }
  }

  // 获取用户信息
  async getUserInfo() {
    try {
      const result = await request.callFunction('getUserInfo')
      
      if (result.success) {
        const userInfo = result.data
        updateGlobalData('userInfo', userInfo)
        storage.set('userInfo', userInfo)
        return userInfo
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      throw error
    }
  }

  // 更新用户信息
  async updateUserInfo(data) {
    try {
      const result = await request.callFunction('updateUserInfo', data)
      
      if (result.success) {
        const userInfo = result.data
        updateGlobalData('userInfo', userInfo)
        storage.set('userInfo', userInfo)
        return userInfo
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('更新用户信息失败:', error)
      throw error
    }
  }

  // 用户登出
  logout() {
    // 清除全局状态
    updateGlobalData('userInfo', null)
    updateGlobalData('isLogin', false)
    updateGlobalData('currentFamily', null)
    updateGlobalData('familyRole', null)
    
    // 清除本地存储
    storage.remove('userInfo')
    storage.remove('isLogin')
    storage.remove('currentFamily')
    
    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/login/login'
    })
  }

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = storage.get('userInfo')
    const isLogin = storage.get('isLogin', false)
    
    if (userInfo && isLogin) {
      updateGlobalData('userInfo', userInfo)
      updateGlobalData('isLogin', true)
      return true
    }
    
    // 如果没有登录信息，创建默认用户信息以便演示
    const defaultUser = {
      openid: 'demo_user_' + Date.now(),
      nickName: '演示用户',
      avatarUrl: '/images/default-avatar.png'
    }
    
    updateGlobalData('userInfo', defaultUser)
    updateGlobalData('isLogin', true)
    storage.set('userInfo', defaultUser)
    storage.set('isLogin', true)
    
    return true
  }

  // 获取当前用户
  getCurrentUser() {
    const app = getApp()
    return app.globalData.userInfo || {
      openid: 'demo_user',
      nickName: '演示用户',
      avatarUrl: '/images/default-avatar.png'
    }
  }

  // 检查是否已登录
  isLoggedIn() {
    const app = getApp()
    // 为了演示，总是返回 true
    return app.globalData.isLogin !== false
  }
}

// 创建单例
const authService = new AuthService()

module.exports = authService
