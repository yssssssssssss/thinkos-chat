# services

## 目的
提供模型调用、对话存储、提示词等业务服务层封装。

## 模块概述
- **职责:** 对外部模型服务的请求封装、对话 CRUD 与本地存储、系统提示词与 PromptMark 管理。
- **状态:** ?稳定
- **最后更新:** 2026-01-15

## 依赖
- 浏览器 API（fetch、IndexedDB、localStorage）

## 能力
- `services/geminiImageService.ts`：支持在图片生成请求中传入 `size`，并提供 `expandImageWithGeminiPro(inputImage, size)` 用于背景扩展。
- `services/xhsCoverService.ts`：基于文本模型生成小红书封面/信息图的 JSON prompts（title/content_polished/tags/image_prompts）。

## 变更历史
- [202601151711_web_tools_xhs_cover](../../history/2026-01/202601151711_web_tools_xhs_cover/) - 新增 xhsCoverService：小红书封面 JSON prompts 生成
- [202601141737_ai_image_expand](../../history/2026-01/202601141737_ai_image_expand/) - Gemini 图片生成支持 `size` 参数，新增 AI 图片扩展封装
