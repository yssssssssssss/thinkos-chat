# Skills 说明

## 什么是 Skills

Skills 是 AI 助手可以执行的特定任务能力。每个 Skill 专注于一个特定功能，如图片处理、文本处理等。

## 已支持的 Skills

### 图片处理

| Skill ID | 名称 | 描述 |
|----------|------|------|
| image-crop | 图片裁剪 | 裁剪图片的指定区域 |

## 使用方法

1. 点击输入区域右侧的"更多"按钮
2. 选择需要的工具
3. 按照提示操作

## 添加新的 Skills

要添加新的 Skill，需要：

1. 在 `src/skills/` 目录下创建新的 Skill 文件
2. 继承 `BaseSkill` 类
3. 实现 `manifest` 和 `execute` 方法
4. 在 `src/skills/index.ts` 中注册
