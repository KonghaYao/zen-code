import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { z } from 'zod';
import { LimitedOutput } from '../../components/LimitedOutput';

export const LoadMcpToolsSchema = z.object({});

export const load_mcp_tools = createUITool({
    name: 'load_mcp_tools',
    description: `加载并查询所有可用的 MCP 工具列表。

返回：
- tools: MCP 工具列表，每个工具包含 name, description, schema
- status: MCP 连接状态，包含 toolCount, servers 等

使用场景：
- 查询当前有哪些 MCP 工具可用
- 获取工具的参数格式
- 检查 MCP 连接状态

重要：工具列表是动态的，建议在需要时调用此命令获取最新信息。`,
    parameters: LoadMcpToolsSchema.shape,
    handler: ToolManager.waitForUIDone,
    render(tool) {
        const output = tool.output as string;

        let parsedData = null;
        try {
            parsedData = JSON.parse(output);
        } catch (e) {
            // Failed to parse, just show raw output
        }

        return (
            <Box flexDirection="column">
                <Box>
                    <Text color="blue" bold>
                        load_mcp_tools
                    </Text>
                </Box>

                {/* 显示状态信息 */}
                {parsedData?.status && (
                    <Box flexDirection="column" marginTop={1}>
                        <Text color="green">✓ MCP 已连接</Text>
                        {parsedData.status.servers && parsedData.status.servers.length > 0 && (
                            <Box marginLeft={2}>
                                <Text color="gray">服务器: {parsedData.status.servers.join(', ')}</Text>
                            </Box>
                        )}
                        {parsedData.status.toolCount !== undefined && (
                            <Box marginLeft={2}>
                                <Text color="gray">工具数量: {parsedData.status.toolCount}</Text>
                            </Box>
                        )}
                    </Box>
                )}

                {/* 显示工具列表 */}
                {parsedData?.tools && parsedData.tools.length > 0 && (
                    <Box flexDirection="column" marginTop={1}>
                        <Text color="gray" dimColor>
                            可用工具 ({parsedData.tools.length}):
                        </Text>
                        {parsedData.tools.slice(0, 5).map((t: any, index: number) => (
                            <Box key={index} marginLeft={2}>
                                <Text color="cyan">{t.name}</Text>
                                {t.description && (
                                    <Text color="gray" dimColor>
                                        {' '}
                                        - {t.description.slice(0, 50)}
                                        {t.description.length > 50 ? '...' : ''}
                                    </Text>
                                )}
                            </Box>
                        ))}
                        {parsedData.tools.length > 5 && (
                            <Box marginLeft={2}>
                                <Text color="gray" dimColor>
                                    ... 还有 {parsedData.tools.length - 5} 个工具
                                </Text>
                            </Box>
                        )}
                    </Box>
                )}

                {/* 显示输出结果 */}
                {output && <LimitedOutput content={output} maxLines={10} borderColor="gray" />}
            </Box>
        );
    },
});
