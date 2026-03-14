/**
 * ResponsePanel — display HTTP response
 */

import { useState } from 'react';
import type { SendRequestResult } from '../../types/postman.js';
import { getStatusColor, formatBytes } from '../../types/postman.js';

interface ResponsePanelProps {
    response: SendRequestResult | null;
    isLoading: boolean;
}

type ResponseTab = 'body' | 'headers';

export function ResponsePanel({ response, isLoading }: ResponsePanelProps) {
    const [tab, setTab] = useState<ResponseTab>('body');
    const [prettyPrint, setPrettyPrint] = useState(true);

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
    if (prettyPrint && response.body) {
        try {
            displayBody = JSON.stringify(JSON.parse(response.body), null, 2);
        } catch {
            displayBody = response.body;
        }
    }

    const statusColor = response.error ? 'text-red-600' : getStatusColor(response.status);
    const contentType = response.headers['content-type'] ?? '';
    const isJson = contentType.includes('json');

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

                {/* Pretty print toggle (body tab only) */}
                {tab === 'body' && isJson && (
                    <label className="ml-auto flex items-center gap-1.5 text-xs text-text-muted cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={prettyPrint}
                            onChange={(e) => setPrettyPrint(e.target.checked)}
                            className="w-3 h-3 accent-primary"
                        />
                        Pretty
                    </label>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto min-h-0">
                {tab === 'body' && (
                    <pre className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words text-text-primary bg-neutral-50 min-h-full">
                        {displayBody || <span className="text-text-muted italic">Empty response body</span>}
                    </pre>
                )}

                {tab === 'headers' && (
                    <div className="p-3 space-y-0.5">
                        {Object.entries(response.headers).map(([key, value]) => (
                            <div
                                key={key}
                                className="grid grid-cols-[200px_1fr] gap-2 py-1 px-2 rounded hover:bg-bg-hover text-xs"
                            >
                                <span className="font-mono font-medium text-text-secondary truncate">{key}</span>
                                <span className="font-mono text-text-primary break-all">{value}</span>
                            </div>
                        ))}
                        {Object.keys(response.headers).length === 0 && (
                            <p className="text-xs text-text-muted italic p-2">No response headers</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
