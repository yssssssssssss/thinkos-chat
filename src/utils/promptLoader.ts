/**
 * Prompt 加载工具
 * 用于加载和管理 Prompt 模板
 */

class PromptLoader {
  private cache = new Map<string, string>();

  /**
   * 加载 Prompt 文件
   */
  async load(path: string): Promise<string> {
    // 检查缓存
    if (this.cache.has(path)) {
      return this.cache.get(path)!;
    }

    try {
      const response = await fetch(`/prompts/${path}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const content = await response.text();
      this.cache.set(path, content);
      return content;
    } catch (error) {
      console.error(`[PromptLoader] 加载失败: ${path}`, error);
      return '';
    }
  }

  /**
   * 渲染模板
   * 将 {{variable}} 替换为实际值
   */
  render(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = context[key];
      if (value !== undefined) {
        return typeof value === 'string' ? value : JSON.stringify(value);
      }
      return `{{${key}}}`;
    });
  }

  /**
   * 加载并渲染模板
   */
  async loadAndRender(path: string, context: Record<string, any>): Promise<string> {
    const template = await this.load(path);
    return this.render(template, context);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 清除指定路径的缓存
   */
  invalidate(path: string): void {
    this.cache.delete(path);
  }
}

// 导出单例
export const promptLoader = new PromptLoader();
