// services/privacyScope.js
// 页面级金额可见性覆盖：每个页面可独立持久化展示偏好；默认回退到全局 privacy
const privacy = require('./privacy');
const sessionOverrides = Object.create(null); // 会话级页面覆盖：不持久化，满足“重启按默认”

function keyForRoute(route) {
  // 统一 key：支持 '/pages/x/x'、'pages/x/x'、'x' 三种输入
  const r = String(route || '').trim();
  if (!r) return 'privacy.pageVisible:/pages/unknown/unknown';
  let path = r;
  if (r.startsWith('/pages/')) {
    path = r;
  } else if (r.startsWith('pages/')) {
    path = '/' + r;
  } else if (r.indexOf('/') >= 0) {
    // 已含路径分隔符，确保有前导斜杠
    path = r.startsWith('/') ? r : '/' + r;
  } else {
    // 简写页名，如 'investments'
    path = `/pages/${r}/${r}`;
  }
  return `privacy.pageVisible:${path}`;
}

/**
 * 读取页面覆盖值（仅该页存过时有；返回 boolean 或 null）
 */
function getPageVisible(route) {
  // 会话级读取：不再从 storage 取，确保重启后回到全局默认
  try {
    const k = keyForRoute(route);
    const v = sessionOverrides[k];
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
  // 会话级写入：不再写入 storage
  try {
    const k = keyForRoute(route);
    sessionOverrides[k] = !!visible;
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 清除页面覆盖值（恢复为使用全局默认）
 */
function clearPageVisible(route) {
  // 会话级清除：不再从 storage 清
  try {
    const k = keyForRoute(route);
    if (Object.prototype.hasOwnProperty.call(sessionOverrides, k)) {
      delete sessionOverrides[k];
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 清除所有页面的覆盖值（回落到全局默认）
 */
function clearAllOverrides() {
  try {
    // 向后兼容：清理历史持久化的覆盖键（旧版本可能写入过）
    try {
      const info = wx.getStorageInfoSync && wx.getStorageInfoSync();
      const keys = (info && info.keys) || [];
      const prefix = 'privacy.pageVisible:';
      keys.forEach(k => {
        if (typeof k === 'string' && k.indexOf(prefix) === 0) {
          try { wx.removeStorageSync(k); } catch (_) {}
        }
      });
    } catch (_) {}

    // 清理旧的会话级缓存（兼容历史）
    try {
      const app = getApp && getApp();
      if (app && app.globalData && app.globalData.pageVisibility) {
        app.globalData.pageVisibility = Object.create(null);
      }
    } catch (_) {}

    // 清理当前模块会话级覆盖
    try {
      Object.keys(sessionOverrides).forEach(k => { delete sessionOverrides[k]; });
    } catch (_) {}

    // 即时同步当前会话中已打开页面的显示状态到“全局默认”，让用户立刻看到效果
    try {
      const pages = (typeof getCurrentPages === 'function') ? getCurrentPages() : [];
      const defVisible = privacy.getMoneyVisible();
      if (pages && pages.length) {
        pages.forEach(p => {
          try {
            if (p && p.setData && p.data) {
              const update = {};
              if (Object.prototype.hasOwnProperty.call(p.data, 'pageMoneyVisible')) {
                update.pageMoneyVisible = defVisible;
              }
              if (Object.prototype.hasOwnProperty.call(p.data, 'hideAmount')) {
                update.hideAmount = !defVisible;
              }
              if (Object.keys(update).length) {
                p.setData(update);
              }
            }
          } catch (_) {}
        });
      }
    } catch (_) {}

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
  clearAllOverrides,
  getEffectiveVisible
};