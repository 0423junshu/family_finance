// services/category-backend.js - 修复版本
const { callCloudFunction } = require('./cloud-base')

// 获取分类数据
async function getCategories() {
  try {
    const result = await callCloudFunction('manageCategory', {
      action: 'getCategories'
    })
    
    if (result.success) {
      // 确保数据格式正确
      const formattedData = result.data.map(item => ({
        _id: item._id || item.id,
        name: item.name,
        icon: item.icon,
        color: item.color,
        type: item.type,
        isCustom: item.isCustom || true,
        createTime: item.createTime,
        updateTime: item.updateTime
      }))
      
      return {
        success: true,
        data: formattedData
      }
    } else {
      throw new Error(result.error || '获取分类数据失败')
    }
  } catch (error) {
    console.error('getCategories 错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 创建分类
async function createCategory(categoryData) {
  try {
    // 数据验证
    if (!categoryData.name || !categoryData.type) {
      throw new Error('分类数据不完整')
    }
    
    const result = await callCloudFunction('manageCategory', {
      action: 'createCategory',
      data: {
        name: categoryData.name.trim(),
        icon: categoryData.icon || '💰',
        color: categoryData.color || '#007AFF',
        type: categoryData.type,
        isCustom: true,
        createTime: new Date().toISOString()
      }
    })
    
    return result
  } catch (error) {
    console.error('createCategory 错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 更新分类
async function updateCategory(categoryData) {
  try {
    if (!categoryData.id) {
      throw new Error('分类ID不能为空')
    }
    
    const result = await callCloudFunction('manageCategory', {
      action: 'updateCategory',
      data: {
        id: categoryData.id,
        name: categoryData.name.trim(),
        icon: categoryData.icon,
        color: categoryData.color,
        type: categoryData.type,
        updateTime: new Date().toISOString()
      }
    })
    
    return result
  } catch (error) {
    console.error('updateCategory 错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 删除分类
async function deleteCategory(categoryId) {
  try {
    if (!categoryId) {
      throw new Error('分类ID不能为空')
    }
    
    const result = await callCloudFunction('manageCategory', {
      action: 'deleteCategory',
      data: { id: categoryId }
    })
    
    return result
  } catch (error) {
    console.error('deleteCategory 错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
}