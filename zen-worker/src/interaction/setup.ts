/**
 * 统一 UI 交互系统 - 默认渲染器注册 (Web 版本)
 *
 * 注册所有内置渲染器
 */

import { rendererRegistry } from './registry';
import { ApprovalRenderer } from './renderers/ApprovalRenderer';
import { SelectionRenderer } from './renderers/SelectionRenderer';

/**
 * 注册所有默认渲染器
 */
export function registerDefaultRenderers(): void {
  // 注册审批渲染器
  rendererRegistry.register('approval', ApprovalRenderer);

  // 注册选择渲染器
  rendererRegistry.register('selection', SelectionRenderer);

  console.log('[InteractionSetup] Registered default renderers:', rendererRegistry.getTypes());
}

// 自动注册（模块加载时）
registerDefaultRenderers();

/**
 * 导出注册表供外部使用
 */
export { rendererRegistry };
