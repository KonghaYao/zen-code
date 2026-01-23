/**
 * write_file 工具 - React DOM 版本
 */

import React from 'react';
import { createUITool } from '@langgraph-js/sdk';

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

        return (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">✏️</span>
                    <span className="text-orange-700 font-medium">{input?.file_path}</span>
                    <span className="text-gray-500 text-sm">({lineCount} lines)</span>
                </div>

                {output && typeof output === 'string' && output.startsWith('Error:') && (
                    <div className="mt-2 text-red-600 text-sm">
                        ❌ {output}
                    </div>
                )}

                {!output && status !== 'completed' && (
                    <div className="mt-2 text-gray-500 text-sm">
                        ⏳ 准备写入...
                    </div>
                )}

                {output && !output.startsWith('Error:') && (
                    <div className="mt-2 text-green-600 text-sm">
                        ✅ 文件已写入
                    </div>
                )}
            </div>
        );
    },
});
