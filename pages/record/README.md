# 记录编辑页（record）

- 用途：新增/编辑/复制交易记录
- 路由：/pages/record/record
- 入参：
  - mode: create | edit | copy（必填）
  - id: 记录ID（edit 必填）
  - 其他预填：type/category/amount/account/description 等
- 状态字段：form 数据（日期、分类、金额、账户、备注、标签等）
- 事件：提交保存/删除/复制/账户选择/分类选择/日期选择等
- 依赖：services/transaction-simple；本地缓存 transactions 兜底
- 空/错态：参数非法时回退为 create 并提示
- 性能与可用性：字段校验本地完成；金额统一分/元转换
- 测试要点：
  - mode/edit&id 行为正确，缺 id 时提示并回退
  - copy 模式预填正确
- 最近变更摘要：
  - 2025-09：严格校验 mode 入参，防御非法跳转