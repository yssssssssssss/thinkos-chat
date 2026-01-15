/**
 * Skills 初始化服务
 * 统一管理 Skills 的注册和初始化
 */

import { registerSkills } from '../skills';
import { skillRegistry } from '../mcp/registry';
import { log } from '../utils/logger';

export class SkillService {
  private static initialized = false;

  /**
   * 初始化所有 Skills
   * 确保只初始化一次
   */
  static initialize(): void {
    if (this.initialized) {
      log.warn('SkillService', 'Skills 已经初始化，跳过重复初始化');
      return;
    }

    log.info('SkillService', '开始初始化 Skills');

    try {
      // 注册所有 Skills
      registerSkills();

      const count = skillRegistry.size();
      const skills = skillRegistry.getAll().map(s => s.manifest.id);

      log.info('SkillService', `Skills 初始化完成，共注册 ${count} 个技能`, {
        count,
        skills
      });

      this.initialized = true;
    } catch (error) {
      log.error('SkillService', 'Skills 初始化失败', error);
      throw error;
    }
  }

  /**
   * 获取所有已注册的 Skills
   */
  static getRegisteredSkills() {
    if (!this.initialized) {
      log.warn('SkillService', 'Skills 尚未初始化，请先调用 initialize()');
    }
    return skillRegistry.getAll();
  }

  /**
   * 检查是否已初始化
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 获取注册的 Skills 数量
   */
  static getSkillCount(): number {
    return skillRegistry.size();
  }

  /**
   * 根据 ID 获取 Skill
   */
  static getSkillById(id: string) {
    return skillRegistry.get(id);
  }

  /**
   * 根据分类获取 Skills
   */
  static getSkillsByCategory(category: string) {
    return skillRegistry.findByCategory(category);
  }
}
