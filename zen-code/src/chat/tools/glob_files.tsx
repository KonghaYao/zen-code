import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { glob_tool } from '@langgraph-js/agent-middlewares';
import { Box, Text } from 'ink';
import Link from '../components/common/Link';

const globToolSchema = glob_tool.schema;

export const glob_files = createUITool({
    name: 'glob_files',
    description: 'Find files by name patterns',
    parameters: globToolSchema.shape,
    handler: ToolManager.waitForUIDone,
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output as string;

        if (!output) return <></>;

        const files = output.split('\n').filter(Boolean);
        const count = files.length;

        // 防御：pattern 在流式输入阶段可能是 undefined 或非字符串
        const pattern = typeof input?.pattern === 'string' ? input.pattern : String(input?.pattern ?? '');

        return (
            <Box flexDirection="column" paddingX={1}>
                <Text>
                    <Text color="cyan">Glob </Text>
                    <Text dimColor>(</Text>
                    <Link path={pattern} rainbow />
                    <Text dimColor>)</Text>
                    <Text color="gray" dimColor>
                        {' '}
                        ({count} files)
                    </Text>
                </Text>
            </Box>
        );
    },
});
