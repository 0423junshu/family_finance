// pages/family/family.js
const familyService = require('../../services/family');
const syncService = require('../../services/sync');
const eventBus = require('../../utils/eventBus');
const dataManager = require('../../services/dataManager');

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

    canInvite: false,
    canManage: false,
    canManageMembers: false,
    canEditName: false,
    syncStatus: 'synced', // syncing, synced, error
    
    // 编辑状态
    isEditingName: false,
    editingName: '',

    // 日志筛选与数据
    logTypeOptions: ['全部', '新增', '修改', '删除', '导出', '权限'],
    logTypeIndex: 0,
    memberOptions: ['全部'],
    memberIndex: 0,
    timeRangeOptions: ['今天', '昨天', '近7天', '近30天'],
    timeRangeIndex: 3,
    allLogs: [],
    filteredLogs: [],

    // 本页权限弹窗
    showPermModal: false,
    selectedMember: {},
    permDraft: { canEdit: false, canDelete: false, canExport: false },
    savingPerms: false,

    // 验证用：强制演示数据开关（已关闭）
    useDemoData: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 记录入口动作（如从"我的"页触发创建家庭）
    this.pendingAction = (options && options.action) || '';
    this._navLock = false; // 防止重复导航导致回退
    console.log('[FAMILY] onLoad, pendingAction=', this.pendingAction);
    
    // 注册数据管理器刷新回调
    dataManager.registerRefreshCallback('family', (data) => {
      console.log('[FAMILY] 收到数据刷新通知:', data);
      if (data.type === 'familyNameChange' || data.type === 'membersUpdate' || data.type === 'permissionUpdate') {
        this.loadFamilyData();
    // 首次加载日志
    this.loadLogs();
      }
    });
    
    this.initPage();
    // 首屏也加载一次日志，确保 useDemoData 时有可见数据
    this.loadLogs();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onUnload() {
    // 注销数据管理器刷新回调
    dataManager.unregisterRefreshCallback('family');
    console.log('[FAMILY] onUnload - 已注销数据管理器回调');
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
  // 同步成员筛选项，确保与成员列表一致
  syncMemberOptions() {
    const names = Array.from(new Set((this.data.members || []).map(m => m.nickname))).filter(Boolean);
    this.setData({ memberOptions: ['全部', ...names] });
  },

  async loadFamilyData() {
    try {
      wx.showLoading({ title: '加载中...' });
      
      // 获取家庭信息
      const familyResult = await familyService.getFamilyInfo();
      console.log('[FAMILY] getFamilyInfo result=', familyResult);
      
      if (familyResult.success && familyResult.data) {
        // 用户已加入家庭
        const membersResult = await familyService.getFamilyMembers();
        const members = membersResult.success ? (membersResult.members || []) : [];
        
        this.setData({
          familyInfo: {
            ...familyResult.data,
            memberCount: members.length
          },
          members: Array.isArray(members) ? members.map(member => ({
            ...member,
            roleText: this.getRoleText(member.role),
            isOnline: member.lastActiveTime && 
                     (Date.now() - member.lastActiveTime < 5 * 60 * 1000) // 5分钟内活跃
          })) : []
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
            url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/family/family')
          });
        } else if (familyResult.code === 'FAMILY_NOT_FOUND') {
          // 用户还没有加入家庭
          if (this.pendingAction === 'create') {
            if (this._navLock) { 
              console.log('[FAMILY] create blocked by navLock'); 
              return; 
            }
            this._navLock = true;
            console.log('[FAMILY] 检测到action=create，直接创建家庭');
            await this.createFamily();
            this._navLock = false;
            return;
          }
          console.log('用户未加入家庭，显示选择对话框');
          this.showJoinOrCreateDialog();
        } else {
          console.error('获取家庭信息失败:', familyResult);
          this.showToast(familyResult.message || '加载失败，请重试', 'error');
        }
      }
      
      wx.hideLoading();

      // 刷新成员选项供日志筛选使用
      const memberNames = (this.data.members || []).map(m => m.nickname);
      this.setData({
        memberOptions: ['全部', ...memberNames]
      });
      // 重新过滤日志（成员变化可能影响筛选）
      this.applyLogFilters();
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
      canManageMembers: role === 'owner',
      canEditName: role === 'owner' || role === 'admin'
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
   * 复制家庭码用于邀请（合并原有的复制和分享功能）
   */
  copyFamilyCodeForInvite() {
    // 检查邀请权限
    if (!this.data.canInvite) {
      this.showToast('您没有邀请权限', 'error');
      return;
    }

    const familyInfo = this.data.familyInfo;
    const familyCode = familyInfo ? familyInfo.familyCode : null;
    const name = familyInfo ? familyInfo.name : '我的家庭';
    
    if (!familyCode) {
      this.showToast('家庭码不存在', 'error');
      return;
    }

    // 构造完整的邀请内容
    const inviteContent = `邀请您加入"${name}"家庭财务管理

家庭码：${familyCode}

请在小程序中输入此家庭码加入我们的家庭账本，一起管理家庭财务！`;
    
    wx.setClipboardData({
      data: inviteContent,
      success: () => {
        // 显示成功提示和后续指引
        this.showInviteSuccessModal();
      },
      fail: () => {
        this.showToast('复制失败，请重试', 'error');
      }
    });
  },

  /**
   * 显示邀请成功的提示和指引
   */
  showInviteSuccessModal() {
    wx.showModal({
      title: '邀请内容已复制',
      content: '邀请内容已复制到剪贴板，您可以通过微信、QQ等方式分享给家人朋友。\n\n他们收到邀请后，在小程序中输入家庭码即可加入。',
      confirmText: '知道了',
      showCancel: false,
      success: () => {
        // 可以在这里添加统计或其他逻辑
        console.log('用户确认了邀请指引');
      }
    });
  },

  /**
   * 分享家庭码（保留原方法以兼容其他调用）
   */
  shareFamilyCode() {
    // 直接调用新的统一方法
    this.copyFamilyCodeForInvite();
  },



  /**
   * 点击成员 - 本页弹窗编辑三项权限
   */
  onMemberTap(e) {
    const member = e.currentTarget.dataset.member;
    if (!this.canManageMemberPermissions(member)) {
      this.showToast('您没有权限管理该成员', 'error');
      return;
    }
    this.openPermModal(member);
  },

  openPermModal(member) {
    // 从成员对象或服务获取当前权限
    const perms = {
      canEdit: !!member.canEdit,
      canDelete: !!member.canDelete,
      canExport: !!member.canExport
    };
    this.setData({
      selectedMember: member,
      permDraft: perms,
      showPermModal: true
    });
  },

  closePermModal() {
    if (this.data.savingPerms) return;
    this.setData({ showPermModal: false });
  },

  onPermEditChange(e) {
    this.setData({ 'permDraft.canEdit': e.detail.value });
  },
  onPermDeleteChange(e) {
    this.setData({ 'permDraft.canDelete': e.detail.value });
  },
  onPermExportChange(e) {
    this.setData({ 'permDraft.canExport': e.detail.value });
  },

  async saveMemberPerms() {
    if (this.data.savingPerms) return;
    const member = this.data.selectedMember;
    const perms = this.data.permDraft;
    try {
      this.setData({ savingPerms: true });
      // 调用服务：若无接口，请补充 familyService.updateMemberPermissions(member.id, perms)
      if (familyService.updateMemberPermissions) {
        const res = await familyService.updateMemberPermissions(member.id, perms);
        if (!res || res.success === false) throw new Error(res && res.message || '保存失败');
      } else {
        // 本地占位：直接更新内存成员
        const members = this.data.members.map(m => m.id === member.id ? { ...m, ...perms } : m);
        this.setData({ members });
      }
      // 成功后刷新成员与日志
      await this.loadFamilyData();
      await this.loadLogs();
      this.showToast('已保存权限', 'success');
      this.setData({ showPermModal: false });
    } catch (err) {
      console.error('保存成员权限失败', err);
      this.showToast('保存失败，请重试', 'error');
    } finally {
      this.setData({ savingPerms: false });
    }
  },

  /**
   * 检查是否可以管理成员权限
   */
  canManageMemberPermissions(member) {
    const currentRole = this.data.familyInfo?.role;
    
    // 创建者可以管理所有人（除了自己）
    if (currentRole === 'owner') {
      return member.role !== 'owner';
    }
    
    // 管理员可以管理普通成员
    if (currentRole === 'admin') {
      return member.role === 'member';
    }
    
    return false;
  },

  /**
   * 跳转到权限设置
   */
  // 扁平化后移除入口：保留函数以兼容可能的外部引用，可提示不再使用
  goToPermissions() {
    console.log('[FAMILY] 跳转到权限设置');
    
    // 检查权限
    if (!this.data.canManage) {
      this.showToast('您没有管理权限', 'error');
      return;
    }
    
    this.showToast('已在成员卡片直接管理权限', 'none');
    // 如仍需进入旧页，可保留跳转；此处改为提示
    // wx.navigateTo({ url: '/pages/family-permissions/family-permissions' });
  },

  /**
   * 跳转到操作日志
   */
  // 扁平化后移除入口：日志已内嵌本页
  goToLogs() {
    console.log('[FAMILY] 跳转到操作日志');
    
    // 不再跳转，滚动到日志区域
    this.pageScrollToLogs && this.pageScrollToLogs();
  },



  /**
   * 跳转到家庭设置
   */
  // 家庭设置功能已内联，仅保留改名：提示
  goToFamilySettings() {
    console.log('[FAMILY] 跳转到家庭设置');
    
    // 跳转到统一的设置页面
    this.showToast('家庭设置已合并到本页（名称可内联编辑）', 'none');
  },

  /**
   * 刷新数据
   */
  async refreshData() {
    try {
      // 更新同步状态为同步中
      this.setData({ syncStatus: 'syncing' });
      
      // 刷新家庭数据
      await this.loadFamilyData();
      
      // 模拟同步延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 更新同步状态为已同步
      this.setData({ syncStatus: 'synced' });

      // 刷新日志
      await this.loadLogs();
      this.showToast('数据已刷新', 'success');
    } catch (error) {
      console.error('刷新数据失败:', error);
      this.setData({ syncStatus: 'error' });
      this.showToast('刷新失败，请重试', 'error');
    }
  },

  // 加载家庭操作日志（占位：从服务或本地获取）
  async loadLogs() {
    try {
      // 示例：从 familyService 获取日志；若无接口，暂用空数组
      const res = (familyService.getFamilyLogs && await familyService.getFamilyLogs()) || { success: true, logs: [] };
      let logs = res.success ? (res.logs || []) : [];

      // 移除演示注入：仅使用接口返回；为空则保持空列表（前端显示“暂无日志”）
      // if (!logs || logs.length === 0) { ... 可选兜底占位，不再注入示例 }

      // 转换展示字段，避免在 WXML 中使用 JS 方法（如 charAt）
      const mapped = logs.map(l => ({
        ...l,
        typeText: this.mapLogType(l.type),
        timeText: this.formatLogTime(l.time),
        actionText: this.mapActionText(l),
        userName: l.userName || '系统'
      }));

      // 合并成员昵称与日志用户名，动态去重生成筛选项
      const memberNames = (this.data.members || []).map(m => m.nickname);
      const logUsers = (mapped || []).map(m => m.userName);
      const unique = Array.from(new Set([...memberNames, ...logUsers])).filter(Boolean);
      this.setData({ 
        allLogs: mapped,
        memberOptions: ['全部', ...unique]
      }, () => {
        this.applyLogFilters();
      });
    } catch (e) {
      console.error('加载日志失败', e);
      this.setData({ allLogs: [], filteredLogs: [] });
    }
  },

  mapLogType(t) {
    const map = {
      create: '新增',
      update: '修改',
      delete: '删除',
      export: '导出',
      permission: '权限'
    };
    return map[t] || '其他';
  },

  formatLogTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const pad = n => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  mapActionText(l) {
    // 可根据后端字段细化
    return l.actionText || l.action || this.mapLogType(l.type);
  },

  // 筛选变更
  onLogTypeChange(e) {
    this.setData({ logTypeIndex: Number(e.detail.value) }, () => this.applyLogFilters());
  },
  onLogMemberChange(e) {
    this.setData({ memberIndex: Number(e.detail.value) }, () => this.applyLogFilters());
  },
  onLogTimeRangeChange(e) {
    this.setData({ timeRangeIndex: Number(e.detail.value) }, () => this.applyLogFilters());
  },

  applyLogFilters() {
    const { allLogs, logTypeOptions, logTypeIndex, memberOptions, memberIndex, timeRangeOptions, timeRangeIndex } = this.data;

    const typeSel = logTypeOptions[logTypeIndex];
    const memberSel = memberOptions[memberIndex];
    const rangeSel = timeRangeOptions[timeRangeIndex];

    const now = new Date();
    let start = null;
    if (rangeSel === '今天') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    } else if (rangeSel === '昨天') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start = new Date(d.getTime() - 24 * 60 * 60 * 1000).getTime();
    } else if (rangeSel === '近7天') {
      start = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    } else if (rangeSel === '近30天') {
      start = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    }

    const filtered = (allLogs || []).filter(l => {
      const byType = typeSel === '全部' || this.mapLogType(l.type) === typeSel;
      const byMember = memberSel === '全部' || l.userName === memberSel;
      const byTime = !start || (l.time && l.time >= start);
      return byType && byMember && byTime;
    });

    this.setData({ filteredLogs: filtered });
  },

  // 页面滚动到日志区域
  pageScrollToLogs() {
    // 依赖前端节点 id，可后续为 logs-card 增加 id 再实现查询节点偏移滚动
    // 这里简单调用原生下拉提示用户查看底部
    wx.pageScrollTo({ scrollTop: 99999, duration: 300 });
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
   * 切换编辑模式
   */
  toggleEditMode() {
    if (!this.data.canEditName) {
      this.showToast('您没有编辑权限', 'error');
      return;
    }

    const isEditing = this.data.isEditingName;
    
    if (isEditing) {
      // 当前在编辑模式，点击保存
      this.saveFamilyName();
    } else {
      // 进入编辑模式
      this.setData({
        isEditingName: true,
        editingName: this.data.familyInfo.name || '我的家庭'
      });
    }
  },

  /**
   * 输入家庭名称
   */
  onNameInput(e) {
    this.setData({
      editingName: e.detail.value
    });
  },

  /**
   * 保存家庭名称
   */
  async saveFamilyName() {
    const newName = this.data.editingName.trim();
    
    if (!newName) {
      this.showToast('家庭名称不能为空', 'error');
      return;
    }

    if (newName === this.data.familyInfo.name) {
      // 名称没有变化，直接退出编辑模式
      this.cancelEdit();
      return;
    }

    try {
      wx.showLoading({ title: '保存中...' });
      
      // 调用服务更新家庭名称
      const result = await familyService.updateFamilyName(newName);
      
      if (result.success) {
        // 更新本地数据
        this.setData({
          'familyInfo.name': newName,
          isEditingName: false,
          editingName: ''
        });

        // 更新全局状态和"我的"页面
        await this.updateGlobalFamilyInfo(newName);
        
        wx.hideLoading();
        this.showToast('家庭名称已更新', 'success');
      } else {
        wx.hideLoading();
        this.showToast(result.message || '保存失败', 'error');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('保存家庭名称失败:', error);
      this.showToast('保存失败，请重试', 'error');
    }
  },

  /**
   * 取消编辑
   */
  cancelEdit() {
    this.setData({
      isEditingName: false,
      editingName: ''
    });
  },

  /**
   * 更新全局家庭信息
   */
  async updateGlobalFamilyInfo(newName) {
    try {
      // 更新全局应用数据
      const app = getApp();
      if (app.globalData.familyInfo) {
        app.globalData.familyInfo.name = newName;
      }

      // 更新本地存储
      const familyInfo = wx.getStorageSync('familyInfo') || {};
      familyInfo.name = newName;
      wx.setStorageSync('familyInfo', familyInfo);

      // 通知其他页面刷新
      this.notifyPagesRefresh();
      
    } catch (error) {
      console.error('更新全局家庭信息失败:', error);
    }
  },

  /**
   * 通知其他页面刷新
   */
  notifyPagesRefresh() {
    // 获取页面栈
    const pages = getCurrentPages();
    
    // 通知"我的"页面刷新
    const mePage = pages.find(page => page.route === 'pages/me/me');
    if (mePage && mePage.loadFamilyInfo) {
      mePage.loadFamilyInfo();
    }

    // 发送全局事件
    wx.$emit && wx.$emit('familyInfoUpdated', {
      name: this.data.familyInfo.name
    });
  },

  /**
   * 显示提示
   */
  showToast(message, type = 'success') {
    // 直接使用微信原生 toast，避免组件依赖问题
    wx.showToast({
      title: message,
      icon: type === 'success' ? 'success' : (type === 'error' ? 'error' : 'none')
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