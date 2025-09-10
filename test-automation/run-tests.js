#!/usr/bin/env node
// 测试执行主脚本
const CoreFunctionTestSuite = require('./核心功能测试脚本');
const TestUtils = require('./utils/test-utils');
const config = require('./config/test-config');

// 命令行参数解析
const args = process.argv.slice(2);
const environment = args[0] || 'development';
const testType = args[1] || 'all';

console.log(`🏁 开始执行测试 - 环境: ${environment}, 类型: ${testType}`);
console.log('='.repeat(60));

// 初始化测试环境
function initializeTestEnvironment() {
  console.log('🔄 初始化测试环境...');
  
  // 设置基础URL
  const envConfig = config.environments[environment];
  if (envConfig) {
    TestUtils.baseUrl = envConfig.baseUrl;
    console.log(`   ✅ 环境配置: ${envConfig.baseUrl}`);
  }
  
  // 重置测试数据
  TestUtils.resetTestData();
  
  // 加载测试数据
  loadTestData();
  
  console.log('✅ 测试环境初始化完成\n');
}

// 加载测试数据
function loadTestData() {
  console.log('📊 加载测试数据...');
  
  const testData = config.testData;
  
  // 加载账户数据
  testData.accounts.forEach(account => {
    TestUtils.testData.accounts = TestUtils.testData.accounts || [];
    TestUtils.testData.accounts.push({
      ...account,
      id: 'test_acc_' + Date.now() + Math.random().toString(36).substr(2, 5)
    });
  });
  
  // 加载交易数据
  testData.transactions.forEach(transaction => {
    TestUtils.testData.transactions = TestUtils.testData.transactions || [];
    TestUtils.testData.transactions.push({
      ...transaction,
      id: 'test_txn_' + Date.now() + Math.random().toString(36).substr(2, 5)
    });
  });
  
  // 加载预算数据
  testData.budgets.forEach(budget => {
    TestUtils.testData.budgets = TestUtils.testData.budgets || [];
    TestUtils.testData.budgets.push({
      ...budget,
      id: 'test_budget_' + Date.now() + Math.random().toString(36).substr(2, 5)
    });
  });
  
  console.log(`   ✅ 账户数据: ${TestUtils.testData.accounts?.length || 0} 条`);
  console.log(`   ✅ 交易数据: ${TestUtils.testData.transactions?.length || 0} 条`);
  console.log(`   ✅ 预算数据: ${TestUtils.testData.budgets?.length || 0} 条`);
}

// 执行特定类型的测试
async function runSpecificTests(testType) {
  const testSuite = new CoreFunctionTestSuite();
  
  switch (testType) {
    case 'accounts':
      console.log('🎯 执行账户管理测试');
      await testSuite.testAccountManagement();
      break;
      
    case 'transactions':
      console.log('🎯 执行记账功能测试');
      await testSuite.testTransactionRecording();
      break;
      
    case 'budgets':
      console.log('🎯 执行预算管理测试');
      await testSuite.testBudgetManagement();
      break;
      
    case 'reports':
      console.log('🎯 执行报表功能测试');
      await testSuite.testReportFunctionality();
      break;
      
    case 'consistency':
      console.log('🎯 执行数据一致性测试');
      await testSuite.testDataConsistency();
      break;
      
    case 'all':
    default:
      console.log('🎯 执行所有核心功能测试');
      await testSuite.runAllTests();
      break;
  }
  
  return testSuite.testResults;
}

// 生成最终测试报告
function generateFinalReport(testResults, environment, testType) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 最终测试报告');
  console.log('='.repeat(60));
  
  const total = testResults.length;
  const passed = testResults.filter(r => r.status === '通过').length;
  const failed = testResults.filter(r => r.status === '失败').length;
  const errors = testResults.filter(r => r.status === '错误').length;
  
  console.log(`测试环境: ${environment}`);
  console.log(`测试类型: ${testType}`);
  console.log(`执行时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('');
  console.log(`总测试用例: ${total}`);
  console.log(`通过: ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`失败: ${failed}`);
  console.log(`错误: ${errors}`);
  console.log('');
  
  // 测试结果评估
  if (passed === total) {
    console.log('✅ 测试结果: 全部通过 - 可以发布');
  } else if (passed / total >= 0.9) {
    console.log('⚠️  测试结果: 基本通过 - 建议修复失败用例后发布');
  } else if (passed / total >= 0.7) {
    console.log('⚠️  测试结果: 部分通过 - 需要修复重要问题');
  } else {
    console.log('❌ 测试结果: 多数失败 - 需要全面修复');
  }
  
  // 输出失败详情
  const failures = testResults.filter(r => r.status !== '通过');
  if (failures.length > 0) {
    console.log('\n❌ 失败的测试用例:');
    failures.forEach((failure, index) => {
      console.log(`   ${index + 1}. ${failure.test}`);
      console.log(`      状态: ${failure.status}`);
      console.log(`      信息: ${failure.message}`);
      console.log('');
    });
  }
  
  // 保存详细报告
  saveDetailedReport(testResults, environment, testType);
}

// 保存详细报告到文件
function saveDetailedReport(testResults, environment, testType) {
  const report = {
    metadata: {
      environment,
      testType,
      timestamp: new Date().toISOString(),
      duration: process.uptime()
    },
    summary: {
      total: testResults.length,
      passed: testResults.filter(r => r.status === '通过').length,
      failed: testResults.filter(r => r.status === '失败').length,
      errors: testResults.filter(r => r.status === '错误').length,
      passRate: ((testResults.filter(r => r.status === '通过').length / testResults.length) * 100).toFixed(1)
    },
    details: testResults
  };
  
  const fs = require('fs');
  const path = require('path');
  
  const reportsDir = path.join(__dirname, '../test-reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const filename = `test-report-${environment}-${testType}-${Date.now()}.json`;
  const filepath = path.join(reportsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`📄 详细报告已保存: ${filepath}`);
}

// 主执行函数
async function main() {
  try {
    // 初始化环境
    initializeTestEnvironment();
    
    // 执行测试
    const testResults = await runSpecificTests(testType);
    
    // 生成报告
    generateFinalReport(testResults, environment, testType);
    
    // 根据测试结果退出
    const passedCount = testResults.filter(r => r.status === '通过').length;
    const totalCount = testResults.length;
    
    if (passedCount === totalCount) {
      console.log('\n🎉 所有测试通过！');
      process.exit(0);
    } else {
      console.log('\n❌ 存在测试失败，请查看报告详情');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 测试执行失败:', error);
    process.exit(1);
  }
}

// 执行主函数
main().catch(console.error);

// 导出用于其他模块使用
module.exports = {
  initializeTestEnvironment,
  runSpecificTests,
  generateFinalReport
};