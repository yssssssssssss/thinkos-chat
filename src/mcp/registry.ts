/**
 * Skill 注册表
 * 管理所有可用技能的注册和发现
 */

import { Skill } from '../skills/base/types';
import { log } from '../utils/logger';

class SkillRegistry {
  private skills = new Map<string, Skill>();

  /**
   * 注册一个技能
   */
  register(skill: Skill): void {
    const { id } = skill.manifest;
    
    if (this.skills.has(id)) {
      log.warn('SkillRegistry', `技能已存在，将覆盖: ${id}`);
    }
    
    this.skills.set(id, skill);
    log.info('SkillRegistry', `技能注册成功: ${id} (${skill.manifest.name})`);
  }

  /**
   * 根据 ID 获取技能
   */
  get(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  /**
   * 获取所有技能
   */
  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * 根据分类获取技能
   */
  findByCategory(category: string): Skill[] {
    return this.getAll().filter(skill => 
      skill.manifest.id.startsWith(`${category}-`)
    );
  }

  /**
   * 检查技能是否存在
   */
  has(id: string): boolean {
    return this.skills.has(id);
  }

  /**
   * 获取技能数量
   */
  size(): number {
    return this.skills.size;
  }

  /**
   * 清空所有注册
   */
  clear(): void {
    this.skills.clear();
  }
}

// 导出单例
export const skillRegistry = new SkillRegistry();
