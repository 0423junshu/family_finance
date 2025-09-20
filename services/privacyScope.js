// services/privacyScope.js
// 页面级金额可见性覆盖：每个页面可独立持久化展示偏好；默认回退到全局 privacy
const privacy = require('./privacy');

function keyForRoute(route) {
  // 统一 key：privacy.pageVisible:/pages/xxx 或简化 'index'
  const r = (route || '').trim();
  const norm = r.startsWith('/') ? r : ('/pages/' + r + '/' + r);
  return `privacy.pageVisible:${norm}`;
}

/**
 * 读取页面覆盖值（仅该页存过时有；返回 boolean 或 null）
 */
function getPageVisible(route) {
  try {
    const k = keyForRoute(route);
    const v = wx.getStorageSync(k);
    if (typeof v === 'boolean') return v;
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * 设置页面覆盖值（写入持久化）
 */
function setPageVisible(route, visible) {
  try {
    const k = keyForRoute(route);
    wx.setStorageSync(k, !!visible);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 清除页面覆盖值（恢复为使用全局默认）
 */
function clearPageVisible(route) {
  try {
    const k = keyForRoute(route);
    wx.removeStorageSync(k);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 获取“有效”可见性：优先页面覆盖；否则使用全局默认
 */
function getEffectiveVisible(route) {
  const pageVal = getPageVisible(route);
  if (typeof pageVal === 'boolean') return pageVal;
  return privacy.getMoneyVisible();
}

module.exports = {
  getPageVisible,
  setPageVisible,
  clearPageVisible,
  getEffectiveVisible
};