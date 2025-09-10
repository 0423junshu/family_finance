// pages/reports/reports.js - 完整修复版本
const reportService = require('../../services/report');
Page({
  data: {
    // 日期筛选
    dateRange: 'month', // 'month' | 'year' | 'custom'
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0-based
    showYear: new Date().getFullYear(),
    showMonth: new Date().getMonth(), // 0-based
    _guardFromYearToMonth: false,
    _fromYearView: false, // 标记是否从年视图切换过来
    customStartDate: '',
    customEndDate: '',
    showYearPicker: false,
    showMonthPicker: false,
    showDateRangePicker: false,
    showToolsMenu: false,
    // 统计页签
    currentTab: 0,
    categoryType: 'expense', // 'expense' | 'income'
    loading: false,
    showOptions: false,
    // 数据占位
    summary: { totalIncome: 0, totalExpense: 0, balance: 0 },
    categoryStats: { expense: [], income: [] },
    assetData: { totalAssets: 0, assetsDistribution: [], accounts: [], investments: [] },
    trendData: [],
    consistencyResult: null,
    checkingConsistency: false,
    tagStats: { expense: [], income: [] },
  },

  onLoad() {
    console.log('报表页面加载');
    // 初始化自定义日期为当月起止
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // 创建年份选择器数据
    const currentYear = now.getFullYear();
    const yearList = [];
    // 生成从当前年份-5年到当前年份+1年的选项
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      yearList.push(i + '年');
    }
    
    // 创建月份选择器数据
    const monthList = [];
    for (let i = 1; i <= 12; i++) {
      monthList.push(i + '月');
    }
    
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth(),
      showYear: now.getFullYear(),
      showMonth: now.getMonth(),
      dateRange: 'month', // 默认按月
      customStartDate: startOfMonth.toISOString().slice(0, 10),
      customEndDate: endOfMonth.toISOString().slice(0, 10),
      yearList: yearList,
      yearIndex: 5, // 默认选中当前年份
      monthList: monthList,
      monthIndex: now.getMonth() // 默认选中当前月份
    });
    
    console.log('初始化日期范围:', this.data.dateRange);
    console.log('初始化年份:', this.data.currentYear);
    console.log('初始化月份:', this.data.currentMonth + 1);
    
    this.loadReportData();
  },

  // 顶部日期切换：月/年/自定义
  onDateRangeChange(e) {
    console.log('日期范围切换', e);
    const ds = (e && e.currentTarget && e.currentTarget.dataset) || (e && e.target && e.target.dataset) || {};
    const range = ds.range;
    if (!range) return;

    console.log('切换到日期范围:', range);

    // 如果选择自定义，需要打开自定义日期弹窗
    if (range === 'custom') {
      this.setData({ 
        dateRange: 'custom', 
        showDateRangePicker: true, 
        showYearPicker: false, 
        showMonthPicker: false 
      }, () => {
        console.log('已切换到自定义日期范围，打开日期选择器');
      });
      return;
    }
    
    // 如果选择年份，打开年份选择器
    if (range === 'year') {
      // 创建年份选择器数据，确保当前年份在选择范围内
      const currentYear = new Date().getFullYear();
      const yearList = [];
      // 生成从当前年份-5年到当前年份+1年的选项
      for (let i = currentYear - 5; i <= currentYear + 1; i++) {
        yearList.push(i + '年');
      }
      
      // 计算当前选中年份在列表中的索引
      const yearIndex = yearList.findIndex(y => parseInt(y) === this.data.currentYear);
      
      this.setData({
        dateRange: 'year',
        showYearPicker: true,
        showMonthPicker: false,
        showDateRangePicker: false,
        yearList: yearList,
        yearIndex: yearIndex >= 0 ? yearIndex : yearList.length - 2 // 默认选中当前年份
      }, () => {
        console.log('已切换到年份范围，打开年份选择器');
      });
      return;
    }
    
    // 如果选择月份，打开月份选择器
    if (range === 'month') {
      // 创建月份选择器数据
      const monthList = [];
      for (let i = 1; i <= 12; i++) {
        monthList.push(i + '月');
      }
      
      // 计算当前选中月份在列表中的索引
      const monthIndex = this.data.currentMonth;
      
      const next = {
        dateRange: 'month',
        showMonthPicker: true,
        showYearPicker: false,
        showDateRangePicker: false,
        monthList: monthList,
        monthIndex: monthIndex,
        // 统一去除年→月限制，按当前选择展示
        showYear: this.data.currentYear,
        showMonth: this.data.currentMonth,
        _guardFromYearToMonth: false
      }
      
      this.setData(next, () => {
        console.log('已切换到月份范围，打开月份选择器; 展示:', this.data.showYear, this.data.showMonth + 1, '守护:', this.data._guardFromYearToMonth);
      });
      return;
    }

    const next = {
      dateRange: range,
      showYearPicker: false,
      showMonthPicker: false,
      showDateRangePicker: false
    };

    // 如果从自定义切换到其他范围，重置自定义日期为当前月
    if (this.data.dateRange === 'custom' && range !== 'custom') {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      next.customStartDate = startOfMonth;
      next.customEndDate = today;
    }

    this.setData(next, () => {
      console.log('日期范围已更新为:', this.data.dateRange);
    });
    this.loadReportData();
    setTimeout(() => this.updateCharts(), 300);
  },

  // 年/月选择器开关
  showYearPicker() { 
    console.log('打开年份选择器');
    // 创建年份选择器数据，确保当前年份在选择范围内
    const currentYear = new Date().getFullYear();
    const yearList = [];
    // 生成从当前年份-5年到当前年份+1年的选项
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      yearList.push(i + '年');
    }
    
    // 计算当前选中年份在列表中的索引
    const yearIndex = yearList.findIndex(y => parseInt(y) === this.data.currentYear);
    
    this.setData({ 
      showYearPicker: true, 
      showMonthPicker: false, 
      showDateRangePicker: false,
      yearList: yearList,
      yearIndex: yearIndex >= 0 ? yearIndex : yearList.length - 2 // 默认选中当前年份
    }); 
  },
  
  onYearChange(e) {
    console.log('年份变更', e);
    const value = e.detail && (Array.isArray(e.detail.value) ? e.detail.value[0] : e.detail.value);
    const yearIndex = Number(value);
    // 从yearList中获取选中的年份
    const yearStr = this.data.yearList[yearIndex] || new Date().getFullYear() + '年';
    const year = parseInt(yearStr);
    
    this.setData({ 
      currentYear: year, 
      showYear: year,
      dateRange: 'year', 
      showYearPicker: false,
      // 记住用户选择的年份，以便在切换到月视图时使用
      _lastSelectedYear: year
    }, () => {
      console.log('年份已更新为:', year, '日期范围:', this.data.dateRange);
    });
    this.loadReportData();
    setTimeout(() => this.updateCharts(), 80);
  },

  showMonthPicker() { 
    console.log('打开月份选择器');
    
    // 如果从年视图切换到月视图，保持当前选择的年份
    // 不需要重置年份，直接使用当前选择的年份
    
    // 创建月份选择器数据
    const monthList = [];
    for (let i = 1; i <= 12; i++) {
      monthList.push(i + '月');
    }
    
    // 计算当前选中月份在列表中的索引
    // 如果是从年视图切换过来，默认选择当前月份
    const now = new Date();
    const monthIndex = this.data.dateRange === 'year' ? now.getMonth() : this.data.currentMonth;
    
    this.setData({ 
      showMonthPicker: true, 
      showYearPicker: false, 
      showDateRangePicker: false,
      monthList: monthList,
      monthIndex: monthIndex,
      // 记录我们是从年视图切换过来的，以便在onMonthChange中特殊处理
      _fromYearView: this.data.dateRange === 'year'
    }); 
  },
  
  onMonthChange(e) {
    console.log('月份变更', e);
    const value = e.detail && (Array.isArray(e.detail.value) ? e.detail.value[0] : e.detail.value);
    const monthIndex = Number(value);
    // 月份索引从0开始，但显示从1开始
    const month = isNaN(monthIndex) ? 0 : monthIndex;

    this.setData({ 
      currentMonth: month,
      showMonth: month,
      dateRange: 'month', 
      showMonthPicker: false,
      _fromYearView: false, // 重置标记
      _guardFromYearToMonth: false
    }, () => {
      console.log('月份已更新为:', month + 1, '日期范围:', this.data.dateRange);
    });
    this.loadReportData();
    setTimeout(() => this.updateCharts(), 80);
  },

  // 修复：添加缺失的 cancelPicker 方法
  cancelPicker() {
    this.setData({
      showYearPicker: false,
      showMonthPicker: false,
      showDateRangePicker: false
    });
  },

  // 自定义日期弹窗
  showCustomDatePicker() {
    console.log('打开自定义日期选择器');
    this.setData({
      dateRange: 'custom',
      showDateRangePicker: true,
      showYearPicker: false,
      showMonthPicker: false
    }, () => {
      console.log('已切换到自定义日期范围，打开日期选择器');
    });
  },
  
  onStartDateChange(e) { 
    this.setData({ customStartDate: e.detail.value }); 
  },
  
  onEndDateChange(e) { 
    this.setData({ customEndDate: e.detail.value }); 
  },
  
  confirmCustomDateRange() {
    const { customStartDate, customEndDate } = this.data;
    if (!customStartDate || !customEndDate) {
      wx.showToast({ title: '请选择开始和结束日期', icon: 'none' });
      return;
    }
    if (new Date(customStartDate) > new Date(customEndDate)) {
      wx.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' });
      return;
    }
    this.setData({ 
      dateRange: 'custom', 
      showDateRangePicker: false 
    }, () => {
      console.log('自定义日期已确认:', customStartDate, '至', customEndDate);
    });
    this.loadReportData();
  },

  // 顶部导航页签切换
  onTapPage() {
    // 点击页面空白区域，关闭所有弹出层
    if (this.data.showOptions || this.data.showToolsMenu) {
      this.setData({ 
        showOptions: false,
        showToolsMenu: false
      });
    }
  },
  
  onTabChange(e) {
    const idx = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index;
    const index = typeof idx !== 'undefined' ? Number(idx) : 0;
    this.setData({ currentTab: index });
    this.loadReportData();
  },

  // 分类类型切换（支出/收入）
  onCategoryTypeChange(e) {
    const type = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.type;
    if (type && (type === 'expense' || type === 'income')) {
      this.setData({ categoryType: type });
    }
  },

  // 修复：添加完整的 loadReportData 方法
  async loadReportData() {
    this.setData({ loading: true });
    
    try {
      const { dateRange, currentYear, currentMonth, customStartDate, customEndDate } = this.data;
      let startDate, endDate;
      
      // 根据日期范围计算起止日期
      if (dateRange === 'month') {
        startDate = new Date(currentYear, currentMonth, 1);
        endDate = new Date(currentYear, currentMonth + 1, 0);
      } else if (dateRange === 'year') {
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 11, 31);
      } else if (dateRange === 'custom') {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
      }
      
      // 加载各类数据
      const [summary, categoryStats, assetData, trendData, tagStats] = await Promise.all([
        this.loadSummaryData(startDate, endDate),
        this.loadCategoryStats(startDate, endDate),
        this.loadAssetData(startDate, endDate),
        this.loadTrendData(startDate, endDate),
        this.loadTagStats(startDate, endDate)
      ]);
      
      this.setData({
        summary,
        categoryStats,
        assetData,
        trendData,
        tagStats,
        loading: false
      });
      
      // 延迟更新图表以确保DOM已渲染
      setTimeout(() => {
        this.updateCharts();
      }, 100);
      
    } catch (error) {
      console.error('加载报表数据失败:', error);
      this.setData({ loading: false });
      wx.showToast({ title: '数据加载失败', icon: 'error' });
    }
  },

  // 修复：添加数据加载方法
  async loadSummaryData(startDate, endDate) {
    try {
      const transactions = wx.getStorageSync('transactions') || [];
      const filteredTransactions = transactions.filter(t => {
        const transDate = new Date(t.date);
        return transDate >= startDate && transDate <= endDate;
      });
      
      const totalIncome = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
        
      const totalExpense = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        totalIncomeDisplay: (totalIncome / 100).toFixed(2),
        totalExpenseDisplay: (totalExpense / 100).toFixed(2),
        balanceDisplay: ((totalIncome - totalExpense) / 100).toFixed(2)
      };
    } catch (error) {
      console.error('加载汇总数据失败:', error);
      return { totalIncome: 0, totalExpense: 0, balance: 0 };
    }
  },

  async loadCategoryStats(startDate, endDate) {
    try {
      const transactions = wx.getStorageSync('transactions') || [];
      const categories = wx.getStorageSync('categories') || [];
      
      const filteredTransactions = transactions.filter(t => {
        const transDate = new Date(t.date);
        return transDate >= startDate && transDate <= endDate;
      });
      
      const expenseStats = this.calculateCategoryStats(filteredTransactions, 'expense', categories);
      const incomeStats = this.calculateCategoryStats(filteredTransactions, 'income', categories);
      
      return { expense: expenseStats, income: incomeStats };
    } catch (error) {
      console.error('加载分类统计失败:', error);
      return { expense: [], income: [] };
    }
  },

  calculateCategoryStats(transactions, type, categories) {
    const stats = {};
    const typeTransactions = transactions.filter(t => t.type === type);
    
    typeTransactions.forEach(t => {
      const categoryId = t.categoryId || 'unknown';
      if (!stats[categoryId]) {
        const category = categories.find(c => c.id === categoryId);
        stats[categoryId] = {
          id: categoryId,
          name: category ? category.name : '未分类',
          icon: category ? category.icon : '❓',
          amount: 0,
          count: 0
        };
      }
      stats[categoryId].amount += t.amount || 0;
      stats[categoryId].count += 1;
    });
    
    return Object.values(stats)
      .map(stat => ({
        ...stat,
        amountDisplay: (stat.amount / 100).toFixed(2)
      }))
      .sort((a, b) => b.amount - a.amount);
  },

  async loadAssetData(startDate, endDate) {
    try {
      // 根据时间范围加载对应的资产数据
      const ymKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      
      let accounts = wx.getStorageSync(`accounts:${ymKey}`) || wx.getStorageSync('accounts') || [];
      let investments = wx.getStorageSync(`investments:${ymKey}`) || wx.getStorageSync('investments') || [];
      
      const accountsTotal = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
      const investmentsTotal = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      const totalAssets = accountsTotal + investmentsTotal;
      
      // 计算资产分布
      const assetsDistribution = [
        { name: '账户资产', value: accountsTotal, color: '#4CAF50' },
        { name: '投资资产', value: investmentsTotal, color: '#2196F3' }
      ].filter(item => item.value > 0);
      
      return {
        totalAssets,
        totalAssetsDisplay: (totalAssets / 100).toFixed(2),
        accountsTotal,
        accountsTotalDisplay: (accountsTotal / 100).toFixed(2),
        investmentsTotal,
        investmentsTotalDisplay: (investmentsTotal / 100).toFixed(2),
        assetsDistribution,
        accounts: accounts.map(acc => ({
          ...acc,
          balanceDisplay: (acc.balance / 100).toFixed(2)
        })),
        investments: investments.map(inv => ({
          ...inv,
          amountDisplay: (inv.amount / 100).toFixed(2)
        }))
      };
    } catch (error) {
      console.error('加载资产数据失败:', error);
      return { totalAssets: 0, assetsDistribution: [], accounts: [], investments: [] };
    }
  },

  async loadTrendData(startDate, endDate) {
    try {
      const transactions = wx.getStorageSync('transactions') || [];
      const assetHistory = wx.getStorageSync('assetHistory') || [];
      
      // 按日期分组统计趋势数据
      const trendMap = {};
      const filteredTransactions = transactions.filter(t => {
        const transDate = new Date(t.date);
        return transDate >= startDate && transDate <= endDate;
      });
      
      filteredTransactions.forEach(t => {
        const dateKey = t.date.slice(0, 10); // YYYY-MM-DD
        if (!trendMap[dateKey]) {
          trendMap[dateKey] = { date: dateKey, income: 0, expense: 0, assets: 0 };
        }
        if (t.type === 'income') {
          trendMap[dateKey].income += t.amount || 0;
        } else if (t.type === 'expense') {
          trendMap[dateKey].expense += t.amount || 0;
        }
      });
      
      // 添加资产变化数据
      assetHistory.forEach(history => {
        const dateKey = history.timestamp.slice(0, 10);
        if (trendMap[dateKey]) {
          trendMap[dateKey].assets = history.totalAssets || 0;
        }
      });
      
      return Object.values(trendMap)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(item => ({
          ...item,
          incomeDisplay: (item.income / 100).toFixed(2),
          expenseDisplay: (item.expense / 100).toFixed(2),
          assetsDisplay: (item.assets / 100).toFixed(2)
        }));
    } catch (error) {
      console.error('加载趋势数据失败:', error);
      return [];
    }
  },

  async loadTagStats(startDate, endDate) {
    try {
      const transactions = wx.getStorageSync('transactions') || [];
      const tags = wx.getStorageSync('tags') || [];
      
      const filteredTransactions = transactions.filter(t => {
        const transDate = new Date(t.date);
        return transDate >= startDate && transDate <= endDate && t.tags && t.tags.length > 0;
      });
      
      const expenseStats = this.calculateTagStats(filteredTransactions, 'expense', tags);
      const incomeStats = this.calculateTagStats(filteredTransactions, 'income', tags);
      
      return { expense: expenseStats, income: incomeStats };
    } catch (error) {
      console.error('加载标签统计失败:', error);
      return { expense: [], income: [] };
    }
  },

  calculateTagStats(transactions, type, tags) {
    const stats = {};
    const typeTransactions = transactions.filter(t => t.type === type);
    
    typeTransactions.forEach(t => {
      if (t.tags && Array.isArray(t.tags)) {
        t.tags.forEach(tagId => {
          if (!stats[tagId]) {
            const tag = tags.find(tag => tag.id === tagId);
            stats[tagId] = {
              id: tagId,
              name: tag ? tag.name : '未知标签',
              color: tag ? tag.color : '#999999',
              amount: 0,
              count: 0
            };
          }
          stats[tagId].amount += t.amount || 0;
          stats[tagId].count += 1;
        });
      }
    });
    
    return Object.values(stats)
      .map(stat => ({
        ...stat,
        amountDisplay: (stat.amount / 100).toFixed(2)
      }))
      .sort((a, b) => b.amount - a.amount);
  },

  // 修复：添加完整的 updateCharts 方法
  updateCharts() {
    if (this._chartTimer) clearTimeout(this._chartTimer);
    
    this._chartTimer = setTimeout(() => {
      try {
        // 更新分类统计图表
        this.updateCategoryChart();
        
        // 更新资产分布图表
        this.updateAssetChart();
        
        // 更新趋势图表
        this.updateTrendChart();
        
        console.log('图表更新完成');
      } catch (error) {
        console.error('更新图表失败:', error);
      }
    }, 50);
  },

  updateCategoryChart() {
    // 实现分类统计图表更新逻辑
    const { categoryStats, categoryType } = this.data;
    const data = categoryStats[categoryType] || [];
    
    if (data.length === 0) return;
    
    // 这里可以集成图表库如 ECharts 或 F2
    console.log('更新分类图表:', data);
  },

  updateAssetChart() {
    // 实现资产分布图表更新逻辑
    const { assetData } = this.data;
    
    if (!assetData.assetsDistribution || assetData.assetsDistribution.length === 0) return;
    
    console.log('更新资产图表:', assetData.assetsDistribution);
  },

  updateTrendChart() {
    // 实现趋势图表更新逻辑
    const { trendData } = this.data;
    
    if (!trendData || trendData.length === 0) return;
    
    console.log('更新趋势图表:', trendData);
  }
});