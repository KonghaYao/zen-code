/**
 * StoreCard — 远程仓库单个条目卡片
 */

interface StoreCardProps {
    item: {
        id?: string;
        name: string;
        description?: string;
        tags?: string[];
        author?: string;
        source_url?: string;
        version?: string;
        downloads?: number;
        stars?: number;
    };
    type: 'prompt' | 'skill';
    isImported?: boolean;
    isImporting?: boolean;
    onPreview: () => void;
    onImport: () => void;
}

export function StoreCard({ item, type, isImported, isImporting, onPreview, onImport }: StoreCardProps) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 transition-colors">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="text-base font-medium text-gray-900 truncate">{item.name}</h3>
                        {type === 'skill' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800 shrink-0">
                                Skill
                            </span>
                        )}
                        {type === 'prompt' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 shrink-0">
                                Prompt
                            </span>
                        )}
                        {isImported && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 shrink-0">
                                Imported
                            </span>
                        )}
                    </div>

                    {item.description && <p className="text-sm text-gray-500 line-clamp-2 mb-2">{item.description}</p>}

                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                        {item.author && <span>by {item.author}</span>}
                        {item.version && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded font-mono">
                                v{item.version}
                            </span>
                        )}
                        {item.downloads != null && <span title="Downloads">↓ {item.downloads.toLocaleString()}</span>}
                        {item.stars != null && <span title="Stars">★ {item.stars.toLocaleString()}</span>}
                        {item.tags && Array.isArray(item.tags) && item.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                                {item.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={onPreview}
                        className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Preview
                    </button>
                    <button
                        onClick={onImport}
                        disabled={isImported || isImporting}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                            isImported
                                ? 'bg-gray-100 text-gray-400 cursor-default'
                                : isImporting
                                  ? 'bg-blue-400 text-white cursor-wait'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {isImported ? 'Imported' : isImporting ? 'Importing...' : 'Import'}
                    </button>
                </div>
            </div>
        </div>
    );
}
