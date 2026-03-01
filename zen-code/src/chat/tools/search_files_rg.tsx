import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { z } from 'zod';
import { Box, Text } from 'ink';
import Link from '../components/common/Link';

const searchFilesRgSchema = z.object({
    args: z.array(z.string()).optional().describe('ripgrep 参数数组，格式为 [OPTIONS...] PATTERN [PATH...]'),
    pattern: z.string().optional().describe('搜索模式（结构化参数）'),
    path: z.string().optional().describe('搜索路径（结构化参数）'),
    description: z.string().optional().describe('操作描述'),
    head_limit: z.number().optional().describe('限制输出行数'),
});

export const search_files_rg = createUITool({
    name: 'search_files_rg',
    description: 'Ripgrep - fast text search tool',
    parameters: searchFilesRgSchema.shape,
    handler: ToolManager.waitForUIDone,
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output as string;

        if (!output) return <></>;

        // 防御：output 在流式阶段可能非字符串
        const outputStr = typeof output === 'string' ? output : String(output ?? '');
        const lines = outputStr.split('\n').filter(Boolean);
        const count = lines.length;

        // 优先从新格式的结构化参数中提取，防御非字符串
        let pattern: string | undefined = typeof input?.pattern === 'string' ? input.pattern : undefined;
        let path: string | undefined = typeof input?.path === 'string' ? input.path : undefined;

        // 如果没有结构化参数，则从 args 数组中解析（兼容旧格式）
        // 防御：args 可能是 undefined / 非数组 / 元素非字符串
        if (!pattern && input?.args) {
            const rawArgs = Array.isArray(input.args) ? input.args : [];
            const args: string[] = rawArgs.filter((arg: unknown) => typeof arg === 'string') as string[];
            const nonOptionArgs = args.filter((arg) => !arg.startsWith('-'));
            if (nonOptionArgs.length > 0) {
                path = nonOptionArgs[nonOptionArgs.length - 1];
                if (nonOptionArgs.length > 1) {
                    pattern = nonOptionArgs[nonOptionArgs.length - 2];
                }
            }
        }

        return (
            <Box flexDirection="column" paddingX={1}>
                <Text>
                    <Text color="magenta">Ripgrep </Text>
                    {pattern && (
                        <>
                            <Text dimColor>(</Text>
                            <Link path={pattern} color="magenta" />
                            <Text dimColor>)</Text>
                        </>
                    )}
                    {path && path !== './' && (
                        <>
                            <Text dimColor> in </Text>
                            <Link path={path} rainbow />
                        </>
                    )}
                    <Text color="gray" dimColor>
                        {' '}
                        ({count} matches)
                    </Text>
                </Text>
            </Box>
        );
    },
});
