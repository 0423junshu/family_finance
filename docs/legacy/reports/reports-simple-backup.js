// pages/reports/reports-simple.js
const reportService = require('../../services/report');
Page({
  data: {
    // 日期筛选
    dateRange: 'month', // 'month' | 'year' | 'custom'
    
    // 新增时间选择器状态
    showYearPicker: false,
    showMonthPicker: false,
    showDateRangePicker: false,
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0-based
    selectedYear: null, // 临时存储选择的年份
    selectedMonth: null, // 临时存储选择的月份
    yearList: [], // 年份列表
    monthList: [], // 月份列表
    yearIndex: 0, // 年份选择器索引
    monthIndex: 0, // 月份选择器索引
    customStartDate: '',
    customEndDate: '',
    // 统计页签
    currentTab: 0,
    categoryType: 'expense', // 'expense' | 'income'
    loading: false,
    isEmpty: false,
    // 数据占位
    summary: { totalIncome: 0, totalExpense: 0, balance: 0 },
    categoryStats: { expense: [], income: [] },
    assetData: { totalAssets: 0, assetsDistribution: [], accounts: [], investments: [] },
    trendData: [],
    tagStats: { expense: [], income: [] },
  },

  async onLoad() {
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
      selectedYear: now.getFullYear(),
      selectedMonth: now.getMonth(),
      dateRange: 'month', // 默认按月
      customStartDate: startOfMonth.toISOString().slice(0, 10),
      customEndDate: endOfMonth.toISOString().slice(0, 10),
      yearList: yearList,
      yearIndex: 5, // 默认选中当前年份
      monthList: monthList,
      monthIndex: now.getMonth() // 默认选中当前月份
    });
    
    await this.loadReportData();
  },

  // 时间选择器相关方法
  showYearPicker() {
    const currentYear = new Date().getFullYear();
    const yearList = [];
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      yearList.push(i + '年');
    }
    const yearIndex = yearList.findIndex(y => parseInt(y) === this.data.currentYear);
    this.setData({
      showYearPicker: true,
      showMonthPicker: false,
      showDateRangePicker: false,
      yearList,
      yearIndex: yearIndex >= 0 ? yearIndex : yearList.length - 2
    });
  },

  showMonthPicker() {
    const monthList = [];
    for (let i = 1; i <= 12; i++) {
      monthList.push(i + '月');
    }
    this.setData({
      showMonthPicker: true,
      showYearPicker: false,
      showDateRangePicker: false,
      monthList,
      monthIndex: this.data.currentMonth
    });
  },

  cancelPicker() {
    this.setData({
      showYearPicker: false,
      showMonthPicker: false,
      showDateRangePicker: false
    });
  },

  // 顶部日期切换：月/年/自定义
  onDateRangeChange(e) {
    const ds = e.currentTarget.dataset || {};
    const range = ds.range;
    if (!range) return;

    // 如果选择自定义，需要打开自定义日期弹窗
    if (range === 'custom') {
      this.setData({ 
        dateRange: 'custom', 
        showDateRangePicker: true, 
        showYearPicker: false, 
        showMonthPicker: false 
      });
      return;
    }
    
    // 如果选择年份，打开年份选择器
    if (range === 'year') {
      this.setData({
        dateRange: 'year',
        showYearPicker: true,
        showMonthPicker: false,
        showDateRangePicker: false
      });
      return;
    }
    
    // 如果选择月份，打开月份选择器
    if (range === 'month') {
      this.setData({
        dateRange: 'month',
        showMonthPicker: true,
        showYearPicker: false,
        showDateRangePicker: false
      });
      return;
    }

    this.setData({
      dateRange: range,
      showYearPicker: false,
      showMonthPicker: false,
      showDateRangePicker: false
    });
    
    this.loadReportData();
    setTimeout(() => this.updateCharts(), 300);
  },

  // 年份选择
  onYearChange(e) {
    const value = e.detail.value;
    const yearIndex = Array.isArray(value) ? value[0] : value;
    const yearList = this.data.yearList || [];
    const yearStr = yearList[yearIndex] || (new Date().getFullYear() + '年');
    const year = parseInt(yearStr);
    this.setData({ 
      selectedYear: year,
      yearIndex
    });
  },
  
  // 确认年份选择
  confirmYearSelection() {
    if (this.data.selectedYear) {
      const currentYear = new Date().getFullYear();
      if (this.data.selectedYear < currentYear - 5 || this.data.selectedYear > currentYear + 1) {
        wx.showToast({
          title: '请选择有效的年份',
          icon: 'none'
        });
        return;
      }
      
      this.setData({ 
        currentYear: this.data.selectedYear, 
        dateRange: 'year', 
        showYearPicker: false 
      });
      
      wx.showToast({
        title: `已切换到${this.data.selectedYear}年`,
        icon: 'success',
        duration: 1500
      });
      
      this.loadReportData();
      setTimeout(() => this.updateCharts(), 80);
    } else {
      this.setData({ showYearPicker: false });
    }
  },

  // 月份选择
  onMonthChange(e) {
    const value = e.detail.value;
    const monthIndex = Array.isArray(value) ? value[0] : value;
    this.setData({ 
      selectedMonth: monthIndex,
      monthIndex
    });
  },
  
  // 确认月份选择
  confirmMonthSelection() {
    if (this.data.selectedMonth !== undefined) {
      if (this.data.selectedMonth < 0 || this.data.selectedMonth > 11) {
        wx.showToast({
          title: '请选择有效的月份',
          icon: 'none'
        });
        return;
      }
      
      this.setData({ 
        currentMonth: this.data.selectedMonth,
        dateRange: 'month', 
        showMonthPicker: false
      });
      
      wx.showToast({
        title: `已切换到${this.data.selectedMonth + 1}月`,
        icon: 'success',
        duration: 1500
      });
      
      this.loadReportData();
      setTimeout(() => this.updateCharts(), 80);
    } else {
      this.setData({ showMonthPicker: false });
    }
  },

  // 自定义日期
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
    });
    this.loadReportData();
  },

  // 顶部导航页签切换
  onTabChange(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentTab: index });
    this.loadReportData();
  },

  // 分类类型切换（支出/收入）
  onCategoryTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    if (type && (type === 'expense' || type === 'income')) {
      this.setData({ categoryType: type });
    }
  },

  // 数据加载与绘图
  async loadReportData() {
    this.setData({ loading: true });
    
    try {
      // 根据不同的日期范围类型，准备不同的日期参数
      let dateParams = {};
      
      if (this.data.dateRange === 'month') {
        const year = this.data.currentYear;
        const monthIndex = this.data.currentMonth;
        const month = monthIndex + 1; // 转换为1-12
        
        // 构建月份的起止日期
        const startDate = new Date(year, monthIndex, 1);
        const endDate = new Date(year, monthIndex + 1, 0);
        
        dateParams = {
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
          periodType: 'month',
          year,
          month
        };
      } 
      else if (this.data.dateRange === 'year') {
        const year = this.data.currentYear;
        
        // 构建年份的起止日期
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        
        dateParams = {
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
          periodType: 'year',
          year
        };
      }
      else if (this.data.dateRange === 'custom') {
        dateParams = {
          startDate: this.data.customStartDate,
          endDate: this.data.customEndDate,
          periodType: 'custom'
        };
      }
      
      // 使用reportService获取报表数据
      const reportData = await reportService.generateReport(dateParams);
      
      // 规范化数据并设置状态
      const normalizedData = {
        loading: false,
        isEmpty: false,
        summary: this.normalizeSummaryData(reportData.summary),
        categoryStats: this.normalizeCategoryStats(reportData.categoryStats),
        trendData: this.normalizeTrendData(reportData.trendData),
        tagStats: this.normalizeTagStats(reportData.tagStats),
        assetData: this.normalizeAssetData(reportData.assetData)
      };
      
      this.setData(normalizedData);
      
      // 延迟更新图表，确保数据已设置
      setTimeout(() => {
        this.updateCharts();
      }, 100);
      
    } catch (error) {
      console.error('加载报表数据失败:', error);
      
      this.setData({
        loading: false,
        isEmpty: true,
        summary: { totalIncome: 0, totalExpense: 0, balance: 0 },
        categoryStats: { expense: [], income: [] },
        trendData: [],
        tagStats: { expense: [], income: [] },
        assetData: { totalAssets: 0, assetsDistribution: [], accounts: [], investments: [] }
      });
      
      wx.showToast({
        title: '加载报表数据失败',
        icon: 'none',
        duration: 2000
      });
    }
  },
  
  // 规范化数据
  normalizeData() {
    // 规范分类数据
    if (this.data && this.data.categoryStats) {
      const cc = this.data.categoryStats;
      const normalizedCategoryStats = {
        expense: this.normalizeCategoryData(cc.expense),
        income: this.normalizeCategoryData(cc.income)
      };
      this.setData({ categoryStats: normalizedCategoryStats });
    }
    
    // 规范趋势数据
    if (this.data && this.data.trendData) {
      const cleanedTrend = this.normalizeTrendData(this.data.trendData);
      this.setData({ trendData: cleanedTrend });
    }
  },
  
  // 规范化汇总数据
  normalizeSummaryData(summary) {
    const s = summary || {};
    const totalIncome = Number(s.totalIncome) || 0;
    const totalExpense = Number(s.totalExpense) || 0;
    const balance = s.balance !== undefined ? Number(s.balance) : (totalIncome - totalExpense);
    return { 
      totalIncome, 
      totalExpense, 
      balance 
    };
  },

  // 规范化分类统计数据
  normalizeCategoryStats(categoryStats) {
    const stats = categoryStats || {};
    return {
      expense: this.normalizeCategoryData(stats.expense || []),
      income: this.normalizeCategoryData(stats.income || [])
    };
  },

  // 规范化标签统计数据
  normalizeTagStats(tagStats) {
    const stats = tagStats || {};
    return {
      expense: this.normalizeCategoryData(stats.expense || []),
      income: this.normalizeCategoryData(stats.income || [])
    };
  },

  // 规范化资产数据
  normalizeAssetData(assetData) {
    const data = assetData || {};
    return {
      totalAssets: Number(data.totalAssets) || 0,
      assetsDistribution: Array.isArray(data.assetsDistribution) ? data.assetsDistribution : [],
      accounts: Array.isArray(data.accounts) ? data.accounts : [],
      investments: Array.isArray(data.investments) ? data.investments : []
    };
  },

  // 规范化分类数据
  normalizeCategoryData(arr) {
    const map = {};
    
    // 确保数组有效
    if (!Array.isArray(arr) || arr.length === 0) {
      return [];
    }
    
    // 处理不同格式的分类数据
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      if (!it) continue;
      
      // 获取分类名称，兼容不同数据结构
      const name = it.name || it.category || it.categoryName || '未分类';
      
      // 获取金额，兼容不同数据结构和单位
      let amt = 0;
      if (it.amount !== undefined) {
        amt = Number(it.amount);
      } else if (it.total !== undefined) {
        amt = Number(it.total);
      } else if (it.value !== undefined) {
        amt = Number(it.value);
      }
      
      // 累加同名分类的金额
      map[name] = (map[name] || 0) + amt;
    }
    
    // 计算总金额
    let total = 0;
    const keys = Object.keys(map);
    for (let i = 0; i < keys.length; i++) {
      total += map[keys[i]];
    }
    
    // 转换为数组
    const result = [];
    for (let i = 0; i < keys.length; i++) {
      const name = keys[i];
      result.push({
        name: name,
        amount: map[name],
        amountDisplay: (map[name] / 100).toFixed(2),
        percentage: total > 0 ? Math.round(map[name] / total * 100) : 0
      });
    }
    
    // 排序（金额从大到小）
    result.sort(function(a, b) {
      return b.amount - a.amount;
    });
    
    return result;
  },
  
  // 规范化趋势数据
  normalizeTrendData(list) {
    if (!Array.isArray(list) || list.length === 0) {
      return [];
    }
    
    const result = [];
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      if (!it) {
        result.push({ income: 0, expense: 0, balance: 0, date: '' });
        continue;
      }
      
      // 创建新对象而不使用展开运算符
      const newItem = {
        income: Number(it.income) || 0,
        expense: Number(it.expense) || 0,
        balance: Number(it.balance) || 0,
        date: it.date || ''
      };
      
      // 复制其他属性
      for (const key in it) {
        if (key !== 'income' && key !== 'expense' && key !== 'balance' && key !== 'date') {
          newItem[key] = it[key];
        }
      }
      
      result.push(newItem);
    }
    
    return result;
  },
  
  // 更新图表
  updateCharts() {
    if (this._chartTimer) clearTimeout(this._chartTimer);
    
    // 避免弹窗下图表穿透
    try {
      const hasModal = !!(this.data.showYearPicker || this.data.showMonthPicker || this.data.showDateRangePicker);
      if (hasModal) {
        return;
      }
    } catch (_) {}
    
    this._chartTimer = setTimeout(async () => {
      let dpr = 1;
      try {
        // 使用新版API获取设备信息
        const deviceInfo = await wx.getDeviceInfo();
        const windowInfo = await wx.getWindowInfo();
        dpr = windowInfo.pixelRatio || deviceInfo.pixelRatio || 1;
      } catch (error) {
        console.warn('获取设备信息失败，使用默认dpr:', error);
        // 降级处理，避免使用弃用API
        dpr = 1;
      }
      
      // 绘制趋势图
      this.drawTrendChart(dpr);
      
      // 绘制资产饼图
      this.drawAssetPieChart(dpr);
    }, 80);
  },
  
  // 绘制趋势图
  drawTrendChart(dpr) {
    if (!Array.isArray(this.data.trendData) || this.data.trendData.length === 0) return;
    
    // 使用旧版API获取canvas上下文
    const query = wx.createSelectorQuery();
    query.select('#trendCanvas')
      .fields({ 
        node: false, // 不使用新版Canvas 2D接口
        size: true,
        computedStyle: ['width', 'height']
      })
      .exec(res => {
        if (!res || !res[0]) return;
        
        const info = res[0];
        const width = info.width;
        const height = info.height;
        
        // 使用旧版canvas API
        // 修复：使用新版Canvas API
        const query = wx.createSelectorQuery().in(this);
        query.select('#trendCanvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (res[0]) {
              const canvas = res[0].node;
              const ctx = canvas.getContext('2d');
              const dpr = wx.getSystemInfoSync().pixelRatio;
              canvas.width = res[0].width * dpr;
              canvas.height = res[0].height * dpr;
              ctx.scale(dpr, dpr);
              ctx.clearRect(0, 0, res[0].width, res[0].height);
              // 继续绘制逻辑...
            } else {
              // 降级到旧版API
              const ctx = wx.createCanvasContext('trendCanvas', this);
              ctx.clearRect(0, 0, width, height);
            }
          });

      // 增加左侧padding以容纳Y轴标签
      const paddingLeft = 60; // 左侧留更多空间给Y轴标签
      const paddingRight = 20;
      const paddingTop = 20;
      const paddingBottom = 20;
      
      const plotW = Math.max(1, width - paddingLeft - paddingRight);
      const plotH = Math.max(1, height - paddingTop - paddingBottom);
      const data = this.data.trendData.slice(0, Math.min(30, this.data.trendData.length));
      
      // 计算最大值 (不使用展开运算符，兼容旧版本)
      const totalAssetsForScale = (this.data.assetData && this.data.assetData.totalAssets) || 0;
      let rawMax = 1;
      if (totalAssetsForScale > rawMax) rawMax = totalAssetsForScale;
      
      // 遍历找出最大值，不使用展开运算符
      data.forEach(it => {
        const income = it.income || 0;
        const expense = it.expense || 0;
        const balance = it.balance || 0;
        const maxItem = Math.max(income, expense, balance);
        if (maxItem > rawMax) rawMax = maxItem;
      });
      
      // 美化最大值
      const maxVal = this.niceNumber(rawMax * 1.2);
      const step = plotW / Math.max(1, data.length);
      
      // 单位推断：若趋势金额看起来以"分"为单位（大且为整数），则以100换算，否则视为"元"
      const inferCents = data.some(it => {
        const a = Number(it.income || 0), b = Number(it.expense || 0), c = Number(it.balance || 0);
        return (a % 1 === 0 && a >= 1000) || (b % 1 === 0 && b >= 1000) || (c % 1 === 0 && c >= 1000);
      });
      const scaleDiv = inferCents ? 100 : 1;

      // 绘制坐标轴
      this.drawAxes(ctx, paddingLeft, paddingTop, plotW, plotH);
      
      // 绘制Y轴刻度和网格线
      this.drawYAxisLabels(ctx, paddingLeft, paddingTop, plotH, maxVal, scaleDiv);
      
      // 绘制折线
      this.drawLines(ctx, data, paddingLeft, paddingTop, plotH, maxVal, step);
      
      // 绘制图例
      this.drawLegend(ctx, paddingLeft, paddingTop);
    });
  },
  
  // 美化数字（取整到合适的刻度）
  niceNumber(v) {
    if (!isFinite(v) || v <= 1) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / p;
    let nf = 10;
    if (f <= 1) nf = 1;
    else if (f <= 2) nf = 2;
    else if (f <= 5) nf = 5;
    else nf = 10;
    return nf * p;
  },
  
  // 绘制坐标轴
  drawAxes(ctx, paddingLeft, paddingTop, plotW, plotH) {
    const x0 = paddingLeft;
    const y0 = paddingTop + plotH;
    const x1 = paddingLeft + plotW;
    
    ctx.setStrokeStyle('#E5E5EA');
    ctx.setLineWidth(1);
    
    // x轴
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y0);
    ctx.stroke();
    
    // y轴
    ctx.beginPath();
    ctx.moveTo(x0, paddingTop);
    ctx.lineTo(x0, y0);
    ctx.stroke();
  },
  
  // 绘制Y轴刻度和标签
  drawYAxisLabels(ctx, paddingLeft, paddingTop, plotH, maxVal, scaleDiv) {
    ctx.setFillStyle('#999');
    ctx.setFontSize(12);
    
    // 将最大值转换为"元"
    const maxValYuan = maxVal / scaleDiv;
    
    // 确定合适的单位和刻度
    let unitName = '';
    let unitDivisor = 1;
    
    if (maxValYuan >= 1e8) { // 1亿及以上
      unitName = '亿';
      unitDivisor = 1e8;
    } else if (maxValYuan >= 1e4) { // 1万及以上
      unitName = '万';
      unitDivisor = 1e4;
    } else if (maxValYuan >= 1e3) { // 1千及以上
      unitName = 'k';
      unitDivisor = 1e3;
    }
    
    // 计算美观的刻度间隔
    const niceMax = Math.ceil(maxValYuan / unitDivisor);
    const niceStep = niceMax <= 5 ? 1 : Math.ceil(niceMax / 5);
    
    // 绘制Y轴刻度和网格线
    for (let i = 0; i <= 5; i++) {
      // 计算刻度值（以选定单位为单位）
      const valueInUnit = niceStep * i;
      // 转换回原始值（以"分"或"元"为单位）
      const tickValue = valueInUnit * unitDivisor * scaleDiv;
      // 计算Y坐标位置
      const y = paddingTop + plotH - (plotH * tickValue / maxVal);
      
      // 网格线
      ctx.setGlobalAlpha(0.25);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + plotW, y);
      ctx.stroke();
      ctx.setGlobalAlpha(1);
      
      // 格式化刻度标签
      let label;
      
      if (valueInUnit === 0) {
        label = '0';
      } else if (valueInUnit < 0.01) {
        label = '0';
      } else if (valueInUnit < 1) {
        label = valueInUnit.toFixed(2) + unitName;
      } else if (valueInUnit < 10) {
        label = valueInUnit.toFixed(1) + unitName;
      } else {
        // 大于10的值取整
        label = Math.round(valueInUnit) + unitName;
      }
      
      // 调整文本对齐方式和位置，确保标签完全显示
      ctx.setTextAlign('right');
      // 增加左侧边距，确保标签完全显示
      ctx.fillText(label, paddingLeft - 10, y + 4);
    }
  },
  
  // 绘制折线
  drawLines(ctx, data, paddingLeft, paddingTop, plotH, maxVal, step) {
    // 收入折线
    ctx.setStrokeStyle('#34C759');
    ctx.setLineWidth(2);
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const it = data[i];
      const x = paddingLeft + i * step + step / 2;
      const incomeH = (it.income || 0) / maxVal * plotH;
      const y = paddingTop + plotH - incomeH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // 支出折线
    ctx.setStrokeStyle('#FF3B30');
    ctx.setLineWidth(2);
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const it = data[i];
      const x = paddingLeft + i * step + step / 2;
      const expenseH = (it.expense || 0) / maxVal * plotH;
      const y = paddingTop + plotH - expenseH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // 结余折线
    ctx.setStrokeStyle('#007AFF');
    ctx.setLineWidth(1.5);
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const it = data[i];
      const x = paddingLeft + i * step + step / 2;
      const v = Number(it.balance || 0);
      const h = v / maxVal * plotH;
      const y = paddingTop + plotH - h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // 折线圆点
    this.drawPoints(ctx, data, '#34C759', function(it) { return it.income || 0; }, paddingLeft, paddingTop, plotH, maxVal, step);
    this.drawPoints(ctx, data, '#FF3B30', function(it) { return it.expense || 0; }, paddingLeft, paddingTop, plotH, maxVal, step);
  },
  
  // 绘制折线上的点
  drawPoints(ctx, data, color, getter, paddingLeft, paddingTop, plotH, maxVal, step) {
    ctx.setFillStyle(color);
    for (let i = 0; i < data.length; i++) {
      const it = data[i];
      const x = paddingLeft + i * step + step / 2;
      const h = getter(it) / maxVal * plotH;
      const y = paddingTop + plotH - h;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  
  // 绘制图例
  drawLegend(ctx, paddingLeft, paddingTop) {
    ctx.save();
    ctx.setFontSize(12);
    ctx.setTextAlign('left');
    
    // 收入
    ctx.setFillStyle('#34C759');
    ctx.beginPath(); 
    ctx.arc(paddingLeft + 4, paddingTop + 6, 4, 0, Math.PI * 2); 
    ctx.fill();
    ctx.setFillStyle('#333'); 
    ctx.fillText('收入', paddingLeft + 14, paddingTop + 10);
    
    // 支出
    ctx.setFillStyle('#FF3B30');
    ctx.beginPath(); 
    ctx.arc(paddingLeft + 60, paddingTop + 6, 4, 0, Math.PI * 2); 
    ctx.fill();
    ctx.setFillStyle('#333'); 
    ctx.fillText('支出', paddingLeft + 70, paddingTop + 10);
    
    // 结余
    ctx.setStrokeStyle('#007AFF'); 
    ctx.setLineWidth(2);
    ctx.beginPath(); 
    ctx.moveTo(paddingLeft + 116, paddingTop + 6); 
    ctx.lineTo(paddingLeft + 132, paddingTop + 6); 
    ctx.stroke();
    ctx.setFillStyle('#333'); 
    ctx.fillText('结余', paddingLeft + 136, paddingTop + 10);
    
    // 在旧版Canvas API中，需要调用draw方法才能显示绘制内容
    ctx.draw(true);
  },
  
  // 绘制资产饼图
  drawAssetPieChart(dpr) {
    if (this.data.currentTab !== 3) return;
    
    const items = (this.data.assetData && this.data.assetData.assetsDistribution) || [];
    
    // 使用循环计算总和，避免使用reduce方法
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += (items[i].amount || 0);
    }
    
    // 使用旧版API获取canvas上下文
    const query = wx.createSelectorQuery();
    query.select('#assetPie')
      .fields({ 
        node: false, // 不使用新版Canvas 2D接口
        size: true,
        computedStyle: ['width', 'height']
      })
      .exec(res => {
        if (!res || !res[0]) return;
        
        const info = res[0];
        const width = info.width;
        const height = info.height;
        
        // 使用旧版canvas API
        // 修复：使用新版Canvas API
        const query = wx.createSelectorQuery().in(this);
        query.select('#assetPie')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (res[0]) {
              const canvas = res[0].node;
              const ctx = canvas.getContext('2d');
              const dpr = wx.getSystemInfoSync().pixelRatio;
              canvas.width = res[0].width * dpr;
              canvas.height = res[0].height * dpr;
              ctx.scale(dpr, dpr);
              ctx.clearRect(0, 0, res[0].width, res[0].height);
              // 继续绘制逻辑...
            } else {
              // 降级到旧版API
              const ctx = wx.createCanvasContext('assetPie', this);
              ctx.clearRect(0, 0, width, height);
            }
          });
      
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) * 0.35;
      let start = -Math.PI / 2;
      
      if (!total || total <= 0) {
        ctx.beginPath();
        ctx.fillStyle = '#E5E5EA';
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, start, start + Math.PI * 2);
        ctx.fill();
        return;
      }
      
      items.forEach(it => {
        const val = it.amount || 0;
        const angle = (val / total) * Math.PI * 2;
        const mid = start + angle / 2;
        
        // 扇区
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.fillStyle = it.color || '#007AFF';
        ctx.arc(cx, cy, r, start, start + angle);
        ctx.closePath();
        ctx.fill();
        
        // 连接线与标签
        const ox = cx + Math.cos(mid) * r;
        const oy = cy + Math.sin(mid) * r;
        const lx = cx + Math.cos(mid) * (r + 10);
        const ly = cy + Math.sin(mid) * (r + 10);
        const tx = cx + Math.cos(mid) * (r + 40);
        const ty = cy + Math.sin(mid) * (r + 40);
        
        ctx.strokeStyle = it.color || '#007AFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(lx, ly);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        
        const pct = total ? (val / total * 100).toFixed(1) : '0.0';
        const label = `${it.name || ''} ${Math.round(val)} (${pct}%)`;
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = tx >= cx ? 'left' : 'right';
        ctx.fillText(label, tx + (tx >= cx ? 4 : -4), ty + 4);
        
        start += angle;
      });
    });
  },
  
  // 查看详情
  viewCategoryDetail(e) {
    const { category, type } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/transaction-list/transaction-list?category=${category}&type=${type}`
    });
  },
  
  viewTagDetail(e) {
    const { tag, type } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/transaction-list/transaction-list?tag=${tag}&type=${type}`
    });
  },
  
  viewAccountDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/transaction-list/transaction-list?account=${id}`
    });
  },
  
  viewInvestmentDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/investment-add/investment-add?id=${id}&mode=view`
    });
  },
  
  goToAssetsPage() {
    wx.switchTab({
      url: '/pages/assets/assets'
    });
  },
  
  // 处理页面点击事件
  onTapPage() {
    // 关闭所有选择器
    this.setData({
      showYearPicker: false,
      showMonthPicker: false,
      showDateRangePicker: false
    });
  }
});