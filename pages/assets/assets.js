// pages/assets/assets.js
const dataConsistency = require('../../services/data-consistency')
const { updateAccountBalance, deleteAccount } = require('../../services/account')
const testAssets = require('../../test-automation/generate-test-assets')

Page({
  data: {
    totalAssets: 0,
    showEditDialog: false,
    editingAccount: null,
    editAmount: '',
    lastUpdateTime: 0,
    // 月份选择相关
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    showMonthPicker: false,
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth(),
    // 时间选择器配置
    startYear: 2020,
    yearRange: [],
    // 日期状态显示
    dateStatus: '当前月份',
    accounts: [
      {
        id: '1',
        name: '现金',
        type: 'cash',
        balance: 100000,
        icon: '💴' // 一沓现金的本地化表达
      },
      {
        id: '2', 
        name: '招商银行',
        type: 'bank',
        balance: 500000,
        icon: '🏦' // 招商银行专用图标
      },
      {
        id: '3',
        name: '支付宝',
        type: 'wallet', 
        balance: 50000,
        icon: '🟦' // 支付宝蓝色标识
      }
    ],
    investments: [
      {
        id: '1',
        name: '余额宝',
        type: 'fund',
        amount: 200000,
        profit: 1500,
        profitRate: 0.75,
        icon: '💎' // 余额宝专用钻石图标
      }
    ]
  },

  onLoad(options) {
    // 检查报表页跳转上下文（在初始化前）
    this.checkReportsContextSync();
    this.checkReportsContext();
    
    this.initData()
    this.migrateAccountIcons() // 迁移账户图标到新版本
    this.generateTestData() // 直接生成测试数据
    this.runHistoryMigration()
    this.calculateTotalAssets()
  },

  onShow() {
    console.log('资产页 onShow 被调用');
    // 检查报表页跳转上下文（同步优先，避免被默认逻辑覆盖）
    this.checkReportsContextSync();
    this.checkReportsContext();
  },

  // 同步版本的上下文检查，确保在数据初始化前执行
  checkReportsContextSync() {
    try {
      const context = wx.getStorageSync('assetsPageContext');
      console.log('initData 中检查报表跳转上下文:', context);
      
      if (context && context.from === 'reports' && (Date.now() - context.timestamp) < 10000) {
        const { year, month, ymKey } = context;
        console.log('initData 中应用上下文:', { year, month, ymKey });
        
        if (Number.isInteger(year) && Number.isInteger(month) && month >= 0 && month <= 11) {
          // 直接修改 data，不使用 setData（因为页面可能还未完全初始化）
          this.data.currentYear = year;
          this.data.currentMonth = month;
          this.data.selectedYear = year;
          this.data.selectedMonth = month;
          
          wx.setStorageSync('lastViewedMonth', ymKey);
          console.log('initData 中成功设置年月:', year, month);
        }
        // 清除已使用的上下文
        wx.removeStorageSync('assetsPageContext');
      }
    } catch (e) {
      console.warn('initData 中读取报表跳转上下文失败:', e);
    }
  },

  // 检查并应用报表页跳转上下文的统一方法
  checkReportsContext() {
    try {
      const context = wx.getStorageSync('assetsPageContext');
      console.log('检查报表跳转上下文:', context);
      console.log('当前资产页 data:', JSON.stringify({ 
        currentYear: this.data.currentYear, 
        currentMonth: this.data.currentMonth,
        selectedYear: this.data.selectedYear,
        selectedMonth: this.data.selectedMonth 
      }));
      
      if (context && context.from === 'reports' && (Date.now() - context.timestamp) < 10000) {
        // 10秒内的跳转上下文有效
        const { year, month, ymKey } = context;
        console.log('上下文有效，年月数据:', { year, month, ymKey });
        
        if (Number.isInteger(year) && Number.isInteger(month) && month >= 0 && month <= 11) {
          console.log('从报表页跳转，设置上下文月份:', year, month, ymKey);
          console.log('设置前资产页月份:', this.data.currentMonth, '设置后应为:', month);
          
          this.setData({ 
            currentYear: year, 
            currentMonth: month, 
            selectedYear: year, 
            selectedMonth: month 
          });
          
          wx.setStorageSync('lastViewedMonth', ymKey);
          
          console.log('设置完成后资产页 data:', JSON.stringify({ 
            currentYear: this.data.currentYear, 
            currentMonth: this.data.currentMonth 
          }));
          
          // 重新计算资产数据以反映正确月份
          setTimeout(() => {
            console.log('延迟重新计算资产数据');
            this.calculateTotalAssets();
          }, 100);
        }
        // 清除已使用的上下文
        wx.removeStorageSync('assetsPageContext');
      }
    } catch (e) {
      console.warn('读取报表跳转上下文失败:', e);
    }
  },
  
  // 初始化默认日期为当月
  initData() {
    // 在初始化数据前先检查报表页跳转上下文
    this.checkReportsContextSync();
    
    const now = new Date()
    const currentYear = now.getFullYear()
    const startYear = 2020
    const endYear = currentYear + 1
    
    // 生成年份范围数组
    const yearRange = []
    for (let year = startYear; year <= endYear; year++) {
      yearRange.push(year)
    }
    
    this.setData({
      currentYear: currentYear,
      currentMonth: now.getMonth(),
      selectedYear: currentYear,
      selectedMonth: now.getMonth(),
      startYear: startYear,
      yearRange: yearRange
    })
  },

  onShow() {
    // 添加缓存检查，避免重复加载
    const now = Date.now()
    const lastLoadTime = this.data.lastLoadTime || 0
    
    // 只有在超过1秒未加载或者有数据变更时才重新加载
    if (now - lastLoadTime > 1000) {
      // 优先应用跳转上下文，避免默认年月覆盖
      this.checkReportsContextSync();
      // 数据一致性检查（仅在需要时执行）
      this.checkDataConsistency()
      
      this.loadData(this.data.currentYear, this.data.currentMonth)
      this.setData({ lastLoadTime: now })
    }
    
    // 监听账户变更
    const accountChanged = wx.getStorageSync('accountChanged')
    if (accountChanged && accountChanged > this.data.lastUpdateTime) {
      this.loadData()
      this.setData({ lastUpdateTime: now })
    }
  },

  // 阻止冒泡空函数（用于弹窗容器 catchtap）
  noop() {},

  // 新增：数据一致性检查，确保历史月份修改生效（带缓存优化）
  checkDataConsistency() {
    try {
      // 检查是否已经初始化过
      const consistencyChecked = wx.getStorageSync('consistencyChecked')
      if (consistencyChecked) {
        return // 已经检查过，避免重复执行
      }
      
      const mainAccounts = wx.getStorageSync('accounts') || []
      const mainInvestments = wx.getStorageSync('investments') || []
      const lastViewedMonth = wx.getStorageSync('lastViewedMonth')
      
      if (lastViewedMonth && mainAccounts.length > 0) {
        const monthAccounts = wx.getStorageSync(`accounts:${lastViewedMonth}`)
        
        // 仅在未初始化（undefined/null）时初始化，避免覆盖历史月份真实数据
        if (monthAccounts === undefined || monthAccounts === null) {
          wx.setStorageSync(`accounts:${lastViewedMonth}`, mainAccounts)
          console.log(`初始化历史月份账户数据: ${lastViewedMonth}`)
        }
      }
      
      if (lastViewedMonth && mainInvestments.length > 0) {
        const monthInvestments = wx.getStorageSync(`investments:${lastViewedMonth}`)
        
        // 仅在未初始化（undefined/null）时初始化，避免覆盖历史月份真实数据
        if (monthInvestments === undefined || monthInvestments === null) {
          wx.setStorageSync(`investments:${lastViewedMonth}`, mainInvestments)
          console.log(`初始化历史月份投资数据: ${lastViewedMonth}`)
        }
      }
      
      // 标记为已检查
      wx.setStorageSync('consistencyChecked', true)
    } catch (error) {
      console.error('数据一致性检查失败:', error)
    }
  },

  // 同步投资页面数据
  syncInvestmentData() {
    try {
      // 从投资页面获取最新数据
      const investmentPageData = wx.getStorageSync('investments');
      if (investmentPageData && Array.isArray(investmentPageData) && investmentPageData.length > 0) {
        // 转换投资页面数据格式到资产页面格式
        const convertedInvestments = investmentPageData.map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          amount: item.amount || 0,
          profit: item.return || 0, // 投资页面使用return字段
          profitRate: Number(item.returnRate || 0).toFixed(2), // 确保收益率精确到小数点后两位
          icon: this.getInvestmentIcon(item.type, item.name)
        }));
        
        // 更新当前数据
        this.setData({
          investments: convertedInvestments
        });
        
        console.log('已同步投资页面数据:', convertedInvestments.length, '项投资');
      }
    } catch (error) {
      console.error('同步投资数据失败:', error);
    }
  },

  // 根据投资类型和名称获取合适的图标 - 理财主题优化
  getInvestmentIcon(type, name) {
    // 根据具体产品名称匹配
    if (name && name.includes('余额宝')) return '💎';
    if (name && name.includes('银行')) return '🏛️';
    if (name && name.includes('理财')) return '💰';
    if (name && name.includes('腾讯')) return '📊';
    
    // 根据投资类型匹配
    if (type === 'fund') return '📈';
    if (type === 'stock') return '📊';
    if (type === 'bank') return '🏛️';
    
    // 默认理财图标
    return '💼';
  },

  // 迁移账户图标到新版本
  migrateAccountIcons() {
    try {
      const iconMigrated = wx.getStorageSync('iconMigrated_v2');
      if (iconMigrated) return; // 已经迁移过
      
      console.log('开始迁移账户图标到新版本...');
      
      // 更新主账户数据
      const accounts = wx.getStorageSync('accounts') || [];
      let updated = false;
      
      accounts.forEach(account => {
        const newIcon = this.getAccountIcon(account.type, account.name);
        if (account.icon !== newIcon) {
          console.log(`更新账户图标: ${account.name} ${account.icon} → ${newIcon}`);
          account.icon = newIcon;
          updated = true;
        }
      });
      
      if (updated) {
        wx.setStorageSync('accounts', accounts);
        console.log('主账户数据图标已更新');
      }
      
      // 更新所有历史月份的账户数据
      const currentDate = new Date();
      for (let i = 0; i < 24; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const ymKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const monthAccounts = wx.getStorageSync(`accounts:${ymKey}`);
        if (monthAccounts && Array.isArray(monthAccounts)) {
          let monthUpdated = false;
          monthAccounts.forEach(account => {
            const newIcon = this.getAccountIcon(account.type, account.name);
            if (account.icon !== newIcon) {
              account.icon = newIcon;
              monthUpdated = true;
            }
          });
          
          if (monthUpdated) {
            wx.setStorageSync(`accounts:${ymKey}`, monthAccounts);
            console.log(`${ymKey} 月份账户图标已更新`);
          }
        }
      }
      
      // 同时迁移投资理财的收益率格式
      const investments = wx.getStorageSync('investments') || [];
      let investmentUpdated = false;
      
      investments.forEach(investment => {
        // 确保收益率精确到小数点后两位
        const formattedRate = Number(investment.profitRate || 0).toFixed(2);
        if (investment.profitRate !== formattedRate) {
          console.log(`更新投资收益率: ${investment.name} ${investment.profitRate} → ${formattedRate}%`);
          investment.profitRate = formattedRate;
          investmentUpdated = true;
        }
      });
      
      if (investmentUpdated) {
        wx.setStorageSync('investments', investments);
        console.log('投资收益率格式已更新');
      }
      
      // 标记迁移完成
      wx.setStorageSync('iconMigrated_v2', true);
      console.log('账户图标和投资收益率迁移完成');
      
    } catch (error) {
      console.error('账户图标迁移失败:', error);
    }
  },

  // 根据账户类型获取本地化理财主题图标
  getAccountIcon(type, name) {
    // 现金账户 - 使用一沓现金的视觉表达
    if (type === 'cash') return '💴';
    
    // 银行账户 - 根据银行名称匹配具体图标
    if (type === 'bank') {
      if (name && name.includes('招商')) return '🏦';
      if (name && name.includes('工商')) return '🏛️';
      if (name && name.includes('建设')) return '🏢';
      if (name && name.includes('农业')) return '🌾';
      if (name && name.includes('中国银行')) return '🏛️';
      return '🏦'; // 默认银行图标
    }
    
    // 电子钱包 - 本地化移动支付图标
    if (type === 'wallet') {
      if (name && name.includes('支付宝')) return '🟦'; // 蓝色方块代表支付宝
      if (name && name.includes('微信')) return '🟢'; // 绿色圆圈代表微信支付
      if (name && name.includes('云闪付')) return '💳';
      return '📱'; // 默认移动支付图标
    }
    
    // 默认理财图标
    return '💰';
  },

  // 计算总资产 - 优化版本
  calculateTotalAssets() {
    // 在计算资产前检查报表页跳转上下文（同步 + 异步双保险）
    this.checkReportsContextSync();
    this.checkReportsContext();
    
    // 同步投资页面数据
    this.syncInvestmentData();
    
    const { accounts, investments } = this.data
    
    // 确保数据有效性
    const validAccounts = (accounts || []).filter(item => item && typeof item.balance === 'number')
    const validInvestments = (investments || []).filter(item => item && typeof item.amount === 'number')
    
    // 精确计算各项总额
    const accountsTotal = validAccounts.reduce((sum, item) => {
      const balance = Math.round(item.balance) // 确保为整数（分为单位）
      return sum + balance
    }, 0)
    
    const investmentsTotal = validInvestments.reduce((sum, item) => {
      const amount = Math.round(item.amount) // 确保为整数（分为单位）
      return sum + amount
    }, 0)
    
    const totalAssets = accountsTotal + investmentsTotal

    // 格式化显示数据，确保精度一致
    const formattedAccounts = validAccounts.map(item => ({
      ...item,
      balance: Math.round(item.balance), // 标准化为整数
      balanceDisplay: (Math.round(item.balance) / 100).toFixed(2),
      icon: item.icon || this.getAccountIcon(item.type, item.name) // 确保使用理财主题图标
    }))

    const formattedInvestments = validInvestments.map(item => ({
      ...item,
      amount: Math.round(item.amount), // 标准化为整数
      profit: Math.round(item.profit || 0), // 标准化为整数
      amountDisplay: (Math.round(item.amount) / 100).toFixed(2),
      profitDisplay: (Math.round(item.profit || 0) / 100).toFixed(2),
      profitRate: Number(item.profitRate || 0).toFixed(2) // 确保收益率精确到小数点后两位
    }))

    this.setData({ 
      totalAssets,
      totalAssetsDisplay: (totalAssets / 100).toFixed(2),
      accountsTotal,
      accountsTotalDisplay: (accountsTotal / 100).toFixed(2),
      investmentsTotal,
      investmentsTotalDisplay: (investmentsTotal / 100).toFixed(2),
      accounts: formattedAccounts,
      investments: formattedInvestments
    })
    
    // 保存总资产到本地存储
    const ymKey = `${this.data.currentYear}-${String(this.data.currentMonth + 1).padStart(2, '0')}`
    const assetData = {
      totalAssets,
      accountsTotal,
      investmentsTotal,
      timestamp: new Date().toISOString(),
      yearMonth: ymKey,
      accountCount: validAccounts.length,
      investmentCount: validInvestments.length
    }
    
    wx.setStorageSync('totalAssets', totalAssets)
    wx.setStorageSync(`reports:assets:${ymKey}`, assetData)
    
    // 记录计算日志
    console.log(`资产计算完成 - ${ymKey}: 总资产=${totalAssets}, 账户=${accountsTotal}, 投资=${investmentsTotal}`)
  },

  // 加载账户数据
  loadAccountData() {
    // 这里可以从本地存储或云端加载真实数据
    this.calculateTotalAssets()
  },

  // 添加账户
  onAddAccount() {
    wx.navigateTo({
      url: '/pages/account-manage/account-manage?mode=create'
    })
  },

  // 账户详情
  onAccountTap(e) {
    const ds = (e && e.currentTarget && e.currentTarget.dataset) || (e && e.target && e.target.dataset) || {}
    const accountId = ds.id || (ds.account && ds.account.id)
    if (!accountId) return
    
    // 传递当前查看的年月信息
    const { currentYear, currentMonth } = this.data
    const ymKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
    
    // 设置当前查看的月份到存储，供账户管理页面使用
    wx.setStorageSync('lastViewedMonth', ymKey)
    
    wx.navigateTo({
      url: `/pages/account-manage/account-manage?mode=edit&id=${accountId}&year=${currentYear}&month=${currentMonth}`
    })
  },

  // 投资详情（携带当前年月）
  onInvestmentTap(e) {
    const ds = (e && e.currentTarget && e.currentTarget.dataset) || (e && e.target && e.target.dataset) || {}
    const investmentId = ds.id || (ds.item && ds.item.id)
    if (!investmentId) return
    const { currentYear, currentMonth } = this.data
    const ymKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
    wx.setStorageSync('lastViewedMonth', ymKey)
    wx.navigateTo({
      url: `/pages/investment-add/investment-add?mode=edit&id=${investmentId}&year=${currentYear}&month=${currentMonth}`
    })
  },

  // 优化：简化数据加载逻辑，修复数据持久化问题
  async loadData(year, month) {
    try {
      // 优先使用显式传入的 year/month（来自跳转上下文）
      const targetYear = (Number.isInteger(year) ? year : this.data.currentYear)
      const targetMonth = (Number.isInteger(month) ? month : this.data.currentMonth)
      const ymKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`
      
      // 判断是否为当前月份
      const currentDate = new Date()
      const currentYmKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      const isCurrentMonth = ymKey === currentYmKey
      
      let accounts, investments
      
      if (isCurrentMonth) {
        // 当前月份：优先使用最新数据，确保数据不被清零
        accounts = wx.getStorageSync('accounts') || []
        investments = wx.getStorageSync('investments') || []
        
        // 如果最新数据为空，尝试从月份存储恢复
        if (accounts.length === 0) {
          const monthAccounts = wx.getStorageSync(`accounts:${ymKey}`)
          if (monthAccounts && monthAccounts.length > 0) {
            accounts = monthAccounts
            wx.setStorageSync('accounts', accounts) // 恢复最新数据
            console.log(`从月份存储恢复当前账户数据: ${accounts.length}个账户`)
          }
        }
        
        if (investments.length === 0) {
          const monthInvestments = wx.getStorageSync(`investments:${ymKey}`)
          if (monthInvestments && monthInvestments.length > 0) {
            investments = monthInvestments
            wx.setStorageSync('investments', investments) // 恢复最新数据
            console.log(`从月份存储恢复当前投资数据: ${investments.length}个投资`)
          }
        }
        
        console.log(`加载当前月份数据: 账户${accounts.length}个, 投资${investments.length}个`)
      } else {
        // 历史月份：优先从月份存储加载，保持数据独立性
        accounts = wx.getStorageSync(`accounts:${ymKey}`) || []
        investments = wx.getStorageSync(`investments:${ymKey}`) || []
        if (accounts.length === 0 && investments.length === 0) {
          const assetSnapshot = wx.getStorageSync(`assetSnapshot:${ymKey}`)
          if (assetSnapshot && assetSnapshot.accounts && assetSnapshot.investments) {
            accounts = assetSnapshot.accounts
            investments = assetSnapshot.investments
            console.log(`从资产快照加载${ymKey}的数据`)
          } else {
            const latestAccounts = wx.getStorageSync('accounts') || []
            const latestInvestments = wx.getStorageSync('investments') || []
            if (latestAccounts.length > 0 || latestInvestments.length > 0) {
              accounts = JSON.parse(JSON.stringify(latestAccounts))
              investments = JSON.parse(JSON.stringify(latestInvestments))
              wx.setStorageSync(`accounts:${ymKey}`, accounts)
              wx.setStorageSync(`investments:${ymKey}`, investments)
              console.log(`初始化${ymKey}的历史数据: 账户${accounts.length}个, 投资${investments.length}个`)
            }
          }
        } else {
          console.log(`从月份存储加载${ymKey}的数据: 账户${accounts.length}个, 投资${investments.length}个`)
        }
      }
      
      // 确保数据有效性
      accounts = Array.isArray(accounts) ? accounts : []
      investments = Array.isArray(investments) ? investments : []
      
      this.setData({ 
        accounts, 
        investments,
        currentYear: targetYear,
        currentMonth: targetMonth
      })
      
      this.calculateTotalAssets()
      
      // 保存当前查看的月份
      wx.setStorageSync('lastViewedMonth', ymKey)
    } catch (error) {
      console.error('加载数据失败:', error)
      // 出错时使用空数组，避免undefined导致的问题
      this.setData({ 
        accounts: [],
        investments: [],
        currentYear: year || new Date().getFullYear(),
        currentMonth: month !== undefined ? month : new Date().getMonth()
      })
      this.calculateTotalAssets()
    }
  },

  // 新增：查找最接近的资产历史记录
  findClosestAssetHistory(targetDate, assetHistory) {
    if (!assetHistory || assetHistory.length === 0) return null
    
    let closest = null
    let minDiff = Infinity
    
    assetHistory.forEach(history => {
      const historyDate = new Date(history.timestamp)
      const diff = Math.abs(targetDate.getTime() - historyDate.getTime())
      
      if (diff < minDiff && historyDate <= targetDate) {
        minDiff = diff
        closest = history
      }
    })
    
    return closest
  },




  
  // 删除账户
  onDeleteAccount(e) {
    const ds = (e && e.currentTarget && e.currentTarget.dataset) || (e && e.target && e.target.dataset) || {}
    const account = ds.account || ds.item
    if (!account) return
    wx.showModal({
      title: '确认删除',
      content: `删除账户"${account.name}"后，相关交易将标记为"已删除账户"，确定要删除吗？`,
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: (res) => {
        if (res.confirm) {
          this.performDeleteAccount(account)
        }
      }
    })
  },

  // 执行删除账户
  performDeleteAccount(account) {
    try {
      const ymKey = `${this.data.currentYear}-${String(this.data.currentMonth + 1).padStart(2, '0')}`
      const currentDate = new Date()
      const currentYmKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      const isCurrentMonth = ymKey === currentYmKey
      
      // 获取当前选择月份的账户数据
      let accounts = wx.getStorageSync(`accounts:${ymKey}`) || wx.getStorageSync('accounts') || this.data.accounts
      accounts = accounts.filter(a => a.id !== account.id)
      
      // 保存到选择的月份
      wx.setStorageSync(`accounts:${ymKey}`, accounts)
      
      // 只有当删除的是当前月份时，才更新最新数据和交易记录
      if (isCurrentMonth) {
        wx.setStorageSync('accounts', accounts)
        wx.setStorageSync('accountChanged', Date.now())
        
        // 处理相关交易的账户信息
        const transactions = wx.getStorageSync('transactions') || []
        let updated = false
        for (let i = 0; i < transactions.length; i++) {
          if (transactions[i].accountId === account.id) {
            transactions[i].accountId = ''
            transactions[i].accountName = '已删除账户'
            updated = true
          }
        }
        if (updated) {
          wx.setStorageSync('transactions', transactions)
        }
      }

      // 记录资产变更历史（包含月份信息）
      this.recordAssetChange(accounts, this.data.investments, ymKey, {
        type: 'account_delete',
        accountId: account.id,
        accountName: account.name,
        isHistoricalEdit: !isCurrentMonth
      })

      wx.showToast({ 
        title: isCurrentMonth ? '删除成功' : `${this.data.currentYear}年${this.data.currentMonth + 1}月账户删除成功`, 
        icon: 'success' 
      })
      
      this.loadData(this.data.currentYear, this.data.currentMonth)
    } catch (error) {
      console.error('删除账户失败:', error)
      wx.showToast({ title: '删除失败', icon: 'error' })
    }
  },
  
  // 记录资产变更历史
  recordAssetChange(accounts, investments, targetYmKey, changeInfo) {
    try {
      const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0) + 
                         investments.reduce((sum, inv) => sum + (inv.amount || 0), 0)
      
      const assetHistory = wx.getStorageSync('assetHistory') || []
      const timestamp = new Date().toISOString()
      const ymKey = targetYmKey || `${this.data.currentYear}-${String(this.data.currentMonth + 1).padStart(2, '0')}`
      
      // 检查是否已存在该月份的记录，如果存在则更新，否则添加新记录
      const existingIndex = assetHistory.findIndex(h => h.yearMonth === ymKey)
      
      const newRecord = {
        timestamp,
        yearMonth: ymKey,
        totalAssets,
        accountCount: accounts.length,
        investmentCount: investments.length,
        accounts: accounts.map(acc => ({
          id: acc.id,
          name: acc.name,
          balance: acc.balance
        })),
        investments: investments.map(inv => ({
          id: inv.id,
          name: inv.name,
          amount: inv.amount || 0
        })),
        changeInfo: changeInfo || null
      }
      
      if (existingIndex !== -1) {
        // 更新现有记录
        assetHistory[existingIndex] = newRecord
        console.log(`更新资产历史记录: ${ymKey}, 总资产: ${totalAssets}`)
      } else {
        // 添加新记录
        assetHistory.push(newRecord)
        console.log(`新增资产历史记录: ${ymKey}, 总资产: ${totalAssets}`)
      }
      
      // 按时间排序并只保留最近24个月的记录
      assetHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      const recentHistory = assetHistory.slice(-24)
      wx.setStorageSync('assetHistory', recentHistory)
      
      // 同时保存该月份的资产快照
      wx.setStorageSync(`assetSnapshot:${ymKey}`, {
        timestamp,
        accounts,
        investments,
        totalAssets
      })
      
    } catch (error) {
      console.error('记录资产变更历史失败:', error)
    }
  },
  
  // 添加投资（携带当前年月）
  onAddInvestment() {
    const { currentYear, currentMonth } = this.data
    wx.navigateTo({
      url: `/pages/investment-add/investment-add?year=${currentYear}&month=${currentMonth}`
    })
  },
  
  // 编辑账户
  onEditAccount(e) {
    const accountId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/account-manage/account-manage?mode=edit&id=${accountId}`
    })
  },
  
  // 月份选择器相关功能
  showMonthPicker() {
    console.log('显示月份选择器')
    console.log('当前年月:', this.data.currentYear, this.data.currentMonth)
    console.log('年份范围:', this.data.yearRange)
    console.log('起始年份:', this.data.startYear)
    
    this.setData({ 
      showMonthPicker: true, 
      selectedYear: this.data.currentYear, 
      selectedMonth: this.data.currentMonth 
    })
    
    console.log('设置后的状态:', this.data.showMonthPicker)
  },
  
  cancelMonthPicker() {
    console.log('取消月份选择器')
    this.setData({ showMonthPicker: false })
  },
  
  // 确认月份选择
  confirmMonthPicker() {
    console.log('确认月份选择器')
    console.log('选择的年月:', this.data.selectedYear, this.data.selectedMonth)
    
    const year = this.data.selectedYear || this.data.currentYear
    const month = this.data.selectedMonth !== undefined ? this.data.selectedMonth : this.data.currentMonth
    
    console.log('最终年月:', year, month)
    
    // 验证年份范围
    if (year < this.data.startYear || year > new Date().getFullYear() + 1) {
      wx.showToast({
        title: '请选择有效的年份',
        icon: 'none'
      })
      return
    }
    
    // 验证月份范围
    if (month < 0 || month > 11) {
      wx.showToast({
        title: '请选择有效的月份', 
        icon: 'none'
      })
      return
    }
    
    // 计算日期状态
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const selectedDate = new Date(year, month, 1)
    const currentDate = new Date(currentYear, currentMonth, 1)
    
    let dateStatus = ''
    if (selectedDate.getTime() === currentDate.getTime()) {
      dateStatus = '当前月份'
    } else if (selectedDate < currentDate) {
      const diffMonths = (currentYear - year) * 12 + (currentMonth - month)
      dateStatus = `${diffMonths}个月前`
    } else {
      const diffMonths = (year - currentYear) * 12 + (month - currentMonth)
      dateStatus = `${diffMonths}个月后`
    }
    
    // 更新当前选择的年月和状态
    this.setData({ 
      showMonthPicker: false,
      currentYear: year,
      currentMonth: month,
      dateStatus: dateStatus
    })
    
    // 重新加载对应月份的数据
    this.loadData(year, month)
    
    wx.showToast({
      title: `已切换到${year}年${month + 1}月 (${dateStatus})`,
      icon: 'success',
      duration: 2000
    })
  },
  
  onMonthPickerChange(e) {
    const [yearIndex, monthIndex] = e.detail.value
    const year = this.data.startYear + yearIndex
    const month = monthIndex
    
    // 验证选择的年月是否有效
    if (year >= this.data.startYear && year <= new Date().getFullYear() + 1 && 
        month >= 0 && month <= 11) {
      this.setData({ 
        selectedYear: year,
        selectedMonth: month
      })
    }
  },

  // 生成测试数据
  generateTestData() {
    try {
      // 检查是否已有测试数据
      if (wx.getStorageSync('testDataGenerated')) {
        return
      }
      
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      
      // 基础账户数据 - 本地化视觉优化
      const baseAccounts = [
        {
          id: 'cash-1',
          name: '现金',
          type: 'cash',
          balance: 100000,
          icon: '💴' // 一沓现金的本地化表达
        },
        {
          id: 'bank-1',
          name: '招商银行',
          type: 'bank',
          balance: 500000,
          icon: '🏦' // 招商银行专用图标
        },
        {
          id: 'wallet-1',
          name: '支付宝',
          type: 'wallet',
          balance: 50000,
          icon: '🟦' // 支付宝蓝色标识
        }
      ]
      
      // 基础投资数据 - 理财主题优化
      const baseInvestments = [
        {
          id: 'fund-1',
          name: '余额宝',
          type: 'fund',
          amount: 200000,
          profit: 1500,
          profitRate: '0.75', // 确保收益率为字符串格式，精确到小数点后两位
          icon: '💎'
        },
        {
          id: 'stock-1',
          name: '腾讯控股',
          type: 'stock',
          amount: 300000,
          profit: 4500,
          profitRate: '1.50', // 确保收益率为字符串格式，精确到小数点后两位
          icon: '📊'
        }
      ]
      
      // 生成最近24个月的数据
      for (let i = 23; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1)
        const year = date.getFullYear()
        const month = date.getMonth()
        const ymKey = `${year}-${String(month + 1).padStart(2, '0')}`
        
        // 基于“最新月”复制作为基础（无随机）
        const latestAccounts = wx.getStorageSync('accounts') || baseAccounts
        const latestInvestments = wx.getStorageSync('investments') || baseInvestments
        const accounts = JSON.parse(JSON.stringify(latestAccounts))
        const investments = JSON.parse(JSON.stringify(latestInvestments))
        
        // 保存月份数据
        wx.setStorageSync(`accounts:${ymKey}`, accounts)
        wx.setStorageSync(`investments:${ymKey}`, investments)
        
        // 记录资产变更历史
        this.recordAssetChange(accounts, investments, ymKey, {
          type: 'test_data',
          isHistorical: i > 0
        })
      }
      
      // 标记测试数据已生成
      wx.setStorageSync('testDataGenerated', true)
      console.log('测试数据生成完成')
      
    } catch (error) {
      console.error('生成测试数据失败:', error)
    }
  },

  // 历史迁移：用最新月复制生成近24个月基础数据（仅补空缺）
  runHistoryMigration() {
    try {
      if (wx.getStorageSync('historyMigrated')) {
        wx.showToast({ title: '已完成迁移', icon: 'none' })
        return
      }
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      const latestAccounts = wx.getStorageSync('accounts') || JSON.parse(JSON.stringify(this.data.accounts))
      const latestInvestments = wx.getStorageSync('investments') || JSON.parse(JSON.stringify(this.data.investments))
      for (let i = 23; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1)
        const year = date.getFullYear()
        const month = date.getMonth()
        const ymKey = `${year}-${String(month + 1).padStart(2, '0')}`
        if (!wx.getStorageSync(`accounts:${ymKey}`) || !wx.getStorageSync(`investments:${ymKey}`)) {
          const accounts = JSON.parse(JSON.stringify(latestAccounts))
          const investments = JSON.parse(JSON.stringify(latestInvestments))
          wx.setStorageSync(`accounts:${ymKey}`, accounts)
          wx.setStorageSync(`investments:${ymKey}`, investments)
          this.recordAssetChange(accounts, investments, ymKey, { type: 'history_migration', from: 'latest' })
        }
      }
      wx.setStorageSync('historyMigrated', true)
      wx.showToast({ title: '历史迁移完成', icon: 'success' })
      this.loadData(this.data.currentYear, this.data.currentMonth)
    } catch (error) {
      console.error('历史迁移失败:', error)
      wx.showToast({ title: '迁移失败', icon: 'error' })
    }
  },

  /**
   * 生成完整测试资产数据
   */
  generateCompleteTestData() {
    try {
      const result = testAssets.saveTestData()
      if (result.success) {
        // 重新加载当前数据
        this.loadData(this.data.currentYear, this.data.currentMonth)
        wx.showToast({
          title: '测试数据生成成功',
          icon: 'success',
          duration: 2000
        })
      } else {
        wx.showToast({
          title: '生成失败: ' + result.error,
          icon: 'error',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('生成完整测试数据失败:', error)
      wx.showToast({
        title: '生成数据失败',
        icon: 'error',
        duration: 2000
      })
    }
  },

  /**
   * 优化的资产一致性校验
   */
  async checkAssetConsistency() {
    try {
      wx.showLoading({ title: '校验中...' })
      
      // 获取当前资产数据（按当前选择的年月绑定）
      const ymKey = `${this.data.currentYear}-${String(this.data.currentMonth + 1).padStart(2, '0')}`
      let accounts = wx.getStorageSync(`accounts:${ymKey}`)
      let investments = wx.getStorageSync(`investments:${ymKey}`)
      if (!accounts) { accounts = wx.getStorageSync('accounts') || [] }
      if (!investments) { investments = wx.getStorageSync('investments') || [] }
      
      // 计算账户余额总和
      const totalAccountBalance = accounts.reduce((sum, account) => {
        return sum + (account.balance || 0)
      }, 0)
      
      // 计算投资理财总和
      const totalInvestmentValue = investments.reduce((sum, investment) => {
        return sum + (investment.currentValue || investment.amount || 0)
      }, 0)
      
      // 计算资产总额
      const calculatedTotalAssets = totalAccountBalance + totalInvestmentValue
      const currentTotalAssets = this.data.totalAssets
      
      // 检查一致性
      const isConsistent = Math.abs(calculatedTotalAssets - currentTotalAssets) < 100 // 允许1元误差
      
      wx.hideLoading()
      
      const message = `资产一致性校验结果：
账户余额总计：¥${(totalAccountBalance / 100).toFixed(2)}
投资理财总计：¥${(totalInvestmentValue / 100).toFixed(2)}
计算总资产：¥${(calculatedTotalAssets / 100).toFixed(2)}
当前显示：¥${(currentTotalAssets / 100).toFixed(2)}
校验结果：${isConsistent ? '✅ 一致' : '❌ 不一致'}`
      
      wx.showModal({
        title: '资产一致性校验',
        content: message,
        showCancel: isConsistent ? false : true,
        cancelText: '忽略',
        confirmText: isConsistent ? '确定' : '修复',
        success: (res) => {
          if (res.confirm && !isConsistent) {
            // 修复不一致的数据
            this.fixAssetConsistency(calculatedTotalAssets)
          }
        }
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('资产一致性校验失败:', error)
      wx.showToast({
        title: '校验失败',
        icon: 'error',
        duration: 2000
      })
    }
  },

  /**
   * 修复资产一致性
   */
  fixAssetConsistency(correctTotal) {
    try {
      // 以当前选择的年月为准，重新计算并修复存储
      const ymKey = `${this.data.currentYear}-${String(this.data.currentMonth + 1).padStart(2, '0')}`
      const accounts = wx.getStorageSync(`accounts:${ymKey}`) || []
      const investments = wx.getStorageSync(`investments:${ymKey}`) || []
      const accountsTotal = accounts.reduce((sum, a) => sum + (a.balance || 0), 0)
      const investmentsTotal = investments.reduce((sum, i) => sum + (i.currentValue || i.amount || 0), 0)
      const total = accountsTotal + investmentsTotal

      this.setData({ 
        totalAssets: total,
        totalAssetsDisplay: (total / 100).toFixed(2)
      })

      // 同步更新月度汇总存储
      wx.setStorageSync('totalAssets', total)
      wx.setStorageSync(`reports:assets:${ymKey}`, {
        totalAssets: total,
        accountsTotal,
        investmentsTotal,
        timestamp: new Date().toISOString(),
        yearMonth: ymKey,
        accountCount: accounts.length,
        investmentCount: investments.length
      })

      wx.showToast({
        title: '资产数据已修复',
        icon: 'success',
        duration: 2000
      })
      
    } catch (error) {
      console.error('修复资产一致性失败:', error)
      wx.showToast({
        title: '修复失败',
        icon: 'error',
        duration: 2000
      })
    }
  }
})