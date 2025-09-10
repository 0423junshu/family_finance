// pages/db-validator/db-validator.js
Page({
  data: {
    checkResults: [],
    isChecking: false,
    cloudFunctions: [
      { name: 'login', status: 'unknown' },
      { name: 'initDatabase', status: 'unknown' }
    ],
    collections: [
      'families',
      'family_members', 
      'family_invites',
      'transactions',
      'categories',
      'accounts',
      'data_conflicts',
      'data_locks',
      'data_versions'
    ]
  },

  onLoad() {
    console.log('[DB-VALIDATOR] 页面加载');
    this.checkAll();
  },

  async checkAll() {
    this.setData({ isChecking: true, checkResults: [] });
    
    try {
      // 检查云函数状态
      await this.checkCloudFunctions();
      
      // 检查数据库集合
      await this.checkDatabaseCollections();
      
      // 尝试运行数据库初始化
      await this.tryInitDatabase();
      
    } catch (error) {
      console.error('[DB-VALIDATOR] 检查失败:', error);
      this.addResult('error', '检查过程出错', error.message);
    } finally {
      this.setData({ isChecking: false });
    }
  },

  async checkCloudFunctions() {
    this.addResult('info', '检查云函数状态', '开始检查...');
    
    // 检查 login 云函数
    try {
      const loginResult = await wx.cloud.callFunction({
        name: 'login',
        data: { test: true }
      });
      this.addResult('success', 'login 云函数', '部署正常');
    } catch (error) {
      this.addResult('error', 'login 云函数', `部署异常: ${error.message}`);
    }

    // 检查 initDatabase 云函数
    try {
      const initResult = await wx.cloud.callFunction({
        name: 'initDatabase',
        data: { test: true }
      });
      this.addResult('success', 'initDatabase 云函数', '部署正常');
    } catch (error) {
      this.addResult('error', 'initDatabase 云函数', `部署异常: ${error.message}`);
    }
  },

  async checkDatabaseCollections() {
    this.addResult('info', '检查数据库集合', '开始检查...');
    
    const db = wx.cloud.database();
    const collections = this.data.collections;
    
    for (const collectionName of collections) {
      try {
        await db.collection(collectionName).limit(1).get();
        this.addResult('success', `集合 ${collectionName}`, '存在');
      } catch (error) {
        if (error.errCode === -502005) {
          this.addResult('warning', `集合 ${collectionName}`, '不存在，需要初始化');
        } else {
          this.addResult('error', `集合 ${collectionName}`, `检查失败: ${error.message}`);
        }
      }
    }
  },

  async tryInitDatabase() {
    this.addResult('info', '尝试数据库初始化', '开始执行...');
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'initDatabase',
        data: {}
      });
      
      if (result.result && result.result.success) {
        this.addResult('success', '数据库初始化', '执行成功');
        
        // 显示详细结果
        if (result.result.results) {
          result.result.results.forEach(item => {
            this.addResult('info', `集合 ${item.collection}`, item.message);
          });
        }
        
        // 重新检查集合状态
        setTimeout(() => {
          this.checkDatabaseCollections();
        }, 2000);
        
      } else {
        this.addResult('error', '数据库初始化', result.result?.message || '执行失败');
      }
    } catch (error) {
      this.addResult('error', '数据库初始化', `执行失败: ${error.message}`);
    }
  },

  addResult(type, title, message) {
    const results = this.data.checkResults;
    results.push({
      type,
      title,
      message,
      time: new Date().toLocaleTimeString()
    });
    this.setData({ checkResults: results });
  },

  onRetryInit() {
    this.tryInitDatabase();
  },

  onRecheck() {
    this.checkAll();
  },

  onClearResults() {
    this.setData({ checkResults: [] });
  }
});