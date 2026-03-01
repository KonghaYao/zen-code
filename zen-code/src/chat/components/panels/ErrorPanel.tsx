/**
 * Error Panel - 错误面板
 * 展示错误和警告列表，支持删除和清空操作
 *
 * 使用 TanStack Query 管理错误列表状态
 */

import React, { useCallback, useRef } from 'react';
import { Box, Text, Spacer } from 'ink';
import { UniversalPanel, SelectItem, type PanelConfig } from 'ink-pro';
import { useErrors, useDeleteError, useClearErrors, type ErrorEntry } from '../../hooks/useErrors';

interface ErrorPanelProps {
    onClose: () => void;
}

// 级别配置
const LEVEL_CONFIG = {
    error: { emoji: '❌', color: 'red' as const, label: '错误' },
    warning: { emoji: '⚠️', color: 'yellow' as const, label: '警告' },
};

// 来源配置
const SOURCE_CONFIG: Record<string, { emoji: string; label: string }> = {
    Agent: { emoji: '🤖', label: 'Agent' },
    Tool: { emoji: '🔧', label: 'Tool' },
    Terminal: { emoji: '💻', label: 'Terminal' },
    System: { emoji: '⚙️', label: 'System' },
    Unknown: { emoji: '❓', label: 'Unknown' },
};

/**
 * 格式化时间戳为简短格式
 */
function formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // 1分钟内
    if (diff < 60 * 1000) {
        return '刚刚';
    }
    // 1小时内
    if (diff < 60 * 60 * 1000) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes}分钟前`;
    }
    // 今天
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    // 其他
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

/**
 * 截断消息以适应显示
 */
function truncateMessage(message: string, maxLength = 60): string {
    if (message.length <= maxLength) return message;
    return message.slice(0, maxLength - 3) + '...';
}

const ErrorPanel: React.FC<ErrorPanelProps> = ({ onClose }) => {
    // 使用 TanStack Query 获取错误列表
    const { data: allErrors = [] } = useErrors({ limit: 100 });
    const deleteError = useDeleteError();
    const clearErrors = useClearErrors();

    // 使用 ref 存储回调，避免依赖循环
    const deleteErrorRef = useRef(deleteError);
    const clearErrorsRef = useRef(clearErrors);

    React.useEffect(() => {
        deleteErrorRef.current = deleteError;
    }, [deleteError]);

    React.useEffect(() => {
        clearErrorsRef.current = clearErrors;
    }, [clearErrors]);

    // 删除单个错误
    const handleDeleteError = useCallback(async (error: ErrorEntry) => {
        await deleteErrorRef.current.mutateAsync(error.id);
    }, []);

    // 清空所有错误
    const handleClearAll = useCallback(async () => {
        await clearErrorsRef.current.mutateAsync();
    }, []);

    // 渲染函数
    const renderItem = useCallback((error: ErrorEntry, index: number, isSelected: boolean) => {
        const levelInfo = LEVEL_CONFIG[error.level];
        const sourceInfo = SOURCE_CONFIG[error.source] || SOURCE_CONFIG.Unknown;
        const timestamp = formatTimestamp(error.timestamp);
        const displayMessage = truncateMessage(error.message);

        return (
            <SelectItem key={`error-${error.id}`} isSelected={isSelected}>
                <Box flexDirection="column">
                    <Box>
                        <Text color={levelInfo.color}>
                            {levelInfo.emoji} {index + 1}. {displayMessage}
                        </Text>
                        <Spacer />
                        <Text dimColor>
                            {sourceInfo.emoji} {timestamp}
                        </Text>
                    </Box>
                    {error.file && (
                        <Box marginLeft={3}>
                            <Text dimColor color="gray">
                                📄 {error.file}
                                {error.line && `:${error.line}`}
                            </Text>
                        </Box>
                    )}
                </Box>
            </SelectItem>
        );
    }, []);

    // 状态信息渲染函数
    const statusInfo = useCallback((filteredErrors: ErrorEntry[]) => {
        const errorCount = filteredErrors.filter((e) => e.level === 'error').length;
        const warningCount = filteredErrors.filter((e) => e.level === 'warning').length;

        return (
            <Text color="gray">
                <Text color="red">❌ {errorCount}</Text>
                {' | '}
                <Text color="yellow">⚠️ {warningCount}</Text>
                {' | '}
                <Text dimColor>Backspace 删除 | Ctrl+L 清空全部</Text>
            </Text>
        );
    }, []);

    // 使用 useMemo 缓存 panelConfig
    const panelConfig: PanelConfig<ErrorEntry> = React.useMemo(
        () => ({
            id: 'errors',
            title: '错误日志',
            icon: '📋',
            dataSource: async () => allErrors,
            // 搜索配置
            searchable: true,
            searchFields: ['message', 'file'],
            searchPlaceholder: '搜索错误...',
            // 过滤配置
            filterable: true,
            filters: [
                {
                    id: 'all',
                    label: '全部',
                    predicate: () => true,
                },
                {
                    id: 'error',
                    label: '错误',
                    predicate: (error: ErrorEntry) => error.level === 'error',
                },
                {
                    id: 'warning',
                    label: '警告',
                    predicate: (error: ErrorEntry) => error.level === 'warning',
                },
                {
                    id: 'Agent',
                    label: 'Agent',
                    predicate: (error: ErrorEntry) => error.source === 'Agent',
                },
                {
                    id: 'Tool',
                    label: 'Tool',
                    predicate: (error: ErrorEntry) => error.source === 'Tool',
                },
                {
                    id: 'Terminal',
                    label: 'Terminal',
                    predicate: (error: ErrorEntry) => error.source === 'Terminal',
                },
                {
                    id: 'System',
                    label: 'System',
                    predicate: (error: ErrorEntry) => error.source === 'System',
                },
            ],
            defaultFilter: 'all',
            // 渲染配置
            itemHeight: 2, // 2行：消息 + 文件位置
            visibleCount: 15,
            renderItem: renderItem,
            onDelete: handleDeleteError,
            showCount: true,
            statusInfo: statusInfo,
            // 自定义快捷键：Ctrl+L 清空所有
            keyMap: {
                'ctrl+l': async () => {
                    await handleClearAll();
                },
            },
        }),
        [allErrors, renderItem, statusInfo, handleDeleteError, handleClearAll],
    );

    if (allErrors.length === 0) {
        return (
            <Box flexDirection="column" paddingX={2} paddingY={1}>
                <Box marginBottom={1}>
                    <Text bold color="cyan">
                        📋 错误日志
                    </Text>
                </Box>
                <Box>
                    <Text dimColor>暂无错误记录</Text>
                </Box>
                <Box marginTop={1}>
                    <Text dimColor>按 ESC 返回</Text>
                </Box>
            </Box>
        );
    }

    return <UniversalPanel config={panelConfig} onClose={onClose} />;
};

export default ErrorPanel;
