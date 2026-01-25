/**
 * glob_files 工具 - React DOM 版本
 * 使用 shadcn/ui 组件
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';
import { ToolCard } from '../components/ToolCard';

export const glob_files = createUITool({
    name: 'glob_files',
    description: 'Search files using glob patterns',
    parameters: {} as any,
    handler: async (args, context) => {
        return [{ type: 'text', text: 'Files found' }];
    },
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output as string;

        return (
            <ToolCard
                icon="🔍"
                title={input?.pattern || 'Glob Pattern'}
                operation="search"
                output={output}
                variant="purple"
                scrollable={true}
            />
        );
    },
});
