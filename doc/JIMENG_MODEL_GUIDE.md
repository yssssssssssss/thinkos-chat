# Jimeng (即梦) 图片生成模型集成指南

## 概述

已成功将 Jimeng (即梦) 图片生成 API 集成到 Image Models 节点中。

## 模型信息

- **模型 ID**: `gpt-image-1`
- **显示名称**: Jimeng (即梦)
- **API 端点**: `http://ai-api.jdcloud.com/v1/images/generations`
- **API Key**: 与其他模型共用 (从 `.env.local` 中的 `VITE_GEMINI_API_KEY` 读取)

## 使用方法

1. **创建 Image Model 节点**
   - 点击顶部工具栏的 "+ Image Models" 按钮
   - 在节点中会看到三个模型选项：
     - Gemini 3 Pro (High Quality)
     - Gemini 2.5 Flash (Fast)
     - **Jimeng (即梦)** ← 新添加的模型

2. **选择 Jimeng 模型**
   - 点击 "Jimeng (即梦)" 选项来选中它
   - 可以同时选择多个模型进行对比

3. **连接 Prompt 节点**
   - 创建一个 Prompt 节点
   - 输入中文或英文提示词，例如：
     - "一幅儿童读物插画，画中有一只可爱的小猫咪。"
     - "一座未来城市，有飞行汽车和霓虹灯"
   - 将 Prompt 节点连接到 Image Model 节点

4. **生成图片**
   - 点击 Image Model 节点底部的 "Generate" 按钮
   - 等待 API 返回结果
   - 生成的图片会显示在右侧的 Result 节点中

## API 请求格式

Jimeng API 使用以下请求格式：

```json
{
  "model": "gpt-image-1",
  "prompt": "一幅儿童读物插画，画中有一只可爱的小猫咪。",
  "size": "1024x1024",
  "quality": "medium",
  "output_compression": 100,
  "output_format": "JPEG",
  "n": 1
}
```

## API 响应格式

Jimeng API 返回格式：

```json
{
  "data": [
    {
      "b64_json": "base64编码的图片数据...",
      "url": "https://..."
    }
  ]
}
```

## 技术实现

### 1. 服务层 (`services/geminiImageService.ts`)

添加了 `generateImageWithJimeng()` 函数：
- 使用专门的 Jimeng API 端点
- 发送符合 Jimeng API 格式的请求
- 解析 `data[0].b64_json` 或 `data[0].url` 字段
- 将 base64 数据转换为 data URL

### 2. 模型配置 (`constants.ts`)

在 `AVAILABLE_IMAGE_MODELS` 中添加：
```typescript
{ 
  id: 'gpt-image-1', 
  name: 'Jimeng (即梦)', 
  selected: false,
  systemPrompt: 'Generate creative images with Chinese prompt understanding.'
}
```

### 3. 路由逻辑

在 `generateImagesFromWorkflow()` 中根据模型 ID 选择对应的 API：
- `gpt-image-1` → 调用 `generateImageWithJimeng()`
- 其他模型 → 调用 `generateImageWithGeminiFlash()`

## 特点

1. **中文支持**: Jimeng 模型对中文提示词有更好的理解
2. **固定尺寸**: 生成 1024x1024 的图片
3. **JPEG 格式**: 输出格式为 JPEG，压缩率 100
4. **独立 API**: 使用独立的 API 端点，不影响其他模型

## 调试

查看浏览器控制台日志：
- `[Jimeng Image Service] Generating image:` - 开始生成
- `[Jimeng Image Service] Request body:` - 请求内容
- `[Jimeng Image Service] Response status:` - 响应状态
- `[Jimeng Image Service] Found b64_json` - 找到图片数据

## 注意事项

1. Jimeng API 不支持输入图片（inputImage 参数会被忽略）
2. 使用与其他模型相同的 API Key
3. 生成速度可能因服务器负载而异
4. 如果生成失败，会在日志中显示错误信息，但不会影响其他模型的生成
