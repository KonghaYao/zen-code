/**
 * 统一 UI 交互系统 - 入口文件 (Web 版本)
 *
 * 导出所有模块
 */

// Context
export { InteractionProvider, useInteractionContext } from './context';

// Types
export type {
  InteractionContent,
  SelectOption,
  SelectionContent,
  ApprovalContent,
  InputContent,
  InputValidation,
  ConfirmContent,
  CustomContent,
} from './content';

export type {
  InteractionState,
  InteractionMetadata,
  InteractionResult,
  PanelInteraction,
  InteractionRenderer,
  RendererRegistry,
} from './types';

export {
  isApprovalContent,
  isSelectionContent,
  isInputContent,
  isConfirmContent,
  isCustomContent,
} from './content';

// Components
export { UnifiedUIPanel } from './UnifiedUIPanel';

// Registry
export { rendererRegistry, registerDefaultRenderers } from './setup';
