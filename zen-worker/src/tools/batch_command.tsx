/**
 * batch_command 工具 - React DOM 版本
 * 使用 shadcn/ui 组件
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';
import { ToolCard } from '../components/ToolCard';

export const batch_command = createUITool({
    name: 'batch_command',
    description: 'Execute multiple commands in batch',
    parameters: {} as any,
    handler: async (args, context) => {
        return [{ type: 'text', text: 'Batch commands executed' }];
    },
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output;

        return (
            <ToolCard
                icon="📦"
                title="Batch Commands"
                operation="batch"
                meta={input?.commands?.length || 0}
                output={output}
                variant="gray"
            />
        );
    },
});
