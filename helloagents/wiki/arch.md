# 架构设计

## 总体架构
```mermaid
flowchart TD
  UI[Chat UI] -->|调用| Services[services/*]
  UI -->|执行| Agent[src/agent + src/skills]
  Services -->|请求| Models[外部模型服务]
  Services -->|存储| Storage[(IndexedDB / localStorage)]
  UI -->|打开| Tools[tools 静态工具]
```

## 技术栈
- **前端:** React + TypeScript + Vite
- **数据:** IndexedDB（对话与大数据） + localStorage（备份/索引）
- **外部依赖:** Google GenAI / 其他模型服务（通过服务层封装）

## 核心流程
```mermaid
sequenceDiagram
  participant User as 用户
  participant UI as ChatView/InputArea
  participant Svc as multiModelService
  participant Store as conversationService

  User->>UI: 输入消息/上传参考图
  UI->>Store: 写入对话消息（用户侧）
  UI->>Svc: 发起多模型生成
  Svc-->>UI: 返回文本/图片结果
  UI->>Store: 写入对话消息（AI侧）
```

## 重大架构决策
| adr_id | title | date | status | affected_modules | details |
|--------|-------|------|--------|------------------|---------|

