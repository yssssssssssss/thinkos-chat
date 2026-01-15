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
