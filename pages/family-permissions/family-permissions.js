// pages/family-permissions/family-permissions.js
const familyService = require('../../services/family');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 页面模式：simple（单个成员）或 batch（批量管理）
    mode: 'batch',
    
    // 当前管理的成员（单个成员模式）
    currentMember: null,
    currentMemberId: '',
    
    // 批量管理相关
    members: [],
    selectedMembers: [],
    isAllSelected: false,
    batchPermissions: {
      canEdit: false,
      canDelete: false,
      canExport: false
    },
    
    // UI状态
    saving: false,
    showToast: false,
    toastMessage: '',
    toastType: 'success',
    canRemoveMember: false,
    
    // 权限模板
    permissionTemplates: [
      {
        id: 'viewer',
        name: '查看者',
        description: '只能查看数据，不能修改',
        icon: '👁️',
        permissions: {
          canViewAllData: true,
          canEditAllData: false,
          canDeleteAllData: false,
          canViewReports: true,
          canInviteMembers: false,
          canRemoveMembers: false,
          canEditPermissions: false,
          canEditFamilySettings: false,
          canDeleteFamily: false,
          canTransferOwnership: false,
          canManageCategories: false,
          canManageBudgets: false,
          canExportData: false
        }
      },
      {
        id: 'member',
        name: '普通成员',
        description: '可以记账和查看报表',
        icon: '✏️',
        permissions: {
          canViewAllData: true,
          canEditAllData: false,
          canDeleteAllData: false,
          canViewReports: true,
          canInviteMembers: false,
          canRemoveMembers: false,
          canEditPermissions: false,
          canEditFamilySettings: false,
          canDeleteFamily: false,
          canTransferOwnership: false,
          canManageCategories: false,
          canManageBudgets: false,
          canExportData: false
        }
      },
      {
        id: 'admin',
        name: '管理员',
        description: '可以管理数据和邀请成员',
        icon: '🔧',
        permissions: {
          canViewAllData: true,
          canEditAllData: true,
          canDeleteAllData: false,
          canViewReports: true,
          canInviteMembers: true,
          canRemoveMembers: false,
          canEditPermissions: false,
          canEditFamilySettings: false,
          canDeleteFamily: false,
          canTransferOwnership: false,
          canManageCategories: true,
          canManageBudgets: true,
          canExportData: true
        }
      }
    ],

    // 权限分组
    permissionGroups: [
      {
        category: 'data',
        name: '数据权限',
        expanded: true,
        permissions: [
          {
            key: 'canViewAllData',
            name: '查看所有数据',
            description: '可以查看家庭所有财务数据'
          },
          {
            key: 'canEditAllData',
            name: '编辑所有数据',
            description: '可以修改任何成员的数据'
          },
          {
            key: 'canDeleteAllData',
            name: '删除所有数据',
            description: '可以删除任何成员的数据'
          },
          {
            key: 'canExportData',
            name: '导出数据',
            description: '可以导出家庭财务数据'
          }
        ]
      },
      {
        category: 'member',
        name: '成员管理',
        expanded: false,
        permissions: [
          {
            key: 'canInviteMembers',
            name: '邀请成员',
            description: '可以邀请新成员加入家庭'
          },
          {
            key: 'canRemoveMembers',
            name: '移除成员',
            description: '可以移除家庭成员'
          },
          {
            key: 'canEditPermissions',
            name: '编辑权限',
            description: '可以修改其他成员的权限'
          }
        ]
      },
      {
        category: 'family',
        name: '家庭管理',
        expanded: false,
        permissions: [
          {
            key: 'canEditFamilySettings',
            name: '编辑家庭设置',
            description: '可以修改家庭名称等设置'
          },
          {
            key: 'canDeleteFamily',
            name: '删除家庭',
            description: '可以删除整个家庭'
          },
          {
            key: 'canTransferOwnership',
            name: '转让所有权',
            description: '可以将家庭所有权转让给他人'
          }
        ]
      },
      {
        category: 'function',
        name: '功能权限',
        expanded: false,
        permissions: [
          {
            key: 'canManageCategories',
            name: '管理分类',
            description: '可以添加、编辑、删除分类'
          },
          {
            key: 'canManageBudgets',
            name: '管理预算',
            description: '可以设置和修改预算'
          },
          {
            key: 'canViewReports',
            name: '查看报表',
            description: '可以查看财务报表和统计'
          }
        ]
      }
    ],

    currentUserRole: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('权限设置页面加载，参数:', options);
    
    // 检查页面模式
    const mode = options.mode || 'batch';
    const memberId = options.memberId || '';
    
    this.setData({
      mode,
      currentMemberId: memberId
    });
    
    this.initPage();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadData();
  },

  /**
   * 初始化页面
   */
  async initPage() {
    try {
      // 检查权限
      const hasPermission = await this.checkManagePermission();
      
      if (!hasPermission) {
        wx.showModal({
          title: '权限不足',
          content: '您没有权限管理成员权限',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
        return;
      }

      await this.loadData();
    } catch (error) {
      console.error('初始化页面失败:', error);
      this.showToast('加载失败，请重试', 'error');
    }
  },

  /**
   * 检查管理权限
   */
  async checkManagePermission() {
    try {
      const info = await familyService.getFamilyInfo();
      const role = (info && info.role) || (info?.data?.role) || 'member';
      
      // 创建者和管理员有权限
      return role === 'owner' || role === 'admin';
    } catch (error) {
      console.error('检查权限失败:', error);
      return false;
    }
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      wx.showLoading({ title: '加载中...' });

      // 获取家庭信息和成员列表
      const [familyInfo, membersResult] = await Promise.allSettled([
        familyService.getFamilyInfo(),
        familyService.getFamilyMembers()
      ]);

      let currentUserRole = 'member';
      if (familyInfo.status === 'fulfilled') {
        const info = familyInfo.value;
        currentUserRole = (info && info.role) || (info?.data?.role) || 'member';
      }

      let members = [];
      if (membersResult.status === 'fulfilled') {
        const result = membersResult.value;
        members = Array.isArray(result) ? result : (Array.isArray(result?.members) ? result.members : []);
      }

      // 处理成员数据
      const processedMembers = members.map(member => ({
        id: member.id || '',
        nickname: member.nickname || '未知用户',
        role: member.role || 'member',
        permissions: this.normalizePermissions(member.permissions),
        roleText: this.getRoleText(member.role || 'member'),
        joinedAtText: this.formatDate(member.joinedAt || Date.now()),
        isOnline: member.lastActiveTime && 
                 (Date.now() - member.lastActiveTime < 5 * 60 * 1000),
        avatarUrl: member.avatarUrl || ''
      }));

      this.setData({
        members: processedMembers,
        currentUserRole
      });

      // 如果是单个成员模式，加载特定成员数据
      if (this.data.mode === 'simple' && this.data.currentMemberId) {
        await this.loadCurrentMember();
      }

      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      console.error('加载数据失败:', error);
      this.showToast('加载失败，请重试', 'error');
    }
  },

  /**
   * 标准化权限对象
   */
  normalizePermissions(permissions) {
    const defaultPermissions = {
      canEdit: false,
      canDelete: false,
      canExport: false
    };

    if (!permissions || typeof permissions !== 'object') {
      return defaultPermissions;
    }

    return {
      canEdit: !!permissions.canEdit || !!permissions.canEditAllData,
      canDelete: !!permissions.canDelete || !!permissions.canDeleteAllData,
      canExport: !!permissions.canExport || !!permissions.canExportData
    };
  },

  /**
   * 加载当前成员数据
   */
  async loadCurrentMember() {
    const member = this.data.members.find(m => m.id === this.data.currentMemberId);
    
    if (!member) {
      this.showToast('成员不存在', 'error');
      wx.navigateBack();
      return;
    }

    // 检查是否可以移除该成员
    const canRemove = this.canRemoveThisMember(member);

    this.setData({
      currentMember: member,
      canRemoveMember: canRemove
    });
  },

  /**
   * 检查是否可以移除指定成员
   */
  canRemoveThisMember(member) {
    const currentRole = this.data.currentUserRole;
    
    // 只有创建者可以移除成员，且不能移除自己
    if (currentRole === 'owner') {
      return member.role !== 'owner';
    }
    
    return false;
  },

  /**
   * 权限开关变更（单个成员模式）
   */
  onPermissionChange(e) {
    const permission = e.currentTarget.dataset.permission;
    const value = e.detail.value;
    
    this.setData({
      [`currentMember.permissions.${permission}`]: value
    });
  },

  /**
   * 批量权限开关变更
   */
  onBatchPermissionChange(e) {
    const permission = e.currentTarget.dataset.permission;
    const value = e.detail.value;
    
    this.setData({
      [`batchPermissions.${permission}`]: value
    });
  },

  /**
   * 保存权限（单个成员模式）
   */
  async savePermissions() {
    if (!this.data.currentMember) {
      this.showToast('成员信息不存在', 'error');
      return;
    }

    try {
      this.setData({ saving: true });
      
      const permissions = this.data.currentMember.permissions;
      
      // 调用服务更新权限
      await familyService.updateMemberPermissions(this.data.currentMember.id, permissions);
      
      this.showToast('权限保存成功', 'success');
      
      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (error) {
      console.error('保存权限失败:', error);
      this.showToast('保存失败，请重试', 'error');
    } finally {
      this.setData({ saving: false });
    }
  },

  /**
   * 应用批量权限
   */
  async applyBatchPermissions() {
    if (this.data.selectedMembers.length === 0) {
      this.showToast('请先选择成员', 'warning');
      return;
    }

    try {
      this.setData({ saving: true });
      
      const permissions = this.data.batchPermissions;
      const selectedMembers = this.data.selectedMembers;
      
      // 过滤掉创建者，避免误操作
      const validMembers = selectedMembers.filter(memberId => {
        const member = this.data.members.find(m => m.id === memberId);
        return member && member.role !== 'owner';
      });
      
      if (validMembers.length === 0) {
        this.showToast('无可设置的成员（已过滤创建者）', 'info');
        return;
      }
      
      // 并行更新所有选中成员的权限
      const promises = validMembers.map(memberId => 
        familyService.updateMemberPermissions(memberId, permissions)
      );
      
      await Promise.all(promises);
      
      this.showToast('批量权限设置成功', 'success');
      
      // 清空选择状态
      this.setData({
        selectedMembers: [],
        isAllSelected: false,
        batchPermissions: {
          canEdit: false,
          canDelete: false,
          canExport: false
        }
      });
      
      // 重新加载数据
      this.loadData();
      
    } catch (error) {
      console.error('批量设置权限失败:', error);
      this.showToast('设置失败，请重试', 'error');
    } finally {
      this.setData({ saving: false });
    }
  },

  /**
   * 移除成员
   */
  removeMember() {
    if (!this.data.currentMember) {
      return;
    }

    const member = this.data.currentMember;
    
    wx.showModal({
      title: '确认移除',
      content: `确定要移除成员"${member.nickname}"吗？此操作不可撤销。`,
      confirmText: '移除',
      confirmColor: '#ff4757',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '移除中...' });
            
            await familyService.removeMember(member.id);
            
            wx.hideLoading();
            this.showToast('成员已移除', 'success');
            
            // 延迟返回
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
            
          } catch (error) {
            wx.hideLoading();
            console.error('移除成员失败:', error);
            this.showToast('移除失败，请重试', 'error');
          }
        }
      }
    });
  },

  /**
   * 切换成员选择
   */
  toggleMemberSelection(e) {
    const memberId = e.currentTarget.dataset.memberId;
    const selectedMembers = [...this.data.selectedMembers];
    
    const index = selectedMembers.indexOf(memberId);
    if (index > -1) {
      selectedMembers.splice(index, 1);
    } else {
      selectedMembers.push(memberId);
    }
    
    this.setData({
      selectedMembers,
      isAllSelected: selectedMembers.length === this.data.members.length
    });
  },

  /**
   * 全选/取消全选
   */
  toggleSelectAll() {
    const isAllSelected = !this.data.isAllSelected;
    const selectedMembers = isAllSelected ? this.data.members.map(m => m.id) : [];
    
    this.setData({
      selectedMembers,
      isAllSelected
    });
  },

  /**
   * 选择成员（兼容旧方法）
   */
  selectMember(e) {
    const member = e.currentTarget.dataset.member;
    const { selectedMembers } = this.data;
    
    let newSelected;
    if (selectedMembers.includes(member.id)) {
      newSelected = selectedMembers.filter(id => id !== member.id);
    } else {
      newSelected = [...selectedMembers, member.id];
    }
    
    this.setData({
      selectedMembers: newSelected
    });
  },

  /**
   * 编辑成员
   */
  editMember(e) {
    e.stopPropagation();
    const member = e.currentTarget.dataset.member;
    
    // 设置可用角色
    const availableRoles = this.getAvailableRoles(member);
    
    // 设置编辑权限列表
    const editPermissions = this.getEditablePermissions(member);
    
    this.setData({
      editingMember: member,
      availableRoles,
      editPermissions,
      showMemberEdit: true
    });
  },

  /**
   * 获取可用角色
   */
  getAvailableRoles(member) {
    const { currentUserRole } = this.data;
    const roles = [];

    // 只有创建者可以设置管理员
    if (currentUserRole === 'owner') {
      roles.push(
        { value: 'admin', label: '管理员', disabled: false },
        { value: 'member', label: '普通成员', disabled: false },
        { value: 'viewer', label: '查看者', disabled: false }
      );
    } else if (currentUserRole === 'admin') {
      roles.push(
        { value: 'member', label: '普通成员', disabled: false },
        { value: 'viewer', label: '查看者', disabled: false }
      );
    }

    return roles;
  },

  /**
   * 获取可编辑权限
   */
  getEditablePermissions(member) {
    const permissions = [];
    
    const safePerm = (member && typeof member.permissions === 'object' && member.permissions) ? member.permissions : {};
    // 使用 permissionGroups 而不是 permissionCategories
    this.data.permissionGroups.forEach(group => {
      group.permissions.forEach(permission => {
        permissions.push({
          ...permission,
          enabled: !!safePerm[permission.key]
        });
      });
    });

    return permissions;
  },

  /**
   * 角色变更
   */
  onRoleChange(e) {
    const newRole = e.detail.value;
    const { editingMember } = this.data;
    
    // 更新编辑中的成员角色
    this.setData({
      'editingMember.role': newRole,
      'editingMember.roleText': this.getRoleText(newRole)
    });

    // 根据新角色更新权限
    const defaultPermissions = familyService.getDefaultPermissions(newRole);
    const editPermissions = this.data.editPermissions.map(permission => ({
      ...permission,
      enabled: defaultPermissions[permission.key] || false
    }));

    this.setData({
      editPermissions
    });
  },

  /**
   * 自定义权限变更
   */
  onCustomPermissionChange(e) {
    const key = e.currentTarget.dataset.key;
    const enabled = e.detail.value;
    
    const editPermissions = this.data.editPermissions.map(permission => {
      if (permission.key === key) {
        return { ...permission, enabled };
      }
      return permission;
    });

    this.setData({
      editPermissions
    });
  },

  /**
   * 保存成员权限
   */
  async saveMemberPermissions() {
    try {
      const { editingMember, editPermissions, currentUserRole } = this.data;

      // 本地前置校验：禁止对 owner 自身进行修改；owner 放行编辑他人
      if (!editingMember) {
        this.showToast('无有效成员', 'warning');
        return;
      }
      if (editingMember.role === 'owner') {
        this.showToast('不能修改创建者权限', 'warning');
        return;
      }

      wx.showLoading({ title: '保存中...' });

      // 构建权限对象
      const permissions = {};
      editPermissions.forEach(permission => {
        permissions[permission.key] = permission.enabled;
      });

      // 更新成员权限（owner 默认应有权限；admin 依后端鉴权）
      await familyService.updateMemberPermissions(editingMember.id, permissions);

      wx.hideLoading();
      this.showToast('权限更新成功', 'success');
      
      // 关闭弹窗并刷新数据
      this.closeMemberEdit();
      this.loadData();

    } catch (error) {
      wx.hideLoading();
      console.error('保存权限失败:', error);
      this.showToast('保存失败，请重试', 'error');
    }
  },

  /**
   * 移除成员
   */
  removeMember() {
    const { editingMember } = this.data;
    
    wx.showModal({
      title: '确认移除',
      content: `确定要移除成员"${editingMember.nickname}"吗？此操作不可撤销。`,
      confirmText: '移除',
      confirmColor: '#ff4757',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '移除中...' });
            
            await familyService.removeMember(editingMember.id);
            
            wx.hideLoading();
            this.showToast('成员已移除', 'success');
            
            this.closeMemberEdit();
            this.loadData();
            
          } catch (error) {
            wx.hideLoading();
            console.error('移除成员失败:', error);
            this.showToast('移除失败，请重试', 'error');
          }
        }
      }
    });
  },

  /**
   * 关闭成员编辑弹窗
   */
  closeMemberEdit() {
    this.setData({
      showMemberEdit: false,
      editingMember: null,
      editPermissions: [],
      availableRoles: []
    });
  },

  /**
   * 成员编辑弹窗状态变化
   */
  onMemberEditChange(e) {
    if (!e.detail.visible) {
      this.closeMemberEdit();
    }
  },

  /**
   * 显示批量编辑
   */
  showBatchEdit() {
    if (this.data.selectedMembers.length === 0) {
      this.showToast('请先选择要编辑的成员', 'warning');
      return;
    }
    
    this.setData({
      showBatchEdit: true
    });
  },

  /**
   * 关闭批量编辑
   */
  closeBatchEdit() {
    this.setData({
      showBatchEdit: false
    });
  },

  /**
   * 批量编辑状态变化
   */
  onBatchEditChange(e) {
    if (!e.detail.visible) {
      this.closeBatchEdit();
    }
  },

  /**
   * 执行批量操作
   */
  async executeBatchAction(e) {
    const action = e.currentTarget.dataset.action;
    const { selectedMembers } = this.data;
    
    if (selectedMembers.length === 0) {
      this.showToast('请先选择成员', 'warning');
      return;
    }

    let confirmText = '';
    let actionFunction = null;

    switch (action) {
      case 'setViewer':
        confirmText = `将 ${selectedMembers.length} 位成员设为查看者？`;
        actionFunction = () => this.batchSetRole('viewer');
        break;
      case 'setMember':
        confirmText = `将 ${selectedMembers.length} 位成员设为普通成员？`;
        actionFunction = () => this.batchSetRole('member');
        break;
      case 'setAdmin':
        confirmText = `将 ${selectedMembers.length} 位成员设为管理员？`;
        actionFunction = () => this.batchSetRole('admin');
        break;
      case 'removeSelected':
        confirmText = `确定要移除选中的 ${selectedMembers.length} 位成员吗？`;
        actionFunction = () => this.batchRemoveMembers();
        break;
    }

    wx.showModal({
      title: '批量操作确认',
      content: confirmText,
      success: (res) => {
        if (res.confirm && actionFunction) {
          actionFunction();
        }
      }
    });
  },

  /**
   * 批量设置角色
   */
  async batchSetRole(role) {
    try {
      wx.showLoading({ title: '设置中...' });
      
      const { selectedMembers, members, currentUserRole } = this.data;
      const defaultPermissions = familyService.getDefaultPermissions(role);

      // 过滤掉 owner 成员，避免误操作
      const validTargets = (selectedMembers || []).filter(id => {
        const m = (members || []).find(x => x.id === id);
        return m && m.role !== 'owner';
      });
      if (validTargets.length === 0) {
        wx.hideLoading();
        this.showToast('无可设置的成员（已过滤创建者）', 'info');
        return;
      }
      
      // 并行更新所有有效成员
      const promises = validTargets.map(memberId => 
        familyService.updateMemberPermissions(memberId, defaultPermissions)
      );
      
      await Promise.all(promises);
      
      wx.hideLoading();
      this.showToast('批量设置成功', 'success');
      
      this.closeBatchEdit();
      this.setData({ selectedMembers: [] });
      this.loadData();
      
    } catch (error) {
      wx.hideLoading();
      console.error('批量设置失败:', error);
      this.showToast('批量设置失败', 'error');
    }
  },

  /**
   * 批量移除成员
   */
  async batchRemoveMembers() {
    try {
      wx.showLoading({ title: '移除中...' });
      
      const { selectedMembers, members } = this.data;
      
      // 过滤掉 owner 成员，避免误操作
      const validTargets = (selectedMembers || []).filter(id => {
        const m = (members || []).find(x => x.id === id);
        return m && m.role !== 'owner';
      });
      if (validTargets.length === 0) {
        wx.hideLoading();
        this.showToast('无可移除的成员（已过滤创建者）', 'info');
        return;
      }

      // 并行移除所有选中成员
      const promises = validTargets.map(memberId => 
        familyService.removeMember(memberId)
      );
      
      await Promise.all(promises);
      
      wx.hideLoading();
      this.showToast('批量移除成功', 'success');
      
      this.closeBatchEdit();
      this.setData({ selectedMembers: [] });
      this.loadData();
      
    } catch (error) {
      wx.hideLoading();
      console.error('批量移除失败:', error);
      this.showToast('批量移除失败', 'error');
    }
  },

  /**
   * 设置快捷权限
   */
  async setQuickPermission(e) {
    const type = e.currentTarget.dataset.type;
    const { selectedMembers } = this.data;
    
    if (selectedMembers.length === 0) {
      this.showToast('请先选择成员', 'warning');
      return;
    }

    let permissions = {};
    switch (type) {
      case 'viewOnly':
        permissions = {
          canViewAllData: true,
          canEditAllData: false,
          canDeleteAllData: false,
          canViewReports: true
        };
        break;
      case 'basicEdit':
        permissions = {
          canViewAllData: true,
          canEditAllData: false,
          canDeleteAllData: false,
          canViewReports: true,
          canManageCategories: false,
          canManageBudgets: false
        };
        break;
      case 'fullAccess':
        permissions = familyService.getDefaultPermissions('admin');
        break;
    }

    try {
      wx.showLoading({ title: '设置中...' });
      
      const promises = selectedMembers.map(memberId => 
        familyService.updateMemberPermissions(memberId, permissions)
      );
      
      await Promise.all(promises);
      
      wx.hideLoading();
      this.showToast('快捷权限设置成功', 'success');
      
      this.setData({ selectedMembers: [] });
      this.loadData();
      
    } catch (error) {
      wx.hideLoading();
      console.error('设置快捷权限失败:', error);
      this.showToast('设置失败，请重试', 'error');
    }
  },

  /**
   * 选择角色模板
   */
  selectRole(e) {
    const role = e.currentTarget.dataset.role;
    
    wx.showModal({
      title: role.name,
      content: `${role.description}\n\n当前有 ${role.memberCount} 位成员使用此角色`,
      confirmText: '查看详情',
      success: (res) => {
        if (res.confirm) {
          // 切换到权限详情页面
          this.setData({ activeTab: 'permissions' });
        }
      }
    });
  },

  /**
   * 创建自定义角色
   */
  createCustomRole() {
    wx.showModal({
      title: '自定义角色',
      content: '此功能正在开发中，敬请期待',
      showCancel: false
    });
  },

  /**
   * 切换权限分组展开状态
   */
  togglePermissionGroup(e) {
    const category = e.currentTarget.dataset.category;
    const permissionGroups = this.data.permissionGroups.map(group => {
      if (group.category === category) {
        return { ...group, expanded: !group.expanded };
      }
      return group;
    });

    this.setData({
      permissionGroups
    });
  },

  /**
   * 切换分组展开状态（WXML中使用的方法名）
   */
  toggleGroup(e) {
    const category = e.currentTarget.dataset.category;
    const permissionGroups = this.data.permissionGroups.map(group => {
      if (group.category === category) {
        return { ...group, expanded: !group.expanded };
      }
      return group;
    });

    this.setData({
      permissionGroups
    });
  },

  /**
   * 切换权限选择
   */
  togglePermission(e) {
    const permissionKey = e.currentTarget.dataset.permission;
    const selectedPermissions = { ...this.data.selectedPermissions };
    
    selectedPermissions[permissionKey] = !selectedPermissions[permissionKey];
    
    this.setData({
      selectedPermissions
    });
  },

  /**
   * 应用权限模板
   */
  applyTemplate(e) {
    const templateId = e.currentTarget.dataset.templateId;
    const template = this.data.permissionTemplates.find(t => t.id === templateId);
    
    if (!template) return;
    
    this.setData({
      selectedPermissions: { ...template.permissions }
    });
    
    this.showToast(`已应用${template.name}模板`, 'success');
  },

  /**
   * 应用到所选成员
   */
  async applyToSelected() {
    const { selectedMembers, selectedPermissions } = this.data;
    
    if (selectedMembers.length === 0) {
      this.showToast('请先选择要应用权限的成员', 'warning');
      return;
    }
    
    const hasSelectedPermissions = Object.values(selectedPermissions).some(Boolean);
    if (!hasSelectedPermissions) {
      this.showToast('请先选择要应用的权限', 'warning');
      return;
    }
    
    wx.showModal({
      title: '确认应用权限',
      content: `将选中的权限应用到 ${selectedMembers.length} 位成员？`,
      success: async (res) => {
        if (res.confirm) {
          await this.batchApplyPermissions();
        }
      }
    });
  },

  /**
   * 批量应用权限
   */
  async batchApplyPermissions() {
    try {
      wx.showLoading({ title: '应用中...' });
      
      const { selectedMembers, selectedPermissions, members } = this.data;
      
      // 过滤掉 owner 成员
      const validTargets = selectedMembers.filter(id => {
        const member = members.find(m => m.id === id);
        return member && member.role !== 'owner';
      });
      
      if (validTargets.length === 0) {
        wx.hideLoading();
        this.showToast('无可应用的成员（已过滤创建者）', 'info');
        return;
      }
      
      // 并行更新所有选中成员的权限
      const promises = validTargets.map(memberId => 
        familyService.updateMemberPermissions(memberId, selectedPermissions)
      );
      
      await Promise.all(promises);
      
      wx.hideLoading();
      this.showToast('权限应用成功', 'success');
      
      // 清空选择状态并刷新数据
      this.setData({
        selectedMembers: [],
        selectedPermissions: {},
        isAllSelected: false
      });
      
      this.loadData();
      
    } catch (error) {
      wx.hideLoading();
      console.error('批量应用权限失败:', error);
      this.showToast('应用失败，请重试', 'error');
    }
  },

  /**
   * 切换权限分类展开状态（兼容旧方法）
   */
  toggleCategory(e) {
    const category = e.currentTarget.dataset.category;
    const categories = this.data.permissionCategories?.map(cat => {
      if (cat.category === category) {
        return { ...cat, expanded: !cat.expanded };
      }
      return cat;
    }) || [];

    this.setData({
      permissionCategories: categories
    });
  },

  /**
   * 展开/收起所有分类
   */
  expandAll() {
    const { allExpanded } = this.data;
    const categories = this.data.permissionCategories.map(cat => ({
      ...cat,
      expanded: !allExpanded
    }));

    this.setData({
      permissionCategories: categories,
      allExpanded: !allExpanded
    });
  },

  /**
   * 获取权限值
   */
  getPermissionValue(permissionKey, role) {
    const defaultPermissions = familyService.getDefaultPermissions(role);
    return defaultPermissions[permissionKey] || false;
  },

  /**
   * 权限开关变更
   */
  onPermissionChange(e) {
    const permission = e.currentTarget.dataset.permission;
    const role = e.currentTarget.dataset.role;
    const value = e.detail.value;
    
    // 这里可以实现实时权限更新
    console.log(`权限 ${permission} 对角色 ${role} 设置为 ${value}`);
    
    // 暂时只显示提示，实际项目中需要调用API更新
    this.showToast(`${role} 的 ${permission} 权限已${value ? '开启' : '关闭'}`, 'info');
  },

  /**
   * 检查是否可以编辑成员
   */
  canEditMember(member) {
    const { currentUserRole } = this.data;
    
    // 创建者可以编辑所有人（除了自己）
    if (currentUserRole === 'owner') {
      return member.role !== 'owner';
    }
    
    // 管理员只能编辑普通成员
    if (currentUserRole === 'admin') {
      return member.role === 'member' || member.role === 'viewer';
    }
    
    return false;
  },

  /**
   * 检查是否可以移除成员
   */
  canRemoveMember(member) {
    const { currentUserRole } = this.data;
    
    // 只有创建者可以移除成员
    if (currentUserRole === 'owner') {
      return member.role !== 'owner';
    }
    
    return false;
  },

  /**
   * 检查是否可以编辑角色
   */
  canEditRole(role) {
    const { currentUserRole } = this.data;
    
    if (currentUserRole === 'owner') {
      return true;
    }
    
    if (currentUserRole === 'admin') {
      return role === 'member' || role === 'viewer';
    }
    
    return false;
  },

  /**
   * 获取角色文本
   */
  getRoleText(role) {
    const roleMap = {
      'owner': '创建者',
      'admin': '管理员',
      'member': '成员',
      'viewer': '查看者'
    };
    return roleMap[role] || '成员';
  },

  /**
   * 格式化日期
   */
  formatDate(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  /**
   * 显示提示
   */
  showToast(message, type = 'success') {
    this.setData({
      showToast: true,
      toastMessage: message,
      toastType: type
    });
    
    // 自动隐藏
    setTimeout(() => {
      this.setData({
        showToast: false
      });
    }, 2000);
  }
});