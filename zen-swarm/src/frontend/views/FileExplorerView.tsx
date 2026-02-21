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

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../api.js';
import type { FileItem } from '../types/files.js';
import {
    FileTree,
    PreviewPanel,
    SearchPanel,
    CreateFolderDialog,
    CreateFileDialog,
    RenameDialog,
    DeleteConfirmDialog,
} from '../components/fileExplorer/index.js';
import type { TreeNode } from '../components/fileExplorer/FileTree/FileTree.js';

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
        <div ref={containerRef} className="flex h-full overflow-hidden">
            {/* 左侧：文件树 */}
            {leftPanelVisible && (
                <div
                    className="flex flex-col h-full bg-[var(--color-bg-secondary)] border-r border-[var(--color-border-subtle)]"
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

            {/* 右侧：搜索 */}
            {rightPanelVisible && (
                <div
                    className="flex flex-col h-full bg-[var(--color-bg-secondary)] border-l border-[var(--color-border-subtle)]"
                    style={{ width: rightPanelWidth }}
                >
                    {/* 面板标题 */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] shrink-0">
                        <span className="text-sm font-medium text-[var(--color-text-secondary)]">SEARCH</span>
                    </div>

                    {/* 搜索面板 - 独立滚动 */}
                    <div className="flex-1 overflow-hidden">
                        <SearchPanel rootPath="/" onResultClick={handleSearchResultClick} />
                    </div>

                    {/* 拖拽调整手柄 */}
                    <div
                        className="absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--color-primary)] hover:opacity-50 transition-colors duration-150"
                        style={{ left: 0 }}
                        onMouseDown={(e) => handleResizeStart('right', e.clientX, rightPanelWidth)}
                    />
                </div>
            )}

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
        </div>
    );
}
