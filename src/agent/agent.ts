/**
 * 图片处理 Agent
 * 处理用户意图并调用相应的 Skills
 */

import { IntentRecognizer } from './intentRecognizer';
import { Intent, AgentResponse } from './types';
import { skillRegistry } from '../mcp/registry';
import { log } from '../utils/logger';

export class Agent {
  private recognizer: IntentRecognizer;

  constructor() {
    this.recognizer = new IntentRecognizer();
  }

  /**
   * 处理用户输入
   */
  async chat(input: string): Promise<AgentResponse> {
    // 1. 意图识别
    const intent = this.recognizer.recognize(input);

    // 2. 检查是否识别到有效意图
    if (!intent.skillId) {
      return {
        success: false,
        message: '抱歉，我无法理解您的请求。请尝试描述得更具体一些。\n\n例如："裁剪图片"'
      };
    }

    // 3. 获取 Skill
    const skill = skillRegistry.get(intent.skillId);
    if (!skill) {
      return {
        success: false,
        message: `未找到技能: ${intent.skillId}`,
        skillId: intent.skillId
      };
    }

    // 4. 参数验证
    const validation = skill.validate(intent.parameters);
    if (!validation.valid) {
      return {
        success: false,
        message: `参数错误: ${validation.errors.join('; ')}`,
        skillId: intent.skillId
      };
    }

    // 5. 执行 Skill
    try {
      log.info('Agent', `执行技能: ${intent.skillId}`, intent.parameters);

      const result = await skill.execute(intent.parameters);

      if (result.success) {
        return {
          success: true,
          message: this.generateSuccessMessage(intent, result.data),
          data: result.data,
          skillId: intent.skillId
        };
      } else {
        return {
          success: false,
          message: `处理失败: ${result.error}`,
          skillId: intent.skillId
        };
      }
    } catch (error) {
      log.error('Agent', '技能执行失败', error);
      return {
        success: false,
        message: `执行错误: ${error instanceof Error ? error.message : '未知错误'}`,
        skillId: intent.skillId
      };
    }
  }

  /**
   * 直接调用 Skill（不经过意图识别）
   */
  async invoke(skillId: string, params: Record<string, any>): Promise<AgentResponse> {
    const skill = skillRegistry.get(skillId);
    if (!skill) {
      return {
        success: false,
        message: `未找到技能: ${skillId}`
      };
    }

    const validation = skill.validate(params);
    if (!validation.valid) {
      return {
        success: false,
        message: `参数错误: ${validation.errors.join('; ')}`
      };
    }

    try {
      const result = await skill.execute(params);

      if (result.success) {
        return {
          success: true,
          message: this.generateSuccessMessage({ skillId, type: 'image-processing', parameters: params, confidence: 1.0, reasoning: '直接调用' }, result.data),
          data: result.data,
          skillId
        };
      } else {
        return {
          success: false,
          message: `处理失败: ${result.error}`,
          skillId
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `执行错误: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 生成成功消息
   */
  private generateSuccessMessage(intent: Intent, data: any): string {
    const { skillId } = intent;

    switch (skillId) {
      case 'image-crop':
        return `✅ 图片裁剪完成！\n\n` +
          `📐 原始尺寸: ${data.originalWidth} × ${data.originalHeight}\n` +
          `✂️ 裁剪区域: (${data.cropX}, ${data.cropY}) ${data.cropWidth} × ${data.cropHeight}`;
      
      default:
        return '✅ 处理完成！';
    }
  }
}
