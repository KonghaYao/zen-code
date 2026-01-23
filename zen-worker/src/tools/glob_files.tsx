/**
 * glob_files 工具 - React DOM 版本
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';

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
            <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🔍</span>
                    <span className="text-purple-700 font-medium">
                        Pattern: {input?.pattern || ''}
                    </span>
                </div>

                {output && (
                    <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
                        {output}
                    </pre>
                )}
            </div>
        );
    },
});
