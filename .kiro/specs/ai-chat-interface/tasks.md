# Implementation Plan

- [x] 1. 项目结构和基础组件
  - [x] 1.1 创建 Chat 相关目录结构和类型定义文件
    - 创建 `src/chat/` 目录
    - 创建 `src/chat/types.ts` 定义 Conversation、Message、PanelType 等类型
    - 复用现有的 ModelOption、GeneratedImage 等类型
    - _Requirements: 2.1, 3.1, 4.1_
    - **注：ChatDemo.tsx 中已定义基础类型，需要提取到独立文件**

  - [x] 1.2 创建 Tab 导航组件
    - 创建 `src/chat/components/TabNavigation.tsx`
    - 实现 AI 对话 / Canvas 两个标签页切换
    - 实现高亮当前选中标签的样式
    - _Requirements: 1.1, 1.2_
    - **注：ChatDemo.tsx 中 renderHeader() 已实现 Tab 切换 UI**

  - [x] 1.3 重构 App.tsx 集成 Tab 导航
    - 修改 App.tsx 引入 TabNavigation 组件
    - 实现 activeTab 状态管理
    - 条件渲染 ChatView 或 Canvas 组件
    - 确保切换时保持各模块状态
    - _Requirements: 1.3, 1.4, 16.1, 16.3_
    - **注：App.tsx 已引入 ChatDemo，ChatDemo 内部实现了 Tab 切换逻辑**

- [x] 2. 聊天界面核心布局
  - [x] 2.1 创建 ChatView 主组件
    - 创建 `src/chat/ChatView.tsx`
    - 实现三栏布局：侧边栏、主聊天区、输入区
    - 实现响应式布局（小屏隐藏侧边栏）
    - _Requirements: 2.1, 14.1, 14.2_
    - **注：ChatDemo.tsx 已实现完整布局**

  - [x] 2.2 创建 Sidebar 侧边栏组件
    - 创建 `src/chat/components/Sidebar.tsx`
    - 实现对话列表显示
    - 实现新建对话按钮
    - 实现对话选择和删除功能
    - _Requirements: 2.2, 12.1, 12.2, 12.3_
    - **注：ChatDemo.tsx renderSidebar() 已实现基础 UI**

  - [x] 2.3 创建 ChatArea 消息展示组件
    - 创建 `src/chat/components/ChatArea.tsx`
    - 实现用户消息和 AI 响应的不同样式
    - 实现多模型响应的卡片网格布局
    - 实现加载状态和错误状态显示
    - _Requirements: 2.3, 3.3, 3.4, 3.5, 4.3, 4.4, 15.1, 15.2_
    - **注：ChatDemo.tsx renderResults() 已实现基础 UI**

  - [ ]* 2.4 编写属性测试：Tab 切换状态保持
    - **Property 1: Tab 切换状态保持**
    - **Validates: Requirements 1.3**

- [x] 3. 输入区域和工具栏
  - [x] 3.1 创建 InputArea 输入组件
    - 创建 `src/chat/components/InputArea.tsx`
    - 实现输入框、发送按钮
    - 实现工具栏按钮（文本对话、图像生成、PromptMarket、SystemPrompt、GlassMosaic、更多）
    - 实现参考图预览和删除
    - _Requirements: 2.4, 10.1, 10.2_
    - **注：ChatDemo.tsx renderInputArea() 已实现完整 UI**

  - [x] 3.2 实现工具面板弹出逻辑
    - 实现面板从输入框上方弹出
    - 点击文本对话/图像生成时自动弹出模型选择面板
    - 点击外部区域关闭面板
    - _Requirements: 17.1, 17.2_
    - **注：ChatDemo.tsx renderToolPanel() 已实现**

  - [x] 3.3 创建 ModelPanel 模型选择面板
    - 创建 `src/chat/components/panels/ModelPanel.tsx`
    - 实现文本模型和图像模型列表
    - 实现多选功能
    - _Requirements: 3.1, 4.1_
    - **注：ChatDemo.tsx 中 activePanel === 'models' 已实现**

  - [ ]* 3.4 编写属性测试：模型选择状态同步
    - **Property 12: 模型选择状态同步**
    - **Validates: Requirements 3.1, 4.1**

- [ ] 4. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. 多模型并行生成




  - [x] 5.1 创建多模型文本生成服务

    - 创建 `src/chat/services/multiModelService.ts`
    - 实现并行调用多个文本模型
    - 复用现有的 chatCompletionsStream 函数
    - 实现流式响应聚合
    - _Requirements: 3.2_
    - **注：services/textModelService.ts 已有 generateTextFromPrompt 支持多模型，需要添加流式版本**

  - [x] 5.2 创建多模型图像生成服务

    - 扩展 multiModelService.ts
    - 实现并行调用多个图像模型
    - 复用现有的 generateImagesFromWorkflow 函数
    - _Requirements: 4.2_
    - **注：services/geminiImageService.ts 已有 generateImagesFromWorkflow 支持多模型**

  - [x] 5.3 集成多模型服务到 ChatView



    - 在 ChatView 中调用多模型服务
    - 实现响应状态管理（pending、streaming、complete、error）
    - 实现结果卡片的实时更新
    - _Requirements: 3.3, 3.4, 4.3, 4.4_
    - **注：ChatDemo.tsx handleSend() 目前是模拟实现，需要连接真实服务**

  - [ ]* 5.4 编写属性测试：多模型并行请求数量一致性
    - **Property 2: 多模型并行请求数量一致性**
    - **Validates: Requirements 3.2, 4.2**

  - [ ]* 5.5 编写属性测试：模型响应卡片数量一致性
    - **Property 3: 模型响应卡片数量一致性**
    - **Validates: Requirements 3.3, 4.3**

- [x] 6. SystemPrompt 和 PromptMarket 集成




  - [x] 6.1 集成 SystemPromptPanel 到实际服务

    - 复用现有的 systemPromptService
    - 从 /system-prompts.json 加载预设列表
    - 实现选择后应用到消息发送
    - _Requirements: 5.1, 5.2, 5.3_
    - **注：UI 已实现，services/systemPromptService.ts 已存在，需要在 ChatDemo 中调用**

  - [ ]* 6.2 编写属性测试：System Prompt 应用一致性
    - **Property 4: System Prompt 应用一致性**
    - **Validates: Requirements 5.3**


  - [x] 6.3 集成 PromptMarketPanel 到实际服务


    - 复用现有的 promptMarkService
    - 从 /promptmarks.json 加载预设列表
    - 实现搜索和分类筛选功能
    - 实现点击填充到输入框
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
    - **注：已完成，ChatDemo.tsx 中已集成 promptMarkService，实现了搜索、分类筛选和点击填充功能**

  - [ ]* 6.4 编写属性测试：PromptMarket 搜索过滤正确性
    - **Property 5: PromptMarket 搜索过滤正确性**
    - **Validates: Requirements 6.2**

  - [ ]* 6.5 编写属性测试：PromptMarket 分类过滤正确性
    - **Property 6: PromptMarket 分类过滤正确性**
    - **Validates: Requirements 6.3**

- [ ] 7. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. 图像编辑功能




  - [x] 8.1 实现 InpaintModal 功能

    - 复用现有的 DrawingCanvas 组件 (components/modals/DrawingCanvas.tsx)
    - 实现遮罩绘制和指令输入
    - 集成 editImageWithGeminiFlash / editImageWithSeedream 服务
    - _Requirements: 7.1, 7.2, 7.4, 7.5_
    - **注：Modal UI 已实现，需要集成 DrawingCanvas 和 geminiImageService**

  - [x] 8.2 实现 RemixModal 功能

    - 实现双图并排显示
    - 实现参考图上传
    - 实现双遮罩绘制
    - 集成图像编辑服务
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
    - **注：Modal UI 已实现，需要集成功能**


  - [x] 8.3 实现 RefineModal 功能

    - 复用现有的文本模型服务进行提示词优化
    - 实现 AI 优化建议列表
    - 实现多选确认和重新生成
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
    - **注：Modal UI 已实现，需要集成 textModelService**


  - [x] 8.4 集成图像编辑到结果卡片

    - 在图像结果卡片中添加 Refine/Inpaint/Remix 按钮
    - 实现点击打开对应弹窗
    - 实现编辑后重新生成
    - _Requirements: 4.5, 7.5, 9.5_
    - **注：按钮 UI 已实现 (renderImageActions)，需要连接功能**

  - [ ]* 8.5 编写属性测试：图像编辑请求参数完整性
    - **Property 7: 图像编辑请求参数完整性**
    - **Validates: Requirements 7.4**

  - [ ]* 8.6 编写属性测试：Remix 请求参数完整性
    - **Property 8: Remix 请求参数完整性**
    - **Validates: Requirements 8.5**

- [x] 9. GlassMosaic 和更多工具




  - [x] 9.1 集成 GlassMosaicPanel 到实际服务

    - 复用现有的 glassMosaic 工具函数 (utils/glassMosaic.ts)
    - 实现参数调节和实时预览
    - 实现下载功能
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
    - **注：UI 已实现，utils/glassMosaic.ts 已存在，需要在面板中调用 renderGlassMosaic**


  - [x] 9.2 实现 KnowledgePanel 组件

    - 创建 `src/chat/components/panels/KnowledgePanel.tsx`
    - 实现上下文输入
    - 实现字数统计
    - 集成上下文到消息发送
    - _Requirements: 18.1, 18.2, 18.3, 18.4_
    - **注：更多工具面板中已有知识库入口，需要实现完整功能**

- [ ] 10. 图生图和图像处理
  - [x] 10.1 实现参考图上传功能
    - 在 InputArea 中实现文件选择
    - 实现图片预览
    - _Requirements: 10.1, 10.2_
    - **注：ChatDemo.tsx 已实现文件上传和预览 (referenceImage state)**

  - [x] 10.2 实现 URL/Base64 图像解析



    - 实现 URL 和 Base64 格式的图像解析
    - _Requirements: 10.4_
    - **注：geminiImageService.ts 已有 normalizeSeedreamImageValue 等函数，需要在 UI 层集成**

  - [x] 10.3 实现图像压缩


    - 创建 `src/chat/utils/imageUtils.ts`
    - 实现超大图像自动压缩（最大边 1600px）
    - _Requirements: 10.5_

  - [ ]* 10.4 编写属性测试：图像压缩尺寸限制
    - **Property 11: 图像压缩尺寸限制**
    - **Validates: Requirements 10.5**

  - [x] 10.5 集成图生图到多模型服务


    - 在图像生成请求中附加参考图
    - _Requirements: 10.3_
    - **注：geminiImageService.ts 的 generateImagesFromWorkflow 已支持 inputImage 参数**

- [ ] 11. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. 对话管理和持久化
  - [x] 12.1 创建对话管理服务





    - 创建 `src/chat/services/conversationService.ts`
    - 实现对话的 CRUD 操作
    - 实现 localStorage 持久化
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ]* 12.2 编写属性测试：对话持久化一致性
    - **Property 9: 对话持久化一致性**
    - **Validates: Requirements 12.4**

  - [x] 12.3 集成对话管理到 ChatView



    - 实现对话切换时加载历史消息
    - 实现新消息自动保存
    - 替换 ChatDemo 中的 MOCK_CONVERSATIONS
    - _Requirements: 12.2_

- [ ] 13. Markdown 渲染集成
  - [x] 13.1 集成 Markdown 渲染组件


    - 复用现有的 components/Markdown.tsx
    - 在文本响应卡片中使用 Markdown 组件
    - 实现代码块语法高亮
    - 实现复制按钮
    - _Requirements: 13.1, 13.2_
    - **注：components/Markdown.tsx 已存在，需要在 renderResults 中使用**

  - [ ]* 13.2 编写属性测试：Markdown 渲染正确性
    - **Property 10: Markdown 渲染正确性**
    - **Validates: Requirements 13.1**

  - [x] 13.3 实现自动滚动


    - 实现新消息到达时自动滚动到底部
    - _Requirements: 13.3_

- [ ] 14. 错误处理和状态反馈
  - [x] 14.1 实现加载状态 UI
    - 实现生成中的加载指示器
    - 实现发送按钮禁用状态
    - _Requirements: 15.1_
    - **注：ChatDemo.tsx 已实现 isGenerating 状态和 Loader2 动画**

  - [x] 14.2 实现错误处理 UI


    - 实现错误消息显示
    - 实现重试按钮
    - _Requirements: 15.2, 3.5_
    - **注：需要在连接真实服务后添加错误处理逻辑**

  - [x] 14.3 实现网络状态检测


    - 实现离线提示
    - _Requirements: 15.3_

- [ ] 15. 响应式布局优化
  - [x] 15.1 优化小屏布局
    - 实现侧边栏折叠/展开
    - 实现汉堡菜单按钮
    - _Requirements: 14.1_
    - **注：ChatDemo.tsx 已实现 sidebarOpen 状态和 Menu/X 按钮切换**

  - [x] 15.2 优化工具栏响应式
    - 小屏隐藏工具按钮文字，只显示图标
    - _Requirements: 14.3_
    - **注：已实现 hidden sm:inline**

- [ ] 16. 清理和集成
  - [x] 16.1 重构 ChatDemo 为正式组件


    - 将 ChatDemo.tsx 拆分为独立组件
    - 移动到 src/chat/ 目录
    - 更新 App.tsx 使用正式组件

  - [ ] 16.2 整合样式和主题
    - 统一配色方案
    - 优化动画效果

  - [ ] 16.3 代码审查和优化
    - 检查类型定义完整性
    - 优化组件性能

- [ ] 17. Final Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.
