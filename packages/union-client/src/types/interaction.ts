/**
 * 统一 UI 交互系统 - 完整类型定义
 *
 * 从 zen-code 迁移到 union-client，供 zen-code 和 zen-worker 共用
 */

import { ToolRenderData } from '@langgraph-js/sdk';

// ============================================================================
// 基础类型
// ============================================================================

/**
 * 交互类别
 * 决定交互在哪里显示
 */
export enum InteractionCategory {
  PANEL = 'panel',      // 面板类型（显示在 UnifiedUIPanel）
  INLINE = 'inline',    // 内联类型（直接在消息中显示）
  MODAL = 'modal',      // 模态框类型（未来扩展）
}

/**
 * 交互状态
 */
export enum InteractionState {
  IDLE = 'idle',                // 空闲状态
  ACTIVE = 'active',            // 正在交互
  SUBMITTED = 'submitted',      // 已提交
  CANCELLED = 'cancelled',      // 已取消
  EDITED = 'edited',            // 已编辑
}

/**
 * 交互元数据（通用）
 */
export interface InteractionMetadata {
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 图标 */
  icon?: string;
  /** 优先级 */
  priority?: 'high' | 'medium' | 'low';
  /** 分组键（用于分组显示） */
  groupKey?: string;
  /** 消息索引（关联的消息） */
  messageIndex?: number;
}

/**
 * 工具渲染数据（从 ToolRenderData 扩展）
 */
export type InteractionToolData = ToolRenderData<any, any>;

// ============================================================================
// 内容类型定义
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

/**
 * 自定义内容
 * 未来扩展使用
 */
export interface CustomContent {
  type: 'custom';
  /** 自定义类型标识 */
  customType: string;
  /** 自定义渲染函数 */
  render?: (content: CustomContent, onSubmit: (result: any) => void) => React.ReactElement;
  /** 其他自定义属性 */
  [key: string]: any;
}

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
// 面板配置
// ============================================================================

/**
 * 布局配置
 */
export interface PanelLayoutConfig {
  /** 宽度（百分比或像素） */
  width?: number;
  /** 是否显示边框 */
  border?: boolean;
  /** 内边距 */
  padding?: number;
}

/**
 * 交互配置
 */
export interface PanelInteractionConfig {
  /** 是否自动提交 */
  autoSubmit?: boolean;
  /** 是否允许跳过 */
  allowSkip?: boolean;
  /** 是否显示预览 */
  showPreview?: boolean;
}

/**
 * 样式配置
 */
export interface PanelStyleConfig {
  /** 边框颜色 */
  borderColor?: string;
  /** 背景色 */
  backgroundColor?: string;
}

/**
 * 面板配置
 */
export interface PanelConfig {
  /** 布局配置 */
  layout?: PanelLayoutConfig;
  /** 交互配置 */
  interaction?: PanelInteractionConfig;
  /** 样式配置 */
  style?: PanelStyleConfig;
}

// ============================================================================
// 面板交互
// ============================================================================

/**
 * 面板交互基础接口
 * 所有显示在 UnifiedUIPanel 的交互
 */
export interface PanelInteraction {
  /** 唯一标识 */
  id: string;

  /** 类别（固定为 'panel'） */
  category: InteractionCategory.PANEL;

  /** 状态 */
  state: 'idle' | 'active' | 'submitted' | 'cancelled' | 'edited';

  /** 元数据 */
  metadata: {
    title?: string;
    description?: string;
    icon?: string;
    priority?: 'high' | 'medium' | 'low';
    groupKey?: string;
    messageIndex?: number;
  };

  /** 关联的工具 */
  tool?: any;

  /** 面板配置 */
  config: PanelConfig;

  /** 交互内容 */
  content: InteractionContent;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;

  /** 结果（由具体内容类型定义） */
  result?: any;

  /** 内部标记 */
  resultSent?: boolean;
}

// ============================================================================
// 结果类型定义
// ============================================================================

/**
 * 审批结果
 */
export interface ApprovalResult {
  status: 'approved' | 'edited' | 'rejected';
  editedArgs?: any;
  message?: string;
}

/**
 * 选择结果
 */
export interface SelectionResult {
  selected: any[];
  customInput?: string;
}

/**
 * 输入结果
 */
export interface InputResult {
  value: string;
}

/**
 * 确认结果
 */
export interface ConfirmResult {
  confirmed: boolean;
}

// ============================================================================
// 带结果的面板交互类型
// ============================================================================

/**
 * 审批交互
 */
export type ApprovalInteraction = PanelInteraction & {
  content: ApprovalContent;
  result?: ApprovalResult;
};

/**
 * 选择交互
 */
export type SelectionInteraction = PanelInteraction & {
  content: SelectionContent;
  result?: SelectionResult;
};

/**
 * 输入交互
 */
export type InputInteraction = PanelInteraction & {
  content: InputContent;
  result?: InputResult;
};

/**
 * 确认交互
 */
export type ConfirmInteraction = PanelInteraction & {
  content: ConfirmContent;
  result?: ConfirmResult;
};

// ============================================================================
// 联合类型
// ============================================================================

/**
 * 所有可能的面板交互类型
 */
export type AnyPanelInteraction =
  | ApprovalInteraction
  | SelectionInteraction
  | InputInteraction
  | ConfirmInteraction;

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

// ============================================================================
// 渲染器类型定义
// ============================================================================

/**
 * 渲染器函数签名
 */
export type InteractionRendererFunction<T extends InteractionContent> = (
  interaction: any & { content: T },
  onChange: (update: any) => void
) => React.ReactElement;

/**
 * 渲染器接口
 */
export interface InteractionRenderer<T extends InteractionContent = InteractionContent> {
  /** 渲染器类型（必须与 content.type 匹配） */
  type: string;
  /** 渲染函数 */
  render: InteractionRendererFunction<T>;
  /** 验证函数（可选） */
  validate?: (content: T) => string | undefined;
  /** 默认配置（可选） */
  defaultConfig?: Partial<any>;
}

/**
 * 渲染器注册表类型
 */
export type RendererRegistry = Record<string, InteractionRenderer>;

