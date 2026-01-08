# Design Document: AI Chat Interface

## Overview

本设计文档描述将现有 Canvas 节点编辑器应用转换为类似豆包的 AI Chat 界面的技术方案。新界面采用 Tab 切换机制，在 AI 对话界面和 Canvas 工作区之间自由切换，同时完整继承原项目的所有核心功能。

### 核心目标
- 提供直观的对话式 AI 交互体验
- 支持多模型并行生成（文本和图像）
- 保留原有的图像编辑能力（Inpaint、Remix、Refine）
- 集成 PromptMarket、SystemPrompt、GlassMosaic 等工具
- 保持 Canvas 节点编辑功能完整可用

## Architecture

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   Tab Navigation                         ││
│  │              [AI 对话]  [Canvas]                         ││
│  └─────────────────────────────────────────────────────────┘│
│                            │                                 │
│         ┌──────────────────┴──────────────────┐             │
│         ▼                                      ▼             │
│  ┌─────────────────┐                  ┌─────────────────┐   │
│  │   ChatView      │                  │   Canvas        │   │
│  │  ┌───────────┐  │                  │  (原有组件)      │   │
│  │  │ Sidebar   │  │                  │                 │   │
│  │  │ ChatArea  │  │                  │                 │   │
│  │  │ InputArea │  │                  │                 │   │
│  │  └───────────┘  │                  │                 │   │
│  └─────────────────┘                  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 状态管理架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Global State                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ activeTab   │  │ conversations│  │ canvasState        │  │
│  │ 'chat'|     │  │ Message[]    │  │ nodes, connections │  │
│  │ 'canvas'    │  │              │  │                    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Chat State    │ │  Model State    │ │  Tool State     │
│ - activeMode    │ │ - textModels    │ │ - activePanel   │
│ - inputText     │ │ - imageModels   │ │ - systemPrompt  │
│ - isGenerating  │ │ - selectedIds   │ │ - promptMarks   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Components and Interfaces

### 1. 核心组件结构

```typescript
// 主应用组件
interface AppProps {}

// Tab 导航
interface TabNavigationProps {
  activeTab: 'chat' | 'canvas';
  onTabChange: (tab: 'chat' | 'canvas') => void;
}

// 聊天视图
interface ChatViewProps {
  conversations: Conversation[];
  activeConversationId: string;
  onConversationChange: (id: string) => void;
}

// 侧边栏
interface SidebarProps {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  onDelete: (id: string) => void;
}

// 聊天区域
interface ChatAreaProps {
  messages: Message[];
  isGenerating: boolean;
  activeMode: 'text' | 'image';
}

// 输入区域
interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  activeMode: 'text' | 'image';
  activePanel: PanelType;
  onPanelChange: (panel: PanelType) => void;
  referenceImage: string | null;
  onReferenceImageChange: (image: string | null) => void;
}
```

### 2. 工具面板组件

```typescript
// 模型选择面板
interface ModelPanelProps {
  models: ModelOption[];
  onToggle: (id: string) => void;
  onClose: () => void;
}

// PromptMarket 面板
interface PromptMarketPanelProps {
  prompts: PromptMarkPreset[];
  onSelect: (prompt: string) => void;
  onClose: () => void;
}

// SystemPrompt 面板
interface SystemPromptPanelProps {
  prompts: SystemPromptPreset[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

// GlassMosaic 面板
interface GlassMosaicPanelProps {
  options: GlassMosaicOptions;
  onOptionsChange: (options: GlassMosaicOptions) => void;
  sourceImage: string | null;
  onSourceImageChange: (image: string | null) => void;
  onClose: () => void;
}
```

### 3. 图像编辑弹窗组件

```typescript
// Inpaint 弹窗
interface InpaintModalProps {
  isOpen: boolean;
  imageUrl: string;
  onConfirm: (mask: string, instruction: string) => void;
  onClose: () => void;
}

// Remix 弹窗
interface RemixModalProps {
  isOpen: boolean;
  originalImageUrl: string;
  onConfirm: (mask: string, instruction: string, refImage: string, refMask: string) => void;
  onClose: () => void;
}

// Refine 弹窗
interface RefineModalProps {
  isOpen: boolean;
  originalPrompt: string;
  onConfirm: (prompts: string[]) => void;
  onClose: () => void;
}
```

## Data Models

### 1. 对话相关

```typescript
// 对话会话
interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  mode: 'text' | 'image';
  systemPromptId?: string;
}

// 消息
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  modelId?: string;
  status: 'pending' | 'streaming' | 'complete' | 'error';
  error?: string;
  // 图像消息特有
  images?: GeneratedImage[];
}

// 生成的图像（复用原有类型）
interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  model: string;
  lineageColor?: string;
  originalRef?: string;
}
```

### 2. 模型相关

```typescript
// 模型选项（复用原有类型）
interface ModelOption {
  id: string;
  name: string;
  selected: boolean;
  systemPrompt?: string;
}

// 多模型响应
interface MultiModelResponse {
  modelId: string;
  modelName: string;
  status: 'pending' | 'streaming' | 'complete' | 'error';
  content: string;
  error?: string;
}

// 多模型图像响应
interface MultiModelImageResponse {
  modelId: string;
  modelName: string;
  status: 'pending' | 'generating' | 'complete' | 'error';
  image?: GeneratedImage;
  error?: string;
}
```

### 3. 工具相关

```typescript
// 面板类型
type PanelType = 
  | 'none' 
  | 'models' 
  | 'promptMarket' 
  | 'systemPrompt' 
  | 'glassMosaic' 
  | 'moreTools'
  | 'inpaint'
  | 'remix'
  | 'refine';

// 工具按钮配置
interface ToolButton {
  id: string;
  icon: React.ComponentType;
  label: string;
  color: string;
}

// PromptMark 预设（复用原有类型）
interface PromptMarkPreset {
  id: string;
  title: string;
  summary?: string;
  category?: string;
  image?: string;
  prompt: string;
  jumpUrl?: string;
}

// SystemPrompt 预设（复用原有类型）
interface SystemPromptPreset {
  id: string;
  name: string;
  prompt: string;
}

// GlassMosaic 选项（复用原有类型）
interface GlassMosaicOptions {
  cellSize: number;
  glassOpacity: number;
  bevelIntensity: number;
  innerShine: number;
  gap: number;
  renderShape: 'square' | 'circle';
  sparkleIntensity: number;
}
```

### 4. 本地存储结构

```typescript
// 存储在 localStorage 中的数据结构
interface ChatStorageData {
  conversations: Conversation[];
  activeConversationId: string;
  settings: {
    defaultTextModels: string[];
    defaultImageModels: string[];
    defaultSystemPromptId: string;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Tab 切换状态保持
*For any* Tab 切换操作，切换前后各模块的内部状态（对话历史、Canvas 节点布局）应保持不变
**Validates: Requirements 1.3**

### Property 2: 多模型并行请求数量一致性
*For any* 用户发送消息操作，发起的并行请求数量应等于当前选中的模型数量
**Validates: Requirements 3.2, 4.2**

### Property 3: 模型响应卡片数量一致性
*For any* 多模型响应，显示的结果卡片数量应等于选中的模型数量
**Validates: Requirements 3.3, 4.3**

### Property 4: System Prompt 应用一致性
*For any* 用户发送消息，请求中的系统提示词应与当前选中的 SystemPrompt 预设内容一致
**Validates: Requirements 5.3**

### Property 5: PromptMarket 搜索过滤正确性
*For any* 搜索查询，返回的结果应仅包含标题、摘要或内容中包含查询词的提示词模板
**Validates: Requirements 6.2**

### Property 6: PromptMarket 分类过滤正确性
*For any* 分类筛选，返回的结果应仅包含属于该分类的提示词模板
**Validates: Requirements 6.3**

### Property 7: 图像编辑请求参数完整性
*For any* Inpaint 操作确认，发送的请求应包含原图、遮罩和修改指令三个必要参数
**Validates: Requirements 7.4**

### Property 8: Remix 请求参数完整性
*For any* Remix 操作确认，发送的请求应包含原图、原图遮罩、参考图、参考图遮罩和迁移指令五个必要参数
**Validates: Requirements 8.5**

### Property 9: 对话持久化一致性
*For any* 对话列表变化（新建、删除、更新），localStorage 中的数据应与内存中的状态保持一致
**Validates: Requirements 12.4**

### Property 10: Markdown 渲染正确性
*For any* 包含 Markdown 语法的 AI 响应，渲染后的 HTML 应正确反映 Markdown 结构
**Validates: Requirements 13.1**

### Property 11: 图像压缩尺寸限制
*For any* 上传的参考图像，如果原始尺寸超过 1600px，压缩后的最大边长应不超过 1600px
**Validates: Requirements 10.5**

### Property 12: 模型选择状态同步
*For any* 模型选择操作，UI 显示的选中状态应与内部状态一致
**Validates: Requirements 3.1, 4.1**

## Error Handling

### 1. API 请求错误

```typescript
// 错误类型
type ApiErrorType = 
  | 'network_error'      // 网络连接失败
  | 'timeout'            // 请求超时
  | 'rate_limit'         // 速率限制
  | 'invalid_response'   // 无效响应
  | 'model_error';       // 模型内部错误

// 错误处理策略
interface ErrorHandlingStrategy {
  // 显示错误消息
  showError: (error: ApiErrorType, modelId?: string) => void;
  // 提供重试选项
  enableRetry: (modelId: string) => void;
  // 自动重试（网络恢复时）
  autoRetry: (pendingRequests: string[]) => void;
}
```

### 2. 用户输入验证

```typescript
// 输入验证规则
const inputValidation = {
  // 空白消息检测
  isEmptyMessage: (text: string) => text.trim().length === 0,
  // 图像 URL 验证
  isValidImageUrl: (url: string) => /^(https?:\/\/|data:image\/)/.test(url),
  // 上下文长度限制
  maxContextLength: 10000,
};
```

### 3. 状态恢复

```typescript
// 从 localStorage 恢复状态时的错误处理
const recoverState = () => {
  try {
    const data = localStorage.getItem('chat_data');
    if (!data) return getDefaultState();
    const parsed = JSON.parse(data);
    return validateAndMigrate(parsed);
  } catch (error) {
    console.error('Failed to recover state:', error);
    return getDefaultState();
  }
};
```

## Testing Strategy

### 1. 测试框架选择

- **单元测试**: Vitest
- **属性测试**: fast-check
- **组件测试**: React Testing Library
- **E2E 测试**: Playwright (可选)

### 2. 单元测试覆盖

```typescript
// 需要单元测试的核心函数
- toggleModel(id: string, models: ModelOption[]): ModelOption[]
- filterPromptMarks(query: string, category: string, prompts: PromptMarkPreset[]): PromptMarkPreset[]
- validateImageUrl(url: string): boolean
- compressImage(dataUrl: string, maxDimension: number): Promise<string>
- parseMarkdown(content: string): string
- persistConversations(conversations: Conversation[]): void
- recoverConversations(): Conversation[]
```

### 3. 属性测试覆盖

每个属性测试必须：
- 使用 fast-check 库
- 运行至少 100 次迭代
- 使用注释标注对应的 Correctness Property

```typescript
// 示例：Property 5 - PromptMarket 搜索过滤正确性
// **Feature: ai-chat-interface, Property 5: PromptMarket 搜索过滤正确性**
// **Validates: Requirements 6.2**
test.prop([fc.string(), fc.array(promptMarkArbitrary)])('search results contain query', (query, prompts) => {
  const results = filterPromptMarks(query, 'all', prompts);
  return results.every(p => 
    p.title.toLowerCase().includes(query.toLowerCase()) ||
    (p.summary || '').toLowerCase().includes(query.toLowerCase()) ||
    p.prompt.toLowerCase().includes(query.toLowerCase())
  );
});
```

### 4. 组件测试覆盖

```typescript
// 需要组件测试的关键交互
- Tab 切换行为
- 模型选择面板的多选行为
- 工具面板的打开/关闭
- 消息发送流程
- 图像编辑弹窗的打开/关闭
```

### 5. 测试文件组织

```
src/
├── components/
│   ├── chat/
│   │   ├── ChatView.tsx
│   │   ├── ChatView.test.tsx
│   │   ├── InputArea.tsx
│   │   └── InputArea.test.tsx
│   └── panels/
│       ├── ModelPanel.tsx
│       └── ModelPanel.test.tsx
├── utils/
│   ├── promptFilter.ts
│   ├── promptFilter.test.ts
│   ├── imageUtils.ts
│   └── imageUtils.test.ts
└── __tests__/
    └── properties/
        ├── promptFilter.property.test.ts
        ├── modelSelection.property.test.ts
        └── persistence.property.test.ts
```

## UI/UX Design Reference

基于已确认的 Demo (ChatDemo.tsx)，UI 设计遵循以下原则：

### 1. 输入框布局

```
┌─────────────────────────────────────────────────────────────┐
│  发消息或输入 "/" 选择技能                                    │
├─────────────────────────────────────────────────────────────┤
│ 📎 │ 💬文本对话 │ 🖼️图像生成 │ 🔍PromptMarket │ ...  │ 📤 │
└─────────────────────────────────────────────────────────────┘
```

### 2. 工具面板弹出位置

- 面板从输入框上方弹出
- 使用圆角卡片 + 阴影
- 点击外部区域关闭

### 3. 多模型结果展示

- 使用网格布局 (1-3 列响应式)
- 每个模型一个卡片
- 卡片包含：模型名称、状态指示、内容/图像、操作按钮

### 4. 配色方案

- 主色：Blue (#3B82F6)
- 文本模式：Blue 系
- 图像模式：Pink 系
- PromptMarket：Orange 系
- SystemPrompt：Purple 系
- GlassMosaic：Indigo 系
