/**
 * 文档生命周期管理工具集
 * 用于自动化文档状态检查、引用关系监控和质量评估
 */

const fs = require('fs');
const path = require('path');

class DocumentLifecycleManager {
  constructor() {
    this.docsPath = './docs';
    this.scriptsPath = './scripts';
    this.testPath = './test-automation';
    this.pagesPath = './pages';
    this.cloudfunctionsPath = './cloudfunctions';
  }

  /**
   * 检查文档状态和更新时间
   */
  async checkDocumentStatus() {
    console.log('🔍 检查文档状态...');
    
    const results = {
      total: 0,
      outdated: [],
      missing_metadata: [],
      quality_issues: []
    };

    const docFiles = this.getAllDocFiles();
    
    for (const filePath of docFiles) {
      results.total++;
      const content = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);
      
      // 检查元数据
      const metadata = this.extractMetadata(content);
      if (!metadata.title || !metadata.created) {
        results.missing_metadata.push(filePath);
      }
      
      // 检查更新时间
      const daysSinceUpdate = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 90) { // 90天未更新
        results.outdated.push({
          file: filePath,
          lastUpdate: stats.mtime.toISOString().split('T')[0],
          daysSinceUpdate: Math.floor(daysSinceUpdate)
        });
      }
      
      // 检查内容质量
      const qualityIssues = this.checkContentQuality(content, filePath);
      if (qualityIssues.length > 0) {
        results.quality_issues.push({
          file: filePath,
          issues: qualityIssues
        });
      }
    }
    
    this.generateStatusReport(results);
    return results;
  }

  /**
   * 监控文件引用关系
   */
  async monitorReferences() {
    console.log('🔗 监控引用关系...');
    
    const references = {
      valid: [],
      broken: [],
      orphaned: []
    };

    // 扫描所有文档中的文件引用
    const docFiles = this.getAllDocFiles();
    
    for (const docFile of docFiles) {
      const content = fs.readFileSync(docFile, 'utf8');
      const fileRefs = this.extractFileReferences(content);
      
      for (const ref of fileRefs) {
        const fullPath = path.resolve(ref);
        if (fs.existsSync(fullPath)) {
          references.valid.push({ doc: docFile, ref: ref });
        } else {
          references.broken.push({ doc: docFile, ref: ref });
        }
      }
    }

    // 查找孤立文件
    const allFiles = this.getAllProjectFiles();
    const referencedFiles = new Set(references.valid.map(r => path.resolve(r.ref)));
    
    for (const file of allFiles) {
      if (!referencedFiles.has(path.resolve(file)) && this.isOrphanCandidate(file)) {
        references.orphaned.push(file);
      }
    }

    this.generateReferenceReport(references);
    return references;
  }

  /**
   * 评估文档质量
   */
  async assessDocumentQuality() {
    console.log('📊 评估文档质量...');
    
    const assessment = {
      coverage: {},
      quality_scores: [],
      recommendations: []
    };

    // 计算文档覆盖率
    assessment.coverage = this.calculateCoverage();
    
    // 评估各文档质量
    const docFiles = this.getAllDocFiles();
    
    for (const docFile of docFiles) {
      const content = fs.readFileSync(docFile, 'utf8');
      const score = this.calculateQualityScore(content, docFile);
      assessment.quality_scores.push({
        file: docFile,
        score: score.total,
        details: score.details
      });
    }

    // 生成改进建议
    assessment.recommendations = this.generateRecommendations(assessment);
    
    this.generateQualityReport(assessment);
    return assessment;
  }

  /**
   * 执行文档清理
   */
  async cleanupDocuments() {
    console.log('🧹 执行文档清理...');
    
    const cleanup = {
      archived: [],
      deleted: [],
      merged: []
    };

    // 识别需要归档的文档
    const candidates = await this.identifyArchiveCandidates();
    
    for (const candidate of candidates) {
      if (candidate.action === 'archive') {
        this.archiveDocument(candidate.file);
        cleanup.archived.push(candidate.file);
      } else if (candidate.action === 'delete') {
        this.deleteDocument(candidate.file);
        cleanup.deleted.push(candidate.file);
      }
    }

    this.generateCleanupReport(cleanup);
    return cleanup;
  }

  // 辅助方法

  getAllDocFiles() {
    const docFiles = [];
    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && !item.startsWith('.')) {
          scanDir(fullPath);
        } else if (item.endsWith('.md')) {
          docFiles.push(fullPath);
        }
      }
    };
    scanDir(this.docsPath);
    return docFiles;
  }

  getAllProjectFiles() {
    const projectFiles = [];
    const scanDirs = [this.pagesPath, this.cloudfunctionsPath, this.scriptsPath, this.testPath];
    
    for (const dir of scanDirs) {
      if (fs.existsSync(dir)) {
        const scanDir = (currentDir) => {
          const items = fs.readdirSync(currentDir);
          for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
              scanDir(fullPath);
            } else if (item.endsWith('.js') || item.endsWith('.json') || item.endsWith('.wxml')) {
              projectFiles.push(fullPath);
            }
          }
        };
        scanDir(dir);
      }
    }
    return projectFiles;
  }

  extractMetadata(content) {
    const metadata = {};
    const lines = content.split('\n');
    
    // 提取标题
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      metadata.title = titleMatch[1];
    }
    
    // 提取创建时间
    const createdMatch = content.match(/创建时间[：:]\s*(\d{4}-\d{2}-\d{2})/);
    if (createdMatch) {
      metadata.created = createdMatch[1];
    }
    
    // 提取更新时间
    const updatedMatch = content.match(/更新时间[：:]\s*(\d{4}-\d{2}-\d{2})/);
    if (updatedMatch) {
      metadata.updated = updatedMatch[1];
    }
    
    return metadata;
  }

  extractFileReferences(content) {
    const references = [];
    
    // 匹配文件路径引用
    const pathRegex = /(?:pages|cloudfunctions|scripts|test-automation)\/[^\s\)]+\.(js|json|wxml|wxss)/g;
    const matches = content.match(pathRegex);
    
    if (matches) {
      references.push(...matches);
    }
    
    return references;
  }

  checkContentQuality(content, filePath) {
    const issues = [];
    
    // 检查结构完整性
    if (!content.includes('# ')) {
      issues.push('缺少主标题');
    }
    
    // 检查内容长度
    if (content.length < 200) {
      issues.push('内容过短');
    }
    
    // 检查代码块格式
    const codeBlocks = content.match(/```[\s\S]*?```/g);
    if (codeBlocks) {
      for (const block of codeBlocks) {
        if (!block.includes('```javascript') && !block.includes('```json') && !block.includes('```')) {
          issues.push('代码块缺少语言标识');
        }
      }
    }
    
    return issues;
  }

  calculateCoverage() {
    const coverage = {
      features: 0,
      problems: 0,
      guides: 0,
      governance: 0
    };

    // 计算各类文档的覆盖情况
    const featureFiles = fs.readdirSync(path.join(this.docsPath, 'features')).filter(f => f.endsWith('.md'));
    const problemFiles = fs.readdirSync(path.join(this.docsPath, 'problems')).filter(f => f.endsWith('.md'));
    
    coverage.features = featureFiles.length;
    coverage.problems = problemFiles.length;
    
    return coverage;
  }

  calculateQualityScore(content, filePath) {
    const score = {
      total: 0,
      details: {}
    };

    // 结构完整性 (30分)
    let structureScore = 0;
    if (content.includes('# ')) structureScore += 10;
    if (content.includes('## ')) structureScore += 10;
    if (content.includes('### ')) structureScore += 10;
    score.details.structure = structureScore;

    // 内容丰富度 (30分)
    let contentScore = 0;
    if (content.length > 500) contentScore += 10;
    if (content.length > 1000) contentScore += 10;
    if (content.includes('```')) contentScore += 10;
    score.details.content = contentScore;

    // 元数据完整性 (20分)
    let metadataScore = 0;
    const metadata = this.extractMetadata(content);
    if (metadata.title) metadataScore += 10;
    if (metadata.created) metadataScore += 10;
    score.details.metadata = metadataScore;

    // 引用准确性 (20分)
    let referenceScore = 20; // 默认满分，发现问题扣分
    const refs = this.extractFileReferences(content);
    for (const ref of refs) {
      if (!fs.existsSync(ref)) {
        referenceScore -= 5;
      }
    }
    score.details.references = Math.max(0, referenceScore);

    score.total = structureScore + contentScore + metadataScore + score.details.references;
    return score;
  }

  generateRecommendations(assessment) {
    const recommendations = [];
    
    // 基于质量评分生成建议
    for (const doc of assessment.quality_scores) {
      if (doc.score < 60) {
        recommendations.push({
          file: doc.file,
          priority: 'high',
          suggestion: '文档质量较低，需要全面改进'
        });
      } else if (doc.score < 80) {
        recommendations.push({
          file: doc.file,
          priority: 'medium',
          suggestion: '文档质量中等，建议优化结构和内容'
        });
      }
    }
    
    return recommendations;
  }

  // 报告生成方法
  generateStatusReport(results) {
    const report = `# 文档状态检查报告

## 检查时间
${new Date().toISOString().split('T')[0]}

## 统计概览
- 总文档数: ${results.total}
- 过期文档: ${results.outdated.length}
- 缺少元数据: ${results.missing_metadata.length}
- 质量问题: ${results.quality_issues.length}

## 过期文档列表
${results.outdated.map(doc => `- ${doc.file} (${doc.daysSinceUpdate}天未更新)`).join('\n')}

## 质量问题文档
${results.quality_issues.map(doc => `- ${doc.file}: ${doc.issues.join(', ')}`).join('\n')}
`;

    fs.writeFileSync('./docs/reports/status-report.md', report);
    console.log('✅ 状态报告已生成: docs/reports/status-report.md');
  }

  generateReferenceReport(references) {
    const report = `# 引用关系监控报告

## 检查时间
${new Date().toISOString().split('T')[0]}

## 统计概览
- 有效引用: ${references.valid.length}
- 失效引用: ${references.broken.length}
- 孤立文件: ${references.orphaned.length}

## 失效引用列表
${references.broken.map(ref => `- ${ref.doc} → ${ref.ref}`).join('\n')}

## 孤立文件列表
${references.orphaned.map(file => `- ${file}`).join('\n')}
`;

    fs.writeFileSync('./docs/reports/reference-report.md', report);
    console.log('✅ 引用关系报告已生成: docs/reports/reference-report.md');
  }

  generateQualityReport(assessment) {
    const avgScore = assessment.quality_scores.reduce((sum, doc) => sum + doc.score, 0) / assessment.quality_scores.length;
    
    const report = `# 文档质量评估报告

## 评估时间
${new Date().toISOString().split('T')[0]}

## 质量概览
- 平均质量分: ${avgScore.toFixed(1)}/100
- 文档总数: ${assessment.quality_scores.length}
- 高质量文档 (>80分): ${assessment.quality_scores.filter(d => d.score > 80).length}
- 低质量文档 (<60分): ${assessment.quality_scores.filter(d => d.score < 60).length}

## 改进建议
${assessment.recommendations.map(rec => `- ${rec.file}: ${rec.suggestion}`).join('\n')}
`;

    fs.writeFileSync('./docs/reports/quality-report.md', report);
    console.log('✅ 质量评估报告已生成: docs/reports/quality-report.md');
  }
}

// 命令行接口
if (require.main === module) {
  const manager = new DocumentLifecycleManager();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'status':
      manager.checkDocumentStatus();
      break;
    case 'references':
      manager.monitorReferences();
      break;
    case 'quality':
      manager.assessDocumentQuality();
      break;
    case 'cleanup':
      manager.cleanupDocuments();
      break;
    case 'all':
      (async () => {
        await manager.checkDocumentStatus();
        await manager.monitorReferences();
        await manager.assessDocumentQuality();
        console.log('🎉 所有检查完成！');
      })();
      break;
    default:
      console.log(`
使用方法:
  node scripts/doc-lifecycle-tools.js <command>

命令:
  status      - 检查文档状态
  references  - 监控引用关系
  quality     - 评估文档质量
  cleanup     - 执行文档清理
  all         - 执行所有检查
      `);
  }
}

module.exports = DocumentLifecycleManager;