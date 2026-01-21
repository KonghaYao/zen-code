/**
 * 统一 UI 交互系统 - 基础类型定义
 *
 * 这是交互系统的最底层抽象，定义所有交互的通用属性
 */

import { ToolRenderData } from '@langgraph-js/sdk';

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

/**
 * 基础交互接口
 * 所有交互类型的底层抽象
 */
export interface BaseInteraction {
  /** 唯一标识 */
  id: string;

  /** 类别（决定在哪里显示） */
  category: InteractionCategory;

  /** 状态 */
  state: InteractionState;

  /** 元数据 */
  metadata: InteractionMetadata;

  /** 关联的工具 */
  tool?: InteractionToolData;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;

  /** 结果（任意类型，由具体类型定义） */
  result?: any;

  /** 内部标记：结果是否已发送 */
  resultSent?: boolean;
}

/**
 * 内容类型标识（用于类型守卫）
 */
export type ContentType =
  | 'approval'
  | 'selection'
  | 'input'
  | 'confirm'
  | 'custom';

// 重新导出 InteractionContent（定义在 content.ts 中）
export type { InteractionContent } from './content';
