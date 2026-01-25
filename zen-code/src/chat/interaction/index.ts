/**
 * 统一 UI 交互系统 - 导出所有模块
 */

// ========== 基础类型 ==========
export type {
  InteractionMetadata,
  InteractionToolData,
} from './types';
export { InteractionCategory, InteractionState } from './types';

// ========== 内容类型 ==========
export type {
  InteractionContent,
  ApprovalContent,
  SelectionContent,
  InputContent,
  ConfirmContent,
  CustomContent,
  SelectOption,
  InputType,
  InputValidation,
} from './content';
export {
  isApprovalContent,
  isSelectionContent,
  isInputContent,
  isConfirmContent,
  isCustomContent,
} from './content';

// ========== 面板类型 ==========
export type {
  PanelInteraction,
  PanelConfig,
  PanelLayoutConfig,
  PanelInteractionConfig,
  PanelStyleConfig,
  AnyPanelInteraction,
  ApprovalInteraction,
  SelectionInteraction,
  InputInteraction,
  ConfirmInteraction,
  ApprovalResult,
  SelectionResult,
  InputResult,
  ConfirmResult,
} from './panel';

// ========== Context ==========
export {
  InteractionProvider,
  useInteractionContext,
} from './context';
export type { InteractionContextValue } from './context';

// ========== 渲染器 ==========
export type {
  InteractionRenderer,
  RendererRegistry,
} from './registry';
export {
  rendererRegistry,
  registerRenderer,
  getRenderer,
  hasRenderer,
  listRenderers,
} from './registry';

// ========== 渲染器实现 ==========
export { ApprovalRenderer } from './renderers/ApprovalRenderer';
export { SelectionRenderer } from './renderers/SelectionRenderer';
export { InputRenderer } from './renderers/InputRenderer';
export { ConfirmRenderer } from './renderers/ConfirmRenderer';

// ========== 示例：自定义渲染器 ==========
export {
  FilePickerRenderer,
  registerFilePickerRenderer,
  type FilePickerContent,
  type FilePickerResult,
} from './renderers/FilePickerRenderer';

// ========== 面板组件 ==========
export { UnifiedUIPanel } from './UnifiedUIPanel';
export { InteractionRendererWrapper } from './InteractionRendererWrapper';

// ========== 设置 ==========
export { registerDefaultRenderers } from './setup';
