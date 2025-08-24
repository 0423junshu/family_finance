// services/category.js
const { request } = require('../utils/request')

/**
 * 获取分类列表
 */
async function getCategories() {
  try {
    // 模拟数据，实际项目中应该调用云函数
    return [
      // 支出分类
      { id: '1', name: '餐饮', icon: '🍽️', type: 'expense', color: '#ff6b6b' },
      { id: '2', name: '交通', icon: '🚗', type: 'expense', color: '#4ecdc4' },
      { id: '3', name: '购物', icon: '🛍️', type: 'expense', color: '#45b7d1' },
      { id: '4', name: '娱乐', icon: '🎮', type: 'expense', color: '#96ceb4' },
      { id: '5', name: '医疗', icon: '🏥', type: 'expense', color: '#feca57' },
      { id: '6', name: '教育', icon: '📚', type: 'expense', color: '#ff9ff3' },
      { id: '7', name: '住房', icon: '🏠', type: 'expense', color: '#54a0ff' },
      { id: '8', name: '通讯', icon: '📱', type: 'expense', color: '#5f27cd' },
      
      // 收入分类
      { id: '9', name: '工资', icon: '💰', type: 'income', color: '#00d2d3' },
      { id: '10', name: '奖金', icon: '🎁', type: 'income', color: '#ff6348' },
      { id: '11', name: '投资', icon: '📈', type: 'income', color: '#2ed573' },
      { id: '12', name: '兼职', icon: '💼', type: 'income', color: '#ffa502' }
    ]
  } catch (error) {
    console.error('获取分类列表失败:', error)
    return []
  }
}

/**
 * 创建分类
 */
async function createCategory(categoryData) {
  try {
    // 实际项目中调用云函数
    console.log('创建分类:', categoryData)
    return { success: true, id: Date.now().toString() }
  } catch (error) {
    console.error('创建分类失败:', error)
    throw error
  }
}

module.exports = {
  getCategories,
  createCategory
}