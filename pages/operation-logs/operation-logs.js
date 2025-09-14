// pages/operation-logs/operation-logs.js
const operationLogService = require('../../services/operationLog');

Page({
  data: {
    // 日志数据
    logs: [],
    groupedLogs: [],
    stats: {
      total: 0,
      todayCount: 0,
      activeUsers: 0,
      byLevel: []
    },
    
    // 分页和加载状态
    loading: false,
    loadingMore: false,
    refreshing: false,
    hasMore: true,
    currentPage: 0,
    pageSize: 20,
    
    // 搜索和筛选
    searchKeyword: '',
    activeFilter: 'all',
    filteredLogs: [],
    
    // 简化的筛选标签
    filterTabs: [
      { label: '全部', value: 'all' },
      { label: '今日', value: 'today' },
      { label: '本周', value: 'week' },
      { label: '成功', value: 'success' },
      { label: '错误', value: 'error' }
    ],
    
    // UI状态
    showMetadata: false,
    fabExpanded: false
  },

  onLoad(options) {
    console.log('操作日志页面加载，参数:', options);
    
    // 检查是否需要显示成员动态
    if (options.showMemberActivity === 'true') {
      this.setData({
        showMemberActivity: true,
        activeTab: 'member'
      });
    }
    
    this.initPage();
  },

  onShow() {
    // 幂等校验：若不是带参进入且未手动切到成员动态，则重置为默认视图
    try {
      const pages = getCurrentPages();
      const cur = pages[pages.length - 1];
      const enteredWithMember = !!(cur && cur.options && cur.options.showMemberActivity === 'true');
      if (!enteredWithMember && this.data.activeTab === 'member' && !this._userSwitchedToMember) {
        this.setData({ showMemberActivity: false, activeTab: 'all' });
      }
    } catch (_) {}
    // 每次显示时刷新数据
    this.refreshData();
  },

  onPullDownRefresh() {
    this.refreshData();
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    this.debounceSearch(keyword);
  },

  // 搜索确认
  onSearchConfirm() {
    this.applyFilters();
  },

  // 清除搜索
  onSearchClear() {
    this.setData({ searchKeyword: '' });
    this.applyFilters();
  },

  // 筛选标签切换
  onFilterTabChange(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ activeFilter: filter });
    this.applyFilters();
  },

  // 切换日志详情
  toggleLogDetail(e) {
    const logId = e.currentTarget.dataset.logId;
    const logs = this.data.logs.map(log => {
      if (log.id === logId) {
        return { ...log, expanded: !log.expanded };
      }
      return log;
    });
    this.setData({ logs });
    this.applyFilters();
  },

  // 浮动按钮
  toggleFab() { 
    this.setData({ fabExpanded: !this.data.fabExpanded }); 
  },

  // 复制日志信息
  copyLogInfo(e) {
    const logId = e.currentTarget.dataset.logId;
    const log = this.data.logs.find(l => l.id === logId);
    if (log) {
      const info = `操作：${log.operationName}\n用户：${log.userName}\n时间：${log.time}\n详情：${log.summary || log.details || '无'}`;
      wx.setClipboardData({
        data: info,
        success: () => {
          wx.showToast({ title: '已复制到剪贴板', icon: 'success' });
        }
      });
    }
  },

  // 撤销操作
  revertOperation(e) {
    const logId = e.currentTarget.dataset.logId;
    wx.showModal({
      title: '确认撤销',
      content: '确定要撤销这个操作吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          this.performUndo(logId);
        }
      }
    });
  },

  // 导出日志
  exportLogs() {
    wx.showActionSheet({
      itemList: ['导出为JSON', '导出为CSV', '导出为TXT'],
      success: (res) => {
        const formats = ['json', 'csv', 'txt'];
        const format = formats[res.tapIndex];
        this.performExport(format);
      }
    });
  },

  // 清除筛选
  clearFilters() {
    this.setData({
      searchKeyword: '',
      activeFilter: 'all'
    });
    this.applyFilters();
  },

  onReachBottom() {
    this.loadMore();
  },

  // 防抖搜索
  debounceSearch: null,

  // 应用筛选
  applyFilters() {
    let filtered = [...this.data.logs];
    const { searchKeyword, activeFilter } = this.data;

    // 搜索筛选
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(log => 
        (log.operationName && log.operationName.toLowerCase().includes(keyword)) ||
        (log.userName && log.userName.toLowerCase().includes(keyword)) ||
        (log.summary && log.summary.toLowerCase().includes(keyword)) ||
        (log.details && log.details.toLowerCase().includes(keyword))
      );
    }

    // 标签筛选
    if (activeFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);

      switch (activeFilter) {
        case 'today':
          filtered = filtered.filter(log => {
            const logDate = new Date(log.timestamp || log.time);
            return logDate >= today;
          });
          break;
        case 'week':
          filtered = filtered.filter(log => {
            const logDate = new Date(log.timestamp || log.time);
            return logDate >= weekStart;
          });
          break;
        case 'success':
          filtered = filtered.filter(log => log.level === 'success');
          break;
        case 'error':
          filtered = filtered.filter(log => log.level === 'error');
          break;
      }
    }

    // 按时间排序（最新在前）
    filtered.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.time).getTime();
      const timeB = new Date(b.timestamp || b.time).getTime();
      return timeB - timeA;
    });

    this.setData({ filteredLogs: filtered });
    this.groupLogsByDate(filtered);
  },

  // 按日期分组
  groupLogsByDate(logs) {
    const groups = {};
    const now = new Date();
    
    logs.forEach(log => {
      const logDate = new Date(log.timestamp || log.time);
      const dateKey = this.formatDateKey(logDate);
      const dateLabel = this.formatDateLabel(logDate, now);
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          dateLabel: dateLabel,
          logs: []
        };
      }
      
      // 处理日志显示格式
      const processedLog = {
        ...log,
        timeLabel: this.formatTimeLabel(logDate),
        roleText: this.getRoleText(log.userRole),
        levelText: this.getLevelText(log.level)
      };
      
      groups[dateKey].logs.push(processedLog);
    });

    // 转换为数组并排序
    const groupedLogs = Object.values(groups).sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // 标记最后一个日志项
    groupedLogs.forEach(group => {
      if (group.logs.length > 0) {
        group.logs[group.logs.length - 1].isLast = true;
      }
    });

    this.setData({ groupedLogs });
  },

  // 格式化日期键
  formatDateKey(date) {
    return date.toISOString().split('T')[0];
  },

  // 格式化日期标签
  formatDateLabel(date, now) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const logDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (logDate.getTime() === today.getTime()) {
      return '今天';
    } else if (logDate.getTime() === yesterday.getTime()) {
      return '昨天';
    } else {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    }
  },

  // 格式化时间标签
  formatTimeLabel(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 获取角色文本
  getRoleText(role) {
    const roleMap = {
      owner: '创建者',
      admin: '管理员',
      member: '成员'
    };
    return roleMap[role] || '系统';
  },

  // 获取级别文本
  getLevelText(level) {
    const levelMap = {
      success: '成功',
      error: '错误',
      warning: '警告',
      info: '信息'
    };
    return levelMap[level] || '信息';
  },

  async initPage() {
    try {
      this.setData({ loading: true });
      
      // 初始化筛选选项
      await this.initFilterOptions();
      
      // 加载初始数据
      await this.loadLogs();
      
      // 加载统计数据
      await this.loadStats();
      
    } catch (error) {
      console.error('初始化页面失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  async initFilterOptions() {
    try {
      // 操作类型选项
      const typeOptions = [
        { label: '全部类型', value: '' },
        { label: '用户操作', value: 'user' },
        { label: '数据同步', value: 'sync' },
        { label: '权限管理', value: 'permission' },
        { label: '系统操作', value: 'system' },
        { label: '同步操作', value: 'sync' },
        { label: '导入导出', value: 'import_export' }
      ];

      // 获取用户选项（从家庭成员获取）
      const userOptions = await this.getUserOptions();

      this.setData({
        typeOptions: typeOptions,
        userOptions: userOptions
      });

    } catch (error) {
      console.error('初始化筛选选项失败:', error);
    }
  },

  // 获取现役成员ID列表（供成员动态过滤）
  async getActiveMemberIds() {
    try {
      if (!wx.cloud || !wx.cloud.database) return [];
      const db = wx.cloud.database();
      let familyId = wx.getStorageSync('currentFamilyId');
      if (!familyId) {
        try {
          const app = getApp();
          familyId = (app && app.globalData && app.globalData.familyInfo && app.globalData.familyInfo.id) || '';
        } catch (_) {}
      }
      const where = familyId ? { familyId, status: 'active' } : { status: 'active' };
      let res = { data: [] };
      try {
        res = await db.collection('family_members').where(where).field({ userId: true }).get();
      } catch (err) {
        console.warn('family_members 集合查询失败，可能未创建：', err);
        return [];
      }
      return (res.data || []).map(x => x.userId).filter(Boolean);
    } catch (err) {
      console.warn('getActiveMemberIds 查询失败：', err);
      return [];
    }
  },

  async getUserOptions() {
    try {
      // 云能力与集合容错处理，防止"集合不存在"导致崩溃
      if (!wx.cloud || !wx.cloud.database) {
        console.warn('wx.cloud 未初始化，返回空用户选项');
        return [{ label: '全部用户', value: '' }];
      }
      const db = wx.cloud.database();
      let familyId = wx.getStorageSync('currentFamilyId');
      if (!familyId) {
        // 回退到 familyService 或全局
        try {
          const app = getApp();
          familyId = app?.globalData?.familyInfo?.id || '';
        } catch (_) {}
      }
      const where = familyId ? { familyId } : {};
      let familyMembers = { data: [] };
      try {
        familyMembers = await db.collection('family_members').where(where).get();
      } catch (colErr) {
        console.warn('family_members 集合查询失败，可能未创建：', colErr);
        return [{ label: '全部用户', value: '' }];
      }

      const userOptions = [{ label: '全部用户', value: '' }];
      (familyMembers.data || []).forEach(member => {
        userOptions.push({
          label: member.nickname || member.userId || member._id || '未知成员',
          value: member.userId || member._id || ''
        });
      });

      return userOptions;
    } catch (error) {
      console.error('获取用户选项失败:', error);
      return [{ label: '全部用户', value: '' }];
    }
  },

  async loadLogs(reset = true) {
    try {
      if (reset) {
        this.setData({
          currentPage: 0,
          hasMore: true,
          logs: []
        });
      }

      const params = {
        page: this.data.currentPage,
        pageSize: this.data.pageSize,
        keyword: this.data.searchKeyword,
        type: this.data.filterType,
        userId: this.data.filterUser,
        timeRange: this.data.filterTime,
        sortOrder: this.data.sortOrder,
        showMemberActivity: this.data.showMemberActivity,
        activeTab: this.data.activeTab
      };

      const result = await operationLogService.getLogs(params);
      
      let newLogs = reset ? result.data : [...this.data.logs, ...result.data];
      
      // 当查看成员动态时，基于现役成员列表进行安全过滤，移除已被移除成员的日志
      if (this.data.showMemberActivity || this.data.activeTab === 'member') {
        try {
          const activeIds = await this.getActiveMemberIds();
          if (Array.isArray(activeIds) && activeIds.length) {
            newLogs = newLogs.filter(log => !log.userId || activeIds.includes(log.userId));
          }
        } catch (e) {
          console.warn('获取现役成员ID失败，跳过过滤：', e);
        }
      }
      
      // 数据标准化处理，修复展示不一致问题
      newLogs = this.normalizeLogData(newLogs);
      
      // 按日期分组
      const groupedLogs = this.groupLogsByDate(newLogs);

      this.setData({
        logs: newLogs,
        groupedLogs: groupedLogs,
        hasMore: result.hasMore,
        currentPage: this.data.currentPage + 1
      });

    } catch (error) {
      console.error('加载日志失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  async loadStats() {
    try {
      const stats = await operationLogService.getStats({
        showMemberActivity: this.data.showMemberActivity,
        activeTab: this.data.activeTab
      });
      
      this.setData({ stats });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  /**
   * 数据标准化处理，修复展示不一致问题
   */
  normalizeLogData(logs) {
    return logs.map((log, index) => {
      // 标准化时间显示
      const timestamp = log.timestamp || log.createdAt || Date.now();
      const timeDisplay = this.formatTime(timestamp);
      
      // 标准化操作名称
      const operationName = log.operationName || log.action || log.operation || '未知操作';
      
      // 标准化用户信息
      const userName = log.userName || log.userNickname || log.userId || '系统';
      const userRole = log.userRole || log.role || '';
      
      // 标准化级别信息
      const level = log.level || 'info';
      const levelTheme = this.getLevelTheme(level);
      const levelName = this.getLevelName(level);
      
      // 处理详细信息
      let detailItems = [];
      if (log.details && typeof log.details === 'object') {
        detailItems = Object.keys(log.details).map(key => ({
          key: key,
          value: String(log.details[key] || '')
        }));
      } else if (log.details && typeof log.details === 'string') {
        detailItems = [{ key: '详情', value: log.details }];
      }
      
      // 处理影响数据
      let affectedData = [];
      if (log.affectedData && Array.isArray(log.affectedData)) {
        affectedData = log.affectedData;
      } else if (log.affectedCount) {
        affectedData = [{ type: '数据项', count: log.affectedCount }];
      }
      
      return {
        ...log,
        id: log.id || log._id || `log_${index}_${timestamp}`,
        timestamp,
        timeDisplay,
        operationName,
        userName,
        userRole,
        level,
        levelTheme,
        levelName,
        detailItems,
        affectedData,
        expanded: false, // 默认收起状态
        summary: log.summary || log.description || operationName,
        isLast: index === logs.length - 1
      };
    });
  },

  /**
   * 获取级别主题
   */
  getLevelTheme(level) {
    const themeMap = {
      'info': 'primary',
      'warning': 'warning', 
      'error': 'danger',
      'critical': 'danger'
    };
    return themeMap[level] || 'primary';
  },

  /**
   * 获取级别名称
   */
  getLevelName(level) {
    const nameMap = {
      'info': '信息',
      'warning': '警告',
      'error': '错误', 
      'critical': '严重'
    };
    return nameMap[level] || '信息';
  },

  /**
   * 切换日志详情展开/收起
   */
  toggleLogDetail(e) {
    const logId = e.currentTarget.dataset.logId;
    if (!logId) return;
    
    const logs = this.data.logs.map(log => {
      if (log.id === logId) {
        return { ...log, expanded: !log.expanded };
      }
      return log;
    });
    
    // 重新分组
    const groupedLogs = this.groupLogsByDate(logs);
    
    this.setData({
      logs,
      groupedLogs
    });
  },

  /**
   * 复制日志信息
   */
  copyLogInfo(e) {
    e.stopPropagation();
    const logId = e.currentTarget.dataset.logId;
    const log = this.data.logs.find(l => l.id === logId);
    
    if (!log) return;
    
    const info = [
      `操作: ${log.operationName}`,
      `时间: ${new Date(log.timestamp).toLocaleString()}`,
      `用户: ${log.userName}`,
      `详情: ${log.summary || '无'}`
    ].join('\n');
    
    wx.setClipboardData({
      data: info,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 撤销操作
   */
  revertOperation(e) {
    e.stopPropagation();
    const logId = e.currentTarget.dataset.logId;
    const log = this.data.logs.find(l => l.id === logId);
    
    if (!log) return;
    
    wx.showModal({
      title: '确认撤销',
      content: `确定要撤销操作"${log.operationName}"吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '撤销中...' });
            
            // 调用撤销接口
            await operationLogService.revertOperation(logId);
            
            wx.hideLoading();
            wx.showToast({
              title: '撤销成功',
              icon: 'success'
            });
            
            // 刷新数据
            this.refreshData();
            
          } catch (error) {
            wx.hideLoading();
            console.error('撤销操作失败:', error);
            wx.showToast({
              title: '撤销失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  groupLogsByDate(logs) {
    const groups = {};
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    logs.forEach(log => {
      const logDate = new Date(log.timestamp);
      let dateKey;
      
      if (this.isSameDay(logDate, today)) {
        dateKey = '今天';
      } else if (this.isSameDay(logDate, yesterday)) {
        dateKey = '昨天';
      } else {
        dateKey = this.formatDate(logDate);
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });
    
    // 转换为数组格式并排序
    return Object.keys(groups)
      .sort((a, b) => {
        if (a === '今天') return -1;
        if (b === '今天') return 1;
        if (a === '昨天') return -1;
        if (b === '昨天') return 1;
        return new Date(b) - new Date(a);
      })
      .map(date => ({
        date,
        logs: groups[date]
      }));
  },

  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  async refreshData() {
    try {
      this.setData({ refreshing: true });
      await this.loadLogs(true);
      await this.loadStats();
      wx.stopPullDownRefresh();
    } catch (error) {
      console.error('刷新数据失败:', error);
    } finally {
      this.setData({ refreshing: false });
    }
  },

  async loadMore() {
    if (!this.data.hasMore || this.data.loadingMore) {
      return;
    }

    try {
      this.setData({ loadingMore: true });
      await this.loadLogs(false);
    } catch (error) {
      console.error('加载更多失败:', error);
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  // 搜索功能
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  onSearchConfirm() {
    this.loadLogs(true);
  },

  onSearchClear() {
    this.setData({
      searchKeyword: ''
    });
    this.loadLogs(true);
  },

  // 筛选功能
  toggleFilters() {
    this.setData({
      showFilters: !this.data.showFilters
    });
  },

  onFilterChange(e) {
    const { type, value } = e.currentTarget.dataset;
    this.setData({
      [`filter${type.charAt(0).toUpperCase() + type.slice(1)}`]: value
    });
    this.loadLogs(true);
  },

  onSortChange(e) {
    this.setData({
      sortOrder: e.detail.value
    });
    this.loadLogs(true);
  },

  // 标签页切换
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
    // 记录用户手动切换到成员动态，避免 onShow 复位误伤
    this._userSwitchedToMember = (tab === 'member');
    this.loadLogs(true);
  },

  // 清除筛选
  clearFilters() {
    this.setData({
      searchKeyword: '',
      filterType: '',
      filterUser: '',
      filterTime: '',
      sortOrder: 'desc'
    });
    this.loadLogs(true);
  },

  // 查看日志详情
  onLogTap(e) {
    const { log } = e.currentTarget.dataset;
    wx.showModal({
      title: '操作详情',
      content: `操作: ${log.action}\n时间: ${new Date(log.timestamp).toLocaleString()}\n用户: ${log.userName || log.userId}\n详情: ${log.details || '无'}`,
      showCancel: false
    });
  },

  // 导出日志
  async exportLogs() {
    try {
      wx.showLoading({ title: '导出中...' });
      
      const result = await operationLogService.exportLogs({
        keyword: this.data.searchKeyword,
        type: this.data.filterType,
        userId: this.data.filterUser,
        timeRange: this.data.filterTime
      });

      wx.hideLoading();
      wx.showToast({
        title: '导出成功',
        icon: 'success'
      });

    } catch (error) {
      wx.hideLoading();
      console.error('导出日志失败:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'error'
      });
    }
  },

  // 离开页面时复位，避免状态在页面复用下"粘连"
  onHide() {
    this._userSwitchedToMember = false;
    this.setData({ showMemberActivity: false, activeTab: 'all' });
  },

  onUnload() {
    this._userSwitchedToMember = false;
    this.setData({ showMemberActivity: false, activeTab: 'all' });
  },

  // 清理日志
  async clearLogs() {
    wx.showModal({
      title: '确认清理',
      content: '确定要清理历史日志吗？此操作不可恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '清理中...' });
            
            await operationLogService.clearLogs({
              keepDays: 30 // 保留最近30天
            });

            wx.hideLoading();
            wx.showToast({
              title: '清理成功',
              icon: 'success'
            });

            this.refreshData();

          } catch (error) {
            wx.hideLoading();
            console.error('清理日志失败:', error);
            wx.showToast({
              title: '清理失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  /**
   * 执行撤销操作
   */
  async performUndo(logId) {
    try {
      wx.showLoading({ title: '撤销中...' });
      
      const log = this.data.logs.find(item => item.id === logId);
      if (!log) {
        throw new Error('操作记录不存在');
      }

      // 根据操作类型执行相应的撤销逻辑
      switch (log.action) {
        case 'create_transaction':
          await this.undoCreateTransaction(log);
          break;
        case 'update_transaction':
          await this.undoUpdateTransaction(log);
          break;
        case 'delete_transaction':
          await this.undoDeleteTransaction(log);
          break;
        case 'create_account':
          await this.undoCreateAccount(log);
          break;
        case 'update_account':
          await this.undoUpdateAccount(log);
          break;
        case 'delete_account':
          await this.undoDeleteAccount(log);
          break;
        default:
          throw new Error('该操作不支持撤销');
      }

      // 标记日志为已撤销
      await operationLogService.markAsUndone(logId);
      
      wx.hideLoading();
      wx.showToast({
        title: '撤销成功',
        icon: 'success'
      });

      this.refreshData();

    } catch (error) {
      wx.hideLoading();
      console.error('撤销操作失败:', error);
      wx.showToast({
        title: error.message || '撤销失败',
        icon: 'error'
      });
    }
  },

  /**
   * 撤销创建交易
   */
  async undoCreateTransaction(log) {
    const transactionService = require('../../services/transaction');
    await transactionService.deleteTransaction(log.targetId);
  },

  /**
   * 撤销更新交易
   */
  async undoUpdateTransaction(log) {
    const transactionService = require('../../services/transaction');
    if (log.oldData) {
      await transactionService.updateTransaction(log.targetId, log.oldData);
    }
  },

  /**
   * 撤销删除交易
   */
  async undoDeleteTransaction(log) {
    const transactionService = require('../../services/transaction');
    if (log.oldData) {
      await transactionService.createTransaction(log.oldData);
    }
  },

  /**
   * 撤销创建账户
   */
  async undoCreateAccount(log) {
    const accountService = require('../../services/account');
    await accountService.deleteAccount(log.targetId);
  },

  /**
   * 撤销更新账户
   */
  async undoUpdateAccount(log) {
    const accountService = require('../../services/account');
    if (log.oldData) {
      await accountService.updateAccount(log.targetId, log.oldData);
    }
  },

  /**
   * 撤销删除账户
   */
  async undoDeleteAccount(log) {
    const accountService = require('../../services/account');
    if (log.oldData) {
      await accountService.createAccount(log.oldData);
    }
  },

  /**
   * 执行导出操作
   */
  async performExport(format) {
    try {
      wx.showLoading({ title: '导出中...' });
      
      const logs = this.data.logs;
      let content = '';
      let fileName = `operation_logs_${new Date().toISOString().split('T')[0]}`;

      switch (format) {
        case 'json':
          content = JSON.stringify(logs, null, 2);
          fileName += '.json';
          break;
        case 'csv':
          content = this.convertToCSV(logs);
          fileName += '.csv';
          break;
        case 'txt':
          content = this.convertToTXT(logs);
          fileName += '.txt';
          break;
      }

      // 保存到临时文件
      const fs = wx.getFileSystemManager();
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      
      fs.writeFileSync(filePath, content, 'utf8');
      
      wx.hideLoading();
      
      // 分享文件
      wx.shareFileMessage({
        filePath: filePath,
        fileName: fileName,
        success: () => {
          wx.showToast({
            title: '导出成功',
            icon: 'success'
          });
        },
        fail: (error) => {
          console.error('分享失败:', error);
          wx.showToast({
            title: '分享失败',
            icon: 'error'
          });
        }
      });

    } catch (error) {
      wx.hideLoading();
      console.error('导出失败:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'error'
      });
    }
  },

  /**
   * 转换为CSV格式 - 修复版本
   */
  convertToCSV(logs) {
    const headers = ['时间', '操作类型', '目标类型', '目标ID', '描述', '状态'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.action || '未知操作',
      log.targetType || '未知类型', 
      log.targetId || '',
      (log.description || log.summary || '').replace(/\n/g, ' '),
      log.isUndone ? '已撤销' : '正常'
    ]);
    
    return [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  },

  /**
   * 转换为TXT格式 - 修复版本
   */
  convertToTXT(logs) {
    return logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString();
      const action = log.action || '未知操作';
      const targetType = log.targetType || '未知类型';
      const targetId = log.targetId || '';
      const description = (log.description || log.summary || '').replace(/\n/g, ' ');
      const status = log.isUndone ? '已撤销' : '正常';
      
      return `时间: ${timestamp}\n操作: ${action}\n类型: ${targetType}\nID: ${targetId}\n描述: ${description}\n状态: ${status}\n---\n`;
    }).join('\n');
  }
});