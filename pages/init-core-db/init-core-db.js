// pages/init-core-db/init-core-db.js
Page({
  data: {
    status: '准备初始化核心数据库集合...',
    results: [],
    isRunning: false,
    coreCollections: [
      'families',
      'family_members', 
      'transactions'
    ]
  },

  onLoad() {
    console.log('[INIT-CORE-DB] 页面加载');
  },

  async onInitCore() {
    if (this.data.isRunning) return;
    
    this.setData({ 
      isRunning: true, 
      status: '正在初始化核心集合...', 
      results: [] 
    });

    try {
      await this.createCoreCollections();
      this.setData({ status: '核心集合初始化完成！可以测试家庭功能了' });
    } catch (error) {
      console.error('[INIT-CORE-DB] 初始化失败:', error);
      this.addResult('error', '初始化失败', error.message);
      this.setData({ status: '初始化失败，请查看详细信息' });
    } finally {
      this.setData({ isRunning: false });
    }
  },

  async createCoreCollections() {
    const db = wx.cloud.database();
    const collections = this.data.coreCollections;
    
    for (const collectionName of collections) {
      try {
        // 检查集合是否存在
        const checkResult = await db.collection(collectionName).limit(1).get();
        this.addResult('success', `集合 ${collectionName}`, '已存在');
      } catch (error) {
        if (error.errCode === -502005) {
          // 集合不存在，创建它
          try {
            await this.createCollection(collectionName);
            this.addResult('success', `集合 ${collectionName}`, '创建成功');
          } catch (createError) {
            this.addResult('error', `集合 ${collectionName}`, `创建失败: ${createError.message}`);
            // 提供手动创建建议
            this.addResult('info', '手动创建建议', `请在云开发控制台手动创建集合: ${collectionName}`);
          }
        } else {
          this.addResult('error', `集合 ${collectionName}`, `检查失败: ${error.message}`);
        }
      }
    }
  },

  async createCollection(collectionName) {
    const db = wx.cloud.database();
    
    // 创建一个示例文档来初始化集合
    let sampleData = {};
    
    switch (collectionName) {
      case 'families':
        sampleData = {
          name: '示例家庭',
          createdBy: 'system',
          createdAt: new Date(),
          members: [],
          _temp: true
        };
        break;
      case 'family_members':
        sampleData = {
          familyId: 'temp',
          userId: 'system',
          role: 'admin',
          joinedAt: new Date(),
          _temp: true
        };
        break;
      case 'transactions':
        sampleData = {
          amount: 0,
          type: 'expense',
          category: '其他',
          description: '示例交易',
          date: new Date(),
          userId: 'system',
          _temp: true
        };
        break;
      default:
        sampleData = {
          _temp: true,
          _created: new Date(),
          _purpose: `初始化集合 ${collectionName}`
        };
    }
    
    // 添加示例文档
    const result = await db.collection(collectionName).add({
      data: sampleData
    });
    
    // 立即删除示例文档
    await db.collection(collectionName).doc(result._id).remove();
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
    wx.navigateTo({
      url: '/pages/family/family'
    });
  },

  onManualCreate() {
    wx.showModal({
      title: '手动创建集合',
      content: '请在微信开发者工具的"云开发"面板中，进入"数据库"选项卡，手动创建以下集合：\n\n1. families\n2. family_members\n3. transactions\n\n创建后点击"测试家庭功能"验证。',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});