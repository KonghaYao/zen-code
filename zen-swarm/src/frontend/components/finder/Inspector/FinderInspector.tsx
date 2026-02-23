/**
 * FinderInspector - 属性检查器面板
 * macOS 风格的文件属性查看器
 */

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../../api.js';
import type { FileMetadata } from '../../../types/finder.js';
import { formatFileSize, formatDate, getFileKind } from '../../../stores/finder.js';
import { Loader2, X } from '../../ui/Icons.js';

// ========================================
// Types
// ========================================

interface FinderInspectorProps {
    path: string | null;
    tab: 'general' | 'preview' | 'metadata';
    onClose: () => void;
    onTabChange: (tab: 'general' | 'preview' | 'metadata') => void;
}

// ========================================
// Helper Functions
// ========================================

function getFileExtension(path: string): string {
    const parts = path.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
}

function getFileIcon(type: 'file' | 'directory', extension?: string): string {
    if (type === 'directory') return '📁';
    const iconMap: Record<string, string> = {
        '.md': '📝',
        '.ts': '🔷',
        '.tsx': '⚛️',
        '.js': '🟨',
        '.json': '📋',
        '.yaml': '⚙️',
        '.yml': '⚙️',
        '.png': '🖼️',
        '.jpg': '🖼️',
        '.svg': '🎨',
    };
    return iconMap[extension?.toLowerCase() || ''] || '📄';
}

// ========================================
// Info Row Component
// ========================================

interface InfoRowProps {
    label: string;
    value: React.ReactNode;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
    <div className="flex items-start justify-between py-1.5">
        <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
        <span className="text-xs text-[var(--color-text-primary)] text-right max-w-48 truncate">{value}</span>
    </div>
);

// ========================================
// General Tab
// ========================================

interface GeneralTabProps {
    metadata: FileMetadata | null;
    loading: boolean;
}

const GeneralTab: React.FC<GeneralTabProps> = ({ metadata, loading }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-muted)]" />
            </div>
        );
    }

    if (!metadata) {
        return (
            <div className="flex items-center justify-center h-32 text-[var(--color-text-muted)]">
                No information available
            </div>
        );
    }

    const isDirectory = metadata.type === 'Folder';

    return (
        <div className="p-4 space-y-4">
            {/* Preview icon and name */}
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--color-border-subtle)]">
                <div className="text-5xl">{getFileIcon(isDirectory ? 'directory' : 'file', metadata.extension)}</div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--color-text-primary)] truncate">{metadata.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{metadata.type}</p>
                </div>
            </div>

            {/* File info */}
            <div className="space-y-0">
                {!isDirectory && <InfoRow label="Size" value={formatFileSize(metadata.size)} />}
                <InfoRow label="Created" value={formatDate(metadata.created)} />
                <InfoRow label="Modified" value={formatDate(metadata.modified)} />
                {metadata.accessed && <InfoRow label="Last opened" value={formatDate(metadata.accessed)} />}
            </div>

            {/* Location info */}
            <div className="pt-4 border-t border-[var(--color-border-subtle)] space-y-0">
                <div className="mb-2">
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">Location</span>
                </div>
                <InfoRow
                    label="Where"
                    value={
                        <span className="block truncate" title={metadata.path}>
                            {metadata.path}
                        </span>
                    }
                />
            </div>

            {/* Tags (placeholder) */}
            <div className="pt-4 border-t border-[var(--color-border-subtle)]">
                <div className="mb-2">
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">Tags</span>
                </div>
                <div className="flex flex-wrap gap-1">
                    <button className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                        + Add Tag
                    </button>
                </div>
            </div>

            {/* Comments (placeholder) */}
            <div className="pt-4 border-t border-[var(--color-border-subtle)]">
                <div className="mb-2">
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">Comments</span>
                </div>
                <textarea
                    placeholder="No comments"
                    className="w-full h-16 text-xs p-2 border border-[var(--color-border-subtle)] rounded resize-none focus:outline-none focus:border-[var(--color-primary)]"
                />
            </div>
        </div>
    );
};

// ========================================
// Metadata Tab
// ========================================

interface MetadataTabProps {
    metadata: FileMetadata | null;
    loading: boolean;
}

const MetadataTab: React.FC<MetadataTabProps> = ({ metadata, loading }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-muted)]" />
            </div>
        );
    }

    if (!metadata) {
        return (
            <div className="flex items-center justify-center h-32 text-[var(--color-text-muted)]">
                No metadata available
            </div>
        );
    }

    return (
        <div className="p-4 space-y-0">
            {/* General */}
            <InfoRow label="Name" value={metadata.name} />
            <InfoRow label="Type" value={metadata.type} />
            {metadata.extension && <InfoRow label="Extension" value={metadata.extension} />}
            {metadata.mimeType && <InfoRow label="MIME Type" value={metadata.mimeType} />}
            {metadata.size !== undefined && <InfoRow label="Size" value={`${metadata.size.toLocaleString()} bytes`} />}

            {/* Content info */}
            {metadata.lineCount && <InfoRow label="Lines" value={metadata.lineCount.toLocaleString()} />}
            {metadata.wordCount && <InfoRow label="Words" value={metadata.wordCount.toLocaleString()} />}

            {/* Image info */}
            {metadata.imageWidth && metadata.imageHeight && (
                <>
                    <InfoRow label="Dimensions" value={`${metadata.imageWidth} × ${metadata.imageHeight}`} />
                </>
            )}

            {/* Media info */}
            {metadata.duration && <InfoRow label="Duration" value={`${metadata.duration}s`} />}

            {/* File system info */}
            {metadata.owner && <InfoRow label="Owner" value={metadata.owner} />}
            {metadata.permissions && <InfoRow label="Permissions" value={metadata.permissions} />}
            {metadata.encoding && <InfoRow label="Encoding" value={metadata.encoding} />}

            {/* Dates */}
            <div className="pt-4 border-t border-[var(--color-border-subtle)]">
                <InfoRow label="Created" value={new Date(metadata.created).toISOString()} />
                <InfoRow label="Modified" value={new Date(metadata.modified).toISOString()} />
                {metadata.accessed && <InfoRow label="Accessed" value={new Date(metadata.accessed).toISOString()} />}
            </div>
        </div>
    );
};

// ========================================
// Main Component
// ========================================

export const FinderInspector: React.FC<FinderInspectorProps> = ({ path, tab, onClose, onTabChange }) => {
    const [loading, setLoading] = useState(false);
    const [metadata, setMetadata] = useState<FileMetadata | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load file metadata
    useEffect(() => {
        if (!path) {
            setMetadata(null);
            return;
        }

        const loadMetadata = async () => {
            setLoading(true);
            setError(null);

            try {
                const info = await apiClient.files.stat.query({ path });

                const isDirectory = info.type === 'directory';

                setMetadata({
                    name: info.name,
                    path: info.path,
                    type: isDirectory ? 'Folder' : getFileKind(info.extension),
                    size: info.size,
                    created: new Date(info.createdAt),
                    modified: new Date(info.modifiedAt),
                    extension: info.extension,
                    mimeType: info.mimeType,
                });

                // Try to get additional content info for text files
                if (!isDirectory && info.size < 100000) {
                    try {
                        const content = await apiClient.files.readFile.query({ path, maxSize: 100000 });
                        if (content.content && !content.isLarge) {
                            const lines = content.content.split('\n');
                            const words = content.content.split(/\s+/).filter(Boolean).length;

                            setMetadata((prev) =>
                                prev
                                    ? {
                                          ...prev,
                                          lineCount: lines.length,
                                          wordCount: words,
                                      }
                                    : null,
                            );
                        }
                    } catch {
                        // Ignore content loading errors
                    }
                }
            } catch (err: any) {
                console.error('Failed to load metadata:', err);
                setError(err.message || 'Failed to load file information');
            } finally {
                setLoading(false);
            }
        };

        loadMetadata();
    }, [path]);

    if (!path) return null;

    return (
        <div className="w-72 border-l border-[var(--color-border-subtle)] bg-white flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Inspector</span>
                <button
                    onClick={onClose}
                    className="p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--color-border-subtle)]">
                {[
                    { id: 'general' as const, label: 'General' },
                    { id: 'metadata' as const, label: 'More Info' },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => onTabChange(t.id)}
                        className={`flex-1 px-4 py-2 text-sm transition-colors ${
                            tab === t.id
                                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {error ? (
                    <div className="flex items-center justify-center h-32 text-red-500 p-4">
                        <p className="text-sm text-center">{error}</p>
                    </div>
                ) : (
                    <>
                        {tab === 'general' && <GeneralTab metadata={metadata} loading={loading} />}
                        {tab === 'metadata' && <MetadataTab metadata={metadata} loading={loading} />}
                    </>
                )}
            </div>
        </div>
    );
};

export default FinderInspector;
