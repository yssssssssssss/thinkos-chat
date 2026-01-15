# 任务清单: 工具入口改为弹窗嵌入

目录: `helloagents/plan/202601141747_embed_tools_modal/`

---

## 1. 弹窗组件
- [√] 1.1 新增通用弹窗组件（iframe 嵌入工具页面），支持关闭与自适应尺寸。

## 2. 入口行为调整
- [√] 2.1 将 `PNG→APNG`、`Video→GIF` 的点击行为从 `window.open` 改为打开弹窗，不发生页面跳转。
- [√] 2.2 （可选）同步旧版 `ChatDemo.tsx` 的入口行为，保持一致。

## 3. 验证
- [√] 3.1 运行 `npm run build` 验证构建通过。

## 4. 文档与归档
- [√] 4.1 更新 `helloagents/CHANGELOG.md` 与相关模块文档（如需要）。
- [√] 4.2 迁移本方案包到 `helloagents/history/2026-01/202601141747_embed_tools_modal/` 并更新 `helloagents/history/index.md`。

---

> **状态:** 已完成（轻量迭代）
