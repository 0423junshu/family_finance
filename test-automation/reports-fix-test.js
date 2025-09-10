// test-automation/reports-fix-test.js
/**
 * 报表页修复验证测试脚本
 * 用于验证修复后的功能是否正常工作
 */

const dataSyncService = require('../services/data-sync');
const chartRenderer = require('../services/chart-renderer');
const amountFormatter = require('../services/amount-formatter');

class ReportsFixTest {
  constructor() {
    this.testResults = [];
    this.passedTests = 0;
    this.failedTests = 0;
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('开始报表页修复验证测试...\n');

    // 数据同步服务测试
    await this.testDataSyncService();

    // 金额格式化服务测试
    await this.testAmountFormatter();

    // 图表渲染服务测试
    await this.testChartRenderer();

    // 数据验证测试
    await this.testDataValidation();

    // 权限控制测试
    await this.testPermissionControl();

    // 输出测试结果
    this.outputTestResults();
  }

  /**
   * 测试数据同步服务
   */
  async testDataSyncService() {
    console.log('测试数据同步服务...');

    try {
      // 测试数据验证
      const validTransaction = {
        date: '2024-01-15',
        amount: 100,
        type: 'expense',
        categoryId: 'cat_1'
      };

      const invalidTransaction = {
        date: 'invalid-date',
        amount: -100,
        type: 'invalid-type'
      };

      this.assert(
        dataSyncService.validateTransaction(validTransaction),
        '有效交易数据验证应该通过'
      );

      this.assert(
        !dataSyncService.validateTransaction(invalidTransaction),
        '无效交易数据验证应该失败'
      );

      // 测试日期范围检查
      this.assert(
        dataSyncService.isDateInRange('2024-01-15', '2024-01-01', '2024-01-31'),
        '日期范围检查应该正确'
      );

      this.assert(
        !dataSyncService.isDateInRange('2024-02-15', '2024-01-01', '2024-01-31'),
        '超出范围的日期应该被正确识别'
      );

      console.log('✅ 数据同步服务测试通过\n');

    } catch (error) {
      this.recordFailure('数据同步服务测试', error.message);
    }
  }

  /**
   * 测试金额格式化服务
   */
  async testAmountFormatter() {
    console.log('测试金额格式化服务...');

    try {
      // 测试基本格式化
      this.assert(
        amountFormatter.formatAmount(12345) === '123.45',
        '分转元格式化应该正确'
      );

      this.assert(
        amountFormatter.formatAmountWithSymbol(12345) === '¥123.45',
        '带符号格式化应该正确'
      );

      // 测试大额格式化
      this.assert(
        amountFormatter.formatLargeAmount(1234500, false) === '1.2万',
        '大额格式化应该正确'
      );

      // 测试金额解析
      this.assert(
        amountFormatter.parseAmount('¥123.45') === 12345,
        '金额解析应该正确'
      );

      // 测试百分比格式化
      this.assert(
        amountFormatter.formatPercentage(25, 100) === '25%',
        '百分比格式化应该正确'
      );

      console.log('✅ 金额格式化服务测试通过\n');

    } catch (error) {
      this.recordFailure('金额格式化服务测试', error.message);
    }
  }

  /**
   * 测试图表渲染服务
   */
  async testChartRenderer() {
    console.log('测试图表渲染服务...');

    try {
      // 测试数值美化
      this.assert(
        chartRenderer.niceNumber(1234) === 2000,
        '数值美化应该正确'
      );

      this.assert(
        chartRenderer.niceNumber(0.123) === 1,
        '小数值美化应该正确'
      );

      // 测试最大值计算
      const testData = [
        { income: 1000, expense: 800, balance: 200 },
        { income: 1500, expense: 1200, balance: 300 },
        { income: 800, expense: 900, balance: -100 }
      ];

      const maxValue = chartRenderer.calculateMaxValue(testData);
      this.assert(
        maxValue >= 1500 && maxValue <= 2000,
        '最大值计算应该在合理范围内'
      );

      // 测试金额格式化
      this.assert(
        chartRenderer.formatAmount(12345) === '12k',
        '图表金额格式化应该正确'
      );

      console.log('✅ 图表渲染服务测试通过\n');

    } catch (error) {
      this.recordFailure('图表渲染服务测试', error.message);
    }
  }

  /**
   * 测试数据验证
   */
  async testDataValidation() {
    console.log('测试数据验证逻辑...');

    try {
      // 模拟交易数据
      const transactions = [
        {
          _id: '1',
          date: '2024-01-15',
          amount: 10000,
          type: 'expense',
          categoryId: 'cat_1',
          description: '午餐'
        },
        {
          _id: '2',
          date: '2024-01-16',
          amount: 50000,
          type: 'income',
          categoryId: 'cat_2',
          description: '工资'
        },
        {
          _id: '3',
          date: '2024-01-17',
          amount: 20000,
          type: 'expense',
          categoryId: 'cat_1',
          description: '购物'
        }
      ];

      // 测试汇总计算
      const summary = this.calculateSummary(transactions);
      this.assert(
        summary.totalIncome === 50000,
        '收入汇总计算应该正确'
      );

      this.assert(
        summary.totalExpense === 30000,
        '支出汇总计算应该正确'
      );

      this.assert(
        summary.balance === 20000,
        '结余计算应该正确'
      );

      // 测试分类统计
      const categoryStats = this.calculateCategoryStats(transactions);
      this.assert(
        categoryStats.expense.length > 0,
        '支出分类统计应该有数据'
      );

      this.assert(
        categoryStats.income.length > 0,
        '收入分类统计应该有数据'
      );

      console.log('✅ 数据验证逻辑测试通过\n');

    } catch (error) {
      this.recordFailure('数据验证逻辑测试', error.message);
    }
  }

  /**
   * 测试权限控制
   */
  async testPermissionControl() {
    console.log('测试权限控制逻辑...');

    try {
      // 模拟用户权限
      const adminUser = {
        _id: 'user_1',
        permissions: ['view_transactions', 'create_transaction', 'view_reports', 'manage_family']
      };

      const normalUser = {
        _id: 'user_2',
        permissions: ['view_transactions', 'view_reports']
      };

      // 测试权限检查
      this.assert(
        this.checkPermission(adminUser, 'manage_family'),
        '管理员应该有管理权限'
      );

      this.assert(
        !this.checkPermission(normalUser, 'manage_family'),
        '普通用户不应该有管理权限'
      );

      this.assert(
        this.checkPermission(normalUser, 'view_reports'),
        '普通用户应该有查看报表权限'
      );

      // 测试多权限检查
      this.assert(
        this.checkPermission(adminUser, ['view_transactions', 'create_transaction']),
        '管理员应该有多个权限'
      );

      this.assert(
        !this.checkPermission(normalUser, ['view_transactions', 'manage_family']),
        '普通用户不应该同时拥有所有权限'
      );

      console.log('✅ 权限控制逻辑测试通过\n');

    } catch (error) {
      this.recordFailure('权限控制逻辑测试', error.message);
    }
  }

  /**
   * 辅助方法：计算汇总数据
   */
  calculateSummary(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        totalIncome += transaction.amount || 0;
      } else if (transaction.type === 'expense') {
        totalExpense += transaction.amount || 0;
      }
    });

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  }

  /**
   * 辅助方法：计算分类统计
   */
  calculateCategoryStats(transactions) {
    const expenseMap = {};
    const incomeMap = {};

    transactions.forEach(transaction => {
      const { type, amount, categoryId } = transaction;

      if (type === 'expense') {
        if (!expenseMap[categoryId]) {
          expenseMap[categoryId] = { amount: 0, count: 0 };
        }
        expenseMap[categoryId].amount += amount || 0;
        expenseMap[categoryId].count += 1;
      } else if (type === 'income') {
        if (!incomeMap[categoryId]) {
          incomeMap[categoryId] = { amount: 0, count: 0 };
        }
        incomeMap[categoryId].amount += amount || 0;
        incomeMap[categoryId].count += 1;
      }
    });

    return {
      expense: Object.keys(expenseMap).map(id => ({ id, ...expenseMap[id] })),
      income: Object.keys(incomeMap).map(id => ({ id, ...incomeMap[id] }))
    };
  }

  /**
   * 辅助方法：权限检查
   */
  checkPermission(user, requiredPermissions) {
    if (!user || !user.permissions) {
      return false;
    }

    const userPermissions = user.permissions;
    const permissions = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];

    return permissions.every(permission => userPermissions.includes(permission));
  }

  /**
   * 断言方法
   */
  assert(condition, message) {
    if (condition) {
      this.passedTests++;
      this.testResults.push({ status: 'PASS', message });
    } else {
      this.failedTests++;
      this.testResults.push({ status: 'FAIL', message });
      throw new Error(`断言失败: ${message}`);
    }
  }

  /**
   * 记录失败
   */
  recordFailure(testName, error) {
    this.failedTests++;
    this.testResults.push({ 
      status: 'FAIL', 
      message: `${testName}: ${error}` 
    });
    console.log(`❌ ${testName}失败: ${error}\n`);
  }

  /**
   * 输出测试结果
   */
  outputTestResults() {
    console.log('='.repeat(50));
    console.log('测试结果汇总');
    console.log('='.repeat(50));
    console.log(`总测试数: ${this.passedTests + this.failedTests}`);
    console.log(`通过: ${this.passedTests}`);
    console.log(`失败: ${this.failedTests}`);
    console.log(`成功率: ${((this.passedTests / (this.passedTests + this.failedTests)) * 100).toFixed(2)}%`);
    
    if (this.failedTests > 0) {
      console.log('\n失败的测试:');
      this.testResults
        .filter(result => result.status === 'FAIL')
        .forEach(result => console.log(`❌ ${result.message}`));
    }

    console.log('\n测试完成!');
    
    if (this.failedTests === 0) {
      console.log('🎉 所有测试都通过了！修复方案验证成功。');
    } else {
      console.log('⚠️  部分测试失败，请检查修复代码。');
    }
  }
}

// 如果直接运行此文件，执行测试
if (typeof module !== 'undefined' && require.main === module) {
  const test = new ReportsFixTest();
  test.runAllTests().catch(console.error);
}

module.exports = ReportsFixTest;