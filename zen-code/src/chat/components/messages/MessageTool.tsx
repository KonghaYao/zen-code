import React, { JSX } from 'react';
import { Box, Spacer, Text } from 'ink';
import { getMessageContent, RenderMessage, ToolMessage } from '@langgraph-js/sdk';
import { useChat } from '@langgraph-js/sdk/react';
import { ToolRenderData } from '@langgraph-js/sdk';
import ErrorBoundary from '../common/ErrorBoundary';

const TOOL_COLOR_NAMES = ['yellow', 'magenta', 'blue'];

interface MessageToolProps {
    message: ToolMessage & RenderMessage;
    messageNumber: number;
}

const getToolColor = (tool_name: string): string => {
    let hash = 0;
    for (let i = 0; i < tool_name.length; i++) {
        hash = tool_name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % TOOL_COLOR_NAMES.length);
    return TOOL_COLOR_NAMES[index];
};

const getStatusEmoji = (status?: string): string => {
    const statusMap: Record<string, string> = {
        success: '✓',
        completed: '✓',
        ok: '✓',
        error: '✗',
        failed: '✗',
        pending: '⏳',
        in_progress: '⏳',
        running: '⏳',
        cancelled: '⏹',
    };
    return statusMap[status as any] || '⏳';
};

const truncateContentForDisplay = (content: string, maxLines: number = 4, maxLineLength: number = 100): string => {
    const lines = content.split('\n');
    const truncateLongLine = (line: string): string => {
        if (line.length <= maxLineLength) return line;
        return line.substring(0, maxLineLength) + `... (${line.length - maxLineLength} more chars)`;
    };

    if (lines.length <= maxLines) {
        return lines.map(truncateLongLine).join('\n');
    }

    const firstTwo = lines.slice(0, 2).map(truncateLongLine);
    const lastTwo = lines.slice(lines.length - 3).map(truncateLongLine);
    return [...firstTwo, `... and more ${lines.length - 5} lines`, ...lastTwo].join('\n');
};

/** 使用自制的 YAML 高亮，缩减包大小 */
export const InputPreviewer = ({ content }: { content: any }) => {
    // Ink 内置颜色的递归渲染 (GitHub Dark 风格)
    const renderHighlightedContent = (
        data: any,
        indent: number = 0,
        depth: number = 0,
    ): JSX.Element | JSX.Element[] => {
        const indentChar = '  ';
        const currentIndent = indentChar.repeat(indent);

        if (depth >= 3) {
            return <Text dimColor>{'{...} (truncated)'}</Text>;
        }

        if (data === null) {
            return <Text color="gray">null</Text>;
        }

        if (typeof data !== 'object') {
            const stringified = JSON.stringify(data);
            if (typeof data === 'string' && stringified.length > 102) {
                const truncated = stringified.substring(1, 101);
                return (
                    <Text>
                        <Text color="cyan">"{truncated}..."</Text>{' '}
                        <Text dimColor>(truncated, {stringified.length - 2} chars)</Text>
                    </Text>
                );
            }

            // Ink 内置颜色类型着色
            if (typeof data === 'string') {
                return <Text color="cyan">{stringified}</Text>; // 青色用于字符串
            } else if (typeof data === 'number') {
                return <Text color="yellow">{data}</Text>; // 黄色用于数字
            } else if (typeof data === 'boolean') {
                return <Text color="magenta">{data.toString()}</Text>; // 洋红色用于布尔值
            } else {
                return <Text>{stringified}</Text>;
            }
        }

        if (Array.isArray(data)) {
            if (data.length === 0) {
                return <Text color="gray">[]</Text>;
            }

            const maxLength = 5;
            return (
                <>
                    {'\n'}
                    {data.slice(0, maxLength).map((item, index) => (
                        <Text>
                            <Text>{currentIndent}</Text>
                            <Text color="green">- </Text> {/* 绿色用于数组标记 */}
                            {renderHighlightedContent(item, indent + 1, depth + 1)}
                            {index < Math.min(data.length, maxLength) - 1 ? '\n' : ''}
                        </Text>
                    ))}
                    {data.length > maxLength && (
                        <Text>
                            {'\n'}
                            <Text>{currentIndent}</Text>
                            <Text dimColor>... ({data.length - maxLength} more)</Text>
                        </Text>
                    )}
                </>
            );
        }
        // Object rendering
        const keys = Object.keys(data);
        if (keys.length === 0) {
            return <Text color="gray">{}</Text>;
        }

        const maxLength = 5;
        return (
            <>
                {keys.slice(0, maxLength).map((key, index) => (
                    <Text>
                        <Text>{currentIndent}</Text>
                        <Text color="blue">{key}</Text> {/* 蓝色用于键 */}
                        <Text color="gray">: </Text> {/* 灰色用于冒号 */}
                        {renderHighlightedContent(data[key], indent + 1, depth + 1)}
                        {index < Math.min(keys.length, maxLength) - 1 ? '\n' : ''}
                    </Text>
                ))}
                {keys.length > maxLength && (
                    <Text>
                        {'\n'}
                        <Text>{currentIndent}</Text>
                        <Text dimColor>... ({keys.length - maxLength} more)</Text>
                    </Text>
                )}
            </>
        );
    };

    return <Text>{renderHighlightedContent(content)}</Text>;
};

const MessageTool: React.FC<MessageToolProps> = ({ message, messageNumber }) => {
    const { getToolUIRender, client } = useChat();
    const tool = new ToolRenderData<
        {
            title?: string;
            label?: string;
            description?: string;
        },
        any
    >(message, client!);
    const inputRepaired = tool.getInputRepaired();
    const label = inputRepaired?.title
        ? `: ${inputRepaired.title}`
        : inputRepaired?.description
          ? `: ${inputRepaired.description}`
          : '';
    const render = message.name ? getToolUIRender(message.name!) : null;
    let borderColor = getToolColor(message.name || '');
    borderColor = message.status === 'error' ? 'red' : 'yellow';

    // 记录工具错误到错误日志
    React.useEffect(() => {
        if (message.status === 'error' && message.name) {
            import('../../services/ErrorInterceptor')
                .then(({ logToolError, logTerminalError, logAgentError }) => {
                    const content = getMessageContent(message.content);
                    const errorMsg = typeof content === 'string' ? content : JSON.stringify(content);

                    // 根据工具名称确定记录方法
                    if (message.name === 'terminal') {
                        const command = (inputRepaired as any)?.command || 'unknown';
                        logTerminalError(command, errorMsg);
                    } else if (message.name?.startsWith('Agent:')) {
                        logAgentError(message.name, errorMsg);
                    } else {
                        logToolError(message.name!, errorMsg);
                    }
                })
                .catch((err) => {
                    // 忽略错误记录失败的错误，避免循环
                    console.warn('Failed to log error:', err);
                });
        }
    }, [message.status, message.name, message.content, (inputRepaired as any)?.command]);

    return (
        <ErrorBoundary>
            <Box flexDirection="column">
                <Box>
                    <Text color={borderColor}>
                        {messageNumber} {message.name}
                        <Text color="gray">{label}</Text>
                    </Text>
                    <Text> {getStatusEmoji(message?.status)}</Text>
                </Box>

                {render ? (
                    <Box>
                        <Text color="gray">└─ </Text>
                        <Box flexDirection="column">{render(message as RenderMessage) as JSX.Element}</Box>
                    </Box>
                ) : (
                    <Box flexDirection="column" paddingTop={0}>
                        {/* 入参 */}
                        <Box>
                            <Text color="gray">└─ </Text>
                            <InputPreviewer content={tool.getInputRepaired()} />
                        </Box>
                        <Box paddingTop={0} paddingBottom={0}>
                            <Text color="gray">└─ </Text>
                            <Text dimColor italic>
                                {truncateContentForDisplay(getMessageContent(message.content))}
                            </Text>
                        </Box>
                    </Box>
                )}
                {message.sub_messages?.length ? (
                    <Box>
                        <Text color="gray">└─ </Text>
                        <Text color={borderColor} dimColor>
                            (hidden {message.sub_messages.length} subagent messages)
                        </Text>
                    </Box>
                ) : null}
            </Box>
        </ErrorBoundary>
    );
};

export default MessageTool;
