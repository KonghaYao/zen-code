import React from 'react';
import { Box, Text } from 'ink';
import { useChat } from '@langgraph-js/sdk/react';
import type { RenderMessage } from '@langgraph-js/sdk';

/**
 * MCP 状态面板
 * 显示 MCP 工具数量
 *
 * 注意：MCPManager 已移除，现在通过后端 MCPMiddleware 提供工具。
 * 前端通过调用 load_mcp_tools 工具获取 MCP 状态。
 * 此面板仅显示从 chat 返回的消息中的 MCP 工具数量。
 */
export const MCPStatusPanel: React.FC = () => {
    const { renderMessages } = useChat();

    // 从消息中查找最后一个 load_mcp_tools 的返回结果
    const mcpStatus = React.useMemo(() => {
        if (!renderMessages) return null;

        for (let i = renderMessages.length - 1; i >= 0; i--) {
            const msg = renderMessages[i] as any;
            if (msg.role === 'assistant' && msg.content) {
                try {
                    const content = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }];
                    const textContent = content.find((c: any) => c.type === 'text')?.text || '';

                    if (textContent.includes('load_mcp_tools')) {
                        try {
                            const parsed = JSON.parse(textContent);
                            if (parsed.status && parsed.status.toolCount !== undefined) {
                                return parsed.status;
                            }
                        } catch (e) {
                            // 不是 JSON，忽略
                        }
                    }
                } catch (e) {
                    // 解析失败，忽略
                }
            }
        }
        return null;
    }, [renderMessages]);

    if (!mcpStatus || mcpStatus.toolCount === 0) {
        return null;
    }

    return (
        <Box paddingX={1}>
            <Text color="green" bold>
                MCP
            </Text>
            <Text color="cyan"> {mcpStatus.toolCount}</Text>
        </Box>
    );
};
