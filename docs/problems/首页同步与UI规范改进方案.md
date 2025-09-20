# 首页同步与UI规范改进方案

## Core Features

- 一键同步路径与冲突策略（本地→云端→回写）

- 首页/交易页交易图标规范统一（样式层已统一，资源层待选）

- 记账模板三项修复（loading配对、参数保留、顶部间距：进一步优化完成）

- “我的”页家庭管理卡片UI统一与组件化

- 我的页首屏网络与字体问题修复（本地头像兜底、懒加载、移除远程字体URL）

- 全局ID一致性修复（分类/账户/标签解析器接入：record/transfer 已接入，services/report 待接入）

## Tech Stack

{
  "Web": {
    "arch": "html",
    "component": "tdesign"
  },
  "iOS": "",
  "Android": ""
}

## Design

统一ID解析层（id/_id/code/slug/名称/别名/宽松匹配），命中后回填标准ID；record 与 transfer 已生效，后续可扩展至服务层与统计。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] step1_sync_strategy_design

[X] step2_icons_spec_unify

[X] step3_template_flow_fixes

[/] step4_my_page_card_component

[ ] step5_tests_docs

[X] step6_me_page_perf_network_fix

[/] step7_global_id_consistency
