/**
 * 统一 UI 交互系统 - 内容类型定义 (Web 版本)
 *
 * 定义所有交互内容的具体类型
 */

// ============================================================================
// 审批内容 (Approval)
// ============================================================================

/**
 * 审批内容
 */
export interface ApprovalContent {
  type: 'approval';
  /** 工具调用信息 */
  toolCall: {
    name: string;
    args: any;
  };
  /** 可编辑的字段 */
  editableFields?: string[];
  /** 操作按钮标签 */
  actionLabels?: {
    approve?: string;
    edit?: string;
    reject?: string;
  };
}

// ============================================================================
// 选择内容 (Selection)
// ============================================================================

/**
 * 选项定义
 */
export interface SelectOption {
  label: string;
  value: any;
  description?: string;
}

/**
 * 选择内容
 */
export interface SelectionContent {
  type: 'selection';
  /** 选项列表 */
  options: SelectOption[];
  /** 单选模式 */
  singleSelect: boolean;
  /** 允许自定义输入 */
  allowCustomInput: boolean;
  /** 占位符 */
  placeholder?: string;
  /** 多选时的最大选择数 */
  maxSelections?: number;
}

// ============================================================================
// 输入内容 (Input)
// ============================================================================

/**
 * 输入类型
 */
export type InputType = 'text' | 'password' | 'number' | 'email';

/**
 * 输入验证规则
 */
export interface InputValidation {
  /** 正则表达式 */
  pattern?: RegExp;
  /** 最小长度 */
  minLength?: number;
  /** 自定义验证函数 */
  custom?: (value: string) => string | undefined;
}

/**
 * 输入内容
 */
export interface InputContent {
  type: 'input';
  /** 输入类型 */
  inputType: InputType;
  /** 占位符 */
  placeholder?: string;
  /** 默认值 */
  defaultValue?: string;
  /** 多行输入 */
  multiline?: boolean;
  /** 最大长度 */
  maxLength?: number;
  /** 验证规则 */
  validation?: InputValidation;
}

// ============================================================================
// 确认内容 (Confirm)
// ============================================================================

/**
 * 确认内容
 */
export interface ConfirmContent {
  type: 'confirm';
  /** 确认消息 */
  message: string;
  /** 确认按钮标签 */
  confirmLabel?: string;
  /** 取消按钮标签 */
  cancelLabel?: string;
  /** 是否为危险操作（红色按钮） */
  danger?: boolean;
}

// ============================================================================
// 自定义内容 (Custom)
// ============================================================================

/**
 * 自定义内容
 * 未来扩展使用
 */
export interface CustomContent {
  type: 'custom';
  /** 自定义类型标识 */
  customType: string;
  /** 其他自定义属性 */
  [key: string]: any;
}

// ============================================================================
// 联合类型
// ============================================================================

/**
 * 所有交互内容的联合类型
 */
export type InteractionContent =
  | ApprovalContent
  | SelectionContent
  | InputContent
  | ConfirmContent
  | CustomContent;

// ============================================================================
// 类型守卫
// ============================================================================

/**
 * 检查内容是否为审批类型
 */
export function isApprovalContent(content: InteractionContent): content is ApprovalContent {
  return content.type === 'approval';
}

/**
 * 检查内容是否为选择类型
 */
export function isSelectionContent(content: InteractionContent): content is SelectionContent {
  return content.type === 'selection';
}

/**
 * 检查内容是否为输入类型
 */
export function isInputContent(content: InteractionContent): content is InputContent {
  return content.type === 'input';
}

/**
 * 检查内容是否为确认类型
 */
export function isConfirmContent(content: InteractionContent): content is ConfirmContent {
  return content.type === 'confirm';
}

/**
 * 检查内容是否为自定义类型
 */
export function isCustomContent(content: InteractionContent): content is CustomContent {
  return content.type === 'custom';
}
