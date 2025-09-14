// pages/theme-settings/theme-settings.js
const themeService = require('../../services/theme')
const { showToast } = require('../../utils/uiUtil')

Page({
  data: {
    // 主题列表
    themes: [],
    currentThemeId: 'light',
    
    // 字体大小列表
    fontSizes: [],
    currentFontSizeId: 'normal',
    
    // 预览状态
    previewThemeId: null,
    
    // UI状态
    loading: false
  },

  onLoad() {
    this.loadThemeData()
  },

  onShow() {
    // 每次显示时刷新当前设置
    this.refreshCurrentSettings()
  },

  // 加载主题数据
  loadThemeData() {
    try {
      const themes = themeService.getAllThemes()
      const fontSizes = themeService.getAllFontSizes()
      const currentTheme = themeService.getCurrentTheme()
      const currentFontSize = themeService.getCurrentFontSize()

      this.setData({
        themes,
        fontSizes,
        currentThemeId: currentTheme.id,
        currentFontSizeId: currentFontSize.id
      })
    } catch (error) {
      console.error('加载主题数据失败:', error)
      showToast('加载失败', 'error')
    }
  },

  // 刷新当前设置
  refreshCurrentSettings() {
    const currentTheme = themeService.getCurrentTheme()
    const currentFontSize = themeService.getCurrentFontSize()

    this.setData({
      currentThemeId: currentTheme.id,
      currentFontSizeId: currentFontSize.id,
      previewThemeId: null
    })
  },

  // 选择主题
  onThemeSelect(e) {
    const themeId = e.currentTarget.dataset.id
    
    if (themeId === this.data.currentThemeId) {
      return
    }

    try {
      const success = themeService.setTheme(themeId)
      
      if (success) {
        this.setData({
          currentThemeId: themeId,
          previewThemeId: null
        })
        
        // 立即应用主题到当前页面
        this.applyThemeToCurrentPage(themeId)
        
        showToast('主题已切换', 'success')
        
        // 触发全局主题变更事件
        const app = getApp()
        if (app && app.onThemeChange) {
          app.onThemeChange(themeId)
        }
        
        // 延迟触发页面刷新，让用户看到效果
        setTimeout(() => {
          this.triggerEvent('themeChanged', { themeId })
        }, 100)
      } else {
        showToast('切换失败', 'error')
      }
    } catch (error) {
      console.error('切换主题失败:', error)
      showToast('切换失败', 'error')
    }
  },

  // 立即应用主题到当前页面
  applyThemeToCurrentPage(themeId) {
    try {
      const theme = themeService.getThemeById(themeId)
      if (theme && theme.colors) {
        // 更新页面根元素的CSS变量
        const pages = getCurrentPages()
        const currentPage = pages[pages.length - 1]
        if (currentPage) {
          // 触发页面重新渲染
          currentPage.setData({
            themeColors: theme.colors,
            currentTheme: theme
          })
        }
        
        // 触发全局主题应用
        themeService.applyTheme()
      }
    } catch (error) {
      console.error('应用主题到当前页面失败:', error)
    }
  },

  // 预览主题
  onThemePreview(e) {
    const themeId = e.currentTarget.dataset.id
    
    if (themeId === this.data.currentThemeId) {
      return
    }

    this.setData({
      previewThemeId: themeId
    })

    // 临时应用预览主题
    const originalTheme = themeService.currentTheme
    themeService.currentTheme = themeId
    themeService.applyTheme()

    // 3秒后恢复原主题
    setTimeout(() => {
      if (this.data.previewThemeId === themeId) {
        themeService.currentTheme = originalTheme
        themeService.applyTheme()
        this.setData({
          previewThemeId: null
        })
      }
    }, 3000)
  },

  // 取消预览
  cancelPreview() {
    if (this.data.previewThemeId) {
      themeService.setTheme(this.data.currentThemeId)
      this.setData({
        previewThemeId: null
      })
    }
  },

  // 选择字体大小
  onFontSizeSelect(e) {
    const fontSizeId = e.currentTarget.dataset.id
    
    if (fontSizeId === this.data.currentFontSizeId) {
      return
    }

    try {
      const success = themeService.setFontSize(fontSizeId)
      
      if (success) {
        this.setData({
          currentFontSizeId: fontSizeId
        })
        
        showToast('字体大小已调整', 'success')
      } else {
        showToast('调整失败', 'error')
      }
    } catch (error) {
      console.error('调整字体大小失败:', error)
      showToast('调整失败', 'error')
    }
  },

  // 重置设置
  onReset() {
    wx.showModal({
      title: '重置主题设置',
      content: '确定要重置所有主题设置为默认值吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            themeService.reset()
            this.refreshCurrentSettings()
            showToast('已重置为默认设置', 'success')
          } catch (error) {
            console.error('重置失败:', error)
            showToast('重置失败', 'error')
          }
        }
      }
    })
  },

  // 主题变更回调
  onThemeChange(theme) {
    // 页面主题变更处理
    console.log('主题已变更:', theme.name)
  },

  // 字体大小变更回调
  onFontSizeChange(fontSize) {
    // 页面字体大小变更处理
    console.log('字体大小已变更:', fontSize.name)
  }
})