# CHANGELOG - 交易列表页（transaction-list）

## 2025-09-14
- 修复：URL 年月补齐与 B3 日期工具化（月/季/年）
- 修复：loadTransactions 月份扩展前校验空值，避免 Invalid time value
- 优化：setDataSafe 降低高频 setData 带来的卡顿