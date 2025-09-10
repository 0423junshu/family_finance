// 资产页面数据完整性检查补丁
// 需要添加到 pages/assets/assets.js 中

// 1. 修改 onLoad 函数，在现有代码基础上添加数据完整性检查
/*
onLoad() {
  this.initData()
  this.ensureDataIntegrity() // 新增：数据完整性检查
  this.generateTestData() // 直接生成测试数据
  this.runHistoryMigration()
  this.calculateTotalAssets()
},
*/

// 2. 添加新的数据完整性检查函数
/*
// 新增：确保数据完整性，防止编译后数据清零
ensureDataIntegrity() {
  try {
    // 检查主要数据源
    const accounts = wx.getStorageSync('accounts')
    const investments = wx.getStorageSync('investments')
    
    // 如果主要数据源为空，尝试从最近的月份数据恢复
    if (!accounts || accounts.length === 0) {
      const lastViewedMonth = wx.getStorageSync('lastViewedMonth')
      if (lastViewedMonth) {
        const monthAccounts = wx.getStorageSync(`accounts:${lastViewedMonth}`)
        if (monthAccounts && monthAccounts.length > 0) {
          wx.setStorageSync('accounts', monthAccounts)
          console.log(`数据完整性检查：恢复账户数据 ${monthAccounts.length}个`)
        }
      }
    }
    
    if (!investments || investments.length === 0) {
      const lastViewedMonth = wx.getStorageSync('lastViewedMonth')
      if (lastViewedMonth) {
        const monthInvestments = wx.getStorageSync(`investments:${lastViewedMonth}`)
        if (monthInvestments && monthInvestments.length > 0) {
          wx.setStorageSync('investments', monthInvestments)
          console.log(`数据完整性检查：恢复投资数据 ${monthInvestments.length}个`)
        }
      }
    }
  } catch (error) {
    console.error('数据完整性检查失败:', error)
  }
},
*/

// 3. 优化后的 loadData 函数（简化数据源逻辑）
/*
// 优化：简化数据加载逻辑，修复数据持久化问题
async loadData(year, month) {
  try {
    const targetYear = year || this.data.currentYear
    const targetMonth = month !== undefined ? month : this.data.currentMonth
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
      // 历史月份：使用快照数据
      const assetSnapshot = wx.getStorageSync(`assetSnapshot:${ymKey}`)
      if (assetSnapshot && assetSnapshot.accounts && assetSnapshot.investments) {
        accounts = assetSnapshot.accounts
        investments = assetSnapshot.investments
        console.log(`从资产快照加载${ymKey}的数据`)
      } else {
        // 尝试从月份存储加载
        accounts = wx.getStorageSync(`accounts:${ymKey}`) || []
        investments = wx.getStorageSync(`investments:${ymKey}`) || []
        console.log(`从月份存储加载${ymKey}的数据`)
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
*/