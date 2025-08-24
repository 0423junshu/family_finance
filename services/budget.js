// services/budget.js
const { request } = require('../utils/request')

/**
 * 获取预算列表
 */
async function getBudgets(year, month) {
  try {
    // 模拟数据，实际项目中应该调用云函数
    return [
      {
        id: '1',
        name: '总预算',
        amount: 300000, // 3000元
        used: 0,
        categoryId: null,
        isOverall: true,
        year,
        month
      },
      {
        id: '2',
        name: '餐饮预算',
        amount: 100000, // 1000元
        used: 0,
        categoryId: '1',
        isOverall: false,
        year,
        month
      }
    ]
  } catch (error) {
    console.error('获取预算列表失败:', error)
    return []
  }
}

/**
 * 创建预算
 */
async function createBudget(budgetData) {
  try {
    // 实际项目中调用云函数
    console.log('创建预算:', budgetData)
    return { success: true, id: Date.now().toString() }
  } catch (error) {
    console.error('创建预算失败:', error)
    throw error
  }
}

module.exports = {
  getBudgets,
  createBudget
}