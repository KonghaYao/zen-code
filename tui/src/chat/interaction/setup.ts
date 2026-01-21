/**
 * 统一 UI 交互系统 - 默认渲染器注册
 *
 * 注册所有内置渲染器
 */

import { rendererRegistry } from './registry';
import { ApprovalRenderer } from './renderers/ApprovalRenderer';
import { SelectionRenderer } from './renderers/SelectionRenderer';
import { InputRenderer } from './renderers/InputRenderer';
import { ConfirmRenderer } from './renderers/ConfirmRenderer';

/**
 * 注册所有默认渲染器
 */
export function registerDefaultRenderers(): void {
  // 注册审批渲染器
  rendererRegistry.register('approval', ApprovalRenderer);

  // 注册选择渲染器
  rendererRegistry.register('selection', SelectionRenderer);

  // 注册输入渲染器
  rendererRegistry.register('input', InputRenderer);

  // 注册确认渲染器
  rendererRegistry.register('confirm', ConfirmRenderer);
}

// 自动注册（模块加载时）
registerDefaultRenderers();

/**
 * 导出注册表供外部使用
 */
export { rendererRegistry };
