import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { z } from 'zod';
import { LimitedOutput } from '../components/common/LimitedOutput';

export const BatchCommandSchema = z.object({
    commands: z
        .array(
            z.object({
                name: z.string().describe('Command 名称'),
                args: z.record(z.string(), z.any()).describe('Command 参数，JSON 对象格式'),
            }),
        )
        .describe('要执行的 Command 列表'),
});

export const batch_command = createUITool({
    name: 'batch_command',
    description: `批量执行多个 Command。在一个调用中并行执行多个 Command 操作。

使用格式：
- commands: Command 数组，每个 Command 包含 name 和 args

示例：
- 同时读取多个文件: {commands: [{name: "read_file", args: {file_path: "/path/file1.txt"}}, {name: "read_file", args: {file_path: "/path/file2.txt"}}]}
- 搜索后读取: {commands: [{name: "grep", args: {pattern: "function", path: "./src"}}, {name: "read_file", args: {file_path: "./src/main.js"}}]}

重要：
- 所有 Command 独立执行，失败不影响其他 Command
- 返回结果按 Command 顺序排列
- 适合批量操作和并行执行独立任务`,
    parameters: BatchCommandSchema.shape,
    handler: ToolManager.waitForUIDone,
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output as string;

        return (
            <Box flexDirection="column">
                {/* 显示命令列表 */}
                {input.commands && input.commands.length > 0 && (
                    <Box flexDirection="column" marginTop={1}>
                        {input.commands.map((cmd: any, index: number) => (
                            <Box key={index}>
                                <Text color="gray" dimColor>
                                    {index + 1}.
                                </Text>
                                <Text color="blue">{cmd.name}</Text>
                            </Box>
                        ))}
                    </Box>
                )}

                {/* 显示输出结果 */}
                {output && <LimitedOutput content={output} maxLines={5} borderColor="gray" />}
            </Box>
        );
    },
});
