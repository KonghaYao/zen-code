/**
 * replace_in_file 工具 - React DOM 版本
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';

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
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🔄</span>
                    <span className="text-yellow-700 font-medium">
                        Replace in: {input?.file_path}
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
