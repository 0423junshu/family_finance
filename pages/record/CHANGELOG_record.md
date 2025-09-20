# CHANGELOG - 记录编辑页（record）

## 2025-09-14
- 问题：非法跳转导致异常
- 修复：onLoad 严格校验 mode/id，非法回退为 create 并提示
- 验证：从多入口进入均工作正常