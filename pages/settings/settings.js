// pages/settings/settings.js
const familyService = require('../../services/family');
const syncService = require('../../services/sync');
const dataManager = require('../../services/dataManager');

Page({
  data: {
    // 家庭信息
    familyInfo: {
      name: '',
      code: '',
      memberCount: 0
    },
    
    // 家庭名称编辑状态
    editingFamilyName: false,
    tempFamilyName: '',
    
    // 同步状态
    syncStatus: {
      status: 'unknown', // synced, syncing, error, unknown
      statusText: '检查中...',
      lastSyncTime: null,
      lastSyncText: '从未同步',
      error: ''
    },
    
    // 同步设置
    syncSettings: {
      autoSync: true,
      wifiOnly: true,
      intervalIndex: 1 // 对应 syncIntervalOptions 的索引
    },
    
    // 同步间隔选项
    syncIntervalOptions: [
      { label: '实时同步', value: 0 },
      { label: '5分钟', value: 5 },
      { label: '15分钟', value: 15 },
      { label: '30分钟', value: 30 },
      { label: '1小时', value: 60 }
    ],
    
    // 应用版本
    appVersion: '1.0.0'
  },

  onLoad(options) {
    console.log('设置页面加载');
    
    // 注册数据管理器刷新回调
    dataManager.registerRefreshCallback('settings', (data) => {
      console.log('[SETTINGS] 收到数据刷新通知:', data);
      if (data.type === 'familyNameChange' || data.type === 'syncOperation' || data.type === 'membersUpdate') {
        this.refreshData();
      }
    });
    
    this.initPage();
  },

  // 家庭名称编辑相关方法
  startEditFamilyName() {
    this.setData({
      editingFamilyName: true,
      tempFamilyName: this.data.familyInfo.name || ''
    });
  },

  onFamilyNameInput(e) {
    this.setData({
      tempFamilyName: e.detail.value
    });
  },

  cancelEditFamilyName() {
    this.setData({
      editingFamilyName: false,
      tempFamilyName: ''
    });
  },

  async saveFamilyName() {
    const newName = this.data.tempFamilyName.trim();
    
    if (!newName) {
      wx.showToast({
        title: '请输入家庭名称',
        icon: 'none'
      });
      return;
    }

    if (newName === this.data.familyInfo.name) {
      this.cancelEditFamilyName();
      return;
    }

    try {
      wx.showLoading({ title: '保存中...' });
      
      // 调用家庭服务更新名称
      await familyService.updateFamilyName(newName);
      
      // 更新本地数据
      this.setData({
        'familyInfo.name': newName,
        editingFamilyName: false,
        tempFamilyName: ''
      });

      // 通知数据管理器刷新
      dataManager.notifyRefresh({
        type: 'familyNameChange',
        data: { name: newName }
      });

      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

    } catch (error) {
      console.error('保存家庭名称失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },

  onShow() {
    // 每次显示时刷新数据
    this.refreshData();
  },

  onUnload() {
    // 注销数据管理器刷新回调
    dataManager.unregisterRefreshCallback('settings');
    console.log('[SETTINGS] onUnload - 已注销数据管理器回调');
  },

  async initPage() {
    try {
      // 加载同步状态
      await this.loadSyncStatus();
      
      // 加载同步设置
      await this.loadSyncSettings();
      
    } catch (error) {
      console.error('初始化设置页面失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },



  /**
   * 加载同步状态
   */
  async loadSyncStatus() {
    try {
      const status = await syncService.getSyncStatus();
      
      let statusText = '';
      let lastSyncText = '从未同步';
      
      switch (status.status) {
        case 'synced':
          statusText = '已同步';
          break;
        case 'syncing':
          statusText = '同步中';
          break;
        case 'error':
          statusText = '同步失败';
          break;
        default:
          statusText = '未知状态';
      }
      
      if (status.lastSyncTime) {
        lastSyncText = this.formatSyncTime(status.lastSyncTime);
      }
      
      this.setData({
        syncStatus: {
          status: status.status || 'unknown',
          statusText,
          lastSyncTime: status.lastSyncTime,
          lastSyncText,
          error: status.error || ''
        }
      });
      
    } catch (error) {
      console.error('加载同步状态失败:', error);
      this.setData({
        syncStatus: {
          status: 'error',
          statusText: '获取失败',
          lastSyncTime: null,
          lastSyncText: '从未同步',
          error: '无法获取同步状态'
        }
      });
    }
  },

  /**
   * 加载同步设置
   */
  async loadSyncSettings() {
    try {
      const settings = await syncService.getSyncSettings();
      
      // 找到对应的间隔索引
      let intervalIndex = 1; // 默认5分钟
      const intervalValue = settings.syncInterval || 5;
      const foundIndex = this.data.syncIntervalOptions.findIndex(option => option.value === intervalValue);
      if (foundIndex !== -1) {
        intervalIndex = foundIndex;
      }
      
      this.setData({
        syncSettings: {
          autoSync: settings.autoSync !== false,
          wifiOnly: settings.wifiOnly !== false,
          intervalIndex
        }
      });
      
    } catch (error) {
      console.error('加载同步设置失败:', error);
    }
  },



  /**
   * 格式化同步时间
   */
  formatSyncTime(timestamp) {
    const now = new Date();
    const syncTime = new Date(timestamp);
    const diff = now - syncTime;
    
    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // 1天内
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      const month = syncTime.getMonth() + 1;
      const date = syncTime.getDate();
      const hours = syncTime.getHours();
      const minutes = syncTime.getMinutes();
      return `${month}月${date}日 ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  },

  /**
   * 手动同步
   */
  async manualSync() {
    if (this.data.syncStatus.status === 'syncing') {
      return;
    }
    
    try {
      // 更新状态为同步中
      this.setData({
        'syncStatus.status': 'syncing',
        'syncStatus.statusText': '同步中'
      });
      
      wx.showLoading({ title: '同步中...' });
      
      const result = await syncService.manualSync();
      
      wx.hideLoading();
      
      if (result.success) {
        wx.showToast({
          title: '同步成功',
          icon: 'success'
        });
        
        // 刷新同步状态
        await this.loadSyncStatus();
      } else {
        wx.showToast({
          title: result.message || '同步失败',
          icon: 'error'
        });
        
        this.setData({
          'syncStatus.status': 'error',
          'syncStatus.statusText': '同步失败',
          'syncStatus.error': result.message || '同步失败'
        });
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('手动同步失败:', error);
      
      wx.showToast({
        title: '同步失败',
        icon: 'error'
      });
      
      this.setData({
        'syncStatus.status': 'error',
        'syncStatus.statusText': '同步失败',
        'syncStatus.error': error.message || '网络错误'
      });
    }
  },

  /**
   * 显示同步历史
   */
  showSyncHistory() {
    wx.navigateTo({
      url: '/pages/sync-history/sync-history'
    });
  },

  /**
   * 自动同步开关变化
   */
  async onAutoSyncChange(e) {
    const enabled = e.detail.value;
    
    try {
      await syncService.updateSyncSettings({
        autoSync: enabled
      });
      
      this.setData({
        'syncSettings.autoSync': enabled
      });
      
      wx.showToast({
        title: enabled ? '已启用自动同步' : '已关闭自动同步',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('更新自动同步设置失败:', error);
      wx.showToast({
        title: '设置失败',
        icon: 'error'
      });
    }
  },

  /**
   * Wi-Fi同步开关变化
   */
  async onWifiOnlyChange(e) {
    const enabled = e.detail.value;
    
    try {
      await syncService.updateSyncSettings({
        wifiOnly: enabled
      });
      
      this.setData({
        'syncSettings.wifiOnly': enabled
      });
      
      wx.showToast({
        title: enabled ? '已启用Wi-Fi同步' : '已关闭Wi-Fi限制',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('更新Wi-Fi同步设置失败:', error);
      wx.showToast({
        title: '设置失败',
        icon: 'error'
      });
    }
  },

  /**
   * 同步间隔变化
   */
  async onSyncIntervalChange(e) {
    const index = parseInt(e.detail.value);
    const option = this.data.syncIntervalOptions[index];
    
    if (!option) return;
    
    try {
      await syncService.updateSyncSettings({
        syncInterval: option.value
      });
      
      this.setData({
        'syncSettings.intervalIndex': index
      });
      
      wx.showToast({
        title: `同步间隔已设为${option.label}`,
        icon: 'success'
      });
      
    } catch (error) {
      console.error('更新同步间隔失败:', error);
      wx.showToast({
        title: '设置失败',
        icon: 'error'
      });
    }
  },

  // 页面导航
  onNavigate(e) {
    const url = e.currentTarget.dataset.url
    if (url) {
      wx.navigateTo({
        url: url,
        fail: (error) => {
          console.error('页面跳转失败:', error)
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          })
        }
      })
    }
  },

  /**
   * 数据同步和一致性检查（原刷新数据功能升级）
   */
  async refreshAllData() {
    try {
      wx.showLoading({ title: '数据同步中...' });
      
      // 执行数据一致性检查和同步
      const dataConsistencyService = require('../../services/dataConsistency');
      await dataConsistencyService.performConsistencyCheck();
      
      // 触发全局数据刷新
      await dataManager.refreshSnapshot();
      
      // 刷新本页数据
      await this.refreshData();
      
      wx.hideLoading();
      wx.showToast({
        title: '数据同步完成',
        icon: 'success'
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('数据同步失败:', error);
      wx.showToast({
        title: '同步失败',
        icon: 'error'
      });
    }
  },

  /**
   * 手动数据同步
   */
  async performDataSync() {
    try {
      const dataConsistencyService = require('../../services/dataConsistency');
      await dataConsistencyService.manualSync();
    } catch (error) {
      console.error('手动数据同步失败:', error);
      wx.showToast({
        title: '同步失败',
        icon: 'error'
      });
    }
  },



  /**
   * 确认重置设置
   */
  confirmResetSettings() {
    wx.showModal({
      title: '重置设置',
      content: '将重置所有设置项为默认值，确定要继续吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await syncService.resetSettings();
            
            // 重新加载设置
            await this.loadSyncSettings();
            
            wx.showToast({
              title: '设置已重置',
              icon: 'success'
            });
            
          } catch (error) {
            console.error('重置设置失败:', error);
            wx.showToast({
              title: '重置失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  /**
   * 显示关于信息
   */
  showAbout() {
    wx.showModal({
      title: '关于',
      content: `家庭财务管理小程序
版本：${this.data.appVersion}

一个简单易用的家庭财务管理工具，帮助您更好地管理家庭收支。`,
      showCancel: false
    });
  },

  /**
   * 刷新数据
   */
  async refreshData() {
    try {
      await Promise.all([
        this.loadSyncStatus(),
        this.loadSyncSettings()
      ]);
      
    } catch (error) {
      console.error('刷新数据失败:', error);
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.refreshData().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});