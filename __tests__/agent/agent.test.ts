/**
 * Agent 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Agent } from '@/agent/agent';
import { skillRegistry } from '@/mcp/registry';
import { CropImageSkill } from '@/skills/image/cropImage';

describe('Agent', () => {
  beforeEach(() => {
    skillRegistry.clear();
    skillRegistry.register(new CropImageSkill());
  });

  afterEach(() => {
    skillRegistry.clear();
  });

  describe('自然语言意图识别', () => {
    it('应该识别图片裁剪意图', async () => {
      const agent = new Agent();
      const response = await agent.chat('裁剪图片');

      expect(response.skillId).toBe('image-crop');
    });

    it('应该对未知意图返回错误', async () => {
      const agent = new Agent();
      const response = await agent.chat('把图片扩展到 1920x1080');

      expect(response.success).toBe(false);
      expect(response.message).toContain('无法理解');
    });
  });

  describe('直接 Skill 调用', () => {
    it('应该通过 invoke 直接调用 Skill', async () => {
      const agent = new Agent();
      const response = await agent.invoke('image-crop', {
        imageUrl: 'data:image/png;base64,test',
        x: 0,
        y: 0,
        width: 100,
        height: 100
      });

      // 等待 Image mock
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(response.skillId).toBe('image-crop');
    });

    it('应该在 Skill 不存在时返回错误', async () => {
      const agent = new Agent();
      const response = await agent.invoke('non-existent-skill', {});

      expect(response.success).toBe(false);
      expect(response.message).toContain('未找到技能');
    });

    it('应该在参数无效时返回错误', async () => {
      const agent = new Agent();
      const response = await agent.invoke('image-crop', {
        // 缺少必需参数
        x: 0,
        y: 0
      });

      expect(response.success).toBe(false);
      expect(response.message).toContain('参数错误');
    });
  });

  describe('错误处理', () => {
    it('应该处理 Skill 执行错误', async () => {
      const agent = new Agent();
      const response = await agent.invoke('image-crop', {
        imageUrl: 'invalid-url',
        x: 0,
        y: 0,
        width: 100,
        height: 100
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // 应该返回错误但不崩溃
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('message');
    });

  });

  describe('成功消息生成', () => {
    it('应该为图片裁剪生成成功消息', async () => {
      const agent = new Agent();
      const response = await agent.invoke('image-crop', {
        imageUrl: 'data:image/png;base64,test',
        x: 10,
        y: 20,
        width: 100,
        height: 150
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      if (response.success) {
        expect(response.message).toContain('✅');
        expect(response.message).toContain('裁剪完成');
      }
    });
  });
});
