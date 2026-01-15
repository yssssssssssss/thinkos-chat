# 任务清单: /web 工具入口（小红书封面）
目录: `helloagents/history/2026-01/202601151711_web_tools_xhs_cover/`

---

## 1. 服务层能力
- [√] `services/xhsCoverService.ts`：基于 xhs-cover-skill 思路生成小红书封面/信息图的 JSON prompts，并做 JSON 提取与最小校验

## 2. UI 弹窗
- [√] `src/chat/components/dialogs/WebToolsDialog.tsx`：/web 工具入口弹窗（先集成“小红书封面”页签）
- [√] 支持模板选择：Plan A（卡通信息图）/ Plan B（高级配色 Pro）
- [√] 支持生成模式：仅 JSON / 生成封面图（第 1 张）/ 生成全套图（最多 10 张）

## 3. ChatView 接入
- [√] `src/chat/ChatView.tsx` 工具栏新增 `Web` 按钮，点击打开弹窗
- [√] `src/chat/ChatView.tsx` 拦截输入 `/web`（可携带文本作为初始内容）打开弹窗
- [√] 生成完成后写入对话历史：JSON 以 `textResponses` 展示，生图结果以 `imageResponses` 展示
- [√] 若生成了图片，将第 1 张设为 `referenceImage` 便于继续编辑

## 4. 文档与历史
- [√] 更新 `helloagents/wiki/modules/chat.md`、`helloagents/wiki/modules/services.md`
- [√] 更新 `helloagents/CHANGELOG.md`、`helloagents/history/index.md`
- [√] 迁移方案包至 `helloagents/history/2026-01/202601151711_web_tools_xhs_cover/`

## 5. 验证
- [√] `npm run build`

---

> 状态：已完成（轻量迭代）

