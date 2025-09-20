// services/accountProvider.js
// 统一账户提供器：集中加载 + 归一化 + 去重 + 排序，作为全局唯一可信账户源

function getDefaultAccounts() {
  return [
    { _id: '1', id: '1', name: '现金', type: 'cash', balance: 100000, icon: '💰' },
    { _id: '2', id: '2', name: '招商银行', type: 'bank', balance: 500000, icon: '🏦' },
    { _id: '3', id: '3', name: '支付宝', type: 'wallet', balance: 50000, icon: '📱' },
  ];
}

function normalizeAccount(a) {
  if (!a) return null;
  const id = a.id || a._id || '';
  const _id = a._id || a.id || '';
  const name = a.name || '';
  const type = a.type || 'cash';
  const balance = typeof a.balance === 'number' ? a.balance : Number(a.balance || 0);
  const icon = a.icon || '💰';
  return { ...a, id, _id, name, type, balance, icon };
}

function dedupeById(list) {
  const map = new Map();
  list.forEach(item => {
    if (!item) return;
    const key = String(item._id || item.id || item.name);
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
}

function sortAccounts(list) {
  // 简单排序：现金/钱包优先，其次按名称拼音/字典序
  const weight = (t) => (t === 'cash' ? 0 : t === 'wallet' ? 1 : 2);
  return [...list].sort((a, b) => {
    const w = weight(a.type) - weight(b.type);
    if (w !== 0) return w;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

function withDisplay(list) {
  return list.map(acc => ({
    ...acc,
    balanceDisplay: (acc.balance / 100).toFixed(2),
  }));
}

function getAvailableAccounts() {
  try {
    const stored = wx.getStorageSync('accounts') || [];
    const base = Array.isArray(stored) && stored.length ? stored : getDefaultAccounts();
    const normalized = base.map(normalizeAccount).filter(Boolean);
    const deduped = dedupeById(normalized);
    const sorted = sortAccounts(deduped);
    return withDisplay(sorted);
  } catch (e) {
    const fallback = withDisplay(sortAccounts(dedupeById(getDefaultAccounts().map(normalizeAccount))));
    return fallback;
  }
}

module.exports = {
  getAvailableAccounts,
  _normalizeAccount: normalizeAccount,
};