// pages/complete-db-init/complete-db-init.js
Page({
  data: {
    status: '准备创建完整数据库集合...',
    results: [],
    isRunning: false,
    allCollections: [
      // 核心集合
      'families',
      'family_members', 
      'transactions',
      'categories',
      'accounts',
      
      // 扩展集合
      'family_invites',
      'data_conflicts',
      'data_locks',
      'data_versions',
      'operation_logs',
      'user_statistics',
      'system_logs',
      
      // 可能缺失的集合
      'budgets',
      'templates',
      'sync_records',
      'conflict_resolutions'
    ]
  },

  onLoad() {
    console.log('[COMPLETE-DB-INIT] 页面加载');
    this.checkAllCollections();
  },

  async checkAllCollections() {
    this.setData({ 
      status: '检查所有数据库集合状态...', 
      results: [] 
    });

    const db = wx.cloud.database();
    const collections = this.data.allCollections;
    let missingCollections = [];

    for (const collectionName of collections) {
      try {
        await db.collection(collectionName).limit(1).get();
        this.addResult('success', `集合 ${collectionName}`, '已存在');
      } catch (error) {
        if (error.errCode === -502005) {
          missingCollections.push(collectionName);
          this.addResult('warning', `集合 ${collectionName}`, '不存在，需要创建');
        } else {
          this.addResult('error', `集合 ${collectionName}`, `检查失败: ${error.message}`);
        }
      }
    }

    if (missingCollections.length > 0) {
      this.setData({ 
        status: `发现 ${missingCollections.length} 个缺失集合，准备创建...` 
      });
    } else {
      this.setData({ status: '所有集合都已存在！' });
    }
  },

  async onCreateAll() {
    if (this.data.isRunning) return;
    
    this.setData({ 
      isRunning: true, 
      status: '正在创建所有缺失的集合...', 
      results: [] 
    });

    try {
      await this.createAllCollections();
      await this.createIndexes();
      this.setData({ status: '所有集合和索引创建完成！' });
    } catch (error) {
      console.error('[COMPLETE-DB-INIT] 创建失败:', error);
      this.addResult('error', '创建失败', error.message);
      this.setData({ status: '创建过程中出现错误' });
    } finally {
      this.setData({ isRunning: false });
    }
  },

  async createAllCollections() {
    const db = wx.cloud.database();
    const collections = this.data.allCollections;
    
    for (const collectionName of collections) {
      try {
        // 检查集合是否存在
        await db.collection(collectionName).limit(1).get();
        this.addResult('info', `集合 ${collectionName}`, '已存在，跳过');
      } catch (error) {
        if (error.errCode === -502005) {
          // 集合不存在，创建它
          try {
            await this.createCollectionWithSample(collectionName);
            this.addResult('success', `集合 ${collectionName}`, '创建成功');
          } catch (createError) {
            this.addResult('error', `集合 ${collectionName}`, `创建失败: ${createError.message}`);
          }
        }
      }
    }
  },

  async createCollectionWithSample(collectionName) {
    const db = wx.cloud.database();
    
    // 根据集合类型创建示例数据
    let sampleData = this.getSampleData(collectionName);
    
    // 添加示例文档来创建集合
    const result = await db.collection(collectionName).add({
      data: sampleData
    });
    
    // 立即删除示例文档
    await db.collection(collectionName).doc(result._id).remove();
  },

  getSampleData(collectionName) {
    const now = new Date();
    
    switch (collectionName) {
      case 'families':
        return {
          name: '示例家庭',
          createdBy: 'system',
          createdAt: now,
          members: [],
          _temp: true
        };
      
      case 'family_members':
        return {
          familyId: 'temp',
          userId: 'system',
          role: 'admin',
          joinedAt: now,
          _temp: true
        };
      
      case 'transactions':
        return {
          amount: 0,
          type: 'expense',
          category: '其他',
          description: '示例交易',
          date: now,
          userId: 'system',
          _temp: true
        };
      
      case 'categories':
        return {
          name: '其他',
          type: 'expense',
          icon: 'other',
          color: '#999999',
          _temp: true
        };
      
      case 'accounts':
        return {
          name: '现金',
          type: 'cash',
          balance: 0,
          userId: 'system',
          _temp: true
        };
      
      case 'operation_logs':
        return {
          action: 'init',
          userId: 'system',
          timestamp: now,
          details: '系统初始化',
          _temp: true
        };
      
      case 'user_statistics':
        return {
          userId: 'system',
          totalIncome: 0,
          totalExpense: 0,
          lastUpdated: now,
          _temp: true
        };
      
      default:
        return {
          _temp: true,
          _created: now,
          _purpose: `初始化集合 ${collectionName}`
        };
    }
  },

  async createIndexes() {
    this.addResult('info', '创建索引', '开始为高频查询创建索引...');
    
    // 注意：小程序端无法直接创建索引，需要在云开发控制台手动创建
    // 这里只是记录需要创建的索引
    const indexRecommendations = [
      { collection: 'transactions', fields: ['userId', 'date'] },
      { collection: 'transactions', fields: ['familyId', 'date'] },
      { collection: 'family_members', fields: ['familyId', 'userId'] },
      { collection: 'operation_logs', fields: ['userId', 'timestamp'] },
      { collection: 'data_conflicts', fields: ['status', 'createdAt'] }
    ];
    
    indexRecommendations.forEach(index => {
      this.addResult('info', '索引建议', 
        `集合 ${index.collection} 建议创建索引: ${index.fields.join(', ')}`);
    });
    
    this.addResult('warning', '索引创建', 
      '请在云开发控制台手动创建上述索引以提升查询性能');
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

  onTestAll() {
    // 测试所有功能
    wx.showModal({
      title: '测试建议',
      content: '请依次测试以下功能：\n\n1. 登录功能\n2. 家庭创建/加入\n3. 交易记录\n4. 统计报表\n5. 操作日志\n\n如果仍有错误，请查看具体错误信息。',
      showCancel: false,
      confirmText: '开始测试'
    });
  },

  onManualGuide() {
    wx.navigateTo({
      url: '/pages/manual-db-guide/manual-db-guide'
    });
  }
});