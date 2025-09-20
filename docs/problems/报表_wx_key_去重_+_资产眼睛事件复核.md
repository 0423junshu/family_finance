# 报表 wx:key 去重 + 资产眼睛事件复核

## Core Features

- reports-simple.wxml 将分类/标签列表统一使用 wx:key="uniqueKey"，避免重复 key 警告

- 复核 assets 页 onEyeToggle 方法与 WXML 绑定一致性，确保不再报错

## Tech Stack

{
  "Web": {
    "arch": "weapp",
    "component": "null"
  }
}

## Design

wx:key 使用增强后的 uniqueKey（由 enhanceCategoryStats/addUniqueKeys 生成），避免名称/服务端ID冲突导致的重复。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[/] step4_pages_replace_and_perf
