# 任务清单: 双栏工作台（画布 + 对话）联动

目录: `helloagents/plan/202601191047_canvas_chat_workspace/`

---

## 1. Workspace 双栏结构（布局层）
- [ ] 1.1 新增 `src/workspace/WorkspaceLayout.tsx` 实现左画布/右对话分栏，验收：`why.md#需求-1双栏结构-场景默认进入工作台`
- [ ] 1.2 新增可拖拽分割条与最小宽度保护，验收：`why.md#需求-1双栏结构-场景默认进入工作台`
- [ ] 1.3 更新 `App.tsx` 使用 `WorkspaceLayout` 作为入口，保留原 ChatView/Canvas 能力入口，验收：`why.md#变更内容`

## 2. 容器化改造（避免全屏硬编码）
- [ ] 2.1 将 `src/chat/ChatView.tsx` 根容器从 `w-screen h-screen` 改为 `w-full h-full`，修复必要的滚动/弹窗定位回归，验收：`why.md#需求-1双栏结构-场景默认进入工作台`
- [ ] 2.2 将 `Canvas.tsx` 根容器从 `w-screen h-screen` 改为 `w-full h-full`，保证在左侧面板内正常缩放/拖拽，验收：`why.md#需求-1双栏结构-场景默认进入工作台`

## 3. WorkspaceContext（跨面板联动与资产同步）
- [ ] 3.1 新增 `src/workspace/WorkspaceContext.tsx` 定义 `activeConversationId`、资产写入 API、设置参考图 API，验收：`why.md#需求-2媒体同步`
- [ ] 3.2 在 ChatView 会话切换时写入 `activeConversationId`，验收：`why.md#需求-2媒体同步`
- [ ] 3.3 从当前会话消息派生图片/GIF 资产并同步到 Workspace（含去重），验收：`why.md#需求-2媒体同步-场景对话生成图片`

## 4. Canvas 媒体资产节点与工具栏
- [ ] 4.1 在 `types.ts` 新增 `NodeType.MEDIA_ASSET` 与对应数据结构，验收：`why.md#需求-2媒体同步`
- [ ] 4.2 新增 `components/nodes/MediaNode.tsx` 支持 image/gif/video 渲染与懒加载，验收：`why.md#需求-2媒体同步`
- [ ] 4.3 在 `Canvas.tsx` 将 Workspace 资产映射为画布节点并自动布局，验收：`why.md#需求-2媒体同步`
- [ ] 4.4 MediaNode 选中时展示工具栏（下载/复制/设为参考图/移除/打开工具入口），验收：`why.md#需求-3选中工具栏`

## 5. 工具产物（GIF/视频）同步
- [ ] 5.1 扩展 `src/chat/components/modals/Video2GifModal.tsx`：生成结果后提供“同步到画布”，验收：`why.md#需求-2媒体同步-场景对话工具生成视频`
- [ ] 5.2 扩展 `src/chat/components/modals/Png2ApngModal.tsx`：生成结果后提供“同步到画布”，验收：`why.md#需求-2媒体同步-场景对话生成-gif--apng`
- [ ] 5.3 在 `src/chat/components/particleize/*` 的导出 webm 流程中写入 Workspace 资产（可选：提供开关），验收：`why.md#需求-2媒体同步-场景对话工具生成视频`

## 6. 安全检查与回归验证
- [ ] 6.1 执行安全检查（按 G9）：不引入明文密钥、不新增危险命令/外链依赖，日志不泄露敏感信息
- [ ] 6.2 运行 `npm run test` 与关键手工回归（Chat 全功能、画布节点、媒体同步、会话切换）

## 7. 文档同步
- [ ] 7.1 更新 `helloagents/wiki/arch.md` 增补 Workspace/Canvas-Chat 联动架构图与关键决策（ADR 索引）
- [ ] 7.2 更新 `helloagents/CHANGELOG.md` 记录此次结构调整（进入开发实施后执行）

