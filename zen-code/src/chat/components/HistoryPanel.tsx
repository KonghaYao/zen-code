/**
 * History 面板 - 使用统一面板系统重构
 */

import React from 'react';
import { Spacer, Text } from 'ink';
import { UniversalPanel } from './Panel/UniversalPanel';
import { SelectItem } from './Panel/SelectItem';
import { PanelConfig, PanelContext } from './Panel/types';
import { useChat } from '@langgraph-js/sdk/react';

interface HistoryPanelProps {
    onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ onClose }) => {
    const { historyList, currentChatId, refreshHistoryList, toHistoryChat, createNewChat } = useChat();

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

    const panelConfig: PanelConfig = {
        id: 'history',
        title: '历史记录',
        icon: '📜',

        dataSource: async () => {
            await refreshHistoryList();
            return historyList;
        },

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

        renderItem: (thread: any, index, isSelected) => {
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

        isSelected: (thread: any) => thread.thread_id === currentChatId,

        onSelect: async (thread: any) => {
            if (thread.value === 'new_chat') {
                createNewChat();
            } else {
                toHistoryChat(thread);
            }
            onClose();
        },

        showCount: true,

        keyMap: {
            r: async (context: PanelContext<any>) => {
                await refreshHistoryList();
            },
        },
    };

    return <UniversalPanel config={panelConfig} onClose={onClose} />;
};

export default HistoryPanel;
