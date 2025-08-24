// 分类管理云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, categoryId, categoryData } = event
  
  try {
    switch (action) {
      case 'create':
        return await createCategory(categoryData)
      case 'update':
        return await updateCategory(categoryId, categoryData)
      case 'delete':
        return await deleteCategory(categoryId)
      case 'list':
        return await getCategories(categoryData)
      default:
        return {
          success: false,
          error: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('分类管理操作失败:', error)
    return {
      success: false,
      error: '操作失败: ' + error.message
    }
  }
}

// 创建分类
async function createCategory(categoryData) {
  const { name, type, icon, color } = categoryData
  
  if (!name || !type) {
    return {
      success: false,
      error: '分类名称和类型不能为空'
    }
  }

  // 检查是否已存在相同名称的分类
  const existing = await db.collection('categories')
    .where({
      name,
      type
    })
    .get()

  if (existing.data.length > 0) {
    return {
      success: false,
      error: '该分类名称已存在'
    }
  }

  const result = await db.collection('categories').add({
    data: {
      name,
      type,
      icon: icon || '📝',
      color: color || '#007AFF',
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  return {
    success: true,
    data: result
  }
}

// 更新分类
async function updateCategory(categoryId, categoryData) {
  if (!categoryId) {
    return {
      success: false,
      error: '分类ID不能为空'
    }
  }

  // 检查分类是否存在
  const category = await db.collection('categories').doc(categoryId).get()
  
  if (!category.data) {
    return {
      success: false,
      error: '分类不存在'
    }
  }

  // 检查是否为默认分类
  if (category.data.isDefault) {
    return {
      success: false,
      error: '默认分类不能修改'
    }
  }

  const updates = {
    ...categoryData,
    updatedAt: new Date()
  }

  const result = await db.collection('categories').doc(categoryId).update({
    data: updates
  })

  return {
    success: true,
    data: result
  }
}

// 删除分类
async function deleteCategory(categoryId) {
  if (!categoryId) {
    return {
      success: false,
      error: '分类ID不能为空'
    }
  }

  // 检查分类是否存在
  const category = await db.collection('categories').doc(categoryId).get()
  
  if (!category.data) {
    return {
      success: false,
      error: '分类不存在'
    }
  }

  // 检查是否为默认分类
  if (category.data.isDefault) {
    return {
      success: false,
      error: '默认分类不能删除'
    }
  }

  // 检查是否有交易记录使用该分类
  const transactions = await db.collection('transactions')
    .where({
      categoryId
    })
    .limit(1)
    .get()

  if (transactions.data.length > 0) {
    // 将使用该分类的交易记录更新为"其他"分类
    const otherCategory = await db.collection('categories')
      .where({
        name: '其他',
        type: category.data.type
      })
      .get()

    if (otherCategory.data.length > 0) {
      await db.collection('transactions')
        .where({
          categoryId
        })
        .update({
          data: {
            categoryId: otherCategory.data[0]._id,
            categoryName: '其他'
          }
        })
    }
  }

  const result = await db.collection('categories').doc(categoryId).remove()

  return {
    success: true,
    data: result
  }
}

// 获取分类列表
async function getCategories(params = {}) {
  const { type } = params
  
  let query = db.collection('categories')
  
  if (type) {
    query = query.where({
      type
    })
  }

  const result = await query.orderBy('isDefault', 'desc').orderBy('createdAt', 'asc').get()

  return {
    success: true,
    data: result.data
  }
}