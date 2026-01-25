/**
 * 统一 UI 交互系统 - InteractionContext
 *
 * 提供全局交互状态管理
 * 从 zen-code 迁移到 union-client，供 zen-code 和 zen-worker 共用
 */

import React, { createContext, useContext, ReactNode, useMemo, useState, useCallback, useEffect } from 'react';
import type { PanelInteraction, AnyPanelInteraction } from '../types/interaction';
import type { InteractionContent, InteractionState } from '../types/interaction';
import { InteractionCategory } from '../types/interaction';

/**
 * 交互上下文接口
 */
export interface InteractionContextValue {
  // ========== 添加交互 ==========
  /**
   * 添加交互
   * @param content 交互内容
   * @param options 选项
   * @returns 创建的交互对象
   */
  addInteraction: (
    content: InteractionContent,
    options?: {
      tool?: any;
      metadata?: Partial<{
        title?: string;
        description?: string;
        icon?: string;
        priority?: 'high' | 'medium' | 'low';
        groupKey?: string;
        messageIndex?: number;
      }>;
      config?: Partial<{
        layout?: {
          width?: number;
          border?: boolean;
          padding?: number;
        };
        interaction?: {
          autoSubmit?: boolean;
          allowSkip?: boolean;
          showPreview?: boolean;
        };
        style?: {
          borderColor?: string;
          backgroundColor?: string;
        };
      }>;
    }
  ) => PanelInteraction;

  // ========== 更新交互 ==========
  /**
   * 更新交互
   * @param id 交互 ID
   * @param updates 更新内容
   */
  updateInteraction: (
    id: string,
    updates: Partial<AnyPanelInteraction>
  ) => void;

  // ========== 移除交互 ==========
  /**
   * 移除交互
   * @param id 交互 ID
   */
  removeInteraction: (id: string) => void;

  /**
   * 清空所有交互
   * 用于会话切换时重置状态
   */
  clearAll: () => void;

  // ========== 查询 ==========
  /**
   * 获取单个交互
   * @param id 交互 ID
   */
  getInteraction: (id: string) => AnyPanelInteraction | undefined;

  /**
   * 获取所有交互
   */
  getInteractions: () => AnyPanelInteraction[];

  /**
   * 按状态获取交互
   * @param state 交互状态
   */
  getInteractionsByState: (state: InteractionState) => AnyPanelInteraction[];

  /**
   * 按内容类型获取交互
   * @param type 内容类型
   */
  getInteractionsByContent: <T extends InteractionContent['type']>(
    type: T
  ) => Array<AnyPanelInteraction & { content: InteractionContent & { type: T } }>;

  // ========== 批量操作 ==========
  /**
   * 提交所有待处理的交互
   */
  submitInteractions: () => Promise<void>;

  /**
   * 清空已完成的交互
   */
  clearCompleted: () => void;

  // ========== 状态 ==========
  /**
   * 所有交互列表（只读）
   */
  interactions: AnyPanelInteraction[];

  /**
   * 交互版本号（用于强制更新）
   */
  updateCount: number;

  /**
   * 是否有待处理的交互
   */
  hasPendingInteractions: boolean;

  /**
   * 所有交互是否都已处理完毕
   */
  allInteractionsProcessed: boolean;
}

/**
 * 交互上下文
 */
const InteractionContext = createContext<InteractionContextValue | null>(null);

/**
 * 使用交互上下文的 Hook
 */
export const useInteractionContext = (): InteractionContextValue => {
  const context = useContext(InteractionContext);
  if (!context) {
    throw new Error('useInteractionContext must be used within InteractionProvider');
  }
  return context;
};

/**
 * 交互上下文提供者属性
 */
interface InteractionProviderProps {
  children: ReactNode;
  /**
   * 当交互被提交时的回调
   * 用于向 Agent 发送结果
   */
  onInteractionSubmit?: (interaction: AnyPanelInteraction) => Promise<void>;
}

/**
 * 交互上下文提供者
 */
export const InteractionProvider: React.FC<InteractionProviderProps> = ({
  children,
  onInteractionSubmit,
}) => {
  // 内部状态管理
  const [interactions, setInteractions] = useState<AnyPanelInteraction[]>([]);
  const [updateCount, setUpdateCount] = useState(0);

  /**
   * 生成唯一 ID
   */
  const generateId = useCallback(() => {
    return `interaction_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  /**
   * 添加交互
   */
  const addInteraction = useCallback((
    content: InteractionContent,
    options?: {
      tool?: any;
      metadata?: Partial<any>;
      config?: Partial<any>;
    }
  ): PanelInteraction => {
    const now = new Date();

    const newInteraction: PanelInteraction = {
      id: generateId(),
      category: InteractionCategory.PANEL,
      state: 'idle',
      metadata: {
        title: options?.metadata?.title,
        description: options?.metadata?.description,
        icon: options?.metadata?.icon,
        priority: options?.metadata?.priority ?? 'medium',
        groupKey: options?.metadata?.groupKey,
        messageIndex: options?.metadata?.messageIndex,
      },
      tool: options?.tool,
      config: {
        layout: {
          border: true,
          padding: 1,
          ...options?.config?.layout,
        },
        interaction: {
          autoSubmit: false,
          allowSkip: false,
          showPreview: true,
          ...options?.config?.interaction,
        },
        style: options?.config?.style ?? {},
      },
      content,
      createdAt: now,
      updatedAt: now,
    };


    setInteractions(prev => [...prev, newInteraction as any]);
    setUpdateCount(c => c + 1);

    return newInteraction;
  }, [generateId]);

  /**
   * 更新交互
   */
  const updateInteraction = useCallback((
    id: string,
    updates: Partial<AnyPanelInteraction>
  ) => {
    setInteractions(prev => prev.map(int =>
      int.id === id
        ? { ...int, ...updates, updatedAt: new Date() } as any
        : int
    ));
    setUpdateCount(c => c + 1);
  }, []);

  /**
   * 移除交互
   */
  const removeInteraction = useCallback((id: string) => {
    setInteractions(prev => prev.filter(int => int.id !== id));
    setUpdateCount(c => c + 1);
  }, []);

  /**
   * 清空所有交互
   * 用于会话切换时重置状态
   */
  const clearAll = useCallback(() => {
    setInteractions([]);
    setUpdateCount(c => c + 1);
  }, []);

  /**
   * 获取单个交互
   */
  const getInteraction = useCallback((id: string) => {
    return interactions.find(int => int.id === id);
  }, [interactions]);

  /**
   * 获取所有交互
   * MODIFIED: 返回数组副本以确保每次调用都有新引用，触发依赖更新
   */
  const getInteractions = useCallback(() => {
    return [...interactions];
  }, [interactions]);

  /**
   * 按状态获取交互
   */
  const getInteractionsByState = useCallback((state: InteractionState) => {
    return interactions.filter(int => int.state === state);
  }, [interactions]);

  /**
   * 按内容类型获取交互
   */
  const getInteractionsByContent = useCallback(<T extends InteractionContent['type']>(type: T) => {
    return interactions.filter(
      (int): int is AnyPanelInteraction & { content: InteractionContent & { type: T } } =>
        int.content.type === type
    );
  }, [interactions]);

  /**
   * 批量提交所有待处理的交互
   */
  const submitInteractions = useCallback(async () => {
    const submitted = interactions.filter(
      int => int.state === 'submitted' || int.state === 'edited' || int.state === 'cancelled'
    );



    for (const interaction of submitted) {
      if (!interaction.resultSent && onInteractionSubmit) {
        await onInteractionSubmit(interaction);
        updateInteraction(interaction.id, { resultSent: true });
      }
    }
  }, [interactions, onInteractionSubmit, updateInteraction]);

  /**
   * 清空已完成的交互
   */
  const clearCompleted = useCallback(() => {
    setInteractions(prev => prev.filter(
      int => int.state === 'idle' || int.state === 'active'
    ));
    setUpdateCount(c => c + 1);
  }, []);

  // ========== 计算属性 ==========

  /**
   * 是否有待处理的交互
   */
  const hasPendingInteractions = useMemo(
    () => interactions.some(int => int.state === 'idle' || int.state === 'active'),
    [interactions]
  );

  /**
   * 所有交互是否都已处理完毕
   */
  const allInteractionsProcessed = useMemo(
    () => interactions.length > 0 && interactions.every(
      int => int.state === 'submitted' || int.state === 'edited' || int.state === 'cancelled'
    ),
    [interactions]
  );

  // ========== 自动提交 ==========

  // 当所有交互都处理完毕时，自动提交
  useEffect(() => {
    if (allInteractionsProcessed && hasPendingInteractions === false) {
      submitInteractions();
      // 清空已完成的交互
      setTimeout(() => {
        clearCompleted();
      }, 100);
    }
  }, [allInteractionsProcessed, hasPendingInteractions, submitInteractions, clearCompleted]);

  // ========== 构建上下文值 ==========

  const contextValue = useMemo<InteractionContextValue>(
    () => ({
      addInteraction,
      updateInteraction,
      removeInteraction,
      clearAll,
      getInteraction,
      getInteractions,
      getInteractionsByState,
      getInteractionsByContent,
      submitInteractions,
      clearCompleted,
      interactions,
      updateCount,
      hasPendingInteractions,
      allInteractionsProcessed,
    }),
    [
      addInteraction,
      updateInteraction,
      removeInteraction,
      clearAll,
      getInteraction,
      getInteractions,
      getInteractionsByState,
      getInteractionsByContent,
      submitInteractions,
      clearCompleted,
      interactions,
      updateCount,
      hasPendingInteractions,
      allInteractionsProcessed,
    ]
  );

  return <InteractionContext.Provider value={contextValue}>{children}</InteractionContext.Provider>;
};
