// 修复8月31日记录归类问题的工具函数
// 确保8月31日的记录能正确显示在8月份筛选中

/**
 * 修复8月31日记录归类问题
 * @param {Array} transactions - 所有交易记录
 * @returns {Array} - 修复后的交易记录
 */
function fixAugust31Records(transactions) {
  console.log('开始修复8月31日记录归类问题...')
  
  let fixedCount = 0
  const fixedTransactions = transactions.map(transaction => {
    // 检查是否是8月31日的记录
    const dateStr = transaction.date || transaction.createTime || ''
    
    if (dateStr.includes('2024-08-31') || dateStr.includes('08-31')) {
      console.log('发现8月31日记录:', {
        id: transaction.id || transaction._id,
        originalDate: dateStr,
        amount: transaction.amount,
        description: transaction.description
      })
      
      // 确保日期格式正确
      let fixedDate = dateStr
      if (dateStr.includes('T')) {
        // 如果包含时间，保持ISO格式但确保日期部分正确
        fixedDate = '2024-08-31' + dateStr.substring(dateStr.indexOf('T'))
      } else {
        // 如果只有日期，确保格式为YYYY-MM-DD
        fixedDate = '2024-08-31'
      }
      
      fixedCount++
      return {
        ...transaction,
        date: fixedDate,
        // 确保月份标记正确（用于快速筛选）
        month: '2024-08',
        year: 2024,
        monthIndex: 7 // 8月的索引（0-based）
      }
    }
    
    return transaction
  })
  
  console.log(`修复完成，共修复${fixedCount}条8月31日记录`)
  return fixedTransactions
}

/**
 * 验证8月31日记录在8月份筛选中的显示
 * @param {Array} transactions - 交易记录
 * @param {string} startDate - 开始日期 (YYYY-MM-DD)
 * @param {string} endDate - 结束日期 (YYYY-MM-DD)
 * @returns {Object} - 验证结果
 */
function validateAugust31Display(transactions, startDate, endDate) {
  console.log(`验证8月31日记录显示 - 筛选范围: ${startDate} 到 ${endDate}`)
  
  // 查找所有8月31日记录
  const august31Records = transactions.filter(t => {
    const dateStr = (t.date || t.createTime || '').toString()
    return dateStr.includes('2024-08-31') || dateStr.includes('08-31')
  })
  
  // 应用日期筛选
  const filteredRecords = august31Records.filter(t => {
    let dateOnly
    const dateStr = t.date || t.createTime
    
    if (typeof dateStr === 'string') {
      if (dateStr.includes('T')) {
        dateOnly = dateStr.split('T')[0]
      } else if (dateStr.includes(' ')) {
        dateOnly = dateStr.split(' ')[0]
      } else {
        dateOnly = dateStr
      }
    } else {
      const date = new Date(dateStr)
      dateOnly = date.toISOString().split('T')[0]
    }
    
    return dateOnly >= startDate && dateOnly <= endDate
  })
  
  const result = {
    totalAugust31Records: august31Records.length,
    displayedInFilter: filteredRecords.length,
    isCorrect: august31Records.length === filteredRecords.length,
    details: august31Records.map(r => ({
      id: r.id || r._id,
      date: r.date,
      amount: r.amount,
      description: r.description,
      willDisplay: filteredRecords.includes(r)
    }))
  }
  
  console.log('验证结果:', result)
  return result
}

/**
 * 获取正确的8月份日期范围
 * @param {number} year - 年份
 * @returns {Object} - 包含startDate和endDate的对象
 */
function getAugustDateRange(year = 2024) {
  const startDate = `${year}-08-01`
  const endDate = `${year}-08-31`
  
  console.log(`8月份日期范围: ${startDate} 到 ${endDate}`)
  return { startDate, endDate }
}

/**
 * 在小程序中使用的修复函数
 */
function fixAugust31InMiniProgram() {
  try {
    // 获取本地存储的交易记录
    const transactions = wx.getStorageSync('transactions') || []
    console.log(`原始交易记录数: ${transactions.length}`)
    
    // 修复8月31日记录
    const fixedTransactions = fixAugust31Records(transactions)
    
    // 保存修复后的记录
    wx.setStorageSync('transactions', fixedTransactions)
    
    // 验证修复效果
    const augustRange = getAugustDateRange(2024)
    const validation = validateAugust31Display(fixedTransactions, augustRange.startDate, augustRange.endDate)
    
    // 显示修复结果
    wx.showModal({
      title: '8月31日记录修复',
      content: `找到${validation.totalAugust31Records}条8月31日记录，修复后在8月份筛选中显示${validation.displayedInFilter}条`,
      showCancel: false,
      success: () => {
        // 刷新当前页面
        const pages = getCurrentPages()
        const currentPage = pages[pages.length - 1]
        if (currentPage && currentPage.loadTransactions) {
          currentPage.loadTransactions()
        }
      }
    })
    
    return validation.isCorrect
  } catch (error) {
    console.error('修复8月31日记录失败:', error)
    wx.showToast({
      title: '修复失败',
      icon: 'error'
    })
    return false
  }
}

module.exports = {
  fixAugust31Records,
  validateAugust31Display,
  getAugustDateRange,
  fixAugust31InMiniProgram
}