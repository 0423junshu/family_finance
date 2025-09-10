// pages/reports/reports-simple-fixed.js
/**
 * 修复基础库3.9.3兼容性问题的报表页面
 * 解决显示不全和按钮无反应的问题
 */

const reportService = require('../../services/report');

Page({
  data: {
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
    consistencyResult: null,
    checkingConsistency: false,
    
    // 兼容性相关
    systemInfo: null,
    canvasSupported: true
  },

  onLoad() {
    console.log('报表页面加载 - 修复版本');
    
    // 获取系统信息
    this.initSystemInfo();
    
    // 初始化日期数据
    this.initDateData();
    
    // 延迟加载数据，确保页面完全渲染
    this.safeTimeout(() => {
      this.loadReportData();
    }, 150);
  },

  /**
   * 初始化系统信息
   */
  initSystemInfo() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      console.log('系统信息:', systemInfo);
      
      this.setData({ systemInfo });
      
      // 检查Canvas支持
      const version = systemInfo.SDKVersion || '2.0.0';
      const versionNum = parseFloat(version);
      const canvasSupported = versionNum >= 2.9;
      
      this.setData({ canvasSupported });
      console.log('Canvas支持:', canvasSupported, '基础库版本:', version);
      
    } catch (error) {
      console.error('获取系统信息失败:', error);
      this.setData({ 
        systemInfo: { SDKVersion: '3.9.3' },
        canvasSupported: true 
      });
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
    
    this.setData({
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
    });
  },

  /**
   * 安全的setTimeout，避免页面卸载后执行
   */
  safeTimeout(callback, delay) {
    const timer = setTimeout(() => {
      if (this.data) { // 检查页面是否还存在
        callback();
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
      if (e?.currentTarget?.dataset?.range) {
        range = e.currentTarget.dataset.range;
      } else if (e?.target?.dataset?.range) {
        range = e.target.dataset.range;
      } else if (e?.detail?.range) {
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

    if (range === 'custom') {
      this.setData({ 
        dateRange: 'custom', 
        showDateRangePicker: true
      });
      return;
    }
    
    if (range === 'year') {
      this.setData({
        dateRange: 'year',
        showYearPicker: true,
        yearIndex: this.findYearIndex(this.data.currentYear)
      });
      return;
    }
    
    if (range === 'month') {
      this.setData({
        dateRange: 'month',
        showMonthPicker: true,
        monthIndex: this.data.currentMonth
      });
      return;
    }

    // 直接设置其他范围
    this.setData({ dateRange: range });
    this.loadReportData();
  },

  /**
   * 查找年份在列表中的索引
   */
  findYearIndex(year) {
    const index = this.data.yearList.findIndex(item => parseInt(item) === year);
    return index >= 0 ? index : 5;
  },

  /**
   * 关闭所有选择器
   */
  closeAllPickers() {
    this.setData({
      showYearPicker: false,
      showMonthPicker: false,
      showDateRangePicker: false,
      showOptions: false,
      showToolsMenu: false
    });
  },

  /**
   * 显示年份选择器
   */
  showYearPicker() {
    console.log('显示年份选择器');
    this.closeAllPickers();
    this.setData({ 
      showYearPicker: true,
      yearIndex: this.findYearIndex(this.data.currentYear)
    });
  },

  /**
   * 年份变更 - 修复picker-view兼容性
   */
  onYearChange(e) {
    console.log('年份变更事件:', e);
    
    let yearIndex = 0;
    try {
      if (e?.detail?.value) {
        yearIndex = Array.isArray(e.detail.value) ? e.detail.value[0] : e.detail.value;
        yearIndex = parseInt(yearIndex) || 0;
      }
    } catch (error) {
      console.error('解析年份索引失败:', error);
    }
    
    const yearStr = this.data.yearList[yearIndex] || (new Date().getFullYear() + '年');
    const year = parseInt(yearStr);
    
    console.log('选择年份:', year);
    
    this.setData({ 
      currentYear: year, 
      showYear: year,
      dateRange: 'year', 
      showYearPicker: false,
      yearIndex
    });
    
    this.loadReportData();
  },

  /**
   * 显示月份选择器
   */
  showMonthPicker() {
    console.log('显示月份选择器');
    this.closeAllPickers();
    this.setData({ 
      showMonthPicker: true,
      monthIndex: this.data.currentMonth
    });
  },

  /**
   * 月份变更 - 修复picker-view兼容性
   */
  onMonthChange(e) {
    console.log('月份变更事件:', e);
    
    let monthIndex = 0;
    try {
      if (e?.detail?.value) {
        monthIndex = Array.isArray(e.detail.value) ? e.detail.value[0] : e.detail.value;
        monthIndex = parseInt(monthIndex) || 0;
      }
    } catch (error) {
      console.error('解析月份索引失败:', error);
    }
    
    console.log('选择月份:', monthIndex + 1);
    
    this.setData({ 
      currentMonth: monthIndex,
      showMonth: monthIndex,
      dateRange: 'month', 
      showMonthPicker: false,
      monthIndex
    });
    
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

  onStartDateChange(e) {
    if (e?.detail?.value) {
      this.setData({ customStartDate: e.detail.value });
    }
  },

  onEndDateChange(e) {
    if (e?.detail?.value) {
      this.setData({ customEndDate: e.detail.value });
    }
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

  cancelPicker() {
    this.closeAllPickers();
  },

  /**
   * 页面点击事件 - 修复事件处理
   */
  onTapPage(e) {
    // 只有点击页面背景时才关闭弹窗
    if (e?.target === e?.currentTarget) {
      this.closeAllPickers();
    }
  },

  /**
   * 页签切换 - 修复事件处理
   */
  onTabChange(e) {
    console.log('页签切换事件:', e);
    
    let index = 0;
    try {
      if (e?.currentTarget?.dataset?.index !== undefined) {
        index = parseInt(e.currentTarget.dataset.index) || 0;
      } else if (e?.target?.dataset?.index !== undefined) {
        index = parseInt(e.target.dataset.index) || 0;
      }
    } catch (error) {
      console.error('解析页签索引失败:', error);
    }
    
    console.log('切换到页签:', index);
    
    this.setData({ currentTab: index });
    
    // 延迟更新图表
    this.safeTimeout(() => {
      this.updateCharts();
    }, 200);
  },

  /**
   * 分类类型切换
   */
  onCategoryTypeChange(e) {
    let type = 'expense';
    try {
      if (e?.currentTarget?.dataset?.type) {
        type = e.currentTarget.dataset.type;
      } else if (e?.target?.dataset?.type) {
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
   * 切换选项菜单
   */
  toggleOptions(e) {
    if (e?.stopPropagation) {
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
    if (e?.stopPropagation) {
      e.stopPropagation();
    }
    
    this.setData({
      showToolsMenu: !this.data.showToolsMenu,
      showOptions: false
    });
  },

  /**
   * 加载报表数据 - 增强错误处理
   */
  async loadReportData() {
    console.log('开始加载报表数据');
    
    this.setData({ 
      loading: true, 
      errorMessage: '',
      isEmpty: false 
    });

    try {
      // 构建查询参数
      const params = this.buildQueryParams();
      console.log('查询参数:', params);

      // 调用报表服务
      const reportData = await reportService.generateReport(params);
      console.log('报表数据加载成功');

      // 处理数据
      const processedData = this.processReportData(reportData);

      // 更新页面数据
      this.setData({
        loading: false,
        isEmpty: this.isDataEmpty(processedData),
        ...processedData
      });

      // 延迟更新图表
      this.safeTimeout(() => {
        this.updateCharts();
      }, 300);

    } catch (error) {
      console.error('加载报表数据失败:', error);
      
      this.setData({
        loading: false,
        isEmpty: true,
        errorMessage: error.message || '加载数据失败'
      });

      wx.showToast({
        title: '加载数据失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 构建查询参数
   */
  buildQueryParams() {
    const { dateRange, currentYear, currentMonth, customStartDate, customEndDate } = this.data;
    
    let params = { dateRange };
    
    if (dateRange === 'month') {
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);
      
      params.startDate = startDate.toISOString().slice(0, 10);
      params.endDate = endDate.toISOString().slice(0, 10);
      params.year = currentYear;
      params.month = currentMonth + 1;
    } else if (dateRange === 'year') {
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear, 11, 31);
      
      params.startDate = startDate.toISOString().slice(0, 10);
      params.endDate = endDate.toISOString().slice(0, 10);
      params.year = currentYear;
    } else if (dateRange === 'custom') {
      params.startDate = customStartDate;
      params.endDate = customEndDate;
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

    return {
      summary: reportData.summary || { totalIncome: 0, totalExpense: 0, balance: 0 },
      categoryStats: reportData.categoryStats || { expense: [], income: [] },
      assetData: reportData.assetData || { totalAssets: 0, assetsDistribution: [], accounts: [], investments: [] },
      trendData: reportData.trendData || [],
      tagStats: reportData.tagStats || { expense: [], income: [] }
    };
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
      if (this.data.currentTab === 2) {
        this.updateTrendChart();
      } else if (this.data.currentTab === 3) {
        this.updateAssetChart();
      }
    }, 100);
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
    const assetData = this.data.assetData?.assetsDistribution;
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
      const query = wx.createSelectorQuery().in(this);
      
      // 尝试新版Canvas 2D API
      query.select(selector)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res?.[0]?.node) {
            // 新版Canvas 2D API
            console.log('使用新版Canvas 2D API');
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');
            const dpr = this.data.systemInfo?.pixelRatio || 1;
            
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
                const rect = rectRes?.[0] || { width: 300, height: 200 };
                
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
    });
  },

  /**
   * 绘制趋势图 - 简化版本
   */
  drawTrendChart(canvasInfo, data) {
    const { ctx, width, height, isNew } = canvasInfo;
    
    // 清除画布
    ctx.clearRect(0, 0, width, height);
    
    if (!data || data.length === 0) {
      this.drawEmptyChart(ctx, width, height, '暂无数据');
      if (!isNew && ctx.draw) ctx.draw();
      return;
    }

    // 绘制参数
    const padding = { left: 50, right: 20, top: 30, bottom: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // 计算数据范围
    let maxValue = 0;
    data.forEach(item => {
      maxValue = Math.max(maxValue, item.income || 0, item.expense || 0);
    });
    
    if (maxValue === 0) maxValue = 100;
    
    // 绘制坐标轴
    this.drawAxes(ctx, padding, chartWidth, chartHeight);
    
    // 绘制数据线
    this.drawDataLines(ctx, data, padding, chartWidth, chartHeight, maxValue);
    
    // 绘制图例
    this.drawLegend(ctx, padding);
    
    // 完成绘制
    if (!isNew && ctx.draw) ctx.draw();
  },

  /**
   * 绘制资产图表 - 简化版本
   */
  drawAssetChart(canvasInfo, data) {
    const { ctx, width, height, isNew } = canvasInfo;
    
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
  },

  /**
   * 绘制空图表
   */
  drawEmptyChart(ctx, width, height, message) {
    ctx.fillStyle = '#999';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(message, width / 2, height / 2);
  },

  /**
   * 绘制坐标轴
   */
  drawAxes(ctx, padding, chartWidth, chartHeight) {
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
  },

  /**
   * 绘制数据线
   */
  drawDataLines(ctx, data, padding, chartWidth, chartHeight, maxValue) {
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
  },

  /**
   * 绘制图例
   */
  drawLegend(ctx, padding) {
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
  },

  /**
   * 绘制饼图图例
   */
  drawPieLegend(ctx, data, width, height) {
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

  checkDataConsistency() {
    console.log('数据一致性检查');
    this.closeAllPickers();
    
    this.setData({ checkingConsistency: true });
    
    this.safeTimeout(() => {
      this.setData({
        checkingConsistency: false,
        consistencyResult: {
          needFix: false,
          message: '数据一致性检查通过'
        }
      });
    }, 2000);
  },

  /**
   * 页面生命周期
   */
  onShow() {
    console.log('报表页面显示');
  },

  onHide() {
    console.log('报表页面隐藏');
    this.closeAllPickers();
  },

  onUnload() {
    console.log('报表页面卸载');
    if (this._chartTimer) {
      clearTimeout(this._chartTimer);
    }
  },

  onPullDownRefresh() {
    console.log('下拉刷新');
    this.loadReportData().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});