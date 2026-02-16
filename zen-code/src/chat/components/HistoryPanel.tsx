/**
 * History 面板 - 使用统一面板系统重构 + TanStack Query
 *
 * 使用 TanStack Query 管理历史记录状态
 * 自动设置 metadata 过滤器为当前工作目录
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { Box, Text } from 'ink';
import { UniversalPanel } from 'ink-pro';
import { PanelConfig } from 'ink-pro';
import { useChat } from '@langgraph-js/sdk/react';
import { useHistory } from '../hooks/useHistory';
import { metadataOfChat } from '../../utils/metadata';

interface HistoryPanelProps {
    onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ onClose }) => {
    const { currentChatId, toHistoryChat, createNewChat, refreshHistoryList, setHistoryFilter, historyFilter } =
        useChat();
    useEffect(() => {
        const filter = { metadata: { path: process.cwd() } };
        setHistoryFilter(filter);
        // 设置 filter 后立即刷新历史记录
        refreshHistoryList();
    }, [setHistoryFilter, refreshHistoryList]);

    // 使用 TanStack Query 获取历史记录，historyFilter 已在 hook 内部从 useChat 读取
    const { data: historyList = [] } = useHistory();

    // 存储 refreshHistoryList 引用用于 keyMap
    const refreshHistoryListRef = useRef(refreshHistoryList);
    React.useEffect(() => {
        refreshHistoryListRef.current = refreshHistoryList;
    }, [refreshHistoryList]);

    // 格式化时间辅助函数
    const formatTime = (date: Date) => date.toLocaleTimeString();

    // 获取状态信息的辅助函数
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

    // dataSource 返回当前的 historyList 值
    const dataSource = useCallback(async () => {
        return historyList;
    }, [historyList]);

    // renderItem - 使用 useCallback 保持引用稳定
    const renderItem = useCallback(
        (thread: any, index: number, isSelected: boolean) => {
            const statusInfo = getStatusInfo(thread.status);
            const isCurrent = thread.thread_id === currentChatId;
            const updatedTime = formatTime(new Date(thread.updated_at));

            return (
                <Box key={thread.thread_id}>
                    <Text bold color={isSelected ? 'cyan' : statusInfo.color}>
                        {index + 1}. {thread.thread_id.substring(0, 8)}...
                    </Text>
                    <Box flexGrow={1} />
                    <Text dimColor>{updatedTime}</Text>
                </Box>
            );
        },
        [currentChatId],
    );

    // isSelected - 使用 useCallback 保持引用稳定
    const isSelected = useCallback(
        (thread: any) => {
            return thread.thread_id === currentChatId;
        },
        [currentChatId],
    );

    // onSelect - 使用 useCallback 保持引用稳定
    const handleSelect = useCallback(
        async (thread: any) => {
            if (thread.value === 'new_chat') {
                createNewChat(metadataOfChat);
            } else {
                toHistoryChat(thread);
            }
            onClose();
        },
        [createNewChat, toHistoryChat, onClose],
    );

    // statusInfo - 使用 useCallback 保持引用稳定
    const statusInfoCallback = useCallback(
        (items: any[]) => {
            const current = items.find((t: any) => t.thread_id === currentChatId);
            return current ? (
                <Text color="gray" dimColor>
                    当前: <Text color="green">{current.thread_id.substring(0, 8)}</Text>
                    <Text>{historyFilter.metadata?.path}</Text>
                </Text>
            ) : null;
        },
        [currentChatId],
    );

    // keyMap - 使用 useMemo 缓存
    const keyMap = useMemo(
        () => ({
            r: async () => {
                await refreshHistoryListRef.current();
            },
        }),
        [],
    );

    // panelConfig - 使用 useMemo 缓存
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

            // 过滤配置 - 暂不实现
            filterable: false,
            filters: [],
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
