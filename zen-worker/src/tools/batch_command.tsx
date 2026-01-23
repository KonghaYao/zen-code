/**
 * batch_command 工具 - React DOM 版本
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';

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
            <div className="bg-gray-50 border-l-4 border-gray-500 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📦</span>
                    <span className="text-gray-700 font-medium">
                        Batch Command ({input?.commands?.length || 0} commands)
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
