import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { z } from 'zod';
import Link from '../components/Link';

const writeToolSchema = z.object({
    description: z.string().optional(),
    file_path: z.string(),
    content: z.string(),
});

export const write_file = createUITool({
    name: 'write_file',
    description: 'Writes a file to the local filesystem',
    parameters: writeToolSchema.shape,
    handler: ToolManager.waitForUIDone,
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output;

        const lineCount = input.content?.split('\n')?.length;

        return (
            <Box flexDirection="column" paddingX={1}>
                <Box>
                    <Text color="green">Write </Text>
                    <Text dimColor>(</Text>
                    <Link path={input.file_path} color="green" />
                    <Text dimColor>)</Text>
                    <Text dimColor> ({lineCount} lines)</Text>
                </Box>

                {output && output.startsWith('Error:') && (
                    <Box marginTop={0} marginLeft={1} marginBottom={1}>
                        <Text color="red">{output}</Text>
                    </Box>
                )}

                {!output && (
                    <Box marginTop={0}>
                        <Text color="gray">Waiting...</Text>
                    </Box>
                )}
            </Box>
        );
    },
});
