# “我的”页家庭管理卡片 UI 统一（tdesign-miniprogram）

## 组件化
- 新增 components/common/feature-card（包装 tdesign）
- Props: icon, title, desc, disabled, bind:tap

## 视觉
- 圆角 12px；内边距 12~16px；阴影轻微
- 左侧圆形图标 40x40，浅色底 + 主题色图标
- 右侧标题 16px/600；描述 12px/#6B7280

## 交互
- 整卡可点击；active 背景 #F3F4F6
- disabled 降低 40% 透明度

## 适配
- 深色模式/多语言/长文本换行

## 落地步骤
- 新建通用卡片组件，接入 tdesign 样式体系
- “我的”页替换家庭管理卡片为通用组件

## 验收
- 视觉与交互与其他卡片一致
- 可达性：触控区 ≥ 44x44
- 深色模式适配通过