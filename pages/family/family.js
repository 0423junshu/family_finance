// pages/family/family.js
const familyService = require('../../services/family');
const syncService = require('../../services/sync');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    familyInfo: {
      name: '',
      familyCode: '',
      role: '', // owner, admin, member
      memberCount: 0
    },
    members: [],
    showInvitePopup: false,
    canInvite: false,
    canManage: false,
    canManageMembers: false,
    syncStatus: 'synced' // syncing, synced, error
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 记录入口动作（如从“我的”页触发创建家庭）
    this.pendingAction = (options && options.action) || '';
    this._navLock = false; // 防止重复导航导致回退
    console.log('[FAMILY] onLoad, pendingAction=', this.pendingAction);
    this.initPage();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    console.log('[FAMILY] onShow');
    this.loadFamilyData();
  },

  /**
   * 初始化页面
   */
  async initPage() {
    try {
      // 检查用户是否已登录 - 同时检查全局数据和本地存储
      const app = getApp();
      const globalUserInfo = app.globalData.userInfo;
      const localUserInfo = wx.getStorageSync('userInfo');
      
      // 统一登录状态检查
      const userInfo = globalUserInfo || localUserInfo;
      if (!userInfo || (!userInfo.openid && !userInfo._id)) {
        console.log('用户未登录，跳转到登录页');
        wx.redirectTo({
          url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/family/family')
        });
        return;
      }

      // 确保全局数据和本地存储同步
      if (!globalUserInfo && localUserInfo) {
        app.globalData.userInfo = localUserInfo;
        app.globalData.isLogin = true;
      } else if (globalUserInfo && !localUserInfo) {
        wx.setStorageSync('userInfo', globalUserInfo);
      }

      // 加载家庭数据
      await this.loadFamilyData();
      
      // 设置权限（在数据加载后）
      this.setPermissions();
      
    } catch (error) {
      console.error('初始化页面失败:', error);
      this.showToast('加载失败，请重试', 'error');
      
      // 确保即使出错也设置默认状态
      this.setData({
        familyInfo: null,
        members: [],
        canInvite: false,
        canManage: false,
        canManageMembers: false
      });
    }
  },

  /**
   * 加载家庭数据
   */
  async loadFamilyData() {
    try {
      wx.showLoading({ title: '加载中...' });
      
      // 获取家庭信息
      const familyResult = await familyService.getFamilyInfo();
      console.log('[FAMILY] getFamilyInfo result=', familyResult);
      
      if (familyResult.success && familyResult.data) {
        // 用户已加入家庭
        const membersResult = await familyService.getFamilyMembers();
        const members = membersResult.success ? membersResult.members : [];
        
        this.setData({
          familyInfo: {
            ...familyResult.data,
            memberCount: members.length
          },
          members: members.map(member => ({
            ...member,
            roleText: this.getRoleText(member.role),
            isOnline: member.lastActiveTime && 
                     (Date.now() - member.lastActiveTime < 5 * 60 * 1000) // 5分钟内活跃
          }))
        });
      } else {
        // 处理服务返回的友好错误信息
        this.setData({
          familyInfo: null,
          members: []
        });
        
        if (familyResult.code === 'USER_NOT_LOGGED_IN') {
          // 用户未登录，跳转到登录页
          console.log('用户未登录，跳转到登录页');
          wx.redirectTo({
            url: '/pages/login/login'
          });
        } else if (familyResult.code === 'FAMILY_NOT_FOUND') {
          // 用户还没有加入家庭
          if (this.pendingAction === 'create') {
            console.log('检测到action=create，直接创建家庭');
            await this.createFamily();
            return;
          }
          // 显示加入/创建选项
          if (this.pendingAction === 'create') {
            if (this._navLock) { console.log('[FAMILY] create blocked by navLock'); return; }
            this._navLock = true;
            console.log('[FAMILY] 检测到action=create，直接创建家庭');
            await this.createFamily();
            this._navLock = false;
            return;
          }
          console.log('用户未加入家庭，显示选择对话框');
          this.showJoinOrCreateDialog();
        } else {
          this.showToast('加载失败，请重试', 'error');
        }
      }
      
      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      console.error('加载家庭数据失败:', error);
      
      // 设置默认状态
      this.setData({
        familyInfo: null,
        members: []
      });
      
      // 处理真正的异常错误
      this.showToast('网络错误，请重试', 'error');
    }
  },

  /**
   * 设置用户权限
   */
  setPermissions() {
    const familyInfo = this.data.familyInfo;
    const role = familyInfo ? familyInfo.role : null;
    
    this.setData({
      canInvite: role === 'owner' || role === 'admin',
      canManage: role === 'owner' || role === 'admin',
      canManageMembers: role === 'owner'
    });
  },

  /**
   * 获取角色文本
   */
  getRoleText(role) {
    const roleMap = {
      'owner': '创建者',
      'admin': '管理员',
      'member': '成员'
    };
    return roleMap[role] || '成员';
  },

  /**
   * 复制家庭码
   */
  copyFamilyCode() {
    const familyInfo = this.data.familyInfo;
    const familyCode = familyInfo ? familyInfo.familyCode : null;
    
    if (!familyCode) {
      this.showToast('家庭码不存在', 'error');
      return;
    }

    wx.setClipboardData({
      data: familyCode,
      success: () => {
        this.showToast('家庭码已复制', 'success');
      },
      fail: () => {
        this.showToast('复制失败', 'error');
      }
    });
  },

  /**
   * 分享家庭码
   */
  shareFamilyCode() {
    const familyInfo = this.data.familyInfo;
    const familyCode = familyInfo ? familyInfo.familyCode : null;
    const name = familyInfo ? familyInfo.name : '我的家庭';
    
    if (!familyCode) {
      this.showToast('家庭码不存在', 'error');
      return;
    }

    // 构造分享内容
    const shareContent = `邀请您加入"${name}"家庭财务管理
家庭码：${familyCode}
请在小程序中输入此家庭码加入我们的家庭账本`;
    
    wx.setClipboardData({
      data: shareContent,
      success: () => {
        this.showToast('邀请内容已复制，可分享给好友', 'success');
      }
    });
  },

  /**
   * 显示邀请弹窗
   */
  showInviteDialog() {
    this.setData({
      showInvitePopup: true
    });
  },

  /**
   * 关闭邀请弹窗
   */
  closeInvitePopup() {
    this.setData({
      showInvitePopup: false
    });
  },

  /**
   * 邀请弹窗显示状态变化
   */
  onInvitePopupChange(e) {
    this.setData({
      showInvitePopup: e.detail.visible
    });
  },

  /**
   * 通过家庭码邀请
   */
  inviteByCode() {
    this.shareFamilyCode();
    this.closeInvitePopup();
  },

  /**
   * 通过二维码邀请
   */
  async inviteByQR() {
    try {
      const qrCode = await familyService.generateInviteQR(this.data.familyInfo.familyCode);
      
      // 显示二维码页面
      wx.navigateTo({
        url: `/pages/invite-qr/invite-qr?qrCode=${encodeURIComponent(qrCode)}`
      });
      
      this.closeInvitePopup();
    } catch (error) {
      console.error('生成二维码失败:', error);
      this.showToast('生成二维码失败', 'error');
    }
  },

  /**
   * 通过链接邀请
   */
  async inviteByLink() {
    try {
      const inviteLink = await familyService.generateInviteLink(this.data.familyInfo.familyCode);
      
      wx.setClipboardData({
        data: inviteLink,
        success: () => {
          this.showToast('邀请链接已复制', 'success');
        }
      });
      
      this.closeInvitePopup();
    } catch (error) {
      console.error('生成邀请链接失败:', error);
      this.showToast('生成邀请链接失败', 'error');
    }
  },

  /**
   * 点击成员
   */
  onMemberClick(e) {
    if (!this.data.canManageMembers) return;
    
    const member = e.currentTarget.dataset.member;
    
    // 跳转到成员详情页
    wx.navigateTo({
      url: `/pages/member-detail/member-detail?memberId=${member.id}`
    });
  },

  /**
   * 跳转到权限设置
   */
  goToPermissions() {
    wx.navigateTo({
      url: '/pages/family-permissions/family-permissions'
    });
  },

  /**
   * 跳转到操作日志
   */
  goToLogs() {
    wx.navigateTo({
      url: '/pages/operation-logs/operation-logs?showMemberActivity=true'
    });
  },

  /**
   * 跳转到同步设置
   */
  goToSyncSettings() {
    wx.navigateTo({
      url: '/pages/sync-settings/sync-settings'
    });
  },

  /**
   * 跳转到家庭设置
   */
  goToFamilySettings() {
    wx.navigateTo({
      url: '/pages/family-settings/family-settings'
    });
  },

  /**
   * 刷新数据
   */
  async refreshData() {
    await this.loadFamilyData();
    this.showToast('数据已刷新', 'success');
  },

  /**
   * 显示同步状态
   */
  async showSyncStatus() {
    try {
      const status = await syncService.getSyncStatus();
      
      let message = '';
      switch (status.status) {
        case 'synced':
          message = `数据已同步
最后同步：${this.formatTime(status.lastSyncTime)}`;
          break;
        case 'syncing':
          message = '正在同步数据...';
          break;
        case 'error':
          message = `同步失败
错误：${status.error}`;
          break;
        default:
          message = '同步状态未知';
      }
      
      wx.showModal({
        title: '同步状态',
        content: message,
        showCancel: false
      });
      
    } catch (error) {
      console.error('获取同步状态失败:', error);
      this.showToast('获取同步状态失败', 'error');
    }
  },

  /**
   * 显示加入或创建家庭对话框
   */
  showJoinOrCreateDialog() {
    // 添加防重复显示机制
    if (this.dialogShowing) {
      console.log('对话框已显示，跳过重复显示');
      return;
    }
    
    this.dialogShowing = true;
    
    wx.showModal({
      title: '家庭管理',
      content: '您还没有加入任何家庭，是否要创建新家庭或加入现有家庭？',
      confirmText: '创建家庭',
      cancelText: '加入家庭',
      success: (res) => {
        this.dialogShowing = false;
        
        if (res.confirm) {
          this.createFamily();
        } else if (res.cancel) {
          this.joinFamily();
        }
      },
      fail: () => {
        this.dialogShowing = false;
      }
    });
  },

  /**
   * 创建家庭
   */
  async createFamily() {
    try {
      wx.showLoading({ title: '创建中...' });
      
      const result = await familyService.createFamily();
      
      wx.hideLoading();
      this.showToast('家庭创建成功', 'success');
      
      // 直接设置家庭信息，避免重新加载导致的异步问题
      this.setData({
        familyInfo: {
          id: result.familyId,
          name: '我的家庭',
          familyCode: result.familyCode,
          role: 'owner',
          memberCount: 1
        },
        members: [{
          id: 'owner',
          nickname: wx.getStorageSync('userInfo')?.nickName || '家庭创建者',
          avatar: wx.getStorageSync('userInfo')?.avatarUrl || '/images/default-avatar.svg',
          role: 'owner',
          roleText: '创建者',
          isOnline: true
        }],
        showInvitePopup: false
      });
      
      // 设置权限
      this.setPermissions();
      
      console.log('家庭创建成功，页面状态已更新');
      
    } catch (error) {
      wx.hideLoading();
      console.error('创建家庭失败:', error);
      
      if (error.message && error.message.includes('用户未登录')) {
        wx.redirectTo({
          url: '/pages/login/login'
        });
      } else {
        this.showToast('创建家庭失败', 'error');
      }
    }
  },

  /**
   * 加入家庭
   */
  joinFamily() {
    // 跳转到加入家庭页面，并传递回调参数
    wx.navigateTo({
      url: '/pages/join-family/join-family?from=family'
    });
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // 1天内
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  },

  /**
   * 显示提示
   */
  showToast(message, type = 'success') {
    // 直接使用微信原生 toast，避免组件依赖问题
    wx.showToast({
      title: message,
      icon: type === 'success' ? 'success' : 'error'
    });
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadFamilyData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const { familyCode, name } = this.data.familyInfo;
    
    return {
      title: `邀请您加入"${name}"家庭财务管理`,
      path: `/pages/join-family/join-family?familyCode=${familyCode}`,
      imageUrl: '/images/share-family.png'
    };
  }
});