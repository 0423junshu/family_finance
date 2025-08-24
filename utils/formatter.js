// utils/formatter.js

/**
 * 格式化日期
 * @param {Date|string} date 日期对象或日期字符串
 * @param {string} format 格式类型：'date', 'datetime', 'time', 'month'
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date, format = 'date') {
  if (!date) return ''
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')
  
  switch (format) {
    case 'datetime':
      return `${year}-${month}-${day} ${hour}:${minute}`
    case 'time':
      return `${hour}:${minute}`
    case 'month':
      return `${year}-${month}`
    case 'year':
      return `${year}`
    case 'md':
      return `${month}-${day}`
    case 'chinese':
      return `${year}年${month}月${day}日`
    case 'chinese-md':
      return `${month}月${day}日`
    case 'relative':
      return formatRelativeDate(d)
    default:
      return `${year}-${month}-${day}`
  }
}

/**
 * 格式化相对日期
 * @param {Date} date 日期对象
 * @returns {string} 相对日期字符串
 */
function formatRelativeDate(date) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  const diffTime = targetDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === -1) {
    return '昨天'
  } else if (diffDays === 1) {
    return '明天'
  } else if (diffDays > 1 && diffDays <= 7) {
    return `${diffDays}天后`
  } else if (diffDays < -1 && diffDays >= -7) {
    return `${Math.abs(diffDays)}天前`
  } else {
    return formatDate(date, 'md')
  }
}

/**
 * 格式化金额
 * @param {number} amount 金额（分为单位）
 * @param {object} options 格式化选项
 * @returns {string} 格式化后的金额字符串
 */
function formatAmount(amount, options = {}) {
  const {
    unit = 'yuan', // yuan: 元, fen: 分
    decimals = 2, // 小数位数
    showSymbol = false, // 是否显示货币符号
    showSign = false, // 是否显示正负号
    separator = true // 是否显示千分位分隔符
  } = options
  
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0.00'
  }
  
  let value = Number(amount)
  
  // 如果输入的是分，转换为元
  if (unit === 'yuan' && Math.abs(value) >= 100) {
    value = value / 100
  }
  
  // 格式化数字
  let formatted = value.toFixed(decimals)
  
  // 添加千分位分隔符
  if (separator) {
    const parts = formatted.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    formatted = parts.join('.')
  }
  
  // 添加正负号
  if (showSign && value > 0) {
    formatted = '+' + formatted
  }
  
  // 添加货币符号
  if (showSymbol) {
    formatted = '¥' + formatted
  }
  
  return formatted
}

/**
 * 格式化百分比
 * @param {number} value 数值
 * @param {number} decimals 小数位数
 * @returns {string} 格式化后的百分比字符串
 */
function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%'
  }
  
  return (Number(value) * 100).toFixed(decimals) + '%'
}

/**
 * 格式化数字
 * @param {number} value 数值
 * @param {object} options 格式化选项
 * @returns {string} 格式化后的数字字符串
 */
function formatNumber(value, options = {}) {
  const {
    decimals = 0,
    separator = true,
    unit = ''
  } = options
  
  if (value === null || value === undefined || isNaN(value)) {
    return '0'
  }
  
  let formatted = Number(value).toFixed(decimals)
  
  if (separator) {
    const parts = formatted.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    formatted = parts.join('.')
  }
  
  return formatted + unit
}

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的文件大小字符串
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化时长
 * @param {number} seconds 秒数
 * @returns {string} 格式化后的时长字符串
 */
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}秒`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分钟`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
  }
}

/**
 * 解析金额字符串为数字（分为单位）
 * @param {string} amountStr 金额字符串
 * @returns {number} 金额数字（分为单位）
 */
function parseAmount(amountStr) {
  if (!amountStr) return 0
  
  // 移除货币符号和空格
  const cleanStr = String(amountStr).replace(/[¥￥$,\s]/g, '')
  const amount = parseFloat(cleanStr)
  
  if (isNaN(amount)) return 0
  
  // 转换为分
  return Math.round(amount * 100)
}

/**
 * 验证金额格式
 * @param {string} amountStr 金额字符串
 * @returns {boolean} 是否为有效金额格式
 */
function isValidAmount(amountStr) {
  if (!amountStr) return false
  
  const cleanStr = String(amountStr).replace(/[¥￥$,\s]/g, '')
  const regex = /^\d+(\.\d{1,2})?$/
  
  return regex.test(cleanStr) && parseFloat(cleanStr) >= 0
}

module.exports = {
  formatDate,
  formatRelativeDate,
  formatAmount,
  formatPercent,
  formatNumber,
  formatFileSize,
  formatDuration,
  parseAmount,
  isValidAmount
}