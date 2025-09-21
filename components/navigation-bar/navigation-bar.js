// components/navigation-bar/navigation-bar.js
// 自定义导航栏组件

Component({
  properties: {
    // 标题
    title: {
      type: String,
      value: ''
    },
    // 是否显示返回按钮
    showBack: {
      type: Boolean,
      value: true
    },
    // 是否显示首页按钮
    showHome: {
      type: Boolean,
      value: false
    },
    // 背景色
    background: {
      type: String,
      value: '#FFFFFF'
    },
    // 文字颜色
    color: {
      type: String,
      value: '#1C1C1E'
    },
    // 是否显示隐藏金额按钮
    showHideAmount: {
      type: Boolean,
      value: false
    },
    // 右侧自定义内容
    rightContent: {
      type: String,
      value: ''
    }
  },

  data: {
    statusBarHeight: 0,
    navBarHeight: 44
  },

  lifetimes: {
    attached() {
      this.initNavBar()
      if (this.properties.title) {
        this.setData({
          titleText: this.properties.title
        })
      }
    }
  },

  methods: {
    // 修复：初始化导航栏 - 简化逻辑，确保显示
    initNavBar() {
      try {
        // 优先新 API 获取窗口信息，保留兼容回退
        const winInfo = (wx.getWindowInfo && wx.getWindowInfo()) || (wx.getSystemInfoSync ? wx.getSystemInfoSync() : {})
        const statusBarHeight = winInfo.statusBarHeight || (winInfo.safeAreaInsets && winInfo.safeAreaInsets.top) || 44
        // 设置导航栏高度：状态栏高度 + 导航栏内容高度
        const navBarHeight = statusBarHeight + 44
        
        this.setData({
          statusBarHeight: statusBarHeight,
          navBarHeight: navBarHeight
        })
        
        console.log('Navigation bar initialized:', {
          statusBarHeight,
          navBarHeight,
          title: this.properties.title
        })
      } catch (error) {
        console.error('Failed to init navigation bar:', error)
        // 兜底设置
        this.setData({
          statusBarHeight: 44,
          navBarHeight: 88
        })
      }
    },

    // 初始化隐藏金额状态（方案A不再在组件内维护，交由页面控制）
    initHideAmountStatus() {},

    // 返回按钮点击（加入防抖锁避免重复触发）
    onBackTap() {
      if (this._navLock) return
      this._navLock = true

      const pages = getCurrentPages()
      if (pages.length > 1) {
        wx.navigateBack()
      } else {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }
      this.triggerEvent('back')

      setTimeout(() => { this._navLock = false }, 600)
    },

    // 首页按钮点击
    onHomeTap() {
      wx.switchTab({
        url: '/pages/index/index'
      })
      this.triggerEvent('home')
    },

    // 隐藏金额按钮点击（方案A：仅派发事件，由页面处理 privacyScope）
    onHideAmountTap() {
      this.triggerEvent('toggleHide')
      // 兼容旧监听名
      this.triggerEvent('hideAmountChange')
    },

    // 右侧按钮点击
    onRightTap() {
      this.triggerEvent('rightTap')
    }
  }
})