/**
 * write_file 工具 - React DOM 版本
 * 使用 shadcn/ui 组件
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';
import { ToolCard } from '../components/ToolCard';

export const write_file = createUITool({
    name: 'write_file',
    description: 'Write content to a file',
    parameters: {} as any,
    handler: async (args, context) => {
        return [{ type: 'text', text: 'File written' }];
    },
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output;
        const status = tool.status;

        const lineCount = input?.content?.split('\n').length || 0;

        // Determine status based on output
        let displayStatus: 'loading' | 'success' | 'error' | 'pending' = 'success';
        if (!output && status !== 'completed') {
            displayStatus = 'pending';
        } else if (typeof output === 'string' && output.startsWith('Error:')) {
            displayStatus = 'error';
        }

        return (
            <ToolCard
                icon="✏️"
                title={input?.file_path || 'Write File'}
                operation="write"
                meta={`${lineCount} lines`}
                output={output && typeof output === 'string' && !output.startsWith('Error:')
                    ? '✅ 文件已写入'
                    : output
                }
                status={displayStatus}
                variant="orange"
            />
        );
    },
});
