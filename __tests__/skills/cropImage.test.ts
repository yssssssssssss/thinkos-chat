/**
 * CropImageSkill 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CropImageSkill } from '@/skills/image/cropImage';

describe('CropImageSkill', () => {
  let skill: CropImageSkill;

  beforeEach(() => {
    skill = new CropImageSkill();
  });

  describe('Manifest 定义', () => {
    it('应该有正确的 manifest ID', () => {
      expect(skill.manifest.id).toBe('image-crop');
    });

    it('应该有正确的名称和描述', () => {
      expect(skill.manifest.name).toBe('图片裁剪');
      expect(skill.manifest.description).toBe('裁剪图片的指定区域');
    });

    it('应该定义所有必需参数', () => {
      expect(skill.manifest.parameters.required).toEqual([
        'imageUrl',
        'x',
        'y',
        'width',
        'height'
      ]);
    });

    it('应该有正确的参数属性定义', () => {
      const props = skill.manifest.parameters.properties;

      expect(props.imageUrl.type).toBe('string');
      expect(props.x.type).toBe('number');
      expect(props.y.type).toBe('number');
      expect(props.width.type).toBe('number');
      expect(props.height.type).toBe('number');
    });
  });

  describe('参数验证', () => {
    it('应该拒绝缺少必需参数的请求', () => {
      const result = skill.validate({});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该通过有效参数的验证', () => {
      const result = skill.validate({
        imageUrl: 'data:image/png;base64,test',
        x: 0,
        y: 0,
        width: 100,
        height: 100
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('执行功能', () => {
    it('应该拒绝负数坐标', async () => {
      const result = await skill.execute({
        imageUrl: 'data:image/png;base64,test',
        x: -10,
        y: 0,
        width: 100,
        height: 100
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('坐标不能为负数');
    });

    it('应该拒绝负数或零尺寸', async () => {
      const result = await skill.execute({
        imageUrl: 'data:image/png;base64,test',
        x: 0,
        y: 0,
        width: 0,
        height: 100
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('尺寸必须大于 0');
    });

    it('应该拒绝过大的裁剪尺寸', async () => {
      const result = await skill.execute({
        imageUrl: 'data:image/png;base64,test',
        x: 0,
        y: 0,
        width: 10000,
        height: 100
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('裁剪尺寸过大');
    });

    it('应该成功裁剪图片', async () => {
      const result = await skill.execute({
        imageUrl: 'data:image/png;base64,test',
        x: 0,
        y: 0,
        width: 100,
        height: 100
      });

      // 等待 Image mock 完成
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.cropX).toBe(0);
        expect(result.data.cropY).toBe(0);
        expect(result.data.cropWidth).toBe(100);
        expect(result.data.cropHeight).toBe(100);
        expect(result.data.imageUrl).toContain('data:image/png');
      }
    });

    it('应该拒绝超出边界的裁剪区域', async () => {
      const result = await skill.execute({
        imageUrl: 'data:image/png;base64,test',
        x: 100,
        y: 100,
        width: 200, // 超出 mock 图片的 200x200 尺寸
        height: 200
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(result.success).toBe(false);
      expect(result.error).toContain('裁剪区域超出图片边界');
    });
  });

  describe('边界条件', () => {
    it('应该处理 1x1 的最小裁剪尺寸', async () => {
      const result = await skill.execute({
        imageUrl: 'data:image/png;base64,test',
        x: 0,
        y: 0,
        width: 1,
        height: 1
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(result.success).toBe(true);
    });

    it('应该处理裁剪整个图片', async () => {
      const result = await skill.execute({
        imageUrl: 'data:image/png;base64,test',
        x: 0,
        y: 0,
        width: 200,
        height: 200
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.cropWidth).toBe(200);
        expect(result.data.cropHeight).toBe(200);
      }
    });
  });
});
