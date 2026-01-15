/**
 * Agent 层类型定义
 */

export interface Intent {
  type: string;
  skillId?: string;
  parameters: Record<string, any>;
  confidence: number;
  reasoning?: string;
}

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: any;
  skillId?: string;
}

export interface CapabilityInfo {
  id: string;
  name: string;
  description: string;
  version: string;
}
