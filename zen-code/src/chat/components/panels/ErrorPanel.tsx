/**
 * Error Panel - 错误面板
 * 显示错误存储文件的位置和基本信息
 */

import React, { useCallback } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink-pro';
import { useErrors, useDeleteError, useClearErrors, type ErrorEntry } from '../../hooks/useErrors';
import { join } from 'node:path';

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
function truncateMessage(message: string, maxLength = 80): string {
    if (message.length <= maxLength) return message;
    return message.slice(0, maxLength - 3) + '...';
}

/**
 * 错误面板组件
 */
const ErrorPanel: React.FC<ErrorPanelProps> = ({ onClose }) => {
    // 使用 TanStack Query 获取错误列表
    const { data: errors = [], isLoading } = useErrors({ limit: 50 });
    const deleteError = useDeleteError();
    const clearErrors = useClearErrors();

    // 清空所有错误
    const handleClearAll = useCallback(async () => {
        await clearErrors.mutateAsync();
    }, [clearErrors]);

    // 键盘事件处理
    useInput(
        (input, key) => {
            // ESC 关闭面板
            if (key.escape) {
                onClose();
            }
            // Ctrl+L 清空所有错误
            if (key.ctrl && input === 'l') {
                handleClearAll();
            }
        },
        { isActive: true },
    );

    // 错误存储文件路径
    const errorFilePath = join(process.cwd(), '.zen-code', 'errors.json');

    // 计算统计信息
    const stats = React.useMemo(() => {
        const errorCount = errors.filter((e) => e.level === 'error').length;
        const warningCount = errors.filter((e) => e.level === 'warning').length;
        return { errorCount, warningCount };
    }, [errors]);

    return (
        <Box flexDirection="column" paddingX={1} paddingY={1}>
            {/* 标题栏 */}
            <Box marginBottom={1}>
                <Text bold color="cyan">
                    📋 错误日志
                </Text>
                <Box marginLeft={2}>
                    <Text color="red">❌ {stats.errorCount}</Text>
                    <Text> </Text>
                    <Text color="yellow">⚠️ {stats.warningCount}</Text>
                    <Text dimColor>| Total: {errors.length}</Text>
                </Box>
            </Box>

            {/* 加载状态 */}
            {isLoading && (
                <Box marginBottom={1}>
                    <Text dimColor>加载中...</Text>
                </Box>
            )}

            {/* 错误列表 */}
            {!isLoading && errors.length > 0 && (
                <Box flexDirection="column">
                    {errors.slice(0, 20).map((error, index) => {
                        const levelInfo = LEVEL_CONFIG[error.level];
                        const sourceInfo = SOURCE_CONFIG[error.source] || SOURCE_CONFIG.Unknown;
                        const timestamp = formatTimestamp(error.timestamp);
                        const displayMessage = truncateMessage(error.message);

                        return (
                            <Box key={error.id} flexDirection="column" marginBottom={1}>
                                <Box>
                                    <Text color={levelInfo.color}>
                                        {levelInfo.emoji} {displayMessage}
                                    </Text>
                                </Box>
                                <Box marginLeft={2}>
                                    <Text dimColor>
                                        {sourceInfo.emoji} {sourceInfo.label} | {timestamp}
                                    </Text>
                                    {error.file && (
                                        <Text dimColor color="gray">
                                            {' '}
                                            | 📄 {error.file}
                                            {error.line && `:${error.line}`}
                                        </Text>
                                    )}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            )}

            {/* 空状态 */}
            {!isLoading && errors.length === 0 && (
                <Box flexDirection="column" marginBottom={1}>
                    <Box marginBottom={1}>
                        <Text dimColor>暂无错误记录</Text>
                    </Box>
                    <Box marginBottom={1}>
                        <Text dimColor>错误将自动收集到：</Text>
                    </Box>
                    <Box marginBottom={1}>
                        <Text color="yellow">{errorFilePath}</Text>
                    </Box>
                </Box>
            )}

            {/* 操作提示 */}
            <Box marginTop={1}>
                <Text dimColor>按 ESC 返回 | Ctrl+L 清空所有</Text>
            </Box>
        </Box>
    );
};

export default ErrorPanel;
