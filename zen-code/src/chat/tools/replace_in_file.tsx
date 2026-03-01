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

        // 防御：流式阶段各字段可能是 undefined 或非字符串
        const filePath = typeof input?.file_path === 'string' ? input.file_path : String(input?.file_path ?? '');
        const oldString = typeof input?.old_string === 'string' ? input.old_string : '';
        const newString = typeof input?.new_string === 'string' ? input.new_string : '';

        // 防御：两个字符串均存在且不相等才进行 diff
        const hasDiff = oldString.length > 0 && newString.length > 0 && oldString !== newString;

        // 防御：output 可能非字符串
        const outputStr = typeof output === 'string' ? output : '';

        let removedCount = 0;
        let addedCount = 0;
        if (hasDiff) {
            const fullDiff = generateOptimizedDiff(oldString, newString, { maxLines: undefined });
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
                    <Link path={filePath} rainbow />
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

                {outputStr && outputStr.startsWith('Error:') && (
                    <Box marginTop={0} marginLeft={1} marginBottom={1}>
                        <Text color="red">{outputStr}</Text>
                    </Box>
                )}

                {!outputStr && (
                    <Box marginTop={0}>
                        <Text color="gray">Press Enter to confirm, Ctrl+C to cancel</Text>
                    </Box>
                )}
            </Box>
        );
    },
});
