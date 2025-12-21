# 文本模型集成说明

## 概述

已成功将文本模型 API 集成到工作流画布中，支持调用真实的大语言模型 API。

## 新增功能

### 1. 文本模型节点 (TextModelNode)
- 位置：`components/nodes/TextModelNode.tsx`
- 功能：选择并调用文本生成模型
- 支持的模型：
  - Gemini 2.0 Flash (Fast) - 默认选中
  - Gemini 1.5 Pro (Balanced)
  - Gemini 1.5 Flash (Ultra Fast)
- 视觉标识：绿色主题，Type 图标

### 2. 文本结果节点 (TextResultNode)
- 位置：`components/nodes/TextResultNode.tsx`
- 功能：显示文本生成结果
- 特性：
  - 显示生成的文本内容
  - 一键复制功能
  - 状态指示（加载中/成功/失败）
  - 显示使用的模型和提示词

### 3. 文本模型服务 (textModelService)
- 位置：`services/textModelService.ts`
- 功能：处理文本模型 API 调用
- 支持的 API 格式：
  - OpenAI 格式 (choices)
  - Gemini 格式 (candidates)
  - 直接输出格式 (output_text)

## 配置说明

### 环境变量配置

在 `.env.local` 文件中配置：

```bash
# 文本模型 API 配置
VITE_TEXT_MODEL_API_URL=https://modelservice.jdcloud.com/v1/chat/completions
VITE_TEXT_MODEL_API_KEY=your-api-key-here
```

### Vite 配置

`vite.config.ts` 已更新，自动将环境变量注入到应用中：

```typescript
define: {
  'process.env.TEXT_MODEL_API_URL': JSON.stringify(env.VITE_TEXT_MODEL_API_URL),
  'process.env.TEXT_MODEL_API_KEY': JSON.stringify(env.VITE_TEXT_MODEL_API_KEY)
}
```

## 使用方法

### 基本工作流

1. **添加提示词节点**
   - 点击工具栏的 "+ 提示词" 按钮
   - 输入你的问题或指令

2. **添加文本模型节点**
   - 点击工具栏的 "+ 文本模型" 按钮
   - 选择一个或多个模型

3. **连接节点**
   - 从提示词节点的输出连接到文本模型节点的输入

4. **生成文本**
   - 点击文本模型节点的 "Generate" 按钮
   - 等待 API 响应

5. **查看结果**
   - 自动生成的文本结果节点会显示在右侧
   - 每个选中的模型会生成一个独立的结果节点

### 高级功能

- **多模型对比**：同时选择多个模型，对比不同模型的输出
- **复制结果**：点击结果节点右上角的复制按钮
- **错误处理**：如果 API 调用失败，会显示错误信息

## API 集成细节

### 请求格式

```typescript
{
  model: string,
  messages: [
    { role: 'user', content: string }
  ],
  stream: false
}
```

### 响应解析

服务会自动解析以下格式的响应：

1. **OpenAI 格式**
```json
{
  "choices": [
    {
      "message": {
        "content": "生成的文本"
      }
    }
  ]
}
```

2. **Gemini 格式**
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          { "text": "生成的文本" }
        ]
      }
    }
  ]
}
```

3. **直接输出格式**
```json
{
  "output_text": "生成的文本"
}
```

## 类型定义

### TextModelNodeData
```typescript
interface TextModelNodeData {
  models: ModelOption[];
}
```

### TextResultNodeData
```typescript
interface TextResultNodeData {
  text: string;
  model: string;
  sourcePrompt: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}
```

## 安全注意事项

1. **API 密钥管理**
   - 永远不要将真实的 API 密钥提交到代码仓库
   - 使用 `.env.local` 文件存储密钥（已在 .gitignore 中）
   - 生产环境使用环境变量注入

2. **输入验证**
   - 用户输入会被发送到外部 API
   - 考虑添加内容过滤和长度限制

3. **错误处理**
   - API 调用失败会显示错误信息
   - 不会暴露敏感的 API 密钥信息

## 测试

### 手动测试步骤

1. 启动开发服务器：
```bash
npm run dev
```

2. 在浏览器中打开 `http://localhost:3666`

3. 创建工作流：
   - 添加提示词节点，输入 "世界最长的河流是什么？"
   - 添加文本模型节点，选择 Gemini 2.0 Flash
   - 连接节点并点击 Generate

4. 验证结果：
   - 应该看到文本结果节点出现
   - 显示模型的回答
   - 可以复制文本内容

### Python 测试脚本

参考 `text-test.py` 进行独立的 API 测试：

```bash
python text-test.py "你的测试问题"
```

## 故障排除

### API 调用失败

1. 检查 `.env.local` 中的 API 密钥是否正确
2. 检查网络连接
3. 查看浏览器控制台的错误信息
4. 验证 API URL 是否可访问

### 环境变量未生效

1. 重启 Vite 开发服务器
2. 确认 `.env.local` 文件在项目根目录
3. 确认变量名以 `VITE_` 开头

## 未来改进

- [ ] 添加流式输出支持
- [ ] 添加温度、top_p 等参数控制
- [ ] 添加对话历史支持
- [ ] 添加 token 使用统计
- [ ] 添加请求重试机制
- [ ] 添加请求超时控制
