// pages/me/me.js
const app = getApp();
const familyService = require('../../services/family.js');
const collaborationHelper = require('../../utils/collaborationHelper.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {},
    collaborationEnabled: true, // 默认启用协作功能
    isInFamily: false,
    familyInfo: null,
    totalMembers: 0,
    onlineMembers: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('[DEBUG] 页面加载');
    this.loadUserInfo();
    this.initCollaboration();
    
    // 确保初始状态正确
    this.setData({
      collaborationEnabled: true
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    console.log('[DEBUG] 页面显示 - 刷新协作状态');
    
    // 添加缓存检查，避免重复加载
    const now = Date.now()
    const lastLoadTime = this.data.lastLoadTime || 0
    
    // 只有在超过2秒未加载时才重新加载
    if (now - lastLoadTime > 2000) {
      this.refreshCollaborationStatus();
      // 确保数据加载
      this.loadUserInfo();
      this.loadFamilyInfo();
      this.setData({ lastLoadTime: now })
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadUserInfo();
    this.refreshCollaborationStatus();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '家庭财务管理',
      path: '/pages/index/index'
    };
  },

  // ==================== 数据加载方法 ====================

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = app.globalData.userInfo || {};
    this.setData({
      userInfo: userInfo
    });
  },

  /**
   * 初始化协作功能
   */
  async initCollaboration() {
    console.log('[DEBUG] 开始初始化协作功能');
    try {
      // 初始化协作助手
      console.log('[DEBUG] 初始化协作助手');
      await collaborationHelper.initCollaboration(this, {
        enableConflictPrevention: false,
        enableDataLocking: false,
        enableActivityTracking: true
      });
      console.log('[DEBUG] 协作助手初始化完成');

      // 加载家庭信息
      await this.loadFamilyInfo();

      // 确保协作功能启用
      this.setData({
        collaborationEnabled: true
      });

    } catch (error) {
      console.error('[ERROR] 初始化协作功能失败:', error);
      // 即使失败也启用协作功能（显示邀请入口）
      this.setData({
        collaborationEnabled: true,
        isInFamily: false,
        familyInfo: null
      });
    }
    console.log('[DEBUG] 协作功能初始化完成状态:', {
      collaborationEnabled: this.data.collaborationEnabled,
      isInFamily: this.data.isInFamily
    });
  },

  /**
   * 加载家庭信息
   */
  async loadFamilyInfo() {
    console.log('[DEBUG] 开始加载家庭信息');
    try {
      const result = await familyService.getFamilyInfo();
      console.log('[DEBUG] 家庭信息加载结果:', result);
      
      if (result.success && result.family) {
        console.log('[DEBUG] 用户已加入家庭:', result.family);
        // 用户在家庭中
        this.setData({
          collaborationEnabled: true,
          isInFamily: true,
          familyInfo: result.family
        });

        // 加载家庭成员信息
        await this.loadFamilyMembers();

      } else {
        console.log('[DEBUG] 用户未加入家庭');
        // 用户不在家庭中
        this.setData({
          collaborationEnabled: true,
          isInFamily: false,
          familyInfo: null
        });
      }

    } catch (error) {
      console.error('[ERROR] 加载家庭信息失败:', error);
      // 即使失败也启用协作功能（显示邀请入口）
      this.setData({
        collaborationEnabled: true,
        isInFamily: false,
        familyInfo: null
      });
    }
    
    console.log('[DEBUG] 当前协作状态:', {
      collaborationEnabled: this.data.collaborationEnabled,
      isInFamily: this.data.isInFamily
    });
  },

  /**
   * 加载家庭成员信息
   */
  async loadFamilyMembers() {
    try {
      const result = await familyService.getFamilyMembers();
      
      if (result.success) {
        const members = result.members || [];
        const onlineMembers = members.filter(m => m.isOnline);

        this.setData({
          totalMembers: members.length,
          onlineMembers: onlineMembers.length,
          recentActivities: await this.getRecentActivitiesCount()
        });
      }

    } catch (error) {
      console.error('加载家庭成员失败:', error);
    }
  },

  /**
   * 刷新协作状态
   */
  async refreshCollaborationStatus() {
    console.log('[DEBUG] 刷新协作状态');
    if (this.data.collaborationEnabled) {
      console.log('[DEBUG] 协作功能已启用，加载家庭信息');
      await this.loadFamilyInfo();
    } else {
      console.log('[DEBUG] 协作功能未启用，强制启用');
      this.setData({
        collaborationEnabled: true
      });
      await this.loadFamilyInfo();
    }
  },

  // ==================== 协作功能方法 ====================

  /**
   * 管理家庭（点击协作卡片）
   */
  onManageFamily() {
    // 显示家庭协作功能菜单
    wx.showActionSheet({
      itemList: ['家庭管理', '权限设置', '操作日志', '同步设置'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            wx.navigateTo({
              url: '/pages/family/family'
            });
            break;
          case 1:
            wx.navigateTo({
              url: '/pages/family-permissions/family-permissions'
            });
            break;
          case 2:
            wx.navigateTo({
              url: '/pages/operation-logs/operation-logs'
            });
            break;
          case 3:
            wx.navigateTo({
              url: '/pages/settings/settings?tab=sync'
            });
            break;
        }
      }
    });
  },

  /**
   * 创建或加入家庭
   */
  onCreateOrJoinFamily() {
    wx.showActionSheet({
      itemList: ['创建家庭', '加入家庭'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 创建家庭
          wx.navigateTo({
            url: '/pages/family/family?action=create'
          });
        } else if (res.tapIndex === 1) {
          // 加入家庭
          wx.navigateTo({
            url: '/pages/join-family/join-family'
          });
        }
      }
    });
  },

  /**
   * 获取最近活动数量
   */
  async getRecentActivitiesCount() {
    try {
      // 获取今日操作日志数量
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 这里应该调用操作日志服务获取今日活动数量
      // 暂时返回模拟数据
      return Math.floor(Math.random() * 20) + 1;
    } catch (error) {
      console.error('获取最近活动数量失败:', error);
      return 0;
    }
  }

})