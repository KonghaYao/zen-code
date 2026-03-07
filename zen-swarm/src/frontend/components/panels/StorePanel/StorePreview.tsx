/**
 * StorePreview — 远程仓库条目预览 Modal
 */

import { Modal } from '../../Modal.js';

interface PreviewItem {
    name: string;
    description?: string;
    content: string;
    tags?: string[];
    author?: string;
    source_url?: string;
    version?: string;
    downloads?: number;
    stars?: number;
}

interface StorePreviewProps {
    open: boolean;
    item: PreviewItem | null;
    type: 'prompt' | 'skill';
    onClose: () => void;
    onImport: () => void;
    isImported?: boolean;
    isImporting?: boolean;
    isContentLoading?: boolean;
}

export function StorePreview({
    open,
    item,
    type,
    onClose,
    onImport,
    isImported,
    isImporting,
    isContentLoading,
}: StorePreviewProps) {
    if (!item) return null;

    return (
        <Modal open={open} onClose={onClose} title={item.name}>
            <div className="space-y-4">
                {/* Meta */}
                <div className="flex items-center gap-2 flex-wrap text-sm text-gray-500">
                    {item.author && (
                        <span>
                            by <strong className="text-gray-700">{item.author}</strong>
                        </span>
                    )}
                    {item.version && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded text-xs font-mono">
                            v{item.version}
                        </span>
                    )}
                    {item.downloads != null && (
                        <span className="text-xs" title="Downloads">
                            ↓ {item.downloads.toLocaleString()}
                        </span>
                    )}
                    {item.stars != null && (
                        <span className="text-xs" title="Stars">
                            ★ {item.stars.toLocaleString()}
                        </span>
                    )}
                    {item.tags &&
                        Array.isArray(item.tags) &&
                        item.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                                {tag}
                            </span>
                        ))}
                    {item.source_url && (
                        <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-xs"
                        >
                            Source
                        </a>
                    )}
                </div>

                {/* Description */}
                {item.description && <p className="text-sm text-gray-600">{item.description}</p>}

                {/* Content */}
                <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">
                        {type === 'prompt' ? 'Prompt Content' : 'SKILL.md'}
                    </p>
                    {isContentLoading ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-400 text-center h-24 flex items-center justify-center">
                            Loading...
                        </div>
                    ) : (
                        <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 overflow-auto max-h-64 whitespace-pre-wrap">
                            {item.content || <span className="text-gray-400 italic">No content available</span>}
                        </pre>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                        Close
                    </button>
                    <button
                        onClick={onImport}
                        disabled={isImported || isImporting}
                        className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                            isImported
                                ? 'bg-gray-100 text-gray-400 cursor-default'
                                : isImporting
                                  ? 'bg-blue-400 text-white cursor-wait'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {isImported ? 'Already Imported' : isImporting ? 'Importing...' : 'Import'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
