# thinkos-chat（GeminiFlow Canvas）

> 本文件包含项目级别的核心信息。详细的模块文档见 `modules/` 目录。

---

## 1. 项目概述

### 目标与背景
提供一个前端应用，用于多模型文本/图像能力对比与对话，包含对话管理、工具面板与部分图像处理能力，并支持通过 Agent/Skills 执行扩展能力。

### 范围
- **范围内:** 对话 UI、多模型调用、对话存储、内置工具面板、工具型功能入口（如 `PNG→APNG`、`Video→GIF`）。
- **范围外:** 后端服务实现与模型平台的运维部署（本仓库以客户端/集成逻辑为主）。

---

## 2. 模块索引

| 模块名称 | 职责 | 状态 | 文档 |
|---------|------|------|------|
| chat | 对话 UI 与面板/弹窗 | ?稳定 | [chat](modules/chat.md) |
| agent | Agent 执行与技能集成 | ??开发中 | [agent](modules/agent.md) |
| services | 模型/对话/提示词等服务封装 | ?稳定 | [services](modules/services.md) |
| utils | 通用工具与图像处理 | ?稳定 | [utils](modules/utils.md) |
| tools | 嵌入式工具入口与静态托管 | ??开发中 | [tools](modules/tools.md) |

---

## 3. 快速链接
- [技术约定](../project.md)
- [架构设计](arch.md)
- [API 手册](api.md)
- [数据模型](data.md)
- [变更历史](../history/index.md)

