/**
 * 测试配置文件
 */

module.exports = {
  // 测试环境配置
  environment: {
    baseUrl: 'https://localhost:3000',
    timeout: 10000,
    retries: 3
  },

  // 测试数据配置
  testData: {
    // 测试用户
    testUsers: [
      {
        id: 'user_001',
        openid: 'test_openid_001',
        nickName: '测试用户1',
        avatarUrl: '/images/test-avatar1.png',
        role: 'owner'
      },
      {
        id: 'user_002', 
        openid: 'test_openid_002',
        nickName: '测试用户2',
        avatarUrl: '/images/test-avatar2.png',
        role: 'admin'
      },
      {
        id: 'user_003',
        openid: 'test_openid_003', 
        nickName: '测试用户3',
        avatarUrl: '/images/test-avatar3.png',
        role: 'member'
      }
    ],

    // 测试家庭
    testFamilies: [
      {
        id: 'family_001',
        name: '测试家庭',
        familyCode: 'ABC123',
        ownerId: 'test_openid_001',
        memberCount: 3
      }
    ],

    // 测试设备
    testDevices: [
      { name: 'iPhone SE', width: 375, height: 667, dpr: 2 },
      { name: 'iPhone 12', width: 390, height: 844, dpr: 3 },
      { name: 'iPhone 12 Pro Max', width: 428, height: 926, dpr: 3 },
      { name: '小米手机', width: 393, height: 851, dpr: 2.75 },
      { name: '华为手机', width: 360, height: 780, dpr: 3 }
    ]
  },

  // 性能基准
  performanceBenchmarks: {
    pageLoadTime: 2000, // ms
    buttonResponseTime: 300, // ms
    dataRefreshTime: 3000, // ms
    navigationTime: 500, // ms
    firstPaintTime: 1000, // ms
    memoryUsage: 100 // MB
  },

  // UI规范
  uiStandards: {
    spacing: {
      small: '20rpx',
      medium: '32rpx', 
      large: '40rpx'
    },
    fontSize: {
      title: '32rpx-36rpx',
      subtitle: '28rpx',
      body: '26rpx',
      caption: '24rpx'
    },
    borderRadius: {
      card: '16rpx-24rpx',
      button: '12rpx'
    },
    colors: {
      primary: '#667eea',
      secondary: '#764ba2',
      textPrimary: '#1a1a1a',
      textSecondary: '#666666',
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107'
    }
  },

  // 测试页面配置
  pages: {
    me: {
      path: 'pages/me/me',
      title: '我的',
      maxLoadTime: 1500
    },
    family: {
      path: 'pages/family/family',
      title: '家庭管理',
      maxLoadTime: 2000
    },
    joinFamily: {
      path: 'pages/join-family/join-family',
      title: '加入家庭',
      maxLoadTime: 1500
    }
  }
};