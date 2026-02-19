/**
 * PromptCard 组件 - 单个 Prompt 卡片展示
 */

import { useState } from 'react';
import type { Prompt, PromptVersion } from '../../../types/index.js';
import { trpc } from '../../../api.js';

interface PromptCardProps {
    prompt: Prompt;
    onEdit: (prompt: Prompt) => void;
    onDelete: (id: string) => void;
    onCreateVersion: (prompt: Prompt) => void;
    onRollback: (promptId: string, version: number) => void;
}

export function PromptCard(props: PromptCardProps) {
    const [showVersions, setShowVersions] = useState(false);

    const {
        data: versions = [],
        isLoading: loadingVersions,
        refetch,
    } = trpc.prompts.getVersions.useQuery({ promptId: props.prompt.id }, { enabled: showVersions });

    const getContentPreview = () => {
        const maxLength = 200;
        if (props.prompt.content.length <= maxLength) {
            return props.prompt.content;
        }
        return props.prompt.content.substring(0, maxLength) + '...';
    };

    const handleRollback = (version: number) => {
        if (confirm(`Rollback to version ${version}? Current version will be changed but history preserved.`)) {
            props.onRollback(props.prompt.id, version);
        }
    };

    const handleToggleVersions = () => {
        const newShow = !showVersions;
        setShowVersions(newShow);
        if (newShow && versions.length === 0) {
            refetch();
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-medium text-white">{props.prompt.name}</h3>
                        <span className="px-2 py-0.5 bg-blue-600/30 text-blue-300 text-xs rounded-full font-mono">
                            v{props.prompt.current_version}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">ID: {props.prompt.id}</p>
                    {props.prompt.change_note && (
                        <p className="text-sm text-gray-400 mb-2 italic">{props.prompt.change_note}</p>
                    )}

                    <div className="bg-gray-900 rounded p-3 text-sm mb-3">
                        <div className="mb-1 text-gray-500 text-xs">Content Preview:</div>
                        <pre className="whitespace-pre-wrap text-gray-300 font-mono text-xs">{getContentPreview()}</pre>
                    </div>

                    {/* Version History Toggle */}
                    <button
                        onClick={handleToggleVersions}
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                        <span className={`transform transition-transform ${showVersions ? 'rotate-90' : ''}`}>▶</span>
                        Version History ({versions.length || '?'})
                    </button>

                    {/* Version List */}
                    {showVersions && (
                        <div className="mt-3 bg-gray-900 rounded p-3 max-h-64 overflow-y-auto">
                            {loadingVersions ? (
                                <div className="text-gray-400 text-sm">Loading versions...</div>
                            ) : (
                                <div className="space-y-2">
                                    {versions.map((v) => (
                                        <div
                                            key={v.id}
                                            className={`p-2 rounded ${
                                                v.version === props.prompt.current_version
                                                    ? 'bg-blue-600/20 border border-blue-500/30'
                                                    : 'bg-gray-800'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono text-gray-400">
                                                        v{v.version}
                                                    </span>
                                                    {v.version === props.prompt.current_version && (
                                                        <span className="text-xs text-blue-400">(current)</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    {v.version !== props.prompt.current_version && (
                                                        <button
                                                            onClick={() => handleRollback(v.version)}
                                                            className="text-xs text-gray-400 hover:text-blue-400"
                                                        >
                                                            Rollback
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {v.change_note && (
                                                <p className="text-xs text-gray-500 mt-1">{v.change_note}</p>
                                            )}
                                            <p className="text-xs text-gray-600 mt-1">{v.created_at}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                    <button
                        onClick={() => props.onCreateVersion(props.prompt)}
                        className="px-3 py-1 text-sm bg-green-700 hover:bg-green-600 rounded"
                    >
                        New Version
                    </button>
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
