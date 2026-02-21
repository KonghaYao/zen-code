import { Box, Text } from 'ink';
import { createUITool } from '@langgraph-js/sdk';
import { folder_tool as folderToolBackend } from '@codegraph/agent/src/tools/filesystem_tools/folder_tool';
import Link from '../components/common/Link';

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

        // Color mapping for different operations
        const operationColors: Record<string, string> = {
            create: 'green',
            list: 'blue',
            exists: 'yellow',
            delete: 'red',
        };

        // Determine operation color (default to cyan)
        const operationColor = operationColors[input?.operation as any] || 'cyan';

        // Parse output for better formatting
        const lines = output.split('\n');
        const formattedOutput = lines.map((line, idx) => {
            // Highlight file sizes and dates in list output
            if (line.match(/\d+ \w+|[\d-]+ [\d:]+/)) {
                return (
                    <Text key={idx} dimColor>
                        {line}
                    </Text>
                );
            }
            // Highlight success/error messages
            if (
                line.includes('✓') ||
                line.includes('successfully') ||
                line.includes('created') ||
                line.includes('deleted')
            ) {
                return (
                    <Text key={idx} color="green">
                        {line}
                    </Text>
                );
            }
            if (line.includes('✗') || line.includes('Error') || line.includes('not found') || line.includes('failed')) {
                return (
                    <Text key={idx} color="red">
                        {line}
                    </Text>
                );
            }
            // Highlight paths
            if (line.startsWith('/') || line.includes('/:')) {
                return (
                    <Text key={idx} color="cyan">
                        {line}
                    </Text>
                );
            }
            return <Text key={idx}>{line}</Text>;
        });

        return (
            <Box flexDirection="column" paddingX={1}>
                <Box>
                    <Text bold color={operationColor}>
                        {input.operation}Folder
                    </Text>
                    <Text dimColor> (</Text>
                    <Link path={input.folder_path} rainbow />
                    <Text dimColor>)</Text>
                </Box>
                {/* <Box flexDirection="column">
                    {formattedOutput.map((line, idx) => (
                        <Box key={idx}>{line}</Box>
                    ))}
                </Box> */}
            </Box>
        );
    },
});
