/**
 * 统一 UI 面板组件
 *
 * 每个交互一个 Tab，永远显示所有 interactions
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Box, Text, useFocusManager } from 'ink';
import { useTimeout, useEventCallback } from 'usehooks-ts';
import { Tabs, TabItem } from '../components/input/Tabs';
import { useInteractionContext } from './context';
import { InteractionRendererWrapper } from './InteractionRendererWrapper';
import { rendererRegistry } from './registry';
import { truncateByContext } from './textUtils';

/**
 * 截断 tab 标题 - 确保不超长
 */
const truncateTabTitle = (title: string): string => {
    return truncateByContext(title, 'fullTitle');
};

/**
 * 统一 UI 面板组件
 */
export const UnifiedUIPanel: React.FC = () => {
    const ctx = useInteractionContext();
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const { focusNext, focus } = useFocusManager();

    // 获取所有交互
    const allInteractions = useMemo(() => {
        return ctx.getInteractions();
    }, [ctx.getInteractions()]);

    // 初始化 activeTab
    useEffect(() => {
        if (allInteractions.length > 0 && !activeTab) {
            setActiveTab(allInteractions[0].id);
        }
    }, [allInteractions, activeTab]);

    // 构建 Tab items（每个交互一个 tab，包括已完成的）
    const tabItems: TabItem[] = useMemo(() => {
        return allInteractions.map((interaction) => {
            // 根据状态添加不同的标记
            const statusIcon =
                {
                    idle: '🔄',
                    active: '🔄',
                    submitted: '✅',
                    edited: '⛔',
                    cancelled: '🚫',
                }[interaction.state] || '';

            // 截断标题以防止超长
            const truncatedTitle = truncateTabTitle(interaction.metadata.title || interaction.content.type);

            return {
                id: interaction.id,
                label: `${statusIcon} ${truncatedTitle}`,
                content: null, // 不在这里渲染内容
            };
        });
    }, [allInteractions]);

    // Tab 切换处理
    const handleTabChange = useCallback((index: number, item: TabItem) => {
        setActiveTab(item.id);
    }, []);

    // 跳转到下一个交互
    const nextTab = useCallback(
        (currentId: string) => {
            // 检查是否所有交互都已完成
            const allFinished = allInteractions.every(
                (i) => i.state === 'submitted' || i.state === 'edited' || i.state === 'cancelled',
            );

            if (allFinished) {
                // 所有交互都完成了，聚焦到 global-input
                focus('global-input');
                return;
            }

            // 否则跳转到下一个未完成的交互
            const currentIndex = allInteractions.findIndex((i) => i.id === currentId);
            const nextIndex = (currentIndex + 1) % allInteractions.length;
            setActiveTab(allInteractions[nextIndex].id);
        },
        [allInteractions, focus],
    );

    // 当 activeTab 变化时，延迟调用 focusNext
    const handleFocusNext = useEventCallback(() => {
        focusNext();
    });

    useTimeout(handleFocusNext, activeTab ? 100 : null);

    // 渲染当前激活的交互
    const renderCurrentInteraction = () => {
        if (!activeTab) return null;

        const interaction = allInteractions.find((i) => i.id === activeTab);
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
                key={interaction.id}
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

    // 没有任何交互时不渲染
    if (allInteractions.length === 0) {
        return null;
    }

    return (
        <Box flexDirection="column" width="100%">
            {/* 标题栏 */}
            <Box justifyContent="space-between" paddingX={1} marginBottom={1}>
                <Text color="cyan" bold>
                    Interactions ({allInteractions.length})
                </Text>
            </Box>

            {/* Tabs */}
            <Box paddingX={1} marginBottom={1}>
                <Tabs
                    key={activeTab}
                    items={tabItems}
                    defaultIndex={tabItems.findIndex((t) => t.id === activeTab)}
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
