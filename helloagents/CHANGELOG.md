# Changelog

本文件记录项目所有重要变更。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/),
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增
- 集成 `PNG→APNG` 与 `Video→GIF` 两个工具为应用内弹窗组件（不再使用 iframe/静态页面）。
- `PNG→APNG`：支持批量上传并按文件名自然排序合成（确保使用全部上传图片）。
- `Video→GIF`：转换过程中展示进度、阶段与预计剩余时间，提升等待预期。
- 新增 `AI 图片扩展`（Gemini 3 Pro）：上传图片后点击输入栏工具栏的“AI图片扩展”选择尺寸（`size`）并生成延展结果，生成图写入对话并更新参考图。
- 新增 `/web` 工具入口：小红书封面（xhs-cover-skill 思路）一键生成 JSON prompts，并可选封面生图/全套生图，结果写入对话历史。
- 新增 `粒子化` 工具入口：集成 `reference/lumina-particleize` 操作界面为弹窗，支持上传/AI 生成、参数调节、导出 PNG / 透明 WebM；并移除输入栏“更多”按钮。
- 新增 Workspace 双栏工作台：左侧画板/工作流（`Canvas.tsx`），右侧对话（`ChatView`），支持拖拽分割条并持久化宽度。
- 新增自由排版/图层式画板：支持 pan/zoom/拖拽/缩放，布局与视口（位置/缩放）刷新后仍存在（IndexedDB）。
- 自动同步产物到画板：assistant `imageResponses` + Video2Gif/Png2Apng/Particleize；不自动同步用户上传/参考图。
- 画板选中工具栏：默认按钮满足 V1，同时保留 action registry 扩展点；视频“转 GIF”仅打开工具入口。
- 超限策略（A）：写入画板 Blob 遇到 `QuotaExceededError` 时暂停自动同步并提示，可手动恢复。
- 性能优化：画板交互采用 rAF 直写 transform 并在结束/节流时提交持久化，减少拖动/缩放卡顿；对话背景略加深以区分画板。
