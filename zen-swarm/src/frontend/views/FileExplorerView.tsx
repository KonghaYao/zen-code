/**
 * FileExplorerView - VSCode 风格三栏布局文件浏览器
 *
 * 布局结构：
 * - 左侧：文件树面板 (FileTree) - 独立滚动
 * - 中间：预览面板 (PreviewPanel) - 独立滚动
 * - 右侧：搜索面板 (SearchPanel) - 独立滚动
 *
 * 功能：
 * - 双击文件夹展开/折叠
 * - 文件内容预览（超过 1MB 显示提示）
 * - 使用 ripgrep 搜索文件内容
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { apiClient } from '../api.js';
import type { FileItem } from '../types/files.js';
import {
    FileTree,
    PreviewPanel,
    RightPanelContainer,
    CreateFolderDialog,
    CreateFileDialog,
    RenameDialog,
    DeleteConfirmDialog,
} from '../components/fileExplorer/index.js';
import type { TreeNode } from '../components/fileExplorer/FileTree/FileTree.js';
import type { RightPanelType, RightPanelState } from '../components/fileExplorer/RightPanel/index.js';
import { RIGHT_PANEL_STATE_KEY } from '../types/rightPanel.js';

// ========================================
// Types
// ========================================

interface SearchResult {
    filePath: string;
    lineNumber: number;
    lineContent: string;
    matchStart: number;
    matchEnd: number;
}

interface PanelResizeState {
    isResizing: boolean;
    panel: 'left' | 'right' | null;
    startX: number;
    startWidth: number;
}

// ========================================
// Constants
// ========================================

const MIN_PANEL_WIDTH = 200;
const MAX_PANEL_WIDTH_PERCENT = 40;

// ========================================
// StatusBar Component - VSCode 风格状态栏
// ========================================

interface StatusBarProps {
    rootName: string;
    rootPath: string;
    selectedNode: TreeNode | null;
    fileCount: number;
    folderCount: number;
}

const StatusBar: React.FC<StatusBarProps> = ({ rootName, rootPath, selectedNode, fileCount, folderCount }) => {
    // 格式化文件大小
    const formatSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        return `${bytes.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
    };

    // 获取语言显示名
    const getLanguageDisplay = (extension?: string): string => {
        const langMap: Record<string, string> = {
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript React',
            '.js': 'JavaScript',
            '.jsx': 'JavaScript React',
            '.json': 'JSON',
            '.md': 'Markdown',
            '.css': 'CSS',
            '.scss': 'SCSS',
            '.html': 'HTML',
            '.py': 'Python',
            '.go': 'Go',
            '.rs': 'Rust',
            '.java': 'Java',
        };
        if (!extension) return 'Plain Text';
        return langMap[extension.toLowerCase()] || extension.toUpperCase().slice(1);
    };

    return (
        <div className="flex items-center justify-between h-6 px-3 bg-[var(--color-primary)] text-white text-xs">
            {/* 左侧 */}
            <div className="flex items-center gap-4">
                {/* 当前文件夹路径 */}
                <div
                    className="flex items-center gap-1.5 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer max-w-xs"
                    title={rootPath}
                >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                    </svg>
                    <span className="truncate">{rootPath || rootName}</span>
                </div>

                {/* 统计信息 */}
                <div className="flex items-center gap-3 text-white/80">
                    <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        {fileCount} files
                    </span>
                    <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                        </svg>
                        {folderCount} folders
                    </span>
                </div>
            </div>

            {/* 右侧 */}
            <div className="flex items-center gap-4">
                {selectedNode && selectedNode.type === 'file' && (
                    <>
                        {/* 文件大小 */}
                        <span className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
                            {formatSize(selectedNode.size || 0)}
                        </span>

                        {/* 语言类型 */}
                        <span className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
                            {getLanguageDisplay(selectedNode.extension)}
                        </span>
                    </>
                )}

                {/* 编码 */}
                <span className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">UTF-8</span>

                {/* LF/CRLF */}
                <span className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">LF</span>
            </div>
        </div>
    );
};

// ========================================
// Main Component
// ========================================

export function FileExplorerView() {
    // ========================================
    // State - 根目录
    // ========================================
    const [rootPath, setRootPath] = useState('');
    const [rootName, setRootName] = useState('root');

    // ========================================
    // State - 文件树
    // ========================================
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [treeLoading, setTreeLoading] = useState(false);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

    // ========================================
    // State - 面板
    // ========================================
    const [leftPanelWidth, setLeftPanelWidth] = useState(250);
    const [rightPanelWidth, setRightPanelWidth] = useState(280);
    const [leftPanelVisible, setLeftPanelVisible] = useState(true);
    const [rightPanelVisible, setRightPanelVisible] = useState(true);
    const [activeRightPanel, setActiveRightPanel] = useState<RightPanelType>(() => {
        // 从 localStorage 加载上次的面板状态
        try {
            const saved = localStorage.getItem(RIGHT_PANEL_STATE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as RightPanelState;
                return parsed.activePanel || 'search';
            }
        } catch (e) {
            // ignore
        }
        return 'search';
    });
    const [resizeState, setResizeState] = useState<PanelResizeState>({
        isResizing: false,
        panel: null,
        startX: 0,
        startWidth: 0,
    });

    // ========================================
    // State - 对话框
    // ========================================
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [showCreateFile, setShowCreateFile] = useState(false);
    const [renameItem, setRenameItem] = useState<FileItem | null>(null);
    const [deleteItem, setDeleteItem] = useState<FileItem | null>(null);

    // ========================================
    // Refs
    // ========================================
    const containerRef = useRef<HTMLDivElement>(null);

    // ========================================
    // Computed - 统计信息
    // ========================================

    const { files: fileCount, folders: folderCount } = useMemo(() => {
        const countNodes = (nodes: TreeNode[]): { files: number; folders: number } => {
            let files = 0;
            let folders = 0;
            for (const node of nodes) {
                if (node.type === 'file') {
                    files++;
                } else {
                    folders++;
                }
                if (node.children) {
                    const childCounts = countNodes(node.children);
                    files += childCounts.files;
                    folders += childCounts.folders;
                }
            }
            return { files, folders };
        };
        return countNodes(tree);
    }, [tree]);

    // ========================================
    // Effects - 初始化
    // ========================================

    useEffect(() => {
        apiClient.files.getAllowedRoots.query().then((result) => {
            if (result.roots.length > 0) {
                setRootName(result.roots[0].name || 'root');
                setRootPath(result.roots[0].path);
            }
        });
    }, []);

    // ========================================
    // Effects - 加载数据
    // ========================================

    const loadTree = useCallback(async () => {
        if (!rootPath) return;

        setTreeLoading(true);
        try {
            const result = await apiClient.files.tree.query({
                path: '/',
                maxDepth: 3,
            });
            setTree(result.tree);
        } catch (err: any) {
            console.error('Failed to load file tree:', err);
        } finally {
            setTreeLoading(false);
        }
    }, [rootPath]);

    useEffect(() => {
        loadTree();
    }, [loadTree]);

    // ========================================
    // Handlers - 文件树
    // ========================================

    const handleTreeSelect = useCallback((node: TreeNode) => {
        setSelectedNode(node);
    }, []);

    const handleTreeToggleExpand = useCallback((path: string) => {
        setExpandedPaths((prev) => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    // ========================================
    // Handlers - 文件操作
    // ========================================

    const handleCreateFolder = useCallback(
        async (name: string) => {
            await apiClient.files.createFolder.mutate({
                path: '/',
                name,
            });
            await loadTree();
        },
        [loadTree],
    );

    const handleCreateFile = useCallback(
        async (name: string, content?: string) => {
            await apiClient.files.createFile.mutate({
                path: '/',
                name,
                content,
            });
            await loadTree();
        },
        [loadTree],
    );

    const handleRename = useCallback(
        async (newName: string) => {
            if (!renameItem) return;
            await apiClient.files.rename.mutate({
                oldPath: renameItem.path,
                newName,
            });
            setRenameItem(null);
            await loadTree();
        },
        [renameItem, loadTree],
    );

    const handleDelete = useCallback(async () => {
        if (!deleteItem) return;
        await apiClient.files.delete.mutate({
            path: deleteItem.path,
        });
        setDeleteItem(null);
        setSelectedNode(null);
        await loadTree();
    }, [deleteItem, loadTree]);

    // ========================================
    // Handlers - 搜索
    // ========================================

    const handleSearchResultClick = useCallback(
        (result: SearchResult) => {
            const findNode = (nodes: TreeNode[]): TreeNode | null => {
                for (const node of nodes) {
                    if (node.path === result.filePath) return node;
                    if (node.children) {
                        const found = findNode(node.children);
                        if (found) return found;
                    }
                }
                return null;
            };

            const node = findNode(tree);
            if (node) {
                setSelectedNode(node);
                const parentPath = result.filePath.split('/').slice(0, -1).join('/') || '/';
                setExpandedPaths((prev) => new Set([...prev, parentPath]));
            }
        },
        [tree],
    );

    // ========================================
    // Handlers - 面板调整
    // ========================================

    const handleResizeStart = useCallback((panel: 'left' | 'right', startX: number, startWidth: number) => {
        setResizeState({
            isResizing: true,
            panel,
            startX,
            startWidth,
        });
    }, []);

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!resizeState.isResizing || !containerRef.current) return;

            const containerWidth = containerRef.current.offsetWidth;
            const maxWidth = containerWidth * (MAX_PANEL_WIDTH_PERCENT / 100);
            const delta = e.clientX - resizeState.startX;

            if (resizeState.panel === 'left') {
                const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(maxWidth, resizeState.startWidth + delta));
                setLeftPanelWidth(newWidth);
            } else if (resizeState.panel === 'right') {
                const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(maxWidth, resizeState.startWidth - delta));
                setRightPanelWidth(newWidth);
            }
        },
        [resizeState],
    );

    const handleMouseUp = useCallback(() => {
        setResizeState({
            isResizing: false,
            panel: null,
            startX: 0,
            startWidth: 0,
        });
    }, []);

    // ========================================
    // Handlers - 键盘快捷键
    // ========================================

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+Shift+F (Mac) / Ctrl+Shift+F (Windows/Linux) - 切换到 Search
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                setActiveRightPanel('search');
                if (!rightPanelVisible) {
                    setRightPanelVisible(true);
                }
            }
            // Cmd+Shift+I (Mac) / Ctrl+Shift+I (Windows/Linux) - 切换到 Chat
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                setActiveRightPanel('chat');
                if (!rightPanelVisible) {
                    setRightPanelVisible(true);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [rightPanelVisible]);

    useEffect(() => {
        if (resizeState.isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [resizeState.isResizing, handleMouseMove, handleMouseUp]);

    // ========================================
    // Render
    // ========================================

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* 主内容区域 - 三栏布局 */}
            <div ref={containerRef} className="flex flex-1 overflow-hidden">
                {/* 左侧：文件树 */}
                {leftPanelVisible && (
                    <div
                        className="relative flex flex-col h-full bg-[var(--color-bg-secondary)] border-r border-[var(--color-border-subtle)]"
                        style={{ width: leftPanelWidth }}
                    >
                        {/* 面板标题 */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] shrink-0">
                            <span className="text-sm font-medium text-[var(--color-text-secondary)]">EXPLORER</span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setShowCreateFolder(true)}
                                    className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
                                    title="New Folder"
                                >
                                    <svg
                                        className="w-4 h-4 text-[var(--color-text-muted)]"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                                        />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setShowCreateFile(true)}
                                    className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
                                    title="New File"
                                >
                                    <svg
                                        className="w-4 h-4 text-[var(--color-text-muted)]"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                </button>
                                <button
                                    onClick={loadTree}
                                    className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
                                    title="Refresh"
                                >
                                    <svg
                                        className="w-4 h-4 text-[var(--color-text-muted)]"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* 文件树 - 独立滚动 */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden">
                            <FileTree
                                tree={tree}
                                selectedPath={selectedNode?.path || null}
                                expandedPaths={expandedPaths}
                                onSelect={handleTreeSelect}
                                onToggleExpand={handleTreeToggleExpand}
                                loading={treeLoading}
                            />
                        </div>

                        {/* 拖拽调整手柄 */}
                        <div
                            className="absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--color-primary)] hover:opacity-50 transition-colors duration-150"
                            style={{ right: 0 }}
                            onMouseDown={(e) => handleResizeStart('left', e.clientX, leftPanelWidth)}
                        />
                    </div>
                )}

                {/* 中间：预览区 */}
                <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                    {/* 工具栏 */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] shrink-0">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setLeftPanelVisible(!leftPanelVisible)}
                                className={`p-1.5 rounded transition-colors ${leftPanelVisible ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'}`}
                                title="Toggle Explorer"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 6h16M4 12h16M4 18h7"
                                    />
                                </svg>
                            </button>
                            <button
                                onClick={() => setRightPanelVisible(!rightPanelVisible)}
                                className={`p-1.5 rounded transition-colors ${rightPanelVisible ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'}`}
                                title="Toggle Search"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* 当前文件信息 */}
                        {selectedNode && (
                            <div className="flex-1 text-center text-sm text-[var(--color-text-secondary)] truncate px-4">
                                {selectedNode.path}
                            </div>
                        )}
                    </div>

                    {/* 预览内容 - 独立滚动 */}
                    <div className="flex-1 overflow-hidden">
                        <PreviewPanel selectedNode={selectedNode} />
                    </div>
                </div>

                {/* 右侧：Tab 切换面板系统 */}
                {rightPanelVisible && (
                    <RightPanelContainer
                        width={rightPanelWidth}
                        rootPath="/"
                        activePanel={activeRightPanel}
                        onActivePanelChange={setActiveRightPanel}
                        onSearchResultClick={handleSearchResultClick}
                        onResizeStart={(startX, startWidth) => handleResizeStart('right', startX, startWidth)}
                    />
                )}
            </div>

            {/* 对话框 */}
            <CreateFolderDialog
                open={showCreateFolder}
                onClose={() => setShowCreateFolder(false)}
                onSubmit={handleCreateFolder}
            />
            <CreateFileDialog
                open={showCreateFile}
                onClose={() => setShowCreateFile(false)}
                onSubmit={handleCreateFile}
            />
            <RenameDialog
                open={!!renameItem}
                item={renameItem}
                onClose={() => setRenameItem(null)}
                onSubmit={handleRename}
            />
            <DeleteConfirmDialog
                open={!!deleteItem}
                item={deleteItem}
                onClose={() => setDeleteItem(null)}
                onConfirm={handleDelete}
            />

            {/* VSCode 风格状态栏 */}
            <StatusBar
                rootName={rootName}
                rootPath={rootPath}
                selectedNode={selectedNode}
                fileCount={fileCount}
                folderCount={folderCount}
            />
        </div>
    );
}
