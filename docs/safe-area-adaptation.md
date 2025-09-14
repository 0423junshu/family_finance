# 首页安全区适配方案

## 背景
微信小程序首页顶部被系统UI（状态栏、刘海屏等）遮挡，需要通过动态调整padding-top来适配不同设备和屏幕方向。

## 解决方案

### 1. 纯CSS方案（主要方案）
使用CSS安全区函数和自定义变量实现自适应：

```css
/* 全局变量定义 */
:root {
  --index-top-base: 24rpx;     /* 基础间距 */
  --top-extra-height: 32rpx;   /* 额外高度 */
  --top-bg: #ffffff;           /* 安全区背景色 */
}

/* 三层兜底声明 */
.safe-area-wrapper {
  /* 兜底：不支持安全区的设备 */
  padding-top: calc(var(--index-top-base) + var(--top-extra-height));
  /* iOS 11/12 兼容 */
  padding-top: calc(var(--index-top-base) + var(--top-extra-height) + constant(safe-area-inset-top));
  /* 现代浏览器 */
  padding-top: calc(var(--index-top-base) + var(--top-extra-height) + env(safe-area-inset-top));
  background-color: var(--top-bg);
}
```

### 2. JavaScript兜底方案（可选）
针对CSS安全区不生效的设备提供JS动态计算：

```javascript
const BASE_PX = 12;    // 基础值（px）
const EXTRA_PX = 16;   // 额外高度（px）
const MIN_PX = 10;     // 最小值
const MAX_PX = 72;     // 最大值

// 计算公式
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const statusBar = wx.getSystemInfoSync().statusBarHeight || 0;
const paddingTopPx = clamp(BASE_PX + EXTRA_PX + statusBar, MIN_PX, MAX_PX);
```

### 3. 导航栏透明化
确保导航栏组件完全透明，继承父容器背景：

```css
.navigation-bar {
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
  border: none !important;
}
```

## 数值建议

### 基础值范围
- **rpx单位**: 20-32rpx，推荐24rpx
- **px单位**: 10-16px，推荐12px
- **额外高度**: 16-32rpx，推荐32rpx

### 计算公式
- **CSS**: `padding-top = base + extra + env(safe-area-inset-top)`
- **JS**: `paddingTop = basePx + extraPx + statusBarHeight`
- **约束**: `clamp(minPx, calculated, maxPx)`

## 设备兼容性

### iOS设备
- **刘海屏**: env(safe-area-inset-top) 通常44px（竖屏）
- **非刘海屏**: safe-area-inset-top 为0，使用base值
- **横屏**: safe-area-inset-top 自动调整为0-20px

### Android设备
- **全面屏**: 大多数safe-area-inset-top为0，依赖base值
- **状态栏高度**: 通常24px左右，通过JS获取
- **厂商差异**: 不同厂商状态栏高度可能不同

## 横竖屏适配

### CSS自动适配
- `env()`和`constant()`会随屏幕方向自动更新
- 无需额外JavaScript处理

### JS监听方案
```javascript
wx.onWindowResize(() => {
  // 节流处理，避免频繁更新
  clearTimeout(this.resizeTimer);
  this.resizeTimer = setTimeout(() => {
    this.updateSafeTop();
  }, 120);
});
```

## 使用方式

### 1. 引入样式
```css
@import '/styles/safe-area.wxss';
```

### 2. 应用到页面
```xml
<view class="safe-area-wrapper safe-area-white">
  <navigation-bar class="transparent-navbar" />
</view>
```

### 3. 可选JS增强
```javascript
// 仅在CSS方案不生效时启用
data: {
  useJsSafeTop: false  // 默认关闭
}
```

## 样式变量配置

### 全局调整
```css
/* app.wxss 或页面样式中 */
:root {
  --index-top-base: 28rpx;     /* 调整基础间距 */
  --top-extra-height: 40rpx;   /* 调整额外高度 */
  --top-bg: #f5f5f5;          /* 调整背景色 */
}
```

### 页面级覆盖
```css
.page-specific {
  --top-extra-height: 24rpx;   /* 页面特定高度 */
}
```

## 测试清单

### 设备测试
- [ ] iPhone 刘海屏（竖屏/横屏）
- [ ] iPhone 非刘海屏
- [ ] Android 全面屏设备
- [ ] Android 传统屏幕设备

### 功能测试
- [ ] 页面加载时顶部不被遮挡
- [ ] 横竖屏切换正常适配
- [ ] 导航栏与安全区颜色一致
- [ ] 不同机型显示效果一致

## 已知问题与解决

### 问题1: CSS安全区不生效
**解决**: 启用JS兜底方案，设置`useJsSafeTop: true`

### 问题2: 导航栏与安全区有分层
**解决**: 确保导航栏完全透明，使用`!important`覆盖默认样式

### 问题3: 横屏时高度过大
**解决**: CSS的`env()`会自动调整，JS方案需监听`onWindowResize`

## 性能考虑

### CSS方案优势
- 零JavaScript开销
- 自动响应系统变化
- 无布局抖动

### JS方案注意事项
- 仅在必要时启用
- 使用节流避免频繁更新
- 监听器需要正确清理

## 扩展应用

### 其他页面复用
1. 引入`/styles/safe-area.wxss`
2. 使用`.safe-area-wrapper`类
3. 根据需要调整CSS变量

### 主题适配
```css
/* 深色主题 */
.dark-theme {
  --top-bg: #1a1a1a;
}

/* 渐变背景 */
.gradient-theme {
  --top-bg: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
}