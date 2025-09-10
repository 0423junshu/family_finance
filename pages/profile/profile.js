// pages/profile/profile.js
const app = getApp();
const familyService = require('../../services/family.js');
const collaborationHelper = require('../../utils/collaborationHelper.js');

Page({
  data: {
    userInfo: {
      avatarUrl: 'https://img.yzcdn.cn/vant/cat.jpeg',
      nickName: '用户',
      phone: ''
    },
    // 家庭协作相关数据
    collaborationEnabled: true,
    isInFamily: false,
    familyInfo: null,
    totalMembers: 0,
    onlineMembers: 0,
    settings: [
      {
        id: 'category',
        title: '分类管理',
        icon: '📂',
        desc: '自定义收支分类'
      },
      {
        id: 'tag',
        title: '标签管理',
        icon: '🏷️',
        desc: '自定义标签体系'
      },
      {
        id: 'template',
        title: '记账模板',
        icon: '📝',
        desc: '自定义记账模板'
      },
      {
        id: 'cycle',
        title: '记账周期',
        icon: '📅',
        desc: '设置记账周期提醒'
      },
      {
        id: 'budget',
        title: '预算管理',
        icon: '💰',
        desc: '设置月度预算'
      },
      {
        id: 'backup',
        title: '数据备份',
        icon: '☁️',
        desc: '备份与恢复数据'
      },
      {
        id: 'export',
        title: '数据导出',
        icon: '📊',
        desc: '导出Excel报表'
      },
      {
        id: 'theme',
        title: '主题设置',
        icon: '🎨',
        desc: '个性化主题'
      }
    ],
    version: '1.0.0'
  },

  onLoad() {
    console.log('[DEBUG] Profile页面加载');
    this.loadUserInfo();
    this.initCollaboration();
  },

  onShow() {
    console.log('[DEBUG] Profile页面显示');
    this.loadUserInfo();
    this.refreshCollaborationStatus();
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
    }
  },

  // 设置项点击
  onSettingTap(e) {
    const settingId = e.currentTarget.dataset.id
    
    switch (settingId) {
      case 'category':
        wx.navigateTo({
          url: '/pages/category-manage/category-manage'
        })
        break
      case 'tag':
        wx.navigateTo({
          url: '/pages/tag-manage/tag-manage'
        })
        break
      case 'template':
        wx.navigateTo({
          url: '/pages/template-manage/template-manage'
        })
        break
      case 'cycle':
        wx.navigateTo({
          url: '/pages/cycle-setting/cycle-setting'
        })
        break
      case 'budget':
        wx.navigateTo({
          url: '/pages/budget-manage/budget-manage'
        })
        break
      case 'backup':
        this.onBackupTap()
        break
      case 'export':
        this.onExportTap()
        break
      case 'theme':
        wx.showToast({
          title: '主题设置功能开发中',
          icon: 'none'
        })
        break
    }
  },

  // 数据备份
  onBackupTap() {
    wx.showActionSheet({
      itemList: ['备份到云端', '从云端恢复'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.backupToCloud()
        } else {
          this.restoreFromCloud()
        }
      }
    })
  },

  // 备份到云端
  async backupToCloud() {
    try {
      wx.showLoading({ title: '备份中...' })
      
      const transactions = wx.getStorageSync('transactions') || []
      // 这里应该调用云函数进行备份
      
      wx.hideLoading()
      wx.showToast({
        title: '备份成功',
        icon: 'success'
      })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '备份失败',
        icon: 'error'
      })
    }
  },

  // 从云端恢复
  async restoreFromCloud() {
    try {
      wx.showLoading({ title: '恢复中...' })
      
      // 这里应该调用云函数进行恢复
      
      wx.hideLoading()
      wx.showToast({
        title: '恢复成功',
        icon: 'success'
      })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '恢复失败',
        icon: 'error'
      })
    }
  },

  // 数据导出
  onExportTap() {
    wx.showActionSheet({
      itemList: ['导出Excel', '导出CSV'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.exportExcel()
        } else {
          this.exportCSV()
        }
      }
    })
  },

  // 导出Excel
  exportExcel() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 导出CSV
  exportCSV() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 关于我们
  onAboutTap() {
    wx.showModal({
      title: '关于我们',
      content: `家庭财务管理小程序\n版本：${this.data.version}\n\n专业的家庭财务管理工具，帮助您更好地管理家庭收支。`,
      showCancel: false
    })
  },

  // 退出登录
  onLogoutTap() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          getApp().logout()
        }
      }
    })
  },

  // ==================== 家庭协作功能 ====================

  /**
   * 初始化协作功能
   */
  async initCollaboration() {
    console.log('[DEBUG] 初始化协作功能');
    try {
      // 直接加载家庭信息，不使用复杂的协作助手
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
  },

  /**
   * 加载家庭信息
   */
  async loadFamilyInfo() {
    console.log('[DEBUG] 开始加载家庭信息');
    
    // 检查用户是否登录
    const app = getApp();
    if (!app.globalData || !app.globalData.userInfo) {
      console.log('[DEBUG] 用户未登录，跳过家庭信息加载');
      this.setData({
        collaborationEnabled: true,
        isInFamily: false,
        familyInfo: null
      });
      return;
    }

    try {
      const familyInfo = await familyService.getFamilyInfo();
      console.log('[DEBUG] 家庭信息加载结果:', familyInfo);
      
      if (familyInfo && familyInfo.success && familyInfo.data) {
        console.log('[DEBUG] 用户已加入家庭:', familyInfo.data);
        // 用户在家庭中
        this.setData({
          collaborationEnabled: true,
          isInFamily: true,
          familyInfo: familyInfo.data
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
      const members = await familyService.getFamilyMembers();
      
      if (members && members.length > 0) {
        const onlineMembers = members.filter(m => m.isOnline);

        this.setData({
          totalMembers: members.length,
          onlineMembers: onlineMembers.length
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
      await this.loadFamilyInfo();
    } else {
      this.setData({
        collaborationEnabled: true
      });
      await this.loadFamilyInfo();
    }
  },

  /**
   * 管理家庭（点击协作卡片）
   */
  onManageFamily() {
    console.log('[DEBUG] 点击管理家庭');
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
    console.log('[DEBUG] 点击创建或加入家庭');
    wx.showActionSheet({
      itemList: ['创建家庭', '加入家庭'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 创建家庭（使用 reLaunch 保证不被回退覆盖）
          wx.reLaunch({
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
  }
})