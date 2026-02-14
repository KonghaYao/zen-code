/**
 * execute_mcp_tool 工具 - React DOM 版本
 * 使用 shadcn/ui 组件
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';
import { ToolCard } from '../../components/ToolCard';

export const execute_mcp_tool = createUITool({
    name: 'execute_mcp_tool',
    description: 'Execute one or more MCP tools',
    parameters: {} as any,
    handler: async (args, context) => {
        return [{ type: 'text', text: 'MCP tools executed' }];
    },
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output;

        const commandCount = input?.commands?.length || 0;

        let successCount = 0;
        let parsedData = null;
        try {
            parsedData = JSON.parse(output || '{}');
            if (parsedData?.results) {
                successCount = parsedData.results.filter((r: any) => !r.error).length;
            }
        } catch (e) {
            // Failed to parse
        }

        const allSuccess = commandCount > 0 && successCount === commandCount;

        return (
            <ToolCard
                icon="⚙️"
                title="Execute MCP Tools"
                operation="execute"
                meta={`${successCount}/${commandCount} succeeded`}
                output={output}
                variant={allSuccess ? 'green' : 'orange'}
            />
        );
    },
});
