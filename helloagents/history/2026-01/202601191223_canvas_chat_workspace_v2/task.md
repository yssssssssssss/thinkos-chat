# 任务清单: 双栏工作台（自由画布/图层 + 对话）联动

目录: `helloagents/plan/202601191223_canvas_chat_workspace_v2/`

---

## 1. Workspace 双栏结构（布局层）
- [✅] 1.1 新增 `WorkspaceLayout`（左画布/右对话）与拖拽分割条（最小宽度保护）
- [-] 1.2 窄屏折叠策略（折叠画布或上下布局）
  > 备注：本轮未做，当前以最小宽度保护为主
- [✅] 1.3 更新 `App.tsx` 使用 Workspace 作为入口，保留原能力入口

## 2. 自由画布（图层式 Board）
- [✅] 2.1 新增 `src/board`：实现 BoardCanvas（渲染 item、视口平移/缩放、选中状态）
- [✅] 2.2 实现 item 拖拽排版 + 选中边框 + zIndex 基础能力
- [✅] 2.3 实现 item 缩放（resize handle，V1 可只做等比）

## 3. 画布持久化（IndexedDB）
- [✅] 3.1 新增 `boardStorage`：保存 `board_items`、`board_state`
- [✅] 3.2 增加 `board_blobs`：保存工具产物 Blob，刷新后可恢复
- [✅] 3.3 增加容量策略（上限/提示/清理策略至少其一可用）

## 4. 工具产物自动同步（允许范围内）
- [✅] 4.1 `Video2GifModal` 产物生成后自动写入 board（blob 持久化）
- [✅] 4.2 `Png2ApngModal` 产物生成后自动写入 board（blob 持久化）
- [✅] 4.3 Particleize 导出产物（webm）生成后自动写入 board（blob 持久化）
- [✅] 4.4 严格过滤：不自动同步用户上传与参考图

## 5. 选中工具栏（可扩展）
- [✅] 5.1 实现 Action Registry（动作注册/筛选/执行）
- [✅] 5.2 默认动作（V1）：
  - 图片/GIF：设为参考图、下载、复制、移除
  - 视频：下载、移除、转 GIF（打开 Video2Gif 或二次处理入口）
- [✅] 5.3 为后续扩展预留注册入口（无需改 Board 核心即可新增按钮）

## 6. 能力保留：工作流画布入口（Canvas.tsx）
- [✅] 6.1 将 `Canvas.tsx` 容器化（避免 `w-screen h-screen`），确保可嵌入左侧面板
- [✅] 6.2 Workspace 左侧提供“画板/工作流”切换入口

## 7. 安全检查与回归验证
- [✅] 7.1 安全检查（按 G9）：不保存/输出密钥；不引入高风险命令；日志不泄露敏感信息
- [?] 7.2 运行 `npm run test` + 关键手工回归（Chat、工具产物同步、画布持久化、工作流入口）
  > 备注：当前环境 `vitest` 触发 `spawn EPERM`；已验证 `npm run build` 通过

## 8. 文档同步
- [✅] 8.1 更新 `helloagents/wiki/arch.md`：补充 Workspace + Board 架构图与 ADR 索引
- [✅] 8.2 更新 `helloagents/CHANGELOG.md`：记录本次结构调整（进入开发实施后执行）
