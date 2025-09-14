// pages/data-export/data-export.js
const exportService = require('../../services/export')
const dataManager = require('../../services/dataManager')
const { showToast } = require('../../utils/uiUtil')
const { formatDate, formatCurrency } = require('../../utils/formatter')

Page({
  data: {
    // 导出类型
    exportTypes: [
      {
        id: 'transactions',
        name: '支出记录',
        description: '导出指定时间范围的收支记录',
        icon: '📊'
      },
      {
        id: 'assets',
        name: '资产数据',
        description: '导出当前所有账户资产信息',
        icon: '💰'
      },
      {
        id: 'report',
        name: '财务报表',
        description: '导出财务分析报表',
        icon: '📈'
      }
    ],
    
    // 当前选择的导出类型
    selectedType: 'transactions',
    
    // 导出格式
    formats: [
      { id: 'excel', name: 'Excel', description: '.xlsx格式，适合数据分析' },
      { id: 'pdf', name: 'PDF', description: '.pdf格式，适合打印和分享' }
    ],
    selectedFormat: 'excel',
    
    // 时间范围
    dateRange: {
      startDate: '',
      endDate: '',
      presets: [
        { id: 'thisMonth', name: '本月', startDate: '', endDate: '' },
        { id: 'lastMonth', name: '上月', startDate: '', endDate: '' },
        { id: 'thisYear', name: '今年', startDate: '', endDate: '' },
        { id: 'lastYear', name: '去年', startDate: '', endDate: '' }
      ]
    },
    
    // 筛选条件
    filters: {
      categories: [],
      accounts: [],
      includeHistory: true
    },
    
    // 可选的分类和账户
    availableCategories: [],
    availableAccounts: [],
    
    // 导出历史
    exportHistory: [],
    
    // UI状态
    loading: false,
    showFilters: false,
    showHistory: false
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    this.refreshData()
  },

  // 初始化页面
  async initPage() {
    try {
      // 初始化时间范围预设
      this.initDatePresets()
      
      // 加载可选的分类和账户
      await this.loadFilterOptions()
      
      // 加载导出历史
      this.loadExportHistory()
      
    } catch (error) {
      console.error('初始化页面失败:', error)
      showToast('初始化失败', 'error')
    }
  },

  // 刷新数据
  async refreshData() {
    try {
      await this.loadFilterOptions()
      this.loadExportHistory()
    } catch (error) {
      console.error('刷新数据失败:', error)
    }
  },

  // 初始化时间范围预设
  initDatePresets() {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    
    // 本月
    const thisMonthStart = new Date(currentYear, currentMonth, 1)
    const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0)
    
    // 上月
    const lastMonthStart = new Date(currentYear, currentMonth - 1, 1)
    const lastMonthEnd = new Date(currentYear, currentMonth, 0)
    
    // 今年
    const thisYearStart = new Date(currentYear, 0, 1)
    const thisYearEnd = new Date(currentYear, 11, 31)
    
    // 去年
    const lastYearStart = new Date(currentYear - 1, 0, 1)
    const lastYearEnd = new Date(currentYear - 1, 11, 31)
    
    const presets = [
      {
        id: 'thisMonth',
        name: '本月',
        startDate: formatDate(thisMonthStart, 'YYYY-MM-DD'),
        endDate: formatDate(thisMonthEnd, 'YYYY-MM-DD')
      },
      {
        id: 'lastMonth',
        name: '上月',
        startDate: formatDate(lastMonthStart, 'YYYY-MM-DD'),
        endDate: formatDate(lastMonthEnd, 'YYYY-MM-DD')
      },
      {
        id: 'thisYear',
        name: '今年',
        startDate: formatDate(thisYearStart, 'YYYY-MM-DD'),
        endDate: formatDate(thisYearEnd, 'YYYY-MM-DD')
      },
      {
        id: 'lastYear',
        name: '去年',
        startDate: formatDate(lastYearStart, 'YYYY-MM-DD'),
        endDate: formatDate(lastYearEnd, 'YYYY-MM-DD')
      }
    ]
    
    // 默认选择本月
    this.setData({
      'dateRange.presets': presets,
      'dateRange.startDate': presets[0].startDate,
      'dateRange.endDate': presets[0].endDate
    })
  },

  // 加载筛选选项
  async loadFilterOptions() {
    try {
      const categories = dataManager.getAllCategories()
      const accounts = dataManager.getAllAccounts()
      
      this.setData({
        availableCategories: categories,
        availableAccounts: accounts
      })
    } catch (error) {
      console.error('加载筛选选项失败:', error)
    }
  },

  // 加载导出历史
  loadExportHistory() {
    const history = exportService.getExportHistory()
    this.setData({
      exportHistory: history
    })
  },

  // 选择导出类型
  onTypeSelect(e) {
    const typeId = e.currentTarget.dataset.id
    this.setData({
      selectedType: typeId
    })
  },

  // 选择导出格式
  onFormatSelect(e) {
    const formatId = e.currentTarget.dataset.id
    this.setData({
      selectedFormat: formatId
    })
  },

  // 选择时间预设
  onDatePresetSelect(e) {
    const preset = e.currentTarget.dataset.preset
    this.setData({
      'dateRange.startDate': preset.startDate,
      'dateRange.endDate': preset.endDate
    })
  },

  // 开始日期变更
  onStartDateChange(e) {
    this.setData({
      'dateRange.startDate': e.detail.value
    })
  },

  // 结束日期变更
  onEndDateChange(e) {
    this.setData({
      'dateRange.endDate': e.detail.value
    })
  },

  // 切换筛选面板
  toggleFilters() {
    this.setData({
      showFilters: !this.data.showFilters
    })
  },

  // 分类选择变更
  onCategoryChange(e) {
    const categoryId = e.currentTarget.dataset.id
    const categories = [...this.data.filters.categories]
    const index = categories.indexOf(categoryId)
    
    if (index > -1) {
      categories.splice(index, 1)
    } else {
      categories.push(categoryId)
    }
    
    this.setData({
      'filters.categories': categories
    })
  },

  // 账户选择变更
  onAccountChange(e) {
    const accountId = e.currentTarget.dataset.id
    const accounts = [...this.data.filters.accounts]
    const index = accounts.indexOf(accountId)
    
    if (index > -1) {
      accounts.splice(index, 1)
    } else {
      accounts.push(accountId)
    }
    
    this.setData({
      'filters.accounts': accounts
    })
  },

  // 包含历史记录切换
  onIncludeHistoryChange(e) {
    this.setData({
      'filters.includeHistory': e.detail.value
    })
  },

  // 清除筛选条件
  clearFilters() {
    this.setData({
      'filters.categories': [],
      'filters.accounts': [],
      'filters.includeHistory': true
    })
  },

  // 开始导出
  async startExport() {
    if (this.data.loading) return
    
    try {
      this.setData({ loading: true })
      
      // 验证参数
      const validation = this.validateExportParams()
      if (!validation.valid) {
        showToast(validation.message, 'error')
        return
      }
      
      // 构建导出选项
      const options = this.buildExportOptions()
      
      // 执行导出 - 使用简化的导出逻辑
      let result
      switch (this.data.selectedType) {
        case 'transactions':
          result = await this.exportTransactionsData(options)
          break
        case 'assets':
          result = await this.exportAssetsData(options)
          break
        case 'report':
          result = await this.exportReportData(options)
          break
        default:
          throw new Error('不支持的导出类型')
      }
      
      // 处理导出结果
      await this.handleExportResult(result)
      
      // 刷新导出历史
      this.loadExportHistory()
      
      showToast('导出成功', 'success')
      
    } catch (error) {
      console.error('导出失败:', error)
      showToast(error.message || '导出失败', 'error')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 导出交易数据
  async exportTransactionsData(options) {
    const transactions = wx.getStorageSync('transactions') || []
    
    // 筛选数据
    let filteredData = transactions.filter(t => {
      const transactionDate = new Date(t.date)
      const startDate = new Date(options.startDate)
      const endDate = new Date(options.endDate)
      
      return transactionDate >= startDate && transactionDate <= endDate
    })
    
    // 应用分类筛选
    if (options.categories && options.categories.length > 0) {
      filteredData = filteredData.filter(t => options.categories.includes(t.categoryId))
    }
    
    // 应用账户筛选
    if (options.accounts && options.accounts.length > 0) {
      filteredData = filteredData.filter(t => options.accounts.includes(t.accountId))
    }
    
    // 生成导出内容
    const content = this.generateExportContent(filteredData, options.format)
    const fileName = `交易记录_${options.startDate}_${options.endDate}.${options.format === 'excel' ? 'csv' : 'txt'}`
    
    return {
      fileName,
      content,
      fileSize: content.length,
      recordCount: filteredData.length
    }
  },

  // 导出资产数据
  async exportAssetsData(options) {
    const accounts = wx.getStorageSync('accounts') || []
    const transactions = wx.getStorageSync('transactions') || []
    
    // 计算每个账户的余额
    const accountsWithBalance = accounts.map(account => {
      const accountTransactions = transactions.filter(t => t.accountId === account.id)
      const balance = accountTransactions.reduce((sum, t) => {
        return sum + (t.type === 'income' ? t.amount : -t.amount)
      }, account.initialBalance || 0)
      
      return {
        ...account,
        balance,
        transactionCount: accountTransactions.length
      }
    })
    
    const content = this.generateAssetsContent(accountsWithBalance, options.format)
    const fileName = `资产数据_${new Date().toISOString().split('T')[0]}.${options.format === 'excel' ? 'csv' : 'txt'}`
    
    return {
      fileName,
      content,
      fileSize: content.length,
      recordCount: accountsWithBalance.length
    }
  },

  // 导出报表数据
  async exportReportData(options) {
    const transactions = wx.getStorageSync('transactions') || []
    
    // 筛选时间范围内的数据
    const filteredData = transactions.filter(t => {
      const transactionDate = new Date(t.date)
      const startDate = new Date(options.startDate)
      const endDate = new Date(options.endDate)
      
      return transactionDate >= startDate && transactionDate <= endDate
    })
    
    // 生成统计报表
    const report = this.generateReportData(filteredData)
    const content = this.generateReportContent(report, options.format)
    const fileName = `财务报表_${options.startDate}_${options.endDate}.${options.format === 'excel' ? 'csv' : 'txt'}`
    
    return {
      fileName,
      content,
      fileSize: content.length,
      recordCount: filteredData.length
    }
  },

  // 生成导出内容
  generateExportContent(data, format) {
    if (format === 'excel') {
      // CSV格式
      let csv = '日期,类型,分类,账户,金额,描述
'
      data.forEach(item => {
        csv += `${item.date},${item.type === 'income' ? '收入' : '支出'},${item.category},${item.account},${(item.amount / 100).toFixed(2)},${item.description || ''}
`
      })
      return csv
    } else {
      // 文本格式
      let text = '交易记录导出
'
      text += '================

'
      data.forEach(item => {
        text += `日期: ${item.date}
`
        text += `类型: ${item.type === 'income' ? '收入' : '支出'}
`
        text += `分类: ${item.category}
`
        text += `账户: ${item.account}
`
        text += `金额: ¥${(item.amount / 100).toFixed(2)}
`
        text += `描述: ${item.description || '无'}
`
        text += '----------------
'
      })
      return text
    }
  },

  // 生成资产内容
  generateAssetsContent(accounts, format) {
    if (format === 'excel') {
      let csv = '账户名称,账户类型,当前余额,交易笔数
'
      accounts.forEach(account => {
        csv += `${account.name},${account.type},${(account.balance / 100).toFixed(2)},${account.transactionCount}
`
      })
      return csv
    } else {
      let text = '资产数据导出
'
      text += '================

'
      accounts.forEach(account => {
        text += `账户: ${account.name}
`
        text += `类型: ${account.type}
`
        text += `余额: ¥${(account.balance / 100).toFixed(2)}
`
        text += `交易笔数: ${account.transactionCount}
`
        text += '----------------
'
      })
      return text
    }
  },

  // 生成报表数据
  generateReportData(transactions) {
    const income = transactions.filter(t => t.type === 'income')
    const expense = transactions.filter(t => t.type === 'expense')
    
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0)
    const totalExpense = expense.reduce((sum, t) => sum + t.amount, 0)
    
    // 按分类统计
    const categoryStats = {}
    transactions.forEach(t => {
      if (!categoryStats[t.category]) {
        categoryStats[t.category] = { income: 0, expense: 0, count: 0 }
      }
      if (t.type === 'income') {
        categoryStats[t.category].income += t.amount
      } else {
        categoryStats[t.category].expense += t.amount
      }
      categoryStats[t.category].count++
    })
    
    return {
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
      transactionCount: transactions.length,
      categoryStats
    }
  },

  // 生成报表内容
  generateReportContent(report, format) {
    if (format === 'excel') {
      let csv = '项目,金额
'
      csv += `总收入,${(report.totalIncome / 100).toFixed(2)}
`
      csv += `总支出,${(report.totalExpense / 100).toFixed(2)}
`
      csv += `净收入,${(report.netIncome / 100).toFixed(2)}
`
      csv += `交易笔数,${report.transactionCount}

`
      csv += '分类统计
'
      csv += '分类,收入,支出,笔数
'
      Object.entries(report.categoryStats).forEach(([category, stats]) => {
        csv += `${category},${(stats.income / 100).toFixed(2)},${(stats.expense / 100).toFixed(2)},${stats.count}
`
      })
      return csv
    } else {
      let text = '财务报表
'
      text += '================

'
      text += `总收入: ¥${(report.totalIncome / 100).toFixed(2)}
`
      text += `总支出: ¥${(report.totalExpense / 100).toFixed(2)}
`
      text += `净收入: ¥${(report.netIncome / 100).toFixed(2)}
`
      text += `交易笔数: ${report.transactionCount}

`
      text += '分类统计:
'
      text += '----------------
'
      Object.entries(report.categoryStats).forEach(([category, stats]) => {
        text += `${category}:
`
        text += `  收入: ¥${(stats.income / 100).toFixed(2)}
`
        text += `  支出: ¥${(stats.expense / 100).toFixed(2)}
`
        text += `  笔数: ${stats.count}
`
      })
      return text
    }
  },

  // 验证导出参数
  validateExportParams() {
    const { selectedType, dateRange } = this.data
    
    // 对于需要时间范围的导出类型，验证时间范围
    if (selectedType === 'transactions' || selectedType === 'report') {
      if (!dateRange.startDate || !dateRange.endDate) {
        return { valid: false, message: '请选择时间范围' }
      }
      
      if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
        return { valid: false, message: '开始日期不能晚于结束日期' }
      }
    }
    
    return { valid: true }
  },

  // 构建导出选项
  buildExportOptions() {
    const { selectedFormat, dateRange, filters } = this.data
    
    const options = {
      format: selectedFormat
    }
    
    // 添加时间范围
    if (dateRange.startDate && dateRange.endDate) {
      options.startDate = dateRange.startDate
      options.endDate = dateRange.endDate
    }
    
    // 添加筛选条件
    if (filters.categories.length > 0) {
      options.categories = filters.categories
    }
    
    if (filters.accounts.length > 0) {
      options.accounts = filters.accounts
    }
    
    options.includeHistory = filters.includeHistory
    
    return options
  },

  // 处理导出结果
  async handleExportResult(result) {
    // 显示导出成功对话框
    const res = await new Promise(resolve => {
      wx.showModal({
        title: '导出成功',
        content: `文件：${result.fileName}\n大小：${this.formatFileSize(result.fileSize)}\n\n选择操作：`,
        confirmText: '分享',
        cancelText: '保存',
        success: resolve
      })
    })
    
    if (res.confirm) {
      // 分享文件
      await exportService.shareFile(result)
    } else if (res.cancel) {
      // 保存文件
      await exportService.saveFile(result)
      showToast('文件已保存', 'success')
    }
  },

  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  },

  // 切换历史面板
  toggleHistory() {
    this.setData({
      showHistory: !this.data.showHistory
    })
  },

  // 重新导出历史记录
  async reExport(e) {
    const record = e.currentTarget.dataset.record
    
    try {
      this.setData({ loading: true })
      
      // 根据历史记录重新构建导出选项
      const options = {
        format: record.format,
        startDate: record.startDate,
        endDate: record.endDate,
        categories: record.categories || [],
        accounts: record.accounts || [],
        includeHistory: record.includeHistory !== false
      }
      
      // 执行导出
      let result
      switch (record.type) {
        case 'transactions':
          result = await exportService.exportTransactions(options)
          break
        case 'assets':
          result = await exportService.exportAssets(options)
          break
        case 'report':
          result = await exportService.exportFinancialReport(options)
          break
        default:
          throw new Error('不支持的导出类型')
      }
      
      // 处理导出结果
      await this.handleExportResult(result)
      
      showToast('重新导出成功', 'success')
      
    } catch (error) {
      console.error('重新导出失败:', error)
      showToast(error.message || '重新导出失败', 'error')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 删除导出记录
  deleteExportRecord(e) {
    const recordId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条导出记录吗？',
      success: (res) => {
        if (res.confirm) {
          exportService.deleteExportRecord(recordId)
          this.loadExportHistory()
          showToast('记录已删除', 'success')
        }
      }
    })
  },

  // 清除所有导出历史
  clearAllHistory() {
    wx.showModal({
      title: '清除历史',
      content: '确定要清除所有导出历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          exportService.clearExportHistory()
          this.loadExportHistory()
          showToast('历史记录已清除', 'success')
        }
      }
    })
  },

  // 获取导出类型文本
  getExportTypeText(type) {
    const typeMap = {
      'transactions': '支出记录',
      'assets': '资产数据',
      'report': '财务报表'
    }
    return typeMap[type] || type
  },

  // 获取格式文本
  getFormatText(format) {
    const formatMap = {
      'excel': 'Excel',
      'pdf': 'PDF'
    }
    return formatMap[format] || format
  }
})