// components/sync-status/sync-status.js
const familyService = require('../../services/family');
const conflictService = require('../../services/conflict');
const { getAvatarUrl } = require('../../utils/defaultAvatar');
const syncService = require('../../services/sync');

Component({
  properties: {
    // 显示配置
    showIndicator: {
      type: Boolean,
      value: true
    },
    showText: {
      type: Boolean,
      value: false
    },
    showMemberActivity: {
      type: Boolean,
      value: true
    },
    showQuickActions: {
      type: Boolean,
      value: false
    },
    
    // 位置配置
    position: {
      type: String,
      value: 'top-right' // top-left, top-right, bottom-left, bottom-right
    },
    
    // 自动隐藏配置
    autoHide: {
      type: Boolean,
      value: true
    },
    hideDelay: {
      type: Number,
      value: 3000
    }
  },

  data: {
    // 同步状态
    syncStatus: 'idle', // idle, syncing, success, error, conflict
    statusClass: 'status-idle',
    statusIcon: 'check-circle',
    statusText: '已同步',
    statusTitle: '同步状态',
    statusSubtitle: '数据已是最新',
    statusColor: '#00a870',
    
    // 详情显示
    showDetails: false,
    
    // 进度信息
    showProgress: false,
    progressPercentage: 0,
    progressTheme: 'success',
    progressText: '同步中...',
    syncedCount: 0,
    totalCount: 0,
    estimatedTime: '--',
    
    // 网络状态
    networkStatus: '良好',
    networkColor: '#00a870',
    networkClass: 'network-good',
    lastSyncTime: '--',
    onlineMembers: 0,
    totalMembers: 0,
    
    // 冲突信息
    conflicts: [],
    conflictCount: 0,
    
    // 操作状态
    syncing: false,
    canSync: true,
    
    // 反馈提示
    successMessage: '',
    errorMessage: '',
    warningMessage: '',
    infoMessage: '',
    successVisible: false,
    errorVisible: false,
    warningVisible: false,
    infoVisible: false,
    
    // 动画效果
    showAnimation: false,
    animationClass: '',
    
    // 成员活动
    memberActivities: [],
    memberActivityExpanded: false,
    
    // 连接状态
    showConnectionBanner: false,
    connectionBannerClass: '',
    connectionIcon: 'wifi',
    connectionMessage: '',
    showRetryButton: false,
    
    // 定时器
    syncTimer: null,
    hideTimer: null,
    activityTimer: null
  },

  lifetimes: {
    attached() {
      this.initComponent();
    },
    
    detached() {
      this.cleanup();
    }
  },

  methods: {
    /**
     * 初始化组件
     */
    initComponent() {
      this.setupEventListeners();
      this.startStatusMonitoring();
      this.loadInitialStatus();
    },

    /**
     * 设置事件监听
     */
    setupEventListeners() {
      // 监听同步事件
      this.onSyncStart = this.handleSyncStart.bind(this);
      this.onSyncProgress = this.handleSyncProgress.bind(this);
      this.onSyncComplete = this.handleSyncComplete.bind(this);
      this.onSyncError = this.handleSyncError.bind(this);
      this.onConflictDetected = this.handleConflictDetected.bind(this);
      this.onNetworkChange = this.handleNetworkChange.bind(this);
      this.onMemberActivity = this.handleMemberActivity.bind(this);

      // 注册事件监听器
      wx.onNetworkStatusChange(this.onNetworkChange);
      
      // 监听全局同步事件
      if (typeof getApp === 'function') {
        const app = getApp();
        if (app.globalData && app.globalData.eventBus) {
          const eventBus = app.globalData.eventBus;
          eventBus.on('sync:start', this.onSyncStart);
          eventBus.on('sync:progress', this.onSyncProgress);
          eventBus.on('sync:complete', this.onSyncComplete);
          eventBus.on('sync:error', this.onSyncError);
          eventBus.on('conflict:detected', this.onConflictDetected);
          eventBus.on('member:activity', this.onMemberActivity);
        }
      }
    },

    /**
     * 开始状态监控
     */
    startStatusMonitoring() {
      // 定期检查同步状态
      this.data.syncTimer = setInterval(() => {
        this.checkSyncStatus();
      }, 5000);

      // 定期更新成员活动
      this.data.activityTimer = setInterval(() => {
        this.updateMemberActivity();
      }, 10000);
    },

    /**
     * 加载初始状态
     */
    async loadInitialStatus() {
      try {
        // 检查用户是否登录
        const app = getApp();
        if (!app.globalData || !app.globalData.userInfo) {
          this.updateSyncStatus({ status: 'offline' });
          return;
        }

        // 获取家庭信息作为同步状态
        const familyResult = await familyService.getFamilyInfo();
        this.updateSyncStatus({ status: (familyResult.success && familyResult.data) ? 'idle' : 'offline' });

        // 获取冲突信息
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo && userInfo._id) {
          const conflicts = await conflictService.getPendingConflicts(userInfo._id);
          this.updateConflicts(conflicts);
        } else {
          this.updateConflicts([]);
        }

        // 获取网络状态
        const networkInfo = await this.getNetworkInfo();
        this.updateNetworkStatus(networkInfo);

        // 获取成员信息
        const memberInfo = await this.getMemberInfo();
        this.updateMemberInfo(memberInfo);

      } catch (error) {
        console.error('加载初始状态失败:', error);
        this.updateSyncStatus({ status: 'error' });
      }
    },

    /**
     * 检查同步状态
     */
    async checkSyncStatus() {
      try {
        // 检查用户是否登录
        const app = getApp();
        if (!app.globalData || !app.globalData.userInfo) {
          this.updateSyncStatus({ status: 'offline' });
          return;
        }

        const familyInfo = await familyService.getFamilyInfo();
        this.updateSyncStatus({ status: familyInfo ? 'idle' : 'offline' });
      } catch (error) {
        console.error('检查同步状态失败:', error);
        this.updateSyncStatus({ status: 'error' });
      }
    },

    /**
     * 更新同步状态
     */
    updateSyncStatus(status) {
      const statusConfig = this.getStatusConfig(status.status);
      
      this.setData({
        syncStatus: status.status,
        statusClass: statusConfig.class,
        statusIcon: statusConfig.icon,
        statusText: statusConfig.text,
        statusTitle: statusConfig.title,
        statusSubtitle: statusConfig.subtitle,
        statusColor: statusConfig.color,
        lastSyncTime: this.formatTime(typeof status.lastSyncTime === 'number' ? status.lastSyncTime : (wx.getStorageSync('lastSyncTime') || 0)),
        canSync: (typeof status.canSync === 'boolean' ? status.canSync : (status.status !== 'offline'))
      });
    },

    /**
     * 获取状态配置
     */
    getStatusConfig(status) {
      const configs = {
        idle: {
          class: 'status-idle',
          icon: 'check-circle',
          text: '已同步',
          title: '同步状态',
          subtitle: '数据已是最新',
          color: '#00a870'
        },
        syncing: {
          class: 'status-syncing',
          icon: 'loading',
          text: '同步中',
          title: '正在同步',
          subtitle: '数据同步进行中',
          color: '#0052d9'
        },
        success: {
          class: 'status-success',
          icon: 'check-circle',
          text: '同步成功',
          title: '同步完成',
          subtitle: '所有数据已同步',
          color: '#00a870'
        },
        error: {
          class: 'status-error',
          icon: 'close-circle',
          text: '同步失败',
          title: '同步错误',
          subtitle: '数据同步遇到问题',
          color: '#e34d59'
        },
        conflict: {
          class: 'status-conflict',
          icon: 'error-circle',
          text: '有冲突',
          title: '数据冲突',
          subtitle: '需要处理数据冲突',
          color: '#ed7b2f'
        },
        offline: {
          class: 'status-offline',
          icon: 'wifi-off',
          text: '离线',
          title: '网络离线',
          subtitle: '无法连接到服务器',
          color: '#999'
        }
      };

      return configs[status] || configs.idle;
    },

    /**
     * 更新冲突信息
     */
    updateConflicts(conflicts) {
      const processedConflicts = conflicts.map(conflict => ({
        ...conflict,
        typeName: this.getConflictTypeName(conflict.type),
        description: this.getConflictDescription(conflict)
      }));

      this.setData({
        conflicts: processedConflicts,
        conflictCount: conflicts.length
      });

      // 如果有冲突，更新状态
      if (conflicts.length > 0 && this.data.syncStatus !== 'syncing') {
        this.updateSyncStatus({ status: 'conflict' });
      }
    },

    /**
     * 更新网络状态
     */
    updateNetworkStatus(networkInfo) {
      const statusConfig = this.getNetworkStatusConfig(networkInfo);
      
      this.setData({
        networkStatus: statusConfig.status,
        networkColor: statusConfig.color,
        networkClass: statusConfig.class
      });

      // 显示连接横幅
      if (networkInfo.isConnected === false) {
        this.showConnectionBanner('offline', 'wifi-off', '网络连接已断开', true);
      } else if (networkInfo.networkType === 'none') {
        this.showConnectionBanner('offline', 'wifi-off', '无网络连接', true);
      } else {
        this.hideConnectionBanner();
      }
    },

    /**
     * 获取网络状态配置
     */
    getNetworkStatusConfig(networkInfo) {
      if (!networkInfo.isConnected) {
        return {
          status: '离线',
          color: '#e34d59',
          class: 'network-offline'
        };
      }

      switch (networkInfo.networkType) {
        case 'wifi':
          return {
            status: '良好 (WiFi)',
            color: '#00a870',
            class: 'network-good'
          };
        case '4g':
        case '5g':
          return {
            status: '良好 (移动网络)',
            color: '#00a870',
            class: 'network-good'
          };
        case '3g':
        case '2g':
          return {
            status: '较慢',
            color: '#ed7b2f',
            class: 'network-slow'
          };
        default:
          return {
            status: '未知',
            color: '#999',
            class: 'network-unknown'
          };
      }
    },

    /**
     * 更新成员信息
     */
    updateMemberInfo(memberInfo) {
      this.setData({
        onlineMembers: memberInfo.onlineCount,
        totalMembers: memberInfo.totalCount
      });
    },

    /**
     * 更新成员活动
     */
    async updateMemberActivity() {
      try {
        // 这里应该从服务获取最新的成员活动
        const activities = await this.getMemberActivities();
        
        this.setData({
          memberActivities: activities.slice(0, 5) // 只显示最近5条
        });
      } catch (error) {
        console.error('更新成员活动失败:', error);
      }
    },

    /**
     * 事件处理方法
     */
    handleSyncStart(data) {
      this.setData({
        syncStatus: 'syncing',
        syncing: true,
        showProgress: true,
        progressPercentage: 0,
        progressText: '开始同步...',
        totalCount: data.totalCount || 0,
        syncedCount: 0
      });

      this.updateSyncStatus({ status: 'syncing' });
      this.showAnimation('sync');
    },

    handleSyncProgress(data) {
      const percentage = Math.round((data.completed / data.total) * 100);
      const estimatedTime = this.calculateEstimatedTime(data);

      this.setData({
        progressPercentage: percentage,
        progressText: `同步中 ${percentage}%`,
        syncedCount: data.completed,
        totalCount: data.total,
        estimatedTime: estimatedTime
      });
    },

    handleSyncComplete(data) {
      this.setData({
        syncStatus: 'success',
        syncing: false,
        showProgress: false,
        progressPercentage: 100
      });

      this.updateSyncStatus({ status: 'success' });
      this.hideAnimation();
      this.showSuccess('数据同步完成');

      // 自动隐藏成功状态
      if (this.data.autoHide) {
        setTimeout(() => {
          this.updateSyncStatus({ status: 'idle' });
        }, this.data.hideDelay);
      }
    },

    handleSyncError(error) {
      this.setData({
        syncStatus: 'error',
        syncing: false,
        showProgress: false
      });

      this.updateSyncStatus({ status: 'error' });
      this.hideAnimation();
      this.showError(`同步失败: ${error.message}`);
    },

    handleConflictDetected(conflicts) {
      this.updateConflicts(conflicts);
      this.showWarning(`检测到 ${conflicts.length} 个数据冲突`);
    },

    handleNetworkChange(res) {
      this.updateNetworkStatus({
        isConnected: res.isConnected,
        networkType: res.networkType
      });
    },

    handleMemberActivity(activity) {
      const activities = [activity, ...this.data.memberActivities].slice(0, 5);
      this.setData({
        memberActivities: activities
      });

      // 显示成员活动提示
      this.showInfo(`${activity.memberName} ${activity.description}`);
    },

    /**
     * 界面交互方法
     */
    onIndicatorTap() {
      this.setData({
        showDetails: !this.data.showDetails
      });
    },

    onDetailsVisibleChange(e) {
      this.setData({
        showDetails: e.detail.visible
      });
    },

    closeDetails() {
      this.setData({
        showDetails: false
      });
    },

    async onManualSync() {
      if (this.data.syncing || !this.data.canSync) return;

      try {
        this.setData({ syncing: true });
        const res = await syncService.forcSync();
        const ts = Date.now();
        wx.setStorageSync('lastSyncTime', ts);
        this.updateSyncStatus({ status: (res && res.success) ? 'success' : 'idle', lastSyncTime: ts });
        this.showSuccess((res && res.success) ? '手动同步完成' : '手动同步已开始');
      } catch (error) {
        console.error('手动同步失败:', error);
        this.showError('手动同步失败');
      } finally {
        this.setData({ syncing: false });
      }
    },

    onSyncSettings() {
      this.triggerEvent('syncSettings');
      this.setData({ showDetails: false });
    },

    onConflictTap(e) {
      const conflict = e.currentTarget.dataset.conflict;
      this.triggerEvent('conflictTap', { conflict });
    },

    onQuickSync() {
      this.onManualSync();
    },

    onQuickConflictResolve() {
      this.triggerEvent('conflictResolve');
    },

    onQuickSettings() {
      this.triggerEvent('syncSettings');
    },

    toggleMemberActivity() {
      this.setData({
        memberActivityExpanded: !this.data.memberActivityExpanded
      });
    },

    onRetryConnection() {
      this.retryConnection();
    },

    /**
     * 反馈提示方法
     */
    showSuccess(message) {
      this.setData({
        successMessage: message,
        successVisible: true
      });

      this.autoHideMessage('success');
    },

    showError(message) {
      this.setData({
        errorMessage: message,
        errorVisible: true
      });

      this.autoHideMessage('error');
    },

    showWarning(message) {
      this.setData({
        warningMessage: message,
        warningVisible: true
      });

      this.autoHideMessage('warning');
    },

    showInfo(message) {
      this.setData({
        infoMessage: message,
        infoVisible: true
      });

      this.autoHideMessage('info');
    },

    autoHideMessage(type) {
      if (this.data.hideTimer) {
        clearTimeout(this.data.hideTimer);
      }

      this.data.hideTimer = setTimeout(() => {
        this.setData({
          [`${type}Visible`]: false
        });

        // 清空消息内容
        setTimeout(() => {
          this.setData({
            [`${type}Message`]: ''
          });
        }, 300);
      }, this.data.hideDelay);
    },

    /**
     * 动画效果方法
     */
    showAnimation(type) {
      this.setData({
        showAnimation: true,
        animationClass: `animation-${type}`
      });
    },

    hideAnimation() {
      this.setData({
        showAnimation: false,
        animationClass: ''
      });
    },

    /**
     * 连接横幅方法
     */
    showConnectionBanner(type, icon, message, showRetry = false) {
      this.setData({
        showConnectionBanner: true,
        connectionBannerClass: `banner-${type}`,
        connectionIcon: icon,
        connectionMessage: message,
        showRetryButton: showRetry
      });
    },

    hideConnectionBanner() {
      this.setData({
        showConnectionBanner: false
      });
    },

    async retryConnection() {
      try {
        this.showInfo('正在重新连接...');
        
        // 重新检查网络状态
        const networkInfo = await this.getNetworkInfo();
        this.updateNetworkStatus(networkInfo);
        
        if (networkInfo.isConnected) {
          this.hideConnectionBanner();
          this.showSuccess('网络连接已恢复');
        }
      } catch (error) {
        console.error('重新连接失败:', error);
        this.showError('重新连接失败');
      }
    },

    /**
     * 工具方法
     */
    async getNetworkInfo() {
      return new Promise((resolve) => {
        wx.getNetworkType({
          success: (res) => {
            resolve({
              isConnected: res.networkType !== 'none',
              networkType: res.networkType
            });
          },
          fail: () => {
            resolve({
              isConnected: false,
              networkType: 'none'
            });
          }
        });
      });
    },

    async getMemberInfo() {
      // 这里应该从家庭服务获取成员信息
      return {
        onlineCount: 2,
        totalCount: 4
      };
    },

    async getMemberActivities() {
      // 这里应该从操作日志服务获取最新活动
      const { generateInitialAvatar } = require('../../utils/defaultAvatar');
      
      return [
        {
          id: '1',
          memberName: '张三',
          avatar: generateInitialAvatar('张三'),
          description: '添加了一笔支出记录',
          timeDisplay: '2分钟前',
          statusClass: 'status-success',
          statusIcon: 'check'
        },
        {
          id: '2',
          memberName: '李四',
          avatar: generateInitialAvatar('李四'),
          description: '修改了预算设置',
          timeDisplay: '5分钟前',
          statusClass: 'status-info',
          statusIcon: 'edit'
        }
      ];
    },

    getConflictTypeName(type) {
      const typeMap = {
        'transaction': '交易记录',
        'account': '账户信息',
        'budget': '预算设置',
        'category': '分类设置'
      };
      return typeMap[type] || type;
    },

    getConflictDescription(conflict) {
      return `${conflict.field || '数据'}存在不同版本`;
    },

    calculateEstimatedTime(data) {
      if (!data.startTime || data.completed === 0) {
        return '--';
      }

      const elapsed = Date.now() - data.startTime;
      const rate = data.completed / elapsed;
      const remaining = (data.total - data.completed) / rate;

      if (remaining < 60000) {
        return '不到1分钟';
      } else if (remaining < 3600000) {
        return `约${Math.ceil(remaining / 60000)}分钟`;
      } else {
        return `约${Math.ceil(remaining / 3600000)}小时`;
      }
    },

    formatTime(timestamp) {
      if (!timestamp) return '--';

      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();

      if (diff < 60000) {
        return '刚刚';
      } else if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`;
      } else if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`;
      } else {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
    },

    /**
     * 清理资源
     */
    cleanup() {
      // 清理定时器
      if (this.data.syncTimer) {
        clearInterval(this.data.syncTimer);
      }
      if (this.data.activityTimer) {
        clearInterval(this.data.activityTimer);
      }
      if (this.data.hideTimer) {
        clearTimeout(this.data.hideTimer);
      }

      // 移除事件监听
      if (typeof getApp === 'function') {
        const app = getApp();
        if (app.globalData && app.globalData.eventBus) {
          const eventBus = app.globalData.eventBus;
          eventBus.off('sync:start', this.onSyncStart);
          eventBus.off('sync:progress', this.onSyncProgress);
          eventBus.off('sync:complete', this.onSyncComplete);
          eventBus.off('sync:error', this.onSyncError);
          eventBus.off('conflict:detected', this.onConflictDetected);
          eventBus.off('member:activity', this.onMemberActivity);
        }
      }
    }
  }
});