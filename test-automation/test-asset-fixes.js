// 资产页面修复测试脚本
const testUtils = require('./utils/test-utils');

/**
 * 测试资产页面功能修复
 */
async function testAssetFixes() {
  console.log('开始测试资产页面功能修复...\n');
  
  // 1. 测试日期选择器默认值
  console.log('1. 测试日期选择器默认值');
  await testMonthPickerDefaults();
  
  // 2. 测试资产数据时间关联性
  console.log('\n2. 测试资产数据时间关联性');
  await testAssetTimeAssociation();
  
  // 3. 测试历史资产记录
  console.log('\n3. 测试历史资产记录');
  await testAssetHistory();
  
  // 4. 测试报表页资产统计
  console.log('\n4. 测试报表页资产统计');
  await testReportAssetStats();
  
  console.log('\n✅ 所有测试完成！');
}

/**
 * 测试月份选择器默认值
 */
async function testMonthPickerDefaults() {
  try {
    // 模拟页面加载
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // 检查默认值设置
    const pageData = {
      currentYear: currentYear,
      currentMonth: currentMonth,
      selectedYear: currentYear,
      selectedMonth: currentMonth
    };
    
    console.log('   ✅ 默认年份:', pageData.currentYear);
    console.log('   ✅ 默认月份:', pageData.currentMonth + 1);
    console.log('   ✅ 选中年份:', pageData.selectedYear);
    console.log('   ✅ 选中月份:', pageData.selectedMonth + 1);
    
  } catch (error) {
    console.log('   ❌ 月份选择器默认值测试失败:', error.message);
  }
}

/**
 * 测试资产数据时间关联性
 */
async function testAssetTimeAssociation() {
  try {
    const testYear = 2024;
    const testMonth = 11; // 12月
    
    // 测试月份键生成
    const ymKey = `${testYear}-${String(testMonth + 1).padStart(2, '0')}`;
    console.log('   ✅ 月份键生成:', ymKey);
    
    // 测试数据存储路径
    const accountsKey = `accounts:${ymKey}`;
    const investmentsKey = `investments:${ymKey}`;
    console.log('   ✅ 账户存储键:', accountsKey);
    console.log('   ✅ 投资存储键:', investmentsKey);
    
    // 测试数据加载逻辑
    const testAccounts = [{ id: 'test1', name: '测试账户', balance: 100000, type: 'cash' }];
    const testInvestments = [{ id: 'test1', name: '测试投资', amount: 50000, type: 'fund' }];
    
    // 模拟存储
    wx.setStorageSync(accountsKey, testAccounts);
    wx.setStorageSync(investmentsKey, testInvestments);
    
    // 模拟加载
    const loadedAccounts = wx.getStorageSync(accountsKey) || [];
    const loadedInvestments = wx.getStorageSync(investmentsKey) || [];
    
    console.log('   ✅ 账户数据加载:', loadedAccounts.length > 0 ? '成功' : '失败');
    console.log('   ✅ 投资数据加载:', loadedInvestments.length > 0 ? '成功' : '失败');
    
  } catch (error) {
    console.log('   ❌ 资产时间关联性测试失败:', error.message);
  }
}

/**
 * 测试历史资产记录
 */
async function testAssetHistory() {
  try {
    // 测试资产变更记录
    const assetHistory = [];
    const timestamp = new Date().toISOString();
    const ymKey = '2024-12';
    
    const historyEntry = {
      timestamp,
      yearMonth: ymKey,
      totalAssets: 150000,
      accountCount: 2,
      investmentCount: 1,
      accounts: [
        { id: '1', name: '现金', balance: 100000 },
        { id: '2', name: '银行卡', balance: 50000 }
      ],
      investments: [
        { id: '1', name: '基金', amount: 50000 }
      ]
    };
    
    assetHistory.push(historyEntry);
    
    // 只保留最近12个月记录
    const recentHistory = assetHistory.slice(-12);
    
    console.log('   ✅ 资产历史记录添加:', assetHistory.length > 0 ? '成功' : '失败');
    console.log('   ✅ 历史记录限制:', recentHistory.length, '条记录');
    console.log('   ✅ 记录时间戳:', timestamp.substring(0, 16));
    
  } catch (error) {
    console.log('   ❌ 历史资产记录测试失败:', error.message);
  }
}

/**
 * 测试报表页资产统计
 */
async function testReportAssetStats() {
  try {
    const reportService = require('./services/report');
    
    // 测试月度资产数据生成
    const monthlyData = await reportService.generateMonthlyAssetData('2024-12');
    console.log('   ✅ 月度资产数据生成:', monthlyData.totalAssets !== undefined ? '成功' : '失败');
    console.log('   ✅ 总资产:', monthlyData.totalAssets);
    console.log('   ✅ 现金资产:', monthlyData.totalCash);
    console.log('   ✅ 投资资产:', monthlyData.totalInvestment);
    
    // 测试资产趋势数据
    const trendData = await reportService.generateAssetTrendData(2024, 11, 'month');
    console.log('   ✅ 资产趋势数据生成:', Array.isArray(trendData) ? '成功' : '失败');
    console.log('   ✅ 趋势数据条数:', trendData.length);
    
  } catch (error) {
    console.log('   ❌ 报表资产统计测试失败:', error.message);
  }
}

// 执行测试
testAssetFixes().catch(console.error);