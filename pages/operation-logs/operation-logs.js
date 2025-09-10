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
    filterType: '',
    filterLevel: '',
    filterUser: '',
    filterTime: '',
    
    // 筛选选项
    typeOptions: [],
    levelOptions: [
      { label: '全部级别', value: '' },
      { label: '信息', value: 'info' },
      { label: '警告', value: 'warning' },
      { label: '错误', value: 'error' },
      { label: '严重', value: 'critical' }
    ],
    userOptions: [],
    timeOptions: [
      { label: '全部时间', value: '' },
      { label: '今天', value: 'today' },
      { label: '昨天', value: 'yesterday' },
      { label: '最近7天', value: 'week' },
      { label: '最近30天', value: 'month' }
    ],
    
    // UI状态
    showStats: true,
    statsExpanded: false,
    showMetadata: false,
    fabExpanded: false,
    emptyDescription: '暂无操作记录',
    
    // 成员动态数据
    memberActivities: [],
    
    // 下拉刷新配置
    refreshLoadingProps: {
      theme: 'circular',
      size: '40rpx'
    }
  },

  onLoad(options) {
    this.initPage();
    this.loadInitialData();
  },

  onShow() {
    // 页面显示时刷新数据
    this.refreshData();
  },

  onReachBottom() {
    // 触底加载更多
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMore();
    }
  },

  onPullDownRefresh() {
    // 下拉刷新
    this.onRefresh();
  },

  /**
   * 初始化页面
   */
  initPage() {
    this.initFilterOptions();
    this.setupEventListeners();
  },

  /**
   * 初始化筛选选项
   */
  async initFilterOptions() {
    try {
      // 获取操作类型选项
      const typeOptions = [
        { label: '全部类型', value: '' },
        { label: '数据操作', value: 'data' },
        { label: '账户操作', value: 'account' },
        { label: '交易操作', value: 'transaction' },
        { label: '预算操作', value: 'budget' },
        { label: '分类操作', value: 'category' },
        { label: '家庭管理', value: 'family' },
        { label: '权限管理', value: 'permission' },
        { label: '系统操作', value: 'system' }
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

  /**
   * 获取用户选项
   */
  async getUserOptions() {
    try {
      // 这里应该从家庭服务获取成员列表
      // 暂时返回模拟数据
      return [
        { label: '全部用户', value: '' },
        { label: '我的操作', value: 'me' },
        { label: '张三', value: 'user1' },
        { label: '李四', value: 'user2' },
        { label: '王五', value: 'user3' }
      ];
    } catch (error) {
      console.error('获取用户选项失败:', error);
      return [{ label: '全部用户', value: '' }];
    }
  },

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 监听同步事件，实时更新日志
    this.onSyncEvent = (eventType, eventData) => {
      if (eventType === 'operation_logged') {
        this.refreshData();
      }
    };
  },

  /**
   * 加载初始数据
   */
  async loadInitialData() {
    try {
      this.setData({ loading: true });

      // 并行加载日志和统计数据
      const [logsResult, statsResult] = await Promise.all([
        this.loadLogs(true),
        this.loadStats()
      ]);

      this.setData({
        loading: false,
        logs: logsResult.logs,
        groupedLogs: logsResult.groupedLogs,
        hasMore: logsResult.hasMore,
        stats: statsResult
      });

    } catch (error) {
      console.error('加载初始数据失败:', error);
      this.setData({ 
        loading: false,
        emptyDescription: '加载失败，请重试'
      });
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  /**
   * 加载日志数据
   */
  async loadLogs(reset = false) {
    try {
      const page = reset ? 0 : this.data.currentPage + 1;
      const filters = this.buildFilters();

      const result = await operationLogService.queryLogs(filters, {
        limit: this.data.pageSize,
        offset: page * this.data.pageSize,
        includeDetails: true,
        includeMetadata: this.data.showMetadata
      });

      if (!result.success) {
        throw new Error('查询日志失败');
      }

      // 处理日志数据
      const processedLogs = this.processLogs(result.data);
      
      let allLogs;
      if (reset) {
        allLogs = processedLogs;
      } else {
        allLogs = [...this.data.logs, ...processedLogs];
      }

      // 按日期分组
      const groupedLogs = this.groupLogsByDate(allLogs);

      return {
        logs: allLogs,
        groupedLogs: groupedLogs,
        hasMore: result.hasMore,
        currentPage: page
      };

    } catch (error) {
      console.error('加载日志失败:', error);
      throw error;
    }
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    try {
      const filters = this.buildFilters();
      const result = await operationLogService.getLogStats(filters);

      if (!result.success) {
        throw new Error('获取统计数据失败');
      }

      // 处理级别统计数据
      const levelStats = Object.entries(result.stats.byLevel).map(([level, count]) => ({
        level: level,
        name: this.getLevelName(level),
        count: count,
        theme: this.getLevelTheme(level)
      }));

      // 同时加载成员动态数据
      const memberActivities = await this.loadMemberActivities();

      this.setData({
        memberActivities: memberActivities
      });

      return {
        total: result.stats.total,
        todayCount: this.getTodayCount(result.stats),
        activeUsers: result.stats.byUser.length,
        byLevel: levelStats
      };

    } catch (error) {
      console.error('加载统计数据失败:', error);
      return {
        total: 0,
        todayCount: 0,
        activeUsers: 0,
        byLevel: []
      };
    }
  },

  /**
   * 加载成员动态数据
   */
  async loadMemberActivities() {
    try {
      const familyService = require('../../services/family');
      
      // 获取家庭成员列表
      const membersResult = await familyService.getFamilyMembers();
      if (!membersResult.success) {
        return [];
      }

      const members = membersResult.members || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 为每个成员获取今日操作数量
      const memberActivities = await Promise.all(
        members.map(async (member) => {
          try {
            // 获取该成员今日的操作日志数量
            const logResult = await operationLogService.queryLogs({
              userId: member.id,
              startTime: today.getTime(),
              endTime: Date.now()
            }, {
              limit: 1,
              countOnly: true
            });

            return {
              userId: member.id,
              name: member.nickname || member.name || '未知用户',
              avatar: member.avatar || '/images/default-avatar.svg',
              isOnline: member.isOnline || false,
              todayCount: logResult.success ? (logResult.total || 0) : 0
            };
          } catch (error) {
            console.error(`获取成员 ${member.id} 活动数据失败:`, error);
            return {
              userId: member.id,
              name: member.nickname || member.name || '未知用户',
              avatar: member.avatar || '/images/default-avatar.svg',
              isOnline: false,
              todayCount: 0
            };
          }
        })
      );

      // 按今日操作数量排序
      return memberActivities.sort((a, b) => b.todayCount - a.todayCount);

    } catch (error) {
      console.error('加载成员动态数据失败:', error);
      return [];
    }
  },

  /**
   * 构建查询过滤条件
   */
  buildFilters() {
    const filters = {};

    // 搜索关键词
    if (this.data.searchKeyword) {
      filters.keyword = this.data.searchKeyword;
    }

    // 操作类型筛选
    if (this.data.filterType) {
      // 根据类型前缀筛选
      const typePrefix = this.data.filterType;
      filters.operationType = this.getOperationTypesByPrefix(typePrefix);
    }

    // 级别筛选
    if (this.data.filterLevel) {
      filters.level = this.data.filterLevel;
    }

    // 用户筛选
    if (this.data.filterUser) {
      if (this.data.filterUser === 'me') {
        filters.userId = wx.getStorageSync('userInfo')?.userId;
      } else {
        filters.userId = this.data.filterUser;
      }
    }

    // 时间范围筛选
    if (this.data.filterTime) {
      const timeRange = this.getTimeRange(this.data.filterTime);
      filters.startTime = timeRange.startTime;
      filters.endTime = timeRange.endTime;
    }

    return filters;
  },

  /**
   * 根据类型前缀获取操作类型列表
   */
  getOperationTypesByPrefix(prefix) {
    const typeMap = {
      'data': ['data.create', 'data.update', 'data.delete', 'data.import', 'data.export'],
      'account': ['account.create', 'account.update', 'account.delete', 'account.transfer'],
      'transaction': ['transaction.create', 'transaction.update', 'transaction.delete', 'transaction.batch'],
      'budget': ['budget.create', 'budget.update', 'budget.delete', 'budget.reset'],
      'category': ['category.create', 'category.update', 'category.delete', 'category.sort'],
      'family': ['family.create', 'family.join', 'family.leave', 'family.invite', 'family.remove'],
      'permission': ['permission.grant', 'permission.revoke', 'permission.update'],
      'system': ['system.login', 'system.logout', 'system.sync', 'system.backup', 'system.restore']
    };

    return typeMap[prefix] || [];
  },

  /**
   * 获取时间范围
   */
  getTimeRange(timeFilter) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (timeFilter) {
      case 'today':
        return {
          startTime: today,
          endTime: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
          startTime: yesterday,
          endTime: today
        };
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          startTime: weekAgo,
          endTime: now
        };
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return {
          startTime: monthAgo,
          endTime: now
        };
      default:
        return {};
    }
  },

  /**
   * 处理日志数据
   */
  processLogs(logs) {
    return logs.map((log, index) => {
      const processedLog = {
        ...log,
        timeDisplay: this.formatTimeDisplay(log.createdAt),
        levelTheme: this.getLevelTheme(log.level),
        userName: this.getUserName(log.userId),
        userAvatar: this.getUserAvatar(log.userId),
        userRole: this.getUserRole(log.userId),
        summary: this.generateSummary(log),
        detailItems: this.processDetails(log.details),
        affectedData: this.processAffectedData(log),
        canRevert: this.canRevertOperation(log),
        expanded: false,
        isLast: index === logs.length - 1
      };

      return processedLog;
    });
  },

  /**
   * 按日期分组日志
   */
  groupLogsByDate(logs) {
    const groups = {};
    
    logs.forEach(log => {
      const date = this.formatDate(log.createdAt);
      if (!groups[date]) {
        groups[date] = {
          date: date,
          logs: []
        };
      }
      groups[date].logs.push(log);
    });

    // 转换为数组并按日期排序
    return Object.values(groups).sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
  },

  /**
   * 生成操作摘要
   */
  generateSummary(log) {
    const details = log.details || {};
    
    switch (log.operationType) {
      case 'transaction.create':
        return `添加了一笔 ${details.amount ? '¥' + details.amount : ''} 的${details.type === 'income' ? '收入' : '支出'}记录`;
      case 'account.update':
        return `修改了账户信息${details.name ? '：' + details.name : ''}`;
      case 'budget.create':
        return `创建了预算${details.category ? '：' + details.category : ''}`;
      case 'family.invite':
        return `邀请了新成员${details.invitee ? '：' + details.invitee : ''}`;
      default:
        return log.operationName;
    }
  },

  /**
   * 处理详情数据
   */
  processDetails(details) {
    if (!details || typeof details !== 'object') {
      return [];
    }

    return Object.entries(details).map(([key, value]) => ({
      key: this.formatDetailKey(key),
      value: this.formatDetailValue(value)
    }));
  },

  /**
   * 处理影响数据
   */
  processAffectedData(log) {
    // 根据操作类型推断影响的数据
    const typeMap = {
      'transaction': [{ type: '交易记录', count: 1 }],
      'account': [{ type: '账户信息', count: 1 }],
      'budget': [{ type: '预算设置', count: 1 }],
      'category': [{ type: '分类设置', count: 1 }]
    };

    const prefix = log.operationType.split('.')[0];
    return typeMap[prefix] || [];
  },

  /**
   * 判断操作是否可撤销
   */
  canRevertOperation(log) {
    // 只有部分操作支持撤销，且时间不能太久
    const revertableTypes = ['transaction.create', 'transaction.update', 'account.update'];
    const timeLimit = 24 * 60 * 60 * 1000; // 24小时
    const timeDiff = Date.now() - new Date(log.createdAt).getTime();
    
    return revertableTypes.includes(log.operationType) && timeDiff < timeLimit;
  },

  /**
   * 搜索相关方法
   */
  onSearchChange(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  onSearchSubmit() {
    this.refreshData();
  },

  onSearchClear() {
    this.setData({
      searchKeyword: ''
    });
    this.refreshData();
  },

  /**
   * 筛选相关方法
   */
  onTypeFilterChange(e) {
    this.setData({
      filterType: e.detail.value
    });
    this.refreshData();
  },

  onLevelFilterChange(e) {
    this.setData({
      filterLevel: e.detail.value
    });
    this.refreshData();
  },

  onUserFilterChange(e) {
    this.setData({
      filterUser: e.detail.value
    });
    this.refreshData();
  },

  onTimeFilterChange(e) {
    this.setData({
      filterTime: e.detail.value
    });
    this.refreshData();
  },

  /**
   * 刷新数据
   */
  async refreshData() {
    try {
      const result = await this.loadLogs(true);
      
      this.setData({
        logs: result.logs,
        groupedLogs: result.groupedLogs,
        hasMore: result.hasMore,
        currentPage: result.currentPage
      });

      // 同时刷新统计数据
      const stats = await this.loadStats();
      this.setData({ stats: stats });

    } catch (error) {
      console.error('刷新数据失败:', error);
      wx.showToast({
        title: '刷新失败',
        icon: 'error'
      });
    }
  },

  /**
   * 下拉刷新
   */
  async onRefresh() {
    this.setData({ refreshing: true });
    
    try {
      await this.refreshData();
    } finally {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    }
  },

  /**
   * 加载更多
   */
  async loadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return;

    this.setData({ loadingMore: true });

    try {
      const result = await this.loadLogs(false);
      
      this.setData({
        logs: result.logs,
        groupedLogs: result.groupedLogs,
        hasMore: result.hasMore,
        currentPage: result.currentPage,
        loadingMore: false
      });

    } catch (error) {
      console.error('加载更多失败:', error);
      this.setData({ loadingMore: false });
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  /**
   * 切换日志详情
   */
  toggleLogDetail(e) {
    const logId = e.currentTarget.dataset.logId;
    const logs = this.data.logs;
    const log = logs.find(l => l.id === logId);
    
    if (log) {
      log.expanded = !log.expanded;
      
      // 重新分组
      const groupedLogs = this.groupLogsByDate(logs);
      
      this.setData({
        logs: logs,
        groupedLogs: groupedLogs
      });
    }
  },

  /**
   * 统计相关方法
   */
  toggleStats() {
    this.setData({
      statsExpanded: !this.data.statsExpanded
    });
  },

  /**
   * 浮动按钮相关方法
   */
  toggleFab() {
    this.setData({
      fabExpanded: !this.data.fabExpanded
    });
  },

  /**
   * 导出日志
   */
  async exportLogs(e) {
    const format = e.currentTarget.dataset.format || 'json';
    
    try {
      wx.showLoading({
        title: '导出中...'
      });

      const filters = this.buildFilters();
      const result = await operationLogService.exportLogs(filters, format);

      if (result.success) {
        // 这里可以实现文件保存或分享功能
        wx.showModal({
          title: '导出成功',
          content: `已导出 ${result.count} 条日志记录`,
          showCancel: false
        });
      }

    } catch (error) {
      console.error('导出日志失败:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
      this.setData({ fabExpanded: false });
    }
  },

  /**
   * 清除筛选
   */
  clearFilters() {
    this.setData({
      searchKeyword: '',
      filterType: '',
      filterLevel: '',
      filterUser: '',
      filterTime: '',
      fabExpanded: false
    });
    this.refreshData();
  },

  /**
   * 切换元数据显示
   */
  toggleMetadata() {
    this.setData({
      showMetadata: !this.data.showMetadata,
      fabExpanded: false
    });
    this.refreshData();
  },

  /**
   * 复制日志信息
   */
  copyLogInfo(e) {
    const logId = e.currentTarget.dataset.logId;
    const log = this.data.logs.find(l => l.id === logId);
    
    if (log) {
      const info = `操作：${log.operationName}\n时间：${log.formattedTime}\n用户：${log.userName}\n详情：${JSON.stringify(log.details, null, 2)}`;
      
      wx.setClipboardData({
        data: info,
        success: () => {
          wx.showToast({
            title: '已复制',
            icon: 'success'
          });
        }
      });
    }
  },

  /**
   * 撤销操作
   */
  async revertOperation(e) {
    const logId = e.currentTarget.dataset.logId;
    const log = this.data.logs.find(l => l.id === logId);
    
    if (!log) return;

    wx.showModal({
      title: '确认撤销',
      content: `确定要撤销"${log.operationName}"操作吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '撤销中...'
            });

            // 这里应该调用相应的撤销API
            // await revertService.revertOperation(log);

            wx.hideLoading();
            wx.showToast({
              title: '撤销成功',
              icon: 'success'
            });

            // 刷新数据
            this.refreshData();

          } catch (error) {
            console.error('撤销操作失败:', error);
            wx.hideLoading();
            wx.showToast({
              title: '撤销失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  /**
   * 工具方法
   */
  getLevelName(level) {
    const levelMap = {
      'info': '信息',
      'warning': '警告',
      'error': '错误',
      'critical': '严重'
    };
    return levelMap[level] || level;
  },

  getLevelTheme(level) {
    const themeMap = {
      'info': 'primary',
      'warning': 'warning',
      'error': 'danger',
      'critical': 'danger'
    };
    return themeMap[level] || 'default';
  },

  getUserName(userId) {
    // 这里应该从用户缓存获取用户名
    return `用户${userId?.substr(-4) || '未知'}`;
  },

  getUserAvatar(userId) {
    // 这里应该从用户缓存获取头像
    return getAvatarUrl('/images/default-avatar.png');
  },

  getUserRole(userId) {
    // 这里应该从家庭成员信息获取角色
    return '成员';
  },

  getTodayCount(stats) {
    // 计算今日操作数量
    const today = new Date().toDateString();
    return stats.byUser.reduce((count, user) => count + user.count, 0);
  },

  formatTimeDisplay(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
  },

  formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    if (d >= today) {
      return '今天';
    } else if (d >= yesterday) {
      return '昨天';
    } else {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      
      if (year === now.getFullYear()) {
        return `${month}-${day}`;
      } else {
        return `${year}-${month}-${day}`;
      }
    }
  },

  formatDetailKey(key) {
    const keyMap = {
      'amount': '金额',
      'type': '类型',
      'category': '分类',
      'account': '账户',
      'description': '描述',
      'name': '名称'
    };
    return keyMap[key] || key;
  },

  formatDetailValue(value) {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  },

  onUnload() {
    // 清理事件监听
    this.onSyncEvent = null;
  }
});