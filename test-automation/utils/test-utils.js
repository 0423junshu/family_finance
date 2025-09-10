// 测试工具函数库
class TestUtils {
  
  constructor() {
    this.baseUrl = 'https://api.familyfinance.com'; // 假设的API基础地址
    this.testData = {};
  }
  
  /**
   * 模拟创建账户
   */
  async createAccount(accountData) {
    try {
      // 模拟API调用
      const newAccount = {
        id: 'acc_' + Date.now(),
        ...accountData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // 保存到测试数据
      if (!this.testData.accounts) {
        this.testData.accounts = [];
      }
      this.testData.accounts.push(newAccount);
      
      return newAccount;
    } catch (error) {
      console.error('创建账户失败:', error);
      throw error;
    }
  }
  
  /**
   * 模拟获取账户列表
   */
  async getAccounts() {
    return this.testData.accounts || [];
  }
  
  /**
   * 模拟更新账户
   */
  async updateAccount(accountId, updateData) {
    const accounts = this.testData.accounts || [];
    const index = accounts.findIndex(acc => acc.id === accountId);
    
    if (index !== -1) {
      accounts[index] = { ...accounts[index], ...updateData, updatedAt: new Date().toISOString() };
      return accounts[index];
    }
    
    throw new Error('账户不存在');
  }
  
  /**
   * 模拟删除账户
   */
  async deleteAccount(accountId) {
    const accounts = this.testData.accounts || [];
    const index = accounts.findIndex(acc => acc.id === accountId);
    
    if (index !== -1) {
      const deleted = accounts.splice(index, 1)[0];
      return { success: true, deletedAccount: deleted };
    }
    
    throw new Error('账户不存在');
  }
  
  /**
   * 模拟记录交易
   */
  async recordTransaction(transactionData) {
    try {
      const newTransaction = {
        id: 'txn_' + Date.now(),
        ...transactionData,
        createdAt: new Date().toISOString()
      };
      
      if (!this.testData.transactions) {
        this.testData.transactions = [];
      }
      this.testData.transactions.push(newTransaction);
      
      return newTransaction;
    } catch (error) {
      console.error('记录交易失败:', error);
      throw error;
    }
  }
  
  /**
   * 模拟获取交易记录
   */
  async getTransactions() {
    return this.testData.transactions || [];
  }
  
  /**
   * 模拟设置预算
   */
  async setBudget(budgetData) {
    try {
      const newBudget = {
        id: 'budget_' + Date.now(),
        ...budgetData,
        createdAt: new Date().toISOString()
      };
      
      if (!this.testData.budgets) {
        this.testData.budgets = [];
      }
      this.testData.budgets.push(newBudget);
      
      return newBudget;
    } catch (error) {
      console.error('设置预算失败:', error);
      throw error;
    }
  }
  
  /**
   * 模拟获取预算
   */
  async getBudgets() {
    return this.testData.budgets || [];
  }
  
  /**
   * 模拟获取预算预警
   */
  async getBudgetWarnings() {
    // 简单的预算超支检测逻辑
    const budgets = this.testData.budgets || [];
    const transactions = this.testData.transactions || [];
    
    const warnings = [];
    
    budgets.forEach(budget => {
      Object.entries(budget.categories || {}).forEach(([category, limit]) => {
        const categorySpending = transactions
          .filter(tx => tx.type === 'expense' && tx.category === category)
          .reduce((sum, tx) => sum + tx.amount, 0);
        
        if (categorySpending > limit) {
          warnings.push({
            category,
            spent: categorySpending,
            limit,
            overAmount: categorySpending - limit
          });
        }
      });
    });
    
    return warnings;
  }
  
  /**
   * 模拟生成收支报表
   */
  async generateIncomeExpenseReport() {
    const transactions = this.testData.transactions || [];
    
    const totalIncome = transactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const totalExpense = transactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      period: new Date().toISOString().slice(0, 7)
    };
  }
  
  /**
   * 模拟生成资产报表
   */
  async generateAssetReport() {
    const accounts = this.testData.accounts || [];
    
    const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    
    return {
      totalAssets,
      accountCount: accounts.length,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * 模拟生成预算执行报表
   */
  async generateBudgetReport() {
    const budgets = this.testData.budgets || [];
    const transactions = this.testData.transactions || [];
    
    const budgetUsage = {};
    
    budgets.forEach(budget => {
      Object.entries(budget.categories || {}).forEach(([category, limit]) => {
        const spent = transactions
          .filter(tx => tx.type === 'expense' && tx.category === category)
          .reduce((sum, tx) => sum + tx.amount, 0);
        
        budgetUsage[category] = {
          limit,
          spent,
          remaining: limit - spent,
          usageRate: ((spent / limit) * 100).toFixed(1)
        };
      });
    });
    
    return { budgetUsage };
  }
  
  /**
   * 检查账户余额一致性
   */
  async checkAccountConsistency() {
    const accounts = this.testData.accounts || [];
    const transactions = this.testData.transactions || [];
    
    let isConsistent = true;
    const inconsistencies = [];
    
    // 简单的余额验证逻辑
    accounts.forEach(account => {
      const accountTransactions = transactions.filter(tx => 
        tx.account === account.name || tx.fromAccount === account.name || tx.toAccount === account.name
      );
      
      // 这里可以添加更复杂的余额计算逻辑
      const calculatedBalance = accountTransactions.reduce((balance, tx) => {
        if (tx.type === 'income' && tx.account === account.name) {
          return balance + tx.amount;
        } else if (tx.type === 'expense' && tx.account === account.name) {
          return balance - tx.amount;
        } else if (tx.type === 'transfer') {
          if (tx.fromAccount === account.name) {
            return balance - tx.amount;
          } else if (tx.toAccount === account.name) {
            return balance + tx.amount;
          }
        }
        return balance;
      }, account.balance || 0);
      
      if (Math.abs(calculatedBalance - account.balance) > 0.01) {
        isConsistent = false;
        inconsistencies.push({
          account: account.name,
          storedBalance: account.balance,
          calculatedBalance,
          difference: calculatedBalance - account.balance
        });
      }
    });
    
    return { isConsistent, inconsistencies };
  }
  
  /**
   * 检查交易数据完整性
   */
  async checkTransactionIntegrity() {
    const transactions = this.testData.transactions || [];
    
    let isComplete = true;
    const missingFields = [];
    
    transactions.forEach((tx, index) => {
      const requiredFields = ['id', 'type', 'amount', 'date'];
      const missing = requiredFields.filter(field => !tx[field]);
      
      if (missing.length > 0) {
        isComplete = false;
        missingFields.push({
          transactionIndex: index,
          missingFields: missing
        });
      }
    });
    
    return { isComplete, missingFields };
  }
  
  /**
   * 检查预算数据一致性
   */
  async checkBudgetConsistency() {
    const budgets = this.testData.budgets || [];
    
    let isConsistent = true;
    const issues = [];
    
    budgets.forEach(budget => {
      if (budget.amount <= 0) {
        isConsistent = false;
        issues.push({
          budgetId: budget.id,
          issue: '预算金额必须大于0'
        });
      }
      
      if (budget.categories) {
        const categoriesTotal = Object.values(budget.categories).reduce((sum, amount) => sum + amount, 0);
        if (Math.abs(categoriesTotal - budget.amount) > 0.01) {
          isConsistent = false;
          issues.push({
            budgetId: budget.id,
            issue: `分类预算总和(${categoriesTotal})与总预算(${budget.amount})不一致`
          });
        }
      }
    });
    
    return { isConsistent, issues };
  }
  
  /**
   * 重置测试数据
   */
  resetTestData() {
    this.testData = {};
    console.log('测试数据已重置');
  }
  
  /**
   * 生成测试数据报告
   */
  generateDataReport() {
    return {
      accounts: this.testData.accounts?.length || 0,
      transactions: this.testData.transactions?.length || 0,
      budgets: this.testData.budgets?.length || 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

// 导出单例实例
module.exports = new TestUtils();