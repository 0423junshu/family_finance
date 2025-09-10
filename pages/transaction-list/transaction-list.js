// pages/transaction-list/transaction-list.js
const { getTransactions } = require('../../services/transaction-simple')
const { formatDate, formatAmount } = require('../../utils/formatter')
const { showLoading, hideLoading, showToast } = require('../../utils/uiUtil')
const { fixAugust31InMiniProgram } = require('../../utils/fix-august31-records')

Page({
  data: {
    loading: true,
    transactions: [],
    filteredTransactions: [],
    
    // 筛选条件
    filters: {
      type: 'all', // all, income, expense
      category: 'all',
      tag: 'all',
      dateRange: 'month', // week, month, quarter, year, custom
      startDate: '',
      endDate: ''
    },
    
    // 分类列表
    categories: [],
    availableTags: [],
    
    // UI状态
    showFilterPanel: false,
    showDatePicker: false,
    datePickerType: '', // start, end
    showCategoryDropdown: false,
    showTagDropdown: false,
    
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
    console.log('交易列表页面加载，参数:', options)
    
    // 获取传入的筛选参数
    const updates = {}
    
    if (options.type) {
      updates['filters.type'] = options.type
    }
    if (options.category) {
      updates['filters.category'] = options.category
    }
    if (options.tag) {
      updates['filters.tag'] = options.tag
    }
    if (options.startDate && options.endDate) {
      updates['filters.startDate'] = options.startDate
      updates['filters.endDate'] = options.endDate
      updates['filters.dateRange'] = 'custom'
      console.log(`从URL参数设置自定义日期范围: ${options.startDate} 到 ${options.endDate}`)
    }
    
    // 设置年月信息
    if (options.year && options.month) {
      updates.currentYear = parseInt(options.year)
      updates.currentMonth = parseInt(options.month) - 1 // JavaScript月份从0开始
      updates.selectedYear = parseInt(options.year)
      updates.selectedMonth = parseInt(options.month) - 1
    }
    
    // 设置页面标题
    if (options.title) {
      wx.setNavigationBarTitle({
        title: decodeURIComponent(options.title)
      })
    }
    
    if (Object.keys(updates).length) {
      this.setData(updates)
    }
    
    this.initPage()
  },

  onShow() {
    this.loadTransactions()
  },

  // 初始化页面
  async initPage() {
    this.initDateRange()
    await this.loadCategories()
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
        // 完全重写月份边界计算逻辑，确保每个月份的起始和结束日期正确对应
        let monthYear, monthIndex
        if (targetYear && targetMonth !== undefined) {
          monthYear = targetYear
          monthIndex = targetMonth
        } else {
          monthYear = currentYear
          monthIndex = currentMonth
        }
        
        // 月初：该月第一天 00:00:00
        const monthStart = new Date(monthYear, monthIndex, 1)
        monthStart.setHours(0, 0, 0, 0)
        startDate = formatDateString(monthStart)
        
        // 月末：该月最后一天 23:59:59
        // 使用 new Date(year, month + 1, 0) 获取当月最后一天
        const monthEnd = new Date(monthYear, monthIndex + 1, 0)
        monthEnd.setHours(23, 59, 59, 999)
        endDate = formatDateString(monthEnd)
        
        // 验证日期计算的正确性
        const monthName = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'][monthIndex]
        console.log(`月份计算验证: ${monthYear}年${monthName}`)
        console.log(`- 月初: ${monthStart.toDateString()} -> ${startDate}`)
        console.log(`- 月末: ${monthEnd.toDateString()} -> ${endDate}`)
        console.log(`- 该月天数: ${monthEnd.getDate()}天`)
        
        // 特别验证关键月份的边界
        if (monthIndex === 6) { // 7月
          console.log(`✓ 7月验证: 应为${monthYear}-07-01~${monthYear}-07-31，实际为${startDate}~${endDate}`)
        } else if (monthIndex === 7) { // 8月
          console.log(`✓ 8月验证: 应为${monthYear}-08-01~${monthYear}-08-31，实际为${startDate}~${endDate}`)
        } else if (monthIndex === 8) { // 9月
          console.log(`✓ 9月验证: 应为${monthYear}-09-01~${monthYear}-09-30，实际为${startDate}~${endDate}`)
        }
        break
      case 'quarter':
        // 修复季度计算逻辑
        const currentQuarterMonth = Math.floor(currentMonth / 3) * 3
        const quarterStart = new Date(currentYear, currentQuarterMonth, 1)
        quarterStart.setHours(0, 0, 0, 0)
        const quarterEnd = new Date(currentYear, currentQuarterMonth + 3, 0)
        quarterEnd.setHours(23, 59, 59, 999)
        startDate = formatDateString(quarterStart)
        endDate = formatDateString(quarterEnd)
        
        console.log(`季度计算: 第${Math.floor(currentMonth / 3) + 1}季度，范围: ${startDate} 到 ${endDate}`)
        break
      case 'year':
        // 修复年度计算逻辑
        const yearStart = new Date(currentYear, 0, 1)
        yearStart.setHours(0, 0, 0, 0)
        const yearEnd = new Date(currentYear, 11, 31)
        yearEnd.setHours(23, 59, 59, 999)
        startDate = formatDateString(yearStart)
        endDate = formatDateString(yearEnd)
        
        console.log(`年度计算: ${currentYear}年，范围: ${startDate} 到 ${endDate}`)
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
    
    this.setData({
      'filters.startDate': startDate,
      'filters.endDate': endDate,
      currentYear: targetYear,
      currentMonth: targetMonth
    })
  },

  // 加载分类列表和标签
  async loadCategories() {
    try {
      // 模拟分类数据
      const categories = [
        { id: 'food', name: '餐饮', type: 'expense' },
        { id: 'transport', name: '交通', type: 'expense' },
        { id: 'shopping', name: '购物', type: 'expense' },
        { id: 'entertainment', name: '娱乐', type: 'expense' },
        { id: 'medical', name: '医疗', type: 'expense' },
        { id: 'education', name: '教育', type: 'expense' },
        { id: 'housing', name: '住房', type: 'expense' },
        { id: 'salary', name: '工资', type: 'income' },
        { id: 'bonus', name: '奖金', type: 'income' },
        { id: 'investment', name: '投资收益', type: 'income' }
      ]
      
      // 模拟标签数据
      const availableTags = [
        '必需品', '可选消费', '紧急支出', '计划支出', 
        '工作相关', '家庭开支', '个人消费', '投资理财',
        '健康医疗', '教育培训', '娱乐休闲', '交通出行'
      ]
      
      this.setData({ categories, availableTags })
    } catch (error) {
      console.error('加载分类和标签失败:', error)
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
      
      // 如果是月份筛选，扩展查询范围到前后各一天，确保不遗漏跨时区或边界数据
      if (this.data.filters.dateRange === 'month') {
        const start = new Date(startDate)
        start.setDate(start.getDate() - 1) // 前一天
        queryStartDate = start.toISOString().split('T')[0]
        
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1) // 后一天
        queryEndDate = end.toISOString().split('T')[0]
        
        console.log(`月份查询扩展范围: ${queryStartDate} 到 ${queryEndDate}`)
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
      const formattedTransactions = filteredTransactions.map(transaction => ({
        ...transaction,
        formattedDate: formatDate(transaction.date || transaction.createTime),
        formattedAmount: formatAmount(transaction.amount)
      }))
      
      this.setData({
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
      case 'month':
        const monthStart = new Date(startDate)
        const monthName = `${monthStart.getFullYear()}年${monthStart.getMonth() + 1}月`
        statsSubtitle = `${monthName}数据`
        break
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
    
    this.setData({
      totalIncome: totalIncome.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      netAmount: netAmount.toFixed(2),
      statsSubtitle: statsSubtitle,
      validTransactionCount: validTransactionCount
    })
  },

  // 显示筛选面板
  showFilterPanel() {
    this.setData({ showFilterPanel: true })
  },

  // 隐藏筛选面板
  hideFilterPanel() {
    this.setData({ 
      showFilterPanel: false,
      showCategoryDropdown: false,
      showTagDropdown: false
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

  // 日期范围筛选 - 修复自定义选择器消失问题
  onDateRangeFilter(e) {
    const range = e.currentTarget.dataset.range
    console.log('切换日期范围筛选:', range)
    
    // 更新筛选类型，但不隐藏自定义选择器
    this.setData({
      'filters.dateRange': range
    })
    
    // 重新计算日期范围
    this.initDateRange()
    
    // 应用筛选
    this.applyFiltersAndReload()
    
    // 不关闭筛选面板，让用户可以继续调整
    console.log('日期范围已切换到:', range, '当前日期:', this.data.filters.startDate, '到', this.data.filters.endDate)
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
    
    const formattedTransactions = filteredTransactions.map(transaction => ({
      ...transaction,
      formattedDate: formatDate(transaction.date || transaction.createTime),
      formattedAmount: formatAmount(transaction.amount)
    }))
    
    // 输出筛选结果的日期分布
    const dateDistribution = {}
    formattedTransactions.forEach(t => {
      const date = t.date || t.createTime
      const dateKey = date.split('T')[0] // 只取日期部分
      dateDistribution[dateKey] = (dateDistribution[dateKey] || 0) + 1
    })
    
    console.log('筛选结果日期分布:', dateDistribution)
    
    this.setData({
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
    this.setData({
      filters: {
        type: 'all',
        category: 'all',
        tag: 'all',
        dateRange: 'month',
        startDate: '',
        endDate: ''
      },
      showCategoryDropdown: false,
      showTagDropdown: false
    })
    this.initDateRange()
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
  
  // 获取分类名称的缩写（用于文字图标）
  getCategoryAbbr(categoryName) {
    if (!categoryName) return '💰';
    
    const abbrMap = {
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
      '其他': '📦'
    };
    
    // 返回对应的emoji或取前两个字符
    return abbrMap[categoryName] || '💰';
  }
})
