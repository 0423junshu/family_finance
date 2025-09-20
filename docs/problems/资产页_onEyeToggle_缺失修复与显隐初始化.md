# 资产页 onEyeToggle 缺失修复与显隐初始化

## Core Features

- assets.js 引入 privacyScope，新增 pageMoneyVisible 并在 onLoad 初始化

- 实现 onEyeToggle，切换并持久化（privacyScope + 会话兜底）

- assets.wxml 绑定 onEyeToggle，隐藏态“***”已生效

- assets.wxss 增加 header-actions 定位与 eye 样式，眼睛位于总览卡片右上角

- reports-simple.wxml 补齐账户统计金额遮罩，统一受 pageMoneyVisible 控制

## Tech Stack

{
  "Web": {
    "arch": "weapp",
    "component": "null"
  }
}

## Design

页面级持久化优先（privacyScope.get/setPageVisible），展示层统一以 pageMoneyVisible 控制金额显示/隐藏；隐藏态统一“***”。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[/] step1_privacy_storage_crypto

[ ] step2_settings_toggle_page

[ ] step3_common_money_components_weapp

[X] step4_pages_replace_and_perf

[ ] step5_react_components_and_css

[ ] step6_tests_and_docs

[ ] step7_compatibility_and_acceptance
