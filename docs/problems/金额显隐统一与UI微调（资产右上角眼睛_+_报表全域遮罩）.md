# 金额显隐统一与UI微调（资产右上角眼睛 + 报表全域遮罩）

## Core Features

- 资产页：小眼睛移至统计卡右上角；隐藏态显示为“***”不带货币符号

- 报表页：同一眼睛控制全页（所有TAB/周期）的金额显隐，隐藏态统一“***”

- 接入 privacyScope（资产页），保证刷新后记住选择

## Tech Stack

{
  "Web": {
    "arch": "weapp",
    "component": "null"
  },
  "iOS": "",
  "Android": ""
}

## Design

沿用 emoji 眼睛；显隐状态字段：assets/pageMoneyVisible、reports/pageMoneyVisible、index/hideAmount。金额显示：pageMoneyVisible ? '¥'+值 : '***'；首页已用 eye-toggle 组件不变。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[/] step4_pages_replace_and_perf
