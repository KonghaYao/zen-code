/**
 * WorkspaceView - VSCode 风格 Workspace 浏览器
 *
 * 布局结构：
 * - 顶部：Workspace 切换器
 * - 左侧：文件树面板 (FileTree) - 独立滚动
 * - 右侧：预览面板 (PreviewPanel) - 独立滚动
 *
 * 功能：
 * - Workspace 切换和管理
 * - 文件树浏览
 * - 文件内容预览（只读，超过 1MB 显示提示）
 * - 使用 ripgrep 搜索文件内容
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { apiClient } from '../api.js';
import { WorkspaceSelector, WorkspaceManageDialog } from '../components/workspace/index.js';
import { FileTree, PreviewPanel, RightPanelContainer } from '../components/fileExplorer/index.js';
import type { TreeNode } from '../components/fileExplorer/FileTree/FileTree.js';
import type { RightPanelType, RightPanelState } from '../components/fileExplorer/RightPanel/index.js';
import {
    useCurrentWorkspace,
    useWorkspaces,
    useIsFirstLaunch,
    useShowManageDialog,
    useWorkspaceStore,
} from '../stores/workspace.js';
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
// Welcome Screen - 首次启动或无 Workspace
// ========================================

interface WelcomeScreenProps {
    onCreateWorkspace: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onCreateWorkspace }) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-primary)]">
            <div className="text-center space-y-4">
                <div className="text-6xl mb-4">📁</div>
                <h1 className="text-2xl font-semibold">Welcome to Workspace</h1>
                <p className="text-[var(--color-text-secondary)] max-w-md">
                    Create a workspace to start exploring your projects. A workspace links to a folder on your computer.
                </p>
                <button
                    onClick={onCreateWorkspace}
                    className="mt-4 px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg transition-colors"
                >
                    Create Workspace
                </button>
            </div>
        </div>
    );
};

// ========================================
// StatusBar Component - VSCode 风格状态栏
// ========================================

interface StatusBarProps {
    rootPath: string;
    selectedNode: TreeNode | null;
    fileCount: number;
    folderCount: number;
}

const StatusBar: React.FC<StatusBarProps> = ({ rootPath, selectedNode, fileCount, folderCount }) => {
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
                    <span className="truncate">{rootPath}</span>
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

export function WorkspaceView() {
    // ========================================
    // Workspace State
    // ========================================
    const currentWorkspace = useCurrentWorkspace();
    const workspaces = useWorkspaces();
    const isFirstLaunch = useIsFirstLaunch();
    const showManageDialog = useShowManageDialog();

    const { openManageDialog, closeManageDialog, loadWorkspaces } = useWorkspaceStore();

    // ========================================
    // State - 文件树
    // ========================================
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [treeLoading, setTreeLoading] = useState(false);
    const [treeError, setTreeError] = useState<string | null>(null);
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
    // Effects - 加载 Workspace 和文件树
    // ========================================

    // 初始化：加载 Workspaces
    useEffect(() => {
        loadWorkspaces();
    }, [loadWorkspaces]);

    // 监听 currentWorkspace 变化，加载文件树
    useEffect(() => {
        if (!currentWorkspace) {
            setTree([]);
            setSelectedNode(null);
            setExpandedPaths(new Set());
            return;
        }

        // 切换 workspace 时重置所有相关状态
        setSelectedNode(null);
        setExpandedPaths(new Set());
        setTreeError(null);

        const loadTree = async () => {
            setTreeLoading(true);
            try {
                const result = await apiClient.files.tree.query({
                    path: currentWorkspace.rootPath,
                    maxDepth: 3,
                });
                setTree(result.tree);
            } catch (err: any) {
                console.error('Failed to load file tree:', err);
                setTreeError(err.message || 'Failed to load file tree');
            } finally {
                setTreeLoading(false);
            }
        };

        loadTree();
    }, [currentWorkspace]);

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

    const handleLeftResizeStart = useCallback((startX: number, startWidth: number) => {
        setResizeState({
            isResizing: true,
            panel: 'left',
            startX,
            startWidth,
        });
    }, []);

    const handleRightResizeStart = useCallback((startX: number, startWidth: number) => {
        setResizeState({
            isResizing: true,
            panel: 'right',
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

    const handleResizeEnd = useCallback(() => {
        setResizeState({
            isResizing: false,
            panel: null,
            startX: 0,
            startWidth: 0,
        });
    }, []);

    useEffect(() => {
        if (resizeState.isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleResizeEnd);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleResizeEnd);
            };
        }
    }, [resizeState, handleMouseMove, handleResizeEnd]);

    // ========================================
    // 首次启动或无 Workspace
    // ========================================

    if (!currentWorkspace || workspaces.length === 0) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                {/* 顶部工具栏 */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    <WorkspaceSelector onOpenManage={openManageDialog} />
                </div>

                {/* 欢迎屏幕 */}
                <WelcomeScreen onCreateWorkspace={openManageDialog} />

                {/* 管理对话框 */}
                <WorkspaceManageDialog open={showManageDialog} onClose={closeManageDialog} />
            </div>
        );
    }

    // ========================================
    // 主界面
    // ========================================

    return (
        <div className="flex flex-col h-full overflow-hidden" ref={containerRef}>
            {/* 顶部工具栏 */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <WorkspaceSelector onOpenManage={openManageDialog} />
            </div>

            {/* 主内容区域 */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* 左侧面板：文件树 */}
                {leftPanelVisible && (
                    <div
                        style={{ width: `${leftPanelWidth}px` }}
                        className="flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
                    >
                        <div className="flex-1 overflow-y-auto overflow-x-hidden">
                            {treeError && (
                                <div className="m-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                            />
                                        </svg>
                                        <span>{treeError}</span>
                                    </div>
                                </div>
                            )}
                            <FileTree
                                tree={tree}
                                selectedPath={selectedNode?.path ?? null}
                                expandedPaths={expandedPaths}
                                onSelect={handleTreeSelect}
                                onToggleExpand={handleTreeToggleExpand}
                                loading={treeLoading}
                            />
                        </div>
                    </div>
                )}

                {/* 调整手柄 */}
                {leftPanelVisible && (
                    <div
                        className="w-1 cursor-col-resize hover:bg-[var(--color-primary)] transition-colors"
                        style={{
                            left: `${leftPanelWidth}px`,
                        }}
                        onMouseDown={(e) => handleLeftResizeStart(e.clientX, leftPanelWidth)}
                    />
                )}

                {/* 中间面板：预览 */}
                <div className="flex-1 overflow-y-auto bg-[var(--color-bg-primary)]">
                    <PreviewPanel rootPath={currentWorkspace.rootPath} selectedPath={selectedNode?.path ?? null} />
                </div>

                {/* 调整手柄 */}
                {rightPanelVisible && (
                    <div
                        className="w-1 cursor-col-resize hover:bg-[var(--color-primary)] transition-colors"
                        style={{
                            right: `${rightPanelWidth}px`,
                        }}
                        onMouseDown={(e) => handleRightResizeStart(e.clientX, rightPanelWidth)}
                    />
                )}

                {/* 右侧面板：搜索 */}
                {rightPanelVisible && (
                    <RightPanelContainer
                        key={currentWorkspace.id}
                        width={rightPanelWidth}
                        rootPath={currentWorkspace.rootPath}
                        activePanel={activeRightPanel}
                        onActivePanelChange={setActiveRightPanel}
                        onSearchResultClick={handleSearchResultClick}
                        onResizeStart={handleRightResizeStart}
                        cwd={currentWorkspace.rootPath}
                    />
                )}
            </div>

            {/* 状态栏 */}
            <StatusBar
                rootPath={currentWorkspace.rootPath}
                selectedNode={selectedNode}
                fileCount={fileCount}
                folderCount={folderCount}
            />

            {/* 管理对话框 */}
            <WorkspaceManageDialog open={showManageDialog} onClose={closeManageDialog} />
        </div>
    );
}
