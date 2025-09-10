// pages/record/record-collaboration.js
/**
 * 记账页面协作功能集成示例
 * 展示如何在现有财务页面中集成协作功能
 */

const { collaborationHelper, CollaborationMixins } = require('../../utils/collaborationHelper');

Page({
  // 混入协作功能
  ...CollaborationMixins.FinancialPageMixin,

  data: {
    // 原有记账页面数据
    amount: '',
    category: '',
    description: '',
    account: '',
    type: 'expense', // income, expense
    
    // 分类列表
    categories: [],
    accounts: [],
    
    // UI状态
    loading: false,
    submitting: false,
    
    // 协作相关数据会通过 collaborationHelper 自动添加
    // collaborationEnabled: false,
    // isInFamily: false,
    // currentUserPermissions: {},
    // lockedData: [],
    // conflicts: [],
    // memberActivities: [],
    // etc...
  },

  async onLoad(options) {
    try {
      // 调用混入的 onLoad 方法初始化协作功能
      await CollaborationMixins.FinancialPageMixin.onLoad.call(this, options);
      
      // 执行原有的页面初始化逻辑
      await this.initPageData();
      
    } catch (error) {
      console.error('页面初始化失败:', error);
      wx.showToast({
        title: '页面加载失败',
        icon: 'error'
      });
    }
  },

  /**
   * 初始化页面数据
   */
  async initPageData() {
    try {
      this.setData({ loading: true });

      // 加载分类和账户数据
      await Promise.all([
        this.loadCategories(),
        this.loadAccounts()
      ]);

      this.setData({ loading: false });
    } catch (error) {
      console.error('初始化页面数据失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 加载分类数据
   */
  async loadCategories() {
    try {
      // 检查读取分类的权限
      const hasPermission = await this.checkPermission('read', 'category');
      if (!hasPermission) {
        console.warn('没有读取分类的权限');
        return;
      }

      // 模拟加载分类数据
      const categories = [
        { id: '1', name: '餐饮', icon: 'food', type: 'expense' },
        { id: '2', name: '交通', icon: 'car', type: 'expense' },
        { id: '3', name: '购物', icon: 'shop', type: 'expense' },
        { id: '4', name: '工资', icon: 'money', type: 'income' },
        { id: '5', name: '投资', icon: 'chart', type: 'income' }
      ];

      this.setData({ categories });
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  },

  /**
   * 加载账户数据
   */
  async loadAccounts() {
    try {
      // 检查读取账户的权限
      const hasPermission = await this.checkPermission('read', 'account');
      if (!hasPermission) {
        console.warn('没有读取账户的权限');
        return;
      }

      // 模拟加载账户数据
      const accounts = [
        { id: '1', name: '现金', balance: 1000, type: 'cash' },
        { id: '2', name: '银行卡', balance: 5000, type: 'bank' },
        { id: '3', name: '支付宝', balance: 800, type: 'alipay' },
        { id: '4', name: '微信', balance: 300, type: 'wechat' }
      ];

      this.setData({ accounts });
    } catch (error) {
      console.error('加载账户失败:', error);
    }
  },

  /**
   * 输入金额
   */
  onAmountInput(e) {
    this.setData({
      amount: e.detail.value
    });
  },

  /**
   * 选择分类
   */
  onCategorySelect(e) {
    const categoryId = e.currentTarget.dataset.id;
    const category = this.data.categories.find(c => c.id === categoryId);
    
    this.setData({
      category: category
    });
  },

  /**
   * 选择账户
   */
  onAccountSelect(e) {
    const accountId = e.currentTarget.dataset.id;
    const account = this.data.accounts.find(a => a.id === accountId);
    
    this.setData({
      account: account
    });
  },

  /**
   * 输入描述
   */
  onDescriptionInput(e) {
    this.setData({
      description: e.detail.value
    });
  },

  /**
   * 切换收支类型
   */
  onTypeChange(e) {
    this.setData({
      type: e.detail.value,
      category: '' // 重置分类选择
    });
  },

  /**
   * 提交记账记录（集成协作功能）
   */
  async onSubmit() {
    try {
      // 验证输入
      if (!this.validateInput()) {
        return;
      }

      this.setData({ submitting: true });

      // 构建交易数据
      const transactionData = {
        amount: parseFloat(this.data.amount),
        categoryId: this.data.category.id,
        categoryName: this.data.category.name,
        accountId: this.data.account.id,
        accountName: this.data.account.name,
        type: this.data.type,
        description: this.data.description,
        date: new Date().toISOString(),
        userId: wx.getStorageSync('userInfo')?.userId
      };

      // 使用协作功能创建交易记录
      const result = await this.createTransactionWithCollaboration(transactionData);

      if (result.success) {
        this.showCollaborationSuccess('记账成功');
        this.resetForm();
        
        // 如果在家庭中，显示协作提示
        if (this.data.isInFamily) {
          this.showCollaborationInfo('记录已同步到家庭成员');
        }
      } else {
        throw new Error(result.message || '记账失败');
      }

    } catch (error) {
      console.error('提交记账失败:', error);
      this.showCollaborationError(error.message);
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 使用协作功能创建交易记录
   */
  async createTransactionWithCollaboration(transactionData) {
    return await this.executeCollaborativeOperation(
      'create',
      'transaction',
      async () => {
        // 这里是原始的创建交易逻辑
        return await this.originalCreateTransaction(transactionData);
      },
      {
        syncAfterOperation: true,
        requireLock: false,
        conflictPrevention: true
      }
    );
  },

  /**
   * 原始创建交易方法
   */
  async originalCreateTransaction(transactionData) {
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            id: Date.now().toString(),
            ...transactionData,
            createdAt: new Date().toISOString()
          }
        });
      }, 1000);
    });
  },

  /**
   * 验证输入
   */
  validateInput() {
    if (!this.data.amount || parseFloat(this.data.amount) <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'error'
      });
      return false;
    }

    if (!this.data.category) {
      wx.showToast({
        title: '请选择分类',
        icon: 'error'
      });
      return false;
    }

    if (!this.data.account) {
      wx.showToast({
        title: '请选择账户',
        icon: 'error'
      });
      return false;
    }

    return true;
  },

  /**
   * 重置表单
   */
  resetForm() {
    this.setData({
      amount: '',
      category: '',
      account: '',
      description: ''
    });
  },

  /**
   * 显示协作面板
   */
  onShowCollaborationPanel() {
    this.showCollaborationPanel();
  },

  /**
   * 显示成员列表
   */
  onShowMemberList() {
    this.showMemberList();
  },

  /**
   * 处理冲突解决
   */
  onResolveConflict(e) {
    const conflict = e.detail.conflict;
    
    wx.navigateTo({
      url: `/pages/conflict-resolution/conflict-resolution?conflictId=${conflict.id}`
    });
  },

  /**
   * 查看操作日志
   */
  onViewOperationLogs() {
    wx.navigateTo({
      url: '/pages/operation-logs/operation-logs'
    });
  },

  /**
   * 管理家庭权限
   */
  onManagePermissions() {
    wx.navigateTo({
      url: '/pages/family-permissions/family-permissions'
    });
  },

  /**
   * 手动同步数据
   */
  async onManualSync() {
    try {
      wx.showLoading({
        title: '同步中...'
      });

      // 触发手动同步
      await this.triggerManualSync();

      wx.hideLoading();
      this.showCollaborationSuccess('同步完成');

    } catch (error) {
      console.error('手动同步失败:', error);
      wx.hideLoading();
      this.showCollaborationError('同步失败');
    }
  },

  /**
   * 触发手动同步
   */
  async triggerManualSync() {
    // 这里应该调用同步服务
    return new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  },

  /**
   * 显示协作信息提示
   */
  showCollaborationInfo(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 页面分享（协作功能）
   */
  onShareAppMessage() {
    if (this.data.isInFamily && this.data.familyInfo) {
      return {
        title: `邀请您加入"${this.data.familyInfo.name}"家庭账本`,
        path: `/pages/join-family/join-family?familyCode=${this.data.familyInfo.code}`,
        imageUrl: '/images/share-family.png'
      };
    }

    return {
      title: '一起记账，共享财务',
      path: '/pages/index/index'
    };
  },

  /**
   * 页面分享到朋友圈（协作功能）
   */
  onShareTimeline() {
    if (this.data.isInFamily && this.data.familyInfo) {
      return {
        title: `邀请您加入"${this.data.familyInfo.name}"家庭账本`,
        query: `familyCode=${this.data.familyInfo.code}`,
        imageUrl: '/images/share-family.png'
      };
    }

    return {
      title: '一起记账，共享财务'
    };
  },

  /**
   * 处理协作事件
   */
  onCollaborationEvent(e) {
    const { type, data } = e.detail;
    
    switch (type) {
      case 'member_joined':
        this.showCollaborationInfo(`${data.memberName} 加入了家庭`);
        this.loadFamilyMembers();
        break;
        
      case 'member_left':
        this.showCollaborationInfo(`${data.memberName} 离开了家庭`);
        this.loadFamilyMembers();
        break;
        
      case 'permission_changed':
        this.showCollaborationInfo('权限设置已更新');
        this.refreshCollaborationStatus();
        break;
        
      case 'data_conflict':
        this.showConflictDialog(data.conflicts);
        break;
        
      default:
        console.log('未处理的协作事件:', type, data);
    }
  },

  /**
   * 页面隐藏时释放资源
   */
  onHide() {
    // 调用混入的 onHide 方法
    if (CollaborationMixins.FinancialPageMixin.onHide) {
      CollaborationMixins.FinancialPageMixin.onHide.call(this);
    }
  },

  /**
   * 页面卸载时清理资源
   */
  onUnload() {
    // 调用混入的 onUnload 方法
    if (CollaborationMixins.FinancialPageMixin.onUnload) {
      CollaborationMixins.FinancialPageMixin.onUnload.call(this);
    }
  }
});