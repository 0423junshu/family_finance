// pages/init-db-simple/init-db-simple.js
Page({
  data: {
    status: '准备初始化数据库...',
    results: [],
    isRunning: false
  },

  onLoad() {
    console.log('[INIT-DB] 页面加载');
  },

  async onInitDatabase() {
    if (this.data.isRunning) return;
    
    this.setData({ 
      isRunning: true, 
      status: '正在初始化数据库...', 
      results: [] 
    });

    try {
      // 方法1: 尝试调用云函数初始化
      await this.tryCloudFunction();
      
      // 方法2: 如果云函数失败，直接创建集合
      await this.tryDirectInit();
      
    } catch (error) {
      console.error('[INIT-DB] 初始化失败:', error);
      this.addResult('error', '初始化失败', error.message);
    } finally {
      this.setData({ isRunning: false });
    }
  },

  async tryCloudFunction() {
    this.addResult('info', '尝试云函数初始化', '调用 initDatabase 云函数...');
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'initDatabase',
        data: {}
      });
      
      if (result.result && result.result.success) {
        this.addResult('success', '云函数初始化', '成功');
        this.setData({ status: '云函数初始化成功！' });
        return true;
      } else {
        throw new Error(result.result?.message || '云函数执行失败');
      }
    } catch (error) {
      this.addResult('warning', '云函数初始化', `失败: ${error.message}`);
      return false;
    }
  },

  async tryDirectInit() {
    this.addResult('info', '直接创建集合', '开始创建必要的数据库集合...');
    
    const collections = [
      'families',
      'family_members', 
      'family_invites',
      'transactions',
      'categories',
      'accounts',
      'data_conflicts',
      'data_locks',
      'data_versions'
    ];

    const db = wx.cloud.database();
    
    for (const collectionName of collections) {
      try {
        // 检查集合是否存在
        await db.collection(collectionName).limit(1).get();
        this.addResult('info', `集合 ${collectionName}`, '已存在');
      } catch (error) {
        if (error.errCode === -502005) {
          // 集合不存在，创建它
          try {
            // 通过添加临时文档创建集合
            const tempResult = await db.collection(collectionName).add({
              data: {
                _temp: true,
                _created: new Date(),
                _purpose: `创建集合 ${collectionName}`
              }
            });
            
            // 立即删除临时文档
            await db.collection(collectionName).doc(tempResult._id).remove();
            
            this.addResult('success', `集合 ${collectionName}`, '创建成功');
          } catch (createError) {
            this.addResult('error', `集合 ${collectionName}`, `创建失败: ${createError.message}`);
          }
        } else {
          this.addResult('error', `集合 ${collectionName}`, `检查失败: ${error.message}`);
        }
      }
    }
    
    this.setData({ status: '数据库初始化完成！' });
  },

  addResult(type, title, message) {
    const results = this.data.results;
    results.push({
      type,
      title,
      message,
      time: new Date().toLocaleTimeString()
    });
    this.setData({ results });
  },

  onTestFamily() {
    // 测试家庭功能
    wx.navigateTo({
      url: '/pages/family/family'
    });
  }
});