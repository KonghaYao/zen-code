/**
 * todo_tool 工具 - React DOM 版本
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';

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
            <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">✅</span>
                    <span className="text-green-700 font-medium">
                        Todo Tool
                    </span>
                </div>

                {output && (
                    <pre className="bg-white p-2 rounded text-xs">
                        {JSON.stringify(output, null, 2)}
                    </pre>
                )}
            </div>
        );
    },
});
