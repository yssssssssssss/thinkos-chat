# 模型配置指南

## 快速索引

- **添加新模型** → 修改 `constants.ts`
- **修改 System Prompt** → 修改 `services/textModelService.ts`
- **修改 API 配置** → 修改 `.env.local`

---

## 1. 添加新模型

### 文件位置
📁 **`constants.ts`**

### 添加文本模型

```typescript
export const AVAILABLE_TEXT_MODELS: ModelOption[] = [
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Fast)', selected: true },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Balanced)', selected: false },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Ultra Fast)', selected: false },
  
  // 添加新模型 ↓
  { 
    id: 'gpt-4-turbo',                    // API 调用时使用的模型 ID
    name: 'GPT-4 Turbo (OpenAI)',         // 在 UI 中显示的名称
    selected: false                        // 是否默认选中
  },
  { 
    id: 'claude-3-opus-20240229', 
    name: 'Claude 3 Opus (Anthropic)', 
    selected: false 
  },
  { 
    id: 'llama-3-70b', 
    name: 'Llama 3 70B (Meta)', 
    selected: false 
  },
];
```

### 添加图片模型

```typescript
export const AVAILABLE_IMAGE_MODELS: ModelOption[] = [
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro (High Quality)', selected: true },
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash (Fast)', selected: false },
  { id: 'imagen-3.0-generate-001', name: 'Imagen 3 (Specialized)', selected: false },
  
  // 添加新模型 ↓
  { 
    id: 'dall-e-3', 
    name: 'DALL-E 3 (OpenAI)', 
    selected: false 
  },
  { 
    id: 'stable-diffusion-xl', 
    name: 'Stable Diffusion XL', 
    selected: false 
  },
];
```

### 模型配置说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 模型的唯一标识符，必须与 API 要求的模型名称一致 |
| `name` | string | 在界面上显示的友好名称 |
| `selected` | boolean | 是否默认选中（建议只有一个为 true） |

---

## 2. 修改 System Prompt

### 文件位置
📁 **`services/textModelService.ts`**

### 方法 1：修改默认 System Prompt

找到这一行并修改：

```typescript
// 默认 System Prompt（可以在这里修改）
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant. Please provide clear, accurate, and concise responses.';
```

**示例：**

```typescript
// 专业助手
const DEFAULT_SYSTEM_PROMPT = 'You are a professional AI assistant with expertise in technology and business. Provide detailed, well-structured responses.';

// 创意写作助手
const DEFAULT_SYSTEM_PROMPT = 'You are a creative writing assistant. Help users with storytelling, character development, and narrative structure. Be imaginative and inspiring.';

// 代码助手
const DEFAULT_SYSTEM_PROMPT = 'You are an expert programming assistant. Provide clean, efficient code with clear explanations. Follow best practices and modern conventions.';

// 中文助手
const DEFAULT_SYSTEM_PROMPT = '你是一个专业的中文 AI 助手。请用简洁、准确、友好的语言回答问题。';

// 教育助手
const DEFAULT_SYSTEM_PROMPT = 'You are a patient and knowledgeable tutor. Explain concepts clearly with examples. Encourage learning and critical thinking.';
```

### 方法 2：为不同模型设置不同的 System Prompt

在 `chatCompletions` 函数中添加逻辑：

```typescript
export const chatCompletions = async (
  model: string,
  messages: Message[],
  apiUrl?: string,
  apiKey?: string,
  systemPrompt?: string
): Promise<string> => {
  const url = apiUrl || process.env.TEXT_MODEL_API_URL || 'https://modelservice.jdcloud.com/v1/chat/completions';
  const key = apiKey || process.env.TEXT_MODEL_API_KEY || 'YOUR_API_KEY_HERE';
  
  // 根据模型选择不同的 System Prompt
  let finalSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;
  
  if (model.includes('gpt-4')) {
    finalSystemPrompt = 'You are GPT-4, a highly capable AI assistant...';
  } else if (model.includes('claude')) {
    finalSystemPrompt = 'You are Claude, an AI assistant created by Anthropic...';
  } else if (model.includes('gemini')) {
    finalSystemPrompt = 'You are Gemini, Google\'s most capable AI model...';
  }
  
  const finalMessages: Message[] = [
    { role: 'system', content: finalSystemPrompt },
    ...messages
  ];
  
  // ... 其余代码
};
```

### 方法 3：通过 UI 动态设置（高级）

如果需要用户在 UI 中自定义 System Prompt，需要：

1. 在 `TextModelNodeData` 类型中添加字段：

```typescript
// types.ts
export interface TextModelNodeData {
  models: ModelOption[];
  systemPrompt?: string;  // 添加这一行
}
```

2. 在 `TextModelNode.tsx` 中添加输入框：

```typescript
<textarea
  value={data.systemPrompt || ''}
  onChange={(e) => updateData({ systemPrompt: e.target.value })}
  placeholder="自定义 System Prompt（可选）"
  className="w-full p-2 rounded-lg bg-black/20 text-white text-sm"
  rows={3}
/>
```

3. 在 `Canvas.tsx` 的 `executeWorkflow` 中传递：

```typescript
const systemPrompt = (modelNode.data as TextModelNodeData).systemPrompt;
const results = await generateTextFromPrompt(promptText, selectedModels, systemPrompt);
```

---

## 3. 修改 API 配置

### 文件位置
📁 **`.env.local`**

### 基本配置

```bash
# 文本模型 API 配置
VITE_TEXT_MODEL_API_URL=https://modelservice.jdcloud.com/v1/chat/completions
VITE_TEXT_MODEL_API_KEY=your-api-key-here

# 图片模型 API 配置（如果需要）
GEMINI_API_KEY=your-gemini-api-key
```

### 使用不同的 API 提供商

#### OpenAI

```bash
VITE_TEXT_MODEL_API_URL=https://api.openai.com/v1/chat/completions
VITE_TEXT_MODEL_API_KEY=sk-your-openai-key
```

#### Anthropic Claude

```bash
VITE_TEXT_MODEL_API_URL=https://api.anthropic.com/v1/messages
VITE_TEXT_MODEL_API_KEY=sk-ant-your-anthropic-key
```

#### Azure OpenAI

```bash
VITE_TEXT_MODEL_API_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2024-02-15-preview
VITE_TEXT_MODEL_API_KEY=your-azure-key
```

#### 本地模型（Ollama）

```bash
VITE_TEXT_MODEL_API_URL=http://localhost:11434/v1/chat/completions
VITE_TEXT_MODEL_API_KEY=ollama
```

### 注意事项

⚠️ **重要：修改 `.env.local` 后需要重启开发服务器**

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
npm run dev
```

---

## 4. 高级配置

### 添加模型参数控制

如果需要控制温度、top_p 等参数，修改 `textModelService.ts`：

```typescript
export const chatCompletions = async (
  model: string,
  messages: Message[],
  apiUrl?: string,
  apiKey?: string,
  systemPrompt?: string,
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  }
): Promise<string> => {
  // ...
  
  body: JSON.stringify({
    model,
    messages: finalMessages,
    stream: false,
    temperature: options?.temperature ?? 0.7,
    top_p: options?.top_p ?? 1.0,
    max_tokens: options?.max_tokens ?? 2000,
  }),
  
  // ...
};
```

### 添加模型分组

在 `constants.ts` 中组织模型：

```typescript
export const TEXT_MODEL_GROUPS = {
  gemini: [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', selected: true },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', selected: false },
  ],
  openai: [
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', selected: false },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', selected: false },
  ],
  anthropic: [
    { id: 'claude-3-opus', name: 'Claude 3 Opus', selected: false },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', selected: false },
  ],
};

// 合并所有模型
export const AVAILABLE_TEXT_MODELS: ModelOption[] = [
  ...TEXT_MODEL_GROUPS.gemini,
  ...TEXT_MODEL_GROUPS.openai,
  ...TEXT_MODEL_GROUPS.anthropic,
];
```

---

## 5. 常见问题

### Q: 添加模型后看不到？
A: 确保已保存 `constants.ts` 文件，刷新浏览器页面。

### Q: System Prompt 不生效？
A: 检查 API 是否支持 system role。某些 API 可能需要不同的格式。

### Q: 如何测试新模型？
A: 
1. 添加模型到 `constants.ts`
2. 在 UI 中创建工作流测试
3. 或使用 `text-test.py` 脚本独立测试

### Q: 不同模型需要不同的 API？
A: 可以在 `textModelService.ts` 中根据模型 ID 动态选择 API URL：

```typescript
let apiUrl = process.env.TEXT_MODEL_API_URL;
if (model.includes('gpt')) {
  apiUrl = 'https://api.openai.com/v1/chat/completions';
} else if (model.includes('claude')) {
  apiUrl = 'https://api.anthropic.com/v1/messages';
}
```

---

## 6. 快速参考

### 文件清单

| 文件 | 用途 |
|------|------|
| `constants.ts` | 添加/删除模型 |
| `services/textModelService.ts` | 修改 System Prompt、API 逻辑 |
| `.env.local` | API 密钥和 URL 配置 |
| `types.ts` | 类型定义（通常不需要修改） |

### 修改后的操作

1. 保存文件
2. 如果修改了 `.env.local`，重启开发服务器
3. 刷新浏览器
4. 测试新配置

---

## 7. 示例配置

### 场景 1：添加 GPT-4 支持

**constants.ts:**
```typescript
{ id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', selected: false }
```

**.env.local:**
```bash
VITE_TEXT_MODEL_API_URL=https://api.openai.com/v1/chat/completions
VITE_TEXT_MODEL_API_KEY=sk-your-openai-key
```

### 场景 2：中文专用助手

**textModelService.ts:**
```typescript
const DEFAULT_SYSTEM_PROMPT = '你是一个专业的中文 AI 助手。请用简洁、准确的中文回答问题，必要时提供详细的解释和例子。';
```

### 场景 3：代码助手

**textModelService.ts:**
```typescript
const DEFAULT_SYSTEM_PROMPT = `You are an expert programming assistant. 
- Provide clean, well-documented code
- Follow best practices and modern conventions
- Explain your reasoning
- Include error handling
- Use TypeScript when applicable`;
```
