// pages/manual-db-guide/manual-db-guide.js
Page({
  data: {
    requiredCount: 5,
    optionalCount: 11,
    collections: [
      {
        name: 'families',
        description: '家庭信息表',
        required: true,
        fields: 'name, createdBy, createdAt, members, settings'
      },
      {
        name: 'family_members',
        description: '家庭成员表',
        required: true,
        fields: 'familyId, userId, role, joinedAt, permissions'
      },
      {
        name: 'transactions',
        description: '交易记录表',
        required: true,
        fields: 'amount, type, category, description, date, userId, familyId'
      },
      {
        name: 'categories',
        description: '分类管理表',
        required: true,
        fields: 'name, type, icon, color, isDefault, userId'
      },
      {
        name: 'accounts',
        description: '账户管理表',
        required: true,
        fields: 'name, type, balance, userId, familyId, isDefault'
      },
      {
        name: 'family_invites',
        description: '家庭邀请表',
        required: false,
        fields: 'familyId, inviterUserId, inviteeUserId, status, createdAt'
      },
      {
        name: 'data_conflicts',
        description: '数据冲突表',
        required: false,
        fields: 'type, recordId, conflictData, status, createdAt'
      },
      {
        name: 'data_locks',
        description: '数据锁定表',
        required: false,
        fields: 'resourceType, resourceId, lockedBy, lockedAt, expiresAt'
      },
      {
        name: 'data_versions',
        description: '数据版本表',
        required: false,
        fields: 'recordType, recordId, version, data, createdBy, createdAt'
      },
      {
        name: 'operation_logs',
        description: '操作日志表',
        required: false,
        fields: 'action, userId, timestamp, details, resourceType, resourceId'
      },
      {
        name: 'user_statistics',
        description: '用户统计表',
        required: false,
        fields: 'userId, totalIncome, totalExpense, transactionCount, lastUpdated'
      },
      {
        name: 'system_logs',
        description: '系统日志表',
        required: false,
        fields: 'level, message, timestamp, source, details'
      },
      {
        name: 'budgets',
        description: '预算管理表',
        required: false,
        fields: 'name, amount, period, category, userId, familyId, startDate, endDate'
      },
      {
        name: 'templates',
        description: '交易模板表',
        required: false,
        fields: 'name, type, category, amount, description, userId, isPublic'
      },
      {
        name: 'sync_records',
        description: '同步记录表',
        required: false,
        fields: 'userId, familyId, lastSyncTime, syncStatus, recordCount, errors'
      },
      {
        name: 'conflict_resolutions',
        description: '冲突解决表',
        required: false,
        fields: 'conflictId, resolution, resolvedBy, resolvedAt, finalData, notes'
      }
    ],
    
    indexes: [
      {
        collection: 'transactions',
        fields: ['userId', 'date'],
        description: '用户交易按日期查询'
      },
      {
        collection: 'transactions',
        fields: ['familyId', 'date'],
        description: '家庭交易按日期查询'
      },
      {
        collection: 'transactions',
        fields: ['category', 'date'],
        description: '分类交易按日期查询'
      },
      {
        collection: 'family_members',
        fields: ['familyId', 'userId'],
        description: '家庭成员关系查询'
      },
      {
        collection: 'operation_logs',
        fields: ['userId', 'timestamp'],
        description: '用户操作日志查询'
      },
      {
        collection: 'data_conflicts',
        fields: ['status', 'createdAt'],
        description: '冲突状态查询'
      }
    ]
  },

  onLoad() {
    console.log('[MANUAL-DB-GUIDE] 页面加载');
  },

  onCopyCollectionName(e) {
    const name = e.currentTarget.dataset.name;
    wx.setClipboardData({
      data: name,
      success: () => {
        wx.showToast({
          title: '已复制集合名',
          icon: 'success'
        });
      }
    });
  },

  onCopyAllNames() {
    const names = this.data.collections.map(c => c.name).join('\n');
    wx.setClipboardData({
      data: names,
      success: () => {
        wx.showToast({
          title: '已复制所有集合名',
          icon: 'success'
        });
      }
    });
  },

  onOpenConsole() {
    wx.showModal({
      title: '打开云开发控制台',
      content: '请按以下步骤操作：\n\n1. 在微信开发者工具中点击"云开发"按钮\n2. 进入"数据库"页面\n3. 点击"+"号创建集合\n4. 输入集合名称并确认\n\n重复步骤3-4创建所有必需的集合。',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  onShowIndexGuide() {
    wx.showModal({
      title: '创建索引指南',
      content: '在云开发控制台的数据库页面：\n\n1. 选择对应的集合\n2. 点击"索引管理"标签\n3. 点击"新建索引"\n4. 输入字段名和排序方式\n5. 点击"确定"创建\n\n建议为高频查询字段创建复合索引。',
      showCancel: false,
      confirmText: '我知道了'
    });
  }
});