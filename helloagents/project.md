# 项目技术约定

## 技术栈
- **前端:** React + TypeScript + Vite
- **样式:** Tailwind Play CDN（见 `index.html`）
- **测试:** Vitest

## 开发约定
- **代码规范:** 跟随现有代码风格；组件与模块尽量小步改动。
- **命名约定:** TypeScript/React 常规命名；组件使用 `PascalCase`，变量使用 `camelCase`。

## 错误与日志
- **策略:** 优先在服务层/工具层输出明确错误信息，UI 层兜底提示。
- **日志:** 使用现有 `src/chat/utils/logger`（如适用）。

## 测试与流程
- **测试:** 优先跑 `npm run test` 或最小化的相关测试。
- **构建验证:** `npm run build`。

