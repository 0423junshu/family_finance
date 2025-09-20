// services/privacy.js
// 金额可见性全局管理（storage + 订阅发布），遵循 architecture.state_management
const STORAGE_KEY = 'privacy.moneyVisible';
const STORAGE_VER_KEY = 'privacy.version';
const CURRENT_VERSION = 1;

let listeners = [];
let state = {
  moneyVisible: false
};

// 版本迁移（预留）
function migrateIfNeeded() {
  try {
    const ver = wx.getStorageSync(STORAGE_VER_KEY);
    if (!ver) {
      // 首次写入版本，不更改现有值（若存在）
      const existing = wx.getStorageSync(STORAGE_KEY);
      if (typeof existing === 'boolean') {
        state.moneyVisible = existing;
      }
      wx.setStorageSync(STORAGE_VER_KEY, CURRENT_VERSION);
      return;
    }
    if (ver < CURRENT_VERSION) {
      // 未来版本迁移占位
      wx.setStorageSync(STORAGE_VER_KEY, CURRENT_VERSION);
    }
  } catch (e) {
    // ignore storage errors, keep defaults
  }
}

function load() {
  try {
    migrateIfNeeded();
    const v = wx.getStorageSync(STORAGE_KEY);
    if (typeof v === 'boolean') {
      state.moneyVisible = v;
    }
  } catch (e) {
    // ignore
  }
}

function persist() {
  try {
    wx.setStorageSync(STORAGE_KEY, state.moneyVisible);
    wx.setStorageSync(STORAGE_VER_KEY, CURRENT_VERSION);
  } catch (e) {
    // ignore
  }
}

function notify() {
  listeners.forEach((cb) => {
    try { cb(state.moneyVisible); } catch (e) {}
  });
}

function setMoneyVisible(visible) {
  if (state.moneyVisible === !!visible) return;
  state.moneyVisible = !!visible;
  persist();
  notify();
}

function toggleMoneyVisible() {
  setMoneyVisible(!state.moneyVisible);
}

function getMoneyVisible() {
  return state.moneyVisible;
}

function subscribe(cb) {
  if (typeof cb !== 'function') return () => {};
  listeners.push(cb);
  // 立即推送一次当前值，便于组件初始化
  try { cb(state.moneyVisible); } catch (e) {}
  return () => {
    listeners = listeners.filter((x) => x !== cb);
  };
}

// 初始化装载
load();

module.exports = {
  getMoneyVisible,
  setMoneyVisible,
  toggleMoneyVisible,
  subscribe,
  STORAGE_KEY,
  STORAGE_VER_KEY,
  CURRENT_VERSION
};