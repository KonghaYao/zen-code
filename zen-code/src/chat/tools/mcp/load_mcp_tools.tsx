import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { z } from 'zod';
import { LimitedOutput } from '../../components/common/LimitedOutput';

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

        // 防御：output 可能非字符串
        const outputStr = typeof output === 'string' ? output : '';

        let parsedData: {
            status?: { servers?: unknown[]; toolCount?: unknown };
            tools?: unknown[];
        } | null = null;
        try {
            parsedData = JSON.parse(outputStr);
        } catch (e) {
            // Failed to parse, just show raw output
        }

        // 防御：tools / servers 可能非数组，toolCount 可能非数字
        const tools = Array.isArray(parsedData?.tools) ? (parsedData!.tools as any[]) : [];
        const servers = Array.isArray(parsedData?.status?.servers)
            ? ((parsedData!.status!.servers as unknown[]).filter((s) => typeof s === 'string') as string[])
            : [];
        const toolCount = typeof parsedData?.status?.toolCount === 'number' ? parsedData!.status!.toolCount : undefined;

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
                        {servers.length > 0 && (
                            <Box marginLeft={2}>
                                <Text color="gray">服务器: {servers.join(', ')}</Text>
                            </Box>
                        )}
                        {toolCount !== undefined && (
                            <Box marginLeft={2}>
                                <Text color="gray">工具数量: {toolCount}</Text>
                            </Box>
                        )}
                    </Box>
                )}

                {/* 显示工具列表 */}
                {tools.length > 0 && (
                    <Box flexDirection="column" marginTop={1}>
                        <Text color="gray" dimColor>
                            可用工具 ({tools.length}):
                        </Text>
                        {tools.slice(0, 5).map((t: any, index: number) => {
                            // 防御：t.name / t.description 可能非字符串
                            const name = typeof t?.name === 'string' ? t.name : String(t?.name ?? '');
                            const desc = typeof t?.description === 'string' ? t.description : '';
                            return (
                                <Box key={index} marginLeft={2}>
                                    <Text color="cyan">{name}</Text>
                                    {desc && (
                                        <Text color="gray" dimColor>
                                            {' '}
                                            - {desc.slice(0, 50)}
                                            {desc.length > 50 ? '...' : ''}
                                        </Text>
                                    )}
                                </Box>
                            );
                        })}
                        {tools.length > 5 && (
                            <Box marginLeft={2}>
                                <Text color="gray" dimColor>
                                    ... 还有 {tools.length - 5} 个工具
                                </Text>
                            </Box>
                        )}
                    </Box>
                )}

                {/* 显示输出结果 */}
                {outputStr && <LimitedOutput content={outputStr} maxLines={10} borderColor="gray" />}
            </Box>
        );
    },
});
