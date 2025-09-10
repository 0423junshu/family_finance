// pages/reports/reports-fixed.js
/**
 * 修复版报表页面
 * 解决了数据同步、图表渲染、状态管理等问题
 */

const dataSyncService = require('../../services/data-sync');
const chartRenderer = require('../../services/chart-renderer');
const amountFormatter = require('../../services/amount-formatter');

Page({
  data: {
    // 日期筛选
    dateRange: 'month', // 'month' | 'year' | 'custom'
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0-based
    customStartDate: '',
    customEndDate: '',
    
    // 选择器状态（简化管理）
    activePickerType: null, // 'year' | 'month' | 'dateRange' | null
    yearList: [],
    monthList: [],
    yearIndex: 0,
    monthIndex: 0,
    
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
  },

  async onLoad() {
    console.log('报表页面加载');
    
    try {
      // 初始化日期数据
      this.initDateData();
      
      // 检查网络状态
      await dataSyncService.checkNetworkStatus();
      
      // 尝试同步数据
      await dataSyncService.syncData();
      
      // 加载报表数据
      await this.loadReportData();
      
    } catch (error) {
      console.error('页面初始化失败:', error);
      this.handleError(error, '页面初始化失败');
    }
  },

  /**
   * 初始化日期相关数据
   */
  initDateData() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // 创建年份选择器数据
    const currentYear = now.getFullYear();
    const yearList = [];
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
      customStartDate: startOfMonth.toISOString().slice(0, 10),
      customEndDate: endOfMonth.toISOString().slice(0, 10),
      yearList: yearList,
      yearIndex: 5, // 默认选中当前年份
      monthList: monthList,
      monthIndex: now.getMonth()
    });
  },

  /**
   * 日期范围切换
   */
  onDateRangeChange(e) {
    const range = e.currentTarget.dataset.range;
    if (!range) return;

    console.log('切换到日期范围:', range);

    if (range === 'custom') {
      this.showPicker('dateRange');
    } else if (range === 'year') {
      this.showPicker('year');
    } else if (range === 'month') {
      this.showPicker('month');
    } else {
      this.setData({ dateRange: range });
      this.loadReportData();
    }
  },

  /**
   * 显示选择器
   */
  showPicker(type) {
    // 关闭其他选择器
    this.closePicker();
    
    const updateData = {
      activePickerType: type,
      dateRange: type === 'dateRange' ? 'custom' : type
    };
    
    // 设置对应的选择器显示状态
    updateData[`show${type.charAt(0).toUpperCase() + type.slice(1)}Picker`] = true;
    
    this.setData(updateData);
  },

  /**
   * 关闭选择器
   */
  closePicker() {
    const { activePickerType } = this.data;
    
    if (activePickerType) {
      const updateData = {
        activePickerType: null
      };
      
      updateData[`show${activePickerType.charAt(0).toUpperCase() + activePickerType.slice(1)}Picker`] = false;
      
      this.setData(updateData);
    }
  },

  /**
   * 年份选择变化
   */
  onYearChange(e) {
    const value = Array.isArray(e.detail.value) ? e.detail.value[0] : e.detail.value;
    const yearIndex = Number(value);
    const yearStr = this.data.yearList[yearIndex] || (new Date().getFullYear() + '年');
    const year = parseInt(yearStr);
    
    this.setData({
      currentYear: year,
      yearIndex: yearIndex,
      activePickerType: null,
      showYearPicker: false
    });
    
    this.loadReportData();
  },

  /**
   * 月份选择变化
   */
  onMonthChange(e) {
    const value = Array.isArray(e.detail.value) ? e.detail.value[0] : e.detail.value;
    const monthIndex = Number(value);
    
    this.setData({
      currentMonth: monthIndex,
      monthIndex: monthIndex,
      activePickerType: null,
      showMonthPicker: false
    });
    
    this.loadReportData();
  },

  /**
   * 自定义日期变化
   */
  onStartDateChange(e) {
    this.setData({ customStartDate: e.detail.value });
  },

  onEndDateChange(e) {
    this.setData({ customEndDate: e.detail.value });
  },

  /**
   * 确认自定义日期范围
   */
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
      activePickerType: null,
      showDateRangePicker: false
    });
    
    this.loadReportData();
  },

  /**
   * 页签切换
   */
  onTabChange(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ currentTab: index });
    
    // 延迟更新图表，确保页面切换完成
    setTimeout(() => {
      this.updateCharts();
    }, 100);
  },

  /**
   * 分类类型切换
   */
  onCategoryTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    if (type && (type === 'expense' || type === 'income')) {
      this.setData({ categoryType: type });
    }
  },

  /**
   * 加载报表数据
   */
  async loadReportData() {
    this.setData({ loading: true, errorMessage: '' });
    
    try {
      // 构建查询参数
      const params = this.buildQueryParams();
      
      // 获取交易数据
      const transactions = await dataSyncService.getTransactions(params);
      
      // 生成报表数据
      const reportData = this.generateReportData(transactions, params);
      
      // 更新页面数据
      this.setData({
        loading: false,
        isEmpty: transactions.length === 0,
        ...reportData
      });
      
      // 延迟更新图表
      setTimeout(() => {
        this.updateCharts();
      }, 100);
      
    } catch (error) {
      console.error('加载报表数据失败:', error);
      this.handleError(error, '加载报表数据失败');
    }
  },

  /**
   * 构建查询参数
   */
  buildQueryParams() {
    const { dateRange, currentYear, currentMonth, customStartDate, customEndDate } = this.data;
    
    let params = {};
    
    if (dateRange === 'month') {
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);
      
      params = {
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        periodType: 'month',
        year: currentYear,
        month: currentMonth + 1
      };
    } else if (dateRange === 'year') {
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear, 11, 31);
      
      params = {
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        periodType: 'year',
        year: currentYear
      };
    } else if (dateRange === 'custom') {
      params = {
        startDate: customStartDate,
        endDate: customEndDate,
        periodType: 'custom'
      };
    }
    
    return params;
  },

  /**
   * 生成报表数据
   */
  generateReportData(transactions, params) {
    // 计算汇总数据
    const summary = this.calculateSummary(transactions);
    
    // 计算分类统计
    const categoryStats = this.calculateCategoryStats(transactions);
    
    // 计算标签统计
    const tagStats = this.calculateTagStats(transactions);
    
    // 生成趋势数据
    const trendData = this.generateTrendData(transactions, params);
    
    // 获取资产数据
    const assetData = this.getAssetData();
    
    return {
      summary,
      categoryStats,
      tagStats,
      trendData,
      assetData
    };
  },

  /**
   * 计算汇总数据
   */
  calculateSummary(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        totalIncome += transaction.amount || 0;
      } else if (transaction.type === 'expense') {
        totalExpense += transaction.amount || 0;
      }
    });
    
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  },

  /**
   * 计算分类统计
   */
  calculateCategoryStats(transactions) {
    const expenseMap = {};
    const incomeMap = {};
    
    // 获取分类信息
    const categories = this.getCategories();
    
    transactions.forEach(transaction => {
      const { type, amount, categoryId } = transaction;
      
      if (type === 'expense') {
        if (!expenseMap[categoryId]) {
          expenseMap[categoryId] = { amount: 0, count: 0 };
        }
        expenseMap[categoryId].amount += amount || 0;
        expenseMap[categoryId].count += 1;
      } else if (type === 'income') {
        if (!incomeMap[categoryId]) {
          incomeMap[categoryId] = { amount: 0, count: 0 };
        }
        incomeMap[categoryId].amount += amount || 0;
        incomeMap[categoryId].count += 1;
      }
    });
    
    // 转换为数组并添加分类信息
    const expenseStats = this.formatCategoryStats(expenseMap, categories, 'expense');
    const incomeStats = this.formatCategoryStats(incomeMap, categories, 'income');
    
    return {
      expense: expenseStats,
      income: incomeStats
    };
  },

  /**
   * 格式化分类统计数据
   */
  formatCategoryStats(statsMap, categories, type) {
    const totalAmount = Object.values(statsMap).reduce((sum, stat) => sum + stat.amount, 0);
    
    return Object.keys(statsMap).map(categoryId => {
      const stat = statsMap[categoryId];
      const category = categories.find(c => c._id === categoryId) || {
        _id: categoryId,
        name: '未分类',
        icon: '🏷️',
        color: '#999999'
      };
      
      return {
        id: categoryId,
        name: category.name,
        icon: category.icon,
        color: category.color,
        amount: stat.amount,
        count: stat.count,
        percentage: totalAmount > 0 ? Math.round((stat.amount / totalAmount) * 100) : 0
      };
    }).sort((a, b) => b.amount - a.amount);
  },

  /**
   * 计算标签统计
   */
  calculateTagStats(transactions) {
    const expenseMap = {};
    const incomeMap = {};
    
    transactions.forEach(transaction => {
      const { type, amount, tags } = transaction;
      
      if (!tags || !Array.isArray(tags) || tags.length === 0) {
        // 无标签的归入"其他"
        const otherName = '其他';
        if (type === 'expense') {
          if (!expenseMap[otherName]) expenseMap[otherName] = { amount: 0, count: 0 };
          expenseMap[otherName].amount += amount || 0;
          expenseMap[otherName].count += 1;
        } else if (type === 'income') {
          if (!incomeMap[otherName]) incomeMap[otherName] = { amount: 0, count: 0 };
          incomeMap[otherName].amount += amount || 0;
          incomeMap[otherName].count += 1;
        }
        return;
      }
      
      tags.forEach(tag => {
        const tagName = this.getTagName(tag);
        
        if (type === 'expense') {
          if (!expenseMap[tagName]) expenseMap[tagName] = { amount: 0, count: 0 };
          expenseMap[tagName].amount += amount || 0;
          expenseMap[tagName].count += 1;
        } else if (type === 'income') {
          if (!incomeMap[tagName]) incomeMap[tagName] = { amount: 0, count: 0 };
          incomeMap[tagName].amount += amount || 0;
          incomeMap[tagName].count += 1;
        }
      });
    });
    
    // 转换为数组格式
    const expenseStats = this.formatTagStats(expenseMap);
    const incomeStats = this.formatTagStats(incomeMap);
    
    return {
      expense: expenseStats,
      income: incomeStats
    };
  },

  /**
   * 格式化标签统计数据
   */
  formatTagStats(statsMap) {
    const totalAmount = Object.values(statsMap).reduce((sum, stat) => sum + stat.amount, 0);
    
    return Object.keys(statsMap).map(tagName => {
      const stat = statsMap[tagName];
      
      return {
        name: tagName,
        amount: stat.amount,
        count: stat.count,
        percentage: totalAmount > 0 ? Math.round((stat.amount / totalAmount) * 100) : 0
      };
    }).sort((a, b) => b.amount - a.amount);
  },

  /**
   * 生成趋势数据
   */
  generateTrendData(transactions, params) {
    const { periodType, year, month } = params;
    
    if (periodType === 'month') {
      return this.generateDailyTrend(transactions, year, month);
    } else if (periodType === 'year') {
      return this.generateMonthlyTrend(transactions, year);
    } else {
      return this.generateCustomTrend(transactions, params);
    }
  },

  /**
   * 生成日趋势数据
   */
  generateDailyTrend(transactions, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyData = Array(daysInMonth).fill().map((_, index) => ({
      date: `${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`,
      dateDisplay: `${index + 1}日`,
      income: 0,
      expense: 0,
      balance: 0
    }));
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const day = date.getDate();
      
      if (day >= 1 && day <= daysInMonth) {
        const dayData = dailyData[day - 1];
        
        if (transaction.type === 'income') {
          dayData.income += transaction.amount || 0;
        } else if (transaction.type === 'expense') {
          dayData.expense += transaction.amount || 0;
        }
        
        dayData.balance = dayData.income - dayData.expense;
      }
    });
    
    return dailyData;
  },

  /**
   * 生成月趋势数据
   */
  generateMonthlyTrend(transactions, year) {
    const monthlyData = Array(12).fill().map((_, index) => ({
      date: `${year}-${String(index + 1).padStart(2, '0')}`,
      dateDisplay: `${index + 1}月`,
      income: 0,
      expense: 0,
      balance: 0
    }));
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const month = date.getMonth();
      
      if (month >= 0 && month < 12) {
        const monthData = monthlyData[month];
        
        if (transaction.type === 'income') {
          monthData.income += transaction.amount || 0;
        } else if (transaction.type === 'expense') {
          monthData.expense += transaction.amount || 0;
        }
        
        monthData.balance = monthData.income - monthData.expense;
      }
    });
    
    return monthlyData;
  },

  /**
   * 生成自定义趋势数据
   */
  generateCustomTrend(transactions, params) {
    // 简化处理：按天分组
    const { startDate, endDate } = params;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    const trendData = [];
    
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      
      const dateStr = currentDate.toISOString().slice(0, 10);
      const dayTransactions = transactions.filter(t => 
        t.date && t.date.slice(0, 10) === dateStr
      );
      
      let income = 0;
      let expense = 0;
      
      dayTransactions.forEach(t => {
        if (t.type === 'income') income += t.amount || 0;
        if (t.type === 'expense') expense += t.amount || 0;
      });
      
      trendData.push({
        date: dateStr,
        dateDisplay: `${currentDate.getMonth() + 1}/${currentDate.getDate()}`,
        income,
        expense,
        balance: income - expense
      });
    }
    
    return trendData;
  },

  /**
   * 获取资产数据
   */
  getAssetData() {
    const accounts = wx.getStorageSync('accounts') || [];
    const investments = wx.getStorageSync('investments') || [];
    
    const totalCash = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
    const totalInvestment = investments.reduce((sum, investment) => {
      const value = investment.currentValue || investment.amount || 0;
      return sum + value;
    }, 0);
    
    return {
      totalAssets: totalCash + totalInvestment,
      accounts: accounts.map(account => ({
        ...account,
        typeName: this.getAccountTypeName(account.type)
      })),
      investments: investments.map(investment => ({
        ...investment,
        typeName: this.getInvestmentTypeName(investment.type)
      })),
      assetsDistribution: [
        { name: '现金账户', amount: totalCash, color: '#4CD964' },
        { name: '投资资产', amount: totalInvestment, color: '#FF9500' }
      ]
    };
  },

  /**
   * 更新图表
   */
  updateCharts() {
    if (this.data.activePickerType) {
      // 选择器打开时不更新图表
      return;
    }
    
    // 延迟执行，避免频繁更新
    if (this.chartUpdateTimer) {
      clearTimeout(this.chartUpdateTimer);
    }
    
    this.chartUpdateTimer = setTimeout(() => {
      this.drawTrendChart();
      this.drawAssetChart();
    }, 100);
  },

  /**
   * 绘制趋势图
   */
  async drawTrendChart() {
    if (this.data.currentTab !== 2 || !this.data.trendData.length) {
      return;
    }
    
    try {
      const canvasInfo = await chartRenderer.getCanvasContext('#trendCanvas', this);
      chartRenderer.drawTrendChart(canvasInfo, this.data.trendData);
    } catch (error) {
      console.error('绘制趋势图失败:', error);
    }
  },

  /**
   * 绘制资产图表
   */
  async drawAssetChart() {
    if (this.data.currentTab !== 3) {
      return;
    }
    
    try {
      const canvasInfo = await chartRenderer.getCanvasContext('#assetPie', this);
      // 这里可以添加饼图绘制逻辑
      // chartRenderer.drawPieChart(canvasInfo, this.data.assetData.assetsDistribution);
    } catch (error) {
      console.error('绘制资产图表失败:', error);
    }
  },

  /**
   * 错误处理
   */
  handleError(error, defaultMessage) {
    console.error(defaultMessage, error);
    
    let errorMessage = defaultMessage;
    
    if (error.code === 'NETWORK_ERROR') {
      errorMessage = '网络连接失败，请检查网络设置';
    } else if (error.code === 'DATA_ERROR') {
      errorMessage = '数据格式错误，请联系技术支持';
    } else if (error.code === 'PERMISSION_ERROR') {
      errorMessage = '权限不足，请重新登录';
    }
    
    this.setData({
      loading: false,
      isEmpty: true,
      errorMessage: errorMessage
    });
    
    wx.showModal({
      title: '操作失败',
      content: errorMessage,
      showCancel: true,
      cancelText: '取消',
      confirmText: '重试',
      success: (res) => {
        if (res.confirm) {
          this.loadReportData();
        }
      }
    });
  },

  /**
   * 辅助方法
   */
  getCategories() {
    const customCategories = wx.getStorageSync('customCategories') || [];
    const defaultCategories = [
      { _id: 'expense_1', name: '餐饮', icon: '🍽️', type: 'expense', color: '#FF6B6B' },
      { _id: 'expense_2', name: '交通', icon: '🚗', type: 'expense', color: '#4ECDC4' },
      { _id: 'expense_3', name: '购物', icon: '🛒', type: 'expense', color: '#45B7D1' },
      { _id: 'income_1', name: '工资', icon: '💰', type: 'income', color: '#32CD32' },
      { _id: 'income_2', name: '奖金', icon: '🎁', type: 'income', color: '#FFD700' }
    ];
    
    return [...defaultCategories, ...customCategories];
  },

  getTagName(tag) {
    if (typeof tag === 'string') {
      return tag.replace(/^#/, '').trim() || '其他';
    } else if (tag && (tag.name || tag.id)) {
      return tag.name || tag.id.toString();
    }
    return '其他';
  },

  getAccountTypeName(type) {
    const typeMap = {
      'cash': '现金',
      'bank': '银行卡',
      'alipay': '支付宝',
      'wechat': '微信',
      'other': '其他'
    };
    return typeMap[type] || '其他账户';
  },

  getInvestmentTypeName(type) {
    const typeMap = {
      'fund': '基金',
      'stock': '股票',
      'bank': '银行理财',
      'other': '其他投资'
    };
    return typeMap[type] || '其他投资';
  },

  /**
   * 页面事件处理
   */
  onTapPage() {
    this.closePicker();
  },

  onPullDownRefresh() {
    this.loadReportData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    // 报表页面通常不需要分页加载
  },

  onUnload() {
    // 清理定时器
    if (this.chartUpdateTimer) {
      clearTimeout(this.chartUpdateTimer);
    }
  }
});