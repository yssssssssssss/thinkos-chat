# 任务清单: lumina_particleize_modal
目录: `helloagents/history/2026-01/202601171800_lumina_particleize_modal/`

---

## 1. Lumina Particleize 组件迁移
- [x] `src/chat/components/particleize/ParticleSystem.tsx`：粒子渲染与导出 PNG / 录制 WebM
- [x] `src/chat/components/particleize/Controls.tsx`：参数面板（上传/AI 生成、各参数与导出）
- [x] `src/chat/components/particleize/types.ts`、`src/chat/components/particleize/defaults.ts`：类型与默认参数
- [x] `services/luminaParticleizeService.ts`：复用现有 Gemini 图片生成能力，提供粒子化工具的源图生成

## 2. 弹窗接入
- [x] `src/chat/components/modals/LuminaParticleizeModal.tsx`：弹窗容器，保留原 lumina-particleize 的画布区+侧边控制区布局
- [x] `src/chat/ChatView.tsx`：新增工具按钮 `粒子化`，点击打开弹窗（首次打开默认使用 `referenceImage` 作为输入图像）

## 3. 取消“更多”按钮
- [x] `src/chat/ChatView.tsx`：移除工具栏 `更多` 按钮入口
- [x] `ChatDemo.tsx`：同步移除工具栏 `更多` 按钮入口

## 4. 文档与历史
- [x] 更新 `helloagents/wiki/modules/chat.md`
- [x] 更新 `helloagents/CHANGELOG.md`
- [x] 更新 `helloagents/history/index.md`

## 5. 验证
- [x] `npm run build`
- [x] `npx vitest run`

---

> 状态：已完成（轻量迭代）

