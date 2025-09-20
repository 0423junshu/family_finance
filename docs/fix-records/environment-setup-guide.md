# 开发环境配置指南

## 环境信息
- **操作系统**: Windows 11 Home China
- **微信开发者工具**: 1.06.2504030
- **Python**: 3.9.3
- **Node.js**: 未安装（需要安装）

## 问题诊断

### 1. Node.js 环境缺失
当前系统中未安装 Node.js，导致以下命令无法执行：
- `node` - Node.js 运行时
- `npm` - Node.js 包管理器
- `npx` - Node.js 包执行器

### 2. ESLint 配置问题
- `.eslintrc.cjs` 文件存在语法错误
- 缺少对特殊目录的忽略配置
- 缺少对 Python 缓存文件的处理

## 解决方案

### 1. 安装 Node.js
**推荐版本**: Node.js 18.x LTS 或 20.x LTS

**下载地址**: https://nodejs.org/

**安装步骤**:
1. 访问 Node.js 官网
2. 下载 Windows 安装包（.msi）
3. 运行安装程序，选择默认配置
4. 重启命令行工具
5. 验证安装：
   ```powershell
   node --version
   npm --version
   ```

### 2. 安装项目依赖
安装 Node.js 后，执行以下命令：

```powershell
# 安装项目依赖
npm install

# 安装开发依赖
npm install --save-dev eslint prettier stylelint husky lint-staged

# 安装 ESLint 插件
npm install --save-dev eslint-plugin-import eslint-plugin-promise eslint-plugin-prettier eslint-config-prettier
```

### 3. 配置 ESLint
已修复的 `.eslintrc.cjs` 配置：

```javascript
module.exports = {
  root: true,
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['import', 'promise', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:promise/recommended',
    'plugin:import/recommended',
    'plugin:prettier/recommended'
  ],
  rules: {
    'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'eqeqeq': ['error', 'always'],
    'complexity': ['warn', 15],
    'import/order': ['warn', {
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always'
    }],
    'prettier/prettier': 'warn'
  },
  ignorePatterns: [
    'miniprogram_npm/**',
    'node_modules/**',
    'cloudfunctions/**/node_modules/**',
    'dist/**',
    '__*__/**',              // 保留双下划线目录
    'donutAuthorize__/**',   // 保留特定目录
    'scripts/__pycache__/**' // 忽略 Python 缓存
  ]
};
```

### 4. 微信开发者工具配置

#### 基础库版本设置
1. 打开微信开发者工具
2. 进入项目设置
3. 设置合适的基础库版本（建议 2.10.0 或以上）
4. 确保与开发者工具版本兼容

#### 项目配置优化
在 `project.config.json` 中确保以下配置：

```json
{
  "miniprogramRoot": "./",
  "cloudfunctionRoot": "./cloudfunctions/",
  "setting": {
    "urlCheck": false,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "preloadBackgroundData": false,
    "minified": true,
    "newFeature": true,
    "coverView": true,
    "nodeModules": true,
    "autoAudits": false,
    "showShadowRootInWxmlPanel": true,
    "scopeDataCheck": false,
    "uglifyFileName": false,
    "checkInvalidKey": true,
    "checkSiteMap": true,
    "uploadWithSourceMap": true,
    "compileHotReLoad": false,
    "lazyloadPlaceholderEnable": false,
    "useMultiFrameRuntime": true,
    "useApiHook": true,
    "useApiHostProcess": true,
    "babelSetting": {
      "ignore": [],
      "disablePlugins": [],
      "outputPath": ""
    },
    "enableEngineNative": false,
    "useIsolateContext": true,
    "userConfirmedBundleSwitch": false,
    "packNpmManually": false,
    "packNpmRelationList": [],
    "minifyWXSS": true,
    "disableUseStrict": false,
    "minifyWXML": true,
    "showES6CompileOption": false,
    "useCompilerPlugins": false
  }
}
```

### 5. Python 环境配置
确保 Python 脚本正常运行：

```powershell
# 检查 Python 版本
python --version

# 安装脚本依赖
pip install -r scripts/requirements.txt
```

## 验证步骤

### 1. Node.js 环境验证
```powershell
# 检查版本
node --version
npm --version

# 测试 ESLint
npx eslint --version
npx eslint . --ext .js,.ts,.wxs
```

### 2. 微信开发者工具验证
1. 打开项目
2. 检查编译是否正常
3. 验证代码提示功能
4. 测试基础功能

### 3. Python 脚本验证
```powershell
# 测试文档合并脚本
python scripts/merge_docs_by_theme.py --dry-run
```

## 常见问题解决

### 1. Node.js 安装后命令仍不可用
- 重启命令行工具
- 检查环境变量 PATH
- 重新安装 Node.js

### 2. ESLint 规则冲突
- 检查 `.eslintrc.cjs` 语法
- 确保插件已安装
- 清除缓存：`npx eslint --cache-location .eslintcache --cache`

### 3. 微信开发者工具兼容性问题
- 更新到最新版本
- 检查基础库版本设置
- 清除项目缓存

### 4. Python 脚本执行问题
- 确保 Python 3.9+ 已安装
- 安装必要的依赖包
- 检查脚本权限

## 推荐的开发流程

1. **环境准备**
   - 安装 Node.js 和 Python
   - 配置微信开发者工具

2. **项目初始化**
   - 克隆项目代码
   - 安装依赖包
   - 配置开发工具

3. **代码开发**
   - 使用 ESLint 进行代码检查
   - 使用 Prettier 进行代码格式化
   - 定期运行测试脚本

4. **提交代码**
   - 运行 lint 检查
   - 执行自动化测试
   - 提交代码变更

这样的配置确保了开发环境的一致性和代码质量的稳定性。