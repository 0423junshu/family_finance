// services/sync.js
const { request } = require('../utils/request')

/**
 * 同步数据
 */
async function syncData() {
  try {
    // 模拟同步过程
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模拟同步结果
    return {
      success: true,
      newCount: Math.floor(Math.random() * 5), // 随机生成0-4条新记录
      message: '同步成功'
    }
  } catch (error) {
    console.error('数据同步失败:', error)
    return {
      success: false,
      message: '同步失败'
    }
  }
}

module.exports = {
  syncData
}