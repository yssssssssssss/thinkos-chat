# Requirements Document

## Introduction

本项目旨在将现有的 Canvas 节点编辑器应用转换为类似豆包的 AI Chat 界面，同时保留原有的 Canvas 功能。新界面将采用 Tab 切换机制，让用户可以在 AI 对话界面和 Canvas 工作区之间自由切换。AI 对话界面需要完整继承原 Canvas 项目的所有核心功能，包括多模型并行生成、图像编辑（Mask/Inpaint）、Prompt Market、System Prompt 管理、Glass Mosaic 等特色功能。

## Glossary

- **AI Chat Interface**: 类似豆包的对话式 AI 界面，支持文本输入、消息历史显示和流式响应
- **Canvas**: 现有的节点编辑器界面，支持拖拽、连接和执行工作流
- **Tab Navigation**: 顶部或侧边的标签页导航系统，用于切换不同功能模块
- **Message**: 对话中的单条消息，包含角色（用户/助手）、内容和时间戳
- **Conversation**: 一组相关消息的集合，代表一次完整的对话会话
- **Streaming Response**: AI 模型的流式输出，逐字显示响应内容
- **Multi-Model Parallel**: 多模型并行生成，同时调用多个 AI 模型并展示各自的结果
- **System Prompt**: 系统提示词，用于设定 AI 的角色和行为方式
- **Prompt Market (PromptMark)**: 提示词市场，提供预设的高质量提示词模板
- **Mask/Inpaint**: 图像局部重绘功能，通过绘制遮罩指定需要修改的区域
- **Contrast Fix (Remix)**: 对比修正功能，将参考图的特定区域迁移到目标图
- **Refine**: 提示词优化功能，使用 AI 智能优化用户输入的提示词
- **Glass Mosaic**: 玻璃马赛克效果工具，将图像转换为彩色玻璃风格
- **Image-to-Image**: 图生图功能，基于输入图像生成新图像
- **Knowledge Node**: 知识节点，用于检索和管理上下文信息
- **Workflow**: 工作流预设，包含预定义的参数配置

## Requirements

### Requirement 1: Tab 导航系统

**User Story:** 作为用户，我希望通过 Tab 标签页在不同功能模块之间切换，以便快速访问 AI 对话和 Canvas 工作区。

#### Acceptance Criteria

1. WHEN 应用启动时 THEN Tab_Navigation 组件 SHALL 显示至少两个标签页：「AI 对话」和「Canvas 工作区」
2. WHEN 用户点击某个标签页 THEN Tab_Navigation 组件 SHALL 切换到对应的功能模块并高亮当前选中的标签
3. WHEN 用户切换标签页 THEN 系统 SHALL 保留每个模块的状态，包括对话历史和 Canvas 节点布局
4. WHILE 某个标签页处于激活状态 THEN 系统 SHALL 仅渲染该标签页对应的内容组件

### Requirement 2: AI 对话界面布局

**User Story:** 作为用户，我希望拥有一个清晰的对话界面布局，以便高效地与 AI 进行交互。

#### Acceptance Criteria

1. WHEN 用户进入 AI 对话界面 THEN Chat_Interface 组件 SHALL 显示三个主要区域：侧边栏（对话列表）、主聊天区域和输入区域
2. WHEN 对话界面加载完成 THEN 侧边栏 SHALL 显示历史对话列表，每个条目包含对话标题和最后更新时间
3. WHEN 主聊天区域显示消息 THEN 系统 SHALL 区分用户消息和 AI 响应，使用不同的视觉样式
4. WHEN 输入区域渲染完成 THEN 系统 SHALL 显示文本输入框、发送按钮、模式切换器和模型选择器

### Requirement 3: 多模型并行生成（文本）

**User Story:** 作为用户，我希望能够同时选择多个文本模型并行生成响应，以便对比不同模型的输出质量。

#### Acceptance Criteria

1. WHEN 用户打开模型选择面板 THEN 系统 SHALL 显示所有可用的文本模型列表，支持多选
2. WHEN 用户选择多个模型并发送消息 THEN 系统 SHALL 同时向所有选中的模型发起请求
3. WHEN 多个模型开始响应 THEN 系统 SHALL 以卡片网格形式并排显示各模型的流式输出
4. WHEN 某个模型响应完成 THEN 系统 SHALL 在该模型的卡片上显示完成状态和操作按钮（复制、重试）
5. IF 某个模型请求失败 THEN 系统 SHALL 在该模型卡片上显示错误信息并提供重试选项

### Requirement 4: 多模型并行生成（图像）

**User Story:** 作为用户，我希望能够同时选择多个图像模型并行生成图片，以便对比不同模型的生成效果。

#### Acceptance Criteria

1. WHEN 用户切换到图像生成模式 THEN 系统 SHALL 显示图像模型列表，支持多选
2. WHEN 用户选择多个图像模型并输入提示词 THEN 系统 SHALL 同时向所有选中的模型发起图像生成请求
3. WHEN 图像生成开始 THEN 系统 SHALL 以卡片网格形式显示各模型的生成进度
4. WHEN 图像生成完成 THEN 系统 SHALL 在卡片中显示生成的图像，并提供下载、编辑等操作按钮
5. WHEN 用户点击生成的图像 THEN 系统 SHALL 选中该图像并显示可用的编辑操作

### Requirement 5: System Prompt 管理

**User Story:** 作为用户，我希望能够选择和管理不同的 System Prompt 预设，以便让 AI 扮演不同的角色。

#### Acceptance Criteria

1. WHEN 用户点击 System Prompt 选择器 THEN 系统 SHALL 显示所有可用的预设列表，包含名称和简要描述
2. WHEN 用户选择一个 System Prompt 预设 THEN 系统 SHALL 将该预设应用到后续的对话请求中
3. WHEN 用户发送消息 THEN 系统 SHALL 将当前选中的 System Prompt 作为系统消息发送给模型
4. WHEN System Prompt 列表加载失败 THEN 系统 SHALL 使用默认的 System Prompt 并显示提示

### Requirement 6: Prompt Market (PromptMark)

**User Story:** 作为用户，我希望能够浏览和使用预设的高质量提示词模板，以便快速生成高质量的内容。

#### Acceptance Criteria

1. WHEN 用户打开 Prompt Market 面板 THEN 系统 SHALL 显示所有可用的提示词模板，以卡片形式展示
2. WHEN 用户搜索提示词 THEN 系统 SHALL 根据标题、摘要和内容进行模糊匹配并显示结果
3. WHEN 用户选择分类筛选 THEN 系统 SHALL 仅显示该分类下的提示词模板
4. WHEN 用户点击某个提示词模板 THEN 系统 SHALL 将该模板的内容填充到输入框中
5. WHEN 提示词模板包含跳转链接 THEN 系统 SHALL 显示链接按钮，点击后在新标签页打开

### Requirement 7: 图像局部重绘 (Inpaint/Mask)

**User Story:** 作为用户，我希望能够对生成的图像进行局部重绘，以便精确修改图像的特定区域。

#### Acceptance Criteria

1. WHEN 用户选中一张生成的图像并点击「Inpaint」按钮 THEN 系统 SHALL 打开精确修正弹窗
2. WHEN 精确修正弹窗打开 THEN 系统 SHALL 显示原图并提供画笔工具让用户绘制遮罩区域
3. WHEN 用户在图像上绘制 THEN 系统 SHALL 实时显示绘制的遮罩区域（半透明高亮）
4. WHEN 用户输入修改指令并确认 THEN 系统 SHALL 将原图、遮罩和指令发送给图像编辑模型
5. WHEN 局部重绘完成 THEN 系统 SHALL 显示修改后的图像结果

### Requirement 8: 对比修正 (Contrast Fix/Remix)

**User Story:** 作为用户，我希望能够将参考图的特定区域迁移到目标图，以便实现风格或元素的迁移。

#### Acceptance Criteria

1. WHEN 用户选中一张图像并点击「Remix」按钮 THEN 系统 SHALL 打开对比修正弹窗
2. WHEN 对比修正弹窗打开 THEN 系统 SHALL 并排显示原图区域和参考图上传区域
3. WHEN 用户上传参考图 THEN 系统 SHALL 显示参考图并允许在两张图上分别绘制遮罩
4. WHEN 用户在两张图上绘制遮罩并输入迁移指令 THEN 系统 SHALL 记录两个遮罩区域
5. WHEN 用户确认操作 THEN 系统 SHALL 将原图、原图遮罩、参考图、参考图遮罩和指令发送给模型处理

### Requirement 9: 提示词优化 (Refine)

**User Story:** 作为用户，我希望能够使用 AI 智能优化我的提示词，以便获得更好的生成效果。

#### Acceptance Criteria

1. WHEN 用户选中一张图像并点击「Refine」按钮 THEN 系统 SHALL 打开提示词优化弹窗
2. WHEN 优化弹窗打开 THEN 系统 SHALL 显示原始提示词并提供编辑区域
3. WHEN 用户点击「AI 智能优化」按钮 THEN 系统 SHALL 调用 AI 生成多个优化后的提示词建议
4. WHEN 优化建议生成完成 THEN 系统 SHALL 以列表形式显示所有建议，支持多选
5. WHEN 用户选择建议并确认 THEN 系统 SHALL 使用选中的提示词重新生成图像

### Requirement 10: 图生图 (Image-to-Image)

**User Story:** 作为用户，我希望能够上传参考图像并基于该图像生成新的图像。

#### Acceptance Criteria

1. WHEN 用户在图像生成模式下点击图片上传按钮 THEN 系统 SHALL 打开文件选择器
2. WHEN 用户选择图片文件 THEN 系统 SHALL 显示图片预览并将其作为参考图像
3. WHEN 用户输入提示词并发送 THEN 系统 SHALL 将参考图像和提示词一起发送给图生图模型
4. WHEN 用户粘贴图片 URL 或 Base64 THEN 系统 SHALL 解析并显示该图像作为参考
5. WHEN 参考图像尺寸过大 THEN 系统 SHALL 自动压缩图像到合适的尺寸

### Requirement 11: Glass Mosaic 工具

**User Story:** 作为用户，我希望能够将图像转换为玻璃马赛克风格，以便创建独特的艺术效果。

#### Acceptance Criteria

1. WHEN 用户选择 Glass Mosaic 工具 THEN 系统 SHALL 显示工具面板和参数控制区
2. WHEN 用户上传或选择图像 THEN 系统 SHALL 实时预览玻璃马赛克效果
3. WHEN 用户调整参数（网格尺寸、透明度、边缘深度等）THEN 系统 SHALL 实时更新预览效果
4. WHEN 用户切换形状（方块/圆形）THEN 系统 SHALL 使用新形状重新渲染效果
5. WHEN 用户点击下载按钮 THEN 系统 SHALL 将处理后的图像保存为 PNG 文件

### Requirement 12: 对话管理

**User Story:** 作为用户，我希望能够管理多个对话会话，以便组织不同主题的交流。

#### Acceptance Criteria

1. WHEN 用户点击「新建对话」按钮 THEN 系统 SHALL 创建一个新的空白对话并将其设为当前活动对话
2. WHEN 用户从侧边栏选择一个历史对话 THEN 系统 SHALL 加载该对话的完整消息历史并显示在主聊天区域
3. WHEN 用户删除一个对话 THEN 系统 SHALL 从对话列表中移除该对话并清除相关数据
4. WHEN 对话列表发生变化 THEN 系统 SHALL 将更新后的数据持久化到本地存储

### Requirement 13: 消息格式化与渲染

**User Story:** 作为用户，我希望 AI 响应能够正确渲染 Markdown 格式，以便阅读格式化的内容。

#### Acceptance Criteria

1. WHEN AI 响应包含 Markdown 语法 THEN 系统 SHALL 将其渲染为对应的 HTML 格式（标题、列表、代码块等）
2. WHEN AI 响应包含代码块 THEN 系统 SHALL 应用语法高亮并提供复制按钮
3. WHEN 消息内容超出可视区域 THEN 系统 SHALL 启用滚动并在新消息到达时自动滚动到底部

### Requirement 14: 响应式布局

**User Story:** 作为用户，我希望界面能够适应不同的屏幕尺寸，以便在各种设备上获得良好的体验。

#### Acceptance Criteria

1. WHEN 屏幕宽度小于 768px THEN 系统 SHALL 隐藏侧边栏并提供汉堡菜单按钮来显示对话列表
2. WHEN 屏幕宽度大于等于 768px THEN 系统 SHALL 同时显示侧边栏和主聊天区域
3. WHEN 用户调整窗口大小 THEN 系统 SHALL 动态调整布局而不丢失当前状态

### Requirement 15: 错误处理与状态反馈

**User Story:** 作为用户，我希望在操作过程中获得清晰的状态反馈，以便了解系统当前的工作状态。

#### Acceptance Criteria

1. WHILE AI 响应正在生成中 THEN 系统 SHALL 显示加载指示器并禁用发送按钮
2. IF AI 请求失败 THEN 系统 SHALL 显示错误消息并提供重试选项
3. WHEN 网络连接中断 THEN 系统 SHALL 显示离线提示并在连接恢复后自动重试未完成的请求
4. WHEN 用户执行操作（发送、删除、切换）THEN 系统 SHALL 在 200ms 内提供视觉反馈

### Requirement 16: Canvas 功能保留

**User Story:** 作为用户，我希望原有的 Canvas 节点编辑功能完整保留，以便继续使用工作流编辑能力。

#### Acceptance Criteria

1. WHEN 用户切换到 Canvas 标签页 THEN 系统 SHALL 显示完整的节点编辑器界面，包含所有现有功能
2. WHEN 用户在 Canvas 中创建或修改节点 THEN 系统 SHALL 保存这些更改并在下次访问时恢复
3. WHEN 用户从 Canvas 切换到 AI 对话再切换回来 THEN 系统 SHALL 保持 Canvas 的完整状态（节点位置、连接、缩放级别）

### Requirement 17: 工具面板集成

**User Story:** 作为用户，我希望在 AI 对话界面中能够快速访问各种工具，以便在对话过程中使用特殊功能。

#### Acceptance Criteria

1. WHEN 用户点击工具按钮 THEN 系统 SHALL 显示可用工具列表（Glass Mosaic、Workflow 预设等）
2. WHEN 用户选择某个工具 THEN 系统 SHALL 打开该工具的配置面板
3. WHEN 工具处理完成 THEN 系统 SHALL 将结果显示在对话区域或结果面板中
4. WHEN 用户使用 Workflow 预设 THEN 系统 SHALL 应用预设的参数配置（strength、scale、steps）

### Requirement 18: 知识库/上下文管理

**User Story:** 作为用户，我希望能够为对话添加额外的上下文信息，以便 AI 能够基于特定知识进行回答。

#### Acceptance Criteria

1. WHEN 用户点击添加上下文按钮 THEN 系统 SHALL 显示上下文输入区域
2. WHEN 用户输入或粘贴上下文内容 THEN 系统 SHALL 将该内容作为对话的背景知识
3. WHEN 用户发送消息 THEN 系统 SHALL 将上下文信息与用户消息一起发送给模型
4. WHEN 上下文内容过长 THEN 系统 SHALL 显示字数统计并提示可能影响响应质量
