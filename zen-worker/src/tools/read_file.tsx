/**
 * read_file 工具 - React DOM 版本
 * 使用 shadcn/ui 组件
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';
import { ToolCard } from '../components/ToolCard';

export const read_file = createUITool({
    name: 'read_file',
    description: 'Read a file from the local filesystem',
    parameters: {} as any,
    handler: async (args, context) => {
        return [{ type: 'text', text: 'File read' }];
    },
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output as string;

        if (!output) return <div></div>;

        const lines = output.split('\n');
        const totalLines = lines.length;

        return (
            <ToolCard
                icon="📄"
                title={input?.file_path || 'Read File'}
                operation="read"
                meta={`${totalLines} lines`}
                output={output}
                variant="blue"
                scrollable={true}
            />
        );
    },
});
