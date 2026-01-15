# 任务清单: AI 图片扩展（Gemini 3 Pro）

目录: `helloagents/history/2026-01/202601141737_ai_image_expand/`

---

## 1. 服务层能力
- [√] `services/geminiImageService.ts` 支持 `size` 参数并提供 `expandImageWithGeminiPro(inputImage, size)`

## 2. UI 对话框
- [√] `src/chat/components/dialogs/AiImageExpandDialog.tsx` 提供尺寸选择与生成交互

## 3. ChatView 接入
- [√] `src/chat/ChatView.tsx` 工具栏增加 `AI图片扩展` 入口
- [√] `src/chat/ChatView.tsx` 打开扩展弹窗，生成后写入对话并更新 `referenceImage`

## 4. 文档与历史
- [√] 更新 `helloagents/wiki/modules/chat.md`、`helloagents/wiki/modules/services.md`
- [√] 更新 `helloagents/CHANGELOG.md`、`helloagents/history/index.md`
- [√] 迁移方案包至 `helloagents/history/2026-01/202601141737_ai_image_expand/`

## 5. 验证
- [√] UI：上传图片 → 输入栏工具栏 → AI图片扩展 → 选择尺寸 → 生成后对话出现结果图且参考图更新
- [√] 请求：Gemini 请求体包含 `size` 字段，提示词为“严格保持图片的主图不变，将背景按照需要的{size}尺寸进行扩展”

---

> **状态** 已完成（轻量迭代）
