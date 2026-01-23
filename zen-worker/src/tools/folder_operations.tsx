/**
 * folder_operations 工具 - React DOM 版本
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';

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
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📁</span>
                    <span className="text-indigo-700 font-medium">
                        {input?.operation || 'unknown'}: {input?.folder_path || ''}
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
