import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { generateOptimizedDiff } from './diffUtils';
import { replace_tool } from '@langgraph-js/agent-middlewares';
import Link from '../components/common/Link';

const editToolSchema = replace_tool.schema;

// MODIFIED: Updated interface to match new schema
interface ReplaceInFileInput {
    file_path: string;
    old_string: string;
    new_string: string;
    replace_all?: boolean;
}

export const replace_in_file = createUITool({
    name: 'edit_file',
    description: 'Performs exact string replacements in files with diff visualization',
    parameters: editToolSchema.shape,
    handler: ToolManager.waitForUIDone,
    render(tool) {
        const input = tool.getInputRepaired() as ReplaceInFileInput;
        const output = tool.output;

        const hasDiff = input.old_string && input.new_string && input.old_string !== input.new_string;

        let removedCount = 0;
        let addedCount = 0;
        if (hasDiff) {
            const fullDiff = generateOptimizedDiff(input.old_string, input.new_string, { maxLines: undefined });
            for (const line of fullDiff) {
                if (line.type === 'removed') removedCount++;
                if (line.type === 'added') addedCount++;
            }
        }

        return (
            <Box flexDirection="column" paddingX={1}>
                <Box>
                    <Text color="yellow">Edit </Text>
                    <Text dimColor>(</Text>
                    <Link path={input.file_path} rainbow />
                    <Text dimColor>)</Text>
                    {hasDiff && (
                        <>
                            <Text color="gray"> (</Text>
                            <Text color="red">-{removedCount}</Text>
                            <Text color="gray">/</Text>
                            <Text color="green">+{addedCount}</Text>
                            <Text color="gray">)</Text>
                        </>
                    )}
                </Box>

                {output && output.startsWith('Error:') && (
                    <Box marginTop={0} marginLeft={1} marginBottom={1}>
                        <Text color="red">{output}</Text>
                    </Box>
                )}

                {!output && (
                    <Box marginTop={0}>
                        <Text color="gray">Press Enter to confirm, Ctrl+C to cancel</Text>
                    </Box>
                )}
            </Box>
        );
    },
});
