# 问题记录与修复说明

- 问题1：时间选择器异常
  - 现象：无法稳定选择目标月份
  - 原因：未统一 monthKey 绑定与回显逻辑
  - 处理：使用自定义 picker-view（年、月两列），confirm 时计算 monthKey 并 loadData 绑定

- 问题2：历史月修改未与月份绑定
  - 现象：历史月修改落入“最新月”
  - 原因：读写未按 YYYY-MM 路由
  - 处理：load/save 全链路按 accounts:YYYY-MM、investments:YYYY-MM、assetSnapshot:YYYY-MM；onShow 与编辑保存均使用当前选择的 monthKey

- 问题3：缺少多月份测试数据
  - 处理：generateTestData 改为生成近24个月数据，并写入资产历史与月份快照

- 问题4：一致性校验逻辑不够严格
  - 现象：校验使用全局最新数据，未按所选月份
  - 处理：checkAssetConsistency 改为基于当前 monthKey 读取并校验；fixAssetConsistency 同步更新 reports:assets:YYYY-MM

- 下阶段（规划）
  - 上云：assets_snapshots 集合，唯一索引(userId, monthKey)
  - 云函数：按月查询与 upsert，页面切换与保存走云端