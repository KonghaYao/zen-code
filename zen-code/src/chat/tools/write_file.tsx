import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { z } from 'zod';
import Link from '../components/common/Link';

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

        // 防御：content / file_path 在流式阶段可能是 undefined 或非字符串
        const content = typeof input?.content === 'string' ? input.content : String(input?.content ?? '');
        const filePath = typeof input?.file_path === 'string' ? input.file_path : String(input?.file_path ?? '');
        const lineCount = content.split('\n').length;

        // 防御：output 可能非字符串
        const outputStr = typeof output === 'string' ? output : '';

        return (
            <Box flexDirection="column" paddingX={1}>
                <Box>
                    <Text color="green">Write </Text>
                    <Text dimColor>(</Text>
                    <Link path={filePath} rainbow />
                    <Text dimColor>)</Text>
                    <Text dimColor> ({lineCount} lines)</Text>
                </Box>

                {outputStr && outputStr.startsWith('Error:') && (
                    <Box marginTop={0} marginLeft={1} marginBottom={1}>
                        <Text color="red">{outputStr}</Text>
                    </Box>
                )}
            </Box>
        );
    },
});
