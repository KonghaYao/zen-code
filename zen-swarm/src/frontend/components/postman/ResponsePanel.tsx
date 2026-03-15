/**
 * ResponsePanel — display HTTP response
 * 增加：Pretty/Raw 切换、复制按钮、搜索高亮、响应头折叠
 */

import { useState, useCallback } from 'react';
import type { SendRequestResult } from '../../types/postman.js';
import { getStatusColor, formatBytes } from '../../types/postman.js';

interface ResponsePanelProps {
    response: SendRequestResult | null;
    isLoading: boolean;
}

type ResponseTab = 'body' | 'headers';
type ViewMode = 'pretty' | 'raw';

const MAX_HIGHLIGHT_BYTES = 100 * 1024; // 100KB

function splitByHighlight(text: string, query: string): React.ReactNode[] {
    if (!query.trim()) return [text];
    const parts: React.ReactNode[] = [];
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let lastIndex = 0;
    let idx = lowerText.indexOf(lowerQuery, lastIndex);
    let key = 0;
    while (idx !== -1) {
        if (idx > lastIndex) parts.push(text.slice(lastIndex, idx));
        parts.push(
            <mark key={key++} className="bg-yellow-200 text-yellow-900 rounded-sm">
                {text.slice(idx, idx + query.length)}
            </mark>,
        );
        lastIndex = idx + query.length;
        idx = lowerText.indexOf(lowerQuery, lastIndex);
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
}

export function ResponsePanel({ response, isLoading }: ResponsePanelProps) {
    const [tab, setTab] = useState<ResponseTab>('body');
    const [viewMode, setViewMode] = useState<ViewMode>('pretty');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [copied, setCopied] = useState(false);
    const [headersExpanded, setHeadersExpanded] = useState(false);

    const handleCopy = useCallback(() => {
        if (!response?.body) return;
        navigator.clipboard.writeText(response.body).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [response?.body]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center text-text-muted">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Sending request...</span>
                </div>
            </div>
        );
    }

    if (!response) {
        return (
            <div className="flex-1 flex items-center justify-center text-text-muted">
                <div className="flex flex-col items-center gap-2 text-center">
                    <span className="text-3xl">📡</span>
                    <p className="text-sm font-medium">No response yet</p>
                    <p className="text-xs">Send a request to see the response here</p>
                </div>
            </div>
        );
    }

    // Format body
    let displayBody = response.body;
    if (viewMode === 'pretty' && response.body) {
        try {
            displayBody = JSON.stringify(JSON.parse(response.body), null, 2);
        } catch {
            displayBody = response.body;
        }
    }

    const statusColor = response.error ? 'text-red-600' : getStatusColor(response.status);
    const contentType = response.headers['content-type'] ?? '';
    const isJson = contentType.includes('json');
    const isTooLarge = (response.body?.length ?? 0) > MAX_HIGHLIGHT_BYTES;

    // 搜索匹配计数
    const matchCount =
        searchQuery && !isTooLarge ? displayBody.toLowerCase().split(searchQuery.toLowerCase()).length - 1 : 0;

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Status bar */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border-subtle bg-bg-secondary">
                {response.error ? (
                    <span className="text-sm font-semibold text-red-600">Error: {response.error}</span>
                ) : (
                    <>
                        <span className={`text-sm font-bold ${statusColor}`}>
                            {response.status} {response.status_text}
                        </span>
                        <span className="text-xs text-text-muted">·</span>
                        <span className="text-xs text-text-muted">{response.time_ms}ms</span>
                        <span className="text-xs text-text-muted">·</span>
                        <span className="text-xs text-text-muted">{formatBytes(response.size_bytes)}</span>
                    </>
                )}
            </div>

            {/* Tab bar */}
            <div className="flex-shrink-0 flex items-center gap-0.5 px-3 pt-2 border-b border-border-subtle bg-bg-secondary">
                {(['body', 'headers'] as ResponseTab[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors capitalize ${
                            tab === t
                                ? 'text-primary border-b-2 border-primary'
                                : 'text-text-muted hover:text-text-primary'
                        }`}
                    >
                        {t}
                        {t === 'headers' && ` (${Object.keys(response.headers).length})`}
                    </button>
                ))}

                {/* Body tab 工具栏 */}
                {tab === 'body' && (
                    <div className="ml-auto flex items-center gap-1">
                        {/* Pretty/Raw 切换 */}
                        {isJson && (
                            <div className="flex border border-border-subtle rounded overflow-hidden">
                                {(['pretty', 'raw'] as ViewMode[]).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setViewMode(m)}
                                        className={`px-2 py-0.5 text-xs capitalize transition-colors ${
                                            viewMode === m
                                                ? 'bg-primary text-white'
                                                : 'text-text-muted hover:bg-bg-hover'
                                        }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 复制按钮 */}
                        <button
                            onClick={handleCopy}
                            className="px-2 py-0.5 text-xs border border-border-subtle rounded hover:bg-bg-hover transition-colors"
                            title="复制响应体"
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>

                        {/* 搜索按钮 */}
                        <button
                            onClick={() => setShowSearch((v) => !v)}
                            className={`px-2 py-0.5 text-xs border rounded transition-colors ${
                                showSearch
                                    ? 'border-primary text-primary bg-primary-light/20'
                                    : 'border-border-subtle text-text-muted hover:bg-bg-hover'
                            }`}
                            title="搜索"
                        >
                            🔍
                        </button>
                    </div>
                )}
            </div>

            {/* 搜索条 */}
            {tab === 'body' && showSearch && (
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-border-subtle bg-bg-secondary">
                    <input
                        autoFocus
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索响应内容..."
                        className="flex-1 px-2 py-1 text-xs border border-border-subtle rounded focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white"
                    />
                    {searchQuery && (
                        <span className="text-xs text-text-muted flex-shrink-0">
                            {isTooLarge ? '内容过大，无法高亮' : `${matchCount} 处匹配`}
                        </span>
                    )}
                    <button
                        onClick={() => {
                            setShowSearch(false);
                            setSearchQuery('');
                        }}
                        className="text-xs text-text-muted hover:text-text-primary"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto min-h-0">
                {tab === 'body' && (
                    <pre className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words text-text-primary bg-neutral-50 min-h-full">
                        {displayBody ? (
                            searchQuery && !isTooLarge ? (
                                splitByHighlight(displayBody, searchQuery)
                            ) : (
                                displayBody
                            )
                        ) : (
                            <span className="text-text-muted italic">Empty response body</span>
                        )}
                    </pre>
                )}

                {tab === 'headers' && (
                    <div className="p-3">
                        {/* 响应头折叠标题 */}
                        <button
                            onClick={() => setHeadersExpanded((v) => !v)}
                            className="flex items-center gap-1 text-xs font-semibold text-text-secondary mb-2 hover:text-text-primary transition-colors"
                        >
                            <span>{headersExpanded ? '▾' : '▸'}</span>
                            <span>Response Headers ({Object.keys(response.headers).length})</span>
                        </button>

                        {headersExpanded && (
                            <div className="space-y-0.5">
                                {Object.entries(response.headers).map(([key, value]) => (
                                    <div
                                        key={key}
                                        className="grid grid-cols-[200px_1fr] gap-2 py-1 px-2 rounded hover:bg-bg-hover text-xs"
                                    >
                                        <span className="font-mono font-medium text-text-secondary truncate">
                                            {key}
                                        </span>
                                        <span className="font-mono text-text-primary break-all">{value}</span>
                                    </div>
                                ))}
                                {Object.keys(response.headers).length === 0 && (
                                    <p className="text-xs text-text-muted italic p-2">No response headers</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
