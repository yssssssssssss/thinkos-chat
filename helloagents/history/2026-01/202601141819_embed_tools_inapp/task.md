# 任务清单: 工具改为应用内弹窗组件（PNG→APNG / Video→GIF）

目录: `helloagents/plan/202601141819_embed_tools_inapp/`

---

## 1. UI 接入与移除 iframe
- [√] 1.1 在 `src/chat/ChatView.tsx` 将工具弹窗从 `iframe(/tools/*)` 改为应用内组件弹窗。
- [√] 1.2 新增 `src/chat/components/modals/Png2ApngModal.tsx` 与 `src/chat/components/modals/Video2GifModal.tsx`。

## 2. PNG→APNG 功能逻辑校验
- [√] 2.1 支持批量上传 PNG，按文件名自然排序，并确保生成时使用全部上传图片。
- [√] 2.2 支持调整帧顺序、生成预览与下载输出（APNG/PNG 容器）。

## 3. Video→GIF 等待与进度
- [√] 3.1 转换过程中展示阶段、进度百分比与预计剩余时间（提升等待预期）。
- [√] 3.2 在 `vite.config.ts` 增加 `/ffmpeg` 静态托管与构建复制（来自 `reference/jdc-video2gif/public/ffmpeg`）。

## 4. 文档同步
- [√] 4.1 更新 `helloagents/wiki/modules/tools.md`、`helloagents/CHANGELOG.md` 与 `helloagents/history/index.md`。

## 5. 验证
- [√] 5.1 运行 `npm run build`，确认主项目构建通过。

---

> **状态:** 已完成（轻量迭代）
