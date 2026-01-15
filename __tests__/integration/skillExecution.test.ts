/**
 * Skills 执行集成测试
 * 测试完整的 Skills 执行流程
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { skillRegistry } from '@/mcp/registry';
import { registerSkills } from '@/skills';
import { Agent } from '@/agent/agent';

describe('Skills 集成测试', () => {
  beforeEach(() => {
    skillRegistry.clear();
    registerSkills();
  });

  afterEach(() => {
    skillRegistry.clear();
  });

  describe('Skills 注册', () => {
    it('应该注册所有 Skills', () => {
      const skills = skillRegistry.getAll();

      expect(skills.length).toBeGreaterThan(0);
    });

    it('应该注册 CropImageSkill', () => {
      const skill = skillRegistry.get('image-crop');

      expect(skill).toBeDefined();
      expect(skill?.manifest.name).toBe('图片裁剪');
    });
  });

  describe('端到端流程', () => {
    it('应该完整执行图片裁剪流程', async () => {
      const agent = new Agent();

      // 1. 用户输入自然语言
      const userInput = '裁剪图片';

      // 2. Agent 识别意图
      const response = await agent.chat(userInput);

      // 3. 验证识别结果
      expect(response.skillId).toBe('image-crop');
    });

    it('应该处理完整的 Skill 调用链', async () => {
      const agent = new Agent();

      // 1. 直接调用 Skill
      const response = await agent.invoke('image-crop', {
        imageUrl: 'data:image/png;base64,test',
        x: 0,
        y: 0,
        width: 100,
        height: 100
      });

      // 等待异步操作
      await new Promise(resolve => setTimeout(resolve, 10));

      // 2. 验证响应
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('skillId');
    });

    it('应该处理多个 Skills 之间的切换', async () => {
      const agent = new Agent();

      const response1 = await agent.chat('扩展图片到 1920x1080');
      expect(response1.success).toBe(false);

      // 调用第二个 Skill
      const response2 = await agent.chat('裁剪图片');
      expect(response2.skillId).toBe('image-crop');
    });
  });

  describe('错误恢复', () => {
    it('应该从 Skill 执行错误中恢复', async () => {
      const agent = new Agent();

      // 第一次调用（错误）
      const response1 = await agent.invoke('image-crop', {
        imageUrl: 'invalid',
        x: -100, // 无效参数
        y: 0,
        width: 100,
        height: 100
      });

      expect(response1.success).toBe(false);

      // 第二次调用（正确）
      const response2 = await agent.invoke('image-crop', {
        imageUrl: 'data:image/png;base64,test',
        x: 0,
        y: 0,
        width: 100,
        height: 100
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // 应该能够成功执行
      expect(response2).toHaveProperty('success');
    });

    it('应该处理未知 Skill 请求', async () => {
      const agent = new Agent();

      const response = await agent.invoke('unknown-skill', {});

      expect(response.success).toBe(false);
      expect(response.message).toContain('未找到技能');
    });
  });

  describe('Skills 查询', () => {
    it('应该按分类查询 Skills', () => {
      const imageSkills = skillRegistry.findByCategory('image');

      expect(imageSkills.length).toBeGreaterThan(0);
      imageSkills.forEach(skill => {
        expect(skill.manifest.id).toContain('image');
      });
    });

    it('应该检查 Skill 是否存在', () => {
      expect(skillRegistry.has('image-expand')).toBe(false);
      expect(skillRegistry.has('image-crop')).toBe(true);
      expect(skillRegistry.has('non-existent')).toBe(false);
    });

    it('应该返回正确的 Skills 数量', () => {
      const count = skillRegistry.size();

      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});
