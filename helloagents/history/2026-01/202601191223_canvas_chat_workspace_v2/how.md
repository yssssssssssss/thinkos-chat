# 技术设计: 双栏工作台（自由画布/图层 + 对话）联动

## 总体策略
- **新增，不替换**：新增自由画布模块作为主画布体验；保留现有 `Canvas.tsx` 作为“工作流”子模式入口，保证“全部能力”不丢失。
- **自动沉淀 + 可持久化**：工具产物自动同步到自由画布；布局与视口状态持久化到 IndexedDB，刷新后可恢复。
- **可扩展工具栏**：工具栏动作通过注册机制扩展（action registry），便于后续迭代。

## 架构设计
```mermaid
flowchart TD
  App[App.tsx] --> WS[WorkspaceLayout]
  WS --> Board[BoardCanvas(自由画布)]
  WS --> Chat[ChatView(对话)]
  WS --> WF[WorkflowCanvas(Canvas.tsx 复用)]

  WS --> Ctx[WorkspaceContext]
  Board --> Ctx
  Chat --> Ctx
  WF --> Ctx

  Ctx --> BoardSvc[boardService]
  BoardSvc --> IDB[(IndexedDB: board_items + board_blobs + board_state)]
```

## 关键数据模型（建议）
### BoardItem（画布元素）
- `id: string`（稳定 ID）
- `kind: 'image' | 'gif' | 'video' | 'apng'`
- `src`：
  - `srcType: 'blob' | 'url' | 'dataUrl'`
  - `blobId?: string`（srcType=blob）
  - `url?: string`（srcType=url/dataUrl）
- 布局：
  - `x,y`（世界坐标）
  - `w,h`（尺寸）
  - `zIndex`
- 元信息：
  - `createdAt`
  - `source: 'video2gif' | 'png2apng' | 'particleize' | 'chat' | 'other'`
  - `filename?` / `prompt?` / `modelName?`（可选）

### BoardState（画布视口）
- `panX, panY, zoom`
- `selectedItemId?`

## 存储设计（IndexedDB）
### 推荐策略（V1）
- 使用独立 DB（例如 `ThinkosWorkspaceBoard`）避免影响现有 `conversationService` 的 DB 版本与迁移风险。
- ObjectStore 设计：
  - `board_items`：保存 `BoardItem`（不直接存 ObjectURL）
  - `board_blobs`：`{ id, blob, kind, createdAt, filename }`（用于工具产物持久化）
  - `board_state`：仅 1 条记录（视口/选中等）

### ObjectURL 管理
- 运行时为 `blobId` 生成 `URL.createObjectURL(blob)` 用于渲染。
- 在移除 item、清空画布、页面卸载时 `URL.revokeObjectURL(url)`。

### 容量策略（实现要求）
- IndexedDB 存储有配额限制，必须实现至少一种策略：
  - 上限（例如 200 个媒体或 N MB）
  - 超限提示与处理（停止自动同步/自动清理/让用户选择）

## 同步来源与过滤规则
### 允许自动同步的来源（已确认）
- Video2Gif 产物（GIF）
- Png2Apng 产物（APNG）
- Particleize 导出产物（webm）

### 不自动同步的来源（已确认）
- 用户上传文件
- 参考图（`referenceImage`）

### 对话生成图片（待确认）
- 建议默认同步 assistant 的 `imageResponses[]`：
  - 可自动覆盖“对话生成图片/编辑图”场景
  - 不会误同步用户上传与参考图（它们不在 assistant `imageResponses` 中）

## UI/交互实现要点（自由画布）
### 坐标系与视口变换
- Board 使用“世界坐标”存储 item 位置与尺寸。
- 渲染层使用 CSS transform：`translate(panX, panY) scale(zoom)`。
- 缩放以鼠标指针为中心调整 `panX/panY`（体验接近设计工具）。

### 拖拽/选中/缩放 item
- PointerEvents 处理拖拽（按当前 zoom 修正位移）。
- 选中后显示边框与工具栏；缩放用角点 resize handle（V1 可只做等比缩放）。

### 工具栏扩展点（Action Registry）
- 定义 `BoardAction`：
  - `id,label,icon,when(item)=>boolean,run(ctx,item)=>void`
- 工具栏根据 `when` 过滤可用动作渲染按钮；新增动作仅需注册，不侵入 Board 核心。

## 现有能力保留方案（Canvas.tsx）
- `Canvas.tsx` 保留并容器化（从 `w-screen h-screen` → `w-full h-full`），在 Workspace 左侧提供子模式入口：
  - 模式 A：画板（自由画布）
  - 模式 B：工作流（现有节点画布）

## 测试与验证
- 单元测试（vitest）：
  - boardItems 去重/插入/删除
  - 持久化读写（可测纯逻辑层，IndexedDB 部分做最小可测）
- 手工回归：
  - Chat 全功能可用
  - 工具产物自动进入画布 + 可拖拽 + 刷新后仍在
  - 工作流画布入口可用

