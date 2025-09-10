// test-automation/generate-test-assets.js
/**
 * 生成测试资产数据
 * 包括账户和投资理财数据
 */

/**
 * 生成测试账户数据
 */
function generateTestAccounts() {
  const accounts = [
    {
      id: 'account_test_1',
      name: '招商银行储蓄卡',
      type: 'savings',
      balance: 125000, // 1250元
      icon: '🏦',
      color: '#FF6B6B',
      description: '日常消费账户',
      createTime: new Date('2024-01-01').toISOString(),
      updateTime: new Date().toISOString()
    },
    {
      id: 'account_test_2', 
      name: '支付宝余额',
      type: 'digital',
      balance: 68500, // 685元
      icon: '💰',
      color: '#4ECDC4',
      description: '移动支付账户',
      createTime: new Date('2024-01-15').toISOString(),
      updateTime: new Date().toISOString()
    },
    {
      id: 'account_test_3',
      name: '微信零钱',
      type: 'digital', 
      balance: 32000, // 320元
      icon: '💚',
      color: '#45B7D1',
      description: '微信支付账户',
      createTime: new Date('2024-02-01').toISOString(),
      updateTime: new Date().toISOString()
    },
    {
      id: 'account_test_4',
      name: '建设银行信用卡',
      type: 'credit',
      balance: -15000, // -150元（负债）
      creditLimit: 500000, // 5000元额度
      icon: '💳',
      color: '#96CEB4',
      description: '信用消费账户',
      createTime: new Date('2024-02-15').toISOString(),
      updateTime: new Date().toISOString()
    },
    {
      id: 'account_test_5',
      name: '现金',
      type: 'cash',
      balance: 50000, // 500元
      icon: '💵',
      color: '#FFEAA7',
      description: '现金账户',
      createTime: new Date('2024-03-01').toISOString(),
      updateTime: new Date().toISOString()
    }
  ];

  return accounts;
}

/**
 * 生成测试投资数据
 */
function generateTestInvestments() {
  const investments = [
    {
      id: 'investment_test_1',
      name: '余额宝',
      type: 'fund',
      initialValue: 100000, // 1000元
      currentValue: 102500, // 1025元
      profit: 2500, // 25元收益
      profitRate: 2.5,
      purchaseDate: new Date('2024-01-10').toISOString(),
      icon: '📈',
      color: '#32CD32',
      description: '货币基金理财',
      createTime: new Date('2024-01-10').toISOString(),
      updateTime: new Date().toISOString()
    },
    {
      id: 'investment_test_2',
      name: '定期存款',
      type: 'deposit',
      initialValue: 500000, // 5000元
      currentValue: 515000, // 5150元
      profit: 15000, // 150元收益
      profitRate: 3.0,
      purchaseDate: new Date('2024-02-01').toISOString(),
      maturityDate: new Date('2025-02-01').toISOString(),
      icon: '🏛️',
      color: '#FFD700',
      description: '银行定期存款',
      createTime: new Date('2024-02-01').toISOString(),
      updateTime: new Date().toISOString()
    },
    {
      id: 'investment_test_3',
      name: '股票投资',
      type: 'stock',
      initialValue: 200000, // 2000元
      currentValue: 185000, // 1850元
      profit: -15000, // -150元亏损
      profitRate: -7.5,
      purchaseDate: new Date('2024-03-15').toISOString(),
      icon: '📊',
      color: '#00CED1',
      description: '股票投资组合',
      createTime: new Date('2024-03-15').toISOString(),
      updateTime: new Date().toISOString()
    },
    {
      id: 'investment_test_4',
      name: '基金定投',
      type: 'fund',
      initialValue: 300000, // 3000元
      currentValue: 318000, // 3180元
      profit: 18000, // 180元收益
      profitRate: 6.0,
      purchaseDate: new Date('2024-01-20').toISOString(),
      icon: '🎯',
      color: '#9370DB',
      description: '指数基金定投',
      createTime: new Date('2024-01-20').toISOString(),
      updateTime: new Date().toISOString()
    }
  ];

  return investments;
}

/**
 * 生成历史资产数据（用于趋势分析）
 */
function generateHistoricalAssetData() {
  const historicalData = [];
  const now = new Date();
  
  // 生成过去12个月的资产数据
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    // 模拟资产增长趋势
    const baseAssets = 1000000; // 基础资产10000元
    const growth = (11 - i) * 5000; // 每月增长50元
    const randomVariation = (Math.random() - 0.5) * 10000; // 随机波动±100元
    
    const totalAssets = baseAssets + growth + randomVariation;
    
    historicalData.push({
      date: monthKey,
      totalAssets: Math.max(0, Math.round(totalAssets)),
      accountBalance: Math.round(totalAssets * 0.6), // 60%为账户余额
      investmentValue: Math.round(totalAssets * 0.4), // 40%为投资价值
      timestamp: date.toISOString()
    });
  }
  
  return historicalData;
}

/**
 * 保存测试数据到本地存储
 */
function saveTestData() {
  try {
    const accounts = generateTestAccounts();
    const investments = generateTestInvestments();
    const historicalAssets = generateHistoricalAssetData();
    
    // 保存到微信小程序本地存储
    wx.setStorageSync('accounts', accounts);
    wx.setStorageSync('investments', investments);
    wx.setStorageSync('historicalAssets', historicalAssets);
    
    console.log('测试资产数据生成成功:');
    console.log('- 账户数量:', accounts.length);
    console.log('- 投资数量:', investments.length);
    console.log('- 历史数据点:', historicalAssets.length);
    
    // 计算总资产
    const totalAccountBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const totalInvestmentValue = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
    const totalAssets = totalAccountBalance + totalInvestmentValue;
    
    console.log('资产概览:');
    console.log('- 账户余额总计:', (totalAccountBalance / 100).toFixed(2), '元');
    console.log('- 投资价值总计:', (totalInvestmentValue / 100).toFixed(2), '元');
    console.log('- 资产总额:', (totalAssets / 100).toFixed(2), '元');
    
    wx.showToast({
      title: '测试数据生成成功',
      icon: 'success',
      duration: 2000
    });
    
    return {
      success: true,
      data: {
        accounts,
        investments,
        historicalAssets,
        summary: {
          totalAccountBalance,
          totalInvestmentValue,
          totalAssets
        }
      }
    };
    
  } catch (error) {
    console.error('生成测试数据失败:', error);
    wx.showToast({
      title: '生成数据失败',
      icon: 'error',
      duration: 2000
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 清除测试数据
 */
function clearTestData() {
  try {
    wx.removeStorageSync('accounts');
    wx.removeStorageSync('investments');
    wx.removeStorageSync('historicalAssets');
    
    console.log('测试数据已清除');
    wx.showToast({
      title: '数据已清除',
      icon: 'success',
      duration: 1500
    });
    
    return { success: true };
  } catch (error) {
    console.error('清除测试数据失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 验证资产数据一致性
 */
function validateAssetConsistency() {
  try {
    const accounts = wx.getStorageSync('accounts') || [];
    const investments = wx.getStorageSync('investments') || [];
    
    const totalAccountBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const totalInvestmentValue = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
    const calculatedTotal = totalAccountBalance + totalInvestmentValue;
    
    console.log('资产一致性校验:');
    console.log('- 账户余额:', (totalAccountBalance / 100).toFixed(2), '元');
    console.log('- 投资价值:', (totalInvestmentValue / 100).toFixed(2), '元');
    console.log('- 计算总额:', (calculatedTotal / 100).toFixed(2), '元');
    
    return {
      success: true,
      data: {
        accountBalance: totalAccountBalance,
        investmentValue: totalInvestmentValue,
        totalAssets: calculatedTotal,
        isConsistent: true
      }
    };
    
  } catch (error) {
    console.error('资产一致性校验失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateTestAccounts,
  generateTestInvestments,
  generateHistoricalAssetData,
  saveTestData,
  clearTestData,
  validateAssetConsistency
};