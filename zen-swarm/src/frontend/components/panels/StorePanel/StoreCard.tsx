/**
 * StoreCard — 远程仓库单个条目（表格行）
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
        <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
            {/* 名称 + 类型标签 */}
            <td className="px-4 py-3 w-48">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{item.name}</span>
                    {isImported && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 shrink-0">
                            ✓
                        </span>
                    )}
                </div>
            </td>

            {/* 描述 */}
            <td className="px-4 py-3">
                <p className="text-sm text-gray-500">{item.description ?? <span className="text-gray-300">—</span>}</p>
            </td>

            {/* 元信息 */}
            <td className="px-4 py-3  hidden lg:table-cell">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    {item.version && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded font-mono">
                            v{item.version}
                        </span>
                    )}
                    {item.downloads != null && <span title="Downloads">↓{item.downloads.toLocaleString()}</span>}
                    {item.stars != null && <span title="Stars">★{item.stars.toLocaleString()}</span>}
                </div>
            </td>

            {/* 作者 */}
            <td className="px-4 py-3 hidden lg:table-cell">
                <span className="text-xs text-gray-400 truncate">{item.author ?? '—'}</span>
            </td>

            {/* 操作 */}
            <td className="px-4 py-3 text-right">
                <div className="flex gap-1.5 justify-end">
                    <button
                        onClick={onPreview}
                        className="px-2.5 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-white transition-colors"
                    >
                        Preview
                    </button>
                    <button
                        onClick={onImport}
                        disabled={isImported || isImporting}
                        className={`px-2.5 py-1 text-xs rounded transition-colors font-medium ${
                            isImported
                                ? 'bg-gray-100 text-gray-400 cursor-default'
                                : isImporting
                                  ? 'bg-blue-400 text-white cursor-wait'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {isImported ? 'Imported' : isImporting ? '...' : 'Import'}
                    </button>
                </div>
            </td>
        </tr>
    );
}
