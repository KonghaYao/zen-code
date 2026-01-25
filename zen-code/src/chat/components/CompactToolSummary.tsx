import React from 'react';
import { Box, Text } from 'ink';
import { RenderMessage } from '@langgraph-js/sdk';
import { getColor } from '@codegraph/union-client';

interface CompactToolSummaryProps {
    toolMessages: RenderMessage[];
    messageNumber: number;
}

export const CompactToolSummary: React.FC<CompactToolSummaryProps> = ({
    toolMessages,
    messageNumber,
}) => {
    // 统计工具状态
    const stats = toolMessages.reduce((acc, msg) => {
        /** @ts-ignore */
        const status = msg.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const successfulCount = stats.success || 0;
    const errorCount = stats.error || 0;

    // 统计每种工具的调用次数
    const toolCounts = toolMessages.reduce((acc, msg) => {
        /** @ts-ignore */
        const toolName = msg.name || 'unknown';
        acc[toolName] = (acc[toolName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // 按调用次数排序
    const toolEntries = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]);

    // 颜色池
    const colors = ['cyan', 'green', 'yellow', 'blue', 'magenta', 'red'];

    return (
        <Box
            key={`tool-summary-${messageNumber}`}
            flexDirection="column"
            paddingY={1}
        >
            {/* 第一行：成功/失败状态 */}
            <Box gap={1}>
                <Text color={getColor('indigo')} bold>
                    ⚙️
                </Text>
                {successfulCount > 0 && (
                    <Text color="green" bold>
                        {' '}{successfulCount}
                    </Text>
                )}
                {errorCount > 0 && (
                    <Text color="red" bold>
                        {' '}{errorCount}
                    </Text>
                )}
                <Text color={getColor('indigo')} bold>
                    {' '}tools
                </Text>
            </Box>

            {/* 第二行：工具名称和次数 */}
            <Box paddingLeft={2}>
                {toolEntries.map(([name, count], index) => (
                    <React.Fragment key={name}>
                        {index > 0 && <Text dimColor>, </Text>}
                        <Text color={getColor(colors[index % colors.length] as any)} dimColor>
                            {name}({count})
                        </Text>
                    </React.Fragment>
                ))}
            </Box>

        </Box>
    );
};

export default CompactToolSummary;
