 // pages/transaction-list/transaction-list.js
const { getTransactions } = require('../../services/transaction-simple')
const { formatDate, formatAmount } = require('../../utils/formatter')
const { showLoading, hideLoading, showToast } = require('../../utils/uiUtil')
const { fixAugust31InMiniProgram } = require('../../utils/fix-august31-records')
const dutils = require('../../utils/date-range') // B3: date utils unify
const privacyScope = require('../../services/privacyScope')

Page({
  // B2: setData wrapper - internal state for batching
  _b2_setDataQueue: null,
  _b2_setDataTimer: null,

  data: {
    // 页面级金额可见性（受控，持久化于 privacyScope）
    pageMoneyVisible: true,
    loading: true,
    transactions: [],
    filteredTransactions: [],
    // 分类图标映射（由 storage categories 构建：按 id 与 name 双键）
    categoryIconMap: {},
    
    // 筛选条件
    filters: {
      type: 'all', // all, income, expense
      category: 'all',
      tag: 'all',
      dateRange: 'month', // week, month, quarter, year, custom
      startDate: '',
      endDate: '',
      accounts: [] // 多选账户：id 数组
    },
    
    // 分类列表
    categories: [],
    availableTags: [],
    // 账户列表（用于账户多选筛选）
    accounts: [],
    
    // UI状态
    showFilterPanel: false,
    showDatePicker: false,
    datePickerType: '', // start, end
    showCategoryDropdown: false,
    showTagDropdown: false,
    showAccountDropdown: false,
    selectedAccountLabel: '全部账户',
    
    // 统计数据
    totalIncome: 0,
    totalExpense: 0,
    netAmount: 0,
    
    // 分页
    currentPage: 1,
    pageSize: 20,
    hasMore: true,
    
    // 月份选择器
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth(),
    yearList: [],
    yearGroupStart: 0
  },

  onLoad(options) {
    // 初始化本页面的金额可见性：优先页面覆盖，否则回退全局默认
    try {
      const route = this.route || (getCurrentPages().slice(-1)[0] && getCurrentPages().slice(-1)[0].route);
      const visible = privacyScope.getEffectiveVisible(route || 'pages/transaction-list/transaction-list');
      this.setData({ pageMoneyVisible: !!visible });
    } catch (e) { /* no-op */ }
    console.log('交易列表页面加载，参数:', options)

    // B1: routing params encode/validate - decode & validate
    const safe = (v) => typeof v === 'string' ? decodeURIComponent(v) : v
    const isValidType = (t) => ['all','income','expense'].includes(t)
    const isValidRange = (r) => ['week','month','quarter','year','custom'].includes(r)
    const toInt = (v, d = NaN) => {
      const n = parseInt(v, 10)
      return Number.isFinite(n) ? n : d
    }
    const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

    const updates = {}

    // type/category/tag/range
    if (options.type) {
      const t = safe(options.type)
      updates['filters.type'] = isValidType(t) ? t : 'all'
      if (!isValidType(t)) wx.showToast({ title: '无效type，已回退为全部', icon: 'none' })
    }
    if (options.category) {
      updates['filters.category'] = safe(options.category)
    }
    if (options.tag) {
      updates['filters.tag'] = safe(options.tag)
    }
    if (options.range) {
      const r = safe(options.range)
      updates['filters.dateRange'] = isValidRange(r) ? r : 'month'
      if (!isValidRange(r)) wx.showToast({ title: '无效range，已回退为本月', icon: 'none' })
    }

    // start/end
    const start = safe(options.start)
    const end = safe(options.end)
    if (start && end && isDate(start) && isDate(end)) {
      updates['filters.startDate'] = start
      updates['filters.endDate'] = end
      updates['filters.dateRange'] = 'custom'
      console.log(`从URL参数设置自定义日期范围: ${start} 到 ${end}`)
    }

    // 年月（1-based -> 0-based）
    const y = toInt(safe(options.year))
    const m = toInt(safe(options.month))
    if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
      updates.currentYear = y
      updates.currentMonth = m - 1
      updates.selectedYear = y
      updates.selectedMonth = m - 1
    }

    // 账户多选参数（accounts=id1,id2）
    if (options.accounts) {
      const accStr = safe(options.accounts)
      const ids = accStr.split(',').map(s => s.trim()).filter(Boolean)
      if (ids.length) {
        updates['filters.accounts'] = ids
      }
    }

    // 标题
    if (options.title) {
      wx.setNavigationBarTitle({ title: safe(options.title) })
    }

    if (Object.keys(updates).length) {
      this.setData(updates)
    }

    // B3: date utils unify - 如果通过URL设置了年月且未设置自定义范围，则补齐该月的起止日期
    if (
      updates.currentYear != null &&
      updates.currentMonth != null &&
      !(updates['filters.dateRange'] === 'custom' && updates['filters.startDate'] && updates['filters.endDate'])
    ) {
      const monthRange = dutils.buildMonthRange(updates.currentYear, updates.currentMonth) // month 为 0-based
      if (monthRange && monthRange.start && monthRange.end) {
        this.setData({
          'filters.startDate': this.data.filters.startDate || monthRange.start,
          'filters.endDate': this.data.filters.endDate || monthRange.end
        })
      }
    }

    this.initPage()
  },

  onShow() {
    this.loadTransactions()
  },

  // B2: setData wrapper - shallow dirty-check and throttled batch
  setDataSafe(patch, throttleMs = 16) {
    try {
      if (!patch || typeof patch !== 'object') return;

      // 脏检查：仅保留实际变更的字段
      const dirty = {};
      Object.keys(patch).forEach((k) => {
        const nv = patch[k];
        const ov = this.data && k in this.data ? this.data[k] : undefined;
        // 仅做浅比较；对象/数组引用变化视为变更
        if (nv !== ov) dirty[k] = nv;
      });

      const keys = Object.keys(dirty);
      if (!keys.length) return;

      // 合并队列
      this._b2_setDataQueue = Object.assign(this._b2_setDataQueue || {}, dirty);

      // 节流调度
      if (this._b2_setDataTimer) return;
      this._b2_setDataTimer = setTimeout(() => {
        const q = this._b2_setDataQueue || {};
        this._b2_setDataQueue = null;
        this._b2_setDataTimer = null;
        // 实际提交
        this.setData(q);
      }, Math.max(0, throttleMs));
    } catch (e) {
      // 兜底回退使用原始 setData，确保功能不受影响
      try { this.setData(patch); } catch (_) {}
    }
  },

  // 初始化页面
  async initPage() {
    this.initDateRange()
    await this.loadCategories()
    await this.loadAccounts()
    await this.loadTransactions()
  },

  // 初始化日期范围 - 全面修复日期边界计算问题
  initDateRange() {
    // 如果已经有自定义日期范围，不要重新计算
    if (this.data.filters.dateRange === 'custom' && 
        this.data.filters.startDate && 
        this.data.filters.endDate) {
      console.log(`保持现有自定义日期范围: ${this.data.filters.startDate} 到 ${this.data.filters.endDate}`)
      return
    }
    
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    
    // 获取URL参数中的年月
    const { selectedYear, selectedMonth } = this.data
    
    let startDate, endDate
    let targetYear = selectedYear || year
    let targetMonth = selectedMonth !== undefined ? selectedMonth : month
    
    // 辅助函数：格式化日期为YYYY-MM-DD格式
    const formatDateString = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    // 获取当前日期用于本周计算
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()
    const currentDate = today.getDate()
    
    switch (this.data.filters.dateRange) {
      case 'week':
        // 完全重写本周计算逻辑：确保只显示当前自然周的数据
        const todayForWeek = new Date() // 使用当前实际日期
        const currentDayOfWeek = todayForWeek.getDay() // 0=周日, 1=周一, ..., 6=周六
        
        // 计算本周一的日期
        const mondayOffset = currentDayOfWeek === 0 ? -6 : -(currentDayOfWeek - 1)
        const weekStart = new Date(todayForWeek)
        weekStart.setDate(todayForWeek.getDate() + mondayOffset)
        weekStart.setHours(0, 0, 0, 0)
        
        // 计算本周日的日期
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)
        
        startDate = formatDateString(weekStart)
        endDate = formatDateString(weekEnd)
        
        // 详细的本周计算验证
        const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        console.log(`=== 本周计算验证 ===`)
        console.log(`今天: ${todayForWeek.toDateString()} (${weekDays[currentDayOfWeek]})`)
        console.log(`本周一: ${weekStart.toDateString()} -> ${startDate}`)
        console.log(`本周日: ${weekEnd.toDateString()} -> ${endDate}`)
        console.log(`本周范围: ${startDate} 至 ${endDate}`)
        console.log(`=== 本周计算完成 ===`)
        break
      case 'month':
        // B3: date utils unify - 月份范围使用工具统一计算（0-based month）
        {
          const mYear = (targetYear && (targetMonth !== undefined)) ? targetYear : currentYear
          const mIndex = (targetYear && (targetMonth !== undefined)) ? targetMonth : currentMonth
          const mr = dutils.buildMonthRange(mYear, mIndex)
          startDate = mr.start
          endDate = mr.end

          const monthName = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'][mIndex]
          console.log(`月份计算验证: ${mYear}年${monthName}`)
          console.log(`- 月初 -> ${startDate}`)
          console.log(`- 月末 -> ${endDate}`)
        }
        break
      case 'quarter':
        // B3: date utils unify - 季度范围使用月份工具组合
        {
          const qYear = currentYear
          const qStartMonth0 = Math.floor(currentMonth / 3) * 3
          const r1 = dutils.buildMonthRange(qYear, qStartMonth0)
          const r2 = dutils.buildMonthRange(qYear, qStartMonth0 + 2)
          startDate = r1.start
          endDate = r2.end
          console.log(`季度计算: 第${Math.floor(currentMonth / 3) + 1}季度，范围: ${startDate} 到 ${endDate}`)
        }
        break
      case 'year':
        // B3: date utils unify - 年范围用工具计算
        {
          const yr = dutils.buildYearRange(currentYear)
          startDate = yr.start
          endDate = yr.end
          console.log(`年度计算: ${currentYear}年，范围: ${startDate} 到 ${endDate}`)
        }
        break
      case 'custom':
        // 修复自定义日期逻辑，确保日期选择器正常工作
        if (!this.data.filters.startDate || !this.data.filters.endDate) {
          // 如果没有自定义日期，默认使用当前月份
          const defaultMonthStart = new Date(currentYear, currentMonth, 1)
          const defaultMonthEnd = new Date(currentYear, currentMonth + 1, 0)
          startDate = this.data.filters.startDate || formatDateString(defaultMonthStart)
          endDate = this.data.filters.endDate || formatDateString(defaultMonthEnd)
          
          console.log(`自定义日期默认值: ${startDate} 到 ${endDate}`)
        } else {
          startDate = this.data.filters.startDate
          endDate = this.data.filters.endDate
          
          console.log(`自定义日期: ${startDate} 到 ${endDate}`)
        }
        break
      default:
        // 默认使用当前月份
        const defaultStart = new Date(currentYear, currentMonth, 1)
        const defaultEnd = new Date(currentYear, currentMonth + 1, 0)
        startDate = formatDateString(defaultStart)
        endDate = formatDateString(defaultEnd)
        
        console.log(`默认月份: ${startDate} 到 ${endDate}`)
    }
    
    console.log(`日期范围计算 - 类型: ${this.data.filters.dateRange}, 开始: ${startDate}, 结束: ${endDate}`)
    
    // 兜底：严防将 undefined 写入 data（会触发 setData 警告）
    if (!startDate || !endDate) {
      try {
        const today2 = new Date();
        const mr2 = dutils.buildMonthRange(today2.getFullYear(), today2.getMonth());
        startDate = startDate || (mr2 && mr2.start);
        endDate = endDate || (mr2 && mr2.end);
      } catch (e) {
        const t = new Date();
        const ys = t.getFullYear();
        const ms = String(t.getMonth() + 1).padStart(2, '0');
        startDate = startDate || `${ys}-${ms}-01`;
        // 月末简单估算：下月第0天
        const mend = new Date(t.getFullYear(), t.getMonth() + 1, 0);
        const mms = String(mend.getMonth() + 1).padStart(2, '0');
        const dds = String(mend.getDate()).padStart(2, '0');
        endDate = endDate || `${mend.getFullYear()}-${mms}-${dds}`;
      }
    }

    this.setData({
      'filters.startDate': startDate,
      'filters.endDate': endDate,
      currentYear: targetYear,
      currentMonth: targetMonth
    })
  },

  // 计算给定范围的起止（用于面板显示与切换即刻生效）
  _calcRange(range) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-based

    const fmt = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };

    if (range === 'week') {
      const dow = today.getDay(); // 0 Sun .. 6 Sat
      const mondayOffset = dow === 0 ? -6 : -(dow - 1);
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + mondayOffset);
      weekStart.setHours(0,0,0,0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23,59,59,999);
      return { start: fmt(weekStart), end: fmt(weekEnd) };
    }

    if (range === 'month') {
      // 直接用 JS 计算当月起止，避免工具与时区差异
      const y = this.data.currentYear || currentYear;
      const m0 = (this.data.currentMonth != null) ? this.data.currentMonth : currentMonth; // 0-based
      const monthStart = new Date(y, m0, 1);
      const monthEnd = new Date(y, m0 + 1, 0);
      const fmt2 = (d) => {
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
      };
      return { start: fmt2(monthStart), end: fmt2(monthEnd) };
    }

    // custom 或未知：保持现值，若为空则回退本月
    const start = this.data?.filters?.startDate;
    const end = this.data?.filters?.endDate;
    if (start && end) return { start, end };
    const mr = dutils.buildMonthRange(currentYear, currentMonth);
    return { start: mr.start, end: mr.end };
  },
  
  // 加载分类列表和标签
  async loadCategories() {
    try {
      // 从本地存储读取标准化分类结构：{ income:[], expense:[] }，与分类管理页同源
      const stored = wx.getStorageSync('categories') || { income: [], expense: [] };
      let income = Array.isArray(stored.income) ? stored.income : [];
      let expense = Array.isArray(stored.expense) ? stored.expense : [];

      // 兜底：若分类存储为空，基于本地交易记录动态提取分类名称
      if ((!income.length && !expense.length)) {
        const tx = wx.getStorageSync('transactions') || [];
        const incomeSet = new Set();
        const expenseSet = new Set();
        tx.forEach(t => {
          const name = t && (t.category || t.categoryName || t.categoryId);
          const type = t && t.type;
          if (!name || !type) return;
          if (type === 'income') incomeSet.add(String(name));
          else if (type === 'expense') expenseSet.add(String(name));
        });
        if (incomeSet.size || expenseSet.size) {
          income = Array.from(incomeSet).map(n => ({ id: n, name: n, icon: '', color: '' }));
          expense = Array.from(expenseSet).map(n => ({ id: n, name: n, icon: '', color: '' }));
        }
      }

      // 合并并保留 icon/color/type
      const categories = [
        ...income.map(c => ({ ...c, type: 'income' })),
        ...expense.map(c => ({ ...c, type: 'expense' }))
      ];

      // 构建图标映射（按 id 与 name 双键）
      const iconMap = {};
      const setIf = (k, v) => { if (k && iconMap[k] == null) iconMap[k] = v; };
      categories.forEach(c => {
        const icon = c.icon || '💰';
        setIf(c.id, icon);
        setIf(c._id, icon);
        setIf(c.name, icon);
      });

      // 兜底标签列表（保留原有演示标签）
      const availableTags = [
        '必需品', '可选消费', '紧急支出', '计划支出', 
        '工作相关', '家庭开支', '个人消费', '投资理财',
        '健康医疗', '教育培训', '娱乐休闲', '交通出行'
      ];
      this.setData({ categories, availableTags, categoryIconMap: iconMap });
    } catch (error) {
      console.error('加载分类和标签失败:', error);
    }
  },

  // 加载账户列表（用于账户多选筛选）
  // 显示账户下拉
  showAccountDropdown() {
    this.setData({
      showAccountDropdown: !this.data.showAccountDropdown,
      showCategoryDropdown: false,
      showTagDropdown: false
    })
  },

  // 账户下拉选择
  onAccountSelect(e) {
    const id = String(e.currentTarget.dataset.id || '')
    if (!id || id === 'all') {
      this.setData({ 'filters.accounts': [], showAccountDropdown: false })
    } else {
      this.setData({ 'filters.accounts': [id], showAccountDropdown: false })
    }
    this.updateSelectedAccountLabel()
    this.applyFiltersAndReload()
  },

  // 更新账户下拉展示文案
  updateSelectedAccountLabel() {
    try {
      let label = '全部账户'
      const sel = Array.isArray(this.data.filters.accounts) ? this.data.filters.accounts : []
      if (sel.length > 0) {
        const targetId = String(sel[0])
        const found = (this.data.accounts || []).find(a => String(a.id) === targetId)
        if (found && found.name) label = found.name
      }
      this.setDataSafe({ selectedAccountLabel: label })
    } catch (e) {
      this.setDataSafe({ selectedAccountLabel: '全部账户' })
    }
  },

  async loadAccounts() {
    try {
      const accounts = wx.getStorageSync('accounts') || []
      const normalized = (Array.isArray(accounts) ? accounts : []).map(a => ({
        id: a.id || a._id,
        name: a.name,
        icon: a.icon,
        color: a.color || a.bgColor || a.themeColor
      })).filter(a => a.id && a.name)
      // 根据当前 filters.accounts 标记选中状态
      const sel = Array.isArray(this.data.filters.accounts) ? this.data.filters.accounts.map(String) : []
      const selectedSet = new Set(sel)
      const withSelected = normalized.map(a => ({ ...a, selected: selectedSet.has(String(a.id)) }))
      this.setData({ accounts: withSelected })
      // 更新账户下拉展示
      this.updateSelectedAccountLabel()
    } catch (e) {
      console.warn('加载账户列表失败:', e)
      this.setData({ accounts: [] })
    }
  },

  // 检查8月31日记录的专门函数
  checkAugust31Records() {
    console.log('=== 8月31日记录检查开始 ===')
    
    // 获取所有本地交易记录
    const allTransactions = wx.getStorageSync('transactions') || []
    console.log(`总交易记录数: ${allTransactions.length}`)
    
    // 查找8月31日的记录
    const august31Records = allTransactions.filter(t => {
      const dateStr = (t.date || t.createTime || '').toString()
      return dateStr.includes('2024-08-31') || dateStr.includes('08-31')
    })
    
    console.log(`8月31日记录数: ${august31Records.length}`)
    august31Records.forEach((record, index) => {
      console.log(`8月31日记录 ${index + 1}:`, {
        id: record.id || record._id,
        date: record.date,
        createTime: record.createTime,
        amount: record.amount,
        type: record.type,
        description: record.description,
        category: record.category
      })
    })
    
    // 检查当前筛选条件
    console.log('当前筛选条件:', this.data.filters)
    console.log('=== 8月31日记录检查结束 ===')
  },

  // 修复8月31日记录归类问题
  fixAugust31Records() {
    wx.showModal({
      title: '修复8月31日记录',
      content: '是否修复8月31日记录的归类问题，确保其正确显示在8月份筛选中？',
      success: (res) => {
        if (res.confirm) {
          const success = fixAugust31InMiniProgram()
          if (success) {
            // 重新加载数据
            this.loadTransactions()
          }
        }
      }
    })
  },

  // 加载交易记录 - 优化跨月数据处理，特别修复8月31日记录归类问题
  async loadTransactions() {
    try {
      this.setData({ loading: true })
      showLoading('加载中...')
      
      // 特别检查8月31日记录
      this.checkAugust31Records()
      
      // 扩展查询范围以确保不遗漏边界数据
      const { startDate, endDate } = this.data.filters
      let queryStartDate = startDate
      let queryEndDate = endDate

      // 轻量校验 YYYY-MM-DD
      const isValidDateString = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
      const toISODate = (d) => d.toISOString().split('T')[0]
      
      // 如果是月份筛选，扩展查询范围到前后各一天，确保不遗漏跨时区或边界数据
      if (this.data.filters.dateRange === 'month' && isValidDateString(startDate) && isValidDateString(endDate)) {
        const start = new Date(startDate)
        if (!isNaN(start.getTime())) {
          start.setDate(start.getDate() - 1) // 前一天
          queryStartDate = toISODate(start)
        }
        
        const end = new Date(endDate)
        if (!isNaN(end.getTime())) {
          end.setDate(end.getDate() + 1) // 后一天
          queryEndDate = toISODate(end)
        }
        
        console.log(`月份查询扩展范围: ${queryStartDate} 到 ${queryEndDate}`)
      } else if (this.data.filters.dateRange === 'month') {
        console.warn('月份扩展跳过：起止日期无效或为空', { startDate, endDate })
      }
      
      const params = {
        startDate: queryStartDate,
        endDate: queryEndDate
      }
      
      console.log('查询参数:', params)
      
      const result = await getTransactions(params)
      const allTransactions = result.list || []
      
      console.log(`获取到${allTransactions.length}条原始交易记录`)
      
      // 应用筛选条件（这里会根据实际的筛选日期范围过滤数据）
      const filteredTransactions = this.applyFilters(allTransactions)
      
      console.log(`筛选后${filteredTransactions.length}条交易记录`)
      
      // 计算统计数据
      this.calculateStats(filteredTransactions)
      
      // 格式化数据
      const formattedTransactions = filteredTransactions.map(transaction => {
        const catKey = transaction.category || transaction.categoryName || transaction.categoryId;
        const icon = this.getCategoryIcon(catKey, transaction.type);
        return {
          ...transaction,
          category: transaction.category || transaction.categoryName || transaction.categoryId || '未分类',
          categoryIcon: icon,
          formattedDate: formatDate(transaction.date || transaction.createTime),
          formattedAmount: formatAmount(transaction.amount)
        };
      })
      
      // B2: setData wrapper 应用
      this.setDataSafe({
        transactions: allTransactions,
        filteredTransactions: formattedTransactions,
        loading: false
      })
      
      hideLoading()
      
      // 输出调试信息
      console.log(`数据加载完成 - 筛选范围: ${startDate} 到 ${endDate}, 结果: ${formattedTransactions.length}条`)
      
    } catch (error) {
      console.error('加载交易记录失败:', error)
      hideLoading()
      showToast('加载失败，请重试', 'error')
      this.setData({ loading: false })
    }
  },

  // 应用筛选条件 - 全面修复边界日期归类问题
  applyFilters(transactions) {
    let filtered = [...transactions]
    
    // 按日期范围筛选 - 完全重写边界日期处理逻辑
    const { startDate, endDate } = this.data.filters
    if (startDate && endDate) {
      console.log(`=== 开始日期筛选 ===`)
      console.log(`筛选条件: ${startDate} 到 ${endDate}`)
      console.log(`筛选类型: ${this.data.filters.dateRange}`)
      
      filtered = filtered.filter(t => {
        // 获取交易日期，优先使用date字段，兼容createTime
        let transactionDateStr = t.date || t.createTime
        
        // 标准化日期格式提取
        let dateOnly
        if (typeof transactionDateStr === 'string') {
          // 处理各种日期字符串格式
          if (transactionDateStr.includes('T')) {
            // ISO格式: 2024-08-31T10:30:00.000Z
            dateOnly = transactionDateStr.split('T')[0]
          } else if (transactionDateStr.includes(' ')) {
            // 带时间格式: 2024-08-31 10:30:00
            dateOnly = transactionDateStr.split(' ')[0]
          } else if (transactionDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // 纯日期格式: 2024-08-31
            dateOnly = transactionDateStr
          } else {
            // 其他格式，尝试解析
            const date = new Date(transactionDateStr)
            if (!isNaN(date.getTime())) {
              dateOnly = date.toISOString().split('T')[0]
            } else {
              console.warn(`无法解析的日期格式: ${transactionDateStr}`)
              return false
            }
          }
        } else {
          // 处理Date对象或时间戳
          const date = new Date(transactionDateStr)
          if (!isNaN(date.getTime())) {
            dateOnly = date.toISOString().split('T')[0]
          } else {
            console.warn(`无效的日期对象: ${transactionDateStr}`)
            return false
          }
        }
        
        // 确保日期格式正确
        if (!dateOnly || !dateOnly.match(/^\d{4}-\d{2}-\d{2}$/)) {
          console.warn(`日期格式不正确: ${dateOnly}`)
          return false
        }
        
        // 使用字符串比较进行日期范围筛选
        const isInRange = dateOnly >= startDate && dateOnly <= endDate
        
        // 详细调试边界日期
        if (dateOnly.endsWith('-31') || dateOnly.endsWith('-01') || dateOnly.endsWith('-30')) {
          console.log(`边界日期检查:`, {
            transactionId: t.id || t._id,
            originalDate: transactionDateStr,
            extractedDate: dateOnly,
            filterRange: `${startDate} - ${endDate}`,
            filterType: this.data.filters.dateRange,
            isInRange: isInRange,
            amount: t.amount,
            description: t.description || t.remark || '无描述'
          })
        }
        
        return isInRange
      })
      
      console.log(`筛选结果: 原始${transactions.length}条，筛选后${filtered.length}条`)
      console.log(`=== 日期筛选完成 ===`)
    }
    
    // 按类型筛选
    if (this.data.filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === this.data.filters.type)
    }
    
    // 按分类筛选
    if (this.data.filters.category !== 'all') {
      filtered = filtered.filter(t => t.category === this.data.filters.category)
    }

    // 按标签筛选（支持字符串或数组）
    if (this.data.filters.tag && this.data.filters.tag !== 'all') {
      const tag = this.data.filters.tag
      filtered = filtered.filter(t => {
        const ts = t.tags
        if (!ts) return false
        if (Array.isArray(ts)) return ts.includes(tag)
        return ts === tag
      })
    }

    // 按账户多选筛选
    if (Array.isArray(this.data.filters.accounts) && this.data.filters.accounts.length > 0) {
      const accSet = new Set(this.data.filters.accounts.map(String))
      filtered = filtered.filter(t => {
        const tid = t.accountId || t.account || t.accountIdStr || t.accountName
        return tid && accSet.has(String(tid))
      })
    }
    
    // 按日期排序（最新的在前），兼容 createTime
    filtered.sort((a, b) => {
      const dateA = new Date(a.date || a.createTime)
      const dateB = new Date(b.date || b.createTime)
      return dateB - dateA
    })
    
    console.log(`筛选结果: 原始${transactions.length}条，筛选后${filtered.length}条，日期范围: ${startDate} 到 ${endDate}`)
    
    return filtered
  },

  // 计算统计数据 - 优化数据完整性和准确性
  calculateStats(transactions) {
    let totalIncome = 0
    let totalExpense = 0
    let validTransactionCount = 0
    let invalidTransactionCount = 0
    
    console.log(`开始计算统计数据，共${transactions.length}条交易记录`)
    
    transactions.forEach((transaction, index) => {
      // 验证交易数据的有效性
      if (!transaction.amount || typeof transaction.amount !== 'number') {
        console.warn(`交易记录${index}金额无效:`, transaction)
        invalidTransactionCount++
        return
      }
      
      if (!transaction.type || (transaction.type !== 'income' && transaction.type !== 'expense')) {
        console.warn(`交易记录${index}类型无效:`, transaction)
        invalidTransactionCount++
        return
      }
      
      // 确保金额为正数
      const amount = Math.abs(transaction.amount) / 100 // 转换为元
      
      if (transaction.type === 'income') {
        totalIncome += amount
        console.log(`收入记录: ${amount}元, 累计收入: ${totalIncome.toFixed(2)}元`)
      } else if (transaction.type === 'expense') {
        totalExpense += amount
        console.log(`支出记录: ${amount}元, 累计支出: ${totalExpense.toFixed(2)}元`)
      }
      
      validTransactionCount++
    })
    
    const netAmount = totalIncome - totalExpense
    
    // 输出统计摘要
    console.log(`统计计算完成:`)
    console.log(`- 有效交易: ${validTransactionCount}条`)
    console.log(`- 无效交易: ${invalidTransactionCount}条`)
    console.log(`- 总收入: ${totalIncome.toFixed(2)}元`)
    console.log(`- 总支出: ${totalExpense.toFixed(2)}元`)
    console.log(`- 净收入: ${netAmount.toFixed(2)}元`)
    
    // 更新统计标题显示当前筛选范围
    let statsSubtitle = '数据统计'
    const { dateRange, startDate, endDate } = this.data.filters
    
    switch (dateRange) {
      case 'week':
        statsSubtitle = '本周数据'
        break
      case 'month': {
        // 更稳健：当 startDate 无效时，用 currentYear/currentMonth 或今天兜底
        const isYMD = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
        let y, m
        if (isYMD(startDate)) {
          const d = new Date(startDate)
          if (!isNaN(d.getTime())) {
            y = d.getFullYear()
            m = d.getMonth() + 1
          }
        }
        if (!y || !m) {
          if (Number.isInteger(this.data.currentYear) && Number.isInteger(this.data.currentMonth)) {
            y = this.data.currentYear
            m = this.data.currentMonth + 1 // 0-based -> 1-based
          } else {
            const t = new Date()
            y = t.getFullYear()
            m = t.getMonth() + 1
          }
        }
        statsSubtitle = `${y}年${m}月数据`
        break
      }
      case 'quarter':
        statsSubtitle = '本季度数据'
        break
      case 'year':
        statsSubtitle = '本年数据'
        break
      case 'custom':
        statsSubtitle = `${startDate} 至 ${endDate}`
        break
    }
    
    // B2: setData wrapper 应用
    this.setDataSafe({
      totalIncome: totalIncome.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      netAmount: netAmount.toFixed(2),
      statsSubtitle: statsSubtitle,
      validTransactionCount: validTransactionCount
    })
  },

  // 显示筛选面板
  showFilterPanel() {
    // 若进入时起止为空，按当前筛选类型计算并回填，避免面板空白
    const f = this.data.filters || {};
    if (!f.startDate || !f.endDate) {
      const r = this._calcRange(f.dateRange || 'month');
      this.setData({
        'filters.startDate': r.start,
        'filters.endDate': r.end
      });
    }
    this.setData({ showFilterPanel: true })
  },

  // 隐藏筛选面板
  hideFilterPanel() {
    this.setData({ 
      showFilterPanel: false,
      showCategoryDropdown: false,
      showTagDropdown: false,
      showAccountDropdown: false
    })
  },

  // 类型筛选
  onTypeFilter(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      'filters.type': type
    })
    this.applyFiltersAndReload()
  },

  // 显示分类下拉菜单
  showCategoryDropdown() {
    this.setData({ 
      showCategoryDropdown: !this.data.showCategoryDropdown,
      showTagDropdown: false 
    })
  },

  // 分类选择
  onCategorySelect(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      'filters.category': category,
      showCategoryDropdown: false
    })
    this.applyFiltersAndReload()
  },

  // 显示标签下拉菜单
  showTagDropdown() {
    this.setData({ 
      showTagDropdown: !this.data.showTagDropdown,
      showCategoryDropdown: false 
    })
  },

  // 标签选择
  onTagSelect(e) {
    const tag = e.currentTarget.dataset.tag
    this.setData({
      'filters.tag': tag,
      showTagDropdown: false
    })
    this.applyFiltersAndReload()
  },

  // 账户多选切换
  onAccountToggle(e) {
    const id = String(e.currentTarget.dataset.id || '')
    if (!id) return
    const sel = Array.isArray(this.data.filters.accounts) ? [...this.data.filters.accounts] : []
    const idx = sel.indexOf(id)
    if (idx >= 0) sel.splice(idx, 1); else sel.push(id)
    // 更新 filters.accounts
    this.setData({ 'filters.accounts': sel })
    // 同步刷新 accounts[].selected 以驱动 UI 高亮
    try {
      const selSet = new Set(sel.map(String))
      const updatedAccounts = (this.data.accounts || []).map(a => ({ ...a, selected: selSet.has(String(a.id)) }))
      this.setData({ accounts: updatedAccounts })
    } catch (e) { /* no-op */ }
    this.applyFiltersAndReload()
  },

  // 清除账户筛选
  onAccountClear() {
    this.setData({ 'filters.accounts': [] })
    this.applyFiltersAndReload()
  },

  // 日期范围筛选 - 显式写入起止，确保 UI 立刻更新
  onDateRangeFilter(e) {
    const range = e.currentTarget.dataset.range
    console.log('切换日期范围筛选:', range)
    const r = this._calcRange(range)
    const patch = {
      'filters.dateRange': range,
      'filters.startDate': r.start,
      'filters.endDate': r.end
    }
    // 当选择“本月”时，同时更新当前年月，确保后续计算一致
    if (range === 'month') {
      const today = new Date()
      patch.currentYear = today.getFullYear()
      patch.currentMonth = today.getMonth() // 0-based
    }
    this.setData(patch)
    this.applyFiltersAndReload()
    console.log('日期范围已切换到:', range, '当前日期:', r.start, '到', r.end)
  },

  // 自定义日期选择 - 修复选择器消失和无法操作的问题
  onCustomDateTap(e) {
    const type = e.currentTarget.dataset.type
    console.log('点击日期选择器:', type)
    
    // 直接显示日期选择器，不使用模态框
    this.setData({
      showDatePicker: true,
      datePickerType: type
    })
  },

  // 日期选择处理 - 修复日期字段无法使用的问题
  onDateChange(e) {
    const value = e.detail.value
    const type = this.data.datePickerType
    
    console.log('日期选择结果:', type, value)
    
    // 获取当前的开始和结束日期
    const currentStartDate = this.data.filters.startDate
    const currentEndDate = this.data.filters.endDate
    
    // 验证日期有效性
    if (type === 'end' && value < currentStartDate) {
      wx.showToast({
        title: '结束日期不能早于开始日期',
        icon: 'none'
      })
      this.setData({ showDatePicker: false })
      return
    }
    
    if (type === 'start' && currentEndDate && value > currentEndDate) {
      wx.showToast({
        title: '开始日期不能晚于结束日期',
        icon: 'none'
      })
      this.setData({ showDatePicker: false })
      return
    }
    
    // 更新对应的日期字段
    const updateData = {
      showDatePicker: false,
      'filters.dateRange': 'custom'
    }
    
    if (type === 'start') {
      updateData['filters.startDate'] = value
    } else if (type === 'end') {
      updateData['filters.endDate'] = value
    }
    
    this.setData(updateData)
    
    console.log('更新日期筛选:', this.data.filters)
    
    // 重新应用筛选
    this.applyFiltersAndReload()
  },

  // 日期选择器取消
  onDatePickerCancel() {
    console.log('取消日期选择')
    this.setData({
      showDatePicker: false
    })
  },

  // 空操作函数，防止事件冒泡
  noop() {
    // 空函数，用于阻止事件冒泡
  },

  // 应用筛选并重新加载 - 添加调试信息
  applyFiltersAndReload() {
    console.log('重新应用筛选条件:', this.data.filters)
    
    const filteredTransactions = this.applyFilters(this.data.transactions)
    this.calculateStats(filteredTransactions)
    
    const formattedTransactions = filteredTransactions.map(transaction => {
      const catKey = transaction.category || transaction.categoryName || transaction.categoryId;
      const icon = this.getCategoryIcon(catKey, transaction.type);
      return {
        ...transaction,
        category: transaction.category || transaction.categoryName || transaction.categoryId || '未分类',
        categoryIcon: icon,
        formattedDate: formatDate(transaction.date || transaction.createTime),
        formattedAmount: formatAmount(transaction.amount)
      };
    })
    
    // 输出筛选结果的日期分布
    const dateDistribution = {}
    formattedTransactions.forEach(t => {
      const date = t.date || t.createTime
      const dateKey = date.split('T')[0] // 只取日期部分
      dateDistribution[dateKey] = (dateDistribution[dateKey] || 0) + 1
    })
    
    console.log('筛选结果日期分布:', dateDistribution)
    
    // B2: setData wrapper 应用
    this.setDataSafe({
      filteredTransactions: formattedTransactions
    })
  },

  // 调试函数：验证月份边界数据
  debugMonthBoundary() {
    const { startDate, endDate } = this.data.filters
    const { transactions } = this.data
    
    console.log('=== 月份边界调试信息 ===')
    console.log(`筛选范围: ${startDate} 到 ${endDate}`)
    console.log(`原始交易记录数: ${transactions.length}`)
    
    // 分析每条交易记录的日期
    transactions.forEach((t, index) => {
      const transactionDate = t.date || t.createTime
      const dateStr = transactionDate.split('T')[0]
      const isInRange = dateStr >= startDate && dateStr <= endDate
      
      if (dateStr === '2024-08-31' || dateStr === '2024-09-01') {
        console.log(`边界日期记录 ${index}: ${dateStr}, 金额: ${t.amount/100}元, 类型: ${t.type}, 在范围内: ${isInRange}`)
      }
    })
    
    console.log('=== 调试信息结束 ===')
  },



  // 重置筛选条件
  resetFilters() {
    const r = this._calcRange('month')
    this.setData({
      filters: {
        type: 'all',
        category: 'all',
        tag: 'all',
        dateRange: 'month',
        startDate: r.start,
        endDate: r.end
      },
      showCategoryDropdown: false,
      showTagDropdown: false
    })
    this.applyFiltersAndReload()
  },

  // 查看交易详情（统一为编辑模式）
  viewTransactionDetail(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({
      url: `/pages/record/record?mode=edit&id=${id}`
    })
  },

  // 导出数据
  exportData() {
    showToast('导出功能开发中', 'none')
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadTransactions().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore) {
      this.loadMoreTransactions()
    }
  },

  // 加载更多交易记录
  async loadMoreTransactions() {
    // 检查是否还有更多数据
    const { filteredTransactions } = this.data
    if (filteredTransactions.length === 0) {
      showToast('暂无数据', 'none')
      return
    }
    
    // 根据筛选条件判断是否显示"已加载全部数据"
    const { dateRange } = this.data.filters
    let message = '已加载全部数据'
    
    switch (dateRange) {
      case 'week':
        message = '已加载本周全部数据'
        break
      case 'month':
        message = '已加载本月全部数据'
        break
      case 'quarter':
        message = '已加载本季度全部数据'
        break
      case 'year':
        message = '已加载本年全部数据'
        break
      case 'custom':
        message = '已加载所选时间段全部数据'
        break
    }
    
    showToast(message, 'none')
  },
  
  // 显示月份选择器
  showMonthPicker() {
    // 生成年份列表，当前年份前后5年
    const currentYear = new Date().getFullYear();
    const yearList = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      yearList.push(i);
    }
    
    this.setData({
      showMonthYearPicker: true,
      yearList,
      yearGroupStart: 0,
      selectedYear: this.data.currentYear,
      selectedMonth: this.data.currentMonth
    });
  },
  
  // 隐藏月份选择器
  hideMonthYearPicker() {
    this.setData({
      showMonthYearPicker: false
    });
  },
  
  // 选择年份
  onYearSelect(e) {
    const year = e.currentTarget.dataset.year;
    this.setData({
      selectedYear: year
    });
  },
  
  // 选择月份
  onMonthSelect(e) {
    const month = e.currentTarget.dataset.month;
    this.setData({
      selectedMonth: month
    });
  },
  
  // 确认月份年份选择
  confirmMonthYearSelection() {
    this.setData({
      currentYear: this.data.selectedYear,
      currentMonth: this.data.selectedMonth,
      showMonthYearPicker: false
    });
    
    this.initDateRange();
    this.loadTransactions();
  },
  
  // 上一组年份
  prevYearGroup() {
    const { yearGroupStart } = this.data;
    if (yearGroupStart > 0) {
      this.setData({
        yearGroupStart: yearGroupStart - 5
      });
    }
  },
  
  // 下一组年份
  nextYearGroup() {
    const { yearGroupStart, yearList } = this.data;
    if (yearGroupStart + 10 < yearList.length) {
      this.setData({
        yearGroupStart: yearGroupStart + 5
      });
    }
  },
  
  // 显示年份选择器
  showYearPicker() {
    const currentYear = this.data.currentYear;
    const years = [];
    // 显示前后5年
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i + '年');
    }
    
    wx.showActionSheet({
      itemList: years,
      success: (res) => {
        const selectedYear = currentYear - 5 + res.tapIndex;
        this.setData({
          currentYear: selectedYear
        });
        this.initDateRange();
        this.loadTransactions();
      }
    });
  },
  
  // 显示月份选择器
  showMonthPickerOnly() {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    
    wx.showActionSheet({
      itemList: months,
      success: (res) => {
        this.setData({
          currentMonth: res.tapIndex
        });
        this.initDateRange();
        this.loadTransactions();
      }
    });
  },
  
  // 上一个月
  prevMonth() {
    let { currentYear, currentMonth } = this.data;
    
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear -= 1;
    } else {
      currentMonth -= 1;
    }
    
    this.setData({
      currentYear,
      currentMonth
    });
    
    this.initDateRange();
    this.loadTransactions();
  },
  
  // 下一个月
  nextMonth() {
    let { currentYear, currentMonth } = this.data;
    
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear += 1;
    } else {
      currentMonth += 1;
    }
    
    this.setData({
      currentYear,
      currentMonth
    });
    
    this.initDateRange();
    this.loadTransactions();
  },
  
  // 阻止冒泡空函数（用于筛选面板容器 catchtap）
  noop() {},

  // 切换本页金额可见性
  onEyeChange(e) {
    const v = !!(e && e.detail && e.detail.value);
    try {
      const route = this.route || (getCurrentPages().slice(-1)[0] && getCurrentPages().slice(-1)[0].route);
      privacyScope.setPageVisible(route || 'pages/transaction-list/transaction-list', v);
    } catch (e) { /* no-op */ }
    this.setDataSafe({ pageMoneyVisible: v });
  },
  
  // 获取分类名称的缩写（用于文字图标）
  // 分类图标提供：优先使用分类管理页提供的 icon，缺失时按名称兜底为稳定 emoji
  getCategoryIcon(categoryKey, type) {
    const key = categoryKey || '其他';
    const map = this.data && this.data.categoryIconMap ? this.data.categoryIconMap : {};
    if (map[key]) return map[key];
    // 兜底映射（与分类页常见名称一致），保证视觉一致
    const fallback = {
      '餐饮': '🍽️',
      '交通': '🚗',
      '购物': '🛍️',
      '娱乐': '🎮',
      '医疗': '🏥',
      '教育': '📚',
      '住房': '🏠',
      '通讯': '📱',
      '工资': '💰',
      '奖金': '🎁',
      '投资': '📈',
      '投资收益': '📈',
      '兼职': '💼',
      '转账': '🔄',
      '其他': type === 'income' ? '💰' : '💸'
    };
    return fallback[key] || (type === 'income' ? '💰' : '💸');
  }
})
