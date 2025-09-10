// pages/conflict-resolution/conflict-resolution.js
const syncService = require('../../services/sync');
const conflictService = require('../../services/conflict');
const { getAvatarUrl } = require('../../utils/defaultAvatar');

Page({
  data: {
    conflicts: [],
    loading: true,
    pendingCount: 0,
    showBatchDialog: false,
    batchStrategy: 'last_write_wins',
    showResultDialog: false,
    resultDialog: {
      title: '',
      message: ''
    }
  },

  onLoad(options) {
    this.loadConflicts();
    this.setupSyncEventListeners();
  },

  onShow() {
    // 页面显示时刷新冲突列表
    this.loadConflicts();
  },

  onUnload() {
    // 清理事件监听
    this.cleanupEventListeners();
  },

  /**
   * 加载冲突列表
   */
  async loadConflicts() {
    try {
      this.setData({ loading: true });

      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo) {
        wx.showToast({
          title: '请先登录',
          icon: 'error'
        });
        return;
      }

      const conflicts = await syncService.getPendingConflicts(userInfo.userId);
      const processedConflicts = await this.processConflicts(conflicts);

      const pendingCount = processedConflicts.filter(c => c.status === 'pending').length;

      this.setData({
        conflicts: processedConflicts,
        pendingCount: pendingCount,
        loading: false
      });

    } catch (error) {
      console.error('加载冲突列表失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  /**
   * 处理冲突数据，添加UI需要的字段
   */
  async processConflicts(conflicts) {
    const processed = [];

    for (const conflict of conflicts) {
      try {
        // 获取用户信息
        const involvedUsers = await this.getUsersInfo(conflict.involvedUsers);
        
        // 获取版本数据
        const versions = await this.getVersionsData(conflict);

        const processedConflict = {
          ...conflict,
          involvedUsers: involvedUsers,
          version1: versions.version1,
          version2: versions.version2,
          expanded: false,
          selectedStrategy: '',
          selectedVersion: '',
          resolving: false,
          createdAt: this.formatTime(conflict.createdAt),
          resolvedAt: conflict.resolvedAt ? this.formatTime(conflict.resolvedAt) : null
        };

        processed.push(processedConflict);
      } catch (error) {
        console.error('处理冲突数据失败:', error);
        // 添加基本信息，避免页面崩溃
        processed.push({
          ...conflict,
          involvedUsers: [],
          version1: { author: '未知', time: '', preview: '数据加载失败' },
          version2: { author: '未知', time: '', preview: '数据加载失败' },
          expanded: false,
          selectedStrategy: '',
          selectedVersion: '',
          resolving: false,
          createdAt: this.formatTime(conflict.createdAt),
          resolvedAt: conflict.resolvedAt ? this.formatTime(conflict.resolvedAt) : null
        });
      }
    }

    return processed;
  },

  /**
   * 获取用户信息
   */
  async getUsersInfo(userIds) {
    try {
      // 这里应该调用用户服务获取用户信息
      // 暂时返回模拟数据
      return userIds.map(userId => ({
        userId: userId,
        nickname: `用户${userId.substr(-4)}`,
        avatar: getAvatarUrl('/images/default-avatar.png'),
        isOnline: Math.random() > 0.5
      }));
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return userIds.map(userId => ({
        userId: userId,
        nickname: '未知用户',
        avatar: getAvatarUrl('/images/default-avatar.png'),
        isOnline: false
      }));
    }
  },

  /**
   * 获取版本数据
   */
  async getVersionsData(conflict) {
    try {
      // 这里应该从版本服务获取具体的版本数据
      // 暂时返回模拟数据
      return {
        version1: {
          author: '张三',
          time: '2024-01-15 14:30',
          preview: '修改了账户余额为 ¥5,000.00'
        },
        version2: {
          author: '李四',
          time: '2024-01-15 14:32',
          preview: '修改了账户余额为 ¥4,800.00'
        }
      };
    } catch (error) {
      console.error('获取版本数据失败:', error);
      return {
        version1: { author: '未知', time: '', preview: '数据加载失败' },
        version2: { author: '未知', time: '', preview: '数据加载失败' }
      };
    }
  },

  /**
   * 切换冲突详情展开/收起
   */
  toggleConflictDetail(e) {
    const index = e.currentTarget.dataset.index;
    const conflicts = this.data.conflicts;
    conflicts[index].expanded = !conflicts[index].expanded;
    
    this.setData({
      conflicts: conflicts
    });
  },

  /**
   * 解决策略选择变化
   */
  onStrategyChange(e) {
    const conflictId = e.currentTarget.dataset.conflictId;
    const strategy = e.detail.value;
    
    const conflicts = this.data.conflicts;
    const conflict = conflicts.find(c => c.conflictId === conflictId);
    if (conflict) {
      conflict.selectedStrategy = strategy;
      // 如果不是手动选择，清空版本选择
      if (strategy !== 'manual') {
        conflict.selectedVersion = '';
      }
    }
    
    this.setData({
      conflicts: conflicts
    });
  },

  /**
   * 版本选择变化
   */
  onVersionChange(e) {
    const conflictId = e.currentTarget.dataset.conflictId;
    const version = e.detail.value;
    
    const conflicts = this.data.conflicts;
    const conflict = conflicts.find(c => c.conflictId === conflictId);
    if (conflict) {
      conflict.selectedVersion = version;
    }
    
    this.setData({
      conflicts: conflicts
    });
  },

  /**
   * 解决冲突
   */
  async resolveConflict(e) {
    const conflictId = e.currentTarget.dataset.conflictId;
    const conflicts = this.data.conflicts;
    const conflict = conflicts.find(c => c.conflictId === conflictId);
    
    if (!conflict || !conflict.selectedStrategy) {
      wx.showToast({
        title: '请选择解决策略',
        icon: 'error'
      });
      return;
    }

    if (conflict.selectedStrategy === 'manual' && !conflict.selectedVersion) {
      wx.showToast({
        title: '请选择要保留的版本',
        icon: 'error'
      });
      return;
    }

    try {
      // 设置解决中状态
      conflict.resolving = true;
      this.setData({ conflicts: conflicts });

      // 准备解决参数
      const resolution = {};
      if (conflict.selectedStrategy === 'manual') {
        resolution.selectedData = conflict.selectedVersion === 'version1' 
          ? conflict.version1.data 
          : conflict.version2.data;
        resolution.resolvedBy = wx.getStorageSync('userInfo').userId;
      }

      // 调用解决服务
      const result = await syncService.resolveConflictAndSync(
        conflictId, 
        conflict.selectedStrategy, 
        resolution
      );

      if (result.success) {
        // 更新冲突状态
        conflict.status = 'resolved';
        conflict.resolving = false;
        conflict.resolutionStrategy = conflict.selectedStrategy;
        conflict.resolutionMessage = result.resolveResult.message;
        conflict.resolvedAt = this.formatTime(new Date());

        // 更新待解决数量
        const pendingCount = conflicts.filter(c => c.status === 'pending').length;
        
        this.setData({
          conflicts: conflicts,
          pendingCount: pendingCount
        });

        this.showResultDialog('解决成功', '冲突已成功解决');
      } else {
        throw new Error(result.message || '解决失败');
      }

    } catch (error) {
      console.error('解决冲突失败:', error);
      conflict.resolving = false;
      this.setData({ conflicts: conflicts });
      
      this.showResultDialog('解决失败', error.message || '解决冲突时发生错误');
    }
  },

  /**
   * 忽略冲突
   */
  async ignoreConflict(e) {
    const conflictId = e.currentTarget.dataset.conflictId;
    
    try {
      wx.showModal({
        title: '确认忽略',
        content: '忽略后此冲突将不再显示，但数据冲突仍然存在。确定要忽略吗？',
        success: async (res) => {
          if (res.confirm) {
            // 这里可以调用忽略冲突的API
            // 暂时只是从列表中移除
            const conflicts = this.data.conflicts.filter(c => c.conflictId !== conflictId);
            const pendingCount = conflicts.filter(c => c.status === 'pending').length;
            
            this.setData({
              conflicts: conflicts,
              pendingCount: pendingCount
            });

            wx.showToast({
              title: '已忽略',
              icon: 'success'
            });
          }
        }
      });
    } catch (error) {
      console.error('忽略冲突失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    }
  },

  /**
   * 刷新冲突列表
   */
  refreshConflicts() {
    this.loadConflicts();
  },

  /**
   * 显示批量解决对话框
   */
  showBatchResolveDialog() {
    this.setData({
      showBatchDialog: true,
      batchStrategy: 'last_write_wins'
    });
  },

  /**
   * 批量策略选择变化
   */
  onBatchStrategyChange(e) {
    this.setData({
      batchStrategy: e.detail.value
    });
  },

  /**
   * 确认批量解决
   */
  async confirmBatchResolve() {
    try {
      this.setData({ showBatchDialog: false });

      const pendingConflicts = this.data.conflicts.filter(c => c.status === 'pending');
      
      wx.showLoading({
        title: '批量解决中...'
      });

      let successCount = 0;
      let failCount = 0;

      for (const conflict of pendingConflicts) {
        try {
          const result = await syncService.resolveConflictAndSync(
            conflict.conflictId,
            this.data.batchStrategy,
            {}
          );

          if (result.success) {
            conflict.status = 'resolved';
            conflict.resolutionStrategy = this.data.batchStrategy;
            conflict.resolutionMessage = result.resolveResult.message;
            conflict.resolvedAt = this.formatTime(new Date());
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`解决冲突 ${conflict.conflictId} 失败:`, error);
          failCount++;
        }
      }

      wx.hideLoading();

      // 更新数据
      const pendingCount = this.data.conflicts.filter(c => c.status === 'pending').length;
      this.setData({
        conflicts: this.data.conflicts,
        pendingCount: pendingCount
      });

      this.showResultDialog(
        '批量解决完成',
        `成功解决 ${successCount} 个冲突${failCount > 0 ? `，失败 ${failCount} 个` : ''}`
      );

    } catch (error) {
      console.error('批量解决失败:', error);
      wx.hideLoading();
      this.showResultDialog('批量解决失败', error.message || '批量解决时发生错误');
    }
  },

  /**
   * 取消批量解决
   */
  cancelBatchResolve() {
    this.setData({
      showBatchDialog: false
    });
  },

  /**
   * 显示结果对话框
   */
  showResultDialog(title, message) {
    this.setData({
      showResultDialog: true,
      resultDialog: {
        title: title,
        message: message
      }
    });
  },

  /**
   * 关闭结果对话框
   */
  closeResultDialog() {
    this.setData({
      showResultDialog: false
    });
  },

  /**
   * 设置同步事件监听
   */
  setupSyncEventListeners() {
    // 监听冲突检测事件
    this.onSyncEvent = (eventType, eventData) => {
      switch (eventType) {
        case 'conflict_detected':
          this.handleConflictDetected(eventData);
          break;
        case 'conflict_resolved':
          this.handleConflictResolved(eventData);
          break;
      }
    };
  },

  /**
   * 处理冲突检测事件
   */
  handleConflictDetected(eventData) {
    // 刷新冲突列表
    this.loadConflicts();
    
    wx.showToast({
      title: '检测到新冲突',
      icon: 'none'
    });
  },

  /**
   * 处理冲突解决事件
   */
  handleConflictResolved(eventData) {
    // 更新对应的冲突状态
    const conflicts = this.data.conflicts;
    const conflict = conflicts.find(c => c.conflictId === eventData.conflictId);
    
    if (conflict) {
      conflict.status = 'resolved';
      conflict.resolutionStrategy = eventData.strategy;
      conflict.resolutionMessage = eventData.resolveResult.message;
      conflict.resolvedAt = this.formatTime(new Date());
      
      const pendingCount = conflicts.filter(c => c.status === 'pending').length;
      
      this.setData({
        conflicts: conflicts,
        pendingCount: pendingCount
      });
    }
  },

  /**
   * 清理事件监听
   */
  cleanupEventListeners() {
    this.onSyncEvent = null;
  },

  /**
   * 格式化时间
   */
  formatTime(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    // 小于1分钟
    if (diff < 60000) {
      return '刚刚';
    }
    
    // 小于1小时
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    }
    
    // 小于1天
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    }
    
    // 大于1天，显示具体时间
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hour = d.getHours().toString().padStart(2, '0');
    const minute = d.getMinutes().toString().padStart(2, '0');
    
    if (year === now.getFullYear()) {
      return `${month}-${day} ${hour}:${minute}`;
    } else {
      return `${year}-${month}-${day} ${hour}:${minute}`;
    }
  }
});