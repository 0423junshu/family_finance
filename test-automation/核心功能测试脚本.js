// 个人理财应用核心功能测试脚本
const testUtils = require('../utils/test-utils');

/**
 * 核心功能自动化测试套件
 */
class CoreFunctionTestSuite {
  
  constructor() {
    this.testResults = [];
    this.currentTest = '';
  }
  
  /**
   * 运行所有核心功能测试
   */
  async runAllTests() {
    console.log('🚀 开始运行核心功能自动化测试...\n');
    
    try {
      // 1. 账户管理功能测试
      await this.testAccountManagement();
      
      // 2. 记账功能测试
      await this.testTransactionRecording();
      
      // 3. 预算管理测试
      await this.testBudgetManagement();
      
      // 4. 报表功能测试
      await this.testReportFunctionality();
      
      // 5. 数据一致性测试
      await this.testDataConsistency();
      
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ 测试执行失败:', error);
    }
  }
  
  /**
   * 账户管理功能测试
   */
  async testAccountManagement() {
    this.currentTest = '账户管理功能';
    console.log(`📋 ${this.currentTest}`);
    
    // 测试用例 1: 账户创建
    await this.testCase('创建银行账户', async () => {
      const accountData = {
        name: '测试银行账户',
        type: 'bank',
        balance: 10000,
        icon: '🏦'
      };
      
      // 调用创建账户接口
      const result = await testUtils.createAccount(accountData);
      return result && result.id;
    });
    
    // 测试用例 2: 账户查询
    await this.testCase('查询账户列表', async () => {
      const accounts = await testUtils.getAccounts();
      return accounts && accounts.length > 0;
    });
    
    // 测试用例 3: 账户修改
    await this.testCase('修改账户余额', async () => {
      const accounts = await testUtils.getAccounts();
      if (accounts.length === 0) return false;
      
      const account = accounts[0];
      const newBalance = 15000;
      const result = await testUtils.updateAccount(account.id, { balance: newBalance });
      
      return result && result.balance === newBalance;
    });
    
    // 测试用例 4: 账户删除
    await this.testCase('删除账户', async () => {
      const accounts = await testUtils.getAccounts();
      if (accounts.length === 0) return false;
      
      const account = accounts[0];
      const result = await testUtils.deleteAccount(account.id);
      
      // 验证删除后查询不到该账户
      const remainingAccounts = await testUtils.getAccounts();
      return result && !remainingAccounts.find(a => a.id === account.id);
    });
  }
  
  /**
   * 记账功能测试
   */
  async testTransactionRecording() {
    this.currentTest = '记账功能';
    console.log(`\n📋 ${this.currentTest}`);
    
    // 测试用例 1: 收入记录
    await this.testCase('记录收入交易', async () => {
      const transaction = {
        type: 'income',
        amount: 5000,
        category: '工资',
        account: '现金',
        date: new Date().toISOString(),
        description: '月度工资'
      };
      
      const result = await testUtils.recordTransaction(transaction);
      return result && result.id;
    });
    
    // 测试用例 2: 支出记录
    await this.testCase('记录支出交易', async () => {
      const transaction = {
        type: 'expense',
        amount: 200,
        category: '餐饮',
        account: '现金',
        date: new Date().toISOString(),
        description: '午餐费用'
      };
      
      const result = await testUtils.recordTransaction(transaction);
      return result && result.id;
    });
    
    // 测试用例 3: 转账记录
    await this.testCase('记录转账交易', async () => {
      const transaction = {
        type: 'transfer',
        amount: 1000,
        fromAccount: '现金',
        toAccount: '银行卡',
        date: new Date().toISOString(),
        description: '现金存入银行卡'
      };
      
      const result = await testUtils.recordTransaction(transaction);
      return result && result.id;
    });
    
    // 测试用例 4: 交易查询
    await this.testCase('查询交易记录', async () => {
      const transactions = await testUtils.getTransactions();
      return transactions && transactions.length > 0;
    });
  }
  
  /**
   * 预算管理测试
   */
  async testBudgetManagement() {
    this.currentTest = '预算管理';
    console.log(`\n📋 ${this.currentTest}`);
    
    // 测试用例 1: 预算设置
    await this.testCase('设置月度预算', async () => {
      const budgetData = {
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        amount: 5000,
        categories: {
          '餐饮': 1000,
          '交通': 500,
          '娱乐': 800
        }
      };
      
      const result = await testUtils.setBudget(budgetData);
      return result && result.id;
    });
    
    // 测试用例 2: 预算查询
    await this.testCase('查询预算信息', async () => {
      const budgets = await testUtils.getBudgets();
      return budgets && budgets.length > 0;
    });
    
    // 测试用例 3: 预算超支检测
    await this.testCase('检测预算超支', async () => {
      // 记录超过预算的消费
      const largeExpense = {
        type: 'expense',
        amount: 2000,
        category: '餐饮',
        account: '现金',
        date: new Date().toISOString()
      };
      
      await testUtils.recordTransaction(largeExpense);
      
      // 检查是否触发超支预警
      const warnings = await testUtils.getBudgetWarnings();
      return warnings && warnings.length > 0;
    });
  }
  
  /**
   * 报表功能测试
   */
  async testReportFunctionality() {
    this.currentTest = '报表功能';
    console.log(`\n📋 ${this.currentTest}`);
    
    // 测试用例 1: 收支报表
    await this.testCase('生成收支报表', async () => {
      const report = await testUtils.generateIncomeExpenseReport();
      return report && 
             report.totalIncome !== undefined && 
             report.totalExpense !== undefined;
    });
    
    // 测试用例 2: 资产报表
    await this.testCase('生成资产报表', async () => {
      const report = await testUtils.generateAssetReport();
      return report && report.totalAssets !== undefined;
    });
    
    // 测试用例 3: 预算执行报表
    await this.testCase('生成预算执行报表', async () => {
      const report = await testUtils.generateBudgetReport();
      return report && report.budgetUsage !== undefined;
    });
  }
  
  /**
   * 数据一致性测试
   */
  async testDataConsistency() {
    this.currentTest = '数据一致性';
    console.log(`\n📋 ${this.currentTest}`);
    
    // 测试用例 1: 账户余额一致性
    await this.testCase('验证账户余额一致性', async () => {
      const consistency = await testUtils.checkAccountConsistency();
      return consistency.isConsistent;
    });
    
    // 测试用例 2: 交易数据完整性
    await this.testCase('验证交易数据完整性', async () => {
      const integrity = await testUtils.checkTransactionIntegrity();
      return integrity.isComplete;
    });
    
    // 测试用例 3: 预算数据一致性
    await this.testCase('验证预算数据一致性', async () => {
      const consistency = await testUtils.checkBudgetConsistency();
      return consistency.isConsistent;
    });
  }
  
  /**
   * 单个测试用例执行
   */
  async testCase(name, testFunction) {
    try {
      console.log(`   ▶️ 执行: ${name}`);
      const result = await testFunction();
      
      if (result) {
        console.log(`   ✅ 通过: ${name}`);
        this.testResults.push({ test: name, status: '通过', message: '' });
        return true;
      } else {
        console.log(`   ❌ 失败: ${name}`);
        this.testResults.push({ test: name, status: '失败', message: '测试返回false' });
        return false;
      }
    } catch (error) {
      console.log(`   ❌ 错误: ${name} - ${error.message}`);
      this.testResults.push({ test: name, status: '错误', message: error.message });
      return false;
    }
  }
  
  /**
   * 生成测试报告
   */
  generateTestReport() {
    console.log('\n📊 测试报告摘要');
    console.log('=' .repeat(50));
    
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.status === '通过').length;
    const failed = this.testResults.filter(r => r.status === '失败').length;
    const errors = this.testResults.filter(r => r.status === '错误').length;
    
    console.log(`总测试用例: ${total}`);
    console.log(`通过: ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
    console.log(`失败: ${failed}`);
    console.log(`错误: ${errors}`);
    
    // 输出失败详情
    const failures = this.testResults.filter(r => r.status !== '通过');
    if (failures.length > 0) {
      console.log('\n❌ 失败的测试用例:');
      failures.forEach((failure, index) => {
        console.log(`   ${index + 1}. ${failure.test} - ${failure.status}: ${failure.message}`);
      });
    }
    
    // 保存详细报告
    this.saveDetailedReport();
  }
  
  /**
   * 保存详细测试报告
   */
  saveDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: this.testResults.length,
      passed: this.testResults.filter(r => r.status === '通过').length,
      failed: this.testResults.filter(r => r.status === '失败').length,
      errors: this.testResults.filter(r => r.status === '错误').length,
      details: this.testResults
    };
    
    // 保存到文件
    const fs = require('fs');
    const reportDir = './test-reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportFile = `${reportDir}/core-test-report-${new Date().getTime()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 详细测试报告已保存: ${reportFile}`);
  }
}

// 导出测试套件
module.exports = CoreFunctionTestSuite;

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const testSuite = new CoreFunctionTestSuite();
  testSuite.runAllTests().catch(console.error);
}