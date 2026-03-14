/**
 * PromptCard 组件 - 单个 Prompt 卡片展示
 *
 * 优化点：
 * - 使用外部工具函数 getContentPreview（规则：js-early-exit）
 * - 使用三元运算符替代 && 条件渲染（规则：rendering-conditional-render）
 */

import type { Prompt, PromptVersion } from '../../../types/index.js';
import { getContentPreview } from '../../../utils/formatters.js';
import { Edit, Trash2, Plus } from '../../ui/Icons.js';
import { IconButton } from '../../ui/IconButton.js';

interface PromptCardProps {
    prompt: Prompt;
    versions: PromptVersion[];
    loadingVersions: boolean;
    showVersions: boolean;
    onToggleVersions: () => void;
    onEdit: (prompt: Prompt) => void;
    onDelete: (id: string) => void;
    onCreateVersion: (prompt: Prompt) => void;
    onRollback: (promptId: string, version: number) => void;
}

export function PromptCard(props: PromptCardProps) {
    const { prompt, versions, loadingVersions, showVersions } = props;

    const contentPreview = getContentPreview(prompt.content);

    return (
        <div className="bg-white rounded-lg p-6 hover:bg-gray-50 transition-colors border border-gray-200">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-medium text-gray-900">{prompt.name}</h3>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-mono">
                            v{prompt.current_version}
                        </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">ID: {prompt.id}</p>
                    {prompt.change_note ? (
                        <p className="text-sm text-gray-600 mb-2 italic">{prompt.change_note}</p>
                    ) : null}

                    <div className="bg-gray-50 rounded p-3 text-sm mb-3 border border-gray-200">
                        <div className="mb-1 text-gray-400 text-xs">Content Preview:</div>
                        <pre className="whitespace-pre-wrap text-gray-700 font-mono text-xs">{contentPreview}</pre>
                    </div>

                    {/* Version History Toggle */}
                    <button
                        onClick={props.onToggleVersions}
                        className="text-sm text-blue-600 hover:text-blue-500 flex items-center gap-1"
                    >
                        <span className={`transform transition-transform ${showVersions ? 'rotate-90' : ''}`}>▶</span>
                        Version History ({versions.length || '?'})
                    </button>

                    {/* Version List */}
                    {showVersions ? (
                        <div className="mt-3 bg-gray-50 rounded p-3 max-h-64 overflow-y-auto border border-gray-200">
                            {loadingVersions ? (
                                <div className="text-gray-500 text-sm">Loading versions...</div>
                            ) : (
                                <div className="space-y-2">
                                    {versions.map((v) => (
                                        <div
                                            key={v.id}
                                            className={`p-2 rounded ${
                                                v.version === prompt.current_version
                                                    ? 'bg-blue-50 border border-blue-200'
                                                    : 'bg-white border border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono text-gray-400">
                                                        v{v.version}
                                                    </span>
                                                    {v.version === prompt.current_version ? (
                                                        <span className="text-xs text-blue-600">(current)</span>
                                                    ) : null}
                                                </div>
                                                <div className="flex gap-2">
                                                    {v.version !== prompt.current_version ? (
                                                        <button
                                                            onClick={() => props.onRollback(prompt.id, v.version)}
                                                            className="text-xs text-gray-500 hover:text-blue-600"
                                                        >
                                                            Rollback
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>
                                            {v.change_note ? (
                                                <p className="text-xs text-gray-500 mt-1">{v.change_note}</p>
                                            ) : null}
                                            <p className="text-xs text-gray-400 mt-1">{v.created_at}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                <div className="flex gap-1 ml-4">
                    <IconButton onClick={() => props.onCreateVersion(prompt)} variant="success" title="New Version">
                        <Plus className="w-4 h-4" />
                    </IconButton>
                    <IconButton onClick={() => props.onEdit(prompt)} variant="primary" title="Edit">
                        <Edit className="w-4 h-4" />
                    </IconButton>
                    <IconButton onClick={() => props.onDelete(prompt.id)} variant="danger" title="Delete">
                        <Trash2 className="w-4 h-4" />
                    </IconButton>
                </div>
            </div>
        </div>
    );
}
