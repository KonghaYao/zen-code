/**
 * read_file 工具 - React DOM 版本
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';

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
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📄</span>
                    <span className="text-blue-700 font-medium">{input?.file_path}</span>
                    <span className="text-gray-500 text-sm">({totalLines} lines)</span>
                </div>

                {output && (
                    <pre className="bg-white p-2 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto">
                        {output}
                    </pre>
                )}
            </div>
        );
    },
});
