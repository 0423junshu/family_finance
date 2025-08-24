// utils/globalData.js
// 全局数据管理

const globalData = {
  // 用户信息
  userInfo: null,
  isLogin: false,
  
  // 当前家庭
  currentFamily: null,
  familyRole: null, // owner, admin, member
  
  // 应用设置
  hideAmount: false, // 隐藏金额
  theme: 'light', // 主题：light, dark
  language: 'zh-cn', // 语言
  
  // 云开发实例
  cloud: null,
  
  // 缓存数据
  categories: [], // 分类列表
  accounts: [], // 账户列表
  tags: [], // 标签列表
  
  // 同步状态
  syncStatus: 'idle', // idle, syncing, success, error
  lastSyncTime: null,
  
  // 离线数据
  offlineTransactions: [], // 离线交易记录
  
  // 页面状态
  currentPage: 'index',
  pageStack: []
}

// 数据更新方法
const updateGlobalData = (key, value) => {
  const app = getApp()
  if (app && app.globalData) {
    app.globalData[key] = value
    
    // 持久化存储某些关键数据
    const persistKeys = ['hideAmount', 'theme', 'language', 'currentFamily']
    if (persistKeys.includes(key)) {
      wx.setStorageSync(key, value)
    }
    
    // 通知页面更新
    app.notifyPageUpdate(`${key}Changed`, { [key]: value })
  }
}

// 获取全局数据
const getGlobalData = (key) => {
  const app = getApp()
  return app && app.globalData ? app.globalData[key] : null
}

// 清空全局数据
const clearGlobalData = () => {
  const app = getApp()
  if (app && app.globalData) {
    app.globalData.userInfo = null
    app.globalData.isLogin = false
    app.globalData.currentFamily = null
    app.globalData.familyRole = null
    app.globalData.categories = []
    app.globalData.accounts = []
    app.globalData.tags = []
    app.globalData.offlineTransactions = []
    
    // 清除本地存储
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('currentFamily')
  }
}

module.exports = { globalData, updateGlobalData, getGlobalData, clearGlobalData }
