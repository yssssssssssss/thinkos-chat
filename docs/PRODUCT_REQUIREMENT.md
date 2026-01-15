# ThinkOS Chat - Agent、MCP、Skills 能力实施计划

## 📋 概述

本文档详细说明如何在 ThinkOS Chat 项目中添加和扩展 Agent、MCP、Skills 三层架构能力。

### 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                      UI 层 (ChatView)                    │
│  用户交互界面：输入框、按钮、对话框                         │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  Agent 层 (智能代理)                      │
│  - 意图识别：理解用户自然语言                              │
│  - 技能调度：选择合适的 Skill 执行任务                      │
│  - 参数提取：从用户输入中提取执行参数                       │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│               MCP 层 (Model Context Protocol)            │
│  - 技能注册：管理所有可用技能                              │
│  - 协议定义：统一的接口和数据格式                          │
│  - 生命周期管理：技能的注册、查询、执行                     │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  Skills 层 (技能实现)                     │
│  - 图片处理：扩展、裁剪、缩放、滤镜等                       │
│  - 文本处理：翻译、摘要、格式化等                          │
│  - 数据处理：导出、转换、分析等                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 以"图片扩展"为例的完整实施流程

### 第一步：定义 Skill 能力（Skills 层）

#### 1.1 创建 Skill 类型定义

**文件位置**: `src/skills/base/types.ts`

```typescript
// 定义 Skill 的基础接口
export interface SkillManifest {
  id: string;                  // 唯一标识符，如 'image-expand'
  name: string;                // 显示名称，如 '图片尺寸扩展'
  description: string;         // 功能描述
  version: string;             // 版本号
  parameters: ParameterSchema; // 参数定义
}

// 定义参数的结构
export interface ParameterSchema {
  type: 'object';
  properties: Record<string, PropertySchema>;
  required?: string[];
}

// 定义具体的参数属性
export interface PropertySchema {
  type: string;        // 'string' | 'number' | 'boolean' | 'array'
  description: string; // 参数说明
  default?: any;       // 默认值
  enum?: string[];     // 枚举值
}

// 定义执行结果
export interface SkillResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Skill 接口
export interface Skill {
  manifest: SkillManifest;
  execute(params: Record<string, any>): Promise<SkillResult>;
  validate(params: Record<string, any>): { valid: boolean; errors: string[] };
}
```

#### 1.2 创建 BaseSkill 基类

**文件位置**: `src/skills/base/skill.ts`

```typescript
import { Skill, SkillManifest, SkillResult } from './types';

export abstract class BaseSkill implements Skill {
  // 子类必须实现 manifest
  abstract manifest: SkillManifest;

  // 子类必须实现 execute
  abstract execute(params: Record<string, any>): Promise<SkillResult>;

  // 参数验证（自动完成，子类可覆盖）
  validate(params: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { required = [] } = this.manifest.parameters;

    // 检查必需参数
    for (const key of required) {
      if (!(key in params) || params[key] === undefined || params[key] === null) {
        errors.push(`缺少必要参数: ${key}`);
      }
    }

    // 检查参数类型
    const { properties } = this.manifest.parameters;
    for (const [key, value] of Object.entries(params)) {
      const schema = properties[key];
      if (schema && !this.validateType(value, schema.type)) {
        errors.push(`参数 "${key}" 类型错误`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private validateType(value: any, expectedType: string): boolean {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    return actualType === expectedType;
  }

  // 便捷方法
  protected createSuccessResult(data?: any): SkillResult {
    return { success: true, data };
  }

  protected createErrorResult(error: string): SkillResult {
    return { success: false, error };
  }
}
```

#### 1.3 实现具体的 Skill

**文件位置**: `src/skills/image/expandImage.ts`

```typescript
import { BaseSkill } from '../base/skill';
import { ExpandImageParams, ExpandImageResult } from '../base/types';

export class ExpandImageSkill extends BaseSkill {
  // 定义 Skill 的 manifest
  manifest = {
    id: 'image-expand',
    name: '图片尺寸扩展',
    description: '将图片扩展到指定尺寸，支持多种填充模式',
    version: '1.0.0',
    parameters: {
      type: 'object' as const,
      properties: {
        imageUrl: {
          type: 'string',
          description: '图片 URL 或 Base64 编码'
        },
        targetWidth: {
          type: 'number',
          description: '目标宽度 (像素)'
        },
        targetHeight: {
          type: 'number',
          description: '目标高度 (像素)'
        },
        mode: {
          type: 'string',
          description: '填充模式: fill(填满) | fit(适应) | stretch(拉伸)',
          default: 'fill'
        },
        backgroundColor: {
          type: 'string',
          description: '背景色 (CSS 颜色值)',
          default: '#ffffff'
        }
      },
      required: ['imageUrl', 'targetWidth', 'targetHeight']
    }
  };

  // 实现 execute 方法
  async execute(params: ExpandImageParams): Promise<SkillResult> {
    try {
      // 1. 参数提取
      const { imageUrl, targetWidth, targetHeight, mode = 'fill', backgroundColor = '#ffffff' } = params;

      // 2. 参数验证
      if (targetWidth <= 0 || targetHeight <= 0) {
        return this.createErrorResult('目标尺寸必须大于 0');
      }

      // 3. 加载图片
      const img = await this.loadImage(imageUrl);

      // 4. 创建 Canvas 并处理
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // 5. 填充背景
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // 6. 计算绘制布局
      const layout = this.calculateLayout(
        img.width, img.height,
        targetWidth, targetHeight,
        mode
      );

      // 7. 绘制图片
      ctx.drawImage(img, layout.sx, layout.sy, layout.sWidth, layout.sHeight,
                         layout.dx, layout.dy, layout.dWidth, layout.dHeight);

      // 8. 导出结果
      const resultUrl = canvas.toDataURL('image/png');

      return this.createSuccessResult({
        imageUrl: resultUrl,
        originalWidth: img.width,
        originalHeight: img.height,
        targetWidth,
        targetHeight,
        mode
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : '处理失败');
    }
  }

  // 辅助方法
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = src;
    });
  }

  private calculateLayout(srcW: number, srcH: number, dstW: number, dstH: number, mode: string) {
    // ... 布局计算逻辑
  }
}
```

---

### 第二步：注册 Skill（MCP 层）

#### 2.1 创建 Skill 注册表

**文件位置**: `src/mcp/registry.ts`

```typescript
import { Skill } from '../skills/base/types';

class SkillRegistry {
  private skills = new Map<string, Skill>();

  // 注册 Skill
  register(skill: Skill): void {
    const { id } = skill.manifest;
    this.skills.set(id, skill);
    console.log(`✅ Skill 注册成功: ${id}`);
  }

  // 获取 Skill
  get(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  // 获取所有 Skills
  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  // 根据分类查找
  findByCategory(category: string): Skill[] {
    return this.getAll().filter(skill =>
      skill.manifest.id.startsWith(`${category}-`)
    );
  }
}

// 导出单例
export const skillRegistry = new SkillRegistry();
```

#### 2.2 统一注册所有 Skills

**文件位置**: `src/skills/index.ts`

```typescript
import { skillRegistry } from '../mcp/registry';
import { ExpandImageSkill } from './image/expandImage';

export function registerSkills(): void {
  // 注册图片处理 Skills
  skillRegistry.register(new ExpandImageSkill());

  // 注册其他 Skills
  // skillRegistry.register(new CropImageSkill());
  // skillRegistry.register(new ResizeImageSkill());
}

export function getRegisteredSkills() {
  return skillRegistry.getAll();
}
```

---

### 第三步：实现 Agent 智能调度（Agent 层）

#### 3.1 创建意图识别器

**文件位置**: `src/agent/intentRecognizer.ts`

```typescript
import { Intent } from './types';

// 技能匹配模式
const SKILL_PATTERNS: Record<string, RegExp[]> = {
  'image-expand': [
    /扩展.*尺寸/i,
    /调整.*大小/i,
    /改成.*尺寸/i,
    /放大.*图片/i,
  ],
};

// 参数提取正则
const PARAM_PATTERNS = {
  widthHeight: /(\d+)\s*[x×]\s*(\d+)/,
  preset: /(HD|FHD|4K|Instagram)/i,
  mode: /(填充|适应|拉伸|fill|fit|stretch)/i,
};

// 预设尺寸映射
const PRESET_SIZES: Record<string, { width: number; height: number }> = {
  'HD': { width: 1280, height: 720 },
  'FHD': { width: 1920, height: 1080 },
  '4K': { width: 3840, height: 2160 },
};

export class IntentRecognizer {
  // 识别用户意图
  recognize(input: string): Intent {
    // 1. 模式匹配
    for (const [skillId, patterns] of Object.entries(SKILL_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(input)) {
          return {
            type: 'image-processing',
            skillId,
            parameters: this.extractParameters(input, skillId),
            confidence: 0.9
          };
        }
      }
    }

    // 2. 未匹配到
    return {
      type: 'unknown',
      parameters: {},
      confidence: 0
    };
  }

  // 提取参数
  private extractParameters(input: string, skillId: string): Record<string, any> {
    const params: Record<string, any> = {};

    // 提取尺寸 (1920x1080)
    const sizeMatch = input.match(PARAM_PATTERNS.widthHeight);
    if (sizeMatch) {
      params.targetWidth = parseInt(sizeMatch[1]);
      params.targetHeight = parseInt(sizeMatch[2]);
    }

    // 提取预设尺寸
    const presetMatch = input.match(PARAM_PATTERNS.preset);
    if (presetMatch) {
      const preset = PRESET_SIZES[presetMatch[1].toUpperCase()];
      if (preset) {
        params.targetWidth = preset.width;
        params.targetHeight = preset.height;
      }
    }

    // 提取模式
    const modeMatch = input.match(PARAM_PATTERNS.mode);
    if (modeMatch) {
      const modeMap: Record<string, string> = {
        '填充': 'fill',
        '适应': 'fit',
        '拉伸': 'stretch'
      };
      params.mode = modeMap[modeMatch[1]] || modeMatch[1].toLowerCase();
    }

    return params;
  }
}
```

#### 3.2 创建 Agent 核心

**文件位置**: `src/agent/agent.ts`

```typescript
import { IntentRecognizer } from './intentRecognizer';
import { Intent, AgentResponse } from './types';
import { skillRegistry } from '../mcp/registry';

export class Agent {
  private recognizer: IntentRecognizer;

  constructor() {
    this.recognizer = new IntentRecognizer();
  }

  // 处理用户输入
  async chat(input: string): Promise<AgentResponse> {
    // 1. 意图识别
    const intent = this.recognizer.recognize(input);

    // 2. 检查是否识别到有效意图
    if (!intent.skillId) {
      return {
        success: false,
        message: '抱歉，我无法理解您的请求。请尝试描述得更具体一些。'
      };
    }

    // 3. 获取 Skill
    const skill = skillRegistry.get(intent.skillId);
    if (!skill) {
      return {
        success: false,
        message: `未找到技能: ${intent.skillId}`
      };
    }

    // 4. 参数验证
    const validation = skill.validate(intent.parameters);
    if (!validation.valid) {
      return {
        success: false,
        message: `参数错误: ${validation.errors.join('; ')}`
      };
    }

    // 5. 执行 Skill
    try {
      const result = await skill.execute(intent.parameters);

      if (result.success) {
        return {
          success: true,
          message: this.generateSuccessMessage(intent, result.data),
          data: result.data,
          skillId: intent.skillId
        };
      } else {
        return {
          success: false,
          message: `处理失败: ${result.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `执行错误: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  // 直接调用 Skill（不经过意图识别）
  async invoke(skillId: string, params: Record<string, any>): Promise<AgentResponse> {
    const skill = skillRegistry.get(skillId);
    if (!skill) {
      return {
        success: false,
        message: `未找到技能: ${skillId}`
      };
    }

    const validation = skill.validate(params);
    if (!validation.valid) {
      return {
        success: false,
        message: `参数错误: ${validation.errors.join('; ')}`
      };
    }

    try {
      const result = await skill.execute(params);
      return {
        success: result.success,
        message: result.success ? '处理完成' : `处理失败: ${result.error}`,
        data: result.data,
        skillId
      };
    } catch (error) {
      return {
        success: false,
        message: `执行错误: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  // 生成成功消息
  private generateSuccessMessage(intent: Intent, data: any): string {
    const { skillId } = intent;

    switch (skillId) {
      case 'image-expand':
        return `✅ 图片已成功扩展！\n\n` +
          `📐 原始尺寸: ${data.originalWidth} × ${data.originalHeight}\n` +
          `📐 目标尺寸: ${data.targetWidth} × ${data.targetHeight}\n` +
          `🎨 填充模式: ${this.getModeDisplayName(data.mode)}`;

      default:
        return '✅ 处理完成！';
    }
  }

  private getModeDisplayName(mode: string): string {
    const names: Record<string, string> = {
      'fill': '填充（填满整个区域）',
      'fit': '适应（保持比例，留白）',
      'stretch': '拉伸（填满，可能变形）'
    };
    return names[mode] || mode;
  }
}
```

---

### 第四步：集成到 UI（UI 层）

#### 4.1 在应用启动时注册 Skills

**文件位置**: `src/main.tsx` 或 `src/App.tsx`

```typescript
import { registerSkills } from './skills';

// 在应用启动时注册所有 Skills
registerSkills();

// ... 其他初始化代码
```

#### 4.2 创建工具面板

**文件位置**: `src/chat/components/panels/MoreToolsPanel.tsx`

```typescript
import React from 'react';
import { X, Image } from 'lucide-react';

const tools = [
  {
    id: 'expand-image',
    icon: Image,
    label: '图片扩展',
    description: '扩展图片尺寸',
    color: 'text-purple-500'
  },
  // ... 其他工具
];

export const MoreToolsPanel: React.FC<MoreToolsPanelProps> = ({ onClose, onAction }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-4">
      <h3 className="font-medium text-gray-800 mb-3">更多工具</h3>

      <div className="grid grid-cols-2 gap-2">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => { onAction(tool.id); onClose(); }}
            className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl"
          >
            <tool.icon className={`w-5 h-5 ${tool.color}`} />
            <div>
              <div className="font-medium text-sm">{tool.label}</div>
              <div className="text-xs text-gray-400">{tool.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
```

#### 4.3 创建参数配置对话框

**文件位置**: `src/chat/components/dialogs/ExpandImageDialog.tsx`

```typescript
import React, { useState } from 'react';
import { Agent } from '../../../agent/agent';

export const ExpandImageDialog: React.FC<Props> = ({ imageUrl, onClose, onComplete }) => {
  const [targetWidth, setTargetWidth] = useState(1920);
  const [targetHeight, setTargetHeight] = useState(1080);
  const [mode, setMode] = useState<'fill' | 'fit' | 'stretch'>('fill');

  const handleExpand = async () => {
    const agent = new Agent();

    const result = await agent.invoke('image-expand', {
      imageUrl,
      targetWidth,
      targetHeight,
      mode
    });

    if (result.success) {
      onComplete(result.data);
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 max-w-lg">
        <h2 className="text-lg font-semibold mb-4">图片尺寸扩展</h2>

        {/* 尺寸选择器 */}
        <div className="mb-4">
          <label>目标尺寸</label>
          <input type="number" value={targetWidth} onChange={e => setTargetWidth(+e.target.value)} />
          <span>×</span>
          <input type="number" value={targetHeight} onChange={e => setTargetHeight(+e.target.value)} />
        </div>

        {/* 模式选择 */}
        <div className="mb-4">
          <label>填充模式</label>
          <select value={mode} onChange={e => setMode(e.target.value as any)}>
            <option value="fill">填充</option>
            <option value="fit">适应</option>
            <option value="stretch">拉伸</option>
          </select>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button onClick={onClose}>取消</button>
          <button onClick={handleExpand}>执行扩展</button>
        </div>
      </div>
    </div>
  );
};
```

#### 4.4 在 ChatView 中集成

**文件位置**: `src/chat/ChatView.tsx`

```typescript
import { useState } from 'react';
import { Agent } from '../agent/agent';
import { ExpandImageDialog } from './components/dialogs/ExpandImageDialog';

export const ChatView = () => {
  const [showExpandDialog, setShowExpandDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const agent = new Agent();

  // 处理工具面板的操作
  const handleToolAction = (actionId: string) => {
    if (actionId === 'expand-image') {
      setShowExpandDialog(true);
    }
  };

  // 处理扩展完成
  const handleExpandComplete = (result: any) => {
    console.log('扩展完成:', result);
    // 将结果添加到消息列表
    setShowExpandDialog(false);
  };

  // 处理用户自然语言输入
  const handleUserInput = async (input: string) => {
    const response = await agent.chat(input);
    console.log('Agent 响应:', response);
  };

  return (
    <div>
      {/* ... 其他 UI */}

      <MoreToolsPanel onAction={handleToolAction} />

      {showExpandDialog && (
        <ExpandImageDialog
          imageUrl={selectedImage!}
          onClose={() => setShowExpandDialog(false)}
          onComplete={handleExpandComplete}
        />
      )}
    </div>
  );
};
```

---

## 🚀 添加新 Skill 的完整步骤

### 示例：添加"图片裁剪"功能

#### Step 1: 定义参数类型

```typescript
// src/skills/base/types.ts
export interface CropImageParams extends ImageProcessingParams {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropImageResult {
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}
```

#### Step 2: 实现 Skill 类

```typescript
// src/skills/image/cropImage.ts
import { BaseSkill } from '../base/skill';
import { CropImageParams, CropImageResult } from '../base/types';

export class CropImageSkill extends BaseSkill {
  manifest = {
    id: 'image-crop',
    name: '图片裁剪',
    description: '裁剪图片的指定区域',
    version: '1.0.0',
    parameters: {
      type: 'object' as const,
      properties: {
        imageUrl: { type: 'string', description: '图片 URL' },
        x: { type: 'number', description: '裁剪起始 X 坐标' },
        y: { type: 'number', description: '裁剪起始 Y 坐标' },
        width: { type: 'number', description: '裁剪宽度' },
        height: { type: 'number', description: '裁剪高度' }
      },
      required: ['imageUrl', 'x', 'y', 'width', 'height']
    }
  };

  async execute(params: CropImageParams): Promise<SkillResult> {
    try {
      const { imageUrl, x, y, width, height } = params;

      // 1. 加载图片
      const img = await this.loadImage(imageUrl);

      // 2. 创建 Canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = width;
      canvas.height = height;

      // 3. 裁剪图片
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

      // 4. 导出结果
      const resultUrl = canvas.toDataURL('image/png');

      return this.createSuccessResult({
        imageUrl: resultUrl,
        originalWidth: img.width,
        originalHeight: img.height,
        cropX: x,
        cropY: y,
        cropWidth: width,
        cropHeight: height
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : '裁剪失败');
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = src;
    });
  }
}
```

#### Step 3: 注册到 MCP

```typescript
// src/skills/index.ts
import { CropImageSkill } from './image/cropImage';

export function registerSkills(): void {
  skillRegistry.register(new ExpandImageSkill());
  skillRegistry.register(new CropImageSkill());  // ← 新增
}
```

#### Step 4: 添加意图识别规则

```typescript
// src/agent/intentRecognizer.ts
const SKILL_PATTERNS: Record<string, RegExp[]> = {
  'image-expand': [/* ... */],
  'image-crop': [    // ← 新增
    /裁剪.*图片/i,
    /剪切.*区域/i,
    /crop.*image/i,
  ]
};
```

#### Step 5: 添加 UI 入口

```typescript
// src/chat/components/panels/MoreToolsPanel.tsx
const tools = [
  { id: 'expand-image', /* ... */ },
  {
    id: 'crop-image',  // ← 新增
    icon: Crop,
    label: '图片裁剪',
    description: '裁剪图片区域',
    color: 'text-green-500'
  },
];
```

#### Step 6: 创建配置对话框

```typescript
// src/chat/components/dialogs/CropImageDialog.tsx
export const CropImageDialog: React.FC<Props> = ({ imageUrl, onClose, onComplete }) => {
  // ... 实现裁剪区域选择 UI
};
```

---

## 📊 目录结构总览

```
thinkos-chat/
├── src/
│   ├── agent/                      # Agent 层
│   │   ├── types.ts                # Agent 类型定义
│   │   ├── intentRecognizer.ts     # 意图识别器
│   │   └── agent.ts                # Agent 核心
│   │
│   ├── mcp/                        # MCP 协议层
│   │   ├── types.ts                # MCP 类型定义
│   │   └── registry.ts             # Skill 注册表
│   │
│   ├── skills/                     # Skills 实现层
│   │   ├── base/
│   │   │   ├── types.ts            # 基础类型
│   │   │   └── skill.ts            # BaseSkill 基类
│   │   ├── image/
│   │   │   ├── expandImage.ts      # 图片扩展
│   │   │   ├── cropImage.ts        # 图片裁剪
│   │   │   ├── resizeImage.ts      # 图片缩放
│   │   │   └── index.ts
│   │   ├── text/
│   │   │   ├── translate.ts        # 文本翻译
│   │   │   ├── summarize.ts        # 文本摘要
│   │   │   └── index.ts
│   │   └── index.ts                # 统一注册入口
│   │
│   ├── chat/                       # UI 层
│   │   ├── components/
│   │   │   ├── panels/
│   │   │   │   └── MoreToolsPanel.tsx
│   │   │   └── dialogs/
│   │   │       ├── ExpandImageDialog.tsx
│   │   │       └── CropImageDialog.tsx
│   │   └── ChatView.tsx
│   │
│   └── utils/                      # 工具层
│       └── logger.ts               # 日志工具
│
└── docs/                           # 文档
    ├── PRODUCT_REQUIREMENT.md      # 本文档
    ├── agents/
    │   └── README.md
    └── skills/
        ├── README.md
        └── image-expand.md
```

---

## ✅ 当前项目状态

### 已完成 ✓
- [x] Skills 基础架构（BaseSkill、类型定义）
- [x] MCP 注册表实现
- [x] Agent 核心和意图识别器
- [x] 图片扩展 Skill 完整实现
- [x] UI 组件（MoreToolsPanel、ExpandImageDialog）
- [x] 日志工具
- [x] 文档结构

### 需要完善 ⚠
- [ ] 将 `utils/logger.ts` 移动到 `src/utils/logger.ts`
- [ ] 在 `src/main.tsx` 中调用 `registerSkills()` 初始化
- [ ] 完善 ChatView 与 Agent 的集成
- [ ] 添加更多 Skills（裁剪、缩放、滤镜等）
- [ ] 添加错误处理和用户反馈
- [ ] 添加 Skill 执行进度显示
- [ ] 添加单元测试

---

## 🎓 关键设计原则

### 1. 单一职责原则
- **Skills 层**：只负责具体功能的实现
- **MCP 层**：只负责 Skill 的注册和管理
- **Agent 层**：只负责意图识别和调度
- **UI 层**：只负责用户交互

### 2. 开放封闭原则
- 新增 Skill 不需要修改现有代码
- 继承 `BaseSkill` 即可实现新功能
- 通过注册表动态管理 Skills

### 3. 接口隔离原则
- `SkillManifest` 定义了 Skill 的元数据
- `execute()` 定义了执行接口
- `validate()` 定义了验证接口

### 4. 依赖倒置原则
- Agent 依赖 Skill 接口，而不是具体实现
- 通过 MCP 注册表解耦 Agent 和 Skills

---

## 📚 参考资料

- [MCP (Model Context Protocol) 规范](https://modelcontextprotocol.io)
- [Agent 设计模式](https://www.patterns.dev/posts/agent-pattern)
- [React 最佳实践](https://react.dev)

---

## 🤝 贡献指南

添加新 Skill 时，请确保：

1. **完整的类型定义**：在 `types.ts` 中定义参数和结果类型
2. **继承 BaseSkill**：利用基类的参数验证功能
3. **详细的文档**：在 `docs/skills/` 下添加说明文档
4. **意图识别规则**：在 `intentRecognizer.ts` 中添加匹配模式
5. **UI 入口**：在 `MoreToolsPanel` 中添加工具入口
6. **错误处理**：妥善处理所有可能的错误情况
7. **日志记录**：使用 `log` 工具记录关键操作

---

**最后更新**: 2026-01-12
**文档版本**: 1.0.0
