# 日志控制台使用指南

## 概述

日志控制台是一个实时监控工具，可以查看工作流中所有节点的运行日志，帮助你调试和了解系统运行状态。

## 功能特性

### 1. 实时日志记录
- ✅ 节点创建/删除
- ✅ 节点连接
- ✅ 工作流执行
- ✅ API 调用
- ✅ 成功/失败状态
- ✅ 错误信息

### 2. 日志级别
- **INFO** (蓝色) - 一般信息，如节点创建、连接建立
- **SUCCESS** (绿色) - 成功操作，如生成完成
- **WARNING** (黄色) - 警告信息，如未生成结果
- **ERROR** (红色) - 错误信息，如 API 调用失败

### 3. 日志过滤
- 按级别过滤：ALL / INFO / SUCCESS / WARNING / ERROR
- 每个过滤器显示对应级别的日志数量

### 4. 控制功能
- **自动滚动** - 新日志自动滚动到底部
- **清空日志** - 清除所有历史日志
- **导出日志** - 下载日志文件用于分析
- **展开/缩小** - 调整控制台大小
- **关闭/打开** - 隐藏或显示控制台

## 使用方法

### 打开日志控制台

1. 在画布左下角找到终端图标按钮
2. 点击按钮打开日志控制台
3. 如果有新日志，按钮上会显示日志数量徽章

### 查看日志

每条日志包含：
- **时间戳** - 精确到毫秒
- **级别** - INFO/SUCCESS/WARNING/ERROR
- **节点类型** - 如 IMAGE_MODEL_SELECTOR、TEXT_RESULT_OUTPUT
- **节点 ID** - 前 8 位用于识别
- **消息** - 描述发生的操作
- **详细信息** - 可展开查看完整数据（如果有）

### 过滤日志

点击顶部的过滤按钮：
- **全部** - 显示所有日志
- **INFO** - 只显示信息日志
- **SUCCESS** - 只显示成功日志
- **WARNING** - 只显示警告日志
- **ERROR** - 只显示错误日志

### 导出日志

1. 点击下载图标按钮
2. 日志将以 `.txt` 格式下载
3. 文件名格式：`workflow-logs-[时间戳].txt`

### 清空日志

1. 点击垃圾桶图标按钮
2. 所有日志将被清除
3. 系统会记录一条 "Logs cleared" 信息

## 日志示例

### 节点创建
```
[14:23:45.123] [INFO] IMAGE_MODEL_SELECTOR (a1b2c3d4): Node created: IMAGE_MODEL_SELECTOR
  Details: { position: { x: 320, y: 240 } }
```

### 连接建立
```
[14:23:50.456] [INFO] Connection: Connection created: PROMPT_INPUT → IMAGE_MODEL_SELECTOR
  Details: { sourceId: "node-2", targetId: "node-3" }
```

### 工作流执行
```
[14:24:00.789] [INFO] IMAGE_MODEL_SELECTOR (a1b2c3d4): Workflow execution started
  Details: { isTextModel: false, selectedModels: ["gemini-3-pro-image-preview"], hasPrompt: true, hasImage: false }

[14:24:01.234] [INFO] IMAGE_MODEL_SELECTOR (a1b2c3d4): Calling image models: gemini-3-pro-image-preview
  Details: { variants: 1 }

[14:24:02.567] [INFO] IMAGE_MODEL_SELECTOR (a1b2c3d4): Generating image with gemini-3-pro-image-preview
  Details: { variant: "A futuristic city with flying cars, neon lights" }

[14:24:03.890] [SUCCESS] RESULT_OUTPUT (e5f6g7h8): Image generated successfully by gemini-3-pro-image-preview

[14:24:04.123] [SUCCESS] IMAGE_MODEL_SELECTOR (a1b2c3d4): Workflow completed: 1 result(s) generated
```

### 文本模型调用
```
[14:25:00.456] [INFO] TEXT_MODEL_SELECTOR (i9j0k1l2): Workflow execution started
  Details: { isTextModel: true, selectedModels: ["gemini-2.0-flash-exp"], hasPrompt: true }

[14:25:01.789] [INFO] TEXT_MODEL_SELECTOR (i9j0k1l2): Calling text models: gemini-2.0-flash-exp
  Details: { prompt: "世界最长的河流是什么？" }

[14:25:03.012] [SUCCESS] TEXT_RESULT_OUTPUT (m3n4o5p6): Text generated successfully by gemini-2.0-flash-exp
  Details: { textLength: 245 }

[14:25:03.345] [SUCCESS] TEXT_MODEL_SELECTOR (i9j0k1l2): Workflow completed: 1 result(s) generated
```

### 错误处理
```
[14:26:00.678] [ERROR] TEXT_MODEL_SELECTOR (q7r8s9t0): Text model requires prompt input

[14:26:30.901] [ERROR] TEXT_RESULT_OUTPUT (u1v2w3x4): Text generation failed for gpt-4-turbo
  Details: { error: "HTTP 401: Unauthorized" }

[14:27:00.234] [ERROR] IMAGE_MODEL_SELECTOR (y5z6a7b8): Workflow execution failed: Network request failed
  Details: { error: Error {...} }
```

## 调试技巧

### 1. 追踪工作流执行

查看完整的执行流程：
1. 找到 "Workflow execution started" 日志
2. 查看后续的 API 调用日志
3. 确认成功或失败状态
4. 检查 "Workflow completed" 日志

### 2. 诊断 API 错误

当看到 ERROR 级别日志时：
1. 展开 "详细信息" 查看完整错误
2. 检查错误消息（如 HTTP 401、Network failed）
3. 验证 `.env.local` 中的 API 配置
4. 检查网络连接

### 3. 性能分析

通过时间戳分析性能：
1. 记录 "Workflow execution started" 时间
2. 记录 "Workflow completed" 时间
3. 计算总耗时
4. 识别慢速操作

### 4. 多模型对比

同时调用多个模型时：
1. 过滤 SUCCESS 日志
2. 比较不同模型的响应时间
3. 查看生成内容长度
4. 识别失败的模型

## 常见问题

### Q: 日志太多，如何快速找到错误？
A: 点击 "ERROR" 过滤按钮，只显示错误日志。

### Q: 如何保存日志用于报告问题？
A: 点击下载按钮导出日志文件，然后附加到问题报告中。

### Q: 日志会占用很多内存吗？
A: 建议定期清空日志。如果日志超过 1000 条，考虑清空或导出。

### Q: 可以搜索日志吗？
A: 当前版本不支持搜索。可以导出日志后使用文本编辑器搜索。

### Q: 日志会自动保存吗？
A: 不会。刷新页面后日志会清空。需要手动导出保存。

## 日志记录的操作

### 节点操作
- ✅ 创建节点
- ✅ 删除节点
- ❌ 移动节点（未记录，避免日志过多）
- ❌ 调整大小（未记录）

### 连接操作
- ✅ 创建连接
- ❌ 删除连接（未记录）

### 工作流操作
- ✅ 开始执行
- ✅ API 调用
- ✅ 生成结果
- ✅ 完成/失败
- ✅ 错误信息

### 系统操作
- ✅ 清空日志
- ❌ 缩放/平移（未记录）

## 自定义日志

如果你需要在代码中添加自定义日志，使用 `addLog` 函数：

```typescript
// 在 Canvas.tsx 中
addLog('info', '你的消息', nodeId, nodeType, { 详细数据 });

// 参数说明：
// - level: 'info' | 'success' | 'warning' | 'error'
// - message: 日志消息
// - nodeId: 节点 ID（可选）
// - nodeType: 节点类型（可选）
// - details: 详细数据对象（可选）
```

## 快捷键（未来功能）

计划添加的快捷键：
- `Ctrl/Cmd + L` - 打开/关闭日志控制台
- `Ctrl/Cmd + K` - 清空日志
- `Ctrl/Cmd + F` - 搜索日志
- `Ctrl/Cmd + E` - 导出日志

## 性能建议

1. **定期清空** - 超过 500 条日志时清空
2. **关闭自动滚动** - 查看历史日志时关闭自动滚动
3. **使用过滤** - 只查看需要的日志级别
4. **导出存档** - 重要日志导出后清空

## 未来改进

- [ ] 日志搜索功能
- [ ] 日志持久化（LocalStorage）
- [ ] 更多过滤选项（按节点类型、时间范围）
- [ ] 日志统计（成功率、平均耗时）
- [ ] 实时性能监控图表
- [ ] 日志分享链接
- [ ] 暗色/亮色主题切换
