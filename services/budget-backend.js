// services/budget-backend.js - 修复版本
const { callCloudFunction } = require('./cloud-base')

// 获取预算数据
async function getBudgets() {
  try {
    const result = await callCloudFunction('manageBudget', {
      action: 'getBudgets'
    })
    
    if (result.success) {
      // 确保数据格式正确
      const formattedData = result.data.map(item => ({
        id: item._id || item.id,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        amount: parseInt(item.amount) || 0,
        period: item.period || 'monthly',
        type: item.type || 'expense',
        createTime: item.createTime,
        updateTime: item.updateTime
      }))
      
      return {
        success: true,
        data: formattedData
      }
    } else {
      throw new Error(result.error || '获取预算数据失败')
    }
  } catch (error) {
    console.error('getBudgets 错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 创建预算
async function createBudget(budgetData) {
  try {
    // 数据验证
    if (!budgetData.categoryId || !budgetData.categoryName || !budgetData.amount) {
      throw new Error('预算数据不完整')
    }
    
    const result = await callCloudFunction('manageBudget', {
      action: 'createBudget',
      data: {
        categoryId: budgetData.categoryId,
        categoryName: budgetData.categoryName,
        amount: parseInt(budgetData.amount),
        period: budgetData.period || 'monthly',
        type: budgetData.type || 'expense',
        createTime: new Date().toISOString()
      }
    })
    
    return result
  } catch (error) {
    console.error('createBudget 错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 更新预算
async function updateBudget(budgetData) {
  try {
    if (!budgetData.id) {
      throw new Error('预算ID不能为空')
    }
    
    const result = await callCloudFunction('manageBudget', {
      action: 'updateBudget',
      data: {
        id: budgetData.id,
        categoryId: budgetData.categoryId,
        categoryName: budgetData.categoryName,
        amount: parseInt(budgetData.amount),
        period: budgetData.period || 'monthly',
        type: budgetData.type || 'expense',
        updateTime: new Date().toISOString()
      }
    })
    
    return result
  } catch (error) {
    console.error('updateBudget 错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 删除预算
async function deleteBudget(budgetId) {
  try {
    if (!budgetId) {
      throw new Error('预算ID不能为空')
    }
    
    const result = await callCloudFunction('manageBudget', {
      action: 'deleteBudget',
      data: { id: budgetId }
    })
    
    return result
  } catch (error) {
    console.error('deleteBudget 错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget
}