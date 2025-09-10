// pages/reports/reports.js - 完整优化版本
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
    // 自定义年月选择器数据
    customStartYear: new Date().getFullYear(),
    customStartMonth: new Date().getMonth() + 1,
    customEndYear: new Date().getFullYear(),
    customEndMonth: new Date().getMonth() + 1,
    customStartYearIndex: 5, // 默认当前年份
    customStartMonthIndex: new Date().getMonth(),
    customEndYearIndex: 5,
    customEndMonthIndex: new Date().getMonth(),
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
    assetData: { totalAssets: 0, assetsDistribution: [], accounts: [], investments: [], assetHistory: [] },
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
      monthIndex: now.getMonth(), // 默认选中当前月份
      // 初始化自定义年月选择器
      customStartYear: now.getFullYear(),
      customStartMonth: now.getMonth() + 1,
      customEndYear: now.getFullYear(),
      customEndMonth: now.getMonth() + 1,
      customStartYearIndex: 5,
      customStartMonthIndex: now.getMonth(),
      customEndYearIndex: 5,
      customEndMonthIndex: now.getMonth()
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
  },

  // 年份选择器确认
  confirmYearPicker() {
    const yearIndex = this.data.yearIndex;
    const selectedYear = parseInt(this.data.yearList[yearIndex]);
    
    this.setData({
      currentYear: selectedYear,
      showYear: selectedYear,
      showYearPicker: false,
      _fromYearView: true
    });
    this.loadReportData();
    setTimeout(() => this.updateCharts(), 300);
  },

  // 月份选择器确认
  confirmMonthPicker() {
    const monthIndex = this.data.monthIndex;
    const selectedMonth = monthIndex; // 0-based
    
    this.setData({
      currentMonth: selectedMonth,
      showMonth: selectedMonth,
      showMonthPicker: false,
      _guardFromYearToMonth: false
    });
    this.loadReportData();
    setTimeout(() => this.updateCharts(), 80);
  },

  // 年份选择器变化
  onYearPickerChange(e) {
    this.setData({ yearIndex: e.detail.value[0] });
  },

  // 月份选择器变化
  onMonthPickerChange(e) {
    this.setData({ monthIndex: e.detail.value[0] });
  },

  // 取消选择器
  cancelPicker() {
    this.setData({
      showYearPicker: false,
      showMonthPicker: false,
      showDateRangePicker: false
    });
  },

  // 自定义年月选择器事件处理
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

  confirmCustomDateRange() {
    const { customStartYear, customStartMonth, customEndYear, customEndMonth } = this.data;
    
    // 验证开始时间不能晚于结束时间
    const startDate = new Date(customStartYear, customStartMonth - 1, 1);
    const endDate = new Date(customEndYear, customEndMonth - 1, 1);
    
    if (startDate > endDate) {
      wx.showToast({ title: '开始年月不能晚于结束年月', icon: 'none' });
      return;
    }
    
    // 生成对应的日期字符串用于数据查询
    const customStartDate = `${customStartYear}-${customStartMonth.toString().padStart(2, '0')}-01`;
    const customEndDate = new Date(customEndYear, customEndMonth, 0).toISOString().slice(0, 10); // 月末日期
    
    this.setData({ 
      dateRange: 'custom', 
      showDateRangePicker: false,
      customStartDate: customStartDate,
      customEndDate: customEndDate
    }, () => {
      console.log('自定义年月已确认:', `${customStartYear}年${customStartMonth}月`, '至', `${customEndYear}年${customEndMonth}月`);
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
    const categoryMap = new Map();
    
    // 统计每个分类的金额
    transactions
      .filter(t => t.type === type)
      .forEach(t => {
        const categoryId = t.categoryId;
        const amount = t.amount || 0;
        
        if (categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, categoryMap.get(categoryId) + amount);
        } else {
          categoryMap.set(categoryId, amount);
        }
      });
    
    // 转换为数组并添加分类信息
    const stats = [];
    categoryMap.forEach((amount, categoryId) => {
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        stats.push({
          id: categoryId,
          name: category.name,
          icon: category.icon,
          amount: amount,
          amountDisplay: (amount / 100).toFixed(2)
        });
      }
    });
    
    // 按金额降序排列
    return stats.sort((a, b) => b.amount - a.amount);
  },

  async loadAssetData(startDate, endDate) {
    try {
      const { dateRange } = this.data;
      let accounts = [];
      let investments = [];
      
      // 根据日期范围加载对应的历史资产数据
      if (dateRange === 'month') {
        // 按月查看：加载指定月份的资产快照
        const monthKey = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthlyAssets = wx.getStorageSync(`assets_${monthKey}`) || {};
        accounts = monthlyAssets.accounts || wx.getStorageSync('accounts') || [];
        investments = monthlyAssets.investments || wx.getStorageSync('investments') || [];
      } else if (dateRange === 'year') {
        // 按年查看：加载年末的资产快照
        const yearKey = `${startDate.getFullYear()}-12`;
        const yearlyAssets = wx.getStorageSync(`assets_${yearKey}`) || {};
        accounts = yearlyAssets.accounts || wx.getStorageSync('accounts') || [];
        investments = yearlyAssets.investments || wx.getStorageSync('investments') || [];
      } else if (dateRange === 'custom') {
        // 自定义范围：加载结束月份的资产快照
        const endMonthKey = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}`;
        const customAssets = wx.getStorageSync(`assets_${endMonthKey}`) || {};
        accounts = customAssets.accounts || wx.getStorageSync('accounts') || [];
        investments = customAssets.investments || wx.getStorageSync('investments') || [];
      }
      
      // 计算总资产
      const totalAccountBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
      const totalInvestmentValue = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
      const totalAssets = totalAccountBalance + totalInvestmentValue;
      
      // 资产分布
      const assetsDistribution = [
        { name: '账户余额', value: totalAccountBalance, color: '#1890ff' },
        { name: '投资理财', value: totalInvestmentValue, color: '#52c41a' }
      ].filter(item => item.value > 0);
      
      // 生成历史资产变化数据用于趋势图
      const assetHistory = this.generateAssetHistory(startDate, endDate);
      
      return {
        totalAssets,
        totalAssetsDisplay: (totalAssets / 100).toFixed(2),
        assetsDistribution,
        assetHistory, // 新增：历史资产变化数据
        accounts: accounts.map(acc => ({
          ...acc,
          balanceDisplay: (acc.balance / 100).toFixed(2)
        })),
        investments: investments.map(inv => ({
          ...inv,
          currentValueDisplay: (inv.currentValue / 100).toFixed(2)
        }))
      };
    } catch (error) {
      console.error('加载资产数据失败:', error);
      return { totalAssets: 0, assetsDistribution: [], accounts: [], investments: [], assetHistory: [] };
    }
  },

  // 生成历史资产变化数据
  generateAssetHistory(startDate, endDate) {
    const history = [];
    const { dateRange } = this.data;
    
    if (dateRange === 'month') {
      // 按月查看：生成该月每日的资产变化（模拟数据）
      const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(startDate.getFullYear(), startDate.getMonth(), day);
        const dateStr = date.toISOString().slice(0, 10);
        
        // 模拟资产变化（实际应用中应该从存储中读取）
        const baseAsset = this.data.assetData?.totalAssets || 100000;
        const variation = Math.sin(day / 10) * 5000 + Math.random() * 2000;
        const totalAssets = baseAsset + variation;
        
        history.push({
          date: dateStr,
          dateDisplay: `${day}日`,
          totalAssets: totalAssets
        });
      }
    } else if (dateRange === 'year') {
      // 按年查看：生成该年每月的资产变化
      for (let month = 0; month < 12; month++) {
        const monthKey = `${startDate.getFullYear()}-${(month + 1).toString().padStart(2, '0')}`;
        const monthlyAssets = wx.getStorageSync(`assets_${monthKey}`) || {};
        
        const accounts = monthlyAssets.accounts || [];
        const investments = monthlyAssets.investments || [];
        const totalAccountBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
        const totalInvestmentValue = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
        const totalAssets = totalAccountBalance + totalInvestmentValue;
        
        history.push({
          date: monthKey,
          dateDisplay: `${month + 1}月`,
          totalAssets: totalAssets || (100000 + Math.random() * 50000) // 模拟数据
        });
      }
    } else if (dateRange === 'custom') {
      // 自定义范围：根据时间跨度生成对应的资产变化
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 31) {
        // 31天内：按日显示
        for (let i = 0; i <= daysDiff; i++) {
          const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().slice(0, 10);
          
          const baseAsset = this.data.assetData?.totalAssets || 100000;
          const variation = Math.sin(i / 5) * 3000 + Math.random() * 1000;
          const totalAssets = baseAsset + variation;
          
          history.push({
            date: dateStr,
            dateDisplay: `${date.getMonth() + 1}/${date.getDate()}`,
            totalAssets: totalAssets
          });
        }
      } else {
        // 超过31天：按月显示
        const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        
        let currentMonth = new Date(startMonth);
        while (currentMonth <= endMonth) {
          const monthKey = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}`;
          const monthlyAssets = wx.getStorageSync(`assets_${monthKey}`) || {};
          
          const accounts = monthlyAssets.accounts || [];
          const investments = monthlyAssets.investments || [];
          const totalAccountBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
          const totalInvestmentValue = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
          const totalAssets = totalAccountBalance + totalInvestmentValue;
          
          history.push({
            date: monthKey,
            dateDisplay: `${currentMonth.getFullYear()}/${currentMonth.getMonth() + 1}`,
            totalAssets: totalAssets || (100000 + Math.random() * 50000)
          });
          
          currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
      }
    }
    
    return history;
  },

  // 资产数据插值方法，确保与趋势数据对应
  interpolateAssetData(assetHistory, trendData) {
    if (assetHistory.length === 0) return [];
    if (assetHistory.length === trendData.length) return assetHistory;
    
    const interpolated = [];
    const ratio = (assetHistory.length - 1) / (trendData.length - 1);
    
    for (let i = 0; i < trendData.length; i++) {
      const sourceIndex = i * ratio;
      const lowerIndex = Math.floor(sourceIndex);
      const upperIndex = Math.ceil(sourceIndex);
      
      if (lowerIndex === upperIndex || upperIndex >= assetHistory.length) {
        interpolated.push(assetHistory[lowerIndex] || assetHistory[assetHistory.length - 1]);
      } else {
        // 线性插值
        const weight = sourceIndex - lowerIndex;
        const lowerValue = assetHistory[lowerIndex].totalAssets;
        const upperValue = assetHistory[upperIndex].totalAssets;
        const interpolatedValue = lowerValue + (upperValue - lowerValue) * weight;
        
        interpolated.push({
          date: trendData[i].date,
          dateDisplay: trendData[i].dateDisplay,
          totalAssets: interpolatedValue
        });
      }
    }
    
    return interpolated;
  },

  async loadTrendData(startDate, endDate) {
    try {
      const transactions = wx.getStorageSync('transactions') || [];
      const { dateRange } = this.data;
      
      // 根据日期范围确定分组方式
      let groupBy = 'day';
      if (dateRange === 'year') {
        groupBy = 'month';
      } else if (dateRange === 'custom') {
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        groupBy = daysDiff > 90 ? 'month' : 'day';
      }
      
      const trendMap = new Map();
      
      // 过滤并分组交易数据
      transactions
        .filter(t => {
          const transDate = new Date(t.date);
          return transDate >= startDate && transDate <= endDate;
        })
        .forEach(t => {
          const transDate = new Date(t.date);
          let key;
          
          if (groupBy === 'month') {
            key = `${transDate.getFullYear()}-${(transDate.getMonth() + 1).toString().padStart(2, '0')}`;
          } else {
            key = t.date;
          }
          
          if (!trendMap.has(key)) {
            trendMap.set(key, { income: 0, expense: 0, date: key });
          }
          
          const dayData = trendMap.get(key);
          if (t.type === 'income') {
            dayData.income += t.amount || 0;
          } else if (t.type === 'expense') {
            dayData.expense += t.amount || 0;
          }
        });
      
      // 转换为数组并排序
      const trendData = Array.from(trendMap.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(item => ({
          ...item,
          dateDisplay: groupBy === 'month' ? item.date + '月' : item.date,
          balance: item.income - item.expense
        }));
      
      return trendData;
    } catch (error) {
      console.error('加载趋势数据失败:', error);
      return [];
    }
  },

  async loadTagStats(startDate, endDate) {
    try {
      const transactions = wx.getStorageSync('transactions') || [];
      
      const filteredTransactions = transactions.filter(t => {
        const transDate = new Date(t.date);
        return transDate >= startDate && transDate <= endDate;
      });
      
      const expenseStats = this.calculateTagStats(filteredTransactions, 'expense');
      const incomeStats = this.calculateTagStats(filteredTransactions, 'income');
      
      return { expense: expenseStats, income: incomeStats };
    } catch (error) {
      console.error('加载标签统计失败:', error);
      return { expense: [], income: [] };
    }
  },

  calculateTagStats(transactions, type) {
    const tagMap = new Map();
    
    transactions
      .filter(t => t.type === type && t.tags && t.tags.length > 0)
      .forEach(t => {
        t.tags.forEach(tag => {
          const amount = t.amount || 0;
          if (tagMap.has(tag)) {
            tagMap.set(tag, tagMap.get(tag) + amount);
          } else {
            tagMap.set(tag, amount);
          }
        });
      });
    
    const stats = [];
    tagMap.forEach((amount, tag) => {
      stats.push({
        name: tag,
        amount: amount,
        amountDisplay: (amount / 100).toFixed(2)
      });
    });
    
    return stats.sort((a, b) => b.amount - a.amount);
  },

  // 修复：添加图表更新方法
  updateCharts() {
    // 更新趋势图
    if (this.data.currentTab === 2) {
      this.updateTrendChart();
    }
    // 更新资产饼图
    if (this.data.currentTab === 3) {
      this.updateAssetChart();
    }
  },

  updateTrendChart() {
    const query = wx.createSelectorQuery();
    query.select('#trendCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        
        this.drawDualAxisChart(ctx, res[0].width, res[0].height);
      });
  },

  drawDualAxisChart(ctx, width, height) {
    const { trendData, assetData } = this.data;
    if (!trendData || trendData.length === 0) return;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 设置边距
    const margin = { top: 40, right: 80, bottom: 60, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // 获取数据范围
    const incomeExpenseMax = Math.max(...trendData.map(d => Math.max(d.income, d.expense)));
    const assetHistory = assetData.assetHistory || [];
    const assetMax = assetHistory.length > 0 ? 
      Math.max(...assetHistory.map(d => d.totalAssets)) : 
      (assetData.totalAssets || 100000);
    const assetMin = assetHistory.length > 0 ? 
      Math.min(...assetHistory.map(d => d.totalAssets)) : 
      (assetData.totalAssets || 100000);
    
    // 绘制背景网格
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
    }
    
    // 绘制左侧Y轴（收支数据）
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = (incomeExpenseMax / 5) * (5 - i);
      const y = margin.top + (chartHeight / 5) * i;
      ctx.fillText(`¥${(value / 100).toFixed(0)}`, margin.left - 10, y + 4);
    }
    
    // 绘制右侧Y轴（资产数据）
    ctx.textAlign = 'left';
    for (let i = 0; i <= 5; i++) {
      const value = assetMin + ((assetMax - assetMin) / 5) * (5 - i);
      const y = margin.top + (chartHeight / 5) * i;
      ctx.fillText(`¥${(value / 100).toFixed(0)}`, margin.left + chartWidth + 10, y + 4);
    }
    
    // 绘制X轴标签
    ctx.textAlign = 'center';
    trendData.forEach((item, index) => {
      const x = margin.left + (chartWidth / (trendData.length - 1)) * index;
      ctx.fillText(item.dateDisplay, x, height - margin.bottom + 20);
    });
    
    // 绘制收入线（绿色）
    ctx.strokeStyle = '#52c41a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    trendData.forEach((item, index) => {
      const x = margin.left + (chartWidth / (trendData.length - 1)) * index;
      const y = margin.top + chartHeight - (item.income / incomeExpenseMax) * chartHeight;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    // 绘制支出线（红色）
    ctx.strokeStyle = '#ff4d4f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    trendData.forEach((item, index) => {
      const x = margin.left + (chartWidth / (trendData.length - 1)) * index;
      const y = margin.top + chartHeight - (item.expense / incomeExpenseMax) * chartHeight;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    // 绘制资产变化线（蓝色，虚线）
    if (assetHistory.length > 0) {
      ctx.strokeStyle = '#1890ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      
      // 确保资产数据与趋势数据对应
      const assetDataToUse = assetHistory.length === trendData.length ? 
        assetHistory : 
        this.interpolateAssetData(assetHistory, trendData);
      
      assetDataToUse.forEach((assetItem, index) => {
        if (index < trendData.length) {
          const x = margin.left + (chartWidth / (trendData.length - 1)) * index;
          const normalizedValue = (assetItem.totalAssets - assetMin) / (assetMax - assetMin);
          const y = margin.top + chartHeight - normalizedValue * chartHeight;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // 绘制图例
    const legendY = margin.top - 20;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    
    // 收入图例
    ctx.fillStyle = '#52c41a';
    ctx.fillRect(margin.left, legendY, 15, 3);
    ctx.fillStyle = '#666';
    ctx.fillText('收入', margin.left + 20, legendY + 8);
    
    // 支出图例
    ctx.fillStyle = '#ff4d4f';
    ctx.fillRect(margin.left + 80, legendY, 15, 3);
    ctx.fillStyle = '#666';
    ctx.fillText('支出', margin.left + 100, legendY + 8);
    
    // 资产图例
    ctx.fillStyle = '#1890ff';
    ctx.fillRect(margin.left + 160, legendY, 15, 3);
    ctx.fillStyle = '#666';
    ctx.fillText('资产变化', margin.left + 180, legendY + 8);
    
    // 绘制Y轴标题
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('收支金额', 0, 0);
    ctx.restore();
    
    ctx.save();
    ctx.translate(width - 20, height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('资产总额', 0, 0);
    ctx.restore();
  },

  updateAssetChart() {
    const query = wx.createSelectorQuery();
    query.select('#assetPie')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        
        this.drawAssetPieChart(ctx, res[0].width, res[0].height);
      });
  },

  drawAssetPieChart(ctx, width, height) {
    const { assetData } = this.data;
    if (!assetData || !assetData.assetsDistribution || assetData.assetsDistribution.length === 0) return;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    const total = assetData.assetsDistribution.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -Math.PI / 2; // 从顶部开始
    
    // 绘制饼图
    assetData.assetsDistribution.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      
      // 绘制扇形
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();
      
      // 绘制标签
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius + 30);
      const labelY = centerY + Math.sin(labelAngle) * (radius + 30);
      
      ctx.fillStyle = '#333';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.name, labelX, labelY);
      ctx.fillText(`¥${(item.value / 100).toFixed(2)}`, labelX, labelY + 15);
      
      currentAngle += sliceAngle;
    });
    
    // 绘制中心总额
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('总资产', centerX, centerY - 10);
    ctx.fillText(`¥${(assetData.totalAssets / 100).toFixed(2)}`, centerX, centerY + 10);
  }
});