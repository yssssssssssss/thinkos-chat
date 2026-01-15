# API 手册

## 概述
本项目主要为前端应用，API 调用集中在 `services/` 目录，负责与外部模型服务交互并返回结构化结果供 UI 展示。

## 认证方式
- 以环境变量/配置注入为主（见 `vite.config.ts` 的 `define` 注入）。
- 注意避免在仓库中硬编码密钥。

## 接口列表（概览）

### services/multiModelService
- **用途:** 多模型并发调用与结果聚合（文本/图像）。

### services/conversationService
- **用途:** 对话 CRUD 与本地持久化（IndexedDB + localStorage 兜底）。

