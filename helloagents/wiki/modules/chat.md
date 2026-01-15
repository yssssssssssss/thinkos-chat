# chat

## 目的
提供对话主界面、输入区、侧边栏、工具面板与相关 UI 交互。

## 模块概述
- **职责:** 会话列表与选中、消息渲染、输入/发送、多模型结果展示、工具面板与弹窗。
- **状态:** ?稳定
- **最后更新:** 2026-01-15

## 规范

### 需求: 对话与多模型结果展示
**模块:** chat
支持文本/图像两种模式下的多模型对比展示与历史对话查看。

#### 场景: 发送消息并查看多模型响应
- 输入框输入内容后点击发送或按 Enter。
- UI 展示模型生成中的状态，完成后展示内容/图片。

### 需求: AI 图片扩展（Gemini 3 Pro）
- 前置：用户已上传参考图。
- 路径：输入栏工具栏 → AI图片扩展 → 选择尺寸（`size=WxH`）→ 生成。
- 结果：将扩展结果写入对话历史，并更新 `referenceImage`。

### 需求: /web 工具入口（小红书封面）
- 路径：输入 `/web`（可携带文本）或点击输入栏工具栏的 `Web` 按钮 → 选择“小红书封面” → 选择模板与生成模式 → 生成。
- 结果：JSON prompts 写入对话（`textResponses`）；如选择生图，将图片写入对话（`imageResponses`），并将第 1 张设为 `referenceImage`。

## 依赖
- `services/*`
- `utils/*`
- `src/agent`（可选：Agent 能力）

## 变更历史
- [202601151711_web_tools_xhs_cover](../../history/2026-01/202601151711_web_tools_xhs_cover/) - /web 工具入口：小红书封面 JSON prompts（可选一键生图）
- [202601141737_ai_image_expand](../../history/2026-01/202601141737_ai_image_expand/) - 新增 AI 图片扩展（Gemini 3 Pro），支持 `size` 参数扩展背景
- [202601141617_embed_tools](../../history/2026-01/202601141617_embed_tools/) - 输入栏增加工具入口（PNG→APNG / Video→GIF）
- [202601141747_embed_tools_modal](../../history/2026-01/202601141747_embed_tools_modal/) - 工具入口改为弹窗内嵌打开（不跳转页面）
