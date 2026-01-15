/**
 * BaseSkill 单元测试
 */

import { describe, it, expect } from 'vitest';
import { BaseSkill } from '@/skills/base/skill';
import { SkillManifest, SkillResult } from '@/mcp/types';

// 创建测试用的 Skill 实现
class TestSkill extends BaseSkill {
  manifest: SkillManifest = {
    id: 'test-skill',
    name: 'Test Skill',
    description: 'A skill for testing',
    version: '1.0.0',
    parameters: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: 'First parameter'
        },
        param2: {
          type: 'number',
          description: 'Second parameter'
        }
      },
      required: ['param1']
    }
  };

  async execute(params: Record<string, any>): Promise<SkillResult> {
    return this.createSuccessResult({ result: 'test executed', ...params });
  }
}

describe('BaseSkill', () => {
  describe('参数验证', () => {
    it('应该验证必需参数', () => {
      const skill = new TestSkill();
      const result = skill.validate({});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('缺少必要参数: param1');
    });

    it('应该通过有效参数的验证', () => {
      const skill = new TestSkill();
      const result = skill.validate({ param1: 'value' });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该验证参数类型', () => {
      const skill = new TestSkill();
      const result = skill.validate({ param1: 123 }); // 错误类型，应该是 string

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该接受所有必需和可选参数', () => {
      const skill = new TestSkill();
      const result = skill.validate({ param1: 'value', param2: 42 });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('执行功能', () => {
    it('应该成功执行并返回结果', async () => {
      const skill = new TestSkill();
      const result = await skill.execute({ param1: 'test' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 'test executed', param1: 'test' });
    });

    it('应该有 createSuccessResult 辅助方法', () => {
      const skill = new TestSkill();
      const result = (skill as any).createSuccessResult({ key: 'value' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ key: 'value' });
    });

    it('应该有 createErrorResult 辅助方法', () => {
      const skill = new TestSkill();
      const result = (skill as any).createErrorResult('Error message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error message');
    });
  });

  describe('Manifest 定义', () => {
    it('应该有正确的 manifest 结构', () => {
      const skill = new TestSkill();

      expect(skill.manifest.id).toBe('test-skill');
      expect(skill.manifest.name).toBe('Test Skill');
      expect(skill.manifest.version).toBe('1.0.0');
      expect(skill.manifest.parameters.type).toBe('object');
      expect(skill.manifest.parameters.required).toContain('param1');
    });
  });
});
