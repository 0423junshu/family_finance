# 资产页改造需求（阶段一）

- 背景
  - 时间选择需限定为“年-月”，并与数据 monthKey 绑定
  - 历史月份编辑必须只影响对应月份快照
  - 需要可回归的测试资产数据（多月份）
  - 一致性校验：总资产 = 账户余额之和 + 投资理财之和（按所选月份）

- 功能点
  1) 年月选择器（自定义 picker-view），统一 monthKey=YYYY-MM
  2) 月度快照读写：accounts:YYYY-MM、investments:YYYY-MM、assetSnapshot:YYYY-MM、reports:assets:YYYY-MM
  3) 测试数据：默认生成近24个月快照（含账户与投资，金额单位为“分”）
  4) 一致性校验：基于当前所选 YYYY-MM 进行校验与修复，同步更新该月汇总缓存
  5) 后续（阶段二）：云数据库集合 assets_snapshots（userId+monthKey 唯一）、云函数读写

- 校验规则
  - 保存与修复前校验：total === sum(accounts.balance) + sum(investments.amount/currentValue)
  - 金额单位统一为分，展示时两位小数

- 回归点
  - 切换历史月编辑，不影响其他月份
  - 重新进入页面，仍定位到上次查看的 monthKey
  - 24个月数据覆盖报表趋势与资产分析