# Index 页面说明

## 概述
- 入口首页：展示当月概览、快捷记账入口、最近交易列表。
- 单位约定：内部金额使用“分”（整数），展示通过 utils/formatter.formatAmount 格式化为“元”。

## 路由
- 页面路径：/pages/index/index
- 相关跳转：
  - 交易详情/编辑：/pages/record/record?mode=copy|edit&id={id}&amount={amountInCents}
  - 交易列表：/pages/transaction-list/transaction-list
  - 操作日志：/pages/operation-logs/operation-logs

## 数据流
- 源数据：全局 store/缓存（transactions、accounts、categories）。
- 计算：
  - 当月收入/支出/结余：内部以分聚合；仅展示时格式化为元。
- 状态：selectedYear、selectedMonth、filters 等。

## 主要交互
- onViewOperationLogs：跳转操作日志
- 快捷记账：onQuickExpense/onQuickIncome/onQuickTransfer
- 列表项点击/长按：onTransactionTap/onTransactionLongPress
- 月份选择：onMonthPickerChange（含年月兜底，防止 NaN 年月）

## 依赖
- utils/formatter：formatAmount、parseAmount
- 组件：components/navigation-bar、components/sync-status

## 性能与规范
- setData：合并/最小化；必要时使用 setDataSafe 包装
- 兼容：通过 canIUse/能力探测适配差异
- 代码规范：ESLint/Prettier/Stylelint

## 问题与变更记录
- 详见本目录 CHANGELOG.md