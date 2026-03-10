import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { ExtractSchema } from '@langgraph-js/web-fetch';

export const web_fetch = createUITool({
    name: 'web_fetch',
    description: 'Fetch and extract readable content from one or more URLs.',
    parameters: ExtractSchema.shape,
    handler: ToolManager.waitForUIDone,
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output as string;

        /** @ts-ignore */
        const urls: string[] = Array.isArray(input?.urls) ? input.urls : [];
        const urlDisplay = urls.length === 1 ? urls[0] : `${urls.length} URLs`;

        // 截取 URL 防止过长
        const displayUrl =
            typeof urlDisplay === 'string' && urlDisplay.length > 60 ? urlDisplay.substring(0, 60) + '...' : urlDisplay;

        // 统计输出行数/字符数
        const outputStr = typeof output === 'string' ? output : '';
        const charCount = outputStr.length;

        return (
            <Box flexDirection="column" paddingX={1}>
                <Box>
                    <Text color="green">Fetch </Text>
                    <Text dimColor>(</Text>
                    <Text color="cyan">{displayUrl}</Text>
                    <Text dimColor>)</Text>
                    {outputStr ? (
                        <Text color="gray" dimColor>
                            {' '}
                            ({charCount} chars)
                        </Text>
                    ) : null}
                </Box>
            </Box>
        );
    },
});
