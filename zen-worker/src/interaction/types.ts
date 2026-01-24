/**
 * 统一 UI 交互系统 - 类型定义 (Web 版本)
 *
 * 从 @codegraph/union-client 重新导出，保持向后兼容
 */

export type {
  InteractionCategory,
  InteractionState,
  InteractionMetadata,
  InteractionToolData,
  InteractionContent,
  PanelLayoutConfig,
  PanelInteractionConfig,
  PanelStyleConfig,
  PanelConfig,
  PanelInteraction,
  ApprovalResult,
  SelectionResult,
  InputResult,
  ConfirmResult,
  ApprovalInteraction,
  SelectionInteraction,
  InputInteraction,
  ConfirmInteraction,
  AnyPanelInteraction,
  InteractionRenderer,
  RendererRegistry,
  InteractionRendererFunction,
  ApprovalContent,
  SelectOption,
  SelectionContent,
  InputType,
  InputValidation,
  InputContent,
  ConfirmContent,
  CustomContent,
} from '@codegraph/union-client';

export {
  isApprovalContent,
  isSelectionContent,
  isInputContent,
  isConfirmContent,
  isCustomContent,
} from '@codegraph/union-client';
