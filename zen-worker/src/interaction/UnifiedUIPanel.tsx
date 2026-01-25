/**
 * 统一 UI 面板 (Web 版本)
 *
 * 显示所有待处理的用户交互，每个交互一个 Tab
 * 支持自动导航和批量执行
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useInteractionContext } from '@codegraph/union-client';
import { useChat } from '@langgraph-js/sdk/react';
import { rendererRegistry } from './registry';
import { InteractionRendererWrapper } from './InteractionRendererWrapper';
import type { PanelInteraction } from './types';

/**
 * 统一 UI 面板组件
 *
 * MODIFIED: 支持 chatId 会话隔离
 * - 只显示当前会话（chatId）的交互
 * - 会话切换时，activeTab 自动重置
 */
export const UnifiedUIPanel: React.FC = () => {
  const ctx = useInteractionContext();
  const { currentChatId } = useChat();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // MODIFIED: 当会话切换时，重置 activeTab
  useEffect(() => {
    console.log('[UnifiedUIPanel] Session changed, resetting activeTab:', currentChatId);
    setActiveTab(null);
  }, [currentChatId]);

  // MODIFIED: 只获取当前会话的交互
  const allSessionInteractions = useMemo(
    () => ctx.getInteractions().filter(i => i.metadata.chatId === currentChatId),
    [ctx.updateCount, currentChatId]
  );

  // MODIFIED: 当前会话中未处理的交互
  const pendingInteractions = useMemo(
    () => allSessionInteractions.filter(i => i.state === 'idle' || i.state === 'active'),
    [allSessionInteractions]
  );

  // 初始化和自动切换 activeTab
  useEffect(() => {
    if (pendingInteractions.length > 0 && !activeTab) {
      // 第一次初始化，选择第一个
      setActiveTab(pendingInteractions[0].id);
    } else if (activeTab && !pendingInteractions.find(i => i.id === activeTab)) {
      // 当前激活的 tab 不在 pending 列表中，切换到第一个
      setActiveTab(pendingInteractions.length > 0 ? pendingInteractions[0].id : null);
    }
  }, [pendingInteractions, activeTab]);

  // MODIFIED: 批量执行所有已处理的交互（仅当前会话）
  const executeApproved = useCallback(async () => {
    console.log('[UnifiedUIPanel] Submitting all interactions, chatId:', currentChatId);
    await ctx.submitInteractions();
  }, [ctx, currentChatId]);

  // 快捷键: Alt+E 执行所有已处理的交互
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'e') {
        e.preventDefault();
        executeApproved();
      }
      // 左右箭头切换 tab
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const currentIndex = pendingInteractions.findIndex(i => i.id === activeTab);
        if (currentIndex !== -1) {
          const nextIndex = e.key === 'ArrowRight'
            ? (currentIndex + 1) % pendingInteractions.length
            : (currentIndex - 1 + pendingInteractions.length) % pendingInteractions.length;
          setActiveTab(pendingInteractions[nextIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, pendingInteractions, executeApproved]);

  // 跳转到下一个待处理的交互
  const nextTab = useCallback((currentId: string) => {
    const currentIndex = pendingInteractions.findIndex(i => i.id === currentId);
    const nextPending = pendingInteractions.slice(currentIndex + 1).find(i => i.state === 'idle' || i.state === 'active');

    if (nextPending) {
      setActiveTab(nextPending.id);
    } else {
      // 如果后面没有，从前面找
      const firstPending = pendingInteractions.find(i => i.state === 'idle' || i.state === 'active');
      if (firstPending) {
        setActiveTab(firstPending.id);
      }
    }
  }, [pendingInteractions]);

  // 渲染当前激活的交互
  const renderCurrentInteraction = () => {
    if (!activeTab) return null;

    // MODIFIED: 从当前会话的所有交互中查找（包括已处理的），以便正确显示状态
    const interaction = allSessionInteractions.find(i => i.id === activeTab);
    if (!interaction) return null;

    const renderer = rendererRegistry.get(interaction.content.type);

    if (!renderer) {
      return (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="text-red-700">
            ❌ No renderer found for type: {interaction.content.type}
          </div>
        </div>
      );
    }

    return (
      <InteractionRendererWrapper
        key={`${interaction.id}-${interaction.state}`} // MODIFIED: 添加 key 确保状态变化时重新渲染
        interaction={interaction}
        renderer={renderer}
        onChange={(updates) => {
          console.log('[UnifiedUIPanel] Interaction updated:', interaction.id, updates);
          ctx.updateInteraction(interaction.id, updates);
          // 如果提交了，跳转到下一个
          if (updates.state === 'submitted' || updates.state === 'edited' || updates.state === 'cancelled') {
            nextTab(interaction.id);
          }
        }}
      />
    );
  };

  // 没有待处理的交互时不渲染
  if (pendingInteractions.length === 0) {
    return null;
  }

  // 图标映射
  const iconMap: Record<string, string> = {
    approval: '✅',
    selection: '📋',
    input: '📝',
    confirm: '❓',
  };

  // 状态标记映射
  const statusBadgeMap: Record<string, { text: string; color: string }> = {
    submitted: { text: '✓', color: 'bg-green-500' },
    edited: { text: '✏️', color: 'bg-yellow-500' },
    cancelled: { text: '✗', color: 'bg-red-500' },
  };

  return (
    <div className="border-2 border-blue-500 rounded-lg p-4 bg-white shadow-lg">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <h2 className="text-lg font-semibold text-gray-700">
          交互列表 ({pendingInteractions.length} 待处理 / {allSessionInteractions.length} 总计)
        </h2>
        <div className="flex items-center gap-3">
          {ctx.hasPendingInteractions && (
            <span className="text-sm text-gray-500">
              Alt+E 执行全部 | ←→ 切换
            </span>
          )}
          <button
            onClick={() => {
              // MODIFIED: 只清空当前会话的已完成交互
              const toKeep = allSessionInteractions.filter(i => i.state === 'idle' || i.state === 'active');
              const toRemove = ctx.getInteractions().filter(i =>
                i.metadata.chatId === currentChatId &&
                (i.state === 'submitted' || i.state === 'edited' || i.state === 'cancelled')
              );
              toRemove.forEach(i => ctx.removeInteraction(i.id));
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            清空已完成
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {allSessionInteractions.map((interaction) => {
          const isActive = interaction.id === activeTab;
          const icon = iconMap[interaction.content.type] || '📌';
          const title = interaction.metadata.title || interaction.content.type;
          const isProcessed = interaction.state === 'submitted' || interaction.state === 'edited' || interaction.state === 'cancelled';
          const statusBadge = isProcessed ? statusBadgeMap[interaction.state] : null;

          return (
            <button
              key={interaction.id}
              onClick={() => setActiveTab(interaction.id)}
              className={`
                relative px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap
                ${isActive
                  ? 'bg-blue-500 text-white'
                  : isProcessed
                    ? 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {icon} {title}
              {statusBadge && (
                <span className={`absolute -top-1 -right-1 ${statusBadge.color} text-white text-xs rounded-full w-4 h-4 flex items-center justify-center`}>
                  {statusBadge.text}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 当前激活的交互内容 */}
      <div className="space-y-4">
        {renderCurrentInteraction()}
      </div>
    </div>
  );
};
