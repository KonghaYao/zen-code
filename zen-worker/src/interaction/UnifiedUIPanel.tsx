/**
 * 统一 UI 面板 (Web 版本)
 *
 * 显示所有待处理的用户交互，每个交互一个 Tab
 * 支持自动导航和批量执行
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useInteractionContext } from '@codegraph/union-client';
import { rendererRegistry } from './registry';
import { InteractionRendererWrapper } from './InteractionRendererWrapper';
import type { PanelInteraction } from './types';

/**
 * 统一 UI 面板组件
 */
export const UnifiedUIPanel: React.FC = () => {
  const ctx = useInteractionContext();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取所有待处理的交互
  const pendingInteractions = useMemo(
    () => ctx.getInteractions().filter(i => i.state === 'idle' || i.state === 'active'),
    [ctx.getInteractions(), refreshKey]
  );

  // 刷新交互列表
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    console.log('[UnifiedUIPanel] Refreshed interactions');
  }, []);

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

  // 批量执行所有已处理的交互
  const executeApproved = useCallback(async () => {
    await ctx.submitInteractions();
  }, [ctx]);

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

    const interaction = pendingInteractions.find(i => i.id === activeTab);
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

  return (
    <div className="border-2 border-blue-500 rounded-lg p-4 bg-white shadow-lg">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <h2 className="text-lg font-semibold text-gray-700">
          待处理交互 ({pendingInteractions.length})
        </h2>
        <div className="flex items-center gap-3">
          {ctx.hasPendingInteractions && (
            <span className="text-sm text-gray-500">
              Alt+E 执行全部 | ←→ 切换
            </span>
          )}
          <button
            onClick={handleRefresh}
            className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1"
            title="刷新交互列表"
          >
            🔄 刷新
          </button>
          <button
            onClick={ctx.clearCompleted}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            清空已完成
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {pendingInteractions.map((interaction) => {
          const isActive = interaction.id === activeTab;
          const icon = iconMap[interaction.content.type] || '📌';
          const title = interaction.metadata.title || interaction.content.type;

          return (
            <button
              key={interaction.id}
              onClick={() => setActiveTab(interaction.id)}
              className={`
                px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap
                ${isActive
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {icon} {title}
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
