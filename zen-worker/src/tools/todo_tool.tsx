/**
 * todo_tool 工具 - React DOM 版本
 * 使用 shadcn/ui 组件
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';
import { ToolCard } from '../components/ToolCard';

export const todo_tool = createUITool({
    name: 'todo_tool',
    description: 'Manage todo list',
    parameters: {} as any,
    handler: async (args, context) => {
        return [{ type: 'text', text: 'Todo operation completed' }];
    },
    render(tool) {
        const input = tool.getInputRepaired();
        const output = tool.output;

        return (
            <ToolCard
                icon="✅"
                title="Todo List"
                operation={input?.action || 'manage'}
                output={output}
                variant="green"
            />
        );
    },
});
