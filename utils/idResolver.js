// utils/idResolver.js
// 统一解析分类/账户/标签的 id 或名称，避免跨来源命名不一致导致的匹配失败
// 策略优先级：id/_id 全等 -> code/slug -> 名称全等 -> 别名映射 -> 宽松匹配

const ALIAS_MAP = {
  // 分类常见英文名称 -> 中文标准名（可按需扩展/覆盖）
  categories: {
    housing: '住房',
    dining: '餐饮',
    food: '餐饮',
    transport: '交通',
    transportation: '交通',
    shopping: '购物',
    entertainment: '娱乐',
    medical: '医疗',
    health: '医疗',
    education: '教育',
    telecom: '通讯',
    communication: '通讯',
    transfer: '转账',
    salary: '工资',
    bonus: '奖金',
    refund: '退款',
    investment: '投资收益',
  },
  // 账户常见英文名称 -> 中文标准名（仅示例，实际请按项目自定义）
  accounts: {
    // 通用简称
    cash: '现金',
    alipay: '支付宝',
    wechatpay: '微信钱包',
    wechat: '微信钱包',
    wallet: '钱包',
    bank: '银行',
    // 银行代码/别名
    cmb: '招商银行',          // 招商银行
    bank_cmb: '招商银行',
    icbc: '工商银行',         // 工商银行
    bank_icbc: '工商银行',
    abc: '农业银行',          // 农业银行
    bank_abc: '农业银行',
    ccb: '建设银行',          // 建设银行
    bank_ccb: '建设银行',
    boc: '中国银行',          // 中国银行
    bank_boc: '中国银行',
    psbc: '邮储银行',         // 邮政储蓄
    bank_psbc: '邮储银行',
    spdb: '浦发银行',
    bank_spdb: '浦发银行',
    cgb: '广发银行',
    bank_cgb: '广发银行',
    cecb: '中信银行',
    bank_cecb: '中信银行',
    // 常见“bank_”前缀
    bank_alipay: '支付宝',
    bank_wechat: '微信钱包',
    bank_cash: '现金'
  },
  // 标签别名示例（可自行扩展）
  tags: {
    essential: '必需品',
    fun: '娱乐',
    invest: '投资',
    gift: '礼品',
  },
};

// 归一化：转小写，去空格/下划线/破折号
function normalize(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, '');
}

// 宽松比较：完全相等或包含关系
function looseEqual(a, b) {
  const A = normalize(a);
  const B = normalize(b);
  if (!A || !B) return false;
  return A === B || A.includes(B) || B.includes(A);
}

function byIdOrName(list, input, kind = 'categories') {
  if (!Array.isArray(list) || !input) return undefined;

  // 允许 input 为对象或字符串
  const val = typeof input === 'object' ? (input.id || input._id || input.name || input.code || input.slug) : input;

  // 1) 精确 id/_id
  let hit = list.find(it => String(it.id) === String(val) || String(it._id) === String(val));
  if (hit) return hit;

  // 2) code/slug
  if (typeof val === 'string') {
    hit = list.find(it => (it.code && String(it.code) === val) || (it.slug && String(it.slug) === val));
    if (hit) return hit;
  }

  // 3) 名称全等
  hit = list.find(it => it.name && String(it.name) === String(val));
  if (hit) return hit;

  // 4) 别名映射（英文到中文）
  const aliasDict = ALIAS_MAP[kind] || {};
  const aliasTargetName = aliasDict[normalize(val)];
  if (aliasTargetName) {
    hit = list.find(it => it.name && normalize(it.name) === normalize(aliasTargetName));
    if (hit) return hit;
  }

  // 5) 宽松匹配（去空格/符号/大小写）
  hit = list.find(it =>
    looseEqual(it.id, val) ||
    looseEqual(it._id, val) ||
    looseEqual(it.name, val) ||
    looseEqual(it.code, val) ||
    looseEqual(it.slug, val)
  );

  return hit;
}

function resolveCategory(categories, categoryIdOrName) {
  return byIdOrName(categories, categoryIdOrName, 'categories');
}

function resolveAccount(accounts, accountIdOrName) {
  return byIdOrName(accounts, accountIdOrName, 'accounts');
}

function resolveTags(allTags, tagIdsOrNames) {
  if (!Array.isArray(allTags) || !tagIdsOrNames) return [];
  const arr = Array.isArray(tagIdsOrNames) ? tagIdsOrNames : [tagIdsOrNames];
  const result = [];
  arr.forEach(val => {
    const hit = byIdOrName(allTags, val, 'tags');
    if (hit && !result.find(t => (t._id || t.id) === (hit._id || hit.id))) {
      result.push(hit);
    }
  });
  return result;
}

module.exports = {
  resolveCategory,
  resolveAccount,
  resolveTags,
  _normalize: normalize, // for debug
};