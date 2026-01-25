/**
 * 统一 UI 交互系统 - 内容类型 (Web 版本)
 *
 * 从 @codegraph/union-client 重新导出，保持向后兼容
 */

export type {
  ApprovalContent,
  SelectOption,
  SelectionContent,
  InputType,
  InputValidation,
  InputContent,
  ConfirmContent,
  CustomContent,
  InteractionContent,
} from '@codegraph/union-client';

export {
  isApprovalContent,
  isSelectionContent,
  isInputContent,
  isConfirmContent,
  isCustomContent,
} from '@codegraph/union-client';
