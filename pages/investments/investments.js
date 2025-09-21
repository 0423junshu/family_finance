/* eslint-disable */
// pages/investments/investments.js
const privacyScope = require('../../services/privacyScope')
Page({
  data: {
    // 会话级金额可见性（默认隐藏）
    pageMoneyVisible: false,
    totalAssets: 0,
    totalReturn: 0,
    returnRate: 0,
    // 月份选择相关
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    showMonthPicker: false,
    investments: [
      {
        id: '1',
        name: '余额宝',
        type: 'fund',
        amount: 50000,
        cost: 48000,
        return: 2000,
        returnRate: 4.17,
        icon: '💎' // 统一使用钻石图标
      },
      {
        id: '2',
        name: '招商银行理财',
        type: 'bank',
        amount: 100000,
        cost: 100000,
        return: 0,
        returnRate: 3.5,
        icon: '🏦'
      },
      {
        id: '3',
        name: '腾讯控股',
        type: 'stock',
        amount: 80000,
        cost: 85000,
        return: -5000,
        returnRate: -5.88,
        icon: '📊' // 统一使用图表图标
      }
    ],
    currentTab: 0,
    tabs: ['全部'], // 动态生成，默认只有"全部"
    dynamicTypeMap: {}, // 动态类型映射
    originalInvestments: []
  },

  onLoad() {
    // 会话级可见性初始化（接入 privacyScope，使用真实路由，避免路由别名导致的覆盖读取失效）
    try {
      const route = this.route || (getCurrentPages().slice(-1)[0] && getCurrentPages().slice(-1)[0].route) || 'pages/investments/investments';
      const v = privacyScope.getEffectiveVisible(route);
      this.setData({ pageMoneyVisible: !!v });
    } catch (_) {}
    this.initData()
    this.migrateInvestmentIcons() // 迁移投资图标到统一版本
    this.loadInvestments()
  },

  // 小眼睛点击：切换页面级显示/隐藏并持久化
  onEyeToggle() {
    const v = !this.data.pageMoneyVisible;
    this.setData({ pageMoneyVisible: v });
    try {
      const route = this.route || (getCurrentPages().slice(-1)[0] && getCurrentPages().slice(-1)[0].route) || 'pages/investments/investments';
      privacyScope.setPageVisible(route, v);
    } catch (_) {
      // 兜底：仍写入简写键
      privacyScope.setPageVisible('investments', v);
    }
  },
  
  // 初始化默认日期为当月
  initData() {
    const now = new Date()
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth()
    })
  },

  onShow() {
    // 进入页面时再次按真实路由读取“有效显隐”，确保清除覆盖后能回到全局默认
    try {
      const route = this.route || (getCurrentPages().slice(-1)[0] && getCurrentPages().slice(-1)[0].route) || 'pages/investments/investments';
      const v = privacyScope.getEffectiveVisible(route);
      if (typeof v === 'boolean' && v !== this.data.pageMoneyVisible) {
        this.setData({ pageMoneyVisible: v });
      }
    } catch (_) {}
    this.loadInvestments(this.data.currentYear, this.data.currentMonth)
  },

  // 加载投资数据
  loadInvestments(year, month) {
    try {
      // 从本地存储获取投资数据，如果没有则使用默认数据
      let investments = wx.getStorageSync('investments')
      
      if (!investments || investments.length === 0) {
        // 初始化默认投资数据并保存到本地存储
        investments = this.data.investments
        wx.setStorageSync('investments', investments)
      }
      
      // 统一更新图标逻辑
      investments = investments.map(item => ({
        ...item,
        icon: this.getUnifiedInvestmentIcon(item.type, item.name)
      }))
      
      // 根据月份筛选数据
      // 这里可以添加按月份筛选的逻辑，例如从服务端获取特定月份的数据
      const selectedDate = new Date(year, month);
      const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      // 这里可以根据日期筛选投资数据
      // 例如从服务端获取特定月份的数据
      console.log(`加载${formattedDate}的投资数据`);
      
      // 同步资产页面的投资数据
      this.syncWithAssetsPage(investments)
      
      this.setData({ 
        originalInvestments: investments,
        currentYear: year || this.data.currentYear,
        currentMonth: month !== undefined ? month : this.data.currentMonth
      })
      
      // 动态更新标签和类型映射
      this.updateDynamicTabs(investments)
      this.applyFilterAndRecalc()
    } catch (error) {
      console.error('加载投资数据失败:', error)
      this.setData({ originalInvestments: this.data.investments })
      this.applyFilterAndRecalc()
    }
  },

  // 迁移投资图标到统一版本
  migrateInvestmentIcons() {
    try {
      const investmentIconMigrated = wx.getStorageSync('investmentIconMigrated_v2');
      if (investmentIconMigrated) return; // 已经迁移过
      
      console.log('开始迁移投资图标到统一版本...');
      
      // 更新主投资数据
      const investments = wx.getStorageSync('investments') || [];
      let updated = false;
      
      investments.forEach(investment => {
        const newIcon = this.getUnifiedInvestmentIcon(investment.type, investment.name);
        if (investment.icon !== newIcon) {
          console.log(`更新投资图标: ${investment.name} ${investment.icon} → ${newIcon}`);
          investment.icon = newIcon;
          updated = true;
        }
      });
      
      if (updated) {
        wx.setStorageSync('investments', investments);
        console.log('主投资数据图标已更新');
      }
      
      // 更新所有历史月份的投资数据
      const currentDate = new Date();
      for (let i = 0; i < 24; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const ymKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const monthInvestments = wx.getStorageSync(`investments:${ymKey}`);
        if (monthInvestments && Array.isArray(monthInvestments)) {
          let monthUpdated = false;
          monthInvestments.forEach(investment => {
            const newIcon = this.getUnifiedInvestmentIcon(investment.type, investment.name);
            if (investment.icon !== newIcon) {
              investment.icon = newIcon;
              monthUpdated = true;
            }
          });
          
          if (monthUpdated) {
            wx.setStorageSync(`investments:${ymKey}`, monthInvestments);
            console.log(`${ymKey} 月份投资图标已更新`);
          }
        }
      }
      
      // 标记迁移完成
      wx.setStorageSync('investmentIconMigrated_v2', true);
      console.log('投资图标迁移完成');
      
    } catch (error) {
      console.error('投资图标迁移失败:', error);
    }
  },

  // 统一投资图标逻辑（与资产页面保持一致）
  getUnifiedInvestmentIcon(type, name) {
    // 产品级别优先（特殊产品映射）
    if (name && name.includes('余额宝')) return '💎';
    if (name && name.includes('腾讯')) return '📊';
    if (name && name.includes('银行')) return '🏛️';
    if (name && name.includes('理财')) return '💰';
    
    // 类型级别通用映射
    if (type === 'fund') return '📈';
    if (type === 'stock') return '📊';
    if (type === 'bank') return '🏦';
    if (type === 'bond') return '📋';    // 债券
    if (type === 'crypto') return '₿';   // 数字货币
    if (type === 'other') return '🔖';   // 其他
    
    // 默认理财图标
    return '💼';
  },

  // 与资产页面同步投资数据
  syncWithAssetsPage(investments) {
    try {
      // 获取资产页面的投资数据
      const assetsData = wx.getStorageSync('assetsData') || {}
      
      // 更新资产页面的投资数据，确保图标统一
      assetsData.investments = investments.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        amount: item.amount,
        profit: item.return,
        profitRate: item.returnRate,
        icon: this.getUnifiedInvestmentIcon(item.type, item.name) // 使用统一图标逻辑
      }))
      
      // 保存回本地存储
      wx.setStorageSync('assetsData', assetsData)
    } catch (error) {
      console.error('同步资产数据失败:', error)
    }
  },

  // 计算总计
  calculateTotals() {
    const { investments } = this.data
    const totalAssets = investments.reduce((sum, item) => sum + item.amount, 0)
    const totalCost = investments.reduce((sum, item) => sum + item.cost, 0)
    const totalReturn = totalAssets - totalCost
    const returnRate = totalCost > 0 ? (totalReturn / totalCost * 100) : 0

    // 格式化显示数据
    const formattedInvestments = investments.map(item => ({
      ...item,
      amountDisplay: (item.amount / 100).toFixed(2),
      returnDisplay: (item.return / 100).toFixed(2),
      returnRateDisplay: item.returnRate.toFixed(2)
    }))

    this.setData({
      totalAssets,
      totalReturn,
      returnRate,
      totalAssetsDisplay: (totalAssets / 100).toFixed(2),
      totalReturnDisplay: (totalReturn / 100).toFixed(2),
      returnRateDisplay: returnRate.toFixed(2),
      investments: formattedInvestments
    })
  },

  // 切换标签
  onTabChange(e) {
    const ds = (e && e.currentTarget && e.currentTarget.dataset) || (e && e.target && e.target.dataset) || {}
    const currentTab = parseInt(ds.index)
    if (isNaN(currentTab)) return
    this.setData({ currentTab })
    this.applyFilterAndRecalc()
  },

  // 获取过滤后的投资列表
  getFilteredInvestments() {
    const { investments, currentTab } = this.data
    if (currentTab === 0) return investments
    
    // 使用动态类型映射
    const targetType = this.data.dynamicTypeMap[currentTab]
    if (!targetType) return investments
    
    return investments.filter(item => item.type === targetType)
  },

  // 添加投资
  onAddInvestment() {
    wx.navigateTo({
      url: '/pages/investment-add/investment-add'
    })
  },

  // 投资项操作：点击卡片直接进入编辑页
  onInvestmentDetail(e) {
    const ds = (e && e.currentTarget && e.currentTarget.dataset) || (e && e.target && e.target.dataset) || {}
    const id = ds.id || (ds.item && ds.item.id)
    if (!id) return
    wx.navigateTo({
      url: `/pages/investment-add/investment-add?mode=edit&id=${id}`
    })
  },

  // 刷新数据
  onRefresh() {
    wx.showLoading({ title: '刷新中...' })
    
    // 模拟刷新延迟
    setTimeout(() => {
      this.loadInvestments()
      wx.hideLoading()
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      })
    }, 1000)
  },
  
  // 编辑投资
  onEditInvestment(e) {
    const ds = (e && e.currentTarget && e.currentTarget.dataset) || (e && e.target && e.target.dataset) || {}
    const id = ds.id || (ds.item && ds.item.id)
    if (!id) return
    wx.navigateTo({
      url: `/pages/investment-add/investment-add?mode=edit&id=${id}`
    })
  },
  
  // 删除投资
  onDeleteInvestment(e) {
    const ds = (e && e.currentTarget && e.currentTarget.dataset) || (e && e.target && e.target.dataset) || {}
    const id = ds.id || (ds.item && ds.item.id)
    if (!id) return
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该投资记录吗？',
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: (res) => {
        if (res.confirm) {
          try {
            let investments = wx.getStorageSync('investments') || this.data.originalInvestments
            investments = investments.filter(it => String(it.id) !== String(id))
            wx.setStorageSync('investments', investments)
            this.syncWithAssetsPage(investments)
            this.setData({ originalInvestments: investments })
            this.applyFilterAndRecalc()
            wx.showToast({ title: '删除成功', icon: 'success' })
          } catch (error) {
            console.error('删除投资失败:', error)
            wx.showToast({ title: '删除失败', icon: 'error' })
          }
        }
      }
    })
  },
  
  // 依据当前Tab应用筛选并重算合计与展示
  applyFilterAndRecalc() {
    const source = this.data.originalInvestments && this.data.originalInvestments.length > 0
      ? this.data.originalInvestments
      : this.data.investments
    
    const filtered = this.getFilteredList(source)
    
    // 统计
    const totalAssets = filtered.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const totalCost = filtered.reduce((sum, item) => sum + Number(item.cost || 0), 0)
    const totalReturn = totalAssets - totalCost
    const returnRate = totalCost > 0 ? (totalReturn / totalCost * 100) : 0
    
    // 展示格式化
    const formattedInvestments = filtered.map(item => ({
      ...item,
      amountDisplay: (Number(item.amount) / 100).toFixed(2),
      returnDisplay: (Number(item.return) / 100).toFixed(2),
      returnRateDisplay: (Number(item.returnRate) || (Number(item.cost) > 0 ? ((Number(item.amount) - Number(item.cost)) / Number(item.cost) * 100) : 0)).toFixed(2)
    }))
    
    this.setData({
      investments: formattedInvestments,
      totalAssets,
      totalReturn,
      returnRate,
      totalAssetsDisplay: (totalAssets / 100).toFixed(2),
      totalReturnDisplay: (totalReturn / 100).toFixed(2),
      returnRateDisplay: returnRate.toFixed(2)
    })
  },
  
  // 动态更新标签和类型映射
  updateDynamicTabs(investments) {
    // 获取实际持有的投资类型
    const existingTypes = [...new Set(investments.map(item => item.type))].sort()
    
    // 投资类型标签映射
    const typeLabels = {
      'fund': '基金',
      'bank': '理财', 
      'stock': '股票',
      'bond': '债券',
      'crypto': '数字货币',
      'other': '其他'
    }
    
    // 构建动态标签数组（"全部"始终在第一位）
    const dynamicTabs = ['全部']
    const dynamicTypeMap = {}
    
    existingTypes.forEach((type, index) => {
      const label = typeLabels[type] || type
      dynamicTabs.push(label)
      dynamicTypeMap[index + 1] = type // 从1开始，0是"全部"
    })
    
    // 更新数据
    this.setData({
      tabs: dynamicTabs,
      dynamicTypeMap: dynamicTypeMap
    })
    
    // 如果当前选中的标签超出范围，重置为"全部"
    if (this.data.currentTab >= dynamicTabs.length) {
      this.setData({ currentTab: 0 })
    }
    
    console.log('动态标签更新:', { 
      tabs: dynamicTabs, 
      typeMap: dynamicTypeMap,
      existingTypes 
    })
  },

  // 获取按当前Tab过滤的列表（基于传入源数据）
  getFilteredList(list) {
    const currentTab = this.data.currentTab
    if (currentTab === 0) return list
    
    // 使用动态类型映射
    const targetType = this.data.dynamicTypeMap[currentTab]
    if (!targetType) return list
    
    return list.filter(item => item.type === targetType)
  },
  
  // 月份选择器相关功能
  showMonthPicker() {
    this.setData({ showMonthPicker: true })
  },
  
  cancelMonthPicker() {
    this.setData({ showMonthPicker: false })
  },
  
  onMonthPickerChange(e) {
    const [yearIndex, monthIndex] = e.detail.value
    const year = 2020 + yearIndex
    const month = monthIndex
    
    this.setData({ 
      showMonthPicker: false,
      currentYear: year,
      currentMonth: month
    })
    
    // 重新加载数据
    this.loadInvestments(year, month)
  }
})