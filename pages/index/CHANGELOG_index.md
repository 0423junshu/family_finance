---
status: merged
mergedAt: 2025-09-15
mergedTo: pages/index/CHANGELOG.md
note: 本文件内容已并入 CHANGELOG.md，仅保留占位
---

## 2025-09-14
- 问题：点击“记账/快速支出/快速收入”出现“无效模式回退为创建”
- 根因：跳转未携带 mode=create
- 修复：统一补齐 mode=create
- 验证：从首页三处入口进入 record 页不再告警

## 2025-09-14
- 问题：控制台提示 wx.getSystemInfoSync 已弃用
- 根因：顶部安全区与组件导航栏使用旧 API
- 修复：优先 wx.getWindowInfo，保留回退
- 验证：控制台无弃用告警，显示无回归