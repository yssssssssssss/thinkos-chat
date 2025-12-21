# Gemini 图片 API 集成指南

## 概述

已成功将 Gemini 图片生成和分析 API 集成到工作流画布中，支持真实的图片生成和理解功能。

## 新增功能

### 1. Gemini Flash 图片生成
- **模型**: Gemini-2.5-flash-image-preview
- **功能**: 从文本生成图片，或基于输入图片生成新图片
- **API 端点**: `http://ai-api.jdcloud.com/v1/images/gemini_flash/generations`

### 2. Gemini Pro 图片理解
- **模型**: Gemini-3-Pro-Image-Preview
- **功能**: 分析图片内容并返回详细描述
- **API 端点**: `http://ai-api.jdcloud.com/v1/images/gemini_flash/generations`

### 3. 真实 API 与 Mock 切换
- 在 `Canvas.tsx` 中设置 `USE_REAL_IMAGE_API = true` 使用真实 API
- 设置为 `false` 使用 Mock 数据（用于开发测试）

## 配置说明

### 环境变量配置

在 `.env.local` 文件中配置：

```bash
# Gemini 图片 API 配置
VITE_GEMINI_IMAGE_API_URL=http://ai-api.jdcloud.com/v1/images/gemini_flash/generations
VITE_GEMINI_API_KEY=your-api-key-here
```

### Vite 配置

`vite.config.ts` 已更新，自动注入环境变量：

```typescript
define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
  'process.env.GEMINI_IMAGE_API_URL': JSON.stringify(env.VITE_GEMINI_IMAGE_API_URL)
}
```

## API 请求格式

### Gemini Flash 图片生成

**请求示例（纯文本生成）:**
```json
{
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
  "safety_settings": {
    "method": "PROBABILITY",
    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
  },
  "stream": false
}
```

**请求示例（基于图片生成）:**
```json
{
  "model": "Gemini-2.5-flash-image-preview",
  "contents": {
    "role": "USER",
    "parts": [
      {
        "inline_data": {
          "mimeType": "image/png",
          "data": "iVBORw0KGgo..."
        }
      },
      {
        "text": "Generate a photo of a typical breakfast."
      }
    ]
  },
  "generation_config": {
    "response_modalities": ["TEXT", "IMAGE"]
  },
  "stream": false
}
```

### Gemini Pro 图片理解

**请求示例（URL 图片）:**
```json
{
  "model": "Gemini-3-Pro-Image-Preview",
  "stream": false,
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Describe this image in detail"
        },
        {
          "fileData": {
            "mimeType": "image/png",
            "fileUri": "https://example.com/image.png"
          }
        }
      ]
    }
  ]
}
```

**请求示例（Base64 图片）:**
```json
{
  "model": "Gemini-3-Pro-Image-Preview",
  "stream": false,
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Describe this image in detail"
        },
        {
          "inline_data": {
            "mimeType": "image/png",
            "data": "iVBORw0KGgo..."
          }
        }
      ]
    }
  ]
}
```

## 使用方法

### 基本工作流（图片生成）

1. **添加提示词节点**
   - 输入图片描述，如 "A futuristic city with flying cars"

2. **（可选）添加图片输入节点**
   - 上传参考图片

3. **添加图片模型节点**
   - 选择 Gemini 2.5 Flash 或 Gemini 3 Pro

4. **连接节点**
   - 提示词 → 图片模型
   - （可选）图片输入 → 图片模型

5. **生成图片**
   - 点击 Generate 按钮
   - 等待 API 响应

6. **查看结果**
   - 生成的图片显示在结果节点中

### 图片理解工作流（未来功能）

计划添加专门的图片分析节点：
1. 上传图片
2. 输入分析提示（如 "描述这张图片"）
3. 使用 Gemini Pro 分析
4. 在文本结果节点中查看分析结果

## 服务层实现

### geminiImageService.ts

**主要函数：**

1. **generateImageWithGeminiFlash**
   ```typescript
   generateImageWithGeminiFlash(
     prompt: string,
     inputImage?: string | null,
     model: string = 'Gemini-2.5-flash-image-preview'
   ): Promise<string>
   ```
   - 生成单张图片
   - 返回 base64 格式的图片数据

2. **analyzeImageWithGeminiPro**
   ```typescript
   analyzeImageWithGeminiPro(
     imageUrl: string,
     prompt: string = 'Describe this image in detail',
     model: string = 'Gemini-3-Pro-Image-Preview'
   ): Promise<string>
   ```
   - 分析图片内容
   - 返回文本描述

3. **generateImagesFromWorkflow**
   ```typescript
   generateImagesFromWorkflow(
     prompt: string,
     models: Array<{ id: string; systemPrompt?: string }>,
     inputImage?: string | null
   ): Promise<GeneratedImage[]>
   ```
   - 批量生成图片（支持多个模型）
   - 返回生成的图片数组

## 响应格式

### 图片生成响应

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "inline_data": {
              "mimeType": "image/png",
              "data": "iVBORw0KGgo..."
            }
          }
        ]
      }
    }
  ]
}
```

### 图片分析响应

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "This image shows a beautiful sunset over the ocean..."
          }
        ]
      }
    }
  ]
}
```

## 错误处理

服务层会捕获并处理以下错误：

1. **HTTP 错误**
   - 401: API 密钥无效
   - 403: 权限不足
   - 429: 请求过多（限流）
   - 500: 服务器错误

2. **响应解析错误**
   - 无图片数据
   - 无文本内容
   - 格式不正确

3. **网络错误**
   - 连接超时
   - 网络中断

## 日志记录

所有 API 调用都会记录到日志控制台：

```
[14:30:00.123] [INFO] IMAGE_MODEL_SELECTOR: Calling image models: Gemini-2.5-flash-image-preview
[14:30:01.456] [INFO] IMAGE_MODEL_SELECTOR: Generating image with Gemini-2.5-flash-image-preview
[14:30:05.789] [SUCCESS] RESULT_OUTPUT: Image generated successfully by Gemini-2.5-flash-image-preview
```

## 模型配置

在 `constants.ts` 中配置可用模型：

```typescript
export const AVAILABLE_IMAGE_MODELS: ModelOption[] = [
  { 
    id: 'Gemini-3-Pro-Image-Preview', 
    name: 'Gemini 3 Pro (High Quality)', 
    selected: true,
    systemPrompt: 'Generate high-quality, detailed images...'
  },
  { 
    id: 'Gemini-2.5-flash-image-preview', 
    name: 'Gemini 2.5 Flash (Fast)', 
    selected: false,
    systemPrompt: 'Generate images quickly...'
  },
];
```

## 切换真实 API 和 Mock

在 `Canvas.tsx` 中：

```typescript
// 设置为 true 使用真实 API
const USE_REAL_IMAGE_API = true;

// 设置为 false 使用 Mock（开发测试）
const USE_REAL_IMAGE_API = false;
```

## 性能优化

1. **并发请求**
   - 多个模型同时调用
   - 使用 `Promise.allSettled` 处理

2. **错误隔离**
   - 单个模型失败不影响其他模型
   - 继续显示成功的结果

3. **Base64 优化**
   - 自动提取 base64 数据
   - 支持 data URL 格式

## 安全注意事项

1. **API 密钥管理**
   - 永远不要提交真实密钥到代码仓库
   - 使用 `.env.local` 存储（已在 .gitignore 中）

2. **图片大小限制**
   - 建议限制上传图片大小（如 5MB）
   - 考虑压缩大图片

3. **内容安全**
   - API 包含安全设置
   - 阻止有害内容生成

## 故障排除

### API 调用失败

1. **检查 API 密钥**
   ```bash
   # 在 .env.local 中
   VITE_GEMINI_API_KEY=your-actual-key
   ```

2. **检查 API URL**
   ```bash
   VITE_GEMINI_IMAGE_API_URL=http://ai-api.jdcloud.com/v1/images/gemini_flash/generations
   ```

3. **重启开发服务器**
   ```bash
   # 修改 .env.local 后必须重启
   npm run dev
   ```

### 图片未生成

1. **查看日志控制台**
   - 打开左下角的日志面板
   - 查看错误信息

2. **检查网络**
   - 确认可以访问 API 端点
   - 检查防火墙设置

3. **验证提示词**
   - 确保提示词不为空
   - 避免违规内容

### Base64 图片问题

1. **格式检查**
   - 确保是有效的 base64 数据
   - 检查 MIME 类型

2. **大小限制**
   - 图片可能太大
   - 尝试压缩或调整尺寸

## 未来改进

- [ ] 添加图片分析节点
- [ ] 支持批量图片处理
- [ ] 添加图片编辑功能（inpainting）
- [ ] 支持更多图片格式
- [ ] 添加图片质量设置
- [ ] 实现图片缓存机制
- [ ] 添加进度显示
- [ ] 支持取消生成

## Python 测试脚本

可以使用提供的 Python 脚本独立测试 API：

```bash
# 图片生成测试
python test-image-1.py

# 图片分析测试
python test-image-2.py
```

## 相关文档

- **MODEL_CONFIGURATION_GUIDE.md** - 模型配置指南
- **LOG_CONSOLE_GUIDE.md** - 日志控制台使用指南
- **TEXT_MODEL_INTEGRATION.md** - 文本模型集成说明
