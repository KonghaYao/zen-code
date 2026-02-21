import { createUITool, ToolManager } from '@langgraph-js/sdk';

import { Box, Text } from 'ink';
import Link from '../components/common/Link';

export const search_files_rg = createUITool({
    name: 'search_files_rg',
    description: 'Ripgrep - fast text search tool',
    parameters: {},
    handler: ToolManager.waitForUIDone,
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output as string;

        if (!output) return <></>;

        const lines = output.split('\n').filter(Boolean);
        const count = lines.length;

        // 优先从新格式的结构化参数中提取
        let pattern = input.pattern!;
        let path = input.path!;

        // 如果没有结构化参数，则从 args 数组中解析（兼容旧格式）
        if (!pattern) {
            const args = input.args || [];
            const nonOptionArgs = args.filter((arg: string) => !arg.startsWith('-'));
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
