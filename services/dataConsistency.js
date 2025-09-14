// services/dataConsistency.js
// 数据一致性检查和跨模块数据同步服务

const { formatCurrency, formatDate } = require('../utils/formatter');
const { showToast } = require('../utils/uiUtil');

class DataConsistencyService {
  constructor() {
    this.syncQueue = [];
    this.isProcessing = false;
    this.lastSyncTime = null;
  }

  /**
   * 初始化数据一致性服务
   */
  init() {
    console.log('数据一致性服务初始化');
    this.loadLastSyncTime();
    this.schedulePeriodicCheck();
  }

  /**
   * 加载上次同步时间
   */
  loadLastSyncTime() {
    try {
      this.lastSyncTime = wx.getStorageSync('lastSyncTime') || null;
    } catch (error) {
      console.error('加载同步时间失败:', error);
    }
  }

  /**
   * 保存同步时间
   */
  saveLastSyncTime() {
    try {
      this.lastSyncTime = new Date().toISOString();
      wx.setStorageSync('lastSyncTime', this.lastSyncTime);
    } catch (error) {
      console.error('保存同步时间失败:', error);
    }
  }

  /**
   * 定期数据一致性检查
   */
  schedulePeriodicCheck() {
    // 每5分钟检查一次数据一致性
    setInterval(() => {
      this.performConsistencyCheck();
    }, 5 * 60 * 1000);
  }

  /**
   * 执行数据一致性检查
   */
  async performConsistencyCheck() {
    if (this.isProcessing) return;
    
    try {
      this.isProcessing = true;
      console.log('开始数据一致性检查');

      const issues = [];
      
      // 检查交易数据一致性
      const transactionIssues = await this.checkTransactionConsistency();
      issues.push(...transactionIssues);

      // 检查账户数据一致性
      const accountIssues = await this.checkAccountConsistency();
      issues.push(...accountIssues);

      // 检查预算数据一致性
      const budgetIssues = await this.checkBudgetConsistency();
      issues.push(...budgetIssues);

      // 检查分类数据一致性
      const categoryIssues = await this.checkCategoryConsistency();
      issues.push(...categoryIssues);

      if (issues.length > 0) {
        console.warn('发现数据一致性问题:', issues);
        await this.fixConsistencyIssues(issues);
      } else {
        console.log('数据一致性检查通过');
      }

      this.saveLastSyncTime();

    } catch (error) {
      console.error('数据一致性检查失败:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 检查交易数据一致性
   */
  async checkTransactionConsistency() {
    const issues = [];
    
    try {
      const transactions = wx.getStorageSync('transactions') || [];
      const accounts = wx.getStorageSync('accounts') || [];
      const categories = wx.getStorageSync('categories') || [];

      for (const transaction of transactions) {
        // 检查账户是否存在
        const account = accounts.find(a => a.id === transaction.accountId);
        if (!account) {
          issues.push({
            type: 'missing_account',
            transactionId: transaction.id,
            accountId: transaction.accountId,
            message: `交易 ${transaction.id} 引用的账户 ${transaction.accountId} 不存在`
          });
        }

        // 检查分类是否存在
        const category = categories.find(c => c.name === transaction.category);
        if (!category) {
          issues.push({
            type: 'missing_category',
            transactionId: transaction.id,
            categoryName: transaction.category,
            message: `交易 ${transaction.id} 引用的分类 ${transaction.category} 不存在`
          });
        }

        // 检查必要字段
        if (!transaction.amount || transaction.amount <= 0) {
          issues.push({
            type: 'invalid_amount',
            transactionId: transaction.id,
            amount: transaction.amount,
            message: `交易 ${transaction.id} 的金额无效`
          });
        }

        if (!transaction.date) {
          issues.push({
            type: 'missing_date',
            transactionId: transaction.id,
            message: `交易 ${transaction.id} 缺少日期`
          });
        }
      }

    } catch (error) {
      console.error('检查交易数据一致性失败:', error);
      issues.push({
        type: 'check_error',
        module: 'transaction',
        error: error.message
      });
    }

    return issues;
  }

  /**
   * 检查账户数据一致性
   */
  async checkAccountConsistency() {
    const issues = [];
    
    try {
      const accounts = wx.getStorageSync('accounts') || [];
      const transactions = wx.getStorageSync('transactions') || [];

      for (const account of accounts) {
        // 计算账户实际余额
        const accountTransactions = transactions.filter(t => t.accountId === account.id);
        let calculatedBalance = account.initialBalance || 0;

        for (const transaction of accountTransactions) {
          if (transaction.type === 'income') {
            calculatedBalance += transaction.amount;
          } else if (transaction.type === 'expense') {
            calculatedBalance -= transaction.amount;
          }
        }

        // 检查余额是否一致
        const storedBalance = account.balance || 0;
        const difference = Math.abs(calculatedBalance - storedBalance);
        
        if (difference > 0.01) { // 允许1分钱的误差
          issues.push({
            type: 'balance_mismatch',
            accountId: account.id,
            accountName: account.name,
            storedBalance,
            calculatedBalance,
            difference,
            message: `账户 ${account.name} 余额不一致，存储余额: ${storedBalance}，计算余额: ${calculatedBalance}`
          });
        }

        // 检查必要字段
        if (!account.name) {
          issues.push({
            type: 'missing_name',
            accountId: account.id,
            message: `账户 ${account.id} 缺少名称`
          });
        }
      }

    } catch (error) {
      console.error('检查账户数据一致性失败:', error);
      issues.push({
        type: 'check_error',
        module: 'account',
        error: error.message
      });
    }

    return issues;
  }

  /**
   * 检查预算数据一致性
   */
  async checkBudgetConsistency() {
    const issues = [];
    
    try {
      const budgets = wx.getStorageSync('budgets') || [];
      const incomeExpectations = wx.getStorageSync('incomeExpectations') || [];
      const categories = wx.getStorageSync('categories') || [];

      // 检查支出预算
      for (const budget of budgets) {
        const category = categories.find(c => c.name === budget.categoryName);
        if (!category) {
          issues.push({
            type: 'budget_missing_category',
            budgetId: budget.id,
            categoryName: budget.categoryName,
            message: `预算引用的分类 ${budget.categoryName} 不存在`
          });
        }

        if (!budget.amount || budget.amount <= 0) {
          issues.push({
            type: 'invalid_budget_amount',
            budgetId: budget.id,
            amount: budget.amount,
            message: `预算 ${budget.id} 的金额无效`
          });
        }
      }

      // 检查收入预期
      for (const expectation of incomeExpectations) {
        const category = categories.find(c => c.name === expectation.categoryName);
        if (!category) {
          issues.push({
            type: 'income_missing_category',
            expectationId: expectation.id,
            categoryName: expectation.categoryName,
            message: `收入预期引用的分类 ${expectation.categoryName} 不存在`
          });
        }

        if (!expectation.amount || expectation.amount <= 0) {
          issues.push({
            type: 'invalid_income_amount',
            expectationId: expectation.id,
            amount: expectation.amount,
            message: `收入预期 ${expectation.id} 的金额无效`
          });
        }
      }

    } catch (error) {
      console.error('检查预算数据一致性失败:', error);
      issues.push({
        type: 'check_error',
        module: 'budget',
        error: error.message
      });
    }

    return issues;
  }

  /**
   * 检查分类数据一致性
   */
  async checkCategoryConsistency() {
    const issues = [];
    
    try {
      const categories = wx.getStorageSync('categories') || [];
      const transactions = wx.getStorageSync('transactions') || [];

      // 检查是否有重复的分类名称
      const categoryNames = categories.map(c => c.name);
      const duplicateNames = categoryNames.filter((name, index) => 
        categoryNames.indexOf(name) !== index
      );

      for (const duplicateName of [...new Set(duplicateNames)]) {
        issues.push({
          type: 'duplicate_category',
          categoryName: duplicateName,
          message: `分类名称 ${duplicateName} 重复`
        });
      }

      // 检查是否有孤立的分类（没有被任何交易使用）
      for (const category of categories) {
        const isUsed = transactions.some(t => t.category === category.name);
        if (!isUsed && category.isCustom) {
          issues.push({
            type: 'unused_category',
            categoryId: category.id,
            categoryName: category.name,
            message: `自定义分类 ${category.name} 未被使用`
          });
        }
      }

    } catch (error) {
      console.error('检查分类数据一致性失败:', error);
      issues.push({
        type: 'check_error',
        module: 'category',
        error: error.message
      });
    }

    return issues;
  }

  /**
   * 修复数据一致性问题
   */
  async fixConsistencyIssues(issues) {
    let fixedCount = 0;
    
    for (const issue of issues) {
      try {
        switch (issue.type) {
          case 'balance_mismatch':
            await this.fixBalanceMismatch(issue);
            fixedCount++;
            break;
          
          case 'missing_account':
            await this.fixMissingAccount(issue);
            fixedCount++;
            break;
          
          case 'missing_category':
            await this.fixMissingCategory(issue);
            fixedCount++;
            break;
          
          case 'duplicate_category':
            await this.fixDuplicateCategory(issue);
            fixedCount++;
            break;
          
          case 'unused_category':
            // 暂时不自动删除未使用的分类，只记录
            console.log('发现未使用的分类:', issue.categoryName);
            break;
          
          default:
            console.warn('未知的一致性问题类型:', issue.type);
        }
      } catch (error) {
        console.error('修复一致性问题失败:', issue, error);
      }
    }

    if (fixedCount > 0) {
      console.log(`已修复 ${fixedCount} 个数据一致性问题`);
      showToast(`已修复 ${fixedCount} 个数据问题`, 'success');
    }
  }

  /**
   * 修复账户余额不匹配
   */
  async fixBalanceMismatch(issue) {
    try {
      const accounts = wx.getStorageSync('accounts') || [];
      const accountIndex = accounts.findIndex(a => a.id === issue.accountId);
      
      if (accountIndex !== -1) {
        accounts[accountIndex].balance = issue.calculatedBalance;
        wx.setStorageSync('accounts', accounts);
        console.log(`已修复账户 ${issue.accountName} 的余额不匹配问题`);
      }
    } catch (error) {
      console.error('修复余额不匹配失败:', error);
    }
  }

  /**
   * 修复缺失的账户
   */
  async fixMissingAccount(issue) {
    try {
      const transactions = wx.getStorageSync('transactions') || [];
      const transactionIndex = transactions.findIndex(t => t.id === issue.transactionId);
      
      if (transactionIndex !== -1) {
        // 创建一个默认账户或将交易分配给默认账户
        const accounts = wx.getStorageSync('accounts') || [];
        let defaultAccount = accounts.find(a => a.name === '现金');
        
        if (!defaultAccount) {
          defaultAccount = {
            id: Date.now().toString(),
            name: '现金',
            type: 'cash',
            balance: 0,
            initialBalance: 0,
            isDefault: true,
            createdAt: new Date().toISOString()
          };
          accounts.push(defaultAccount);
          wx.setStorageSync('accounts', accounts);
        }
        
        transactions[transactionIndex].accountId = defaultAccount.id;
        wx.setStorageSync('transactions', transactions);
        console.log(`已将交易 ${issue.transactionId} 分配给默认账户`);
      }
    } catch (error) {
      console.error('修复缺失账户失败:', error);
    }
  }

  /**
   * 修复缺失的分类
   */
  async fixMissingCategory(issue) {
    try {
      const categories = wx.getStorageSync('categories') || [];
      const existingCategory = categories.find(c => c.name === issue.categoryName);
      
      if (!existingCategory) {
        const newCategory = {
          id: Date.now().toString(),
          name: issue.categoryName,
          type: 'expense', // 默认为支出分类
          icon: '💰',
          isCustom: true,
          createdAt: new Date().toISOString()
        };
        
        categories.push(newCategory);
        wx.setStorageSync('categories', categories);
        console.log(`已创建缺失的分类: ${issue.categoryName}`);
      }
    } catch (error) {
      console.error('修复缺失分类失败:', error);
    }
  }

  /**
   * 修复重复的分类
   */
  async fixDuplicateCategory(issue) {
    try {
      const categories = wx.getStorageSync('categories') || [];
      const duplicateCategories = categories.filter(c => c.name === issue.categoryName);
      
      if (duplicateCategories.length > 1) {
        // 保留第一个，删除其他重复的
        const keepCategory = duplicateCategories[0];
        const removeCategories = duplicateCategories.slice(1);
        
        const filteredCategories = categories.filter(c => 
          !removeCategories.some(rc => rc.id === c.id)
        );
        
        wx.setStorageSync('categories', filteredCategories);
        console.log(`已删除重复的分类: ${issue.categoryName}`);
      }
    } catch (error) {
      console.error('修复重复分类失败:', error);
    }
  }

  /**
   * 跨模块数据同步
   */
  async syncDataAcrossModules(sourceModule, targetModules, data) {
    try {
      console.log(`开始跨模块数据同步: ${sourceModule} -> ${targetModules.join(', ')}`);
      
      for (const targetModule of targetModules) {
        await this.syncToModule(sourceModule, targetModule, data);
      }
      
      console.log('跨模块数据同步完成');
    } catch (error) {
      console.error('跨模块数据同步失败:', error);
    }
  }

  /**
   * 同步数据到指定模块
   */
  async syncToModule(sourceModule, targetModule, data) {
    switch (targetModule) {
      case 'budget':
        await this.syncToBudgetModule(sourceModule, data);
        break;
      case 'account':
        await this.syncToAccountModule(sourceModule, data);
        break;
      case 'transaction':
        await this.syncToTransactionModule(sourceModule, data);
        break;
      case 'category':
        await this.syncToCategoryModule(sourceModule, data);
        break;
      default:
        console.warn('未知的目标模块:', targetModule);
    }
  }

  /**
   * 同步到预算模块
   */
  async syncToBudgetModule(sourceModule, data) {
    if (sourceModule === 'transaction') {
      // 交易变更时，更新预算进度
      const budgets = wx.getStorageSync('budgets') || [];
      const incomeExpectations = wx.getStorageSync('incomeExpectations') || [];
      
      // 这里可以触发预算页面的数据刷新
      wx.$emitter && wx.$emitter.emit('budget:refresh');
    }
  }

  /**
   * 同步到账户模块
   */
  async syncToAccountModule(sourceModule, data) {
    if (sourceModule === 'transaction') {
      // 交易变更时，更新账户余额
      const accounts = wx.getStorageSync('accounts') || [];
      const transactions = wx.getStorageSync('transactions') || [];
      
      // 重新计算所有账户余额
      for (const account of accounts) {
        const accountTransactions = transactions.filter(t => t.accountId === account.id);
        let balance = account.initialBalance || 0;
        
        for (const transaction of accountTransactions) {
          if (transaction.type === 'income') {
            balance += transaction.amount;
          } else if (transaction.type === 'expense') {
            balance -= transaction.amount;
          }
        }
        
        account.balance = balance;
      }
      
      wx.setStorageSync('accounts', accounts);
      wx.$emitter && wx.$emitter.emit('account:refresh');
    }
  }

  /**
   * 同步到交易模块
   */
  async syncToTransactionModule(sourceModule, data) {
    // 其他模块变更时，可能需要更新交易列表显示
    wx.$emitter && wx.$emitter.emit('transaction:refresh');
  }

  /**
   * 同步到分类模块
   */
  async syncToCategoryModule(sourceModule, data) {
    // 分类变更时的同步逻辑
    wx.$emitter && wx.$emitter.emit('category:refresh');
  }

  /**
   * 手动触发数据同步
   */
  async manualSync() {
    try {
      wx.showLoading({ title: '同步中...' });
      await this.performConsistencyCheck();
      wx.hideLoading();
      showToast('数据同步完成', 'success');
    } catch (error) {
      wx.hideLoading();
      console.error('手动同步失败:', error);
      showToast('同步失败', 'error');
    }
  }

  /**
   * 获取数据统计信息
   */
  getDataStats() {
    try {
      const transactions = wx.getStorageSync('transactions') || [];
      const accounts = wx.getStorageSync('accounts') || [];
      const categories = wx.getStorageSync('categories') || [];
      const budgets = wx.getStorageSync('budgets') || [];
      const incomeExpectations = wx.getStorageSync('incomeExpectations') || [];
      
      return {
        transactions: transactions.length,
        accounts: accounts.length,
        categories: categories.length,
        budgets: budgets.length,
        incomeExpectations: incomeExpectations.length,
        lastSyncTime: this.lastSyncTime,
        storageSize: this.calculateStorageSize()
      };
    } catch (error) {
      console.error('获取数据统计失败:', error);
      return null;
    }
  }

  /**
   * 计算存储大小
   */
  calculateStorageSize() {
    try {
      const data = {
        transactions: wx.getStorageSync('transactions') || [],
        accounts: wx.getStorageSync('accounts') || [],
        categories: wx.getStorageSync('categories') || [],
        budgets: wx.getStorageSync('budgets') || [],
        incomeExpectations: wx.getStorageSync('incomeExpectations') || []
      };
      
      const jsonString = JSON.stringify(data);
      return (jsonString.length / 1024).toFixed(2) + ' KB';
    } catch (error) {
      console.error('计算存储大小失败:', error);
      return '未知';
    }
  }
}

// 创建全局实例
const dataConsistencyService = new DataConsistencyService();

module.exports = dataConsistencyService;