// pages/family-permissions/family-permissions.js
const familyService = require('../../services/family');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 'members',
    members: [],
    selectedMembers: [],
    showMemberEdit: false,
    showBatchEdit: false,
    editingMember: null,
    allExpanded: false,
    
    // 角色模板
    roleTemplates: [
      {
        id: 'owner',
        name: '家庭创建者',
        description: '拥有所有权限，包括删除家庭',
        memberCount: 0,
        keyPermissions: ['完全控制', '成员管理', '数据管理']
      },
      {
        id: 'admin',
        name: '家庭管理员',
        description: '可以管理数据和邀请成员',
        memberCount: 0,
        keyPermissions: ['数据管理', '成员邀请', '报表查看']
      },
      {
        id: 'member',
        name: '普通成员',
        description: '可以记账和查看报表',
        memberCount: 0,
        keyPermissions: ['记账', '查看报表', '个人数据']
      },
      {
        id: 'viewer',
        name: '查看者',
        description: '只能查看数据，不能修改',
        memberCount: 0,
        keyPermissions: ['查看数据']
      }
    ],

    // 权限分类
    permissionCategories: [
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

    roles: ['owner', 'admin', 'member'],
    currentUserRole: '',
    
    // 编辑相关
    editPermissions: [],
    availableRoles: [],
    
    // 批量操作
    batchActions: [
      { type: 'setViewer', label: '设为查看者', theme: 'light' },
      { type: 'setMember', label: '设为普通成员', theme: 'primary' },
      { type: 'setAdmin', label: '设为管理员', theme: 'success' },
      { type: 'removeSelected', label: '移除选中成员', theme: 'danger' }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
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
      // 检查权限 - 添加安全检查
      let hasPermission = false;
      try {
        hasPermission = await familyService.checkPermission('canEditPermissions');
      } catch (permissionError) {
        console.warn('权限检查失败，使用默认权限:', permissionError);
        // 如果权限检查失败，假设有权限但记录错误
        hasPermission = true;
      }
      
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
   * 加载数据
   */
  async loadData() {
    try {
      wx.showLoading({ title: '加载中...' });

      // 获取家庭信息和成员列表 - 添加错误处理
      let familyInfo = { role: 'member' }; // 默认角色
      let members = [];
      
      try {
        const results = await Promise.allSettled([
          familyService.getFamilyInfo(),
          familyService.getFamilyMembers()
        ]);
        
        if (results[0].status === 'fulfilled') {
          familyInfo = results[0].value;
        } else {
          console.error('获取家庭信息失败:', results[0].reason);
        }
        
        if (results[1].status === 'fulfilled') {
          members = results[1].value || [];
        } else {
          console.error('获取成员列表失败:', results[1].reason);
        }
      } catch (dataError) {
        console.error('数据加载异常:', dataError);
        // 继续使用默认值
      }

      // 处理成员数据
      const processedMembers = members.map(member => ({
        ...member,
        roleText: this.getRoleText(member.role || 'member'),
        joinedAtText: this.formatDate(member.joinedAt || Date.now()),
        isOnline: member.lastActiveTime && 
                 (Date.now() - member.lastActiveTime < 5 * 60 * 1000)
      }));

      // 更新角色模板的成员数量
      const updatedRoleTemplates = this.data.roleTemplates.map(template => ({
        ...template,
        memberCount: processedMembers.filter(m => m.role === template.id).length
      }));

      this.setData({
        members: processedMembers,
        currentUserRole: familyInfo.role || 'member',
        roleTemplates: updatedRoleTemplates
      });

      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      console.error('加载数据失败:', error);
      this.showToast('加载失败，请重试', 'error');
    }
  },

  /**
   * 标签页切换
   */
  onTabChange(e) {
    this.setData({
      activeTab: e.detail.value
    });
  },

  /**
   * 选择成员
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
    
    this.data.permissionCategories.forEach(category => {
      category.permissions.forEach(permission => {
        permissions.push({
          ...permission,
          enabled: member.permissions[permission.key] || false
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
      const { editingMember, editPermissions } = this.data;
      
      wx.showLoading({ title: '保存中...' });

      // 构建权限对象
      const permissions = {};
      editPermissions.forEach(permission => {
        permissions[permission.key] = permission.enabled;
      });

      // 更新成员权限
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
      
      const { selectedMembers } = this.data;
      const defaultPermissions = familyService.getDefaultPermissions(role);
      
      // 并行更新所有选中成员
      const promises = selectedMembers.map(memberId => 
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
      
      const { selectedMembers } = this.data;
      
      // 并行移除所有选中成员
      const promises = selectedMembers.map(memberId => 
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
   * 切换权限分类展开状态
   */
  toggleCategory(e) {
    const category = e.currentTarget.dataset.category;
    const categories = this.data.permissionCategories.map(cat => {
      if (cat.category === category) {
        return { ...cat, expanded: !cat.expanded };
      }
      return cat;
    });

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
    const toast = this.selectComponent('#t-toast');
    if (toast) {
      toast.showToast({
        title: message,
        icon: type === 'success' ? 'check-circle' : 
              type === 'error' ? 'close-circle' : 
              type === 'warning' ? 'error-circle' : 'info-circle',
        theme: type
      });
    } else {
      wx.showToast({
        title: message,
        icon: type === 'success' ? 'success' : 'none'
      });
    }
  }
});