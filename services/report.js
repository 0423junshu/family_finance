// services/report.js
/**
 * 报表服务
 * 负责生成各类财务报表，整合记账数据和投资信息
 */

/**
 * 统一的分类统计处理函数
 * 解决按年统计与按月/自定义统计的数据处理差异问题
 * @param {Array} transactions 交易记录数组
 * @returns {Object} 格式化的分类统计数据
 */
function processUnifiedCategoryStats(transactions) {
  try {
    // 按分类统计
    const categoryStats = {}
    
    transactions.forEach(transaction => {
      const { type, amount, categoryId } = transaction
      
      // 统一的分类键解析策略（与自定义统计保持一致）
      const resolvedKey = categoryId || 
                         transaction.category || 
                         transaction.categoryName || 
                         '__uncat__'
      
      if (!categoryStats[resolvedKey]) {
        categoryStats[resolvedKey] = {
          income: 0,
          expense: 0,
          count: 0
        }
      }
      
      // 只处理收入和支出类型
      if (type === 'income' || type === 'expense') {
        categoryStats[resolvedKey][type] += amount || 0
      }
      categoryStats[resolvedKey].count++
    })
    
    // 获取分类信息
    const categories = wx.getStorageSync('customCategories') || []
    const defaultCategories = [
      // 支出分类
      { _id: 'expense_1', name: '餐饮', icon: '🍽️', type: 'expense', color: '#FF6B6B', isDefault: true },
      { _id: 'expense_2', name: '交通', icon: '🚗', type: 'expense', color: '#4ECDC4', isDefault: true },
      { _id: 'expense_3', name: '购物', icon: '🛒', type: 'expense', color: '#45B7D1', isDefault: true },
      { _id: 'expense_4', name: '娱乐', icon: '🎮', type: 'expense', color: '#96CEB4', isDefault: true },
      { _id: 'expense_5', name: '医疗', icon: '🏥', type: 'expense', color: '#FFEAA7', isDefault: true },
      { _id: 'expense_6', name: '教育', icon: '📚', type: 'expense', color: '#DDA0DD', isDefault: true },
      { _id: 'expense_7', name: '住房', icon: '🏠', type: 'expense', color: '#FFB6C1', isDefault: true },
      { _id: 'expense_8', name: '通讯', icon: '📱', type: 'expense', color: '#87CEEB', isDefault: true },
      
      // 收入分类
      { _id: 'income_1', name: '工资', icon: '💰', type: 'income', color: '#32CD32', isDefault: true },
      { _id: 'income_2', name: '奖金', icon: '🎁', type: 'income', color: '#FFD700', isDefault: true },
      { _id: 'income_3', name: '投资收益', icon: '📈', type: 'income', color: '#00CED1', isDefault: true },
      { _id: 'income_4', name: '兼职', icon: '💼', type: 'income', color: '#9370DB', isDefault: true },
      { _id: 'income_5', name: '礼金', icon: '🧧', type: 'income', color: '#FF69B4', isDefault: true },
      { _id: 'income_6', name: '退款', icon: '↩️', type: 'income', color: '#20B2AA', isDefault: true },
      
      // 转账分类
      { _id: 'transfer_1', name: '转账', icon: '🔄', type: 'transfer', color: '#808080', isDefault: true }
    ]
    const allCategories = [...defaultCategories, ...categories]
    
    // 格式化分类统计数据
    const formattedCategoryStats = []
    Object.keys(categoryStats).forEach(categoryId => {
      let category = allCategories.find(c => c._id === categoryId)
      
      // 如果通过 _id 找不到，尝试通过 name 查找
      if (!category && typeof categoryId === 'string') {
        category = allCategories.find(c => c.name === categoryId)
      }
      
      if (category) {
        formattedCategoryStats.push({
          id: category._id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          type: category.type, // 使用分类定义的原始类型，不重新判断
          income: categoryStats[categoryId].income || 0,
          expense: categoryStats[categoryId].expense || 0,
          count: categoryStats[categoryId].count || 0
        })
      } else {
        // 未找到分类定义时的兜底处理
        const inferType = (categoryStats[categoryId].expense || 0) >= (categoryStats[categoryId].income || 0) ? 'expense' : 'income'
        formattedCategoryStats.push({
          id: categoryId,
          name: '未分类',
          icon: '🏷️',
          color: '#999999',
          type: inferType,
          income: categoryStats[categoryId].income || 0,
          expense: categoryStats[categoryId].expense || 0,
          count: categoryStats[categoryId].count || 0
        })
      }
    })
    
    return formattedCategoryStats
  } catch (error) {
    console.error('统一分类统计处理失败:', error)
    return []
  }
}

/**
 * 生成月度收支报表
 * @param {Number} year 年份
 * @param {Number} month 月份
 * @returns {Object} 月度收支报表数据
 */
async function generateMonthlyReport(year, month) {
  try {
    // 获取所有交易记录
    const transactions = wx.getStorageSync('transactions') || []
    
    // 安全的日期创建和验证
    const monthStartDate = new Date(year, month - 1, 1)
    const monthEndDate = new Date(year, month, 0)
    
    // 验证日期是否有效
    if (isNaN(monthStartDate.getTime()) || isNaN(monthEndDate.getTime())) {
      throw new Error(`无效的日期参数: year=${year}, month=${month}`)
    }
    
    // 筛选指定月份的交易记录
    const monthStart = monthStartDate.toISOString().split('T')[0]
    const monthEnd = monthEndDate.toISOString().split('T')[0]
    
    // 安全日期解析，过滤无效日期
    const monthlyTransactions = transactions.filter(trx => {
      if (!trx || !trx.date) return false
      const d = new Date(trx.date)
      if (isNaN(d.getTime())) return false
      const transactionDate = d.toISOString().split('T')[0]
      return transactionDate >= monthStart && transactionDate <= monthEnd
    })
    
    // 计算总收入和总支出
    let totalIncome = 0
    let totalExpense = 0
    
    // 按分类统计
    const categoryStats = {}
    
    // 按标签统计
    const tagStats = {}
    
    // 按账户统计
    const accountStats = {}
    
    // 统计数据
    monthlyTransactions.forEach(transaction => {
      const { type, amount, categoryId, tags, accountId } = transaction
      
      // 统计总收支
      if (type === 'income') {
        totalIncome += amount
      } else if (type === 'expense') {
        totalExpense += amount
      }
      
      // 按分类统计（优先用ID；无ID尝试名称；仍无则归入“未分类”）
      const resolvedKey = categoryId || transaction.category || transaction.categoryName || '__uncat__'
      if (!categoryStats[resolvedKey]) {
        categoryStats[resolvedKey] = {
          income: 0,
          expense: 0,
          count: 0
        }
      }
      if (type === 'income' || type === 'expense') {
        categoryStats[resolvedKey][type] += amount
      }
      categoryStats[resolvedKey].count++
      
      // 按标签统计（兼容多来源字段，并将ID映射为名称；无标签归入“其他”；去除#前缀与空白）
      const rawTags = Array.isArray(tags) ? tags
        : Array.isArray(transaction.tagIds) ? transaction.tagIds
        : Array.isArray(transaction.labels) ? transaction.labels
        : Array.isArray(transaction.tagList) ? transaction.tagList
        : (typeof transaction.labels === 'string'
            ? transaction.labels.split(',').map(s => s.trim()).filter(Boolean)
            : null);
      if (rawTags && Array.isArray(rawTags) && rawTags.length > 0) {
        // 构建映射表（自定义标签 + 常用默认ID映射）
        const customTags = wx.getStorageSync('customTags') || []
        const tagIdToName = (customTags || []).reduce((m, t) => {
          const key = t && (t._id || t.id)
          if (key) m[String(key).trim()] = t.name || t.label || t.text || String(key).trim()
          return m
        }, {})
        const defaultTagMap = { tag_1: '必需品', tag_2: '娱乐', tag_3: '投资', tag_4: '礼品' }
        const normalizeKey = (val) => {
          const s = String(val || '').trim()
          const noHash = s.startsWith('#') ? s.slice(1).trim() : s
          return noHash
        }

        rawTags.forEach(tag => {
          let tagName
          if (typeof tag === 'string') {
            const key = normalizeKey(tag)
            const keyLower = key.toLowerCase()
            tagName = tagIdToName[key] || tagIdToName[keyLower] || defaultTagMap[key] || defaultTagMap[keyLower] || key
          } else {
            const tid = tag && (tag.id || tag._id)
            const nameField = tag && (tag.name || tag.label || tag.text)
            const key = tid != null ? normalizeKey(tid) : null
            const keyLower = key ? key.toLowerCase() : null
            const normName = nameField ? normalizeKey(nameField) : null
            tagName = normName || (key && (tagIdToName[key] || (keyLower && tagIdToName[keyLower]) || defaultTagMap[key] || (keyLower && defaultTagMap[keyLower]))) || '未命名'
          }

          if (!tagStats[tagName]) {
            tagStats[tagName] = { income: 0, expense: 0, count: 0, countIncome: 0, countExpense: 0 }
          }
          if (type === 'income') {
            tagStats[tagName].income += amount
            tagStats[tagName].countIncome++
            tagStats[tagName].count++
          } else if (type === 'expense') {
            tagStats[tagName].expense += amount
            tagStats[tagName].countExpense++
            tagStats[tagName].count++
          }
        })
      } else {
        // 无标签的交易归入“其他”
        const otherName = '其他'
        if (!tagStats[otherName]) {
          tagStats[otherName] = { income: 0, expense: 0, count: 0, countIncome: 0, countExpense: 0 }
        }
        if (type === 'income') {
          tagStats[otherName].income += amount
          tagStats[otherName].countIncome++
          tagStats[otherName].count++
        } else if (type === 'expense') {
          tagStats[otherName].expense += amount
          tagStats[otherName].countExpense++
          tagStats[otherName].count++
        }
      }
      
      // 按账户统计
      if (accountId) {
        if (!accountStats[accountId]) {
          accountStats[accountId] = {
            income: 0,
            expense: 0,
            transfer: 0,
            count: 0,
            countIncome: 0,
            countExpense: 0,
            countTransfer: 0
          }
        }
        // 金额聚合
        if (type === 'income' || type === 'expense' || type === 'transfer') {
          accountStats[accountId][type] += amount || 0
        }
        // 计数聚合：总数 + 各类型细分
        if (type === 'income') {
          accountStats[accountId].countIncome++
          accountStats[accountId].count++
        } else if (type === 'expense') {
          accountStats[accountId].countExpense++
          accountStats[accountId].count++
        } else if (type === 'transfer') {
          accountStats[accountId].countTransfer++
          accountStats[accountId].count++
        }
      }
    })
    
    // 获取分类信息
    const categories = wx.getStorageSync('customCategories') || []
    const defaultCategories = [
      // 支出分类
      { _id: 'expense_1', name: '餐饮', icon: '🍽️', type: 'expense', color: '#FF6B6B', isDefault: true },
      { _id: 'expense_2', name: '交通', icon: '🚗', type: 'expense', color: '#4ECDC4', isDefault: true },
      { _id: 'expense_3', name: '购物', icon: '🛒', type: 'expense', color: '#45B7D1', isDefault: true },
      { _id: 'expense_4', name: '娱乐', icon: '🎮', type: 'expense', color: '#96CEB4', isDefault: true },
      { _id: 'expense_5', name: '医疗', icon: '🏥', type: 'expense', color: '#FFEAA7', isDefault: true },
      { _id: 'expense_6', name: '教育', icon: '📚', type: 'expense', color: '#DDA0DD', isDefault: true },
      { _id: 'expense_7', name: '住房', icon: '🏠', type: 'expense', color: '#FFB6C1', isDefault: true },
      { _id: 'expense_8', name: '通讯', icon: '📱', type: 'expense', color: '#87CEEB', isDefault: true },
      
      // 收入分类
      { _id: 'income_1', name: '工资', icon: '💰', type: 'income', color: '#32CD32', isDefault: true },
      { _id: 'income_2', name: '奖金', icon: '🎁', type: 'income', color: '#FFD700', isDefault: true },
      { _id: 'income_3', name: '投资收益', icon: '📈', type: 'income', color: '#00CED1', isDefault: true },
      { _id: 'income_4', name: '兼职', icon: '💼', type: 'income', color: '#9370DB', isDefault: true },
      { _id: 'income_5', name: '礼金', icon: '🧧', type: 'income', color: '#FF69B4', isDefault: true },
      { _id: 'income_6', name: '退款', icon: '↩️', type: 'income', color: '#20B2AA', isDefault: true },
      
      // 转账分类
      { _id: 'transfer_1', name: '转账', icon: '🔄', type: 'transfer', color: '#808080', isDefault: true }
    ]
    const allCategories = [...defaultCategories, ...categories]
    
    // 获取账户信息
    const accounts = wx.getStorageSync('accounts') || []
    
    // 格式化分类统计数据（找不到定义时兜底“未分类”）
    const formattedCategoryStats = []
    Object.keys(categoryStats).forEach(categoryId => {
      let category = allCategories.find(c => c._id === categoryId)
      if (!category && typeof categoryId === 'string') {
        category = allCategories.find(c => c.name === categoryId)
      }
      if (category) {
        formattedCategoryStats.push({
          id: category._id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          type: category.type,
          income: categoryStats[categoryId].income,
          expense: categoryStats[categoryId].expense,
          count: categoryStats[categoryId].count
        })
      } else {
        const inferType = (categoryStats[categoryId].expense || 0) >= (categoryStats[categoryId].income || 0) ? 'expense' : 'income'
        formattedCategoryStats.push({
          id: categoryId,
          name: '未分类',
          icon: '🏷️',
          color: '#999999',
          type: inferType,
          income: categoryStats[categoryId].income || 0,
          expense: categoryStats[categoryId].expense || 0,
          count: categoryStats[categoryId].count || 0
        })
      }
    })
    
    // 格式化账户统计数据（补充 icon/color/type 与各类型计数，确保前端可一致渲染）
    const formattedAccountStats = []
    // 账户类型稳定配色兜底
    const accountTypeColorMap = {
      cash: '#4CD964',
      bank: '#409EFF',
      alipay: '#1677FF',
      wechat: '#07C160',
      wallet: '#9B59B6',
      invest: '#FF8C00',
      other: '#999999'
    }
    Object.keys(accountStats).forEach(accountId => {
      const account = accounts.find(a => (a.id === accountId || a._id === accountId))
      if (account) {
        const aType = account.type || 'other'
        const icon = account.icon || '💰'
        const color = account.color || accountTypeColorMap[aType] || accountTypeColorMap.other
        formattedAccountStats.push({
          id: accountId,
          name: account.name,
          icon,
          color,
          type: aType,
          income: accountStats[accountId].income,
          expense: accountStats[accountId].expense,
          transfer: accountStats[accountId].transfer,
          count: accountStats[accountId].count,
          countIncome: accountStats[accountId].countIncome,
          countExpense: accountStats[accountId].countExpense,
          countTransfer: accountStats[accountId].countTransfer
        })
      }
    })
    
    // 计算日均收支和每日趋势
    const daysInMonth = new Date(year, month, 0).getDate()
    const dailyIncome = Array(daysInMonth).fill(0)
    const dailyExpense = Array(daysInMonth).fill(0)
    monthlyTransactions.forEach(trx => {
      const d = new Date(trx.date)
      if (isNaN(d.getTime())) return
      const day = d.getDate()
      if (day >= 1 && day <= daysInMonth) {
        if (trx.type === 'income') dailyIncome[day - 1] += trx.amount
        if (trx.type === 'expense') dailyExpense[day - 1] += trx.amount
      }
    })
    const dailyTrend = Array.from({ length: daysInMonth }, (_, i) => {
      const dd = String(i + 1).padStart(2, '0')
      const mm = String(month).padStart(2, '0')
      const income = dailyIncome[i] || 0
      const expense = dailyExpense[i] || 0
      return {
        date: `${year}-${mm}-${dd}`,
        dateDisplay: `${i + 1}日`,
        income,
        expense,
        balance: income - expense
      }
    })
    const dailyAvgIncome = totalIncome / daysInMonth
    const dailyAvgExpense = totalExpense / daysInMonth
    
    return {
      year,
      month,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount: monthlyTransactions.length,
      dailyAvgIncome,
      dailyAvgExpense,
      dailyTrend,
      categoryStats: formattedCategoryStats,
      tagStats,
      accountStats: formattedAccountStats,
      daysInMonth
    }
  } catch (error) {
    console.error('生成月度收支报表失败:', error)
    throw error
  }
}

/**
 * 生成年度收支报表
 * @param {Number} year 年份
 * @returns {Object} 年度收支报表数据
 */
async function generateYearlyReport(year) {
  try {
    // 获取所有交易记录
    const transactions = wx.getStorageSync('transactions') || []
    
    // 安全的日期创建和验证
    const yearStartDate = new Date(year, 0, 1)
    const yearEndDate = new Date(year, 11, 31)
    
    // 验证日期是否有效
    if (isNaN(yearStartDate.getTime()) || isNaN(yearEndDate.getTime())) {
      throw new Error(`无效的年份参数: year=${year}`)
    }
    
    // 筛选指定年份的交易记录
    const yearStart = yearStartDate.toISOString().split('T')[0]
    const yearEnd = yearEndDate.toISOString().split('T')[0]
    
    // 安全日期解析，过滤无效日期
    const yearlyTransactions = transactions.filter(trx => {
      if (!trx || !trx.date) return false
      const d = new Date(trx.date)
      if (isNaN(d.getTime())) return false
      const transactionDate = d.toISOString().split('T')[0]
      return transactionDate >= yearStart && transactionDate <= yearEnd
    })
    
    // 按月统计
    const monthlyStats = Array(12).fill().map(() => ({
      income: 0,
      expense: 0,
      balance: 0,
      count: 0
    }))
    
    // 按分类统计
    const categoryStats = {}
    
    // 统计数据
    yearlyTransactions.forEach(transaction => {
      const { type, amount, categoryId, date } = transaction
      
      // 获取月份索引（0-11），非法日期跳过
      const d = new Date(date)
      const month = isNaN(d.getTime()) ? -1 : d.getMonth()
      if (month < 0 || month > 11) return
      
      // 按月统计
      if (type === 'income') {
        monthlyStats[month].income += amount
      } else if (type === 'expense') {
        monthlyStats[month].expense += amount
      }
      monthlyStats[month].count++
      monthlyStats[month].balance = monthlyStats[month].income - monthlyStats[month].expense
      
      // 按分类统计（无分类归入“未分类”）
      if (categoryId) {
        if (!categoryStats[categoryId]) {
          categoryStats[categoryId] = {
            income: 0,
            expense: 0,
            count: 0
          }
        }
        categoryStats[categoryId][type] += (type === 'income' || type === 'expense') ? amount : 0
        categoryStats[categoryId].count++
      } else {
        const unc = '__uncat__'
        if (!categoryStats[unc]) {
          categoryStats[unc] = {
            income: 0,
            expense: 0,
            count: 0
          }
        }
        categoryStats[unc][type] += (type === 'income' || type === 'expense') ? amount : 0
        categoryStats[unc].count++
      }
    })
    
    // 计算年度总收支
    const totalIncome = monthlyStats.reduce((sum, m) => sum + m.income, 0)
    const totalExpense = monthlyStats.reduce((sum, m) => sum + m.expense, 0)
    
    // 获取分类信息
    const categories = wx.getStorageSync('customCategories') || []
    const defaultCategories = [
      // 支出分类
      { _id: 'expense_1', name: '餐饮', icon: '🍽️', type: 'expense', color: '#FF6B6B', isDefault: true },
      { _id: 'expense_2', name: '交通', icon: '🚗', type: 'expense', color: '#4ECDC4', isDefault: true },
      { _id: 'expense_3', name: '购物', icon: '🛒', type: 'expense', color: '#45B7D1', isDefault: true },
      { _id: 'expense_4', name: '娱乐', icon: '🎮', type: 'expense', color: '#96CEB4', isDefault: true },
      { _id: 'expense_5', name: '医疗', icon: '🏥', type: 'expense', color: '#FFEAA7', isDefault: true },
      { _id: 'expense_6', name: '教育', icon: '📚', type: 'expense', color: '#DDA0DD', isDefault: true },
      { _id: 'expense_7', name: '住房', icon: '🏠', type: 'expense', color: '#FFB6C1', isDefault: true },
      { _id: 'expense_8', name: '通讯', icon: '📱', type: 'expense', color: '#87CEEB', isDefault: true },
      
      // 收入分类
      { _id: 'income_1', name: '工资', icon: '💰', type: 'income', color: '#32CD32', isDefault: true },
      { _id: 'income_2', name: '奖金', icon: '🎁', type: 'income', color: '#FFD700', isDefault: true },
      { _id: 'income_3', name: '投资收益', icon: '📈', type: 'income', color: '#00CED1', isDefault: true },
      { _id: 'income_4', name: '兼职', icon: '💼', type: 'income', color: '#9370DB', isDefault: true },
      { _id: 'income_5', name: '礼金', icon: '🧧', type: 'income', color: '#FF69B4', isDefault: true },
      { _id: 'income_6', name: '退款', icon: '↩️', type: 'income', color: '#20B2AA', isDefault: true },
      
      // 转账分类
      { _id: 'transfer_1', name: '转账', icon: '🔄', type: 'transfer', color: '#808080', isDefault: true }
    ]
    const allCategories = [...defaultCategories, ...categories]
    
    // 分类统计使用统一处理，确保与月/自定义一致
    const formattedCategoryStats = processUnifiedCategoryStats(yearlyTransactions)
    
    return {
      year,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount: yearlyTransactions.length,
      monthlyStats,
      categoryStats: formattedCategoryStats
    }
  } catch (error) {
    console.error('生成年度收支报表失败:', error)
    throw error
  }
}

/**
 * 生成资产负债报表
 * 整合账户余额和投资信息
 * @returns {Object} 资产负债报表数据
 */
async function generateBalanceSheet() {
  try {
    console.log('开始生成资产负债报表');
    
    // 获取所有账户
    const accounts = wx.getStorageSync('accounts') || []
    console.log('获取到账户数据:', accounts.length, '个账户');
    
    // 获取所有投资
    const investments = wx.getStorageSync('investments') || []
    console.log('获取到投资数据:', investments.length, '个投资');
    
    // 验证数据格式
    const validAccounts = accounts.filter(account => {
      const isValid = account && typeof account.balance === 'number';
      if (!isValid) {
        console.warn('无效账户数据:', account);
      }
      return isValid;
    });
    
    const validInvestments = investments.filter(investment => {
      const isValid = investment && (
        typeof investment.currentValue === 'number' || 
        typeof investment.amount === 'number'
      );
      if (!isValid) {
        console.warn('无效投资数据:', investment);
      }
      return isValid;
    });
    
    console.log('有效数据:', validAccounts.length, '个账户,', validInvestments.length, '个投资');
    
    // 计算总资产（兼容 amount 与 currentValue）
    const totalCash = validAccounts.reduce((sum, account) => {
      const balance = Number(account.balance) || 0;
      return sum + balance;
    }, 0);
    
    const totalInvestment = validInvestments.reduce((sum, investment) => {
      const current = Number(
        investment.currentValue != null ? investment.currentValue : 
        (investment.amount != null ? investment.amount : 0)
      );
      return sum + (isNaN(current) ? 0 : current);
    }, 0);
    
    const totalAssets = totalCash + totalInvestment;
    
    console.log('资产计算结果:', {
      totalCash,
      totalInvestment,
      totalAssets
    });
    
    // 如果没有任何资产数据，返回默认结构
    if (totalAssets === 0 && validAccounts.length === 0 && validInvestments.length === 0) {
      console.warn('没有找到任何资产数据，返回默认结构');
      return {
        totalAssets: 0,
        totalCash: 0,
        totalInvestment: 0,
        accountsByType: {},
        investmentsByType: {},
        accountCount: 0,
        investmentCount: 0,
        timestamp: new Date().toISOString()
      };
    }
    
    // 按类型统计账户
    const accountsByType = {}
    
    validAccounts.forEach(account => {
      const type = account.type || '其他'
      
      if (!accountsByType[type]) {
        accountsByType[type] = {
          count: 0,
          balance: 0,
          accounts: []
        }
      }
      
      accountsByType[type].count++
      accountsByType[type].balance += Number(account.balance) || 0
      accountsByType[type].accounts.push({
        id: account.id || account._id,
        name: account.name || '未命名账户',
        balance: Number(account.balance) || 0,
        icon: account.icon || '💰',
        type: account.type || type
      })
    })
    
    // 按类型统计投资（兼容 amount/cost 与 currentValue/initialValue）
    const investmentsByType = {}
    
    validInvestments.forEach(investment => {
      const type = investment.type || '其他'
      
      if (!investmentsByType[type]) {
        investmentsByType[type] = {
          count: 0,
          currentValue: 0,
          initialValue: 0,
          profit: 0,
          investments: []
        }
      }
      
      const current = Number(investment.currentValue != null ? investment.currentValue : 
        (investment.amount != null ? investment.amount : 0))
      const initial = Number(investment.initialValue != null ? investment.initialValue : 
        (investment.cost != null ? investment.cost : 0))
      const profit = current - initial
      
      investmentsByType[type].count++
      investmentsByType[type].currentValue += isNaN(current) ? 0 : current
      investmentsByType[type].initialValue += isNaN(initial) ? 0 : initial
      investmentsByType[type].profit += isNaN(profit) ? 0 : profit
      investmentsByType[type].investments.push({
        id: investment.id || investment._id,
        name: investment.name || '未命名投资',
        initialValue: isNaN(initial) ? 0 : initial,
        currentValue: isNaN(current) ? 0 : current,
        profit: isNaN(profit) ? 0 : profit,
        profitRate: (initial > 0 ? ((profit / initial) * 100).toFixed(2) : '0.00') + '%',
        icon: investment.icon || '📈',
        type: investment.type || '其他'
      })
    })
    
    const result = {
      totalAssets,
      totalCash,
      totalInvestment,
      accountsByType,
      investmentsByType,
      accountCount: validAccounts.length,
      investmentCount: validInvestments.length,
      timestamp: new Date().toISOString()
    };
    
    console.log('资产负债报表生成完成:', result);
    return result;
  } catch (error) {
    console.error('生成资产负债报表失败:', error)
    throw error
  }
}

/**
 * 生成综合财务报表
 * 整合记账数据和投资信息
 * @param {Number} year 年份
 * @param {Number} month 月份（可选，如果不提供则生成年度报表）
 * @returns {Object} 综合财务报表数据
 */
async function generateComprehensiveReport(year, month = null) {
  try {
    let periodReport
    
    if (month) {
      // 生成月度报表
      periodReport = await generateMonthlyReport(year, month)
    } else {
      // 生成年度报表
      periodReport = await generateYearlyReport(year)
    }
    
    // 生成资产负债报表
    const balanceSheet = await generateBalanceSheet()
    
    // 整合报表数据
    return {
      periodReport,
      balanceSheet,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('生成综合财务报表失败:', error)
    throw error
  }
}

/**
 * 生成投资收益报表
 * @param {Number} year 年份
 * @param {Number} month 月份（可选，如果不提供则生成年度报表）
 * @returns {Object} 投资收益报表数据
 */
async function generateInvestmentReport(year, month = null) {
  try {
    // 获取所有投资
    const investments = wx.getStorageSync('investments') || []
    
    // 获取所有交易记录
    const transactions = wx.getStorageSync('transactions') || []
    
    // 筛选投资收益类型的交易记录
    const investmentTransactions = transactions.filter(transaction => {
      // 检查是否为投资收益类型的收入
      const isInvestmentIncome = transaction.type === 'income' && 
        (transaction.categoryId === 'income_3' || // 投资收益分类ID
         (transaction.tags && transaction.tags.some(tag => tag.includes('投资') || tag.includes('理财'))));
      
      // 如果指定了月份，则还需要筛选指定月份的记录
      if (isInvestmentIncome && month) {
        const transactionDate = new Date(transaction.date)
        return transactionDate.getFullYear() === year && transactionDate.getMonth() + 1 === month
      } else if (isInvestmentIncome) {
        const transactionDate = new Date(transaction.date)
        return transactionDate.getFullYear() === year
      }
      
      return false
    })
    
    // 计算投资收益总额
    const totalInvestmentIncome = investmentTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
    
    // 计算投资总值（仍按 currentValue/initialValue 统计）
    const totalInvestmentValue = investments.reduce((sum, investment) => sum + investment.currentValue, 0)
    const totalInitialValue = investments.reduce((sum, investment) => sum + investment.initialValue, 0)
    const totalProfit = totalInvestmentValue - totalInitialValue
    
    // 计算投资收益率
    const overallProfitRate = totalInitialValue > 0 ? (totalProfit / totalInitialValue * 100).toFixed(2) + '%' : '0%'
    
    // 按投资类型统计
    const statsByType = {}
    
    investments.forEach(investment => {
      const type = investment.type || '其他'
      
      if (!statsByType[type]) {
        statsByType[type] = {
          count: 0,
          currentValue: 0,
          initialValue: 0,
          profit: 0
        }
      }
      
      const profit = investment.currentValue - investment.initialValue
      
      statsByType[type].count++
      statsByType[type].currentValue += investment.currentValue
      statsByType[type].initialValue += investment.initialValue
      statsByType[type].profit += profit
    })
    
    // 计算各类型投资收益率
    Object.keys(statsByType).forEach(type => {
      const { initialValue, profit } = statsByType[type]
      statsByType[type].profitRate = initialValue > 0 ? (profit / initialValue * 100).toFixed(2) + '%' : '0%'
    })
    
    return {
      year,
      month,
      totalInvestmentIncome,
      totalInvestmentValue,
      totalInitialValue,
      totalProfit,
      overallProfitRate,
      statsByType,
      investmentCount: investments.length,
      incomeTransactionCount: investmentTransactions.length,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('生成投资收益报表失败:', error)
    throw error
  }
}

/**
 * 根据参数生成报表
 * @param {Object} params 报表参数
 * @returns {Object} 报表数据
 */
async function generateReport(params) {
  try {
    const { 
      startDate, 
      endDate, 
      dateRange, 
      currentYear, 
      currentMonth, 
      customStartDate, 
      customEndDate 
    } = params;
    
    // 验证输入参数
    if (!params || !dateRange) {
      throw new Error('缺少必要的参数: dateRange');
    }
    
    // 验证年份和月份参数
    if (dateRange === 'month' || dateRange === 'year') {
      if (typeof currentYear !== 'number' || currentYear < 1900 || currentYear > 2100) {
        throw new Error(`无效的年份参数: ${currentYear}`);
      }
      
      if (dateRange === 'month') {
        if (typeof currentMonth !== 'number' || currentMonth < 0 || currentMonth > 11) {
          throw new Error(`无效的月份参数: ${currentMonth}`);
        }
      }
    }
    
    // 验证自定义日期参数
    if (dateRange === 'custom') {
      if (!customStartDate || !customEndDate) {
        throw new Error('自定义日期范围缺少开始或结束日期');
      }
      
      const startDateObj = new Date(customStartDate);
      const endDateObj = new Date(customEndDate);
      
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        throw new Error(`无效的自定义日期: startDate=${customStartDate}, endDate=${customEndDate}`);
      }
    }
    
    // 根据日期范围选择合适的报表生成函数
    let reportData = {
      summary: {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0
      },
      categoryStats: { expense: [], income: [] },
      tagStats: { expense: [], income: [] },
      trendData: [],
      assetData: {
        accounts: [],
        investments: [],
        totalAssets: 0,
        assetsDistribution: []
      },
      crossStats: {
        category: { items: [] },
        tag: { items: [] },
        account: { items: [] },
        investment: { items: [] }
      },
      budgetData: {}
    };
    
    // 获取月度报表数据
    if (dateRange === 'month') {
      const monthlyReport = await generateMonthlyReport(currentYear, currentMonth + 1);
      
      // 填充报表数据
      reportData.summary = {
        totalIncome: monthlyReport.totalIncome || 0,
        totalExpense: monthlyReport.totalExpense || 0,
        balance: (monthlyReport.totalIncome || 0) - (monthlyReport.totalExpense || 0)
      };
      
      // 分类统计
      const expenseCategories = monthlyReport.categoryStats.filter(c => c.type === 'expense');
      const incomeCategories = monthlyReport.categoryStats.filter(c => c.type === 'income');
      
      // 计算百分比
      const totalExpense = reportData.summary.totalExpense || 1;
      const totalIncome = reportData.summary.totalIncome || 1;
      
      const processedExpenseCategories = expenseCategories.map(cat => ({
        ...cat,
        amount: cat.expense || 0, // 补充 amount，以便 WXML 使用
        percentage: Math.round((cat.expense / totalExpense) * 100) || 0,
        count: cat.count || 0
      }));
      
      const processedIncomeCategories = incomeCategories.map(cat => ({
        ...cat,
        amount: cat.income || 0, // 补充 amount，以便 WXML 使用
        percentage: Math.round((cat.income / totalIncome) * 100) || 0,
        count: cat.count || 0
      }));
      
      reportData.categoryStats = {
        expense: processedExpenseCategories,
        income: processedIncomeCategories
      };
      
      // 标签统计（统一名称：ID->名称映射，去#前缀；合并同名；保留“其他”）
      const customTags = wx.getStorageSync('customTags') || [];
      const tagIdToName = (customTags || []).reduce((m, t) => {
        const key = t && (t._id || t.id);
        if (key) m[String(key).trim().toLowerCase()] = t.name || t.label || t.text || String(key).trim();
        return m;
      }, {});
      const defaultTagMap = { tag_1: '必需品', tag_2: '娱乐', tag_3: '投资', tag_4: '礼品' };
      const normalizeKey = (val) => {
        const s = String(val || '').trim();
        const noHash = s.startsWith('#') ? s.slice(1).trim() : s;
        return noHash.toLowerCase();
      };
      const displayName = (raw) => {
        const key = normalizeKey(raw);
        return tagIdToName[key] || defaultTagMap[key] || (raw && String(raw).replace(/^#/, '').trim()) || '未命名';
      };

      const expenseMap = {};
      const incomeMap = {};
      Object.keys(monthlyReport.tagStats || {}).forEach(tag => {
        const stats = monthlyReport.tagStats[tag];
        const name = displayName(tag);
        if (stats && stats.expense > 0) {
          if (!expenseMap[name]) expenseMap[name] = { name, amount: 0, count: 0, percentage: 0 };
          expenseMap[name].amount += stats.expense;
          expenseMap[name].count += (Number(stats.countExpense) || 1);
        }
        if (stats && stats.income > 0) {
          if (!incomeMap[name]) incomeMap[name] = { name, amount: 0, count: 0, percentage: 0 };
          incomeMap[name].amount += stats.income;
          incomeMap[name].count += (Number(stats.countIncome) || 1);
        }
      });
      const tagStats = {
        expense: Object.values(expenseMap).map(item => ({
          ...item,
          percentage: Math.round(((item.amount || 0) / (totalExpense || 1)) * 100) || 0
        })),
        income: Object.values(incomeMap).map(item => ({
          ...item,
          percentage: Math.round(((item.amount || 0) / (totalIncome || 1)) * 100) || 0
        }))
      };
      try {
        console.log('[report] monthly tag keys:', Object.keys(monthlyReport.tagStats || {}));
        console.log('[report] tagStats mapped:', tagStats);
      } catch (_) {}
      reportData.tagStats = tagStats;
      
      // 按账户统计（仅月度）：透传月度报表中的账户聚合，并补充净额
      try {
        reportData.accountStats = (monthlyReport.accountStats || []).map(it => {
          const inc = Number(it.income) || 0;
          const exp = Number(it.expense) || 0;
          return {
            id: it.id,
            name: it.name,
            // 透传服务层图标与颜色，供前端直接渲染
            icon: it.icon,
            color: it.color,
            type: it.type,
            income: inc,
            expense: exp,
            net: inc - exp,
            count: Number(it.count) || 0,
            countIncome: Number(it.countIncome) || 0,
            countExpense: Number(it.countExpense) || 0,
            countTransfer: Number(it.countTransfer) || 0
          };
        });
      } catch (e) {
        console.warn('构建月度账户统计失败，已回退为空数组：', e && e.message);
        reportData.accountStats = [];
      }
      
      // 为趋势数据添加资产信息（使用当月资产快照）
      const trendData = monthlyReport.dailyTrend || [];
      const ymKeyForMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const monthAsset = await generateMonthlyAssetData(ymKeyForMonth);
      const enhancedTrendData = trendData.map(item => ({
        ...item,
        totalAssets: monthAsset.totalAssets || 0
      }));
      reportData.trendData = enhancedTrendData;
    }
    // 获取年度报表数据
    else if (dateRange === 'year') {
      const yearlyReport = await generateYearlyReport(currentYear);
      
      // 填充报表数据
      reportData.summary = {
        totalIncome: yearlyReport.totalIncome || 0,
        totalExpense: yearlyReport.totalExpense || 0,
        balance: (yearlyReport.totalIncome || 0) - (yearlyReport.totalExpense || 0)
      };
      
      // 分类统计 - 修复按年统计时支出分类不显示的问题
      // 根据实际金额来判断分类类型，而不是依赖type字段
      const expenseCategories = yearlyReport.categoryStats.filter(c => {
        const expenseAmount = c.expense || 0;
        const incomeAmount = c.income || 0;
        // 如果有type字段且为expense，或者支出金额大于收入金额，则认为是支出分类
        return c.type === 'expense' || (expenseAmount > 0 && expenseAmount >= incomeAmount);
      });
      
      const incomeCategories = yearlyReport.categoryStats.filter(c => {
        const expenseAmount = c.expense || 0;
        const incomeAmount = c.income || 0;
        // 如果有type字段且为income，或者收入金额大于支出金额，则认为是收入分类
        return c.type === 'income' || (incomeAmount > 0 && incomeAmount > expenseAmount);
      });
      
      // 计算百分比
      const totalExpense = reportData.summary.totalExpense || 1;
      const totalIncome = reportData.summary.totalIncome || 1;
      
      const processedExpenseCategories = expenseCategories.map(cat => ({
        ...cat,
        type: 'expense', // 确保type字段正确
        amount: cat.expense || 0, // 补充 amount，以便 WXML 使用
        percentage: Math.round(((cat.expense || 0) / totalExpense) * 100) || 0,
        count: cat.count || 0
      }));
      
      const processedIncomeCategories = incomeCategories.map(cat => ({
        ...cat,
        type: 'income', // 确保type字段正确
        amount: cat.income || 0, // 补充 amount，以便 WXML 使用
        percentage: Math.round(((cat.income || 0) / totalIncome) * 100) || 0,
        count: cat.count || 0
      }));
      
      reportData.categoryStats = {
        expense: processedExpenseCategories,
        income: processedIncomeCategories
      };
      
      // 年度标签统计（与月度一致：ID->名称映射、去#前缀、无标签归“其他”）
      try {
        const transactions = wx.getStorageSync('transactions') || [];
        const yearlyTx = transactions.filter(trx => {
          if (!trx || !trx.date) return false;
          const d = new Date(trx.date);
          return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
        });

        const customTags = wx.getStorageSync('customTags') || [];
        const tagIdToName = (customTags || []).reduce((m, t) => {
          const key = t && (t._id || t.id);
          if (key) m[String(key).trim().toLowerCase()] = t.name || t.label || t.text || String(key).trim();
          return m;
        }, {});
        const defaultTagMap = { tag_1: '必需品', tag_2: '娱乐', tag_3: '投资', tag_4: '礼品' };
        const normalizeKey = (val) => {
          const s = String(val || '').trim();
          const noHash = s.startsWith('#') ? s.slice(1).trim() : s;
          return noHash.toLowerCase();
        };
        const displayName = (raw) => {
          const key = normalizeKey(raw);
          return tagIdToName[key] || defaultTagMap[key] || (raw && String(raw).replace(/^#/, '').trim()) || '未命名';
        };

        const expenseMap = {};
        const incomeMap = {};
        yearlyTx.forEach(transaction => {
          const { type, amount } = transaction;
          if (type !== 'income' && type !== 'expense') return;

          const tags = transaction.tags;
          const rawTags = Array.isArray(tags) ? tags
            : Array.isArray(transaction.tagIds) ? transaction.tagIds
            : Array.isArray(transaction.labels) ? transaction.labels
            : Array.isArray(transaction.tagList) ? transaction.tagList
            : (typeof transaction.labels === 'string'
                ? transaction.labels.split(',').map(s => s.trim()).filter(Boolean)
                : null);

          if (rawTags && rawTags.length > 0) {
            rawTags.forEach(tag => {
              let name;
              if (typeof tag === 'string') {
                name = displayName(tag);
              } else {
                const tid = tag && (tag.id || tag._id);
                const nm = tag && (tag.name || tag.label || tag.text);
                name = nm ? String(nm).replace(/^#/, '').trim() : (tid != null ? displayName(tid) : '未命名');
              }
              if (type === 'expense') {
                if (!expenseMap[name]) expenseMap[name] = { name, amount: 0, count: 0, percentage: 0 };
                expenseMap[name].amount += amount;
                expenseMap[name].count += 1;
              } else if (type === 'income') {
                if (!incomeMap[name]) incomeMap[name] = { name, amount: 0, count: 0, percentage: 0 };
                incomeMap[name].amount += amount;
                incomeMap[name].count += 1;
              }
            });
          } else {
            const other = '其他';
            if (type === 'expense') {
              if (!expenseMap[other]) expenseMap[other] = { name: other, amount: 0, count: 0, percentage: 0 };
              expenseMap[other].amount += amount;
              expenseMap[other].count += 1;
            } else if (type === 'income') {
              if (!incomeMap[other]) incomeMap[other] = { name: other, amount: 0, count: 0, percentage: 0 };
              incomeMap[other].amount += amount;
              incomeMap[other].count += 1;
            }
          }
        });

        const totalExpense = reportData.summary.totalExpense || 1;
        const totalIncome = reportData.summary.totalIncome || 1;
        reportData.tagStats = {
          expense: Object.values(expenseMap).map(item => ({
            ...item,
            percentage: Math.round(((item.amount || 0) / (totalExpense || 1)) * 100) || 0
          })),
          income: Object.values(incomeMap).map(item => ({
            ...item,
            percentage: Math.round(((item.amount || 0) / (totalIncome || 1)) * 100) || 0
          }))
        };
      } catch (e) {
        console.warn('年度标签统计构建失败（已忽略）：', e && e.message);
      }

      // 趋势数据 - 每月资产来自对应月份快照，仅显示到当前月份
      reportData.trendData = await (async () => {
        const arr = [];
        const now = new Date();
        const currentYearNow = now.getFullYear();
        const currentMonthNow = now.getMonth(); // 0-based
        
        // 确定显示的月份范围：如果是当前年份，只显示到当前月份；否则显示全年12个月
        const maxMonth = (currentYear === currentYearNow) ? (currentMonthNow + 1) : 12;
        
        for (let i = 0; i < maxMonth; i++) {
          const ymKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
          const a = await generateMonthlyAssetData(ymKey);
          const m = yearlyReport.monthlyStats[i] || { income: 0, expense: 0 };
          arr.push({
            date: ymKey,
            year: currentYear,
            month: i + 1,
            dateDisplay: `${currentYear}年${String(i + 1).padStart(2, '0')}月`,
            income: m.income || 0,
            expense: m.expense || 0,
            balance: (m.income || 0) - (m.expense || 0),
            totalAssets: a.totalAssets || 0
          });
        }
        return arr;
      })();
    } else {
      // 其它范围（周/季/自定义等）：按起止日期聚合并生成标签统计
      const transactions = wx.getStorageSync('transactions') || [];

      // 安全解析本地日期，避免UTC偏移
      const parseDate = (s) => {
        if (!s) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          const [y, m, d] = s.split('-').map(Number);
          return new Date(y, m - 1, d);
        }
        const dObj = new Date(s);
        return isNaN(dObj.getTime()) ? null : dObj;
      };

      const s = parseDate(startDate);
      const e = parseDate(endDate);
      if (!s || !e) {
        console.warn('自定义范围日期解析失败:', { startDate, endDate });
      }
      // 结束日扩展到当天末尾
      const eEnd = e ? new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999) : null;

      const inRange = (t) => {
        const d = parseDate(t.date);
        return d && s && eEnd && d >= s && d <= eEnd;
      };

      const list = transactions.filter(t => t && t.date && inRange(t));

      let totalIncome = 0;
      let totalExpense = 0;

      // 按分类统计（修复自定义时间段分类数据不准确问题）
      const categoryStats = {};
      
      const customTags = wx.getStorageSync('customTags') || [];
      const tagIdToName = (customTags || []).reduce((m, t) => {
        const key = t && (t._id || t.id);
        if (key) m[String(key).trim().toLowerCase()] = t.name || t.label || t.text || String(key).trim();
        return m;
      }, {});
      const defaultTagMap = { tag_1: '必需品', tag_2: '娱乐', tag_3: '投资', tag_4: '礼品' };
      const normalizeKey = (val) => {
        const s2 = String(val || '').trim();
        const noHash = s2.startsWith('#') ? s2.slice(1).trim() : s2;
        return noHash.toLowerCase();
      };
      const displayName = (raw) => {
        const key = normalizeKey(raw);
        return tagIdToName[key] || defaultTagMap[key] || (raw && String(raw).replace(/^#/, '').trim()) || '未命名';
      };

      const expenseMap = {};
      const incomeMap = {};

      list.forEach(trx => {
        const { type, amount, categoryId } = trx;
        if (type === 'income') totalIncome += amount || 0;
        if (type === 'expense') totalExpense += amount || 0;

        // 按分类统计
        const resolvedKey = categoryId || trx.category || trx.categoryName || '__uncat__';
        if (!categoryStats[resolvedKey]) {
          categoryStats[resolvedKey] = {
            income: 0,
            expense: 0,
            count: 0
          };
        }
        if (type === 'income' || type === 'expense') {
          categoryStats[resolvedKey][type] += amount || 0;
        }
        categoryStats[resolvedKey].count++;

        if (type !== 'income' && type !== 'expense') return;

        const tagsArr = Array.isArray(trx.tags) ? trx.tags
          : Array.isArray(trx.tagIds) ? trx.tagIds
          : Array.isArray(trx.labels) ? trx.labels
          : Array.isArray(trx.tagList) ? trx.tagList
          : (typeof trx.labels === 'string'
              ? trx.labels.split(',').map(s3 => s3.trim()).filter(Boolean)
              : null);

        if (tagsArr && tagsArr.length > 0) {
          tagsArr.forEach(tag => {
            let name;
            if (typeof tag === 'string') {
              name = displayName(tag);
            } else {
              const tid = tag && (tag.id || tag._id);
              const nm = tag && (tag.name || tag.label || tag.text);
              name = nm ? String(nm).replace(/^#/, '').trim() : (tid != null ? displayName(tid) : '未命名');
            }
            if (type === 'expense') {
              if (!expenseMap[name]) expenseMap[name] = { name, amount: 0, count: 0, percentage: 0 };
              expenseMap[name].amount += amount || 0;
              expenseMap[name].count += 1;
            } else if (type === 'income') {
              if (!incomeMap[name]) incomeMap[name] = { name, amount: 0, count: 0, percentage: 0 };
              incomeMap[name].amount += amount || 0;
              incomeMap[name].count += 1;
            }
          });
        } else {
          const other = '其他';
          if (type === 'expense') {
            if (!expenseMap[other]) expenseMap[other] = { name: other, amount: 0, count: 0, percentage: 0 };
            expenseMap[other].amount += amount || 0;
            expenseMap[other].count += 1;
          } else if (type === 'income') {
            if (!incomeMap[other]) incomeMap[other] = { name: other, amount: 0, count: 0, percentage: 0 };
            incomeMap[other].amount += amount || 0;
            incomeMap[other].count += 1;
          }
        }
      });

      reportData.summary = {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense
      };

      // 格式化分类统计数据
      const categories = wx.getStorageSync('customCategories') || [];
      const defaultCategories = [
        // 支出分类
        { _id: 'expense_1', name: '餐饮', icon: '🍽️', type: 'expense', color: '#FF6B6B', isDefault: true },
        { _id: 'expense_2', name: '交通', icon: '🚗', type: 'expense', color: '#4ECDC4', isDefault: true },
        { _id: 'expense_3', name: '购物', icon: '🛒', type: 'expense', color: '#45B7D1', isDefault: true },
        { _id: 'expense_4', name: '娱乐', icon: '🎮', type: 'expense', color: '#96CEB4', isDefault: true },
        { _id: 'expense_5', name: '医疗', icon: '🏥', type: 'expense', color: '#FFEAA7', isDefault: true },
        { _id: 'expense_6', name: '教育', icon: '📚', type: 'expense', color: '#DDA0DD', isDefault: true },
        { _id: 'expense_7', name: '住房', icon: '🏠', type: 'expense', color: '#FFB6C1', isDefault: true },
        { _id: 'expense_8', name: '通讯', icon: '📱', type: 'expense', color: '#87CEEB', isDefault: true },
        
        // 收入分类
        { _id: 'income_1', name: '工资', icon: '💰', type: 'income', color: '#32CD32', isDefault: true },
        { _id: 'income_2', name: '奖金', icon: '🎁', type: 'income', color: '#FFD700', isDefault: true },
        { _id: 'income_3', name: '投资收益', icon: '📈', type: 'income', color: '#00CED1', isDefault: true },
        { _id: 'income_4', name: '兼职', icon: '💼', type: 'income', color: '#9370DB', isDefault: true },
        { _id: 'income_5', name: '礼金', icon: '🧧', type: 'income', color: '#FF69B4', isDefault: true },
        { _id: 'income_6', name: '退款', icon: '↩️', type: 'income', color: '#20B2AA', isDefault: true },
        
        // 转账分类
        { _id: 'transfer_1', name: '转账', icon: '🔄', type: 'transfer', color: '#808080', isDefault: true }
      ];
      const allCategories = [...defaultCategories, ...categories];
      
      const formattedCategoryStats = [];
      Object.keys(categoryStats).forEach(categoryId => {
        let category = allCategories.find(c => c._id === categoryId);
        if (!category && typeof categoryId === 'string') {
          category = allCategories.find(c => c.name === categoryId);
        }
        if (category) {
          formattedCategoryStats.push({
            id: category._id,
            name: category.name,
            icon: category.icon,
            color: category.color,
            type: category.type,
            income: categoryStats[categoryId].income,
            expense: categoryStats[categoryId].expense,
            count: categoryStats[categoryId].count,
            amount: category.type === 'expense' ? categoryStats[categoryId].expense : categoryStats[categoryId].income,
            percentage: category.type === 'expense' 
              ? Math.round(((categoryStats[categoryId].expense || 0) / (totalExpense || 1)) * 100) || 0
              : Math.round(((categoryStats[categoryId].income || 0) / (totalIncome || 1)) * 100) || 0
          });
        } else {
          const inferType = (categoryStats[categoryId].expense || 0) >= (categoryStats[categoryId].income || 0) ? 'expense' : 'income';
          formattedCategoryStats.push({
            id: categoryId,
            name: '未分类',
            icon: '🏷️',
            color: '#999999',
            type: inferType,
            income: categoryStats[categoryId].income || 0,
            expense: categoryStats[categoryId].expense || 0,
            count: categoryStats[categoryId].count || 0,
            amount: inferType === 'expense' ? categoryStats[categoryId].expense : categoryStats[categoryId].income,
            percentage: inferType === 'expense' 
              ? Math.round(((categoryStats[categoryId].expense || 0) / (totalExpense || 1)) * 100) || 0
              : Math.round(((categoryStats[categoryId].income || 0) / (totalIncome || 1)) * 100) || 0
          });
        }
      });

      const expenseCategories = formattedCategoryStats.filter(c => c.type === 'expense');
      const incomeCategories = formattedCategoryStats.filter(c => c.type === 'income');

      reportData.categoryStats = {
        expense: expenseCategories,
        income: incomeCategories
      };

      reportData.tagStats = {
        expense: Object.values(expenseMap).map(item => ({
          ...item,
          percentage: Math.round(((item.amount || 0) / (totalExpense || 1)) * 100) || 0
        })),
        income: Object.values(incomeMap).map(item => ({
          ...item,
          percentage: Math.round(((item.amount || 0) / (totalIncome || 1)) * 100) || 0
        }))
      };

      // 生成自定义时间段的趋势数据（按月聚合，包含资产信息）
      reportData.trendData = await (async () => {
        const toNum = (v) => Number(v) || 0;

        // 1) 构造完整月份序列（包含无交易月份）
        const months = [];
        if (s && eEnd) {
          const startFull = new Date(s.getFullYear(), s.getMonth(), 1);
          const endFull = new Date(eEnd.getFullYear(), eEnd.getMonth(), 1);
          let cur = new Date(startFull);
          while (cur <= endFull) {
            months.push({
              year: cur.getFullYear(),
              month: cur.getMonth() + 1,
              ymKey: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
            });
            cur.setMonth(cur.getMonth() + 1);
          }
        }

        // 2) 基于交易按月聚合 income/expense（仅覆盖有交易的月份）
        const trendAgg = {};
        list.forEach(trx => {
          const d = parseDate(trx.date);
          if (!d) return;
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          const ymKey = `${y}-${String(m).padStart(2, '0')}`;
          if (!trendAgg[ymKey]) {
            trendAgg[ymKey] = { income: 0, expense: 0 };
          }
          if (trx.type === 'income') trendAgg[ymKey].income += toNum(trx.amount);
          else if (trx.type === 'expense') trendAgg[ymKey].expense += toNum(trx.amount);
        });

        // 3) 生成最终序列：全月份 + 每月资产快照 + 结余
        const result = [];
        for (const m of months) {
          const ymKey = m.ymKey;
          const agg = trendAgg[ymKey] || { income: 0, expense: 0 };
          const assetData = await generateMonthlyAssetData(ymKey);
          result.push({
            date: ymKey,
            year: m.year,
            month: m.month,
            dateDisplay: `${m.year}年${m.month}月`,
            income: toNum(agg.income),
            expense: toNum(agg.expense),
            balance: toNum(agg.income) - toNum(agg.expense),
            totalAssets: toNum(assetData && assetData.totalAssets)
          });
        }

        return result;
      })();
    }
    
    // 获取资产数据 - 根据日期范围获取对应月份的资产数据
    try {
      let assetData;
      
      if (dateRange === 'month') {
        // 获取特定月份的资产数据
        const ymKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        assetData = await generateMonthlyAssetData(ymKey);
      } else if (dateRange === 'year') {
        // 年度资产数据：若为当前年份，使用当前月份；否则用12月
        const now = new Date();
        const isCurrentYear = currentYear === now.getFullYear();
        const effMonth = isCurrentYear ? (now.getMonth() + 1) : 12;
        const ymKey = `${currentYear}-${String(effMonth).padStart(2, '0')}`;
        assetData = await generateMonthlyAssetData(ymKey);
      } else {
        // 自定义日期范围使用结束月份的资产快照
        const endObj = new Date(endDate);
        const endYmKey = `${endObj.getFullYear()}-${String(endObj.getMonth() + 1).padStart(2, '0')}`;
        assetData = await generateMonthlyAssetData(endYmKey);
      }
      
      // 处理账户数据，添加typeName属性
      const accountTypeMap = {
        'cash': '现金',
        'bank': '银行卡',
        'alipay': '支付宝',
        'wechat': '微信',
        'other': '其他'
      };
      
      const processedAccounts = Object.values(assetData.accountsByType || {}).reduce((acc, type) => {
        const list = (type.accounts || []).map(account => ({
          ...account,
          typeName: accountTypeMap[account.type] || '其他账户'
        }))
        return acc.concat(list)
      }, [])
      
      // 处理投资数据，添加typeName属性
      const investmentTypeMap = {
        'fund': '基金',
        'stock': '股票',
        'bank': '银行理财',
        'other': '其他投资'
      };
      
      const processedInvestments = Object.values(assetData.investmentsByType || {}).reduce((acc, type) => {
        const list = (type.investments || []).map(investment => ({
          ...investment,
          typeName: investmentTypeMap[investment.type] || '其他投资'
        }))
        return acc.concat(list)
      }, [])
      
      // 获取资产变化趋势数据
      const assetTrendData = await generateAssetTrendData(currentYear, currentMonth, dateRange);
      
      reportData.assetData = {
        accounts: processedAccounts,
        investments: processedInvestments,
        totalAssets: assetData.totalAssets || 0,
        assetsDistribution: [
          { name: '现金账户', amount: assetData.totalCash || 0, color: '#4CD964' },
          { name: '投资资产', amount: assetData.totalInvestment || 0, color: '#FF9500' }
        ],
        trendData: assetTrendData // 添加资产变化趋势数据
      };
    } catch (error) {
      console.error('获取资产数据失败:', error);
      // 提供默认资产数据
      reportData.assetData = {
        accounts: [],
        investments: [],
        totalAssets: 0,
        assetsDistribution: [
          { name: '现金账户', amount: 0, color: '#4CD964' },
          { name: '投资资产', amount: 0, color: '#FF9500' }
        ],
        trendData: []
      };
    }
    
    return reportData;
  } catch (error) {
    console.error('生成报表失败:', error);
    throw error;
  }
}

/**
 * 导出报表数据为JSON格式
 * @param {Object} params 报表参数
 * @returns {String} JSON格式的报表数据
 */
async function exportReportData(params) {
  try {
    const reportData = await generateReport(params);
    return JSON.stringify(reportData, null, 2);
  } catch (error) {
    console.error('导出报表数据失败:', error);
    throw error;
  }
}

/**
 * 生成月度资产数据
 * @param {String} yearMonth 年月字符串，格式：YYYY-MM
 * @returns {Object} 月度资产数据
 */
async function generateMonthlyAssetData(yearMonth) {
  try {
    // 获取指定月份的账户/投资数据（优先统一的月度资产快照 assets_YYYY-MM）
    const assetSnap = wx.getStorageSync(`assets_${yearMonth}`) || null
    const accounts = (assetSnap && Array.isArray(assetSnap.accounts))
      ? assetSnap.accounts
      : (wx.getStorageSync(`accounts:${yearMonth}`) || wx.getStorageSync('accounts') || [])
    const investments = (assetSnap && Array.isArray(assetSnap.investments))
      ? assetSnap.investments
      : (wx.getStorageSync(`investments:${yearMonth}`) || wx.getStorageSync('investments') || [])
    
    // 计算总资产
    const totalCash = accounts.reduce((sum, account) => sum + account.balance, 0)
    const totalInvestment = investments.reduce((sum, investment) => {
      const current = Number(
        investment.currentValue != null ? investment.currentValue : (investment.amount != null ? investment.amount : 0)
      )
      return sum + (isNaN(current) ? 0 : current)
    }, 0)
    const totalAssets = totalCash + totalInvestment
    
    // 按类型统计账户
    const accountsByType = {}
    accounts.forEach(account => {
      const type = account.type || '其他'
      if (!accountsByType[type]) {
        accountsByType[type] = {
          count: 0,
          balance: 0,
          accounts: []
        }
      }
      accountsByType[type].count++
      accountsByType[type].balance += account.balance
      accountsByType[type].accounts.push({
        id: account.id || account._id,
        name: account.name,
        balance: account.balance,
        icon: account.icon || '💰',
        // 统一透传颜色字段，兼容不同命名
        color: account.color || account.bgColor || account.themeColor,
        type: account.type || type
      })
    })
    
    // 按类型统计投资
    const investmentsByType = {}
    investments.forEach(investment => {
      const type = investment.type || '其他'
      if (!investmentsByType[type]) {
        investmentsByType[type] = {
          count: 0,
          currentValue: 0,
          initialValue: 0,
          profit: 0,
          investments: []
        }
      }
      
      const current = Number(investment.currentValue != null ? investment.currentValue : (investment.amount != null ? investment.amount : 0))
      const initial = Number(investment.initialValue != null ? investment.initialValue : (investment.cost != null ? investment.cost : 0))
      const profit = current - initial
      
      investmentsByType[type].count++
      investmentsByType[type].currentValue += isNaN(current) ? 0 : current
      investmentsByType[type].initialValue += isNaN(initial) ? 0 : initial
      investmentsByType[type].profit += isNaN(profit) ? 0 : profit
      investmentsByType[type].investments.push({
        id: investment.id || investment._id,
        name: investment.name,
        initialValue: isNaN(initial) ? 0 : initial,
        currentValue: isNaN(current) ? 0 : current,
        profit: isNaN(profit) ? 0 : profit,
        profitRate: (initial > 0 ? ((profit / initial) * 100).toFixed(2) : '0.00') + '%',
        icon: investment.icon || '📈',
        type: investment.type || '其他'
      })
    })
    
    return {
      totalAssets,
      totalCash,
      totalInvestment,
      accountsByType,
      investmentsByType,
      accountCount: accounts.length,
      investmentCount: investments.length,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('生成月度资产数据失败:', error)
    throw error
  }
}

/**
 * 生成资产变化趋势数据
 * @param {Number} year 年份
 * @param {Number} month 月份
 * @param {String} dateRange 日期范围类型
 * @returns {Array} 资产变化趋势数据
 */
async function generateAssetTrendData(year, month, dateRange) {
  try {
    const trendData = []
    const assetHistory = wx.getStorageSync('assetHistory') || []
    
    if (dateRange === 'month') {
      // 月度趋势：显示最近6个月的资产变化（使用各月快照计算）
      const monthsToShow = 6
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const targetDate = new Date(year, month - i)
        const ymKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`
        const a = await generateMonthlyAssetData(ymKey)
        trendData.push({
          date: ymKey,
          dateDisplay: `${targetDate.getMonth() + 1}月`,
          totalAssets: (a && a.totalAssets) || 0,
          accountCount: (a && a.accountCount) || 0,
          investmentCount: (a && a.investmentCount) || 0
        })
      }
    } else if (dateRange === 'year') {
      // 年度趋势：显示到当前月份的资产变化（使用各月快照计算）
      const now = new Date();
      const currentYearNow = now.getFullYear();
      const currentMonthNow = now.getMonth(); // 0-based
      
      // 确定显示的月份范围：如果是当前年份，只显示到当前月份；否则显示全年12个月
      const maxMonth = (year === currentYearNow) ? (currentMonthNow + 1) : 12;
      
      for (let i = 0; i < maxMonth; i++) {
        const ymKey = `${year}-${String(i + 1).padStart(2, '0')}`
        const a = await generateMonthlyAssetData(ymKey)
        trendData.push({
          date: ymKey,
          dateDisplay: `${i + 1}月`,
          totalAssets: (a && a.totalAssets) || 0,
          accountCount: (a && a.accountCount) || 0,
          investmentCount: (a && a.investmentCount) || 0
        })
      }
    }
    
    return trendData
  } catch (error) {
    console.error('生成资产趋势数据失败:', error)
    return []
  }
}

module.exports = {
  generateMonthlyReport,
  generateYearlyReport,
  generateBalanceSheet,
  generateComprehensiveReport,
  generateInvestmentReport,
  generateReport,
  exportReportData,
  generateMonthlyAssetData,
  generateAssetTrendData
}