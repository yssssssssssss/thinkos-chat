/**
 * Skill 基类
 * 所有技能需要继承此类并实现抽象方法
 */

import { Skill } from './types';
import { SkillManifest, SkillResult, ParameterSchema } from '../../mcp/types';

export abstract class BaseSkill implements Skill {
  abstract manifest: SkillManifest;

  /**
   * 执行技能
   * 子类需要实现此方法
   */
  abstract execute(params: Record<string, any>): Promise<SkillResult>;

  /**
   * 验证参数
   */
  validate(params: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { required = [] } = this.manifest.parameters;

    // 检查必需参数
    for (const key of required) {
      if (!(key in params) || 
          params[key] === undefined || 
          params[key] === null ||
          params[key] === '') {
        errors.push(`缺少必要参数: ${key}`);
      }
    }

    // 检查参数类型
    const { properties } = this.manifest.parameters;
    for (const [key, value] of Object.entries(params)) {
      const schema = properties[key];
      if (schema) {
        const typeError = this.validateType(key, value, schema.type);
        if (typeError) {
          errors.push(typeError);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 验证参数类型
   */
  private validateType(
    key: string, 
    value: any, 
    expectedType: string
  ): string | null {
    if (value === null || value === undefined) return null;

    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    if (actualType !== expectedType) {
      return `参数 "${key}" 类型错误: 期望 ${expectedType}，实际为 ${actualType}`;
    }

    return null;
  }

  /**
   * 创建成功结果
   */
  protected createSuccessResult(data?: any): SkillResult {
    return { success: true, data };
  }

  /**
   * 创建错误结果
   */
  protected createErrorResult(error: string): SkillResult {
    return { success: false, error };
  }
}
