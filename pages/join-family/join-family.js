// pages/join-family/join-family.js
const familyService = require('../../services/family');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    currentStep: 'select', // select, input, scan, result
    familyCode: '',
    joining: false,
    loading: false,
    loadingText: '',
    joinResult: {
      success: false,
      title: '',
      description: ''
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    // 检查用户登录状态 - 同时检查全局数据和本地存储
    const app = getApp();
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    
    if (!userInfo || (!userInfo.openid && !userInfo._id)) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      wx.redirectTo({
        url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/join-family/join-family')
      });
      return;
    }

    // 检查是否通过链接或二维码进入
    if (options.familyCode) {
      this.setData({
        familyCode: options.familyCode,
        currentStep: 'input'
      });
    } else if (options.code) {
      // 通过二维码扫描进入
      this.setData({
        familyCode: options.code,
        currentStep: 'input'
      });
    }
  },

  /**
   * 选择加入方式
   */
  selectMethod(e) {
    const method = e.currentTarget.dataset.method;
    
    switch (method) {
      case 'code':
        this.setData({ currentStep: 'input' });
        break;
      case 'scan':
        this.requestCameraPermission();
        break;
      case 'link':
        this.showToast('请通过邀请链接打开小程序', 'info');
        break;
    }
  },

  /**
   * 请求相机权限
   */
  requestCameraPermission() {
    wx.authorize({
      scope: 'scope.camera',
      success: () => {
        this.setData({ currentStep: 'scan' });
      },
      fail: () => {
        wx.showModal({
          title: '需要相机权限',
          content: '扫描二维码需要使用相机，请在设置中开启相机权限',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      }
    });
  },

  /**
   * 家庭码输入变化
   */
  onFamilyCodeChange(e) {
    const value = e.detail.value.toUpperCase();
    this.setData({
      familyCode: value
    });
  },

  /**
   * 扫描二维码
   */
  onScanCode(e) {
    const result = e.detail.result;
    
    try {
      // 解析二维码内容
      let familyCode = '';
      
      if (result.includes('familyCode=')) {
        // URL参数格式
        const urlParams = new URLSearchParams(result.split('?')[1]);
        familyCode = urlParams.get('familyCode');
      } else if (result.includes('code=')) {
        // 简单参数格式
        const match = result.match(/code=([A-Z0-9]{6})/);
        familyCode = match ? match[1] : '';
      } else if (/^[A-Z0-9]{6}$/.test(result)) {
        // 纯家庭码
        familyCode = result;
      }

      if (familyCode && familyCode.length === 6) {
        this.setData({
          familyCode: familyCode,
          currentStep: 'input'
        });
        this.showToast('二维码识别成功', 'success');
      } else {
        this.showToast('无效的邀请二维码', 'error');
      }

    } catch (error) {
      console.error('解析二维码失败:', error);
      this.showToast('二维码解析失败', 'error');
    }
  },

  /**
   * 加入家庭
   */
  async joinFamily() {
    const { familyCode } = this.data;
    
    if (!familyCode || familyCode.length !== 6) {
      this.showToast('请输入6位家庭码', 'error');
      return;
    }

    this.setData({ joining: true });

    try {
      const result = await familyService.joinFamilyByCode(familyCode);
      
      this.setData({
        joining: false,
        currentStep: 'result',
        joinResult: {
          success: true,
          title: '加入成功！',
          description: `欢迎加入"${result.familyName}"，现在可以与家人一起管理财务了`
        }
      });

      // 记录成功加入的家庭
      wx.setStorageSync('currentFamilyId', result.familyId);
      
      // 延迟1秒后自动跳转到家庭管理页面
      setTimeout(() => {
        this.goToFamily();
      }, 1500);

    } catch (error) {
      console.error('加入家庭失败:', error);
      
      let errorMessage = '加入失败，请重试';
      if (error.message.includes('不存在')) {
        errorMessage = '家庭码不存在或已失效';
      } else if (error.message.includes('已加入')) {
        errorMessage = '您已加入其他家庭';
      } else if (error.message.includes('上限')) {
        errorMessage = '该家庭成员已达上限';
      }

      this.setData({
        joining: false,
        currentStep: 'result',
        joinResult: {
          success: false,
          title: '加入失败',
          description: errorMessage
        }
      });
    }
  },

  /**
   * 创建家庭
   */
  async createFamily() {
    this.setData({
      loading: true,
      loadingText: '创建家庭中...'
    });

    try {
      const result = await familyService.createFamily();
      
      this.setData({
        loading: false,
        currentStep: 'result',
        joinResult: {
          success: true,
          title: '家庭创建成功！',
          description: `家庭码：${result.familyCode}\n您可以邀请家人加入了`
        }
      });

      // 记录创建的家庭
      wx.setStorageSync('currentFamilyId', result.familyId);
      
      // 延迟1.5秒后自动跳转到家庭管理页面
      setTimeout(() => {
        this.goToFamily();
      }, 1500);

    } catch (error) {
      console.error('创建家庭失败:', error);
      
      this.setData({
        loading: false,
        currentStep: 'result',
        joinResult: {
          success: false,
          title: '创建失败',
          description: error.message || '创建家庭失败，请重试'
        }
      });
    }
  },

  /**
   * 返回上一步
   */
  goBack() {
    const { currentStep } = this.data;
    
    if (currentStep === 'input' || currentStep === 'scan') {
      this.setData({ 
        currentStep: 'select',
        familyCode: ''
      });
    } else {
      wx.navigateBack();
    }
  },

  /**
   * 重新尝试
   */
  retry() {
    this.setData({
      currentStep: 'select',
      familyCode: '',
      joinResult: {
        success: false,
        title: '',
        description: ''
      }
    });
  },

  /**
   * 进入家庭管理
   */
  goToFamily() {
    // 检查是否从家庭页面跳转过来
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    
    if (prevPage && prevPage.route === 'pages/family/family') {
      // 如果是从家庭页面跳转过来，返回并刷新
      wx.navigateBack({
        success: () => {
          // 通知家庭页面刷新数据
          if (prevPage.loadFamilyData) {
            prevPage.loadFamilyData();
          }
        }
      });
    } else {
      // 否则重定向到家庭页面
      wx.redirectTo({
        url: '/pages/family/family'
      });
    }
  },

  /**
   * 返回首页
   */
  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
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
              type === 'error' ? 'close-circle' : 'info-circle',
        theme: type
      });
    } else {
      wx.showToast({
        title: message,
        icon: type === 'success' ? 'success' : 'none'
      });
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '邀请您加入家庭财务管理',
      path: '/pages/join-family/join-family',
      imageUrl: '/images/share-join.png'
    };
  }
});