/**
 * load_mcp_tools 工具 - React DOM 版本
 * 使用 shadcn/ui 组件
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';
import { ToolCard } from '../../components/ToolCard';

export const load_mcp_tools = createUITool({
    name: 'load_mcp_tools',
    description: 'Load and query all available MCP tools',
    parameters: {} as any,
    handler: async (args, context) => {
        return [{ type: 'text', text: 'MCP tools loaded' }];
    },
    render(tool) {
        const output = tool.output;

        let parsedData = null;
        try {
            parsedData = JSON.parse(output || '{}');
        } catch (e) {
            // Failed to parse
        }

        const toolCount = parsedData?.tools?.length || 0;
        const serverCount = parsedData?.status?.servers?.length || 0;

        return (
            <ToolCard
                icon="🔌"
                title="Load MCP Tools"
                operation="query"
                meta={`${toolCount} tools, ${serverCount} servers`}
                output={output}
                variant="blue"
            />
        );
    },
});
