/**
 * PreviewPanel - 文件预览面板
 *
 * 功能：
 * - 代码高亮预览
 * - 超过 1MB 显示"文件过大"提示
 * - 二进制文件显示"不支持预览"
 */

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../api.js';
import type { TreeNode } from '../FileTree/FileTree.js';

// ========================================
// Constants
// ========================================

const MAX_PREVIEW_SIZE = 1 * 1024 * 1024; // 1MB

// 二进制文件扩展名
const BINARY_EXTENSIONS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.ico',
    '.bmp',
    '.mp3',
    '.mp4',
    '.wav',
    '.avi',
    '.mov',
    '.mkv',
    '.zip',
    '.tar',
    '.gz',
    '.rar',
    '.7z',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.db',
    '.sqlite',
    '.sqlite3',
]);

// 语言映射（用于代码高亮）
const LANGUAGE_MAP: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.json': 'json',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
    '.md': 'markdown',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.kt': 'kotlin',
    '.swift': 'swift',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.php': 'php',
    '.lua': 'lua',
    '.sql': 'sql',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'bash',
    '.xml': 'xml',
    '.svg': 'xml',
};

// ========================================
// Types
// ========================================

interface PreviewPanelProps {
    selectedNode: TreeNode | null;
    rootPath?: string;
}

interface PreviewState {
    content: string | null;
    language: string;
    fileSize: number;
    isLargeFile: boolean;
    isBinary: boolean;
    isLoading: boolean;
    error: string | null;
}

// ========================================
// Helper Functions
// ========================================

function isBinaryFile(extension?: string): boolean {
    if (!extension) return false;
    return BINARY_EXTENSIONS.has(extension.toLowerCase());
}

function getLanguage(extension?: string): string {
    if (!extension) return 'plaintext';
    return LANGUAGE_MAP[extension.toLowerCase()] || 'plaintext';
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ========================================
// Components
// ========================================

/**
 * 大文件提示组件
 */
const LargeFileTip: React.FC<{ size: number }> = ({ size }) => (
    <div className="flex flex-col items-center justify-center h-full text-text-muted">
        <div className="text-4xl mb-4">📦</div>
        <p className="text-lg font-medium mb-2">File too large to preview</p>
        <p className="text-sm">File size: {formatFileSize(size)}</p>
        <p className="text-sm mt-1">Maximum preview size: {formatFileSize(MAX_PREVIEW_SIZE)}</p>
    </div>
);

/**
 * 二进制文件提示组件
 */
const BinaryFileTip: React.FC<{ name: string }> = ({ name }) => (
    <div className="flex flex-col items-center justify-center h-full text-text-muted">
        <div className="text-4xl mb-4">🔗</div>
        <p className="text-lg font-medium mb-2">Binary file</p>
        <p className="text-sm">This file type cannot be previewed</p>
        <p className="text-sm mt-1 text-text-tertiary">{name}</p>
    </div>
);

/**
 * 空状态组件
 */
const EmptyState: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full text-text-muted">
        <div className="text-4xl mb-4">📄</div>
        <p className="text-lg font-medium mb-2">No file selected</p>
        <p className="text-sm">Select a file from the tree to preview</p>
    </div>
);

/**
 * 加载状态组件
 */
const LoadingState: React.FC = () => (
    <div className="flex items-center justify-center h-full">
        <div className="loading-spinner w-6 h-6" />
    </div>
);

/**
 * 错误状态组件
 */
const ErrorState: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center h-full text-error">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-lg font-medium mb-2">Failed to load file</p>
        <p className="text-sm">{message}</p>
    </div>
);

/**
 * 代码预览组件
 */
const CodePreview: React.FC<{ content: string; language: string; filePath: string }> = ({
    content,
    language,
    filePath,
}) => {
    const lines = content.split('\n');
    const lineCount = lines.length;

    return (
        <div className="h-full flex flex-col">
            {/* 文件信息栏 */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-tertiary">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="font-mono">{filePath}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span>{lineCount} lines</span>
                    <span>{language}</span>
                    <span>{formatFileSize(content.length)}</span>
                </div>
            </div>

            {/* 代码区域 */}
            <div className="flex-1 overflow-auto">
                <pre className="font-mono text-sm leading-relaxed">
                    <code className={`language-${language}`}>
                        {lines.map((line, index) => (
                            <div key={index} className="flex hover:bg-bg-tertiary">
                                {/* 行号 */}
                                <span className="select-none w-12 px-3 py-0.5 text-right text-text-muted border-r border-border-subtle mr-3">
                                    {index + 1}
                                </span>
                                {/* 代码内容 */}
                                <span className="flex-1 px-3 py-0.5 text-text-primary whitespace-pre">
                                    {line || ' '}
                                </span>
                            </div>
                        ))}
                    </code>
                </pre>
            </div>
        </div>
    );
};

// ========================================
// Main Component
// ========================================

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ selectedNode }) => {
    const [state, setState] = useState<PreviewState>({
        content: null,
        language: 'plaintext',
        fileSize: 0,
        isLargeFile: false,
        isBinary: false,
        isLoading: false,
        error: null,
    });

    // 加载文件内容
    const loadFileContent = useCallback(async (node: TreeNode) => {
        // 目录不预览
        if (node.type === 'directory') {
            setState({
                content: null,
                language: 'plaintext',
                fileSize: 0,
                isLargeFile: false,
                isBinary: false,
                isLoading: false,
                error: null,
            });
            return;
        }

        // 检查是否为二进制文件
        if (isBinaryFile(node.extension)) {
            setState({
                content: null,
                language: 'plaintext',
                fileSize: 0,
                isLargeFile: false,
                isBinary: true,
                isLoading: false,
                error: null,
            });
            return;
        }

        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            const result = await apiClient.files.readFile.query({
                path: node.path,
                maxSize: MAX_PREVIEW_SIZE,
            });

            if (result.isLarge) {
                setState({
                    content: null,
                    language: 'plaintext',
                    fileSize: result.size,
                    isLargeFile: true,
                    isBinary: false,
                    isLoading: false,
                    error: null,
                });
            } else {
                setState({
                    content: result.content,
                    language: getLanguage(node.extension),
                    fileSize: result.size,
                    isLargeFile: false,
                    isBinary: false,
                    isLoading: false,
                    error: null,
                });
            }
        } catch (err: any) {
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: err.message || 'Failed to load file',
            }));
        }
    }, []);

    // 当选中节点变化时加载文件
    useEffect(() => {
        if (selectedNode) {
            loadFileContent(selectedNode);
        } else {
            setState({
                content: null,
                language: 'plaintext',
                fileSize: 0,
                isLargeFile: false,
                isBinary: false,
                isLoading: false,
                error: null,
            });
        }
    }, [selectedNode, loadFileContent]);

    // 渲染
    if (!selectedNode) {
        return <EmptyState />;
    }

    if (selectedNode.type === 'directory') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
                <div className="text-4xl mb-4">📁</div>
                <p className="text-lg font-medium mb-2">{selectedNode.name}</p>
                <p className="text-sm">Select a file to preview its contents</p>
            </div>
        );
    }

    if (state.isLoading) {
        return <LoadingState />;
    }

    if (state.error) {
        return <ErrorState message={state.error} />;
    }

    if (state.isBinary) {
        return <BinaryFileTip name={selectedNode.name} />;
    }

    if (state.isLargeFile) {
        return <LargeFileTip size={state.fileSize} />;
    }

    if (state.content) {
        return <CodePreview content={state.content} language={state.language} filePath={selectedNode.path} />;
    }

    return <EmptyState />;
};

export default PreviewPanel;
