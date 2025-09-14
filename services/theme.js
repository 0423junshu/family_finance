// services/theme.js
// 主题与字体大小服务（最小可用实现）
const storageKey = 'app_theme_settings'

const defaultThemes = [
  {
    id: 'light',
    name: '浅色',
    description: '明亮清爽的视觉风格',
    colors: {
      primary: '#007AFF',
      background: '#F5F5F5',
      surface: '#FFFFFF',
      text: '#1C1C1E',
      textSecondary: '#8E8E93',
      divider: '#F2F2F7',
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30'
    }
  },
  {
    id: 'dark',
    name: '深色',
    description: '夜间友好的深色风格',
    colors: {
      primary: '#0A84FF',
      background: '#000000',
      surface: '#1C1C1E',
      text: '#FFFFFF',
      textSecondary: '#C7C7CC',
      divider: '#2C2C2E',
      success: '#30D158',
      warning: '#FFD60A',
      error: '#FF453A'
    }
  }
]

const fontSizes = [
  { id: 'small', name: '小', scale: 0.9 },
  { id: 'normal', name: '标准', scale: 1.0 },
  { id: 'large', name: '大', scale: 1.1 },
  { id: 'xlarge', name: '特大', scale: 1.2 }
]

class ThemeService {
  constructor() {
    const saved = this._load()
    this.currentThemeId = (saved && saved.themeId) || 'light'
    this.currentFontSizeId = (saved && saved.fontSizeId) || 'normal'
    this._inited = false
    // 首次应用一次，确保无论是否显式调用 init 都可生效
    this.applyTheme()
  }

  getAllThemes() {
    return defaultThemes
  }

  getAllFontSizes() {
    return fontSizes
  }

  getCurrentTheme() {
    return defaultThemes.find(t => t.id === this.currentThemeId) || defaultThemes[0]
  }

  getCurrentFontSize() {
    return fontSizes.find(f => f.id === this.currentFontSizeId) || fontSizes[1]
  }

  getThemeById(themeId) {
    return defaultThemes.find(t => t.id === themeId) || null
  }

  getFontSizeById(fontSizeId) {
    return fontSizes.find(f => f.id === fontSizeId) || null
  }

  setTheme(themeId) {
    if (!defaultThemes.some(t => t.id === themeId)) return false
    this.currentThemeId = themeId
    this.applyTheme()
    this._save()
    return true
  }

  setFontSize(fontSizeId) {
    if (!fontSizes.some(f => f.id === fontSizeId)) return false
    this.currentFontSizeId = fontSizeId
    this.applyTheme()
    this._save()
    return true
  }

  // 兼容 app.js 里调用的初始化方法（幂等）
  init() {
    if (this._inited) return
    try {
      // 确保全局回调容器存在
      const app = (typeof getApp === 'function') ? getApp() : null
      if (app) {
        app.globalData = app.globalData || {}
        app.onThemeChangedCallbacks = app.onThemeChangedCallbacks || []
      }
      // 应用一次主题变量
      this.applyTheme()
      this._inited = true
    } catch (e) {
      // 即便失败也不抛出，避免阻断小程序启动
      this._inited = true
    }
  }

  // 将当前主题与字号映射到 CSS 变量（与 styles/common.wxss 变量约定保持一致）
  applyTheme() {
    const theme = this.getCurrentTheme()
    const font = this.getCurrentFontSize()
    try {
      // 使用 setStorage 作为全局状态来源，页面 wxss 可通过 :root 自定义或页面加载时读取并设置 Page.data 里的自定义 style
      // 这里采用全局 App 实例设置全局数据并触发事件的简化策略
      const app = (typeof getApp === 'function') ? getApp() : null
      if (app) {
        app.globalData = app.globalData || {}
        app.globalData.themeVars = {
          '--primary-color': theme.colors.primary,
          '--bg-color': theme.colors.background,
          '--surface-color': theme.colors.surface,
          '--text-primary': theme.colors.text,
          '--text-secondary': theme.colors.textSecondary,
          '--divider-color': theme.colors.divider,
          '--success-color': theme.colors.success,
          '--warning-color': theme.colors.warning,
          '--error-color': theme.colors.error,
          '--font-scale': String(font.scale)
        }
        // 派发一个简单事件总线风格的通知（若有全局 eventBus 可切换）
        if (app.onThemeChangedCallbacks) {
          app.onThemeChangedCallbacks.forEach(cb => {
            try { cb(app.globalData.themeVars) } catch (e) {}
          })
        }
      }
      // 兜底持久化，便于页面初始化读取
      const vars = (app && app.globalData && app.globalData.themeVars) || {}
      wx.setStorageSync('theme_vars', {
        themeId: this.currentThemeId,
        fontSizeId: this.currentFontSizeId,
        vars
      })
    } catch (e) {
      console.warn('applyTheme failed:', e)
    }
  }

  reset() {
    this.currentThemeId = 'light'
    this.currentFontSizeId = 'normal'
    this.applyTheme()
    this._save()
  }

  _save() {
    try {
      wx.setStorageSync(storageKey, {
        themeId: this.currentThemeId,
        fontSizeId: this.currentFontSizeId
      })
    } catch (e) {}
  }

  _load() {
    try {
      return wx.getStorageSync(storageKey)
    } catch (e) {
      return null
    }
  }
}

module.exports = new ThemeService()