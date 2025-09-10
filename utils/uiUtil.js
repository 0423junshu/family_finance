// utils/uiUtil.js

/**
 * 显示加载提示
 * @param {string} title 提示文字
 * @param {boolean} mask 是否显示透明蒙层
 */
function showLoading(title = '加载中...', mask = true) {
  wx.showLoading({
    title,
    mask
  })
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  wx.hideLoading()
}

/**
 * 显示消息提示
 * @param {string} title 提示文字
 * @param {string} icon 图标类型：success, error, loading, none
 * @param {number} duration 提示持续时间（毫秒）
 * @param {boolean} mask 是否显示透明蒙层
 */
function showToast(title, icon = 'none', duration = 2000, mask = false) {
  // 处理不同的图标类型
  let toastIcon = 'none'
  switch (icon) {
    case 'success':
      toastIcon = 'success'
      break
    case 'error':
      toastIcon = 'error'
      break
    case 'loading':
      toastIcon = 'loading'
      break
    default:
      toastIcon = 'none'
  }
  
  wx.showToast({
    title,
    icon: toastIcon,
    duration,
    mask
  })
}

/**
 * 显示模态对话框
 * @param {string} title 标题
 * @param {string} content 内容
 * @param {object} options 选项
 * @returns {Promise} Promise对象
 */
function showModal(title, content, options = {}) {
  const {
    showCancel = true,
    cancelText = '取消',
    confirmText = '确定',
    cancelColor = '#000000',
    confirmColor = '#576B95'
  } = options
  
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      showCancel,
      cancelText,
      confirmText,
      cancelColor,
      confirmColor,
      success: (res) => {
        resolve(res)
      },
      fail: () => {
        resolve({ confirm: false, cancel: true })
      }
    })
  })
}

/**
 * 显示操作菜单
 * @param {Array} itemList 菜单项列表
 * @param {object} options 选项
 * @returns {Promise} Promise对象
 */
function showActionSheet(itemList, options = {}) {
  const {
    alertText = '',
    itemColor = '#000000'
  } = options
  
  return new Promise((resolve) => {
    wx.showActionSheet({
      itemList,
      alertText,
      itemColor,
      success: (res) => {
        resolve({ success: true, tapIndex: res.tapIndex })
      },
      fail: (err) => {
        resolve({ success: false, errMsg: err.errMsg })
      }
    })
  })
}

/**
 * 设置导航栏标题
 * @param {string} title 标题
 */
function setNavigationBarTitle(title) {
  wx.setNavigationBarTitle({
    title
  })
}

/**
 * 设置导航栏颜色
 * @param {string} frontColor 前景颜色
 * @param {string} backgroundColor 背景颜色
 * @param {object} animation 动画效果
 */
function setNavigationBarColor(frontColor, backgroundColor, animation = {}) {
  wx.setNavigationBarColor({
    frontColor,
    backgroundColor,
    animation
  })
}

/**
 * 显示导航栏加载动画
 */
function showNavigationBarLoading() {
  wx.showNavigationBarLoading()
}

/**
 * 隐藏导航栏加载动画
 */
function hideNavigationBarLoading() {
  wx.hideNavigationBarLoading()
}

/**
 * 设置TabBar徽标
 * @param {number} index TabBar索引
 * @param {string} text 徽标文字
 */
function setTabBarBadge(index, text) {
  wx.setTabBarBadge({
    index,
    text
  })
}

/**
 * 移除TabBar徽标
 * @param {number} index TabBar索引
 */
function removeTabBarBadge(index) {
  wx.removeTabBarBadge({
    index
  })
}

/**
 * 显示TabBar红点
 * @param {number} index TabBar索引
 */
function showTabBarRedDot(index) {
  wx.showTabBarRedDot({
    index
  })
}

/**
 * 隐藏TabBar红点
 * @param {number} index TabBar索引
 */
function hideTabBarRedDot(index) {
  wx.hideTabBarRedDot({
    index
  })
}

/**
 * 页面滚动到指定位置
 * @param {number} scrollTop 滚动位置
 * @param {number} duration 滚动动画时长
 */
function pageScrollTo(scrollTop, duration = 300) {
  wx.pageScrollTo({
    scrollTop,
    duration
  })
}

/**
 * 获取系统信息
 * @returns {Promise} Promise对象
 */
function getSystemInfo() {
  return new Promise((resolve, reject) => {
    // 兼容基础库3.8.12的API调用
    try {
      if (wx.getDeviceInfo && wx.getWindowInfo && wx.getSystemSetting) {
        // 使用新版API组合
        Promise.all([
          new Promise((res, rej) => wx.getDeviceInfo({ success: res, fail: rej })),
          new Promise((res, rej) => wx.getWindowInfo({ success: res, fail: rej })),
          new Promise((res, rej) => wx.getSystemSetting({ success: res, fail: rej }))
        ]).then(([deviceInfo, windowInfo, systemSetting]) => {
          resolve({
            ...deviceInfo,
            ...windowInfo,
            ...systemSetting
          })
        }).catch(() => {
          // 降级到旧版API
          wx.getSystemInfo({
            success: resolve,
            fail: reject
          })
        })
      } else {
        // 使用旧版API
        wx.getSystemInfo({
          success: resolve,
          fail: reject
        })
      }
    } catch (error) {
      // 异常情况下的降级处理
      wx.getSystemInfo({
        success: resolve,
        fail: reject
      })
    }
  })
}

/**
 * 获取网络类型
 * @returns {Promise} Promise对象
 */
function getNetworkType() {
  return new Promise((resolve, reject) => {
    wx.getNetworkType({
      success: resolve,
      fail: reject
    })
  })
}

/**
 * 振动反馈
 * @param {string} type 振动类型：heavy, medium, light
 */
function vibrateShort(type = 'medium') {
  if (wx.vibrateShort) {
    wx.vibrateShort({
      type
    })
  }
}

/**
 * 长振动
 */
function vibrateLong() {
  if (wx.vibrateLong) {
    wx.vibrateLong()
  }
}

/**
 * 复制到剪贴板
 * @param {string} data 要复制的数据
 * @returns {Promise} Promise对象
 */
function setClipboardData(data) {
  return new Promise((resolve, reject) => {
    wx.setClipboardData({
      data,
      success: resolve,
      fail: reject
    })
  })
}

/**
 * 从剪贴板获取数据
 * @returns {Promise} Promise对象
 */
function getClipboardData() {
  return new Promise((resolve, reject) => {
    wx.getClipboardData({
      success: resolve,
      fail: reject
    })
  })
}

/**
 * 防抖函数
 * @param {Function} func 要防抖的函数
 * @param {number} delay 延迟时间
 * @returns {Function} 防抖后的函数
 */
function debounce(func, delay = 300) {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      func.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数
 * @param {Function} func 要节流的函数
 * @param {number} delay 延迟时间
 * @returns {Function} 节流后的函数
 */
function throttle(func, delay = 300) {
  let timer = null
  return function(...args) {
    if (!timer) {
      timer = setTimeout(() => {
        func.apply(this, args)
        timer = null
      }, delay)
    }
  }
}

module.exports = {
  showLoading,
  hideLoading,
  showToast,
  showModal,
  showActionSheet,
  setNavigationBarTitle,
  setNavigationBarColor,
  showNavigationBarLoading,
  hideNavigationBarLoading,
  setTabBarBadge,
  removeTabBarBadge,
  showTabBarRedDot,
  hideTabBarRedDot,
  pageScrollTo,
  getSystemInfo,
  getNetworkType,
  vibrateShort,
  vibrateLong,
  setClipboardData,
  getClipboardData,
  debounce,
  throttle
}