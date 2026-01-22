/**
 * 统一 UI 交互系统 - 面板层类型定义
 *
 * 定义面板交互和配置
 */

import type { InteractionCategory } from './types';
import type { InteractionContent } from './content';

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
  content: import('./content').ApprovalContent;
  result?: ApprovalResult;
};

/**
 * 选择交互
 */
export type SelectionInteraction = PanelInteraction & {
  content: import('./content').SelectionContent;
  result?: SelectionResult;
};

/**
 * 输入交互
 */
export type InputInteraction = PanelInteraction & {
  content: import('./content').InputContent;
  result?: InputResult;
};

/**
 * 确认交互
 */
export type ConfirmInteraction = PanelInteraction & {
  content: import('./content').ConfirmContent;
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
