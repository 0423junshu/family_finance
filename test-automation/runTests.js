/**
 * 家庭协作功能测试执行器
 * 实际执行测试并生成报告
 */

const FamilyCollaborationTester = require('./家庭协作功能测试.js');

class TestRunner {
  constructor() {
    this.tester = new FamilyCollaborationTester();
    this.testReport = null;
  }

  /**
   * 执行所有测试
   */
  async runAllTests() {
    console.log('🚀 开始执行家庭协作功能完整测试套件');
    console.log('=' .repeat(60));
    
    try {
      // 执行测试套件
      await this.tester.runFullTestSuite();
      
      // 生成并保存报告
      this.testReport = await this.tester.generateTestReport();
      await this.saveTestReport();
      
      console.log('\n✅ 所有测试执行完成');
      this.printSummary();
      
    } catch (error) {
      console.error('\n❌ 测试执行失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 执行快速测试（核心功能）
   */
  async runQuickTests() {
    console.log('⚡ 执行快速测试（核心功能验证）');
    console.log('=' .repeat(50));
    
    try {
      // 只执行核心功能测试
      await this.tester.runBasicFunctionalityTests();
      
      this.testReport = await this.tester.generateTestReport();
      console.log('\n✅ 快速测试完成');
      this.printSummary();
      
    } catch (error) {
      console.error('\n❌ 快速测试失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 保存测试报告
   */
  async saveTestReport() {
    const fs = require('fs');
    const path = require('path');
    
    // 创建报告目录
    const reportDir = path.join(__dirname, '../docs/test-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    // 生成报告文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(reportDir, `家庭协作功能测试报告_${timestamp}.json`);
    
    // 保存JSON报告
    fs.writeFileSync(reportFile, JSON.stringify(this.testReport, null, 2));
    
    // 生成HTML报告
    const htmlReport = this.generateHTMLReport();
    const htmlFile = path.join(reportDir, `家庭协作功能测试报告_${timestamp}.html`);
    fs.writeFileSync(htmlFile, htmlReport);
    
    console.log(`📄 测试报告已保存:`);
    console.log(`   JSON: ${reportFile}`);
    console.log(`   HTML: ${htmlFile}`);
  }

  /**
   * 生成HTML测试报告
   */
  generateHTMLReport() {
    const { summary, details } = this.testReport;
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>家庭协作功能测试报告</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
        }
        .header p {
            margin: 10px 0 0;
            opacity: 0.9;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary-card h3 {
            margin: 0 0 10px;
            color: #333;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        .success { color: #28a745; }
        .danger { color: #dc3545; }
        .info { color: #17a2b8; }
        .warning { color: #ffc107; }
        .details {
            padding: 30px;
        }
        .test-group {
            margin-bottom: 30px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
        }
        .test-group-header {
            background: #f8f9fa;
            padding: 15px 20px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .test-group-title {
            font-weight: bold;
            font-size: 1.1em;
        }
        .test-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: bold;
        }
        .status-passed {
            background: #d4edda;
            color: #155724;
        }
        .status-failed {
            background: #f8d7da;
            color: #721c24;
        }
        .test-cases {
            padding: 20px;
        }
        .test-case {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f1f3f4;
        }
        .test-case:last-child {
            border-bottom: none;
        }
        .test-case-name {
            flex: 1;
        }
        .test-case-duration {
            color: #6c757d;
            font-size: 0.9em;
            margin-right: 10px;
        }
        .test-case-status {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 0.8em;
        }
        .case-passed {
            background: #28a745;
        }
        .case-failed {
            background: #dc3545;
        }
        .error-details {
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-size: 0.9em;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
        }
        @media (max-width: 768px) {
            .summary {
                grid-template-columns: 1fr;
            }
            .test-case {
                flex-direction: column;
                align-items: flex-start;
            }
            .test-case-duration,
            .test-case-status {
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>家庭协作功能测试报告</h1>
            <p>生成时间: ${new Date(this.testReport.timestamp).toLocaleString('zh-CN')}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>总测试数</h3>
                <div class="value info">${summary.totalTests}</div>
            </div>
            <div class="summary-card">
                <h3>通过测试</h3>
                <div class="value success">${summary.passedTests}</div>
            </div>
            <div class="summary-card">
                <h3>失败测试</h3>
                <div class="value danger">${summary.failedTests}</div>
            </div>
            <div class="summary-card">
                <h3>成功率</h3>
                <div class="value ${summary.failedTests > 0 ? 'warning' : 'success'}">${summary.successRate}</div>
            </div>
            <div class="summary-card">
                <h3>总耗时</h3>
                <div class="value info">${(summary.totalDuration / 1000).toFixed(2)}s</div>
            </div>
        </div>
        
        <div class="details">
            <h2>详细测试结果</h2>
            ${details.map(test => `
                <div class="test-group">
                    <div class="test-group-header">
                        <div class="test-group-title">${test.name}</div>
                        <div class="test-status ${test.status === 'passed' ? 'status-passed' : 'status-failed'}">
                            ${test.status === 'passed' ? '✓ 通过' : '✗ 失败'}
                        </div>
                    </div>
                    <div class="test-cases">
                        ${test.cases.map(testCase => `
                            <div class="test-case">
                                <div class="test-case-name">${testCase.name}</div>
                                <div class="test-case-duration">${testCase.duration}ms</div>
                                <div class="test-case-status ${testCase.status === 'passed' ? 'case-passed' : 'case-failed'}">
                                    ${testCase.status === 'passed' ? '✓' : '✗'}
                                </div>
                            </div>
                            ${testCase.error ? `<div class="error-details">错误: ${testCase.error}</div>` : ''}
                        `).join('')}
                    </div>
                    ${test.error ? `<div class="error-details">测试组错误: ${test.error}</div>` : ''}
                </div>
            `).join('')}
        </div>
        
        <div class="footer">
            <p>测试报告由 CodeBuddy 自动生成 | 家庭财务管理小程序</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 打印测试摘要
   */
  printSummary() {
    const { summary } = this.testReport;
    
    console.log('\n📊 测试摘要');
    console.log('─'.repeat(40));
    console.log(`总测试数: ${summary.totalTests}`);
    console.log(`✅ 通过: ${summary.passedTests}`);
    console.log(`❌ 失败: ${summary.failedTests}`);
    console.log(`📈 成功率: ${summary.successRate}`);
    console.log(`⏱️  总耗时: ${(summary.totalDuration / 1000).toFixed(2)}秒`);
    
    if (summary.failedTests > 0) {
      console.log('\n⚠️  存在失败的测试，请查看详细报告');
    } else {
      console.log('\n🎉 所有测试都通过了！');
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const runner = new TestRunner();
  
  // 检查命令行参数
  const args = process.argv.slice(2);
  const isQuickTest = args.includes('--quick') || args.includes('-q');
  
  if (isQuickTest) {
    runner.runQuickTests().catch(console.error);
  } else {
    runner.runAllTests().catch(console.error);
  }
}

module.exports = TestRunner;