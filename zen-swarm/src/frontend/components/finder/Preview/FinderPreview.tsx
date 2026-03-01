/**
 * FinderPreview - 快速预览面板
 * macOS Quick Look 风格的文件预览
 */

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../../api.js';
import type { PreviewContent } from '../../../types/finder.js';
import { X, Loader2 } from '../../ui/Icons.js';

// ========================================
// Types
// ========================================

interface FinderPreviewProps {
    path: string | null;
    loading: boolean;
    onClose: () => void;
}

// ========================================
// Helper Functions
// ========================================

function getPreviewType(extension?: string, mimeType?: string): PreviewContent['type'] {
    if (!extension && !mimeType) return 'binary';

    const ext = extension?.toLowerCase();

    // Image types
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'].includes(ext || '')) {
        return 'image';
    }

    // Video types
    if (['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext || '')) {
        return 'video';
    }

    // Audio types
    if (['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(ext || '')) {
        return 'audio';
    }

    // PDF
    if (ext === '.pdf') {
        return 'pdf';
    }

    // Markdown
    if (['.md', '.markdown'].includes(ext || '')) {
        return 'markdown';
    }

    // Code files
    if (
        [
            '.ts',
            '.tsx',
            '.js',
            '.jsx',
            '.py',
            '.go',
            '.rs',
            '.java',
            '.c',
            '.cpp',
            '.h',
            '.css',
            '.scss',
            '.html',
            '.json',
            '.yaml',
            '.yml',
            '.sh',
            '.bash',
        ].includes(ext || '')
    ) {
        return 'code';
    }

    // Text files
    if (['.txt', '.log', '.csv'].includes(ext || '')) {
        return 'text';
    }

    return 'binary';
}

function getLanguage(extension?: string): string {
    const langMap: Record<string, string> = {
        '.ts': 'typescript',
        '.tsx': 'tsx',
        '.js': 'javascript',
        '.jsx': 'jsx',
        '.py': 'python',
        '.go': 'go',
        '.rs': 'rust',
        '.java': 'java',
        '.c': 'c',
        '.cpp': 'cpp',
        '.h': 'c',
        '.css': 'css',
        '.scss': 'scss',
        '.html': 'html',
        '.json': 'json',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.sh': 'bash',
        '.bash': 'bash',
        '.md': 'markdown',
    };

    return langMap[extension?.toLowerCase() || ''] || 'text';
}

// ========================================
// Preview Renderers
// ========================================

const ImagePreview: React.FC<{ content: string; path: string }> = ({ content, path }) => {
    return (
        <div className="flex items-center justify-center h-full bg-bg-secondary">
            <img
                src={`data:image/*;base64,${content}`}
                alt={path.split('/').pop() || ''}
                className="max-w-full max-h-full object-contain"
            />
        </div>
    );
};

const VideoPreview: React.FC<{ content: string; path: string }> = ({ content, path }) => {
    return (
        <div className="flex items-center justify-center h-full bg-black">
            <video src={`data:video/*;base64,${content}`} controls className="max-w-full max-h-full" />
        </div>
    );
};

const AudioPreview: React.FC<{ content: string; path: string }> = ({ content, path }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-bg-secondary gap-4">
            <div className="text-6xl">🎵</div>
            <p className="text-lg font-medium">{path.split('/').pop()}</p>
            <audio src={`data:audio/*;base64,${content}`} controls className="w-64" />
        </div>
    );
};

const CodePreview: React.FC<{ content: string; language: string }> = ({ content, language }) => {
    const lines = content.split('\n');

    return (
        <div className="h-full overflow-auto bg-[#1e1e1e] p-4">
            <pre className="text-sm font-mono">
                <code className={`language-${language}`}>
                    {lines.map((line, i) => (
                        <div key={i} className="flex">
                            <span className="w-12 text-right pr-4 text-gray-500 select-none">{i + 1}</span>
                            <span className="text-gray-300">{line}</span>
                        </div>
                    ))}
                </code>
            </pre>
        </div>
    );
};

const MarkdownPreview: React.FC<{ content: string }> = ({ content }) => {
    return (
        <div className="h-full overflow-auto p-6 prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
    );
};

const BinaryPreview: React.FC<{ path: string; size: number }> = ({ path, size }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
            <span className="text-6xl">📦</span>
            <div className="text-center">
                <p className="text-lg font-medium text-text-primary">{path.split('/').pop()}</p>
                <p className="text-sm mt-2">Binary file - {formatSize(size)}</p>
                <p className="text-xs mt-1">Preview not available</p>
            </div>
        </div>
    );
};

function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

// ========================================
// Main Component
// ========================================

export const FinderPreview: React.FC<FinderPreviewProps> = ({ path, loading: initialLoading, onClose }) => {
    const [loading, setLoading] = useState(initialLoading);
    const [content, setContent] = useState<PreviewContent | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load preview content
    useEffect(() => {
        if (!path) {
            setContent(null);
            return;
        }

        const loadPreview = async () => {
            setLoading(true);
            setError(null);

            try {
                // Get file info first
                const info = await apiClient.files.stat.query({ path });

                // Check if file is too large
                if (info.size > 10 * 1024 * 1024) {
                    setError('File too large to preview');
                    setLoading(false);
                    return;
                }

                // Read file content
                const result = await apiClient.files.readFile.query({
                    path,
                    maxSize: 10 * 1024 * 1024,
                });

                if (result.isLarge) {
                    setError('File too large to preview');
                    setLoading(false);
                    return;
                }

                const previewType = getPreviewType(info.extension, info.mimeType);

                setContent({
                    type: previewType,
                    content: result.content || undefined,
                    language: getLanguage(info.extension),
                    size: result.size,
                });
            } catch (err: any) {
                console.error('Failed to load preview:', err);
                setError(err.message || 'Failed to load preview');
            } finally {
                setLoading(false);
            }
        };

        loadPreview();
    }, [path]);

    if (!path) return null;

    return (
        <div className="w-80 border-l border-border-subtle bg-white flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-secondary">
                <span className="text-sm font-medium text-text-primary">Preview</span>
                <button
                    onClick={onClose}
                    className="p-1 rounded text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {loading && (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
                    </div>
                )}

                {error && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-text-muted p-4">
                            <span className="text-4xl block mb-4">⚠️</span>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {!loading && !error && content && (
                    <>
                        {content.type === 'image' && <ImagePreview content={content.content || ''} path={path} />}
                        {content.type === 'video' && <VideoPreview content={content.content || ''} path={path} />}
                        {content.type === 'audio' && <AudioPreview content={content.content || ''} path={path} />}
                        {content.type === 'code' && (
                            <CodePreview content={content.content || ''} language={content.language || 'text'} />
                        )}
                        {content.type === 'markdown' && <MarkdownPreview content={content.content || ''} />}
                        {content.type === 'text' && <CodePreview content={content.content || ''} language="text" />}
                        {content.type === 'binary' && <BinaryPreview path={path} size={content.size} />}
                        {content.type === 'pdf' && <BinaryPreview path={path} size={content.size} />}
                    </>
                )}
            </div>
        </div>
    );
};

export default FinderPreview;
