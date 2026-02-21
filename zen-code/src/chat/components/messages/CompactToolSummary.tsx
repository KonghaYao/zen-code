import React, { memo, useMemo } from 'react';
import { Box, Text } from 'ink';
import { RenderMessage } from '@langgraph-js/sdk';
import { getColor } from '@codegraph/union-client';

interface CompactToolSummaryProps {
    toolMessages: RenderMessage[];
    messageNumber: number;
}

/**
 * CompactToolSummary - 工具调用摘要组件
 *
 * 性能优化：
 * 1. 使用 memo 避免不必要的重新渲染
 * 2. 使用 useMemo 缓存统计计算结果
 * 3. 使用 for...of 替代 reduce 减少函数调用开销
 */
export const CompactToolSummary: React.FC<CompactToolSummaryProps> = memo(
    function CompactToolSummary({ toolMessages, messageNumber }) {
        // 统计工具状态 - 使用 useMemo 缓存计算结果
        const { successfulCount, errorCount, toolEntries } = useMemo(() => {
            // 统计工具状态
            const stats: Record<string, number> = {};
            const toolCounts: Record<string, number> = {};

            // 使用 for...of 替代 reduce，减少函数调用开销
            for (const msg of toolMessages) {
                const msgAny = msg as any;
                // 统计状态
                const status = msgAny.status || 'unknown';
                stats[status] = (stats[status] || 0) + 1;
                // 统计工具名称
                const toolName = msgAny.name || 'unknown';
                toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
            }

            // 按调用次数排序
            const entries = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]);

            return {
                successfulCount: stats.success || 0,
                errorCount: stats.error || 0,
                toolEntries: entries,
            };
        }, [toolMessages]);

        return (
            <Box flexDirection="column" paddingY={1}>
                {/* 第一行：成功/失败状态 */}
                <Box gap={1}>
                    <Text color={getColor('indigo')} bold>
                        ⚙️
                    </Text>
                    {successfulCount > 0 && (
                        <Text color="green" bold>
                            {' '}
                            {successfulCount}
                        </Text>
                    )}
                    {errorCount > 0 && (
                        <Text color="red" bold>
                            {' '}
                            {errorCount}
                        </Text>
                    )}
                    <Text color={getColor('indigo')} bold>
                        {' '}
                        tools
                    </Text>
                </Box>

                {/* 第二行：工具名称和次数 */}
                <Box paddingLeft={2}>
                    {toolEntries.map(([name, count], index) => (
                        <React.Fragment key={`tool-entry-${index}-${name}`}>
                            {index > 0 && <Text dimColor>, </Text>}
                            <Text dimColor>
                                {name}({count})
                            </Text>
                        </React.Fragment>
                    ))}
                </Box>
            </Box>
        );
    },
    // 自定义比较函数：只有当 toolMessages 数量或 messageNumber 变化时才重新渲染
    (prevProps, nextProps) => {
        return (
            prevProps.messageNumber === nextProps.messageNumber &&
            prevProps.toolMessages.length === nextProps.toolMessages.length &&
            // 检查工具消息的状态是否变化
            prevProps.toolMessages.every((msg, i) => {
                const nextMsg = nextProps.toolMessages[i];
                const msgAny = msg as any;
                const nextMsgAny = nextMsg as any;
                return msgAny.status === nextMsgAny.status && msgAny.name === nextMsgAny.name;
            })
        );
    },
);

export default CompactToolSummary;
