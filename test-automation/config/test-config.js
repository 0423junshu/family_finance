// 测试配置文件
module.exports = {
  // 测试环境配置
  environments: {
    development: {
      baseUrl: 'http://localhost:3000',
      apiVersion: 'v1',
      timeout: 30000
    },
    staging: {
      baseUrl: 'https://staging.familyfinance.com',
      apiVersion: 'v1',
      timeout: 30000
    },
    production: {
      baseUrl: 'https://api.familyfinance.com',
      apiVersion: 'v1',
      timeout: 30000
    }
  },
  
  // 测试数据配置
  testData: {
    // 账户测试数据
    accounts: [
      {
        name: '现金账户',
        type: 'cash',
        balance: 5000,
        currency: 'CNY',
        icon: '💰'
      },
      {
        name: '银行卡',
        type: 'bank',
        balance: 20000,
        currency: 'CNY',
        icon: '💳'
      },
      {
        name: '支付宝',
        type: 'alipay',
        balance: 8000,
        currency: 'CNY',
        icon: '📱'
      }
    ],
    
    // 交易测试数据
    transactions: [
      {
        type: 'income',
        amount: 15000,
        category: '工资',
        account: '银行卡',
        date: '2024-12-01',
        description: '月度工资'
      },
      {
        type: 'expense',
        amount: 200,
        category: '餐饮',
        account: '现金账户',
        date: '2024-12-02',
        description: '午餐'
      },
      {
        type: 'expense',
        amount: 500,
        category: '交通',
        account: '支付宝',
        date: '2024-12-03',
        description: '地铁卡充值'
      }
    ],
    
    // 预算测试数据
    budgets: [
      {
        month: 12,
        year: 2024,
        amount: 10000,
        categories: {
          '餐饮': 2000,
          '交通': 1000,
          '娱乐': 1500,
          '购物': 3000,
          '其他': 2500
        }
      }
    ]
  },
  
  // 测试用例配置
  testCases: {
    // 账户管理测试配置
    accountManagement: {
      retryCount: 3,
      timeout: 10000,
      requiredFields: ['name', 'type', 'balance']
    },
    
    // 交易记录测试配置
    transactionRecording: {
      retryCount: 2,
      timeout: 8000,
      requiredFields: ['type', 'amount', 'category', 'account', 'date']
    },
    
    // 预算管理测试配置
    budgetManagement: {
      retryCount: 2,
      timeout: 12000,
      validationRules: {
        minAmount: 0,
        maxAmount: 1000000,
        categoryLimit: 20
      }
    },
    
    // 报表测试配置
    reportGeneration: {
      timeout: 15000,
      dataAccuracyThreshold: 0.99, // 99% 的准确率
      performanceThreshold: 2000 // 2秒内完成
    }
  },
  
  // 兼容性测试配置
  compatibility: {
    // 设备列表
    devices: [
      { name: 'iPhone 14 Pro', width: 393, height: 852, os: 'iOS' },
      { name: 'iPhone SE', width: 375, height: 667, os: 'iOS' },
      { name: 'Samsung Galaxy S22', width: 360, height: 780, os: 'Android' },
      { name: 'Google Pixel 6', width: 393, height: 851, os: 'Android' },
      { name: 'iPad Pro', width: 1024, height: 1366, os: 'iOS' }
    ],
    
    // 浏览器/微信版本
    platforms: [
      { name: '微信 iOS', version: '8.0.0+' },
      { name: '微信 Android', version: '8.0.0+' },
      { name: '微信开发者工具', version: '1.06.0+' }
    ]
  },
  
  // 性能测试配置
  performance: {
    // 并发用户数
    concurrentUsers: {
      low: 10,
      medium: 50,
      high: 100
    },
    
    // 响应时间阈值（毫秒）
    responseTimeThresholds: {
      excellent: 100,
      good: 300,
      acceptable: 500,
      poor: 1000
    },
    
    // 吞吐量阈值
    throughputThresholds: {
      excellent: 1000,
      good: 500,
      acceptable: 100,
      poor: 50
    }
  },
  
  // 错误处理配置
  errorHandling: {
    // 重试策略
    retryPolicy: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffFactor: 2
    },
    
    // 超时处理
    timeoutHandling: {
      globalTimeout: 30000,
      perRequestTimeout: 10000
    },
    
    // 错误日志配置
    logging: {
      level: 'debug', // error, warn, info, debug
      logToFile: true,
      logFile: './logs/test-errors.log'
    }
  },
  
  // 报告配置
  reporting: {
    // 报告格式
    formats: ['json', 'html', 'csv'],
    
    // 报告内容配置
    content: {
      includeScreenshots: true,
      includeNetworkLogs: true,
      includePerformanceMetrics: true,
      includeErrorDetails: true
    },
    
    // 报告保存配置
    storage: {
      localPath: './test-reports',
      cloudUpload: false,
      retentionDays: 30
    }
  },
  
  // 通知配置
  notifications: {
    // 邮件通知
    email: {
      enabled: false,
      recipients: ['team@familyfinance.com'],
      onFailure: true,
      onCompletion: true
    },
    
    // Slack通知
    slack: {
      enabled: false,
      webhookUrl: '',
      channel: '#test-notifications'
    },
    
    // 企业微信通知
    wechatWork: {
      enabled: false,
      webhookUrl: '',
      mentionedList: ['@all']
    }
  }
};