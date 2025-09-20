# 报表页（reports-simple）

- 用途：展示收支趋势与分类/标签统计
- 路由：/pages/reports/reports-simple
- 入参：可从列表或首页带入范围参数
- 状态字段：日期范围、图表配置、统计聚合
- 事件：分类/标签跳转、日期切换
- 依赖：services/transaction-simple、services/chart-renderer、utils/date-range
- 空/错态：无数据空态图
- 性能与可用性：DPR 兼容；Canvas 新旧 API 兼容
- 测试要点：从报表跳列表的 URL 参数编码与解析
- 最近变更摘要：
  - 2025-09：windowInfo 优先；月参数 1-based 传递；交易列表 0-based 解析