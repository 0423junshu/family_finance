/**
 * 家庭协作功能入口修复验证脚本
 * 验证修复后的功能是否正常工作
 */

const path = require('path');
const fs = require('fs');

class CollaborationFixVerification {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.results = {
      routeConfig: false,
      componentConfig: false,
      pageStructure: false,
      styleIntegration: false,
      logicIntegration: false
    };
  }

  /**
   * 验证路由配置
   */
  verifyRouteConfig() {
    try {
      const appJsonPath = path.join(this.projectRoot, 'app.json');
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      
      // 检查 profile 页面是否在路由中
      const hasProfileRoute = appJson.pages.includes('pages/profile/profile');
      
      console.log('✅ 路由配置检查:');
      console.log(`   - Profile页面路由: ${hasProfileRoute ? '✓' : '✗'}`);
      
      this.results.routeConfig = hasProfileRoute;
      return hasProfileRoute;
    } catch (error) {
      console.error('❌ 路由配置检查失败:', error.message);
      return false;
    }
  }

  /**
   * 验证组件配置
   */
  verifyComponentConfig() {
    try {
      const profileJsonPath = path.join(this.projectRoot, 'pages/profile/profile.json');
      const profileJson = JSON.parse(fs.readFileSync(profileJsonPath, 'utf8'));
      
      // 检查 TDesign 组件是否正确配置
      const hasTDesignComponents = profileJson.usingComponents && 
        Object.keys(profileJson.usingComponents).some(key => key.startsWith('t-'));
      
      console.log('✅ 组件配置检查:');
      console.log(`   - TDesign组件配置: ${hasTDesignComponents ? '✓' : '✗'}`);
      
      this.results.componentConfig = hasTDesignComponents;
      return hasTDesignComponents;
    } catch (error) {
      console.error('❌ 组件配置检查失败:', error.message);
      return false;
    }
  }

  /**
   * 验证页面结构
   */
  verifyPageStructure() {
    try {
      const profileWxmlPath = path.join(this.projectRoot, 'pages/profile/profile.wxml');
      const profileWxml = fs.readFileSync(profileWxmlPath, 'utf8');
      
      // 检查家庭协作相关元素
      const hasCollaborationSection = profileWxml.includes('collaboration-section');
      const hasCollaborationCard = profileWxml.includes('collaboration-card');
      const hasSyncStatus = profileWxml.includes('sync-status');
      
      console.log('✅ 页面结构检查:');
      console.log(`   - 协作功能区域: ${hasCollaborationSection ? '✓' : '✗'}`);
      console.log(`   - 协作卡片组件: ${hasCollaborationCard ? '✓' : '✗'}`);
      console.log(`   - 同步状态组件: ${hasSyncStatus ? '✓' : '✗'}`);
      
      const structureValid = hasCollaborationSection && hasCollaborationCard;
      this.results.pageStructure = structureValid;
      return structureValid;
    } catch (error) {
      console.error('❌ 页面结构检查失败:', error.message);
      return false;
    }
  }

  /**
   * 验证样式集成
   */
  verifyStyleIntegration() {
    try {
      const profileWxssPath = path.join(this.projectRoot, 'pages/profile/profile.wxss');
      const profileWxss = fs.readFileSync(profileWxssPath, 'utf8');
      
      // 检查家庭协作样式
      const hasCollaborationStyles = profileWxss.includes('.collaboration-section');
      const hasCardStyles = profileWxss.includes('.collaboration-card');
      const hasResponsiveStyles = profileWxss.includes('@media');
      
      console.log('✅ 样式集成检查:');
      console.log(`   - 协作功能样式: ${hasCollaborationStyles ? '✓' : '✗'}`);
      console.log(`   - 卡片样式定义: ${hasCardStyles ? '✓' : '✗'}`);
      console.log(`   - 响应式适配: ${hasResponsiveStyles ? '✓' : '✗'}`);
      
      const styleValid = hasCollaborationStyles && hasCardStyles;
      this.results.styleIntegration = styleValid;
      return styleValid;
    } catch (error) {
      console.error('❌ 样式集成检查失败:', error.message);
      return false;
    }
  }

  /**
   * 验证逻辑集成
   */
  verifyLogicIntegration() {
    try {
      const profileJsPath = path.join(this.projectRoot, 'pages/profile/profile.js');
      const profileJs = fs.readFileSync(profileJsPath, 'utf8');
      
      // 检查家庭协作逻辑
      const hasCollaborationData = profileJs.includes('collaborationEnabled');
      const hasCollaborationMethods = profileJs.includes('initCollaboration');
      const hasFamilyService = profileJs.includes('familyService');
      
      console.log('✅ 逻辑集成检查:');
      console.log(`   - 协作数据状态: ${hasCollaborationData ? '✓' : '✗'}`);
      console.log(`   - 协作方法定义: ${hasCollaborationMethods ? '✓' : '✗'}`);
      console.log(`   - 家庭服务集成: ${hasFamilyService ? '✓' : '✗'}`);
      
      const logicValid = hasCollaborationData && hasCollaborationMethods;
      this.results.logicIntegration = logicValid;
      return logicValid;
    } catch (error) {
      console.error('❌ 逻辑集成检查失败:', error.message);
      return false;
    }
  }

  /**
   * 运行完整验证
   */
  async runFullVerification() {
    console.log('🚀 开始家庭协作功能入口修复验证...\n');
    
    const checks = [
      { name: '路由配置', method: 'verifyRouteConfig' },
      { name: '组件配置', method: 'verifyComponentConfig' },
      { name: '页面结构', method: 'verifyPageStructure' },
      { name: '样式集成', method: 'verifyStyleIntegration' },
      { name: '逻辑集成', method: 'verifyLogicIntegration' }
    ];

    for (const check of checks) {
      console.log(`\n📋 ${check.name}验证:`);
      this[check.method]();
    }

    // 生成验证报告
    this.generateReport();
  }

  /**
   * 生成验证报告
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 家庭协作功能入口修复验证报告');
    console.log('='.repeat(60));
    
    const totalChecks = Object.keys(this.results).length;
    const passedChecks = Object.values(this.results).filter(Boolean).length;
    const successRate = Math.round((passedChecks / totalChecks) * 100);
    
    console.log(`\n✅ 验证结果: ${passedChecks}/${totalChecks} 项通过 (${successRate}%)`);
    
    Object.entries(this.results).forEach(([key, passed]) => {
      const status = passed ? '✅ 通过' : '❌ 失败';
      const name = {
        routeConfig: '路由配置',
        componentConfig: '组件配置', 
        pageStructure: '页面结构',
        styleIntegration: '样式集成',
        logicIntegration: '逻辑集成'
      }[key];
      console.log(`   ${name}: ${status}`);
    });

    if (successRate >= 80) {
      console.log('\n🎉 修复验证通过！家庭协作功能入口应该可以正常显示了。');
      console.log('\n📝 下一步操作:');
      console.log('   1. 在微信开发者工具中重新编译项目');
      console.log('   2. 构建 npm 包: 工具 → 构建 npm');
      console.log('   3. 刷新"我的"页面查看协作功能入口');
    } else {
      console.log('\n⚠️  修复验证未完全通过，请检查失败项目。');
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// 运行验证
if (require.main === module) {
  const verifier = new CollaborationFixVerification();
  verifier.runFullVerification().catch(console.error);
}

module.exports = CollaborationFixVerification;