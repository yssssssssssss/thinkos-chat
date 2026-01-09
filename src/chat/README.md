# Chat 模块重构说明

## 目录结构

```
src/chat/
├── ChatView.tsx              # 主组件，整合所有子组件
├── types.ts                  # 类型定义
├── components/               # UI 组件
│   ├── Sidebar.tsx          # 侧边栏（对话列表）
│   ├── ChatArea.tsx         # 聊天区域（消息展示）
│   ├── InputArea.tsx        # 输入区域（输入框和工具栏）
│   └── panels/              # 工具面板
│       └── ModelPanel.tsx   # 模型选择面板
└── README.md                # 本文档
```

## 组件说明

### ChatView.tsx
主组件，负责：
- 状态管理（对话、模型、生成状态等）
- 业务逻辑（发送消息、重试、图像处理等）
- 组件组合和布局

### Sidebar.tsx
侧边栏组件，负责：
- 显示对话列表
- 新建对话
- 选择和删除对话

### ChatArea.tsx
聊天区域组件，负责：
- 显示用户消息和 AI 响应
- 文本模式：多模型文本响应卡片
- 图像模式：多模型图像响应卡片
- 加载状态、错误状态显示
- 重试和下载功能

### InputArea.tsx
输入区域组件，负责：
- 输入框和发送按钮
- 工具栏按钮（文本对话、图像生成等）
- 参考图上传和预览
- 离线提示

### ModelPanel.tsx
模型选择面板，负责：
- 显示可用模型列表
- 多选模型功能
- 区分文本模型和图像模型

## 重构进度

### ✅ 已完成
- [x] 创建基础目录结构
- [x] 提取类型定义到 `types.ts`
- [x] 创建 Sidebar 组件
- [x] 创建 ChatArea 组件
- [x] 创建 InputArea 组件
- [x] 创建 ModelPanel 组件
- [x] 创建主 ChatView 组件
- [x] 更新 App.tsx 使用新组件
- [x] 验证无编译错误

### 🚧 待完成（可选）
- [ ] 创建其他工具面板组件
  - [ ] PromptMarketPanel
  - [ ] SystemPromptPanel
  - [ ] GlassMosaicPanel
  - [ ] MoreToolsPanel
- [ ] 创建图像编辑弹窗组件
  - [ ] InpaintModal
  - [ ] RemixModal
  - [ ] RefineModal
- [ ] 提取自定义 Hooks
  - [ ] useConversations
  - [ ] useModels
  - [ ] useImageProcessing
- [ ] 提取工具函数到独立文件
  - [ ] imageProcessing.ts
  - [ ] modelHelpers.ts

## 使用方式

```tsx
import ChatView from './src/chat/ChatView';

function App() {
  return <ChatView />;
}
```

## 注意事项

1. **渐进式重构**：当前版本保留了核心业务逻辑在 ChatView 中，未来可以进一步拆分为更小的 hooks 和工具函数。

2. **向后兼容**：原 ChatDemo.tsx 文件保留，可以随时切换回旧版本。

3. **功能完整性**：新版本保持了所有原有功能：
   - 多模型并行生成
   - 对话管理和持久化
   - 图像处理和保存
   - 日志记录
   - 错误处理和重试

4. **类型安全**：所有组件都使用 TypeScript 类型定义，确保类型安全。

## 下一步优化建议

1. **性能优化**
   - 使用 React.memo 优化组件渲染
   - 使用 useMemo 和 useCallback 优化计算和回调

2. **代码组织**
   - 将业务逻辑提取为自定义 Hooks
   - 将工具函数移到独立的 utils 文件

3. **测试**
   - 为每个组件添加单元测试
   - 添加集成测试验证完整流程

4. **文档**
   - 为每个组件添加 JSDoc 注释
   - 创建 Storybook 展示组件
