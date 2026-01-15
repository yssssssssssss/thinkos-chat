# 任务清单: 嵌入 PNG→APNG / Video→GIF 工具

目录: `helloagents/plan/202601141617_embed_tools/`

---

## 1. 工具静态托管与构建复制
- [√] 1.1 在 `vite.config.ts` 中增加静态托管逻辑：开发态将 `reference/*/dist` 挂载到 `/tools/png2apng/`、`/tools/video2gif/`。
- [√] 1.2 在 `vite.config.ts` 中增加构建后复制逻辑：`npm run build` 后将两工具的 `dist` 复制到主产物 `dist/tools/*`。

## 2. UI 入口接入
- [√] 2.1 在 `src/chat/ChatView.tsx` 的输入区工具栏加入 `PNG→APNG` 与 `Video→GIF` 两个入口按钮，并打开对应 `/tools/*` 页面。
- [√] 2.2 （可选）同步更新 `ChatDemo.tsx` 的工具栏入口，保持 demo 与主实现一致。

## 3. 参考项目嵌入适配
- [√] 3.1 调整 `reference/jdc-png2apng` 的构建 `base`，确保可在 `/tools/png2apng/` 运行。
- [√] 3.2 调整 `reference/jdc-video2gif` 的构建 `base`，并将路由改为 HashRouter，确保可在 `/tools/video2gif/` 运行。
- [√] 3.3 重新构建两个参考项目，产出更新后的 `reference/*/dist`。

## 4. 安全检查
- [√] 4.1 确认未引入敏感信息（密钥/令牌），以及工具入口只打开本地静态路径。

## 5. 验证与文档
- [√] 5.1 运行 `npm run build` 验证主项目构建通过且 `dist/tools/*` 产物存在。
- [√] 5.2 更新 `helloagents/CHANGELOG.md` 与 `helloagents/wiki/modules/tools.md`（如有必要）。

---

> **状态:** 已完成（轻量迭代）
