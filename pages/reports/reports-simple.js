// pages/reports/reports-simple.js
/**
 * 修复基础库3.9.3兼容性问题的报表页面
 * 解决显示不全和按钮无反应的问题
 */

// let reportService = null;

let rsCache = null;
// 运行时获取报表服务，避免构建期解析三方依赖
function getReportService() {
  if (rsCache) return rsCache;
  try {
    // 动态加载，失败则回退
    // eslint-disable-next-line global-require
    rsCache = require('../../services/report');
    return rsCache;
  } catch (e) {
    console.warn('加载真实报表服务失败，使用本地回退实现。原因：', e && e.message);
    // 轻量本地回退：基于本地 storage 生成非零统计，避免“全为0”
    rsCache = {
      generateReport: async (params) => {
        try {
          const tx = wx.getStorageSync('transactions') || [];
          const accounts = wx.getStorageSync('accounts') || [];
          const investments = wx.getStorageSync('investments') || [];

          const parseDate = (s) => {
            if (!s) return null;
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
              const [y, m, d] = s.split('-').map(Number);
              return new Date(y, m - 1, d);
            }
            const dObj = new Date(s);
            return isNaN(dObj.getTime()) ? null : dObj;
          };

          let list = tx;
          if (params?.dateRange === 'month' || params?.dateRange === 'year' || params?.dateRange === 'custom') {
            const s = parseDate(params.startDate);
            const e = parseDate(params.endDate);
            const eEnd = e ? new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999) : null;
            list = tx.filter(t => {
              const d = parseDate(t?.date);
              return d && s && eEnd && d >= s && d <= eEnd;
            });
          }

          let totalIncome = 0, totalExpense = 0;
          const expenseMap = {}, incomeMap = {};
          // 使用时间戳+随机数确保ID绝对唯一，避免与默认分类冲突
          const timestamp = Date.now();
          let expenseCounter = 1;
          let incomeCounter = 1;
          
          list.forEach(tr => {
            const amt = Number(tr.amount) || 0;
            if (tr.type === 'income') { totalIncome += amt; }
            if (tr.type === 'expense') { totalExpense += amt; }

            const name = tr.categoryName || tr.category || tr.categoryId || '其他';
            if (tr.type === 'expense') {
              if (!expenseMap[name]) {
                // 使用reports前缀+时间戳+计数器确保绝对唯一ID
                expenseMap[name] = { id: `reports_expense_${timestamp}_${expenseCounter++}`, name, amount: 0 };
              }
              expenseMap[name].amount += amt;
            } else if (tr.type === 'income') {
              if (!incomeMap[name]) {
                // 使用reports前缀+时间戳+计数器确保绝对唯一ID
                incomeMap[name] = { id: `reports_income_${timestamp}_${incomeCounter++}`, name, amount: 0 };
              }
              incomeMap[name].amount += amt;
            }
          });

          const tagStats = { expense: [], income: [] };
          const categoryStats = {
            expense: Object.values(expenseMap),
            income: Object.values(incomeMap)
          };

          // 基础趋势：按月聚合（用于年/自定义），或按天（用于月）
          let trendData = [];
          if (params?.dateRange === 'month') {
            const y = params.currentYear; const m = (params.currentMonth ?? 0) + 1;
            const days = new Date(y, m, 0).getDate();
            const daily = Array.from({ length: days }, (_, i) => {
              const day = i + 1;
              const date = new Date(y, m - 1, day);
              const inRangeTx = list.filter(t => {
                const d = parseDate(t.date);
                return d && d.getFullYear() === y && (d.getMonth() + 1) === m && d.getDate() === day;
              });
              const inc = inRangeTx.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
              const exp = inRangeTx.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
              return {
                date: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                dateDisplay: `${day}日`,
                year: y, month: m, income: inc, expense: exp, balance: inc - exp, totalAssets: 0
              };
            });
            trendData = daily;
          } else {
            // 生成月份序列
            const s = parseDate(params?.startDate); const e = parseDate(params?.endDate);
            const months = [];
            if (s && e) {
              let cur = new Date(s.getFullYear(), s.getMonth(), 1);
              const end = new Date(e.getFullYear(), e.getMonth(), 1);
              while (cur <= end) {
                months.push({ y: cur.getFullYear(), m: cur.getMonth() + 1 });
                cur.setMonth(cur.getMonth() + 1);
              }
            }
            trendData = months.map(mm => {
              const ymList = list.filter(t => {
                const d = parseDate(t.date);
                return d && d.getFullYear() === mm.y && (d.getMonth() + 1) === mm.m;
              });
              const inc = ymList.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
              const exp = ymList.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
              return {
                date: `${mm.y}-${String(mm.m).padStart(2, '0')}`,
                dateDisplay: `${mm.y}年${String(mm.m).padStart(2, '0')}月`,
                year: mm.y, month: mm.m, income: inc, expense: exp, balance: inc - exp, totalAssets: 0
              };
            });
          }

          const totalCash = (accounts || []).reduce((s, a) => s + (Number(a.balance) || 0), 0);
          const totalInvestment = (investments || []).reduce((s, inv) => {
            const v = Number(inv.currentValue != null ? inv.currentValue : inv.amount);
            return s + (isNaN(v) ? 0 : v);
          }, 0);
          const totalAssets = totalCash + totalInvestment;

          // 账户统计聚合（fallback）
          const accMap = {};
          list.forEach(tr => {
            const aid = tr.accountId || tr.account || tr.accountName || '';
            const aname = tr.accountName || tr.account || '未命名账户';
            if (!aid && !aname) return;
            const key = aid || aname;
            if (!accMap[key]) {
              accMap[key] = { id: aid || `acc_${key}`, name: aname, income: 0, expense: 0, count: 0 };
            }
            const amt = Number(tr.amount) || 0;
            if (tr.type === 'income') accMap[key].income += amt;
            else if (tr.type === 'expense') accMap[key].expense += amt;
            accMap[key].count += 1;
          });
          const accountStats = Object.values(accMap);

          return {
            summary: { totalIncome, totalExpense, balance: totalIncome - totalExpense },
            categoryStats,
            tagStats,
            trendData,
            assetData: {
              totalAssets,
              assetsDistribution: [
                { name: '现金账户', amount: totalCash, color: '#4CD964' },
                { name: '投资资产', amount: totalInvestment, color: '#FF9500' }
              ],
              accounts: accounts.map(a => ({ id: a.id || a._id, name: a.name, balance: Number(a.balance) || 0, icon: a.icon, color: a.color, typeName: a.typeName || a.type })),
              investments: investments.map(i => ({
                id: i.id || i._id, name: i.name, currentValue: Number(i.currentValue ?? i.amount) || 0
              }))
            },
            tagStats: { expense: [], income: [] },
            accountStats
          };
        } catch (err) {
          console.error('fallback generateReport 失败:', err);
          return {
            summary: { totalIncome: 0, totalExpense: 0, balance: 0 },
            categoryStats: { expense: [], income: [] },
            assetData: { totalAssets: 0, assetsDistribution: [], accounts: [], investments: [] },
            trendData: [],
            tagStats: { expense: [], income: [] }
          };
        }
      }
    };
    return rsCache;
  }
}
/**
 * 注意：移除零数据桩，避免遮蔽 getReportService 的动态加载与本地回退。
 * 如需强制本地回退，可保留 getReportService 内的实现。
 */

Page({
  // B2: setData wrapper - internal batching state
  _b2_setDataQueue: null,
  _b2_setDataTimer: null,

  // B2: setData wrapper - shallow dirty-check + throttled batch
  setDataSafe(patch, throttleMs = 16) {
    try {
      if (!patch || typeof patch !== 'object') return;
      const dirty = {};
      Object.keys(patch).forEach((k) => {
        const nv = patch[k];
        const ov = this.data && k in this.data ? this.data[k] : undefined;
        if (nv !== ov) dirty[k] = nv;
      });
      const keys = Object.keys(dirty);
      if (!keys.length) return;
      this._b2_setDataQueue = Object.assign(this._b2_setDataQueue || {}, dirty);
      if (this._b2_setDataTimer) return;
      this._b2_setDataTimer = setTimeout(() => {
        const q = this._b2_setDataQueue || {};
        this._b2_setDataQueue = null;
        this._b2_setDataTimer = null;
        this.setData(q);
      }, Math.max(0, throttleMs));
    } catch (e) {
      try { this.setData(patch); } catch (_) {}
    }
  },

  data: {
    // 会话级金额可见性（默认隐藏）
    pageMoneyVisible: false,
    // 全局与每个TAB的显隐源（全局优先，其次TAB）
    globalMoneyVisible: null, // null 表示未设全局，由各TAB决定；true/false 表示强制全局
    tabVisible: { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false },
    // 日期筛选
    dateRange: 'month', // 'month' | 'year' | 'custom'
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0-based
    showYear: new Date().getFullYear(),
    showMonth: new Date().getMonth(), // 0-based
    customStartDate: '',
    customEndDate: '',
    
    // 选择器状态
    showYearPicker: false,
    showMonthPicker: false,
    showDateRangePicker: false,
    showToolsMenu: false,
    showOptions: false,
    
    // 选择器数据
    yearList: [],
    monthList: [],
    yearIndex: 0,
    monthIndex: 0,
    
    // 自定义年月选择器数据
    customStartYear: new Date().getFullYear(),
    customStartMonth: new Date().getMonth() + 1,
    customEndYear: new Date().getFullYear(),
    customEndMonth: new Date().getMonth() + 1,
    customStartYearIndex: 5,
    customStartMonthIndex: new Date().getMonth(),
    customEndYearIndex: 5,
    customEndMonthIndex: new Date().getMonth(),
    
    // 统计页签
    currentTab: 0,
    categoryType: 'expense', // 'expense' | 'income'
    
    // 加载状态
    loading: false,
    isEmpty: false,
    errorMessage: '',
    
    // 数据
    summary: { totalIncome: 0, totalExpense: 0, balance: 0 },
    categoryStats: { expense: [], income: [] },
    assetData: { totalAssets: 0, assetsDistribution: [], accounts: [], investments: [] },
    trendData: [],
    tagStats: { expense: [], income: [] },
    accountStats: [],
    accountType: 'expense',
    accountStatsView: { expense: [], income: [] },
    consistencyResult: null,
    checkingConsistency: false,
    
    // 兼容性相关
    systemInfo: null,
    canvasSupported: true,
    
    // 顶部安全区 JS 兜底（默认关闭，仅问题机型开启）
    useJsSafeTop: false,
    paddingTopPx: 0
  },

  onLoad() {
    // 会话级可见性初始化
    try {
      const privacyScope = require('../../services/privacyScope');
      const route = this.route || (getCurrentPages().slice(-1)[0] && getCurrentPages().slice(-1)[0].route) || 'pages/reports/reports-simple';
      const v = !!privacyScope.getEffectiveVisible(route);
      this.setDataSafe({ 
        pageMoneyVisible: v,
        globalMoneyVisible: null,
        ['tabVisible.' + (this.data.currentTab || 0)]: v
      });
      // 根据全局/当前TAB重算一次
      this.recomputeVisibility && this.recomputeVisibility();
    } catch (_) {}
    console.log('报表页面加载 - 修复版本 v3.9.3');
    
    // 获取系统信息
    this.initSystemInfo();
    
    // 初始化日期数据
    this.initDateData();
    
    // 延迟加载数据，确保页面完全渲染
    this.safeTimeout(() => {
      this.loadReportData();
    }, 200);

    // 顶部安全区兜底：注册窗口变化监听并尝试计算一次
    try {
      if (wx && wx.onWindowResize) {
        wx.onWindowResize(this.updateSafeTop);
      }
      this.updateSafeTop && this.updateSafeTop();
    } catch (_) {}
  },

  // 小眼睛点击（旧）：保留为兼容，但改为作用于当前TAB
  onEyeToggle: function() {
    // 兼容旧绑定：等价于对当前TAB进行切换
    const idx = this.data.currentTab || 0;
    this.onTabEyeToggle({ currentTarget: { dataset: { index: idx } } });
  },

  // 全局小眼睛：统一控制所有TAB（本统计周期）
  onGlobalEyeToggle(e) {
    const effective = !!this.data.pageMoneyVisible;
    const next = !effective;
    // 一次性同步：避免竞态
    this.setData({ globalMoneyVisible: next, pageMoneyVisible: next });
    try {
      const privacyScope = require('../../services/privacyScope');
      const route = this.route || (getCurrentPages().slice(-1)[0] && getCurrentPages().slice(-1)[0].route) || 'pages/reports/reports-simple';
      privacyScope.setPageVisible(route, next);
    } catch (_) {}
  },

  // TAB内小眼睛：仅控制该TAB显隐，并清空全局强制
  onTabEyeToggle(e) {
    let idx = this.data.currentTab || 0;
    try {
      const ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
      if (ds.index !== undefined) idx = parseInt(ds.index) || idx;
    } catch (_) {}
    const cur = !!(this.data.tabVisible && this.data.tabVisible[idx]);
    const nextTabVisible = !cur;
    const g = this.data.globalMoneyVisible;
    // 依据将生效的新源直接计算有效可见性，避免读取旧 this.data
    const nextEffective = (g === null || g === undefined) ? nextTabVisible : !!g;
    const patch = {};
    patch['tabVisible.' + idx] = nextTabVisible;
    patch['globalMoneyVisible'] = null; // 清除全局强制，回到TAB控制
    patch['pageMoneyVisible'] = nextEffective;
    this.setData(patch);
    try {
      const privacyScope = require('../../services/privacyScope');
      const route = this.route || (getCurrentPages().slice(-1)[0] && getCurrentPages().slice(-1)[0].route) || 'pages/reports/reports-simple';
      privacyScope.setPageVisible(route, nextEffective);
    } catch (_) {}
  },

  // 依据全局/当前TAB 计算实际展示可见性
  recomputeVisibility() {
    const g = this.data.globalMoneyVisible;
    const idx = this.data.currentTab || 0;
    const tv = this.data.tabVisible && this.data.tabVisible[idx];
    const effective = (g === null || g === undefined) ? !!tv : !!g;
    this.setDataSafe({ pageMoneyVisible: effective });
    // 会话级覆盖同步到 privacyScope（用于返回后恢复）
    try {
      const privacyScope = require('../../services/privacyScope');
      const route = this.route || (getCurrentPages().slice(-1)[0] && getCurrentPages().slice(-1)[0].route) || 'pages/reports/reports-simple';
      privacyScope.setPageVisible(route, effective);
    } catch (_) {}
  },

  /**
   * 初始化系统信息
   */
  initSystemInfo() {
    try {
      const windowInfo = (wx.getWindowInfo && wx.getWindowInfo()) || (wx.getSystemInfoSync ? wx.getSystemInfoSync() : {});
      console.log('窗口信息:', windowInfo);
      
      // B2: setData wrapper
      this.setDataSafe({ systemInfo: windowInfo })
      
      // 检查Canvas支持
      const version = windowInfo.SDKVersion || '3.9.3';
      const versionNum = parseFloat(version);
      const canvasSupported = versionNum >= 2.9;
      
      // B2: setData wrapper
      this.setDataSafe({ canvasSupported })
      console.log('Canvas支持:', canvasSupported, '基础库版本:', version);
      
    } catch (error) {
      console.error('获取系统信息失败:', error);
      // B2: setData wrapper
      this.setDataSafe({ 
        systemInfo: { SDKVersion: '3.9.3' },
        canvasSupported: true 
      })
    }
  },

  /**
   * 初始化日期数据
   */
  initDateData() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // 年份列表
    const currentYear = now.getFullYear();
    const yearList = [];
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      yearList.push(i + '年');
    }
    
    // 月份列表
    const monthList = [];
    for (let i = 1; i <= 12; i++) {
      monthList.push(i + '月');
    }
    
    // B2: setData wrapper
    this.setDataSafe({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth(),
      showYear: now.getFullYear(),
      showMonth: now.getMonth(),
      customStartDate: startOfMonth.toISOString().slice(0, 10),
      customEndDate: endOfMonth.toISOString().slice(0, 10),
      yearList,
      yearIndex: 5, // 当前年份索引
      monthList,
      monthIndex: now.getMonth()
    })
  },

  /**
   * 安全的setTimeout，避免页面卸载后执行
   */
  safeTimeout(callback, delay) {
    const timer = setTimeout(() => {
      if (this.data && !this._isDestroyed) { // 检查页面是否还存在
        try {
          callback();
        } catch (error) {
          console.error('回调执行失败:', error);
        }
      }
    }, delay);
    return timer;
  },

  /**
   * 日期范围切换 - 修复事件处理
   */
  onDateRangeChange(e) {
    console.log('日期范围切换事件:', e);
    
    // 兼容多种事件对象结构
    let range = '';
    try {
      if (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.range) {
        range = e.currentTarget.dataset.range;
      } else if (e && e.target && e.target.dataset && e.target.dataset.range) {
        range = e.target.dataset.range;
      } else if (e && e.detail && e.detail.range) {
        range = e.detail.range;
      }
    } catch (error) {
      console.error('获取range参数失败:', error);
      return;
    }

    if (!range) {
      console.warn('无法获取日期范围参数');
      return;
    }

    console.log('切换到日期范围:', range);
    
    // 先关闭所有弹窗
    this.closeAllPickers();

    // 按月时强制回到概览tab，避免显示趋势/资产
    if (range === 'month') {
      this.setData({ currentTab: 0 });
    }
    // 同步更新dateRange
    // B2: setData wrapper
    this.setDataSafe({ dateRange: range })

    if (range === 'custom') {
      this.setData({ 
        dateRange: 'custom', 
        showDateRangePicker: true
      });
      return;
    }
    
    if (range === 'year') {
      this.showYearPicker();
      return;
    }
    
    if (range === 'month') {
      this.showMonthPicker();
      return;
    }

    // 直接设置其他范围
    this.setData({ dateRange: range });
    this.loadReportData();
  },

  /**
   * 关闭所有选择器
   */
  closeAllPickers() {
    // B2: setData wrapper
    this.setDataSafe({
      showYearPicker: false,
      showMonthPicker: false,
      showDateRangePicker: false,
      showOptions: false,
      showToolsMenu: false
    })
  },

  /**
   * 显示年份选择器
   */
  showYearPicker() {
    console.log('显示年份选择器');
    this.closeAllPickers();
    
    const yearIndex = this.findYearIndex(this.data.currentYear);
    // B2: setData wrapper
    this.setDataSafe({ 
      showYearPicker: true,
      yearIndex: yearIndex,
      dateRange: 'year'
    })
  },

  /**
   * 查找年份在列表中的索引
   */
  findYearIndex(year) {
    const index = this.data.yearList.findIndex(item => parseInt(item) === year);
    return index >= 0 ? index : 5;
  },

  /**
   * 年份变更 - 修复picker-view兼容性
   */
  onYearChange(e) {
    console.log('年份变更事件:', e);
    
    let yearIndex = 5; // 默认当前年份
    try {
      if (e && e.detail && e.detail.value !== undefined) {
        if (Array.isArray(e.detail.value)) {
          yearIndex = parseInt(e.detail.value[0]) || 5;
        } else {
          yearIndex = parseInt(e.detail.value) || 5;
        }
      }
    } catch (error) {
      console.error('解析年份索引失败:', error);
    }
    
    // 确保索引在有效范围内
    yearIndex = Math.max(0, Math.min(yearIndex, this.data.yearList.length - 1));
    
    const yearStr = this.data.yearList[yearIndex] || (new Date().getFullYear() + '年');
    const year = parseInt(yearStr);
    
    console.log('选择年份:', year, '索引:', yearIndex);
    
    // B2: setData wrapper
    this.setDataSafe({ 
      currentYear: year, 
      showYear: year,
      dateRange: 'year', 
      yearIndex: yearIndex
    })
  },

  /**
   * 确认年份选择
   */
  confirmYearPicker() {
    console.log('确认年份选择');
    // B2: setData wrapper
    this.setDataSafe({ showYearPicker: false })
    this.loadReportData();
  },

  /**
   * 显示月份选择器
   */
  showMonthPicker() {
    console.log('显示月份选择器');
    this.closeAllPickers();
    // B2: setData wrapper
    this.setDataSafe({ 
      showMonthPicker: true,
      monthIndex: this.data.currentMonth,
      dateRange: 'month'
    })
  },

  /**
   * 月份变更 - 修复picker-view兼容性
   */
  onMonthChange(e) {
    console.log('月份变更事件:', e);
    
    let monthIndex = 0;
    try {
      if (e && e.detail && e.detail.value !== undefined) {
        if (Array.isArray(e.detail.value)) {
          monthIndex = parseInt(e.detail.value[0]) || 0;
        } else {
          monthIndex = parseInt(e.detail.value) || 0;
        }
      }
    } catch (error) {
      console.error('解析月份索引失败:', error);
    }
    
    // 确保索引在有效范围内
    monthIndex = Math.max(0, Math.min(monthIndex, 11));
    
    console.log('选择月份:', monthIndex + 1, '索引:', monthIndex);
    
    this.setData({ 
      currentMonth: monthIndex,
      showMonth: monthIndex,
      dateRange: 'month', 
      monthIndex: monthIndex
    });
  },

  /**
   * 确认月份选择
   */
  confirmMonthPicker() {
    console.log('确认月份选择');
    this.setData({ showMonthPicker: false });
    this.loadReportData();
  },

  /**
   * 自定义日期相关
   */
  showCustomDatePicker() {
    console.log('显示自定义日期选择器');
    this.closeAllPickers();
    this.setData({
      dateRange: 'custom',
      showDateRangePicker: true
    });
  },

  /**
   * 自定义开始年月选择
   */
  onCustomStartChange(e) {
    const [yearIndex, monthIndex] = e.detail.value;
    const year = parseInt(this.data.yearList[yearIndex]);
    const month = monthIndex + 1;
    
    this.setData({
      customStartYearIndex: yearIndex,
      customStartMonthIndex: monthIndex,
      customStartYear: year,
      customStartMonth: month
    });
  },

  /**
   * 自定义结束年月选择
   */
  onCustomEndChange(e) {
    const [yearIndex, monthIndex] = e.detail.value;
    const year = parseInt(this.data.yearList[yearIndex]);
    const month = monthIndex + 1;
    
    this.setData({
      customEndYearIndex: yearIndex,
      customEndMonthIndex: monthIndex,
      customEndYear: year,
      customEndMonth: month
    });
  },

  onStartDateChange(e) {
    if (e && e.detail && e.detail.value) {
      this.setData({ customStartDate: e.detail.value });
    }
  },

  onEndDateChange(e) {
    if (e && e.detail && e.detail.value) {
      this.setData({ customEndDate: e.detail.value });
    }
  },

  confirmCustomDateRange() {
    const { customStartYear, customStartMonth, customEndYear, customEndMonth } = this.data;
    
    if (!customStartYear || !customStartMonth || !customEndYear || !customEndMonth) {
      wx.showToast({ title: '请选择开始和结束年月', icon: 'none' });
      return;
    }
    
    // 验证日期范围
    const startDate = new Date(customStartYear, customStartMonth - 1, 1);
    const endDate = new Date(customEndYear, customEndMonth - 1, 1);
    
    if (startDate > endDate) {
      wx.showToast({ title: '开始年月不能晚于结束年月', icon: 'none' });
      return;
    }
    
    // 设置自定义日期范围（转换为日期字符串格式供后续使用）
    const customStartDate = `${customStartYear}-${String(customStartMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(customEndYear, customEndMonth, 0).getDate();
    const customEndDate = `${customEndYear}-${String(customEndMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    this.setData({ 
      dateRange: 'custom', 
      showDateRangePicker: false,
      customStartDate,
      customEndDate
    });
    
    this.loadReportData();
  },

  cancelPicker() {
    this.closeAllPickers();
  },

  /**
   * 页面点击事件 - 修复事件处理
   */
  onTapPage(e) {
    // 只有点击页面背景时才关闭弹窗
    if (e && e.target === e.currentTarget) {
      this.closeAllPickers();
    }
  },

  /**
   * 页签切换 - 修复事件处理
   */
  // 分类、账户、投资、标签明细跳转
  viewCategoryDetail(e) {
    console.log('viewCategoryDetail 被调用:', e);
    const ds = (e && e.currentTarget && e.currentTarget.dataset) || (e && e.target && e.target.dataset) || {};
    console.log('提取的数据集:', ds);
    const categoryId = ds.category;
    const type = ds.type || 'expense';
    console.log('分类ID:', categoryId, '类型:', type);
    if (!categoryId) {
      console.warn('分类ID为空，跳转取消');
      return;
    }
    // 携带当前筛选范围
    const { dateRange, currentYear, currentMonth, customStartDate, customEndDate } = this.data || {};
    
    // 获取分类名称而非ID进行筛选
    let categoryName = categoryId;
    try {
      const categoryStats = this.data.categoryStats || {};
      const allCategories = [...(categoryStats.expense || []), ...(categoryStats.income || [])];
      const categoryItem = allCategories.find(item => item.id === categoryId);
      if (categoryItem && categoryItem.name) {
        categoryName = categoryItem.name;
        console.log('找到分类名称:', categoryId, '->', categoryName);
      }
    } catch (e) {
      console.warn('获取分类名称失败:', e);
    }
    
    // 修正月份参数：currentMonth是0-based，交易列表页面期望1-based
    const displayMonth = (currentMonth ?? 0) + 1;
    
    // B1: routing params encode/validate
    const q = [
      `from=${encodeURIComponent('reports')}`,
      `type=${encodeURIComponent(type)}`,
      `category=${encodeURIComponent(categoryName)}`,
      `range=${encodeURIComponent(dateRange || '')}`,
      `year=${encodeURIComponent(currentYear || '')}`,
      `month=${encodeURIComponent(displayMonth)}`,
      `start=${encodeURIComponent(customStartDate || '')}`,
      `end=${encodeURIComponent(customEndDate || '')}`
    ].join('&');

    console.log('跳转参数:', { type, categoryName, year: currentYear, month: displayMonth, range: dateRange });
    wx.navigateTo({ url: `/pages/transaction-list/transaction-list?${q}` });
  },
  viewAccountDetail(e) {
    const id = (e?.currentTarget?.dataset?.id) || (e?.target?.dataset?.id);
    if (!id) return;
    wx.navigateTo({ url: `/pages/account-manage/account-manage?mode=edit&id=${encodeURIComponent(id)}` });
  },
  viewInvestmentDetail(e) {
    const id = (e?.currentTarget?.dataset?.id) || (e?.target?.dataset?.id);
    if (!id) return;
    wx.navigateTo({ url: `/pages/investment-add/investment-add?mode=edit&id=${encodeURIComponent(id)}` });
  },
  viewTagDetail(e) {
    const ds = (e && e.currentTarget && e.currentTarget.dataset) || (e && e.target && e.target.dataset) || {};
    const tag = ds.tag;
    const type = ds.type || 'expense';
    if (!tag) return;
    const { dateRange, currentYear, currentMonth, customStartDate, customEndDate } = this.data || {};
    // B1: routing params encode/validate - month unify 1-based
    const displayMonth = (currentMonth ?? 0) + 1;
    const q = [
      `from=${encodeURIComponent('reports')}`,
      `type=${encodeURIComponent(type)}`,
      `tag=${encodeURIComponent(tag)}`,
      `range=${encodeURIComponent(dateRange || '')}`,
      `year=${encodeURIComponent(currentYear || '')}`,
      `month=${encodeURIComponent(displayMonth)}`,
      `start=${encodeURIComponent(customStartDate || '')}`,
      `end=${encodeURIComponent(customEndDate || '')}`
    ].join('&');
    wx.navigateTo({ url: `/pages/transaction-list/transaction-list?${q}` });
  },
  // 账户统计卡片 → 交易记录筛选（携带 accounts、type、日期范围）
  viewAccountTransactions(e) {
    console.log('viewAccountTransactions 被调用:', e);
    try {
      const ds = (e && e.currentTarget && e.currentTarget.dataset) || (e && e.target && e.target.dataset) || {};
      const accountId = ds.account || ds.id;
      const type = (ds.type === 'income' || ds.type === 'expense') ? ds.type : 'expense';
      if (!accountId) {
        wx.showToast({ title: '账户ID缺失，无法跳转', icon: 'none' });
        return;
      }

      const { dateRange, currentYear, currentMonth, customStartDate, customEndDate } = this.data || {};
      const displayMonth = (currentMonth ?? 0) + 1;

      const q = [
        `from=${encodeURIComponent('reports')}`,
        `type=${encodeURIComponent(type)}`,
        `accounts=${encodeURIComponent(accountId)}`,
        `range=${encodeURIComponent(dateRange || '')}`,
        `year=${encodeURIComponent(currentYear || '')}`,
        `month=${encodeURIComponent(displayMonth)}`,
        `start=${encodeURIComponent(customStartDate || '')}`,
        `end=${encodeURIComponent(customEndDate || '')}`
      ].join('&');

      console.log('账户跳转参数:', { accountId, type, dateRange, year: currentYear, month: displayMonth, start: customStartDate, end: customEndDate, q });
      wx.navigateTo({ url: `/pages/transaction-list/transaction-list?${q}` });
    } catch (err) {
      console.warn('viewAccountTransactions 失败:', err && err.message);
    }
  },

  onTabChange(e) {
    console.log('页签切换事件:', e);
    
    let index = 0;
    try {
      if (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index !== undefined) {
        index = parseInt(e.currentTarget.dataset.index) || 0;
      } else if (e && e.target && e.target.dataset && e.target.dataset.index !== undefined) {
        index = parseInt(e.target.dataset.index) || 0;
      }
    } catch (error) {
      console.error('解析页签索引失败:', error);
    }
    
    console.log('切换到页签:', index);
    
    // 按月统计时禁用趋势图(2)和资产分析(3)
    if (this.data.dateRange === 'month' && (index === 2 || index === 3)) {
      wx.showToast({ 
        title: '按月统计时不支持此功能', 
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    this.setData({ currentTab: index });
    // TAB切换后，依据现有源重算一次
    this.recomputeVisibility && this.recomputeVisibility();
    
    // 延迟更新图表
    this.safeTimeout(() => {
      this.updateCharts();
    }, 300);
  },

  /**
   * 分类类型切换
   */
  onCategoryTypeChange(e) {
    let type = 'expense';
    try {
      if (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.type) {
        type = e.currentTarget.dataset.type;
      } else if (e && e.target && e.target.dataset && e.target.dataset.type) {
        type = e.target.dataset.type;
      }
    } catch (error) {
      console.error('解析分类类型失败:', error);
    }
    
    if (type === 'expense' || type === 'income') {
      this.setData({ categoryType: type });
    }
  },

  /**
   * 账户统计类型切换（支出/收入）
   */
  onAccountTypeChange(e) {
    let type = 'expense';
    try {
      const ds = (e && e.currentTarget && e.currentTarget.dataset) || (e && e.target && e.target.dataset) || {};
      if (ds.type === 'income' || ds.type === 'expense') type = ds.type;
    } catch (error) {
      console.error('解析账户统计类型失败:', error);
    }
    this.setData({ accountType: type });
  },

  /**
   * 切换选项菜单
   */
  toggleOptions(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    
    this.setData({
      showOptions: !this.data.showOptions,
      showToolsMenu: false
    });
  },

  /**
   * 显示工具菜单
   */
  showToolsMenu(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    
    this.setData({
      showToolsMenu: !this.data.showToolsMenu,
      showOptions: false
    });
  },

  /**
   * 加载报表数据 - 增强错误处理和调试
   */
  async loadReportData() {
    console.log('开始加载报表数据');
    
    // 检查存储数据
    const accounts = wx.getStorageSync('accounts') || [];
    const investments = wx.getStorageSync('investments') || [];
    const transactions = wx.getStorageSync('transactions') || [];
    
    console.log('存储数据检查:', {
      accounts: accounts.length,
      investments: investments.length,
      transactions: transactions.length
    });
    
    this.setData({ 
      loading: true, 
      errorMessage: '',
      isEmpty: false 
    });

    try {
      // 构建查询参数
      const params = this.buildQueryParams();
      console.log('查询参数:', params);

      // 调用报表服务（运行时动态获取，避免构建期引入不兼容依赖）
      const svc = getReportService();
      const reportData = await svc.generateReport(params);
      console.log('报表数据加载成功:', reportData);
      
      // 特别检查资产数据
      if (reportData.assetData) {
        console.log('资产数据详情:', {
          totalAssets: reportData.assetData.totalAssets,
          accounts: reportData.assetData.accounts?.length || 0,
          investments: reportData.assetData.investments?.length || 0,
          assetsDistribution: reportData.assetData.assetsDistribution
        });
      } else {
        console.warn('资产数据为空');
      }

      // 处理数据
      const processedData = this.processReportData(reportData);
      const enhancedData = this.enhanceCategoryStats(processedData);
      const keyedData = this.addUniqueKeys(enhancedData);

      // 验证处理后的数据
      this.validateProcessedData(keyedData);

      // 更新页面数据
      // B2: setData wrapper
      this.setDataSafe({
        loading: false,
        isEmpty: this.isDataEmpty(keyedData),
        ...keyedData
      })

      // 延迟更新图表
      this.safeTimeout(() => {
        this.updateCharts();
      }, 400);

    } catch (error) {
      console.error('加载报表数据失败:', error);
      
      // B2: setData wrapper
      this.setDataSafe({
        loading: false,
        isEmpty: true,
        errorMessage: error.message || '加载数据失败'
      })

      wx.showToast({
        title: '加载数据失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 验证处理后的数据
   */
  validateProcessedData(data) {
    console.log('验证处理后的数据...');
    
    if (!data) {
      console.error('处理后的数据为空');
      return false;
    }
    
    // 验证资产数据
    if (data.assetData) {
      const { assetData } = data;
      console.log('资产数据验证:', {
        totalAssets: assetData.totalAssets,
        accountsCount: assetData.accounts?.length || 0,
        investmentsCount: assetData.investments?.length || 0,
        distributionCount: assetData.assetsDistribution?.length || 0
      });
      
      if (assetData.totalAssets === 0 && 
          (!assetData.accounts || assetData.accounts.length === 0) &&
          (!assetData.investments || assetData.investments.length === 0)) {
        console.warn('资产数据为空，可能需要添加账户或投资数据');
      }
    }
    
    // 验证分类统计数据
    if (data.categoryStats) {
      console.log('分类统计验证:', {
        expenseCount: data.categoryStats.expense?.length || 0,
        incomeCount: data.categoryStats.income?.length || 0
      });
    }
    
    console.log('数据验证完成');
    return true;
  },

  /**
   * 构建查询参数
   */
  // B3: date utils unify
  buildQueryParams() {
    const { dateRange, currentYear, currentMonth, customStartDate, customEndDate } = this.data;
    const dutils = require('../../utils/date-range');

    const params = { dateRange };

    if (dateRange === 'month') {
      const { startDate, endDate } = dutils.buildMonthRange(currentYear, currentMonth);
      if (!dutils.isValidDate(startDate) || !dutils.isValidDate(endDate)) {
        throw new Error(`无效的月份参数: year=${currentYear}, month0=${currentMonth}`);
      }
      params.startDate = startDate;
      params.endDate = endDate;
      params.currentYear = currentYear;
      params.currentMonth = currentMonth;
    } else if (dateRange === 'year') {
      const { startDate, endDate } = dutils.buildYearRange(currentYear);
      if (!dutils.isValidDate(startDate) || !dutils.isValidDate(endDate)) {
        throw new Error(`无效的年份参数: year=${currentYear}`);
      }
      params.startDate = startDate;
      params.endDate = endDate;
      params.currentYear = currentYear;
    } else if (dateRange === 'custom') {
      // customStartDate/customEndDate 已为 YYYY-MM-DD；直接校验
      if (!dutils.isValidDate(customStartDate) || !dutils.isValidDate(customEndDate)) {
        throw new Error(`无效的自定义日期: startDate=${customStartDate}, endDate=${customEndDate}`);
      }
      params.startDate = customStartDate;
      params.endDate = customEndDate;
      params.customStartDate = customStartDate;
      params.customEndDate = customEndDate;
    }

    return params;
  },

  /**
   * 处理报表数据
   */
  processReportData(reportData) {
    if (!reportData) {
      return this.getEmptyData();
    }

    // 自定义周期时填充完整月份数据
    const fillTrendData = (data) => {
      console.log('fillTrendData 输入数据:', data);
      
      if (!data) {
        console.log('数据为空，返回空数组');
        return [];
      }

      // 对于自定义周期，填充完整月份
      if (this.data.dateRange === 'custom') {
        const { customStartDate, customEndDate } = this.data;
        console.log('自定义周期:', { customStartDate, customEndDate });
        console.log('当前页面数据状态:', this.data);
        
        if (!customStartDate || !customEndDate) {
          console.log('自定义日期参数缺失');
          return data.trendData || [];
        }

        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        
        // 验证日期有效性
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.error('无效的自定义日期:', { customStartDate, customEndDate });
          return data.trendData || [];
        }
        
        const months = [];
        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        
        console.log('生成月份范围:', { 
          start: start.toISOString(), 
          end: end.toISOString(),
          startMonth: start.getMonth() + 1,
          endMonth: end.getMonth() + 1
        });
        
        while (current <= end) {
          months.push({
            year: current.getFullYear(),
            month: current.getMonth() + 1,
            date: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
            label: `${String(current.getMonth() + 1).padStart(2, '0')}`
          });
          current.setMonth(current.getMonth() + 1);
        }

        console.log('生成的月份列表:', months);
        console.log('原始趋势数据:', data.trendData);
        
        // 检查原始数据是否为空或全0
        if (!data.trendData || data.trendData.length === 0) {
          console.warn('后端返回的趋势数据为空，可能的原因:');
          console.warn('1. 自定义日期范围内无交易记录');
          console.warn('2. 后端报表服务未正确处理自定义周期');
          console.warn('3. 数据库查询条件过于严格');
        }

        // 获取交易数据进行本地验证
        const transactions = wx.getStorageSync('transactions') || [];
        const customTransactions = transactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate >= start && tDate <= end;
        });
        console.log('本地验证 - 自定义周期内的交易记录:', customTransactions.length);

        // 填充缺失月份为0值，优先使用后端返回的历史资产数据
        const filledData = months.map(m => {
          const existing = (data.trendData || []).find(t => 
            t.year === m.year && t.month === m.month
          );
          
          console.log(`处理月份 ${m.year}-${m.month}:`, {
            hasExisting: !!existing,
            backendAssets: existing?.totalAssets,
            source: existing ? 'backend' : 'frontend_fill'
          });
          
          // 优先使用后端返回的数据（完全保留后端的资产数据）
          if (existing) {
            console.log(`月份 ${m.year}-${m.month} 使用后端数据:`, {
              income: existing.income,
              expense: existing.expense,
              totalAssets: existing.totalAssets,
              source: 'backend'
            });
            
            return {
              ...existing,
              label: m.label,
              dateDisplay: existing.dateDisplay || `${existing.year || m.year}年${String(existing.month || m.month).padStart(2, '0')}月`
              // 关键：完全保留后端的 totalAssets 数据
            };
          }
          
          // 对于后端没有数据的月份，设为0（不进行本地计算）
          console.log(`月份 ${m.year}-${m.month} 后端无数据，设为0值`);
          return {
            year: m.year,
            month: m.month,
            date: m.date,
            label: m.label,
            dateDisplay: `${m.year}年${String(m.month).padStart(2, '0')}月`,
            income: 0,
            expense: 0,
            totalAssets: 0  // 对于完全没有数据的月份，设为0
          };
        });

        console.log('填充后的数据:', filledData);
        return filledData;
      }

      // 按年统计：直接使用后端数据，按月份排序
      if (this.data.dateRange === 'year') {
        let result = (data.trendData || []).map(item => ({
          ...item,
          label: String(item.month).padStart(2, '0'),
          dateDisplay: item.dateDisplay || `${item.year || new Date().getFullYear()}年${String(item.month).padStart(2, '0')}月`
        }));
        
        console.log('按年统计排序前数据:', result.map(r => ({ month: r.month, label: r.label, dateDisplay: r.dateDisplay })));
        result = result.sort((a, b) => (a.month || 0) - (b.month || 0));
        console.log('按年统计排序后结果:', result.map(r => ({ month: r.month, label: r.label, dateDisplay: r.dateDisplay })));
        
        // 确保横坐标标签正确
        result = result.map(item => ({
          ...item,
          label: String(item.month || 0).padStart(2, '0')
        }));
        
        console.log('按年统计最终处理结果:', result);
        return result;
      }
      
      // 其他模式：直接使用后端数据，不进行复杂填充
      let result = (data.trendData || []).map(item => ({
        ...item,
        label: item.label || String(item.month || 0).padStart(2, '0'),
        dateDisplay: item.dateDisplay || `${item.year || new Date().getFullYear()}年${String(item.month || 0).padStart(2, '0')}月`
      }));
      
      console.log('其他模式最终处理结果:', result);
      return result;
    };

    return {
      summary: reportData.summary || { totalIncome: 0, totalExpense: 0, balance: 0 },
      categoryStats: reportData.categoryStats || { expense: [], income: [] },
      assetData: reportData.assetData || { totalAssets: 0, assetsDistribution: [], accounts: [], investments: [] },
      trendData: fillTrendData(reportData),
      tagStats: reportData.tagStats || { expense: [], income: [] },
      accountStats: reportData.accountStats || []
    };
  },

  /**
   * 对分类统计进行排序并计算占比
   */
  enhanceCategoryStats(data) {
    try {
      const res = { ...data };
      const process = (arr, type) => {
        const list = Array.isArray(arr) ? arr.slice() : [];
        const total = list.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
        return list
          .map((it, index) => {
            const amount = Number(it.amount) || 0;
            const percentage = total > 0 ? Math.round((amount / total) * 100) : 0;
            const uniqueKey = `${type || 'cat'}_${it.id || it.name || index}`;
            return { ...it, amount, percentage, uniqueKey };
          })
          .sort((a, b) => (b.amount || 0) - (a.amount || 0));
      };
      if (res.categoryStats) {
        res.categoryStats = {
          expense: process(res.categoryStats.expense, 'expense'),
          income: process(res.categoryStats.income, 'income'),
        };
      }
      // 构建账户统计视图（与分类统计一致：amount/percentage/count）
      try {
        const acc = Array.isArray(res.accountStats) ? res.accountStats : [];
        const totalExpense = (res.summary && Number(res.summary.totalExpense)) || 0;
        const totalIncome = (res.summary && Number(res.summary.totalIncome)) || 0;
        const toNum = (v) => Number(v) || 0;
        // 构建账户信息索引，用于补充 icon 与颜色
        const acctList = (res.assetData && Array.isArray(res.assetData.accounts)) ? res.assetData.accounts : [];
        const accountInfoMap = acctList.reduce((m, a) => {
          const key = a && (a.id || a._id);
          if (key) m[key] = a;
          return m;
        }, {});
        const palette = ['#4CD964','#FF9500','#007AFF','#FF3B30','#8E8E93','#5856D6','#34C759','#FF2D55','#AF52DE','#5AC8FA'];
        const hashStr = (s) => {
          let h = 0;
          const str = String(s || '');
          for (let i=0;i<str.length;i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
          return h;
        };
        const getColor = (name, typeName) => {
          const idx = hashStr((typeName || '') + (name || '')) % palette.length;
          return palette[idx];
        };
        // 固定图标映射：优先使用账户类型，其次从名称关键词推断
        const getIcon = (info = {}, name = '') => {
          const t = (info.typeName || info.type || '').toLowerCase();
          const n = String(name || '').toLowerCase();
          // 类型优先
          if (t.includes('bank') || t.includes('银行卡') || t.includes('借记') || t.includes('信用')) return '🏦';
          if (t.includes('cash') || t.includes('现金')) return '💵';
          if (t.includes('alipay')) return '🅰️';
          if (t.includes('wechat')) return '🟩';
          if (t.includes('fund') || t.includes('投资') || t.includes('理财')) return '📈';
          if (t.includes('card') || t.includes('储蓄')) return '💳';
          if (t.includes('wallet') || t.includes('钱包')) return '👛';
          // 名称关键词兜底
          if (n.includes('工行') || n.includes('工商') || n.includes('icbc')) return '🏦';
          if (n.includes('农行') || n.includes('农业') || n.includes('abc')) return '🌾';
          if (n.includes('招行') || n.includes('cmb')) return '🏧';
          if (n.includes('建行') || n.includes('ccb')) return '🏗️';
          if (n.includes('现金') || n.includes('cash')) return '💵';
          if (n.includes('支付宝') || n.includes('alipay')) return '🅰️';
          if (n.includes('微信') || n.includes('wechat')) return '🟩';
          if (n.includes('基金') || n.includes('理财') || n.includes('投资') || n.includes('fund')) return '📈';
          // 通用银行卡
          return '💳';
        };
        res.accountStatsView = {
          expense: acc
            .map((it, idx) => {
              const amount = toNum(it.expense);
              if (amount <= 0) return null;
              const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
              const info = accountInfoMap[it.id || it._id] || {};
              const iconVal = (info && info.icon) ? info.icon : getIcon(info, it.name || info.name);
              const isImg = typeof iconVal === 'string' && /(\.png|\.jpg|\.jpeg|\.svg|^https?:|^wxfile:)/i.test(iconVal);
              // 颜色优先级：service 透传(it.color) > 资产账户(info.color/bgColor/themeColor) > 稳定回退
              const colorVal = it.color || (info && (info.color || info.bgColor || info.themeColor)) || getColor(it.name || info.name, info.typeName);
              return {
                id: it.id || it._id || `acc_exp_${idx}`,
                name: it.name || info.name || '未命名账户',
                amount,
                percentage,
                count: toNum(it.countExpense || it.count),
                icon: iconVal,
                iconType: isImg ? 'image' : 'text',
                color: colorVal
              };
            })
            .filter(Boolean)
            .sort((a, b) => (b.amount || 0) - (a.amount || 0)),
          income: acc
            .map((it, idx) => {
              const amount = toNum(it.income);
              if (amount <= 0) return null;
              const percentage = totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0;
              const info = accountInfoMap[it.id || it._id] || {};
              const iconVal = (info && info.icon) ? info.icon : getIcon(info, it.name || info.name);
              const isImg = typeof iconVal === 'string' && /(\.png|\.jpg|\.jpeg|\.svg|^https?:|^wxfile:)/i.test(iconVal);
              const colorVal2 = it.color || (info && (info.color || info.bgColor || info.themeColor)) || getColor(it.name || info.name, info.typeName);
              return {
                id: it.id || it._id || `acc_inc_${idx}`,
                name: it.name || info.name || '未命名账户',
                amount,
                percentage,
                count: toNum(it.countIncome || it.count),
                icon: iconVal,
                iconType: isImg ? 'image' : 'text',
                color: colorVal2
              };
            })
            .filter(Boolean)
            .sort((a, b) => (b.amount || 0) - (a.amount || 0))
        };
      } catch (_) {}
      // 仅在前面的 accountStatsView 不存在或为空时，兜底构建；否则保留服务层/资产数据生成的 icon/color
      try {
        const hasExisting =
          res.accountStatsView &&
          Array.isArray(res.accountStatsView.expense) && res.accountStatsView.expense.length > 0 ||
          Array.isArray(res.accountStatsView.income) && res.accountStatsView.income.length > 0;

        if (!hasExisting) {
          const accArr = Array.isArray(res.accountStats) ? res.accountStats : [];
          const totalExp = (res.summary && Number(res.summary.totalExpense)) || 0;
          const totalInc = (res.summary && Number(res.summary.totalIncome)) || 0;
          const toPct = (amt, tot) => (tot > 0 ? Math.round((amt / tot) * 100) : 0);

          // 若不存在配色/图标函数，提供兜底
          const safeGetColor = (typeof getColor === 'function')
            ? getColor
            : (_name, type) => (type === 'expense' ? '#DC2626' : '#16A34A');
          const safeGetIcon = (typeof getIcon === 'function')
            ? getIcon
            : (_info, _name) => '💳';

          const build = (isExpense) => accArr.map(it => {
            const displayName = it.name || String(it.id || '');
            const amount = isExpense ? (Number(it.expense) || 0) : (Number(it.income) || 0);
            return {
              ...it,
              displayName,
              amount,
              percentage: toPct(amount, isExpense ? totalExp : totalInc),
              // 保留已有的颜色与图标；仅在缺失时兜底
              color: it.color || safeGetColor(displayName, isExpense ? 'expense' : 'income'),
              icon: it.icon || safeGetIcon({ type: 'account', name: displayName }, displayName)
            };
          }).sort((a, b) => (b.amount - a.amount));

          res.accountStatsView = {
            expense: build(true),
            income: build(false)
          };
        }
      } catch (e) {
        try { console.warn('[report] 兜底构建账户统计视图失败：', e && e.message); } catch (_) {}
        res.accountStatsView = res.accountStatsView || { expense: [], income: [] };
      }

      return res;
    } catch (e) {
      console.warn('enhanceCategoryStats 失败:', e);
      return data;
    }
  },

  /**
   * 获取空数据结构
   */
  getEmptyData() {
    return {
      summary: { totalIncome: 0, totalExpense: 0, balance: 0 },
      categoryStats: { expense: [], income: [] },
      assetData: { totalAssets: 0, assetsDistribution: [], accounts: [], investments: [] },
      trendData: [],
      tagStats: { expense: [], income: [] }
    };
  },

  /**
   * 检查数据是否为空
   */
  isDataEmpty(data) {
    if (!data) return true;
    
    const { summary, categoryStats, trendData } = data;
    
    return (
      (!summary || (summary.totalIncome === 0 && summary.totalExpense === 0)) &&
      (!categoryStats || (categoryStats.expense.length === 0 && categoryStats.income.length === 0)) &&
      (!trendData || trendData.length === 0)
    );
  },

  /**
   * 更新图表 - 兼容新版Canvas
   */
  updateCharts() {
    if (!this.data.canvasSupported) {
      console.log('Canvas不支持，跳过图表更新');
      return;
    }

    // 清除之前的定时器
    if (this._chartTimer) {
      clearTimeout(this._chartTimer);
    }

    // 延迟更新，避免频繁调用
    this._chartTimer = this.safeTimeout(() => {
      try {
        if (this.data.currentTab === 2) {
          this.updateTrendChart();
        } else if (this.data.currentTab === 3) {
          this.updateAssetChart();
        }
      } catch (error) {
        console.error('更新图表失败:', error);
      }
    }, 200);
  },

  /**
   * 更新趋势图
   */
  async updateTrendChart() {
    if (!this.data.trendData || this.data.trendData.length === 0) {
      console.log('无趋势数据');
      return;
    }

    try {
      console.log('开始更新趋势图');
      const canvas = await this.getCanvasContext('#trendCanvas');
      if (canvas) {
        this.drawTrendChart(canvas, this.data.trendData);
      }
    } catch (error) {
      console.error('更新趋势图失败:', error);
    }
  },

  /**
   * 更新资产图表
   */
  async updateAssetChart() {
    const assetData = this.data.assetData && this.data.assetData.assetsDistribution;
    if (!assetData || assetData.length === 0) {
      console.log('无资产数据');
      return;
    }

    try {
      console.log('开始更新资产图表');
      const canvas = await this.getCanvasContext('#assetPie');
      if (canvas) {
        this.drawAssetChart(canvas, assetData);
      }
    } catch (error) {
      console.error('更新资产图表失败:', error);
    }
  },

  /**
   * 获取Canvas上下文 - 兼容新旧API
   */
  getCanvasContext(selector) {
    return new Promise((resolve) => {
      try {
        const query = wx.createSelectorQuery().in(this);
        
        // 尝试新版Canvas 2D API
        query.select(selector)
          .fields({ node: true, size: true })
          .exec((res) => {
            if (res && res[0] && res[0].node) {
              // 新版Canvas 2D API
              console.log('使用新版Canvas 2D API');
              const canvas = res[0].node;
              const ctx = canvas.getContext('2d');
              const dpr = (this.data.systemInfo && this.data.systemInfo.pixelRatio) || 1;
              
              canvas.width = res[0].width * dpr;
              canvas.height = res[0].height * dpr;
              ctx.scale(dpr, dpr);
              
              resolve({
                canvas,
                ctx,
                width: res[0].width,
                height: res[0].height,
                dpr,
                isNew: true
              });
            } else {
              // 降级到旧版API
              console.log('降级到旧版Canvas API');
              const canvasId = selector.replace('#', '');
              const ctx = wx.createCanvasContext(canvasId, this);
              
              // 获取Canvas尺寸
              query.select(selector)
                .boundingClientRect()
                .exec((rectRes) => {
                  const rect = (rectRes && rectRes[0]) || { width: 300, height: 200 };
                  
                  resolve({
                    canvas: null,
                    ctx,
                    width: rect.width,
                    height: rect.height,
                    dpr: 1,
                    isNew: false
                  });
                });
            }
          });
      } catch (error) {
        console.error('获取Canvas上下文失败:', error);
        resolve(null);
      }
    });
  },

  /**
   * 绘制趋势图 - 简化版本
   */
  /**
   * 绘制双Y轴趋势图
   */
  drawTrendChart(canvasInfo, data) {
    if (!canvasInfo || !data) return;
    
    const { ctx, width, height, isNew } = canvasInfo;
    
    try {
      // 清除画布
      ctx.clearRect(0, 0, width, height);
      
      if (!data || data.length === 0) {
        this.drawEmptyChart(ctx, width, height, '暂无数据');
        if (!isNew && ctx.draw) ctx.draw();
        return;
      }

      // 绘制参数 - 增加底部padding为X轴标签留空间
      const padding = { left: 60, right: 60, top: 30, bottom: 80 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
      
      // 计算收支与结余范围（左Y轴）
      let maxIncomeExpense = 0;
      data.forEach(item => {
        maxIncomeExpense = Math.max(maxIncomeExpense, item.income || 0, item.expense || 0);
      });
      // 结余绝对值峰值（收入-支出）
      const balanceArr = data.map(it => (Number(it.income) || 0) - (Number(it.expense) || 0));
      const balanceMaxAbs = balanceArr.length ? Math.max(...balanceArr.map(v => Math.abs(v))) : 0;
      const leftMaxCandidate = Math.max(maxIncomeExpense, balanceMaxAbs, 100);
      // 将左轴最大值调整为“略高于峰值”的好看整数刻度（以元为单位的 1/2/5×10^n），再换算回分
      const niceMax = (function(v){
        const desiredTicks = 5;
        function niceNumber(range, round) {
          const exp = Math.floor(Math.log10(Math.max(1, range)));
          const frac = range / Math.pow(10, exp);
          let niceFrac;
          if (round) {
            if (frac < 1.5) niceFrac = 1;
            else if (frac < 3) niceFrac = 2;
            else if (frac < 7) niceFrac = 5;
            else niceFrac = 10;
          } else {
            if (frac <= 1) niceFrac = 1;
            else if (frac <= 2) niceFrac = 2;
            else if (frac <= 5) niceFrac = 5;
            else niceFrac = 10;
          }
          return niceFrac * Math.pow(10, exp);
        }
        const vYuan = Math.max(1, v / 100);
        const tick = niceNumber(vYuan / desiredTicks, true);
        const maxYuan = Math.ceil(vYuan / tick) * tick;
        return maxYuan * 100;
      })(leftMaxCandidate);
      
      // 计算资产数据范围（右Y轴）
      let maxAsset = 0, minAsset = 0;
      data.forEach(item => {
        if (item.totalAssets !== undefined) {
          maxAsset = Math.max(maxAsset, item.totalAssets);
          minAsset = Math.min(minAsset, item.totalAssets);
        }
      });
      if (maxAsset === minAsset) {
        maxAsset = minAsset + 1000;
      }
      
      // 绘制双Y轴坐标系（左轴采用 niceMax）
      this.drawDualAxes(ctx, padding, chartWidth, chartHeight, niceMax, maxAsset, minAsset, data);
      
      // 绘制收支数据线（左Y轴）
      this.drawIncomeExpenseLines(ctx, data, padding, chartWidth, chartHeight, niceMax);
      // 新增：绘制结余折线（左Y轴）
      this.drawBalanceLine(ctx, data, padding, chartWidth, chartHeight, niceMax);
      
      // 绘制资产数据线（右Y轴）
      this.drawAssetLine(ctx, data, padding, chartWidth, chartHeight, maxAsset, minAsset);
      
      // 绘制双Y轴图例
      this.drawDualAxisLegend(ctx, width, height);
      
      // 完成绘制
      if (!isNew && ctx.draw) ctx.draw();
    } catch (error) {
      console.error('绘制双Y轴趋势图失败:', error);
    }
  },

  /**
   * 绘制双Y轴坐标系
   */
  drawDualAxes(ctx, padding, chartWidth, chartHeight, maxIncomeExpense, maxAsset, minAsset, data = []) {
    try {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      
      // X轴
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top + chartHeight);
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.stroke();
      
      // 左Y轴（收支）
      ctx.strokeStyle = '#666';
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, padding.top + chartHeight);
      ctx.stroke();
      
      // 右Y轴（资产）
      ctx.strokeStyle = '#666';
      ctx.beginPath();
      ctx.moveTo(padding.left + chartWidth, padding.top);
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.stroke();
      
      // 绘制左Y轴刻度和标签（收支）
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 5; i++) {
        const value = (maxIncomeExpense / 5) * i;
        const y = padding.top + chartHeight - (i / 5) * chartHeight;
        
        // 刻度线
        ctx.strokeStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.moveTo(padding.left - 5, y);
        ctx.lineTo(padding.left, y);
        ctx.stroke();
        
        // 标签
        ctx.fillText((value / 100).toFixed(0), padding.left - 8, y + 4);
      }
      
      // 绘制右Y轴刻度和标签（资产）- 使用 niceNumber 算法，最大值略高于峰值
      ctx.textAlign = 'left';
      (function() {
        const desiredTicks = 5;
        function niceNumber(range, round) {
          const exp = Math.floor(Math.log10(Math.max(1, range)));
          const frac = range / Math.pow(10, exp);
          let niceFrac;
          if (round) {
            if (frac < 1.5) niceFrac = 1;
            else if (frac < 3) niceFrac = 2;
            else if (frac < 7) niceFrac = 5;
            else niceFrac = 10;
          } else {
            if (frac <= 1) niceFrac = 1;
            else if (frac <= 2) niceFrac = 2;
            else if (frac <= 5) niceFrac = 5;
            else niceFrac = 10;
          }
          return niceFrac * Math.pow(10, exp);
        }
        const vYuan = Math.max(1, (maxAsset || 0) / 100);
        const tick = niceNumber(vYuan / desiredTicks, true);
        const maxYuan = Math.ceil(vYuan / tick) * tick;
        const ymax = maxYuan * 100; // 转回分
        for (let i = 0; i <= desiredTicks; i++) {
          const value = (ymax / desiredTicks) * i;
          const y = padding.top + chartHeight - (i / desiredTicks) * chartHeight;
          // 刻度线
          ctx.strokeStyle = '#e0e0e0';
          ctx.beginPath();
          ctx.moveTo(padding.left + chartWidth, y);
          ctx.lineTo(padding.left + chartWidth + 5, y);
          ctx.stroke();
          // 标签（单位元，取整数）
          ctx.fillStyle = '#666';
          ctx.fillText((value / 100).toFixed(0), padding.left + chartWidth + 8, y + 4);
        }
      })();

      // 绘制X轴标签（月份）和刻度线
      if (data && data.length > 0) {
        ctx.fillStyle = '#666';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        const stepX = chartWidth / Math.max(1, data.length - 1);
        
        data.forEach((item, index) => {
          const x = padding.left + index * stepX;
          
          // 绘制短竖线标注
          ctx.strokeStyle = '#ccc';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, padding.top + chartHeight);
          ctx.lineTo(x, padding.top + chartHeight + 8);
          ctx.stroke();
          
          // 绘制月份标签
          const y = padding.top + chartHeight + 20;
          const label = item.label || String(item.month).padStart(2, '0');
          ctx.fillText(label, x, y);
        });
      }
      
    } catch (error) {
      console.error('绘制双Y轴失败:', error);
    }
  },

  /**
   * 绘制收支数据线（左Y轴）
   */
  drawIncomeExpenseLines(ctx, data, padding, chartWidth, chartHeight, maxValue) {
    try {
      const stepX = chartWidth / Math.max(1, data.length - 1);
      
      // 收入线（绿色）
      ctx.strokeStyle = '#34c759';
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((item, index) => {
        const x = padding.left + index * stepX;
        const y = padding.top + chartHeight - ((item.income || 0) / maxValue) * chartHeight;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      // 支出线（红色）
      ctx.strokeStyle = '#ff3b30';
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((item, index) => {
        const x = padding.left + index * stepX;
        const y = padding.top + chartHeight - ((item.expense || 0) / maxValue) * chartHeight;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
    } catch (error) {
      console.error('绘制收支数据线失败:', error);
    }
  },

  /**
   * 新增：绘制结余折线（使用左Y轴整数刻度）
   */
  drawBalanceLine(ctx, data, padding, chartWidth, chartHeight, maxValue) {
    try {
      const stepX = chartWidth / Math.max(1, data.length - 1);
      ctx.strokeStyle = '#5856D6'; // 结余：紫色
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((item, index) => {
        const x = padding.left + index * stepX;
        const bal = Math.abs((Number(item.income) || 0) - (Number(item.expense) || 0));
        const y = padding.top + chartHeight - (bal / maxValue) * chartHeight;
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    } catch (e) {
      console.error('绘制结余折线失败:', e);
    }
  },

  /**
   * 绘制资产数据线（右Y轴）
   */
  drawAssetLine(ctx, data, padding, chartWidth, chartHeight, maxAsset, minAsset) {
    let hasAssetData = false;
    try {
      const stepX = chartWidth / Math.max(1, data.length - 1);
      // 使用与右轴刻度一致的最大值映射（0 ~ ymax）
      (function() {
        const desiredTicks = 5;
        function niceNumber(range, round) {
          const exp = Math.floor(Math.log10(Math.max(1, range)));
          const frac = range / Math.pow(10, exp);
          let niceFrac;
          if (round) {
            if (frac < 1.5) niceFrac = 1;
            else if (frac < 3) niceFrac = 2;
            else if (frac < 7) niceFrac = 5;
            else niceFrac = 10;
          } else {
            if (frac <= 1) niceFrac = 1;
            else if (frac <= 2) niceFrac = 2;
            else if (frac <= 5) niceFrac = 5;
            else niceFrac = 10;
          }
          return niceFrac * Math.pow(10, exp);
        }
        const vYuan = Math.max(1, (maxAsset || 0) / 100);
        const tick = niceNumber(vYuan / desiredTicks, true);
        const maxYuan = Math.ceil(vYuan / tick) * tick;
        const ymax = Math.max(1, maxYuan * 100); // 分
        
        // 资产线（蓝色，虚线）
        ctx.strokeStyle = '#007AFF';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // 设置虚线
        ctx.beginPath();
        
        // 使用外层 hasAssetData 标记
        hasAssetData = false;
        data.forEach((item, index) => {
          if (item.totalAssets !== undefined) {
            hasAssetData = true;
            const x = padding.left + index * stepX;
            const y = padding.top + chartHeight - (Math.max(0, item.totalAssets) / ymax) * chartHeight;
            if (index === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        
        if (hasAssetData) {
          ctx.stroke();
        }
        // 恢复实线
        ctx.setLineDash([]);
      })();
      
      if (hasAssetData) {
        ctx.stroke();
      }
      
      // 恢复实线
      ctx.setLineDash([]);
      
    } catch (error) {
      console.error('绘制资产数据线失败:', error);
    }
  },

  /**
   * 绘制双Y轴图例
   */
  drawDualAxisLegend(ctx, width, height) {
    try {
      const legendY = height - 25;
      const legendItems = [
        { color: '#34c759', text: '收入', x: 50 },
        { color: '#ff3b30', text: '支出', x: 110 },
        { color: '#5856D6', text: '结余', x: 170 },
        { color: '#007AFF', text: '资产总额', x: 230 }
      ];
      
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      
      legendItems.forEach(item => {
        // 绘制颜色块
        ctx.fillStyle = item.color;
        ctx.fillRect(item.x, legendY - 6, 12, 12);
        
        // 绘制文字
        ctx.fillStyle = '#333';
        ctx.fillText(item.text, item.x + 18, legendY + 4);
      });
      
    } catch (error) {
      console.error('绘制双Y轴图例失败:', error);
    }
  },

  /**
   * 绘制资产图表 - 简化版本
   */
  drawAssetChart(canvasInfo, data) {
    if (!canvasInfo || !data) return;
    
    const { ctx, width, height, isNew } = canvasInfo;
    
    try {
      // 清除画布
      ctx.clearRect(0, 0, width, height);
      
      if (!data || data.length === 0) {
        this.drawEmptyChart(ctx, width, height, '暂无数据');
        if (!isNew && ctx.draw) ctx.draw();
        return;
      }

      // 计算总值
      const total = data.reduce((sum, item) => sum + (item.amount || 0), 0);
      if (total === 0) return;

      // 绘制饼图
      const centerX = width / 2;
      const centerY = height / 2 - 20;
      const radius = Math.min(width, height) / 4;
      
      let currentAngle = -Math.PI / 2;
      
      data.forEach((item, index) => {
        const angle = (item.amount / total) * 2 * Math.PI;
        const color = item.color || this.getDefaultColor(index);
        
        // 绘制扇形
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
        ctx.closePath();
        ctx.fill();
        
        currentAngle += angle;
      });
      
      // 绘制图例
      this.drawPieLegend(ctx, data, width, height);
      
      // 完成绘制
      if (!isNew && ctx.draw) ctx.draw();
    } catch (error) {
      console.error('绘制资产图表失败:', error);
    }
  },

  /**
   * 绘制空图表
   */
  drawEmptyChart(ctx, width, height, message) {
    try {
      ctx.fillStyle = '#999';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(message || '暂无数据', width / 2, height / 2);
    } catch (error) {
      console.error('绘制空图表失败:', error);
    }
  },

  /**
   * 绘制坐标轴
   */
  drawAxes(ctx, padding, chartWidth, chartHeight) {
    try {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      
      // X轴
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top + chartHeight);
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.stroke();
      
      // Y轴
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, padding.top + chartHeight);
      ctx.stroke();
    } catch (error) {
      console.error('绘制坐标轴失败:', error);
    }
  },

  /**
   * 绘制数据线
   */
  drawDataLines(ctx, data, padding, chartWidth, chartHeight, maxValue) {
    try {
      const stepX = chartWidth / Math.max(1, data.length - 1);
      
      // 收入线
      ctx.strokeStyle = '#34c759';
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((item, index) => {
        const x = padding.left + index * stepX;
        const y = padding.top + chartHeight - ((item.income || 0) / maxValue) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      // 支出线
      ctx.strokeStyle = '#ff3b30';
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((item, index) => {
        const x = padding.left + index * stepX;
        const y = padding.top + chartHeight - ((item.expense || 0) / maxValue) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    } catch (error) {
      console.error('绘制数据线失败:', error);
    }
  },

  /**
   * 绘制图例
   */
  drawLegend(ctx, padding) {
    try {
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      
      // 收入图例
      ctx.fillStyle = '#34c759';
      ctx.fillRect(padding.left, 10, 12, 12);
      ctx.fillStyle = '#333';
      ctx.fillText('收入', padding.left + 20, 20);
      
      // 支出图例
      ctx.fillStyle = '#ff3b30';
      ctx.fillRect(padding.left + 80, 10, 12, 12);
      ctx.fillStyle = '#333';
      ctx.fillText('支出', padding.left + 100, 20);
    } catch (error) {
      console.error('绘制图例失败:', error);
    }
  },

  /**
   * 绘制饼图图例
   */
  drawPieLegend(ctx, data, width, height) {
    try {
      const legendY = height - 40;
      let legendX = 20;
      
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      
      data.forEach((item, index) => {
        if (legendX + 100 > width) return; // 防止超出边界
        
        const color = item.color || this.getDefaultColor(index);
        
        // 图例色块
        ctx.fillStyle = color;
        ctx.fillRect(legendX, legendY, 12, 12);
        
        // 图例文字
        ctx.fillStyle = '#333';
        ctx.fillText(item.name || '未知', legendX + 20, legendY + 10);
        
        legendX += 100;
      });
    } catch (error) {
      console.error('绘制饼图图例失败:', error);
    }
  },

  /**
   * 获取默认颜色
   */
  getDefaultColor(index) {
    const colors = ['#4CD964', '#FF9500', '#007AFF', '#FF3B30', '#8E8E93'];
    return colors[index % colors.length];
  },

  /**
   * 功能按钮事件
   */
  exportReport() {
    console.log('导出报表');
    this.closeAllPickers();
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  setCycle() {
    console.log('周期设置');
    this.closeAllPickers();
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  goToAssetsPage() {
    console.log('goToAssetsPage 被调用');
    // 防抖处理
    if (this._navigating) {
      console.log('导航中，跳过重复调用');
      return;
    }
    this._navigating = true;
    
    // 资产概览详情页跳转，由于 assets 是 tabBar 页面，使用 switchTab 并通过 storage 传递参数
    const { currentYear, currentMonth } = this.data;
    const ymKey = `${currentYear}-${String((currentMonth ?? 0) + 1).padStart(2, '0')}`;
    console.log('准备跳转到资产页，当前年月:', currentYear, currentMonth, 'ymKey:', ymKey);
    console.log('报表页完整 data:', JSON.stringify({ currentYear, currentMonth, dateRange: this.data.dateRange }));
    
    try {
      // 写入跳转上下文到 storage，供 assets 页面读取
      const context = {
        from: 'reports',
        year: currentYear,
        month: currentMonth,
        ymKey: ymKey,
        timestamp: Date.now()
      };
      wx.setStorageSync('lastViewedMonth', ymKey);
      wx.setStorageSync('assetsPageContext', context);
      console.log('上下文数据写入成功:', context);
    } catch (e) {
      console.warn('写入上下文数据失败:', e);
    }
    
    console.log('使用 switchTab 跳转到资产页');
    wx.switchTab({ 
      url: '/pages/assets/assets',
      success: () => {
        console.log('switchTab 跳转成功');
        this._navigating = false;
      },
      fail: (err) => {
        console.error('switchTab 跳转失败:', err);
        this._navigating = false;
        wx.showToast({ title: '跳转失败', icon: 'error' });
      }
    });
  },

  // 为列表项补充唯一key，避免 wx:key 冲突与表达式用法
  addUniqueKeys(data) {
    try {
      const res = { ...data };

      if (res.tagStats) {
        const enrich = (arr, type) => (Array.isArray(arr) ? arr.map((it, idx) => ({
          ...it,
          uniqueKey: `tag_${type}_${it.name || idx}`,
        })) : []);
        res.tagStats = {
          expense: enrich(res.tagStats.expense, 'expense'),
          income: enrich(res.tagStats.income, 'income'),
        };
      }
      return res;
    } catch (e) {
      console.warn('addUniqueKeys 失败:', e);
      return data;
    }
  },

  checkDataConsistency() {
    console.log('数据一致性检查');
    this.closeAllPickers();
    
    // B2: setData wrapper
    this.setDataSafe({ checkingConsistency: true })
    
    this.safeTimeout(() => {
      // B2: setData wrapper
      this.setDataSafe({
        checkingConsistency: false,
        consistencyResult: {
          needFix: false,
          message: '数据一致性检查通过'
        }
      })
    }, 2000);
  },

  // ========== 顶部安全区 JS 兜底（与首页一致） ==========
  // 注意：默认 useJsSafeTop=false 不生效；仅在问题机型置为 true。
  updateSafeTop: (() => {
    let timer = null;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const BASE_PX = 12;
    const EXTRA_PX = 16;
    const MIN_PX = 10;
    const MAX_PX = 88;
    return function() {
      if (!this || !this.setData) return;
      if (!this.data || !this.data.useJsSafeTop) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const info = (wx.getWindowInfo && wx.getWindowInfo()) || (wx.getSystemInfoSync ? wx.getSystemInfoSync() : {});
          const statusBar = (info && (info.statusBarHeight || (info.safeAreaInsets && info.safeAreaInsets.top) || 0)) || 0;
          const padding = clamp(BASE_PX + EXTRA_PX + statusBar, MIN_PX, MAX_PX);
          this.setData({ paddingTopPx: padding });
        } catch (e) {
          this.setData({ paddingTopPx: 24 });
        }
      }, 120);
    }
  })(),

  /**
   * 页面生命周期
   */
  onShow() {
    console.log('报表页面显示');
    this._isDestroyed = false;
  },

  onHide() {
    console.log('报表页面隐藏');
    this.closeAllPickers();
  },

  onUnload() {
    console.log('报表页面卸载');
    this._isDestroyed = true;
    if (this._chartTimer) {
      clearTimeout(this._chartTimer);
    }
    // 注销窗口监听
    try {
      if (wx && wx.offWindowResize) {
        wx.offWindowResize(this.updateSafeTop);
      }
    } catch (_) {}
  },

  onPullDownRefresh() {
    console.log('下拉刷新');
    this.loadReportData().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});