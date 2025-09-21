// pages/me/me.js
const app = getApp();
const familyService = require('../../services/family.js');
const collaborationHelper = require('../../utils/collaborationHelper.js');
const eventBus = require('../../utils/eventBus.js');
const dataManager = require('../../services/dataManager.js');
const privacy = require('../../services/privacy.js');
const privacyScope = require('../../services/privacyScope.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {},
    collaborationEnabled: true, // 默认启用协作功能
    isInFamily: false,
    familyInfo: null,
    // 隐私管理：默认金额/收益率可见性（来自全局 privacy）
    moneyVisible: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('[DEBUG] 页面加载');
    this.loadUserInfo();
    this.initCollaboration();

    // 初始化默认显隐（订阅全局）
    this.setData({ moneyVisible: privacy.getMoneyVisible() });
    this._unsubPrivacy = privacy.subscribe((v) => {
      // 仅更新该字段，避免不必要的 setData
      this.setData({ moneyVisible: !!v });
    });
    
    // 注册数据管理器刷新回调
    dataManager.registerRefreshCallback('me', (data) => {
      console.log('[ME] 收到数据刷新通知:', data);
      if (data.type === 'familyNameChange') {
        this.refreshFamilyInfo();
      }
    });
    
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

    // 监听家庭信息更新事件
    this.bindFamilyUpdateEvent();
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
      
      if (result.success && result.data) {
        console.log('[DEBUG] 用户已加入家庭:', result.data);
        // 用户在家庭中
        this.setData({
          collaborationEnabled: true,
          isInFamily: true,
          familyInfo: result.data
        });



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
    console.log('[DEBUG] 点击管理家庭');

    if (!this.data.isInFamily) {
      wx.navigateTo({ 
        url: '/pages/join-family/join-family',
        fail: (err) => {
          console.error('跳转失败:', err);
          wx.showToast({ title: '页面跳转失败', icon: 'error' });
        }
      });
      return;
    }

    // 直接进入家庭管理页
    wx.navigateTo({ 
      url: '/pages/family/family',
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({ title: '页面跳转失败', icon: 'error' });
      }
    });
  },


  /**
   * 创建或加入家庭
   */
  onCreateOrJoinFamily() {
    console.log('[DEBUG] 点击创建或加入家庭');
    wx.navigateTo({ url: '/pages/family/family?action=create' });
  },

  /**
   * 绑定家庭信息更新事件
   */
  bindFamilyUpdateEvent() {
    // 监听全局家庭信息更新事件
    if (wx.$on) {
      wx.$on('familyInfoUpdated', (data) => {
        console.log('[DEBUG] 收到家庭信息更新事件:', data);
        if (data && data.name && this.data.familyInfo) {
          this.setData({
            'familyInfo.name': data.name
          });
        }
      });
    }
  },

  /**
   * 页面卸载时清理事件监听
   */
  onUnload() {
    if (wx.$off) {
      wx.$off('familyInfoUpdated');
    }
    
    // 注销数据管理器刷新回调
    dataManager.unregisterRefreshCallback('me');
    console.log('[ME] onUnload - 已注销数据管理器回调');

    // 注销隐私订阅
    if (this._unsubPrivacy) {
      try { this._unsubPrivacy(); } catch (e) {}
      this._unsubPrivacy = null;
    }
  },

  // 头像加载失败回退
  onAvatarError() {
    const cur = this.data.userInfo || {};
    if (cur.avatarUrl !== '/images/default-avatar.svg') {
      this.setData({ 'userInfo.avatarUrl': '/images/default-avatar.svg' });
    }
  },

  // ================ 隐私管理交互 ================
  // 兼容点击头部箭头区域触发（辅助），本质以 eye-toggle 的 change 为准
  onToggleDefaultVisible() {
    privacy.toggleMoneyVisible();
  },
  // eye-toggle 回调：更新全局默认（storage 持久化并广播）
  onDefaultVisibleChange(e) {
    const next = !!(e && e.detail && e.detail.value);
    privacy.setMoneyVisible(next);
    wx.showToast({ title: next ? '已设为默认显示' : '已设为默认隐藏', icon: 'none' });
  },
  // 已移除：清除覆盖功能不再提供（保持占位以防外部引用）
  onClearOverrides() {
    wx.showToast({ title: '该功能已移除', icon: 'none' });
  }
})