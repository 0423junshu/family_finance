// cloudfunctions/getTransactions/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  try {
    const {
      page = 1,
      pageSize = 20,
      startDate,
      endDate,
      type,
      categoryId,
      accountId,
      memberId,
      orderBy = 'date',
      order = 'desc',
      statsOnly = false
    } = event

    // 获取用户信息
    const userResult = await db.collection('users').where({
      openid: OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      throw new Error('用户不存在')
    }
    
    const user = userResult.data[0]

    // 构建查询条件
    let query = db.collection('transactions').where({
      familyId: user._id // 暂时使用用户ID作为家庭ID
    })

    // 添加筛选条件
    if (startDate && endDate) {
      query = query.where({
        date: _.gte(new Date(startDate)).and(_.lte(new Date(endDate)))
      })
    }

    if (type) {
      query = query.where({ type })
    }

    if (categoryId) {
      query = query.where({ categoryId })
    }

    if (accountId) {
      query = query.where({ accountId })
    }

    if (memberId) {
      query = query.where({ memberId })
    }

    // 如果只需要统计数据
    if (statsOnly) {
      const stats = await calculateStats(query)
      return {
        success: true,
        data: { stats },
        message: '统计数据获取成功'
      }
    }

    // 排序
    const orderDirection = order === 'desc' ? 'desc' : 'asc'
    query = query.orderBy(orderBy, orderDirection)

    // 分页
    const skip = (page - 1) * pageSize
    query = query.skip(skip).limit(pageSize)

    // 执行查询
    const result = await query.get()
    
    // 获取关联数据
    const transactions = await Promise.all(
      result.data.map(async (transaction) => {
        return await enrichTransactionData(transaction)
      })
    )

    // 检查是否还有更多数据
    const totalQuery = db.collection('transactions').where({
      familyId: user._id
    })
    
    if (startDate && endDate) {
      totalQuery.where({
        date: _.gte(new Date(startDate)).and(_.lte(new Date(endDate)))
      })
    }
    
    const countResult = await totalQuery.count()
    const hasMore = skip + pageSize < countResult.total

    return {
      success: true,
      data: {
        list: transactions,
        hasMore,
        total: countResult.total,
        page,
        pageSize
      },
      message: '获取成功'
    }
  } catch (error) {
    console.error('获取交易记录失败:', error)
    return {
      success: false,
      message: error.message || '获取失败',
      error: error.message
    }
  }
}

// 计算统计数据
async function calculateStats(query) {
  try {
    const result = await query.get()
    const transactions = result.data
    
    let income = 0
    let expense = 0
    
    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        income += transaction.amount
      } else if (transaction.type === 'expense') {
        expense += transaction.amount
      }
    })
    
    return {
      income,
      expense,
      balance: income - expense,
      count: transactions.length
    }
  } catch (error) {
    console.error('计算统计数据失败:', error)
    return {
      income: 0,
      expense: 0,
      balance: 0,
      count: 0
    }
  }
}

// 丰富交易数据（添加关联信息）
async function enrichTransactionData(transaction) {
  try {
    const promises = []
    
    // 获取分类信息
    promises.push(
      db.collection('categories').doc(transaction.categoryId).get()
        .then(res => res.data)
        .catch(() => ({ name: '未知分类', icon: '' }))
    )
    
    // 获取账户信息
    promises.push(
      db.collection('accounts').doc(transaction.accountId).get()
        .then(res => res.data)
        .catch(() => ({ name: '未知账户' }))
    )
    
    // 获取目标账户信息（如果是转账）
    if (transaction.targetAccountId) {
      promises.push(
        db.collection('accounts').doc(transaction.targetAccountId).get()
          .then(res => res.data)
          .catch(() => ({ name: '未知账户' }))
      )
    } else {
      promises.push(Promise.resolve(null))
    }
    
    const [category, account, targetAccount] = await Promise.all(promises)
    
    return {
      ...transaction,
      category,
      account,
      targetAccount
    }
  } catch (error) {
    console.error('丰富交易数据失败:', error)
    return transaction
  }
}