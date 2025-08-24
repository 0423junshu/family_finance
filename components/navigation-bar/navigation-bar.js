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
    navBarHeight: 44,
    hideAmount: false
  },

  lifetimes: {
    attached() {
      this.initNavBar()
      this.initHideAmountStatus()
    }
  },

  methods: {
    // 初始化导航栏
    initNavBar() {
      const systemInfo = wx.getSystemInfoSync()
      const { statusBarHeight } = systemInfo
      
      this.setData({
        statusBarHeight,
        navBarHeight: 44
      })
    },

    // 初始化隐藏金额状态
    initHideAmountStatus() {
      const app = getApp()
      this.setData({
        hideAmount: app.globalData.hideAmount || false
      })
    },

    // 返回按钮点击
    onBackTap() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        wx.navigateBack()
      } else {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }
      
      this.triggerEvent('back')
    },

    // 首页按钮点击
    onHomeTap() {
      wx.switchTab({
        url: '/pages/index/index'
      })
      
      this.triggerEvent('home')
    },

    // 隐藏金额按钮点击
    onHideAmountTap() {
      const app = getApp()
      app.toggleHideAmount()
      
      this.setData({
        hideAmount: app.globalData.hideAmount
      })
      
      this.triggerEvent('hideAmountChange', {
        hideAmount: app.globalData.hideAmount
      })
    },

    // 右侧按钮点击
    onRightTap() {
      this.triggerEvent('rightTap')
    }
  }
})