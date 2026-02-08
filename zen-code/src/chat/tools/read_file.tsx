import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { readFileSchema } from '@codegraph/agent/src/tools/filesystem_tools';
import Link from '../components/Link';

export const read_file = createUITool({
    name: 'read_file',
    description: 'Reads a file from the local filesystem',
    parameters: readFileSchema.shape,
    handler: ToolManager.waitForUIDone,
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output as string;

        if (!output) return <></>;

        const lines = output.split('\n');
        const totalLines = lines.length;

        return (
            <Box flexDirection="column" paddingX={1}>
                <Box>
                    <Text color="blue">Read </Text>
                    <Text dimColor>(</Text>
                    <Link path={input.file_path} color="blue" />
                    <Text dimColor>)</Text>
                    <Text color="gray" dimColor>
                        {' '}
                        ({totalLines} lines)
                    </Text>
                </Box>
            </Box>
        );
    },
});
