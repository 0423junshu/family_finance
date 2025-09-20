# 首页安全区适配（顶部 padding-top 自适应）

## Core Features

- 纯CSS安全区适配：变量兜底 + constant + env 三层声明

- 横竖屏自动适配，无需JS

- JS兜底：statusBarHeight 动态计算 + onWindowResize 节流重算（默认关闭，仅问题机型开启）

- 导航栏透明化：消除安全区与导航栏分层，统一纯白背景

- 可配置高度：通过 --top-extra-height 变量调整顶部留白

- 样式封装：创建可复用的安全区样式类，便于其他页面应用

## Tech Stack

{
  "Web": {
    "arch": "html",
    "component": null
  },
  "iOS": "env/constant 安全区兼容；必要时 JS 兜底",
  "Android": "变量兜底 + JS 可选叠加"
}

## Design

根容器使用 CSS 安全区三层兜底；导航栏透明继承父层背景；JS 仅作为问题机型的开关式增强，避免全局性能开销与抖动；横竖屏变化通过 onWindowResize 节流更新；提供可复用样式封装。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] CSS适配（index.wxss三段padding-top声明）

[X] JS兜底（statusBarHeight 计算 + onWindowResize重算）

[X] 导航栏透明化（移除白色背景与自带状态栏处理）

[X] 样式封装（创建可复用的safe-area.wxss）

[X] 页面模板更新（使用新的安全区样式类）

[X] 文档沉淀（docs/safe-area-adaptation.md）
