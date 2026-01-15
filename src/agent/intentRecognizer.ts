/**
 * 意图识别器
 * 将自然语言转换为结构化意图
 */

import { Intent } from './types';

/**
 * 技能模式匹配规则
 */
const SKILL_PATTERNS: Record<string, RegExp[]> = {
  'image-crop': [
    /裁剪/i,
    /剪切.*区域/i,
    /crop.*image/i,
    /截取.*图片/i,
  ]
};

export class IntentRecognizer {
  /**
   * 识别用户输入的意图
   */
  recognize(input: string): Intent {
    const trimmedInput = input.trim();

    // 1. 模式匹配
    for (const [skillId, patterns] of Object.entries(SKILL_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(trimmedInput)) {
          return {
            type: 'image-processing',
            skillId,
            parameters: {},
            confidence: 0.9,
            reasoning: `匹配到模式: ${pattern.source}`
          };
        }
      }
    }

    // 2. 降级返回 unknown
    return {
      type: 'unknown',
      parameters: {},
      confidence: 0,
      reasoning: '未匹配到任何已知模式'
    };
  }
}
