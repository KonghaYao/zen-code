/**
 * 统一 UI 交互系统 - 类型定义 (Web 版本)
 */

import { InteractionContent } from './content';

/**
 * 交互状态
 */
export type InteractionState =
  | 'pending'      // 待处理（初始状态）
  | 'submitted'    // 已提交（用户确认）
  | 'edited'       // 已编辑
  | 'cancelled';   // 已取消

/**
 * 交互元数据
 */
export interface InteractionMetadata {
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 分组键（用于将多个交互分组显示） */
  groupKey?: string;
  /** 消息索引（关联到原始消息） */
  messageIndex?: number;
  /** 工具对象引用 */
  tool?: any;
}

/**
 * 交互结果
 */
export interface InteractionResult {
  /** 状态 */
  status?: 'approved' | 'edited' | 'rejected' | 'selected' | 'confirmed' | 'cancelled';
  /** 选中的值（selection） */
  selected?: any[];
  /** 自定义输入（selection） */
  customInput?: string;
  /** 编辑后的参数（approval） */
  editedArgs?: any;
  /** 拒绝原因（approval） */
  message?: string;
  /** 其他自定义结果 */
  [key: string]: any;
}

/**
 * 交互项
 */
export interface PanelInteraction {
  /** 唯一标识符 */
  id: string;
  /** 交互内容 */
  content: InteractionContent;
  /** 交互状态 */
  state: InteractionState;
  /** 交互元数据 */
  metadata: InteractionMetadata;
  /** 交互结果 */
  result?: InteractionResult;
  /** 结果是否已发送 */
  resultSent?: boolean;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 渲染器函数签名
 */
export type InteractionRendererFunction<T extends InteractionContent> = (
  interaction: PanelInteraction & { content: T },
  onChange: (update: Partial<PanelInteraction>) => void
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
  defaultConfig?: {
    layout?: {
      border?: boolean;
      padding?: number;
    };
    interaction?: {
      autoSubmit?: boolean;
      allowSkip?: boolean;
    };
  };
}

/**
 * 渲染器注册表类型
 */
export type RendererRegistry = Record<string, InteractionRenderer>;
