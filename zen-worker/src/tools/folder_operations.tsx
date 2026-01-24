/**
 * folder_operations 工具 - React DOM 版本
 * 使用 shadcn/ui 组件
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';
import { ToolCard } from '../components/ToolCard';

export const folder_operations = createUITool({
    name: 'folder_operations',
    description: 'Folder operations (create, list, exists)',
    parameters: {} as any,
    handler: async (args, context) => {
        return [{ type: 'text', text: 'Folder operation completed' }];
    },
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output;

        return (
            <ToolCard
                icon="📁"
                title={input?.folder_path || 'Folder Operation'}
                operation={input?.operation || 'unknown'}
                output={output}
                variant="indigo"
            />
        );
    },
});
