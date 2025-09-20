# 金额隐私显示开关与遮罩功能（WeApp）

## Core Features

- 修复交易列表金额颜色丢失（收入绿/支出红）

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

按照现有样式规则 .transaction-amount .amount.income/.expense，上色由金额 text 节点承担；WXML 补齐 class="amount income/expense"，保持单节点渲染不改布局。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] step4a_txn_list_ui_refine
