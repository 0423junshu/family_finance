// services/export.js
// 数据导出服务

const { formatCurrency, formatDate } = require('../utils/formatter')
const dataManager = require('./dataManager')

class ExportService {
  constructor() {
    this.exportHistory = this.getExportHistory()
  }

  // 导出支出记录
  async exportTransactions(options = {}) {
    const {
      startDate,
      endDate,
      format = 'excel', // excel | pdf
      categories = [],
      accounts = []
    } = options

    try {
      // 获取交易数据
      const transactions = await this.getTransactionData(startDate, endDate, categories, accounts)
      
      if (transactions.length === 0) {
        throw new Error('选定时间范围内没有交易记录')
      }

      // 根据格式导出
      let result
      if (format === 'excel') {
        result = await this.exportTransactionsToExcel(transactions, options)
      } else if (format === 'pdf') {
        result = await this.exportTransactionsToPDF(transactions, options)
      } else {
        throw new Error('不支持的导出格式')
      }

      // 记录导出历史
      this.addExportHistory({
        type: 'transactions',
        format,
        startDate,
        endDate,
        recordCount: transactions.length,
        fileName: result.fileName,
        fileSize: result.fileSize,
        exportTime: new Date().toISOString()
      })

      return result
    } catch (error) {
      console.error('导出交易记录失败:', error)
      throw error
    }
  }

  // 导出资产数据
  async exportAssets(options = {}) {
    const {
      format = 'excel',
      includeHistory = true
    } = options

    try {
      // 获取资产数据
      const assets = await this.getAssetData(includeHistory)
      
      if (assets.length === 0) {
        throw new Error('没有资产数据可导出')
      }

      // 根据格式导出
      let result
      if (format === 'excel') {
        result = await this.exportAssetsToExcel(assets, options)
      } else if (format === 'pdf') {
        result = await this.exportAssetsToPDF(assets, options)
      } else {
        throw new Error('不支持的导出格式')
      }

      // 记录导出历史
      this.addExportHistory({
        type: 'assets',
        format,
        recordCount: assets.length,
        fileName: result.fileName,
        fileSize: result.fileSize,
        exportTime: new Date().toISOString()
      })

      return result
    } catch (error) {
      console.error('导出资产数据失败:', error)
      throw error
    }
  }

  // 导出财务报表
  async exportFinancialReport(options = {}) {
    const {
      startDate,
      endDate,
      format = 'excel',
      reportType = 'monthly' // monthly | yearly | custom
    } = options

    try {
      // 获取报表数据
      const reportData = await this.getFinancialReportData(startDate, endDate, reportType)
      
      // 根据格式导出
      let result
      if (format === 'excel') {
        result = await this.exportReportToExcel(reportData, options)
      } else if (format === 'pdf') {
        result = await this.exportReportToPDF(reportData, options)
      } else {
        throw new Error('不支持的导出格式')
      }

      // 记录导出历史
      this.addExportHistory({
        type: 'report',
        format,
        reportType,
        startDate,
        endDate,
        fileName: result.fileName,
        fileSize: result.fileSize,
        exportTime: new Date().toISOString()
      })

      return result
    } catch (error) {
      console.error('导出财务报表失败:', error)
      throw error
    }
  }

  // 获取交易数据
  async getTransactionData(startDate, endDate, categories, accounts) {
    const allTransactions = dataManager.getAllTransactions()
    
    return allTransactions.filter(transaction => {
      // 时间范围过滤
      if (startDate && new Date(transaction.date) < new Date(startDate)) {
        return false
      }
      if (endDate && new Date(transaction.date) > new Date(endDate)) {
        return false
      }
      
      // 分类过滤
      if (categories.length > 0 && !categories.includes(transaction.categoryId)) {
        return false
      }
      
      // 账户过滤
      if (accounts.length > 0 && !accounts.includes(transaction.accountId)) {
        return false
      }
      
      return true
    }).sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  // 获取资产数据
  async getAssetData(includeHistory) {
    const accounts = dataManager.getAllAccounts()
    const result = []

    for (const account of accounts) {
      const assetData = {
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        currency: account.currency || 'CNY'
      }

      if (includeHistory) {
        // 获取账户历史记录
        const transactions = dataManager.getAllTransactions()
          .filter(t => t.accountId === account.id || t.toAccountId === account.id)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
        
        assetData.transactions = transactions
      }

      result.push(assetData)
    }

    return result
  }

  // 获取财务报表数据
  async getFinancialReportData(startDate, endDate, reportType) {
    const transactions = await this.getTransactionData(startDate, endDate, [], [])
    const categories = dataManager.getAllCategories()
    const accounts = dataManager.getAllAccounts()

    // 计算收支统计
    const incomeTransactions = transactions.filter(t => t.type === 'income')
    const expenseTransactions = transactions.filter(t => t.type === 'expense')
    
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0)
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
    const netIncome = totalIncome - totalExpense

    // 按分类统计
    const categoryStats = {}
    transactions.forEach(transaction => {
      const categoryId = transaction.categoryId
      if (!categoryStats[categoryId]) {
        const category = categories.find(c => c.id === categoryId)
        categoryStats[categoryId] = {
          name: category ? category.name : '未知分类',
          type: transaction.type,
          amount: 0,
          count: 0
        }
      }
      categoryStats[categoryId].amount += transaction.amount
      categoryStats[categoryId].count += 1
    })

    // 按账户统计
    const accountStats = {}
    accounts.forEach(account => {
      accountStats[account.id] = {
        name: account.name,
        type: account.type,
        balance: account.balance,
        income: 0,
        expense: 0
      }
    })

    transactions.forEach(transaction => {
      if (accountStats[transaction.accountId]) {
        if (transaction.type === 'income') {
          accountStats[transaction.accountId].income += transaction.amount
        } else {
          accountStats[transaction.accountId].expense += transaction.amount
        }
      }
    })

    return {
      period: {
        startDate,
        endDate,
        type: reportType
      },
      summary: {
        totalIncome,
        totalExpense,
        netIncome,
        transactionCount: transactions.length
      },
      categoryStats: Object.values(categoryStats),
      accountStats: Object.values(accountStats),
      transactions
    }
  }

  // 导出交易记录到Excel
  async exportTransactionsToExcel(transactions, options) {
    const categories = dataManager.getAllCategories()
    const accounts = dataManager.getAllAccounts()
    
    // 构建Excel数据
    const excelData = [
      ['日期', '类型', '分类', '账户', '金额', '备注', '创建时间']
    ]

    transactions.forEach(transaction => {
      const category = categories.find(c => c.id === transaction.categoryId)
      const account = accounts.find(a => a.id === transaction.accountId)
      
      excelData.push([
        formatDate(transaction.date),
        transaction.type === 'income' ? '收入' : '支出',
        category ? category.name : '未知分类',
        account ? account.name : '未知账户',
        formatCurrency(transaction.amount),
        transaction.description || '',
        formatDate(transaction.createdAt)
      ])
    })

    const fileName = `交易记录_${formatDate(options.startDate || new Date(), 'YYYY-MM-DD')}_${formatDate(options.endDate || new Date(), 'YYYY-MM-DD')}.xlsx`
    
    // 模拟文件生成（实际应用中需要使用真实的Excel库）
    const fileContent = this.generateExcelContent(excelData)
    const fileSize = this.calculateFileSize(fileContent)

    return {
      fileName,
      fileContent,
      fileSize,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  }

  // 导出资产数据到Excel
  async exportAssetsToExcel(assets, options) {
    const excelData = [
      ['账户名称', '账户类型', '当前余额', '货币类型']
    ]

    assets.forEach(asset => {
      excelData.push([
        asset.name,
        this.getAccountTypeText(asset.type),
        formatCurrency(asset.balance),
        asset.currency
      ])
    })

    // 如果包含历史记录，添加交易明细
    if (options.includeHistory) {
      excelData.push([]) // 空行
      excelData.push(['交易明细'])
      excelData.push(['账户', '日期', '类型', '金额', '备注'])
      
      assets.forEach(asset => {
        if (asset.transactions) {
          asset.transactions.forEach(transaction => {
            excelData.push([
              asset.name,
              formatDate(transaction.date),
              transaction.type === 'income' ? '收入' : '支出',
              formatCurrency(transaction.amount),
              transaction.description || ''
            ])
          })
        }
      })
    }

    const fileName = `资产数据_${formatDate(new Date(), 'YYYY-MM-DD')}.xlsx`
    const fileContent = this.generateExcelContent(excelData)
    const fileSize = this.calculateFileSize(fileContent)

    return {
      fileName,
      fileContent,
      fileSize,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  }

  // 导出财务报表到Excel
  async exportReportToExcel(reportData, options) {
    const excelData = []
    
    // 报表标题
    excelData.push([`财务报表 (${formatDate(reportData.period.startDate)} - ${formatDate(reportData.period.endDate)})`])
    excelData.push([])
    
    // 汇总信息
    excelData.push(['汇总信息'])
    excelData.push(['总收入', formatCurrency(reportData.summary.totalIncome)])
    excelData.push(['总支出', formatCurrency(reportData.summary.totalExpense)])
    excelData.push(['净收入', formatCurrency(reportData.summary.netIncome)])
    excelData.push(['交易笔数', reportData.summary.transactionCount])
    excelData.push([])
    
    // 分类统计
    excelData.push(['分类统计'])
    excelData.push(['分类名称', '类型', '金额', '笔数'])
    reportData.categoryStats.forEach(stat => {
      excelData.push([
        stat.name,
        stat.type === 'income' ? '收入' : '支出',
        formatCurrency(stat.amount),
        stat.count
      ])
    })
    excelData.push([])
    
    // 账户统计
    excelData.push(['账户统计'])
    excelData.push(['账户名称', '账户类型', '当前余额', '收入', '支出'])
    reportData.accountStats.forEach(stat => {
      excelData.push([
        stat.name,
        this.getAccountTypeText(stat.type),
        formatCurrency(stat.balance),
        formatCurrency(stat.income),
        formatCurrency(stat.expense)
      ])
    })

    const fileName = `财务报表_${formatDate(reportData.period.startDate, 'YYYY-MM-DD')}_${formatDate(reportData.period.endDate, 'YYYY-MM-DD')}.xlsx`
    const fileContent = this.generateExcelContent(excelData)
    const fileSize = this.calculateFileSize(fileContent)

    return {
      fileName,
      fileContent,
      fileSize,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  }

  // 导出到PDF（简化实现）
  async exportTransactionsToPDF(transactions, options) {
    const fileName = `交易记录_${formatDate(options.startDate || new Date(), 'YYYY-MM-DD')}_${formatDate(options.endDate || new Date(), 'YYYY-MM-DD')}.pdf`
    const fileContent = this.generatePDFContent(transactions, 'transactions')
    const fileSize = this.calculateFileSize(fileContent)

    return {
      fileName,
      fileContent,
      fileSize,
      mimeType: 'application/pdf'
    }
  }

  async exportAssetsToPDF(assets, options) {
    const fileName = `资产数据_${formatDate(new Date(), 'YYYY-MM-DD')}.pdf`
    const fileContent = this.generatePDFContent(assets, 'assets')
    const fileSize = this.calculateFileSize(fileContent)

    return {
      fileName,
      fileContent,
      fileSize,
      mimeType: 'application/pdf'
    }
  }

  async exportReportToPDF(reportData, options) {
    const fileName = `财务报表_${formatDate(reportData.period.startDate, 'YYYY-MM-DD')}_${formatDate(reportData.period.endDate, 'YYYY-MM-DD')}.pdf`
    const fileContent = this.generatePDFContent(reportData, 'report')
    const fileSize = this.calculateFileSize(fileContent)

    return {
      fileName,
      fileContent,
      fileSize,
      mimeType: 'application/pdf'
    }
  }

  // 生成Excel内容（模拟）
  generateExcelContent(data) {
    // 实际应用中应该使用真实的Excel库，如 xlsx.js
    // 这里只是模拟生成CSV格式的内容
    return data.map(row => row.join(',')).join('\n')
  }

  // 生成PDF内容（模拟）
  generatePDFContent(data, type) {
    // 实际应用中应该使用真实的PDF库，如 jsPDF
    // 这里只是模拟生成文本内容
    return `PDF Content for ${type}: ${JSON.stringify(data, null, 2)}`
  }

  // 计算文件大小（在小程序环境不使用 Blob）
  calculateFileSize(content) {
    try {
      if (typeof content === 'string') {
        // 近似按 UTF-8 字节数计算
        let size = 0
        for (let i = 0; i < content.length; i++) {
          const code = content.charCodeAt(i)
          if (code <= 0x007f) size += 1
          else if (code <= 0x07ff) size += 2
          else if (code <= 0xffff) size += 3
          else size += 4
        }
        return size
      }
      if (content && content.byteLength) return content.byteLength
      return 0
    } catch (e) {
      return 0
    }
  }

  // 获取账户类型文本
  getAccountTypeText(type) {
    const typeMap = {
      'cash': '现金',
      'bank': '银行卡',
      'credit': '信用卡',
      'alipay': '支付宝',
      'wechat': '微信',
      'investment': '投资账户',
      'other': '其他'
    }
    return typeMap[type] || type
  }

  // 保存文件到本地
  async saveFile(fileData) {
    return new Promise((resolve, reject) => {
      // 在小程序中，可以使用 wx.saveFile 或 wx.shareFileMessage
      const tempFilePath = wx.env.USER_DATA_PATH + '/' + fileData.fileName
      
      wx.getFileSystemManager().writeFile({
        filePath: tempFilePath,
        data: fileData.fileContent,
        encoding: 'utf8',
        success: () => {
          resolve({
            tempFilePath,
            fileName: fileData.fileName,
            fileSize: fileData.fileSize
          })
        },
        fail: reject
      })
    })
  }

  // 分享文件（若不支持则提示保存后自行分享）
  async shareFile(fileData) {
    try {
      const savedFile = await this.saveFile(fileData)
      if (wx.shareFileMessage) {
        wx.shareFileMessage({
          filePath: savedFile.tempFilePath,
          fileName: savedFile.fileName,
          success: () => {
            wx.showToast({ title: '分享成功', icon: 'success' })
          },
          fail: (error) => {
            console.error('分享失败:', error)
            wx.showToast({ title: '分享失败', icon: 'error' })
          }
        })
      } else {
        wx.showModal({
          title: '无法直接分享',
          content: '当前基础库不支持直接分享文件，请在“文件管理”或“聊天”中手动分享。已为你保存文件。',
          showCancel: false,
          success: () => {}
        })
      }
    } catch (error) {
      console.error('分享文件失败:', error)
      throw error
    }
  }

  // 添加导出历史
  addExportHistory(record) {
    this.exportHistory.unshift({
      id: Date.now().toString(),
      ...record
    })
    
    // 只保留最近50条记录
    if (this.exportHistory.length > 50) {
      this.exportHistory = this.exportHistory.slice(0, 50)
    }
    
    this.saveExportHistory()
  }

  // 获取导出历史
  getExportHistory() {
    try {
      return wx.getStorageSync('export_history') || []
    } catch (error) {
      console.error('获取导出历史失败:', error)
      return []
    }
  }

  // 保存导出历史
  saveExportHistory() {
    try {
      wx.setStorageSync('export_history', this.exportHistory)
    } catch (error) {
      console.error('保存导出历史失败:', error)
    }
  }

  // 清除导出历史
  clearExportHistory() {
    this.exportHistory = []
    this.saveExportHistory()
  }

  // 删除导出记录
  deleteExportRecord(recordId) {
    this.exportHistory = this.exportHistory.filter(record => record.id !== recordId)
    this.saveExportHistory()
  }
}

// 创建单例实例
const exportService = new ExportService()

module.exports = exportService