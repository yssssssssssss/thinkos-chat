# Gemini 图片 API 调试指南

## 当前问题

API 返回 404 错误：
```
{"error":{"cause":"app 'app-erqrs5y79c'not found","code":404,"message":"获取模型服务失败","status":"NOT_FOUND"}}
```

## 可能的原因

### 1. API 端点不正确
当前使用：`http://ai-api.jdcloud.com/v1/images/gemini_flash/generations`

可能需要：
- 不同的路径
- 不同的域名
- 特定的应用 ID

### 2. 模型名称不正确
当前使用：
- `Gemini-3-Pro-Image-Preview`
- `Gemini-2.5-flash-image-preview`

可能需要：
- 不同的大小写
- 不同的格式
- 特定的模型 ID

### 3. 请求格式问题
当前格式可能与 API 期望的不匹配

## 调试步骤

### 步骤 1：验证 API 端点

使用 curl 测试（从你的 test-image-1.py）：

```bash
curl --request POST \
  --url http://ai-api.jdcloud.com/v1/images/gemini_flash/generations \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "Gemini-2.5-flash-image-preview",
    "contents": {
        "role": "USER",
        "parts": [
          {
            "text": "Generate a photo of a typical breakfast."
          }
        ]
    },
    "generation_config": {
        "response_modalities": ["TEXT", "IMAGE"]
    },
    "stream": false
}'
```

### 步骤 2：检查 API 文档

需要确认：
1. 正确的 API 端点 URL
2. 正确的模型名称列表
3. 正确的请求格式
4. 是否需要特殊的 headers（如 Trace-id）

### 步骤 3：测试简化请求

尝试最简单的请求：

```bash
curl --request POST \
  --url YOUR_API_ENDPOINT \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "MODEL_NAME",
    "prompt": "A simple test"
  }'
```

### 步骤 4：查看完整错误信息

在浏览器控制台中查看：
1. 完整的请求 URL
2. 请求 headers
3. 请求 body
4. 响应 headers
5. 响应 body

## 临时解决方案

### 方案 1：使用 Mock 模式

在 `Canvas.tsx` 中设置：
```typescript
const USE_REAL_IMAGE_API = false;
```

这样可以继续使用其他功能，同时调试 API。

### 方案 2：使用文本模型

文本模型 API 已经正常工作，可以先使用文本生成功能。

### 方案 3：联系 API 提供商

如果是京东云的 API，可能需要：
1. 确认账户权限
2. 确认应用配置
3. 获取正确的端点和模型列表

## 需要的信息

为了修复这个问题，需要以下信息：

1. **正确的 API 端点**
   - 完整的 URL
   - 是否需要应用 ID

2. **可用的模型列表**
   - 模型的准确名称
   - 模型的功能说明

3. **请求格式示例**
   - 成功的请求示例
   - 响应格式示例

4. **认证信息**
   - API Key 格式
   - 是否需要其他认证

## 修改配置

### 修改 API 端点

在 `.env.local` 中：
```bash
VITE_GEMINI_IMAGE_API_URL=http://正确的端点地址
VITE_GEMINI_API_KEY=你的API密钥
```

### 修改模型名称

在 `constants.ts` 中：
```typescript
export const AVAILABLE_IMAGE_MODELS: ModelOption[] = [
  { 
    id: '正确的模型ID', 
    name: '显示名称', 
    selected: true
  },
];
```

### 修改请求格式

如果需要不同的请求格式，修改 `services/geminiImageService.ts` 中的 `requestBody`。

## 测试建议

1. **先测试文本 API**
   - 确认基本的 API 调用流程正常
   - 确认认证和网络没有问题

2. **使用 Postman 或 curl**
   - 在浏览器外测试 API
   - 排除前端代码问题

3. **查看网络请求**
   - 打开浏览器开发者工具
   - 查看 Network 标签
   - 检查实际发送的请求

4. **逐步调试**
   - 先测试最简单的请求
   - 逐步添加参数
   - 找出问题所在

## 联系支持

如果问题持续，建议：

1. 查看 API 文档
2. 联系 API 提供商支持
3. 在开发者社区提问
4. 检查是否有 API 更新

## 当前状态

- ✅ 文本模型 API 正常工作
- ✅ Mock 图片生成正常工作
- ❌ 真实图片 API 需要调试
- ✅ 日志系统可以查看详细错误

## 下一步

1. 获取正确的 API 文档
2. 确认端点和模型名称
3. 更新配置
4. 重新测试
5. 切换回真实 API 模式
