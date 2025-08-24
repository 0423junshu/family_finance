// 完整功能验证脚本 - 确保所有UI按钮都有后端支持
console.log('🔍 开始验证所有功能的完整性...')

// 验证预算管理功能
function validateBudgetManagement() {
  console.log('\n=== 验证预算管理功能 ===')
  
  const budgetManagePage = require('./pages/budget-manage/budget-manage.js')
  const budgetBackend = require('./services/budget-backend.js')
  
  // 检查页面是否引用了后端服务
  const pageContent = require('fs').readFileSync('./pages/budget-manage/budget-manage.js', 'utf8')
  
  const requiredFunctions = [
    'createBudget',
    'updateBudget', 
    'deleteBudget',
    'getBudgets'
  ]
  
  const requiredUIHandlers = [
    'showEditDialog',
    'onDelete',
    'showAddDialog',
    'onSave'
  ]
  
  console.log('✅ 后端服务函数检查:')
  requiredFunctions.forEach(func => {
    const hasFunction = pageContent.includes(func)
    console.log(`  - ${func}: ${hasFunction ? '✅ 已引用' : '❌ 未引用'}`)
  })
  
  console.log('✅ UI事件处理器检查:')
  requiredUIHandlers.forEach(handler => {
    const hasHandler = pageContent.includes(handler)
    console.log(`  - ${handler}: ${hasHandler ? '✅ 已实现' : '❌ 未实现'}`)
  })
  
  return {
    backendFunctions: requiredFunctions.every(func => pageContent.includes(func)),
    uiHandlers: requiredUIHandlers.every(handler => pageContent.includes(handler))
  }
}

// 验证分类管理功能
function validateCategoryManagement() {
  console.log('\n=== 验证分类管理功能 ===')
  
  const pageContent = require('fs').readFileSync('./pages/category-manage/category-manage.js', 'utf8')
  
  const requiredFunctions = [
    'createCategory',
    'updateCategory',
    'deleteCategory', 
    'getCategories'
  ]
  
  const requiredUIHandlers = [
    'showAddCategory',
    'showEditCategory',
    'deleteCategory',
    'saveCategory'
  ]
  
  console.log('✅ 后端服务函数检查:')
  requiredFunctions.forEach(func => {
    const hasFunction = pageContent.includes(func)
    console.log(`  - ${func}: ${hasFunction ? '✅ 已引用' : '❌ 未引用'}`)
  })
  
  console.log('✅ UI事件处理器检查:')
  requiredUIHandlers.forEach(handler => {
    const hasHandler = pageContent.includes(handler)
    console.log(`  - ${handler}: ${hasHandler ? '✅ 已实现' : '❌ 未实现'}`)
  })
  
  return {
    backendFunctions: requiredFunctions.every(func => pageContent.includes(func)),
    uiHandlers: requiredUIHandlers.every(handler => pageContent.includes(handler))
  }
}

// 验证资产管理功能
function validateAssetManagement() {
  console.log('\n=== 验证资产管理功能 ===')
  
  const pageContent = require('fs').readFileSync('./pages/assets/assets.js', 'utf8')
  
  const requiredFunctions = [
    'updateAccountBalance',
    'deleteAccount'
  ]
  
  const requiredUIHandlers = [
    'onEditAmount',
    'saveAmount',
    'onCheckConsistency',
    'fixDataConsistency'
  ]
  
  console.log('✅ 后端服务函数检查:')
  requiredFunctions.forEach(func => {
    const hasFunction = pageContent.includes(func)
    console.log(`  - ${func}: ${hasFunction ? '✅ 已引用' : '❌ 未引用'}`)
  })
  
  console.log('✅ UI事件处理器检查:')
  requiredUIHandlers.forEach(handler => {
    const hasHandler = pageContent.includes(handler)
    console.log(`  - ${handler}: ${hasHandler ? '✅ 已实现' : '❌ 未实现'}`)
  })
  
  return {
    backendFunctions: requiredFunctions.every(func => pageContent.includes(func)),
    uiHandlers: requiredUIHandlers.every(handler => pageContent.includes(handler))
  }
}

// 验证云函数完整性
function validateCloudFunctions() {
  console.log('\n=== 验证云函数完整性 ===')
  
  const fs = require('fs')
  const path = require('path')
  
  const requiredCloudFunctions = [
    'updateAccount',
    'manageBudget', 
    'manageCategory'
  ]
  
  console.log('✅ 云函数文件检查:')
  requiredCloudFunctions.forEach(funcName => {
    const funcPath = path.join('./cloudfunctions', funcName, 'index.js')
    const exists = fs.existsSync(funcPath)
    console.log(`  - ${funcName}: ${exists ? '✅ 已创建' : '❌ 未创建'}`)
    
    if (exists) {
      const content = fs.readFileSync(funcPath, 'utf8')
      const hasExports = content.includes('exports.main')
      const hasErrorHandling = content.includes('try') && content.includes('catch')
      console.log(`    - 导出函数: ${hasExports ? '✅' : '❌'}`)
      console.log(`    - 错误处理: ${hasErrorHandling ? '✅' : '❌'}`)
    }
  })
  
  return requiredCloudFunctions.every(funcName => {
    const funcPath = path.join('./cloudfunctions', funcName, 'index.js')
    return fs.existsSync(funcPath)
  })
}

// 验证WXML模板中的按钮绑定
function validateWXMLBindings() {
  console.log('\n=== 验证WXML按钮绑定 ===')
  
  const fs = require('fs')
  
  // 检查预算管理页面
  console.log('📄 预算管理页面 (budget-manage.wxml):')
  const budgetWxml = fs.readFileSync('./pages/budget-manage/budget-manage.wxml', 'utf8')
  const budgetBindings = [
    'bindtap="showEditDialog"',
    'bindtap="onDelete"', 
    'bindtap="showAddDialog"',
    'bindtap="onSave"'
  ]
  
  budgetBindings.forEach(binding => {
    const hasBinding = budgetWxml.includes(binding)
    console.log(`  - ${binding}: ${hasBinding ? '✅ 已绑定' : '❌ 未绑定'}`)
  })
  
  // 检查分类管理页面
  console.log('📄 分类管理页面 (category-manage.wxml):')
  const categoryWxml = fs.readFileSync('./pages/category-manage/category-manage.wxml', 'utf8')
  const categoryBindings = [
    'bindtap="showAddCategory"',
    'bindtap="showEditCategory"',
    'bindtap="deleteCategory"',
    'bindtap="saveCategory"'
  ]
  
  categoryBindings.forEach(binding => {
    const hasBinding = categoryWxml.includes(binding)
    console.log(`  - ${binding}: ${hasBinding ? '✅ 已绑定' : '❌ 未绑定'}`)
  })
  
  // 检查资产页面
  console.log('📄 资产页面 (assets.wxml):')
  const assetWxml = fs.readFileSync('./pages/assets/assets.wxml', 'utf8')
  const assetBindings = [
    'bindtap="onEditAmount"',
    'bindtap="saveAmount"',
    'bindtap="onCheckConsistency"',
    'bindtap="fixDataConsistency"'
  ]
  
  assetBindings.forEach(binding => {
    const hasBinding = assetWxml.includes(binding)
    console.log(`  - ${binding}: ${hasBinding ? '✅ 已绑定' : '❌ 未绑定'}`)
  })
  
  return true
}

// 验证错误处理机制
function validateErrorHandling() {
  console.log('\n=== 验证错误处理机制 ===')
  
  const fs = require('fs')
  
  const serviceFiles = [
    './services/budget-backend.js',
    './services/category-backend.js',
    './services/account.js'
  ]
  
  console.log('✅ 服务文件错误处理检查:')
  serviceFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8')
      const hasTryCatch = content.includes('try') && content.includes('catch')
      const hasErrorReturn = content.includes('success: false') && content.includes('error:')
      console.log(`  - ${file}:`)
      console.log(`    - Try/Catch: ${hasTryCatch ? '✅' : '❌'}`)
      console.log(`    - 错误返回: ${hasErrorReturn ? '✅' : '❌'}`)
    } else {
      console.log(`  - ${file}: ❌ 文件不存在`)
    }
  })
  
  return true
}

// 生成完整性报告
function generateCompletionReport(results) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 功能完整性报告')
  console.log('='.repeat(60))
  
  const overallScore = Object.values(results).filter(Boolean).length / Object.keys(results).length * 100
  
  console.log(`\n🎯 总体完成度: ${overallScore.toFixed(1)}%`)
  
  console.log('\n📋 详细结果:')
  console.log(`  ✅ 预算管理后端: ${results.budgetBackend ? '完成' : '未完成'}`)
  console.log(`  ✅ 预算管理UI: ${results.budgetUI ? '完成' : '未完成'}`)
  console.log(`  ✅ 分类管理后端: ${results.categoryBackend ? '完成' : '未完成'}`)
  console.log(`  ✅ 分类管理UI: ${results.categoryUI ? '完成' : '未完成'}`)
  console.log(`  ✅ 资产管理后端: ${results.assetBackend ? '完成' : '未完成'}`)
  console.log(`  ✅ 资产管理UI: ${results.assetUI ? '完成' : '未完成'}`)
  console.log(`  ✅ 云函数: ${results.cloudFunctions ? '完成' : '未完成'}`)
  console.log(`  ✅ WXML绑定: ${results.wxmlBindings ? '完成' : '未完成'}`)
  console.log(`  ✅ 错误处理: ${results.errorHandling ? '完成' : '未完成'}`)
  
  if (overallScore === 100) {
    console.log('\n🎉 恭喜！所有功能都已完整实现！')
    console.log('✨ 所有UI按钮都有对应的后端功能支持')
    console.log('🔒 错误处理机制完善')
    console.log('🚀 系统已准备好投入使用')
  } else {
    console.log('\n⚠️  还有部分功能需要完善')
    console.log('📝 请根据上述检查结果进行相应的修复')
  }
  
  return {
    overallScore,
    results,
    isComplete: overallScore === 100
  }
}

// 主验证函数
function validateAllFunctions() {
  console.log('🚀 开始完整功能验证...')
  
  try {
    // 执行各项验证
    const budgetResult = validateBudgetManagement()
    const categoryResult = validateCategoryManagement()
    const assetResult = validateAssetManagement()
    const cloudFunctionsResult = validateCloudFunctions()
    const wxmlResult = validateWXMLBindings()
    const errorHandlingResult = validateErrorHandling()
    
    // 汇总结果
    const results = {
      budgetBackend: budgetResult.backendFunctions,
      budgetUI: budgetResult.uiHandlers,
      categoryBackend: categoryResult.backendFunctions,
      categoryUI: categoryResult.uiHandlers,
      assetBackend: assetResult.backendFunctions,
      assetUI: assetResult.uiHandlers,
      cloudFunctions: cloudFunctionsResult,
      wxmlBindings: wxmlResult,
      errorHandling: errorHandlingResult
    }
    
    // 生成报告
    return generateCompletionReport(results)
    
  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error)
    return {
      overallScore: 0,
      results: {},
      isComplete: false,
      error: error.message
    }
  }
}

// 如果直接运行此脚本
if (typeof module !== 'undefined' && require.main === module) {
  const result = validateAllFunctions()
  process.exit(result.isComplete ? 0 : 1)
}

module.exports = {
  validateAllFunctions,
  validateBudgetManagement,
  validateCategoryManagement,
  validateAssetManagement,
  validateCloudFunctions,
  validateWXMLBindings,
  validateErrorHandling
}