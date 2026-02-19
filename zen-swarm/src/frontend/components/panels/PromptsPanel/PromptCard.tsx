/**
 * PromptCard 组件 - 单个 Prompt 卡片展示
 */

import type { Prompt } from '../../../types/index.js';

interface PromptCardProps {
    prompt: Prompt;
    onEdit: (prompt: Prompt) => void;
    onDelete: (id: string) => void;
}

export function PromptCard(props: PromptCardProps) {
    const getContentPreview = () => {
        const maxLength = 200;
        if (props.prompt.content.length <= maxLength) {
            return props.prompt.content;
        }
        return props.prompt.content.substring(0, maxLength) + '...';
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h3 className="text-lg font-medium text-white mb-1">{props.prompt.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">ID: {props.prompt.id}</p>
                    <p className="text-sm text-gray-400 mb-3">{props.prompt.description || 'No description'}</p>

                    <div className="bg-gray-900 rounded p-3 text-sm">
                        <div className="mb-1 text-gray-500 text-xs">Content Preview:</div>
                        <pre className="whitespace-pre-wrap text-gray-300 font-mono text-xs">{getContentPreview()}</pre>
                    </div>
                </div>

                <div className="flex gap-2 ml-4">
                    <button
                        onClick={() => props.onEdit(props.prompt)}
                        className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => props.onDelete(props.prompt.id)}
                        className="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-300 rounded"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
