/**
 * MCP 协议层类型定义
 */

/**
 * 参数模式定义
 */
export interface ParameterSchema {
  type: string;
  properties: Record<string, PropertySchema>;
  required?: string[];
}

export interface PropertySchema {
  type: string;
  description: string;
  default?: any;
  enum?: string[];
}

/**
 * Skill 执行结果
 */
export interface SkillResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 技能清单
 */
export interface SkillManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  parameters: ParameterSchema;
}
