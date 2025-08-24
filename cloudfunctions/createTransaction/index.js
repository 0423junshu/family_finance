// cloudfunctions/createTransaction/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  try {
    const {
      familyId,
      type,
      amount,
      categoryId,
      accountId,
      targetAccountId,
      date,
      description,
      tags,
      images,
      location
    } = event

    // 数据验证
    if (!amount || amount <= 0) {
      throw new Error('金额必须大于0')
    }
    
    if (!categoryId) {
      throw new Error('请选择分类')
    }
    
    if (!accountId) {
      throw new Error('请选择账户')
    }

    // 获取用户信息
    const userResult = await db.collection('users').where({
      openid: OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      throw new Error('用户不存在')
    }
    
    const user = userResult.data[0]

    // 创建交易记录
    const now = new Date()
    const transaction = {
      familyId: familyId || user._id, // 如果没有家庭ID，使用用户ID
      type,
      amount: parseInt(amount),
      categoryId,
      accountId,
      targetAccountId: targetAccountId || null,
      memberId: user._id,
      date: new Date(date),
      description: description || '',
      tags: tags || [],
      images: images || [],
      location: location || '',
      createdBy: user._id,
      createdAt: now,
      updatedAt: now
    }

    const result = await db.collection('transactions').add({
      data: transaction
    })

    // 更新账户余额
    await updateAccountBalance(accountId, type, amount, targetAccountId)

    // 获取完整的交易记录（包含关联数据）
    const fullTransaction = await getTransactionWithDetails(result._id)

    return {
      success: true,
      data: fullTransaction,
      message: '记录创建成功'
    }
  } catch (error) {
    console.error('创建交易记录失败:', error)
    return {
      success: false,
      message: error.message || '创建失败',
      error: error.message
    }
  }
}

// 更新账户余额
async function updateAccountBalance(accountId, type, amount, targetAccountId) {
  const _ = db.command
  
  try {
    if (type === 'income') {
      // 收入：增加账户余额
      await db.collection('accounts').doc(accountId).update({
        data: {
          balance: _.inc(amount),
          updatedAt: new Date()
        }
      })
    } else if (type === 'expense') {
      // 支出：减少账户余额
      await db.collection('accounts').doc(accountId).update({
        data: {
          balance: _.inc(-amount),
          updatedAt: new Date()
        }
      })
    } else if (type === 'transfer' && targetAccountId) {
      // 转账：减少源账户，增加目标账户
      await Promise.all([
        db.collection('accounts').doc(accountId).update({
          data: {
            balance: _.inc(-amount),
            updatedAt: new Date()
          }
        }),
        db.collection('accounts').doc(targetAccountId).update({
          data: {
            balance: _.inc(amount),
            updatedAt: new Date()
          }
        })
      ])
    }
  } catch (error) {
    console.error('更新账户余额失败:', error)
    throw error
  }
}

// 获取包含详细信息的交易记录
async function getTransactionWithDetails(transactionId) {
  try {
    const transaction = await db.collection('transactions').doc(transactionId).get()
    
    if (!transaction.data) {
      throw new Error('交易记录不存在')
    }

    const data = transaction.data
    
    // 获取分类信息
    const category = await db.collection('categories').doc(data.categoryId).get()
    
    // 获取账户信息
    const account = await db.collection('accounts').doc(data.accountId).get()
    
    // 获取目标账户信息（如果是转账）
    let targetAccount = null
    if (data.targetAccountId) {
      const targetAccountResult = await db.collection('accounts').doc(data.targetAccountId).get()
      targetAccount = targetAccountResult.data
    }

    return {
      ...data,
      _id: transactionId,
      category: category.data,
      account: account.data,
      targetAccount
    }
  } catch (error) {
    console.error('获取交易详情失败:', error)
    throw error
  }
}