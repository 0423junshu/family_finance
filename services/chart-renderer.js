// services/chart-renderer.js
/**
 * 图表渲染服务
 * 统一处理Canvas渲染逻辑，兼容新旧API
 */

class ChartRenderer {
  constructor() {
    this.dpr = 1;
    this.initDPR();
  }

  /**
   * 初始化设备像素比
   */
  async initDPR() {
    try {
      const systemInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.dpr = systemInfo.pixelRatio || 1;
    } catch (error) {
      console.warn('获取设备信息失败:', error);
      this.dpr = 1;
    }
  }

  /**
   * 获取Canvas上下文
   * @param {string} selector Canvas选择器
   * @param {Object} component 页面组件实例
   * @returns {Promise<Object>} Canvas上下文信息
   */
  async getCanvasContext(selector, component) {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery().in(component);

      // 优先尝试新版Canvas 2D API
      query.select(selector)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res && res[0] && res[0].node) {
            // 新版Canvas 2D API
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');

            canvas.width = res[0].width * this.dpr;
            canvas.height = res[0].height * this.dpr;
            ctx.scale(this.dpr, this.dpr);

            resolve({
              ctx,
              canvas,
              width: res[0].width,
              height: res[0].height,
              isNew: true
            });
          } else {
            // 降级到旧版API
            this.getOldCanvasContext(selector, component)
              .then(resolve)
              .catch(reject);
          }
        });
    });
  }

  /**
   * 获取旧版Canvas上下文
   * @param {string} selector Canvas选择器
   * @param {Object} component 页面组件实例
   * @returns {Promise<Object>} Canvas上下文信息
   */
  async getOldCanvasContext(selector, component) {
    return new Promise((resolve) => {
      const canvasId = selector.replace('#', '');
      const ctx = wx.createCanvasContext(canvasId, component);

      // 获取Canvas尺寸
      const query = wx.createSelectorQuery().in(component);
      query.select(selector)
        .boundingClientRect()
        .exec((res) => {
          const rect = res[0] || { width: 300, height: 200 };

          resolve({
            ctx,
            canvas: null,
            width: rect.width,
            height: rect.height,
            isNew: false
          });
        });
    });
  }

  /**
   * 绘制趋势图
   * @param {Object} canvasInfo Canvas信息
   * @param {Array} data 数据
   * @param {Object} options 配置选项
   */
  drawTrendChart(canvasInfo, data, options = {}) {
    const { ctx, width, height, isNew } = canvasInfo;
    const {
      paddingLeft = 60,
      paddingRight = 20,
      paddingTop = 20,
      paddingBottom = 40
    } = options;

    // 清除画布
    ctx.clearRect(0, 0, width, height);

    if (!data || data.length === 0) {
      this.drawEmptyChart(ctx, width, height, '暂无数据');
      this.finishDraw(ctx, isNew);
      return;
    }

    const plotWidth = Math.max(1, width - paddingLeft - paddingRight);
    const plotHeight = Math.max(1, height - paddingTop - paddingBottom);

    // 计算数据范围
    const maxValue = this.calculateMaxValue(data);
    const step = plotWidth / Math.max(1, data.length - 1);

    // 绘制坐标轴
    this.drawAxes(ctx, paddingLeft, paddingTop, plotWidth, plotHeight);

    // 绘制Y轴标签
    this.drawYAxisLabels(ctx, paddingLeft, paddingTop, plotHeight, maxValue);

    // 绘制X轴标签
    this.drawXAxisLabels(ctx, data, paddingLeft, paddingTop, plotWidth, plotHeight, step);

    // 绘制数据线
    this.drawDataLines(ctx, data, paddingLeft, paddingTop, plotHeight, maxValue, step);

    // 绘制图例
    this.drawLegend(ctx, paddingLeft, paddingTop);

    this.finishDraw(ctx, isNew);
  }

  /**
   * 计算最大值
   * @param {Array} data 数据
   * @returns {number} 最大值
   */
  calculateMaxValue(data) {
    let max = 0;
    data.forEach(item => {
      const income = Number(item.income) || 0;
      const expense = Number(item.expense) || 0;
      const balance = Math.abs(Number(item.balance) || 0);
      max = Math.max(max, income, expense, balance);
    });

    // 美化最大值
    return this.niceNumber(max * 1.2);
  }

  /**
   * 美化数字
   * @param {number} value 原始值
   * @returns {number} 美化后的值
   */
  niceNumber(value) {
    if (!isFinite(value) || value <= 1) return 1;

    const power = Math.pow(10, Math.floor(Math.log10(value)));
    const fraction = value / power;

    let niceFraction;
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;

    return niceFraction * power;
  }

  /**
   * 绘制坐标轴
   * @param {Object} ctx Canvas上下文
   * @param {number} paddingLeft 左边距
   * @param {number} paddingTop 上边距
   * @param {number} plotWidth 绘图区宽度
   * @param {number} plotHeight 绘图区高度
   */
  drawAxes(ctx, paddingLeft, paddingTop, plotWidth, plotHeight) {
    ctx.strokeStyle = '#E5E5EA';
    ctx.lineWidth = 1;

    // X轴
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop + plotHeight);
    ctx.lineTo(paddingLeft + plotWidth, paddingTop + plotHeight);
    ctx.stroke();

    // Y轴
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, paddingTop + plotHeight);
    ctx.stroke();
  }

  /**
   * 绘制Y轴标签
   * @param {Object} ctx Canvas上下文
   * @param {number} paddingLeft 左边距
   * @param {number} paddingTop 上边距
   * @param {number} plotHeight 绘图区高度
   * @param {number} maxValue 最大值
   */
  drawYAxisLabels(ctx, paddingLeft, paddingTop, plotHeight, maxValue) {
    ctx.fillStyle = '#999';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';

    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const value = (maxValue / steps) * i;
      const y = paddingTop + plotHeight - (plotHeight / steps) * i;

      // 网格线
      if (i > 0) {
        ctx.strokeStyle = '#F0F0F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(paddingLeft + plotWidth, y);
        ctx.stroke();
      }

      // 标签
      const label = this.formatAmount(value);
      ctx.fillText(label, paddingLeft - 10, y + 4);
    }
  }

  /**
   * 绘制X轴标签
   * @param {Array} data 数据
   * @param {number} paddingLeft 左边距
   * @param {number} paddingTop 上边距
   * @param {number} plotWidth 绘图区宽度
   * @param {number} plotHeight 绘图区高度
   * @param {number} step 步长
   */
  drawXAxisLabels(ctx, data, paddingLeft, paddingTop, plotWidth, plotHeight, step) {
    ctx.fillStyle = '#999';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    const maxLabels = Math.floor(plotWidth / 60); // 每60px显示一个标签
    const labelStep = Math.ceil(data.length / maxLabels);

    data.forEach((item, index) => {
      if (index % labelStep === 0) {
        const x = paddingLeft + index * step;
        const y = paddingTop + plotHeight + 20;
        const label = item.dateDisplay || item.date || '';
        ctx.fillText(label, x, y);
      }
    });
  }

  /**
   * 绘制数据线
   * @param {Object} ctx Canvas上下文
   * @param {Array} data 数据
   * @param {number} paddingLeft 左边距
   * @param {number} paddingTop 上边距
   * @param {number} plotHeight 绘图区高度
   * @param {number} maxValue 最大值
   * @param {number} step 步长
   */
  drawDataLines(ctx, data, paddingLeft, paddingTop, plotHeight, maxValue, step) {
    // 收入线
    this.drawLine(ctx, data, '#34C759', 'income', paddingLeft, paddingTop, plotHeight, maxValue, step);

    // 支出线
    this.drawLine(ctx, data, '#FF3B30', 'expense', paddingLeft, paddingTop, plotHeight, maxValue, step);

    // 结余线
    this.drawLine(ctx, data, '#007AFF', 'balance', paddingLeft, paddingTop, plotHeight, maxValue, step, true);
  }

  /**
   * 绘制单条线
   * @param {Object} ctx Canvas上下文
   * @param {Array} data 数据
   * @param {string} color 颜色
   * @param {string} field 字段名
   * @param {number} paddingLeft 左边距
   * @param {number} paddingTop 上边距
   * @param {number} plotHeight 绘图区高度
   * @param {number} maxValue 最大值
   * @param {number} step 步长
   * @param {boolean} allowNegative 是否允许负值
   */
  drawLine(ctx, data, color, field, paddingLeft, paddingTop, plotHeight, maxValue, step, allowNegative = false) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    let hasValidPoint = false;

    data.forEach((item, index) => {
      const value = Number(item[field]) || 0;
      const x = paddingLeft + index * step;

      let y;
      if (allowNegative) {
        // 结余可能为负值，需要特殊处理
        const ratio = value / maxValue;
        y = paddingTop + plotHeight / 2 - (plotHeight / 2) * ratio;
      } else {
        const ratio = value / maxValue;
        y = paddingTop + plotHeight - plotHeight * ratio;
      }

      if (index === 0 || !hasValidPoint) {
        ctx.moveTo(x, y);
        hasValidPoint = true;
      } else {
        ctx.lineTo(x, y);
      }
    });

    if (hasValidPoint) {
      ctx.stroke();

      // 绘制数据点
      ctx.fillStyle = color;
      data.forEach((item, index) => {
        const value = Number(item[field]) || 0;
        const x = paddingLeft + index * step;

        let y;
        if (allowNegative) {
          const ratio = value / maxValue;
          y = paddingTop + plotHeight / 2 - (plotHeight / 2) * ratio;
        } else {
          const ratio = value / maxValue;
          y = paddingTop + plotHeight - plotHeight * ratio;
        }

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  /**
   * 绘制图例
   * @param {Object} ctx Canvas上下文
   * @param {number} paddingLeft 左边距
   * @param {number} paddingTop 上边距
   */
  drawLegend(ctx, paddingLeft, paddingTop) {
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';

    const legends = [
      { color: '#34C759', text: '收入' },
      { color: '#FF3B30', text: '支出' },
      { color: '#007AFF', text: '结余' }
    ];

    legends.forEach((legend, index) => {
      const x = paddingLeft + index * 60;
      const y = paddingTop + 6;

      // 绘制图例标记
      ctx.fillStyle = legend.color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // 绘制图例文字
      ctx.fillStyle = '#333';
      ctx.fillText(legend.text, x + 10, y + 4);
    });
  }

  /**
   * 绘制空图表
   * @param {Object} ctx Canvas上下文
   * @param {number} width 宽度
   * @param {number} height 高度
   * @param {string} message 提示信息
   */
  drawEmptyChart(ctx, width, height, message) {
    ctx.fillStyle = '#999';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(message, width / 2, height / 2);
  }

  /**
   * 格式化金额
   * @param {number} amount 金额
   * @returns {string} 格式化后的金额
   */
  formatAmount(amount) {
    if (!amount || isNaN(amount)) return '0';

    if (amount >= 10000) {
      return (amount / 10000).toFixed(1) + '万';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'k';
    } else {
      return amount.toFixed(0);
    }
  }

  /**
   * 完成绘制
   * @param {Object} ctx Canvas上下文
   * @param {boolean} isNew 是否为新版API
   */
  finishDraw(ctx, isNew) {
    if (!isNew && ctx.draw) {
      ctx.draw();
    }
  }
}

// 创建单例实例
const chartRenderer = new ChartRenderer();

module.exports = chartRenderer;