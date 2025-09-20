# 记账模板使用三项修复方案

## 1) showLoading/hideLoading 成对使用
- 原则：任意异步链路使用 withLoading 包装，保证 finally 执行 hideLoading
- 伪代码：
  withLoading(async () => {
    await applyTemplate();
    await navigateToEdit();
  });

## 2) 模板跳转参数丢失
- navigateTo 携带：categoryId, accountId, amount, note, templateId, _version
- 目标页 onLoad 解析 options 并 setData
- 冷启动兜底：进入前保存一份到 storage，目标页读取并清理

## 3) 顶部间距问题
- 采用安全区与自适应，避免硬编码
- .page { padding-top: var(--nav-safe-top, 16px); }
- .card { margin-top: 12px; }

## 实施清单
- 新增 utils/withLoading.js
- 更新模板入口页：统一跳转参数
- 更新记账页 onLoad：参数还原 + storage 兜底
- 调整样式：顶部间距兼容刘海屏

## 验收
- 任何异常不遗留 loading
- 参数 100% 还原（返回/冷启动仍有效）
- 不同机型顶部间距一致且无遮挡