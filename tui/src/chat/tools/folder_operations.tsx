
import { Box, Text } from 'ink';
import { createUITool } from '@langgraph-js/sdk';
import { folder_tool as folderToolBackend } from '../../../../agents/code/tools/filesystem_tools/folder_tool';

const folderOperationSchema = folderToolBackend.schema;

export const folder_operations = createUITool({
    name: 'folder_operations',
    description: 'Unified folder operations tool supporting create, list, delete, and existence check',
    parameters: folderOperationSchema.shape,
    handler: async (input) => {
        const result = await folderToolBackend.invoke(input);
        return result;
    },
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output as string;

        if (!output) return <></>;

        return (
            <Box flexDirection="column" paddingX={1}>
                <Box>
                    <Text bold dimColor>
                        folder_operations
                    </Text>
                    <Text dimColor> ({input.operation})</Text>
                </Box>
                <Box flexDirection="column">
                    <Text>{output}</Text>
                </Box>
            </Box>
        );
    },
});
