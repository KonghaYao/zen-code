/**
 * 统一 UI 面板组件
 *
 * 每个交互一个 Tab，执行完后自动隐藏
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Tabs, TabItem } from '../components/input/Tabs';
import { useInteractionContext } from './context';
import { InteractionRendererWrapper } from './InteractionRendererWrapper';
import { rendererRegistry } from './registry';
import type { AnyPanelInteraction } from './panel';
import useInput from '../../utils/use-input';

/**
 * 统一 UI 面板组件
 */
export const UnifiedUIPanel: React.FC = () => {
  const ctx = useInteractionContext();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // 获取所有待处理的交互（idle 或 active 状态）
  const pendingInteractions = useMemo(() => {
    return ctx.getInteractions().filter(i => i.state === 'idle' || i.state === 'active');
  }, [ctx.getInteractions()]);

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

  // 构建 Tab items（每个交互一个 tab）
  const tabItems: TabItem[] = useMemo(() => {
    return pendingInteractions.map((interaction) => {
      const icon = {
        approval: '✅',
        selection: '📋',
        input: '📝',
        confirm: '❓',
      }[interaction.content.type] || '📌';

      return {
        id: interaction.id,
        label: `${icon} ${interaction.metadata.title || interaction.content.type}`,
        content: null, // 不在这里渲染内容
      };
    });
  }, [pendingInteractions]);

  // Tab 切换处理
  const handleTabChange = useCallback((index: number, item: TabItem) => {
    setActiveTab(item.id);
  }, []);

  // 批量执行所有已处理的交互
  const executeApproved = useCallback(async () => {
    await ctx.submitInteractions();
  }, [ctx]);

  // 快捷键: Alt+E 执行所有已处理的交互
  useInput(
    (input, key) => {
      if (key.alt && input === 'e') {
        executeApproved();
      }
    },
    { isActive: true }
  );

  // 跳转到下一个待处理的交互
  const nextTab = useCallback((currentId: string) => {
    const currentIndex = pendingInteractions.findIndex(i => i.id === currentId);
    const nextPending = pendingInteractions.slice(currentIndex + 1).find(i => i.state === 'idle');

    if (nextPending) {
      setActiveTab(nextPending.id);
    } else {
      // 如果后面没有，从前面找
      const firstPending = pendingInteractions.find(i => i.state === 'idle');
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
        <Box paddingX={1}>
          <Text color="red">Unknown renderer: {interaction.content.type}</Text>
        </Box>
      );
    }

    return (
      <InteractionRendererWrapper
        interaction={interaction}
        renderer={renderer}
        onChange={(updates) => {
          ctx.updateInteraction(interaction.id, updates as any);
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

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* 标题栏 */}
      <Box justifyContent="space-between" paddingX={1} marginBottom={1}>
        <Text color="cyan" bold>Interactions</Text>
        {ctx.hasPendingInteractions && (
          <Text color="yellow">Alt+E to submit all | ←→ to switch</Text>
        )}
      </Box>

      {/* Tabs */}
      <Box paddingX={1} marginBottom={1}>
        <Tabs
          key={activeTab}
          items={tabItems}
          defaultIndex={tabItems.findIndex(t => t.id === activeTab)}
          onChange={handleTabChange}
          autoFocus={true}
          variant="line"
        />
      </Box>

      {/* 当前激活的交互内容 */}
      {renderCurrentInteraction()}
    </Box>
  );
};
