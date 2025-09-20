# Data Export 页面说明

## 概述
- 导出类型：transactions（收支记录）、assets（资产数据）、report（财务报表）
- 导出格式：excel（CSV）、pdf（文本模拟）
- 单位与格式：金额内部“分”，导出时以元两位小数输出

## 路由
- 页面路径：/pages/data-export/data-export

## 数据流
- 来源：本地缓存（transactions、accounts）与 services/export
- 过滤：dateRange、categories、accounts、includeHistory
- 输出：文件名、内容字符串、大小、记录数

## 主要交互
- startExport：执行导出（按类型分支）
- handleExportResult：分享/保存导出文件
- 历史：loadExportHistory、reExport、deleteExportRecord、clearAllHistory

## 依赖
- services/export、services/dataManager
- utils/formatter：formatDate、formatCurrency

## 兼容与规范
- 多行字符串统一使用模板字符串
- 金额以“分”为内部单位，导出格式化为元（两位）

## 回归要点
- 时间范围验证与排序
- 不同筛选条件组合
- CSV 文本编码与换行

## 问题与变更记录
- 详见本目录 CHANGELOG.md