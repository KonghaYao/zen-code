import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { globToolSchema } from '@codegraph/agent/src/tools/filesystem_tools/glob_tool';
import { Box, Text } from 'ink';
import Link from '../components/Link';

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

        return (
            <Box flexDirection="column" paddingX={1}>
                <Text>
                    <Text color="cyan">Glob </Text>
                    <Text dimColor>(</Text>
                    <Link path={input.pattern} color="cyan" />
                    <Text dimColor>)</Text>
                    <Text color="gray" dimColor>
                        {' '}({count} files)
                    </Text>
                </Text>
            </Box>
        );
    },
});
