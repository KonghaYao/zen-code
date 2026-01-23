/**
 * 统一 UI 交互系统 - Context (Web 版本)
 *
 * 管理所有用户交互的状态和生命周期
 */

import React, { createContext, useContext, ReactNode, useState, useCallback, useMemo } from 'react';
import type { PanelInteraction, InteractionContent, InteractionMetadata } from './types';

/**
 * 交互上下文接口
 */
interface InteractionContextValue {
  /** 所有交互项 */
  interactions: PanelInteraction[];
  /** 添加交互 */
  addInteraction: (
    content: InteractionContent,
    options?: {
      tool?: any;
      metadata?: Omit<InteractionMetadata, 'tool'>;
    }
  ) => PanelInteraction;
  /** 更新交互 */
  updateInteraction: (id: string, updates: Partial<PanelInteraction>) => void;
  /** 移除交互 */
  removeInteraction: (id: string) => void;
  /** 获取所有交互 */
  getInteractions: () => PanelInteraction[];
  /** 获取指定状态的交互数量 */
  getInteractionCount: (state?: PanelInteraction['state']) => number;
  /** 是否有待处理的交互 */
  hasPendingInteractions: boolean;
  /** 清空所有已完成的交互 */
  clearCompletedInteractions: () => void;
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

interface InteractionProviderProps {
  children: ReactNode;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `interaction_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 交互上下文提供者
 */
export const InteractionProvider: React.FC<InteractionProviderProps> = ({
  children,
}) => {
  // 内部状态管理
  const [interactions, setInteractions] = useState<PanelInteraction[]>([]);

  /**
   * 添加交互
   */
  const addInteraction = useCallback((
    content: InteractionContent,
    options?: {
      tool?: any;
      metadata?: Omit<InteractionMetadata, 'tool'>;
    }
  ): PanelInteraction => {
    const newInteraction: PanelInteraction = {
      id: generateId(),
      content,
      state: 'pending',
      metadata: {
        ...options?.metadata,
        tool: options?.tool,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setInteractions(prev => {
      console.log('[InteractionContext] Current interactions:', prev.length);
      console.log('[InteractionContext] Adding new interaction:', newInteraction.id, content.type);
      return [...prev, newInteraction];
    });

    return newInteraction;
  }, []);

  /**
   * 更新交互
   */
  const updateInteraction = useCallback((id: string, updates: Partial<PanelInteraction>) => {
    setInteractions(prev => prev.map(interaction => {
      if (interaction.id === id) {
        const updated = {
          ...interaction,
          ...updates,
          updatedAt: new Date(),
        };
        console.log('[InteractionContext] Updated interaction:', id, updated.state);
        return updated;
      }
      return interaction;
    }));
  }, []);

  /**
   * 移除交互
   */
  const removeInteraction = useCallback((id: string) => {
    setInteractions(prev => prev.filter(interaction => interaction.id !== id));
    console.log('[InteractionContext] Removed interaction:', id);
  }, []);

  /**
   * 获取所有交互
   */
  const getInteractions = useCallback(() => {
    return interactions;
  }, [interactions]);

  /**
   * 获取指定状态的交互数量
   */
  const getInteractionCount = useCallback((state?: PanelInteraction['state']) => {
    if (state) {
      return interactions.filter(i => i.state === state).length;
    }
    return interactions.length;
  }, [interactions]);

  /**
   * 清空所有已完成的交互
   */
  const clearCompletedInteractions = useCallback(() => {
    setInteractions(prev => prev.filter(i => i.state === 'pending'));
  }, []);

  // 计算是否有待处理的交互
  const hasPendingInteractions = useMemo(
    () => interactions.some(i => i.state === 'pending'),
    [interactions]
  );

  // 构建上下文值
  const contextValue = useMemo<InteractionContextValue>(
    () => ({
      interactions,
      addInteraction,
      updateInteraction,
      removeInteraction,
      getInteractions,
      getInteractionCount,
      hasPendingInteractions,
      clearCompletedInteractions,
    }),
    [
      interactions,
      addInteraction,
      updateInteraction,
      removeInteraction,
      getInteractions,
      getInteractionCount,
      hasPendingInteractions,
      clearCompletedInteractions,
    ]
  );

  return <InteractionContext.Provider value={contextValue}>{children}</InteractionContext.Provider>;
};
