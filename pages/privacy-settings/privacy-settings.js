// pages/privacy-settings/privacy-settings.js
const privacy = require('../../services/privacy')
const privacyScope = require('../../services/privacyScope')

Page({
  data: {
    moneyVisible: false,
    clearing: false
  },

  onLoad() {
    try {
      this.setData({ moneyVisible: !!privacy.getMoneyVisible() })
      this._unsub = privacy.subscribe((v) => {
        this.setData({ moneyVisible: !!v })
      })
    } catch (_) {}
  },

  onUnload() {
    if (this._unsub) {
      try { this._unsub() } catch (e) {}
      this._unsub = null
    }
  },

  onDefaultVisibleChange(e) {
    const next = !!(e && e.detail && e.detail.value)
    try {
      privacy.setMoneyVisible(next)
      wx.showToast({ title: next ? '已设为默认显示' : '已设为默认隐藏', icon: 'none' })
    } catch (_) {}
  },

  onClearOverrides() {
    // 二次确认 + 进度态 + 结果提示；清除后即时生效（privacyScope 内已实现刷新当前会话页面）
    wx.showModal({
      title: '确认清除？',
      content: '将移除所有页面的临时显隐设置，并使当前打开的页面立即恢复为默认值。',
      confirmText: '清除',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ clearing: true });
        try {
          const ok = privacyScope.clearAllOverrides && privacyScope.clearAllOverrides();
          wx.showToast({ title: ok ? '已清除覆盖并恢复默认' : '清除失败', icon: ok ? 'none' : 'error' });
        } catch (_) {
          wx.showToast({ title: '清除失败', icon: 'error' });
        } finally {
          this.setData({ clearing: false });
        }
      }
    });
  }
})