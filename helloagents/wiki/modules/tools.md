# tools

## 目的
将 `PNG→APNG` 与 `Video→GIF` 两个工具以**应用内弹窗组件**方式集成到当前应用（不通过 iframe/页面跳转）。

## 模块概述
- **职责:** 在主应用输入栏提供工具入口；弹窗内完成上传/参数设置/转换/下载；并在构建/开发阶段提供 FFmpeg 静态资源（wasm/core/worker）托管与打包复制。
- **状态:** ??开发中
- **最后更新:** 2026-01-14

## 规范

### 需求: 嵌入 PNG→APNG 工具
**模块:** tools
在输入栏点击入口后以弹窗打开应用内组件（非 iframe）：支持批量上传 PNG 序列帧、按文件名自然排序、调整顺序并生成/下载 APNG。

### 需求: 嵌入 Video→GIF 工具
**模块:** tools
在输入栏点击入口后以弹窗打开应用内组件（非 iframe）：支持上传视频、设置时间范围/帧率/输出尺寸/颜色数，并在转换过程中展示进度与预计剩余时间。

## 依赖
- `src/chat/ChatView.tsx`（入口点击打开弹窗）
- `src/chat/components/modals/Png2ApngModal.tsx`
- `src/chat/components/modals/Video2GifModal.tsx`
- `vite.config.ts`（托管并复制 `reference/jdc-video2gif/public/ffmpeg` → `dist/ffmpeg`）
- `reference/jdc-png2apng/node_modules/upng-js`（APNG 编码）
- `reference/jdc-video2gif/public/ffmpeg`（FFmpeg core/wasm/worker 静态资源）
- `reference/jdc-video2gif/node_modules/@ffmpeg/*`（FFmpeg wasm 运行时依赖）

## 变更历史
- [202601141617_embed_tools](../../history/2026-01/202601141617_embed_tools/) - 嵌入 PNG→APNG / Video→GIF 工具入口
- [202601141747_embed_tools_modal](../../history/2026-01/202601141747_embed_tools_modal/) - 工具入口改为弹窗内嵌打开
- [202601141819_embed_tools_inapp](../../history/2026-01/202601141819_embed_tools_inapp/) - 工具改为应用内弹窗组件（非 iframe），并补齐 APNG 合成/转码进度
