/**
 * History 面板 - 使用统一面板系统重构
 */

import React, { useCallback, useMemo } from 'react';
import { Spacer, Text } from 'ink';
import { UniversalPanel } from 'ink-pro';
import { SelectItem } from 'ink-pro';
import { PanelConfig, PanelContext } from 'ink-pro';
import { useChat } from '@langgraph-js/sdk/react';

interface HistoryPanelProps {
    onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ onClose }) => {
    const { historyList, currentChatId, refreshHistoryList, toHistoryChat, createNewChat } = useChat();

    // 格式化时间辅助函数 - 提取到组件外部避免重复创建
    const formatTime = (date: Date) => date.toLocaleTimeString();

    // 获取状态信息的辅助函数 - 提取到组件外部
    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'idle':
                return { emoji: '🟢', color: 'green' as const, text: '空闲' };
            case 'busy':
                return { emoji: '🟡', color: 'yellow' as const, text: '忙碌' };
            case 'interrupted':
                return { emoji: '🟠', color: 'orange' as const, text: '中断' };
            case 'error':
                return { emoji: '🔴', color: 'red' as const, text: '错误' };
            default:
                return { emoji: '⚪', color: 'gray' as const, text: status };
        }
    };

    // 修复：使用 useCallback 保持函数引用稳定
    const dataSource = useCallback(async () => {
        await refreshHistoryList();
        return historyList;
    }, [refreshHistoryList, historyList]);

    // 修复：使用 useCallback 保持 renderItem 引用稳定
    const renderItem = useCallback(
        (thread: any, index: number, isSelected: boolean) => {
            const statusInfo = getStatusInfo(thread.status);
            const isCurrent = thread.thread_id === currentChatId;
            const updatedTime = formatTime(new Date(thread.updated_at));

            return (
                <SelectItem key={thread.thread_id} isSelected={isSelected} isCurrent={isCurrent}>
                    <Text bold color={statusInfo.color}>
                        {index}. {thread.thread_id.substring(0, 8)}...
                    </Text>
                    <Spacer></Spacer>
                    <Text dimColor>{updatedTime}</Text>
                </SelectItem>
            );
        },
        [currentChatId],
    );

    // 修复：使用 useCallback 保持 isSelected 引用稳定
    const isSelected = useCallback(
        (thread: any) => {
            return thread.thread_id === currentChatId;
        },
        [currentChatId],
    );

    // 修复：使用 useCallback 保持 onSelect 引用稳定
    const handleSelect = useCallback(
        async (thread: any) => {
            if (thread.value === 'new_chat') {
                createNewChat();
            } else {
                toHistoryChat(thread);
            }
            onClose();
        },
        [createNewChat, toHistoryChat, onClose],
    );

    // 修复：使用 useCallback 保持 statusInfo 引用稳定
    const statusInfoCallback = useCallback(
        (items: any[]) => {
            const current = items.find((t: any) => t.thread_id === currentChatId);
            return current ? (
                <Text color="gray" dimColor>
                    当前: <Text color="green">{current.thread_id.substring(0, 8)}</Text>
                </Text>
            ) : null;
        },
        [currentChatId],
    );

    // 修复：使用 useCallback 保持 keyMap 引用稳定
    const keyMap = useMemo(
        () => ({
            r: async (context: PanelContext<any>) => {
                await refreshHistoryList();
            },
        }),
        [refreshHistoryList],
    );

    // 修复：使用 useMemo 缓存 panelConfig
    const panelConfig: PanelConfig = useMemo(
        () => ({
            id: 'history',
            title: '历史记录',
            icon: '📜',

            dataSource: dataSource,

            // 搜索配置
            searchable: true,
            searchFields: ['thread_id'],
            searchPlaceholder: '搜索对话 ID...',

            // 过滤配置
            filterable: true,
            filters: [
                {
                    id: 'idle',
                    label: '空闲',
                    predicate: (thread: any) => thread.status === 'idle',
                },
                {
                    id: 'busy',
                    label: '忙碌',
                    predicate: (thread: any) => thread.status === 'busy',
                },
                {
                    id: 'error',
                    label: '错误',
                    predicate: (thread: any) => thread.status === 'error',
                },
            ],
            defaultFilter: 'all',

            // 渲染配置
            itemHeight: 1,
            visibleCount: 10,

            renderItem: renderItem,

            isSelected: isSelected,

            onSelect: handleSelect,

            showCount: true,

            statusInfo: statusInfoCallback,

            keyMap: keyMap,
        }),
        [dataSource, renderItem, isSelected, handleSelect, statusInfoCallback, keyMap],
    );

    return <UniversalPanel config={panelConfig} onClose={onClose} />;
};

export default HistoryPanel;
