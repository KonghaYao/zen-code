import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { read_tool } from '@langgraph-js/agent-middlewares';
import Link from '../components/common/Link';

const readFileSchema = read_tool.schema;

export const read_file = createUITool({
    name: 'read_file',
    description: 'Reads a file from the local filesystem',
    parameters: readFileSchema.shape,
    handler: ToolManager.waitForUIDone,
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output as string;

        if (!output) return <></>;

        // 防御：output 在流式阶段可能非字符串
        const outputStr = typeof output === 'string' ? output : String(output ?? '');
        const lines = outputStr.split('\n');
        const totalLines = lines.length;

        // 防御：file_path 在流式阶段可能是 undefined 或非字符串
        const filePath = typeof input?.file_path === 'string' ? input.file_path : String(input?.file_path ?? '');

        return (
            <Box flexDirection="column" paddingX={1}>
                <Box>
                    <Text color="blue">Read </Text>
                    <Text dimColor>(</Text>
                    <Link path={filePath} rainbow />
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
