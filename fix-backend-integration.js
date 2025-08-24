// 修复后端集成问题的脚本
// 这个脚本将确保所有页面都正确集成了后端功能

const fs = require('fs')
const path = require('path')

// 修复预算管理页面的后端集成
function fixBudgetManagePage() {
  const budgetManageJsPath = 'pages/budget-manage/budget-manage.js'
  
  // 读取当前文件内容
  let content = fs.readFileSync(budgetManageJsPath, 'utf8')
  
  // 替换保存预算的函数，确保调用后端服务
  const newSaveFunction = `
  // 保存预算/预期 - 使用后端服务
  async onSave() {
    if (!this.validateForm()) {
      showToast(Object.values(this.data.errors)[0], 'error')
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })
      
      const amount = Math.round(parseFloat(this.data.formData.amount) * 100) // 转换为分
      const isExpense = this.data.formData.type === 'expense'
      
      const budgetData = {
        categoryId: this.data.formData.categoryId,
        categoryName: this.data.formData.categoryName,
        amount,
        period: this.data.formData.period,
        type: this.data.formData.type
      }
      
      let result
      if (this.data.showAddDialog) {
        // 调用后端创建预算
        result = await createBudget(budgetData)
        if (result.success) {
          showToast(isExpense ? '预算添加成功' : '收入预期添加成功', 'success')
        } else {
          throw new Error(result.error || '创建失败')
        }
      } else {
        // 调用后端更新预算
        budgetData.id = this.data.editingItem.id
        result = await updateBudget(budgetData)
        if (result.success) {
          showToast(isExpense ? '预算更新成功' : '收入预期更新成功', 'success')
        } else {
          throw new Error(result.error || '更新失败')
        }
      }
      
      wx.hideLoading()
      this.closeDialog()
      this.loadBudgets()
    } catch (error) {
      console.error('保存失败:', error)
      wx.hideLoading()
      showToast(error.message || '保存失败', 'error')
    }
  },`
  
  // 替换删除预算的函数
  const newDeleteFunction = `
  // 执行删除 - 使用后端服务
  async deleteItem(itemId, isExpense) {
    try {
      wx.showLoading({ title: '删除中...' })
      
      const result = await deleteBudget({ id: itemId, type: isExpense ? 'expense' : 'income' })
      
      if (result.success) {
        showToast(isExpense ? '预算删除成功' : '收入预期删除成功', 'success')
        this.loadBudgets()
      } else {
        throw new Error(result.error || '删除失败')
      }
      
      wx.hideLoading()
    } catch (error) {
      console.error('删除失败:', error)
      wx.hideLoading()
      showToast(error.message || '删除失败', 'error')
    }
  },`
  
  // 查找并替换函数
  content = content.replace(/\/\/ 保存预算\/预期[\s\S]*?},/m, newSaveFunction)
  content = content.replace(/\/\/ 执行删除[\s\S]*?},/m, newDeleteFunction)
  
  // 写回文件
  fs.writeFileSync(budgetManageJsPath, content, 'utf8')
  console.log('✅ 预算管理页面后端集成修复完成')
}

// 修复分类管理页面的后端集成
function fixCategoryManagePage() {
  const categoryManageJsPath = 'pages/category-manage/category-manage.js'
  
  // 读取当前文件内容
  let content = fs.readFileSync(categoryManageJsPath, 'utf8')
  
  // 替换保存分类的函数
  const newSaveFunction = `
  // 保存分类 - 使用后端服务
  async saveCategory() {
    if (!this.validateForm()) {
      wx.showToast({
        title: Object.values(this.data.errors)[0],
        icon: 'error'
      })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })
      
      const { name, icon, color, type } = this.data.newCategory
      
      const categoryData = {
        name: name.trim(),
        icon,
        color,
        type
      }
      
      let result
      if (this.data.showAddDialog) {
        // 调用后端创建分类
        result = await createCategory(categoryData)
        if (result.success) {
          wx.showToast({
            title: '分类添加成功',
            icon: 'success'
          })
        } else {
          throw new Error(result.error || '创建失败')
        }
      } else {
        // 调用后端更新分类
        categoryData.id = this.data.editingCategory._id
        result = await updateCategory(categoryData)
        if (result.success) {
          wx.showToast({
            title: '分类修改成功',
            icon: 'success'
          })
        } else {
          throw new Error(result.error || '更新失败')
        }
      }
      
      wx.hideLoading()
      
      // 关闭对话框并重新加载数据
      this.closeDialog()
      this.loadCategories()
    } catch (error) {
      console.error('保存分类失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'error'
      })
    }
  },`
  
  // 替换删除分类的函数
  const newDeleteFunction = `
  // 执行删除分类 - 使用后端服务
  async performDeleteCategory(category) {
    try {
      wx.showLoading({ title: '删除中...' })
      
      const result = await deleteCategory({ id: category._id })
      
      if (result.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })
        
        // 重新加载分类
        this.loadCategories()
      } else {
        throw new Error(result.error || '删除失败')
      }
      
      wx.hideLoading()
    } catch (error) {
      console.error('删除分类失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'error'
      })
    }
  },`
  
  // 查找并替换函数
  content = content.replace(/\/\/ 保存分类[\s\S]*?},/m, newSaveFunction)
  content = content.replace(/\/\/ 执行删除分类[\s\S]*?},/m, newDeleteFunction)
  
  // 写回文件
  fs.writeFileSync(categoryManageJsPath, content, 'utf8')
  console.log('✅ 分类管理页面后端集成修复完成')
}

// 修复资产页面的后端集成
function fixAssetsPage() {
  const assetsJsPath = 'pages/assets/assets.js'
  
  // 读取当前文件内容
  let content = fs.readFileSync(assetsJsPath, 'utf8')
  
  // 替换保存金额修改的函数
  const newSaveAmountFunction = `
  // 保存金额修改 - 使用后端服务
  async saveAmount() {
    const amount = parseFloat(this.data.editAmount)
    if (isNaN(amount) || amount < 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'error' })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })
      
      const result = await updateAccountBalance({
        accountId: this.data.editingAccount.id,
        newBalance: Math.round(amount * 100) // 转换为分
      })
      
      if (result.success) {
        wx.showToast({ title: '修改成功', icon: 'success' })
        this.closeEditDialog()
        this.loadData()
        
        // 执行数据一致性检查
        this.checkDataConsistency()
      } else {
        throw new Error(result.error || '保存失败')
      }
      
      wx.hideLoading()
    } catch (error) {
      console.error('保存失败:', error)
      wx.hideLoading()
      wx.showToast({ title: error.message || '保存失败', icon: 'error' })
    }
  },`
  
  // 查找并替换函数
  content = content.replace(/\/\/ 保存金额修改[\s\S]*?},/m, newSaveAmountFunction)
  
  // 写回文件
  fs.writeFileSync(assetsJsPath, content, 'utf8')
  console.log('✅ 资产页面后端集成修复完成')
}

// 修复转账页面的跳转问题
function fixTransferNavigation() {
  const files = [
    'pages/index/index.js',
    'pages/assets/assets.js',
    'pages/record/record.js'
  ]
  
  files.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8')
      
      // 统一转账页面跳转路径
      content = content.replace(/\/pages\/transfer\/transfer-[^'"]*/g, '/pages/transfer/transfer')
      content = content.replace(/\/pages\/transfer-[^'"]*/g, '/pages/transfer/transfer')
      
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ ${filePath} 转账跳转路径修复完成`)
    }
  })
}

// 执行所有修复
function executeAllFixes() {
  console.log('🔧 开始修复后端集成问题...')
  
  try {
    fixBudgetManagePage()
    fixCategoryManagePage()
    fixAssetsPage()
    fixTransferNavigation()
    
    console.log('🎉 所有后端集成问题修复完成！')
    console.log('')
    console.log('修复内容：')
    console.log('1. ✅ 预算管理页面现在使用后端服务进行CRUD操作')
    console.log('2. ✅ 分类管理页面现在使用后端服务进行CRUD操作')
    console.log('3. ✅ 资产页面现在使用后端服务更新账户余额')
    console.log('4. ✅ 统一了转账功能的跳转路径')
    console.log('')
    console.log('所有UI按钮现在都有对应的后端功能支持！')
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  executeAllFixes()
}

module.exports = {
  fixBudgetManagePage,
  fixCategoryManagePage,
  fixAssetsPage,
  fixTransferNavigation,
  executeAllFixes
}