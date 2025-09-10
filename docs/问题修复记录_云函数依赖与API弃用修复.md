# 云函数依赖与API弃用修复记录

## 修复时间
2025-09-07 18:00

## 问题描述
1. 云函数执行失败：Cannot find module 'wx-server-sdk'
2. wx.getSystemInfoSync API 弃用警告

## 修复措施

### 1. 云函数依赖修复
- 在 cloudfunctions/login 目录安装 wx-server-sdk 依赖
- 命令：`npm install wx-server-sdk --save`
- 状态：已完成安装

### 2. API 弃用修复
替换项目中的 wx.getSystemInfoSync 调用：

#### 修复文件列表：
- `services/chart-renderer.js`: 使用 wx.getWindowInfo() 替代
- `services/collaborationMiddleware.js`: 使用 wx.getDeviceInfo() 替代  
- `services/operationLog.js`: 分别使用 wx.getDeviceInfo() 和 wx.getAppBaseInfo() 替代
- `pages/reports/reports-simple.js`: 使用 wx.getWindowInfo() 替代
- `pages/font-test/font-test.js`: 使用 wx.getDeviceInfo() 替代

#### 兼容性处理：
所有替换都保持向后兼容，当新 API 不存在时回退到 wx.getSystemInfoSync()

## 下一步操作
1. 重新部署 login 云函数
2. 测试登录功能
3. 验证 API 弃用警告是否消除

## 预期结果
- 登录功能正常工作
- 控制台不再显示 wx.getSystemInfoSync 弃用警告
- 云函数执行成功