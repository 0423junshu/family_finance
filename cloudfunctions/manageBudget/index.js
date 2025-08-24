// 预算管理云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, budgetId, budgetData } = event
  
  try {
    switch (action) {
      case 'create':
        return await createBudget(budgetData)
      case 'update':
        return await updateBudget(budgetId, budgetData)
      case 'delete':
        return await deleteBudget(budgetId)
      case 'list':
        return await getBudgets(budgetData)
      default:
        return {
          success: false,
          error: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('预算管理操作失败:', error)
    return {
      success: false,
      error: '操作失败: ' + error.message
    }
  }
}

// 创建预算
async function createBudget(budgetData) {
  const { categoryId, categoryName, amount, period, type } = budgetData
  
  if (!categoryId || !amount || !period || !type) {
    return {
      success: false,
      error: '预算信息不完整'
    }
  }

  // 检查是否已存在相同分类的预算
  const existing = await db.collection('budgets')
    .where({
      categoryId,
      type,
      period
    })
    .get()

  if (existing.data.length > 0) {
    return {
      success: false,
      error: '该分类已存在预算，请先删除或修改现有预算'
    }
  }

  const result = await db.collection('budgets').add({
    data: {
      categoryId,
      categoryName,
      amount: parseFloat(amount),
      period,
      type,
      spent: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  return {
    success: true,
    data: result
  }
}

// 更新预算
async function updateBudget(budgetId, budgetData) {
  if (!budgetId) {
    return {
      success: false,
      error: '预算ID不能为空'
    }
  }

  const updates = {
    ...budgetData,
    updatedAt: new Date()
  }

  if (updates.amount) {
    updates.amount = parseFloat(updates.amount)
  }

  const result = await db.collection('budgets').doc(budgetId).update({
    data: updates
  })

  return {
    success: true,
    data: result
  }
}

// 删除预算
async function deleteBudget(budgetId) {
  if (!budgetId) {
    return {
      success: false,
      error: '预算ID不能为空'
    }
  }

  const result = await db.collection('budgets').doc(budgetId).remove()

  return {
    success: true,
    data: result
  }
}

// 获取预算列表
async function getBudgets(params = {}) {
  const { type, period } = params
  
  let query = db.collection('budgets')
  
  if (type) {
    query = query.where({
      type
    })
  }
  
  if (period) {
    query = query.where({
      period
    })
  }

  const result = await query.orderBy('createdAt', 'desc').get()

  return {
    success: true,
    data: result.data
  }
}