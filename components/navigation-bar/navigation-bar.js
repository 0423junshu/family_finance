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
      if (this.properties.title) {
        this.setData({
          titleText: this.properties.title
        })
      }
    }
  },

  methods: {
    // 修复：初始化导航栏 - 兼容新旧API
    async initNavBar() {
      try {
        // 使用兼容的系统信息获取方式
        if (wx.getDeviceInfo && wx.getWindowInfo && wx.getSystemSetting) {
          // 新版API
          const [deviceInfo, windowInfo, systemSetting] = await Promise.all([
            new Promise((resolve, reject) => wx.getDeviceInfo({ success: resolve, fail: reject })),
            new Promise((resolve, reject) => wx.getWindowInfo({ success: resolve, fail: reject })),
            new Promise((resolve, reject) => wx.getSystemSetting({ success: resolve, fail: reject }))
          ]);
          
          const statusBarHeight = windowInfo.statusBarHeight || deviceInfo.statusBarHeight || 44;
          // 增加额外的安全区域，避免被系统UI遮挡
          this.setData({ statusBarHeight: statusBarHeight + 15 });
        } else {
          // 降级到旧版API
          const systemInfo = await new Promise((resolve, reject) => 
            wx.getSystemInfo({ success: resolve, fail: reject })
          );
          const statusBarHeight = systemInfo.statusBarHeight || 44;
          // 增加额外的安全区域，避免被系统UI遮挡
          this.setData({ statusBarHeight: statusBarHeight + 15 });
        }
      } catch (error) {
        console.warn('获取系统信息失败，使用默认值:', error);
        // 使用更大的默认值确保不被遮挡
        this.setData({ statusBarHeight: 59 });
      }
      
      this.setData({
        navBarHeight: 50  // 增加导航栏本身的高度
      });
    },

    // 初始化隐藏金额状态
    initHideAmountStatus() {
      const app = getApp()
      this.setData({
        hideAmount: app && app.globalData ? (app.globalData.hideAmount || false) : false
      })
    },

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

    // 隐藏金额按钮点击
    onHideAmountTap() {
      const app = getApp()
      if (app && typeof app.toggleHideAmount === 'function') {
        app.toggleHideAmount()
        this.setData({
          hideAmount: app.globalData.hideAmount
        })
        this.triggerEvent('hideAmountChange', {
          hideAmount: app.globalData.hideAmount
        })
      }
    },

    // 右侧按钮点击
    onRightTap() {
      this.triggerEvent('rightTap')
    }
  }
})