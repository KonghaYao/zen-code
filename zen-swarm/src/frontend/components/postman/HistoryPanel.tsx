/**
 * HistoryPanel — shows previous request executions
 */

import { useCallback } from 'react';
import { useHistory, useClearHistory, useDeleteHistoryEntry } from '../../hooks/usePostman.js';
import type { HistoryEntry, ActiveRequest } from '../../types/postman.js';
import { METHOD_COLORS, getStatusColor } from '../../types/postman.js';

interface HistoryPanelProps {
    onLoadHistory: (entry: HistoryEntry) => void;
}

function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
}

export function HistoryPanel({ onLoadHistory }: HistoryPanelProps) {
    const historyQuery = useHistory(100);
    const clearHistoryMutation = useClearHistory();
    const deleteEntryMutation = useDeleteHistoryEntry();

    const handleLoad = useCallback(
        (entry: HistoryEntry) => {
            onLoadHistory(entry);
        },
        [onLoadHistory],
    );

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border-subtle">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">History</span>
                {(historyQuery.data?.length ?? 0) > 0 && (
                    <button
                        onClick={() => clearHistoryMutation.mutate({})}
                        className="text-xs text-text-muted hover:text-error transition-colors"
                    >
                        Clear all
                    </button>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {historyQuery.isLoading && <div className="text-xs text-text-muted p-3">Loading...</div>}
                {(historyQuery.data as HistoryEntry[] | undefined)?.map((entry) => (
                    <div
                        key={entry.id}
                        onClick={() => handleLoad(entry)}
                        className="group flex flex-col gap-0.5 px-3 py-2 hover:bg-bg-hover cursor-pointer border-b border-border-subtle/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span
                                className={`text-xs font-bold px-1 rounded ${METHOD_COLORS[entry.method as keyof typeof METHOD_COLORS] ?? ''}`}
                            >
                                {entry.method}
                            </span>
                            {entry.response_status ? (
                                <span className={`text-xs font-mono ${getStatusColor(entry.response_status)}`}>
                                    {entry.response_status}
                                </span>
                            ) : entry.error ? (
                                <span className="text-xs text-red-500">ERR</span>
                            ) : null}
                            <span className="text-xs text-text-muted ml-auto flex-shrink-0">
                                {formatTime(entry.executed_at)}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteEntryMutation.mutate({ id: entry.id });
                                }}
                                className="w-4 h-4 flex items-center justify-center text-text-muted hover:text-error text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                ×
                            </button>
                        </div>
                        <span className="text-xs font-mono text-text-secondary truncate">{entry.url}</span>
                        {entry.response_time_ms && (
                            <span className="text-xs text-text-muted">{entry.response_time_ms}ms</span>
                        )}
                    </div>
                ))}
                {historyQuery.data?.length === 0 && (
                    <div className="text-xs text-text-muted italic p-3 text-center">No history yet</div>
                )}
            </div>
        </div>
    );
}
