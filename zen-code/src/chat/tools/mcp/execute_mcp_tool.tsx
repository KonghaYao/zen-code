import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { z } from 'zod';
import { LimitedOutput } from '../../components/common/LimitedOutput';

export const ExecuteMcpToolSchema = z.object({
    commands: z
        .array(
            z.object({
                name: z.string().describe('MCP 工具名称'),
                args: z.record(z.string(), z.any()).describe('工具参数，JSON 对象格式'),
            }),
        )
        .describe('要执行的 MCP 工具列表'),
});

export const execute_mcp_tool = createUITool({
    name: 'execute_mcp_tool',
    description: `执行一个或多个 MCP 工具。

使用格式：
- commands: MCP 工具数组，每个工具包含 name 和 args

示例：
- 执行单个工具: {commands: [{name: "filesystem.read_file", args: {path: "/path/to/file"}}]}
- 执行多个工具: {commands: [{name: "tool1", args: {...}}, {name: "tool2", args: {...}}]}

重要：
- 所有工具独立执行，失败不影响其他工具
- 返回结果按命令顺序排列
- 适合批量执行 MCP 相关操作`,
    parameters: ExecuteMcpToolSchema.shape,
    handler: ToolManager.waitForUIDone,
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output as string;

        // 防御：output 可能非字符串
        const outputStr = typeof output === 'string' ? output : '';

        let parsedData: { results?: unknown[] } | null = null;
        try {
            parsedData = JSON.parse(outputStr);
        } catch (e) {
            // Failed to parse, just show raw output
        }

        // 防御：commands 在流式阶段可能是 undefined 或非数组
        const commands = Array.isArray(input?.commands) ? input.commands : [];

        return (
            <Box flexDirection="column">
                <Box>
                    <Text color="blue" bold>
                        execute_mcp_tool
                    </Text>
                </Box>

                {/* 显示命令列表 */}
                {commands.length > 0 && (
                    <Box flexDirection="column" marginTop={1}>
                        <Text color="gray" dimColor>
                            执行 {commands.length} 个 MCP 工具:
                        </Text>
                        {commands.map((cmd: unknown, index: number) => {
                            // 防御：cmd 可能是非对象或 name 非字符串
                            const name =
                                cmd && typeof cmd === 'object' && typeof (cmd as any).name === 'string'
                                    ? (cmd as any).name
                                    : String((cmd as any)?.name ?? '');
                            return (
                                <Box key={index} marginLeft={2}>
                                    <Text color="yellow">{index + 1}.</Text>
                                    <Text color="cyan">{name}</Text>
                                </Box>
                            );
                        })}
                    </Box>
                )}

                {/* 显示结果摘要 —— 防御：results 可能非数组 */}
                {Array.isArray(parsedData?.results) && (
                    <Box flexDirection="column" marginTop={1}>
                        {(parsedData!.results as any[]).map((r: any, index: number) => (
                            <Box key={index} marginLeft={2}>
                                {r?.error ? (
                                    <Text color="red">✗ {typeof r.tool === 'string' ? r.tool : ''}</Text>
                                ) : (
                                    <Text color="green">✓ {typeof r.tool === 'string' ? r.tool : ''}</Text>
                                )}
                            </Box>
                        ))}
                    </Box>
                )}

                {/* 显示详细输出 */}
                {outputStr && <LimitedOutput content={outputStr} maxLines={10} borderColor="gray" />}
            </Box>
        );
    },
});
