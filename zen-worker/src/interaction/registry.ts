/**
 * 统一 UI 交互系统 - 渲染器注册表 (Web 版本)
 *
 * 管理所有交互类型的渲染器
 */

import type { InteractionRenderer, RendererRegistry } from './types';
import type { InteractionContent } from './types';

/**
 * 全局渲染器注册表
 */
class RendererRegistryManager {
  private registry: RendererRegistry = {};

  /**
   * 注册渲染器
   * @param type 内容类型
   * @param renderer 渲染器
   */
  register<T extends InteractionContent>(
    type: T['type'],
    renderer: InteractionRenderer<T>
  ): void {
    if (this.registry[type]) {
      console.warn(`[RendererRegistry] Renderer for type "${type}" already exists, overwriting.`);
    }
    this.registry[type] = renderer;
    console.log(`[RendererRegistry] Registered renderer for type: ${type}`);
  }

  /**
   * 获取渲染器
   */
  get(type: string): InteractionRenderer | undefined {
    return this.registry[type];
  }

  /**
   * 检查渲染器是否存在
   */
  has(type: string): boolean {
    return type in this.registry;
  }

  /**
   * 获取所有已注册的类型
   */
  getTypes(): string[] {
    return Object.keys(this.registry);
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.registry = {};
  }
}

/**
 * 全局渲染器注册表实例
 */
export const rendererRegistry = new RendererRegistryManager();

/**
 * 导出注册表类型供外部使用
 */
export type { RendererRegistry, InteractionRenderer } from './types';
