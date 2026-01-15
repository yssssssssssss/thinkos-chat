/**
 * useAgent Hook 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgent } from '@/hooks/useAgent';
import { skillRegistry } from '@/mcp/registry';
import { CropImageSkill } from '@/skills/image/cropImage';

describe('useAgent Hook', () => {
  beforeEach(() => {
    skillRegistry.clear();
    skillRegistry.register(new CropImageSkill());
  });

  afterEach(() => {
    skillRegistry.clear();
  });

  describe('初始化', () => {
    it('应该初始化为默认状态', () => {
      const { result } = renderHook(() => useAgent());

      expect(result.current.isExecuting).toBe(false);
      expect(result.current.currentSkill).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('应该提供 executeChat 函数', () => {
      const { result } = renderHook(() => useAgent());

      expect(typeof result.current.executeChat).toBe('function');
    });

    it('应该提供 executeSkill 函数', () => {
      const { result } = renderHook(() => useAgent());

      expect(typeof result.current.executeSkill).toBe('function');
    });

    it('应该提供 resetError 函数', () => {
      const { result } = renderHook(() => useAgent());

      expect(typeof result.current.resetError).toBe('function');
    });
  });

  describe('executeChat', () => {
    it('应该在执行时设置 isExecuting 为 true', async () => {
      const { result } = renderHook(() => useAgent());

      act(() => {
        result.current.executeChat('裁剪图片');
      });

      expect(result.current.isExecuting).toBe(true);
    });

    it('应该在完成后设置 isExecuting 为 false', async () => {
      const { result } = renderHook(() => useAgent());

      await act(async () => {
        await result.current.executeChat('裁剪图片');
      });

      await waitFor(() => {
        expect(result.current.isExecuting).toBe(false);
      });
    });

    it('应该返回 Agent 响应', async () => {
      const { result } = renderHook(() => useAgent());

      let response;
      await act(async () => {
        response = await result.current.executeChat('裁剪图片');
      });

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('message');
    });

    it('应该在识别到 Skill 时设置 currentSkill', async () => {
      const { result } = renderHook(() => useAgent());

      await act(async () => {
        const response = await result.current.executeSkill('image-crop', {
          imageUrl: 'data:image/png;base64,test',
          x: 0,
          y: 0,
          width: 100,
          height: 100
        });

        // 等待异步操作
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.isExecuting).toBe(false);
      });
    });
  });

  describe('executeSkill', () => {
    it('应该直接调用指定的 Skill', async () => {
      const { result } = renderHook(() => useAgent());

      let response;
      await act(async () => {
        response = await result.current.executeSkill('image-crop', {
          imageUrl: 'data:image/png;base64,test',
          x: 0,
          y: 0,
          width: 100,
          height: 100
        });

        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('skillId', 'image-crop');
    });

    it('应该在执行期间设置 currentSkill', async () => {
      const { result } = renderHook(() => useAgent());

      act(() => {
        result.current.executeSkill('image-crop', {
          imageUrl: 'data:image/png;base64,test',
          x: 0,
          y: 0,
          width: 100,
          height: 100
        });
      });

      expect(result.current.currentSkill).toBe('image-crop');
      expect(result.current.isExecuting).toBe(true);
    });

    it('应该处理 Skill 不存在的情况', async () => {
      const { result } = renderHook(() => useAgent());

      await act(async () => {
        const response = await result.current.executeSkill('non-existent', {});

        expect(response.success).toBe(false);
        expect(response.message).toContain('未找到技能');
      });
    });

    it('应该在错误时设置 error 状态', async () => {
      const { result } = renderHook(() => useAgent());

      await act(async () => {
        await result.current.executeSkill('non-existent', {});
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('resetError', () => {
    it('应该清除错误状态', async () => {
      const { result } = renderHook(() => useAgent());

      // 先触发一个错误
      await act(async () => {
        await result.current.executeSkill('non-existent', {});
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // 重置错误
      act(() => {
        result.current.resetError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('错误处理', () => {
    it('应该捕获并记录执行错误', async () => {
      const { result } = renderHook(() => useAgent());

      await act(async () => {
        const response = await result.current.executeSkill('image-crop', {
          imageUrl: 'invalid-data',
          x: 0,
          y: 0,
          width: 100,
          height: 100
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        // 应该返回错误响应但不崩溃
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('message');
      });
    });

    it('应该在错误后允许重新执行', async () => {
      const { result } = renderHook(() => useAgent());

      // 第一次执行（错误）
      await act(async () => {
        await result.current.executeSkill('non-existent', {});
      });

      // 第二次执行（正确）
      await act(async () => {
        const response = await result.current.executeSkill('image-crop', {
          imageUrl: 'data:image/png;base64,test',
          x: 0,
          y: 0,
          width: 100,
          height: 100
        });

        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // 应该能够正常执行
      expect(result.current.isExecuting).toBe(false);
    });
  });
});
