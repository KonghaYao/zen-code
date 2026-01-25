/**
 * replace_in_file 工具 - React DOM 版本
 * 使用 shadcn/ui 组件
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';
import { ToolCard } from '../components/ToolCard';

export const replace_in_file = createUITool({
    name: 'replace_in_file',
    description: 'Replace text in file',
    parameters: {} as any,
    handler: async (args, context) => {
        return [{ type: 'text', text: 'Text replaced' }];
    },
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output;

        return (
            <ToolCard
                icon="🔄"
                title={input?.file_path || 'Replace in File'}
                operation="replace"
                output={output}
                variant="yellow"
            />
        );
    },
});
