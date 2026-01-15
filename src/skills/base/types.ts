/**
 * Skills 基础类型定义
 */

export interface SkillManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
      default?: any;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface SkillResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface Skill {
  manifest: SkillManifest;
  execute(params: Record<string, any>): Promise<SkillResult>;
  validate(params: Record<string, any>): { valid: boolean; errors: string[] };
}

export interface ImageProcessingParams {
  imageUrl: string;
}
