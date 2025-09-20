# 交易列表页（transaction-list）

- 用途：按时间/类型/分类/标签筛选与浏览交易列表
- 路由：/pages/transaction-list/transaction-list
- 入参：type/category/tag/range/year/month/start/end/title
- 状态字段：filters、transactions、filteredTransactions、统计字段等
- 事件：筛选切换/日期选择/查看更多/调试输出等
- 依赖：services/transaction-simple、utils/formatter、utils/date-range
- 空/错态：加载失败 toast；空列表提示
- 性能与可用性：
  - B2 setDataSafe 包装器（节流+脏检查）
  - B3 日期工具统一（月/季/年）与边界修复
- 测试要点：
  - 8/31 与跨月边界正确归属
  - URL 参数解析/校验/标题设置正确
- 最近变更摘要：
  - 2025-09：接入 setDataSafe；统一日期计算；修复 Invalid time value