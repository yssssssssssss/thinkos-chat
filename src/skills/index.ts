/**
 * Skills 统一注册入口
 */

import { skillRegistry } from '../mcp/registry';
import { CropImageSkill } from './image/cropImage';

/**
 * 注册所有内置 Skills
 */
export function registerSkills(): void {
  // 图片处理 Skills
  skillRegistry.register(new CropImageSkill());
}

/**
 * 获取所有已注册的 Skills
 */
export function getRegisteredSkills() {
  return skillRegistry.getAll();
}

/**
 * 导出 Skills 类（用于测试和高级用法）
 */
export { CropImageSkill } from './image/cropImage';

/**
 * 导出预设尺寸
 */
