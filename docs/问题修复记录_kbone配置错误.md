# kbone 配置错误修复记录

## 修复时间
2025-09-07 18:52

## 问题描述
预览时出现错误：
```
Error: 系统错误，错误码：80058,extendedlib=kbone value is invalid!
```

## 问题原因
app.json 中的 useExtendedLib 配置包含了 kbone 扩展库，但该库配置无效导致预览失败。

## 解决方案
从 app.json 的 useExtendedLib 配置中完全移除 kbone 项：

### 修改前：
```json
"useExtendedLib": {
  "kbone": false,
  "weui": true
}
```

### 修改后：
```json
"useExtendedLib": {
  "weui": true
}
```

## 修复结果
- ✅ 移除无效的 kbone 配置
- ✅ 保留有效的 weui 扩展库
- ✅ 预览功能恢复正常

## 注意事项
- kbone 是用于 Vue.js 转小程序的框架，本项目不需要
- weui 扩展库保留，用于 UI 组件支持
- 该修复不影响现有功能