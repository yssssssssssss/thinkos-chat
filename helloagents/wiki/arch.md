# 架构设计

## Workspace（双栏工作台）
- 左侧：Board（自由排版/图层式画布）+ Workflow（复用旧 `Canvas.tsx`）
- 右侧：Chat（`src/chat/ChatView.tsx`）

```mermaid
flowchart LR
  App[App.tsx] --> WS[Workspace]
  WS --> Provider[WorkspaceProvider]
  Provider --> Layout[WorkspaceLayout]
  Layout --> Board[BoardCanvas]
  Layout --> Workflow[Canvas.tsx]
  Layout --> Chat[ChatView]

  Provider --> Ctx[WorkspaceContext]
  Board --> Ctx
  Workflow --> Ctx
  Chat --> Ctx

  Ctx --> BoardCtl[useBoardController]
  BoardCtl --> BoardDb[boardDb]
  BoardDb --> IDB[(IndexedDB: ThinkosWorkspaceBoard)]

  Chat --> ConvSvc[conversationService (IndexedDB)]
  Chat --> Tools[Video2Gif / Png2Apng / Particleize]
  Tools -->|onGenerated/onVideoExported| BoardCtl
  Chat -->|assistant imageResponses sync| BoardCtl
```

## Persistence（刷新后仍存在）
- Workspace split：localStorage `thinkos.workspace.splitLeftWidth`
- Board：独立 IndexedDB `ThinkosWorkspaceBoard`
  - `board_items`：item 布局（x/y/w/h/zIndex）+ source/meta
  - `board_state`：viewport（panX/panY/zoom）+ selected + flags
  - `board_blobs`：工具产物 Blob（gif/apng/video）与元信息

## Auto-sync 规则
- 允许自动同步：Video2Gif / Png2Apng / Particleize 产物 + assistant `imageResponses`
- 不自动同步：用户上传与参考图（`referenceImage`）
- 超限策略（A）：写入 `board_blobs` 触发 `QuotaExceededError` 时暂停自动同步并提示，用户可在 Workspace 顶部手动恢复

## 性能关键点（画板交互）
- pan/zoom/move/resize：使用 `requestAnimationFrame` 直接写 DOM style（transform），仅在 pointerup/节流后提交到 controller 持久化

## 重大架构决策（ADR）
| adr_id | title | date | status | affected_modules | details |
|--------|-------|------|--------|------------------|---------|
| ADR-20260119-01 | Workspace 双栏 + Board 常驻 | 2026-01-19 | accepted | `src/workspace/*`, `src/board/*`, `src/chat/ChatView.tsx` | 左侧画板/工作流切换，右侧对话；画板跨会话汇总 |
| ADR-20260119-02 | Board 独立 IndexedDB | 2026-01-19 | accepted | `src/board/boardDb.ts` | 使用 `ThinkosWorkspaceBoard` 避免与对话 DB 迁移耦合 |
| ADR-20260119-03 | Quota 超限策略 A | 2026-01-19 | accepted | `src/board/useBoardController.ts`, `src/workspace/WorkspaceContext.tsx` | 超限时暂停 blob 自动同步并提示恢复入口 |
