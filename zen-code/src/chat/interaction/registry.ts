/**
 * 统一 UI 交互系统 - 渲染器注册表
 *
 * 管理交互内容的渲染器注册和查找
 */

import React from 'react';
import type { InteractionContent } from './content';
import type { PanelInteraction, PanelConfig } from './panel';

// ============================================================================
// 渲染器接口
// ============================================================================

/**
 * 交互渲染器接口
 * @template TContent 交互内容类型
 */
export interface InteractionRenderer<TContent extends InteractionContent> {
  /** 渲染器类型标识 */
  type: TContent['type'];

  /** 渲染函数 */
  render: (
    interaction: PanelInteraction & { content: TContent },
    onChange: (updates: Partial<PanelInteraction>) => void
  ) => React.ReactElement;

  /** 验证函数（可选） */
  validate?: (content: TContent) => string | undefined;

  /** 默认配置（可选） */
  defaultConfig?: Partial<PanelConfig>;
}

// ============================================================================
// 渲染器注册表接口
// ============================================================================

/**
 * 渲染器注册表接口
 */
export interface RendererRegistry {
  /**
   * 注册渲染器
   * @param type 内容类型
   * @param renderer 渲染器
   */
  register<T extends InteractionContent>(
    type: T['type'],
    renderer: InteractionRenderer<T>
  ): void;

  /**
   * 获取渲染器
   * @param type 内容类型
   */
  get<T extends InteractionContent>(
    type: T['type']
  ): InteractionRenderer<T> | undefined;

  /**
   * 检查渲染器是否存在
   * @param type 内容类型
   */
  has(type: InteractionContent['type']): boolean;

  /**
   * 列出所有已注册的渲染器类型
   */
  list(): InteractionContent['type'][];

  /**
   * 注销渲染器
   * @param type 内容类型
   */
  unregister(type: InteractionContent['type']): void;

  /**
   * 清空所有渲染器
   */
  clear(): void;
}

// ============================================================================
// 全局渲染器注册表实现
// ============================================================================

/**
 * 全局渲染器注册表类
 */
class GlobalRendererRegistry implements RendererRegistry {
  private renderers = new Map<InteractionContent['type'], InteractionRenderer<any>>();

  register<T extends InteractionContent>(
    type: T['type'],
    renderer: InteractionRenderer<T>
  ): void {
    this.renderers.set(type, renderer);
  }

  get<T extends InteractionContent>(
    type: T['type']
  ): InteractionRenderer<T> | undefined {
    return this.renderers.get(type) as InteractionRenderer<T> | undefined;
  }

  has(type: InteractionContent['type']): boolean {
    return this.renderers.has(type);
  }

  list(): InteractionContent['type'][] {
    return Array.from(this.renderers.keys());
  }

  unregister(type: InteractionContent['type']): void {
    this.renderers.delete(type);
  }

  clear(): void {
    this.renderers.clear();
  }
}

// ============================================================================
// 导出全局注册表实例
// ============================================================================

/**
 * 全局渲染器注册表实例
 */
export const rendererRegistry = new GlobalRendererRegistry();

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 注册渲染器（便捷函数）
 * @param renderer 渲染器
 */
export function registerRenderer<T extends InteractionContent>(
  renderer: InteractionRenderer<T>
): void {
  rendererRegistry.register(renderer.type, renderer);
}

/**
 * 获取渲染器（便捷函数）
 * @param type 内容类型
 */
export function getRenderer<T extends InteractionContent>(
  type: T['type']
): InteractionRenderer<T> | undefined {
  return rendererRegistry.get(type);
}

/**
 * 检查渲染器是否存在（便捷函数）
 * @param type 内容类型
 */
export function hasRenderer(type: InteractionContent['type']): boolean {
  return rendererRegistry.has(type);
}

/**
 * 列出所有渲染器类型（便捷函数）
 */
export function listRenderers(): InteractionContent['type'][] {
  return rendererRegistry.list();
}
