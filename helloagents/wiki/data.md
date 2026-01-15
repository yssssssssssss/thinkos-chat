# 数据模型

## 概述
核心数据模型集中在 `services/conversationService.ts`，用于描述对话与消息结构，并支持多模型文本/图像返回结果的持久化。

## Conversation
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 对话唯一标识 |
| title | string | 对话标题 |
| createdAt | number | 创建时间戳 |
| updatedAt | number | 更新时间戳 |
| messages | Message[] | 消息列表 |

## Message
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 消息唯一标识 |
| role | 'user' \| 'assistant' | 消息角色 |
| content | string | 文本内容 |
| timestamp | number | 时间戳 |
| textResponses | {modelId, modelName, content, status, error?}[] | 多模型文本结果 |
| imageResponses | {modelId, modelName, imageUrl?, prompt?, status, error?}[] | 多模型图片结果 |
| referenceImage | string | 参考图（base64/url） |

