/**
 * FinderView - macOS 风格文件管理器主视图
 *
 * 布局结构：
 * - 顶部工具栏
 * - 侧边栏（可折叠）
 * - 主内容区域（图标/列表/分栏视图）
 * - 预览面板（可选）
 * - 属性检查器（可选）
 * - 底部状态栏
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { apiClient } from '../../api.js';
import { useFinderStore, sortItems } from '../../stores/finder.js';
import type { FinderFileItem, FinderViewMode } from '../../types/finder.js';
import { FinderToolbar } from '../../components/finder/Toolbar/FinderToolbar.js';
import { FinderSidebar } from '../../components/finder/Sidebar/FinderSidebar.js';
import { FinderIconView } from '../../components/finder/Views/FinderIconView.js';
import { FinderListView } from '../../components/finder/Views/FinderListView.js';
import { FinderColumnView } from '../../components/finder/Views/FinderColumnView.js';
import { FinderContextMenu } from '../../components/finder/ContextMenu/FinderContextMenu.js';
import { FinderPreview } from '../../components/finder/Preview/FinderPreview.js';
import { FinderInspector } from '../../components/finder/Inspector/FinderInspector.js';
import { FinderDialogs } from '../../components/finder/Dialogs/FinderDialogs.js';
import { FinderStatusBar } from '../../components/finder/StatusBar/FinderStatusBar.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

// ========================================
// Constants
// ========================================

const MIN_SIDEBAR_WIDTH = 150;
const MAX_SIDEBAR_WIDTH = 400;
const MIN_PREVIEW_WIDTH = 200;
const MAX_PREVIEW_WIDTH = 500;

// ========================================
// Helper Functions
// ========================================

/**
 * 获取文件图标
 */
function getFileIcon(isDirectory: boolean, extension?: string): string {
    if (isDirectory) return '📁';

    const ext = extension?.toLowerCase();
    const iconMap: Record<string, string> = {
        '.md': '📝',
        '.txt': '📄',
        '.pdf': '📕',
        '.ts': '🔷',
        '.tsx': '⚛️',
        '.js': '🟨',
        '.jsx': '⚛️',
        '.py': '🐍',
        '.go': '🐹',
        '.rs': '🦀',
        '.java': '☕',
        '.json': '📋',
        '.yaml': '⚙️',
        '.yml': '⚙️',
        '.toml': '⚙️',
        '.png': '🖼️',
        '.jpg': '🖼️',
        '.jpeg': '🖼️',
        '.gif': '🎞️',
        '.svg': '🎨',
        '.mp3': '🎵',
        '.mp4': '🎬',
        '.zip': '📦',
        '.tar': '📦',
        '.gz': '📦',
    };

    return iconMap[ext || ''] || '📄';
}

/**
 * 转换后端数据为前端格式
 */
function transformFileItem(item: any, parentPath: string): FinderFileItem {
    return {
        id: item.path,
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size || 0,
        modifiedAt: new Date(item.modifiedAt),
        createdAt: new Date(item.createdAt),
        isHidden: item.isHidden || false,
        extension: item.extension,
        mimeType: item.mimeType,
        icon: item.icon || getFileIcon(item.type === 'directory', item.extension),
    };
}

// ========================================
// Main Component
// ========================================

export const FinderView: React.FC = () => {
    const [searchParams] = useSearchParams();
    const containerRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();

    // Sidebar resize state
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [isResizingPreview, setIsResizingPreview] = useState(false);

    // Store
    const {
        rootPath,
        currentPath,
        items,
        loading,
        error,
        viewOptions,
        selection,
        sidebarCollapsed,
        sidebarWidth,
        preview,
        inspector,
        contextMenu,

        setRootPath,
        setCurrentPath,
        setItems,
        setLoading,
        setError,
        navigateBack,
        navigateForward,
        navigateUp,
        navigateHome,
        setViewMode,
        toggleSort,
        toggleHiddenFiles,
        toggleSidebar,
        setSidebarWidth,
        setSelection,
        clearSelection,
        toggleSelection,
        selectAll,
        openDialog,
        closeDialog,
        openContextMenu,
        closeContextMenu,
        openPreview,
        closePreview,
        openInspector,
        closeInspector,
        copyToClipboard,
        cutToClipboard,
        addFavorite,
    } = useFinderStore();

    // ========================================
    // Initialize root path from URL or API
    // ========================================

    useEffect(() => {
        const initRootPath = async () => {
            const pathParam = searchParams.get('path');
            if (pathParam) {
                setRootPath(pathParam);
                setCurrentPath('/');
            } else {
                try {
                    const result = await apiClient.files.getAllowedRoots.query();
                    if (result.roots.length > 0) {
                        setRootPath(result.roots[0].path);
                        setCurrentPath('/');
                    }
                } catch (err) {
                    console.error('Failed to get allowed roots:', err);
                    setError('无法获取允许访问的根目录');
                }
            }
        };
        initRootPath();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ========================================
    // Load directory contents
    // ========================================

    const loadDirectory = useCallback(
        async (path: string) => {
            if (!rootPath) return;

            setLoading(true);
            setError(undefined);

            // Map sortBy to API-supported values
            const apiSortByMap: Record<string, 'name' | 'size' | 'modifiedAt' | 'type'> = {
                name: 'name',
                size: 'size',
                modifiedAt: 'modifiedAt',
                createdAt: 'modifiedAt',
                kind: 'type',
                extension: 'type',
            };

            const apiSortBy = apiSortByMap[viewOptions.sortBy] || 'name';

            try {
                const result = await apiClient.files.list.query({
                    path,
                    showHidden: viewOptions.showHiddenFiles,
                    sortBy: apiSortBy,
                    sortOrder: viewOptions.sortOrder,
                });

                const transformedItems = result.items.map((item: any) => transformFileItem(item, path));
                const sortedItems = sortItems(transformedItems, viewOptions.sortBy, viewOptions.sortOrder);

                setItems(sortedItems);
                clearSelection();
            } catch (err: any) {
                console.error('Failed to load directory:', err);
                setError(err.message || '加载目录失败');
            } finally {
                setLoading(false);
            }
        },
        [rootPath, viewOptions.showHiddenFiles, viewOptions.sortBy, viewOptions.sortOrder],
    );

    // Load when path changes
    useEffect(() => {
        if (rootPath) {
            loadDirectory(currentPath);
        }
    }, [rootPath, currentPath]); // eslint-disable-line react-hooks/exhaustive-deps

    // Reload when sort options change
    useEffect(() => {
        if (items.length > 0) {
            const sortedItems = sortItems(items, viewOptions.sortBy, viewOptions.sortOrder);
            setItems(sortedItems);
        }
    }, [viewOptions.sortBy, viewOptions.sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

    // ========================================
    // Navigation handlers
    // ========================================

    const handleNavigate = useCallback(
        (path: string) => {
            setCurrentPath(path);
        },
        [setCurrentPath],
    );

    const handleNavigateToItem = useCallback(
        (item: FinderFileItem) => {
            if (item.type === 'directory') {
                handleNavigate(item.path);
            } else {
                // 打开文件预览
                openPreview(item.path);
            }
        },
        [handleNavigate, openPreview],
    );

    // ========================================
    // Selection handlers
    // ========================================

    const handleSelect = useCallback(
        (item: FinderFileItem, event: React.MouseEvent) => {
            if (event.metaKey || event.ctrlKey) {
                toggleSelection(item.path);
            } else if (event.shiftKey && selection.anchorPath) {
                // Range select
                const anchorIndex = items.findIndex((i) => i.path === selection.anchorPath);
                const targetIndex = items.findIndex((i) => i.path === item.path);
                if (anchorIndex !== -1 && targetIndex !== -1) {
                    const start = Math.min(anchorIndex, targetIndex);
                    const end = Math.max(anchorIndex, targetIndex);
                    const rangePaths = items.slice(start, end + 1).map((i) => i.path);
                    setSelection(rangePaths, selection.anchorPath, item.path);
                }
            } else {
                setSelection([item.path], item.path, item.path);
                // 单击文件时打开预览
                if (item.type === 'file') {
                    openPreview(item.path);
                }
            }
        },
        [items, selection.anchorPath, toggleSelection, setSelection, openPreview],
    );

    // ========================================
    // Context menu handlers
    // ========================================

    const handleContextMenu = useCallback(
        (event: React.MouseEvent, item?: FinderFileItem | any) => {
            // 阻止默认行为和事件冒泡（如果 event 有这些方法）
            if (event && typeof event.preventDefault === 'function') {
                event.preventDefault();
            }
            if (event && typeof event.stopPropagation === 'function') {
                event.stopPropagation();
            }

            // 如果是从侧边栏调用的，item 是 SidebarItem 类型
            // SidebarItem 的 type 是 'folder' | 'favorite' | 'tag' | 'device' | 'network'
            // FinderFileItem 的 type 是 'file' | 'directory'
            const isSidebarItem =
                item &&
                item.path &&
                item.name &&
                item.icon &&
                item.id &&
                (item.type === 'folder' ||
                    item.type === 'favorite' ||
                    item.type === 'tag' ||
                    item.type === 'device' ||
                    item.type === 'network');

            let targetPaths: string[] = [];
            let targetPath: string | undefined;
            let explicitType: 'file' | 'directory' | 'multiple' | 'empty-space' | undefined;

            if (isSidebarItem) {
                // 侧边栏项目 - 所有侧边栏项目都是目录（文件夹）
                targetPath = (item as any).path;
                targetPaths = targetPath ? [targetPath] : [];
                explicitType = 'directory';
            } else if (item) {
                // Finder 项目
                const finderItem = item as FinderFileItem;
                targetPath = finderItem.path;
                targetPaths = selection.selectedPaths.has(targetPath)
                    ? Array.from(selection.selectedPaths)
                    : [targetPath];
                explicitType = finderItem.type === 'directory' ? 'directory' : 'file';
            }

            openContextMenu(event.clientX, event.clientY, targetPath, targetPaths, explicitType);
        },
        [selection.selectedPaths, openContextMenu],
    );

    // ========================================
    // Sidebar resize handlers
    // ========================================

    const handleSidebarResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingSidebar(true);
    }, []);

    const handlePreviewResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingPreview(true);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizingSidebar) {
                const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, e.clientX));
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizingSidebar(false);
            setIsResizingPreview(false);
        };

        if (isResizingSidebar || isResizingPreview) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
        return undefined;
    }, [isResizingSidebar, isResizingPreview, setSidebarWidth]);

    // ========================================
    // Keyboard shortcuts
    // ========================================

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 忽略输入框中的快捷键
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdKey = isMac ? e.metaKey : e.ctrlKey;

            // Cmd/Ctrl + A: Select All
            if (cmdKey && e.key === 'a') {
                e.preventDefault();
                selectAll();
            }
            // Cmd/Ctrl + N: New Folder
            else if (cmdKey && e.key === 'n') {
                e.preventDefault();
                openDialog('new-folder', currentPath);
            }
            // Cmd/Ctrl + Shift + N: New File
            else if (cmdKey && e.shiftKey && e.key === 'n') {
                e.preventDefault();
                openDialog('new-file', currentPath);
            }
            // Delete / Cmd + Backspace: Delete
            else if (e.key === 'Delete' || (isMac && cmdKey && e.key === 'Backspace')) {
                if (selection.selectedPaths.size > 0) {
                    e.preventDefault();
                    openDialog('delete', undefined, { paths: Array.from(selection.selectedPaths) });
                }
            }
            // Enter: Rename
            else if (e.key === 'Enter' && selection.selectedPaths.size === 1) {
                e.preventDefault();
                openDialog('rename', Array.from(selection.selectedPaths)[0]);
            }
            // Cmd/Ctrl + C: Copy
            else if (cmdKey && e.key === 'c') {
                if (selection.selectedPaths.size > 0) {
                    e.preventDefault();
                    copyToClipboard(Array.from(selection.selectedPaths));
                }
            }
            // Cmd/Ctrl + X: Cut
            else if (cmdKey && e.key === 'x') {
                if (selection.selectedPaths.size > 0) {
                    e.preventDefault();
                    cutToClipboard(Array.from(selection.selectedPaths));
                }
            }
            // Cmd/Ctrl + V: Paste (handled elsewhere)
            // Cmd/Ctrl + I: Toggle Inspector
            else if (cmdKey && e.key === 'i') {
                e.preventDefault();
                if (inspector.isOpen) {
                    closeInspector();
                } else if (selection.selectedPaths.size === 1) {
                    openInspector(Array.from(selection.selectedPaths)[0]);
                }
            }
            // Space: Quick Look / Preview
            else if (e.key === ' ' && selection.selectedPaths.size === 1) {
                e.preventDefault();
                const selectedPath = Array.from(selection.selectedPaths)[0];
                if (preview.isOpen && preview.targetPath === selectedPath) {
                    closePreview();
                } else {
                    openPreview(selectedPath);
                }
            }
            // Arrow keys for navigation
            else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const currentIndex = items.findIndex((i) => i.path === selection.focusPath);
                let newIndex = currentIndex;

                if (e.key === 'ArrowUp') {
                    newIndex = Math.max(0, currentIndex - 1);
                } else {
                    newIndex = Math.min(items.length - 1, currentIndex + 1);
                }

                if (newIndex !== currentIndex && items[newIndex]) {
                    if (e.shiftKey) {
                        // Extend selection
                        toggleSelection(items[newIndex].path);
                    } else {
                        setSelection([items[newIndex].path], items[newIndex].path, items[newIndex].path);
                    }
                }
            }
            // Escape: Clear selection or close dialogs
            else if (e.key === 'Escape') {
                if (contextMenu.isOpen) {
                    closeContextMenu();
                } else if (preview.isOpen) {
                    closePreview();
                } else if (dialog.type !== 'none') {
                    closeDialog();
                } else {
                    clearSelection();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        selection,
        items,
        contextMenu.isOpen,
        preview.isOpen,
        inspector.isOpen,
        selectAll,
        openDialog,
        closeDialog,
        openPreview,
        closePreview,
        openInspector,
        closeInspector,
        closeContextMenu,
        clearSelection,
        setSelection,
        toggleSelection,
        copyToClipboard,
        cutToClipboard,
        currentPath,
    ]);

    // Get dialog state
    const dialog = useFinderStore((state) => state.dialog);

    // ========================================
    // Render view based on mode
    // ========================================

    const renderView = (): React.ReactElement => {
        const viewProps = {
            items,
            loading,
            selection,
            viewOptions,
            onSelect: handleSelect,
            onDoubleClick: handleNavigateToItem,
            onContextMenu: handleContextMenu,
        };

        switch (viewOptions.viewMode) {
            case 'icons':
                return <FinderIconView {...viewProps} />;
            case 'list':
                return <FinderListView {...viewProps} />;
            case 'columns':
                return (
                    <FinderColumnView
                        {...viewProps}
                        rootPath={rootPath}
                        currentPath={currentPath}
                        onNavigate={handleNavigate}
                    />
                );
            case 'gallery':
                return <FinderIconView {...viewProps} iconSize="xl" />;
            default:
                return <FinderIconView {...viewProps} />;
        }
    };

    // ========================================
    // Render
    // ========================================

    return (
        <div ref={containerRef} className="flex flex-col h-full bg-bg-primary overflow-hidden">
            {/* Toolbar */}
            <FinderToolbar
                currentPath={currentPath}
                viewMode={viewOptions.viewMode}
                showHiddenFiles={viewOptions.showHiddenFiles}
                loading={loading}
                sidebarCollapsed={sidebarCollapsed}
                onNavigateBack={navigateBack}
                onNavigateForward={navigateForward}
                onNavigateUp={navigateUp}
                onNavigateHome={navigateHome}
                onViewModeChange={setViewMode}
                onToggleHiddenFiles={toggleHiddenFiles}
                onNewFolder={() => openDialog('new-folder', currentPath)}
                onNewFile={() => openDialog('new-file', currentPath)}
                onToggleSidebar={toggleSidebar}
            />

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar with Motion animation */}
                <AnimatePresence initial={false}>
                    {!sidebarCollapsed && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: sidebarWidth, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
                            style={{ overflow: 'hidden', flexShrink: 0 }}
                        >
                            <FinderSidebar
                                width={sidebarWidth}
                                currentPath={currentPath}
                                onNavigate={handleNavigate}
                                onToggle={toggleSidebar}
                                onContextMenu={handleContextMenu}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Resize Handle (only when sidebar visible) */}
                {!sidebarCollapsed && (
                    <div
                        className="w-1 cursor-col-resize bg-transparent hover:bg-primary hover:opacity-50 transition-colors"
                        onMouseDown={handleSidebarResizeStart}
                    />
                )}

                {/* Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Main View */}
                    <div className="flex-1 overflow-auto" onContextMenu={(e) => handleContextMenu(e)}>
                        {error && (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center text-text-muted">
                                    <span className="text-4xl mb-4 block">⚠️</span>
                                    <p>{error}</p>
                                    <button
                                        onClick={() => loadDirectory(currentPath)}
                                        className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
                                    >
                                        重试
                                    </button>
                                </div>
                            </div>
                        )}

                        {!error && renderView()}
                    </div>

                    {/* Preview Panel - 移动端不显示 */}
                    {!isMobile && preview.isOpen && (
                        <>
                            <div
                                className="w-1 cursor-col-resize bg-transparent hover:bg-primary hover:opacity-50 transition-colors"
                                onMouseDown={handlePreviewResizeStart}
                            />
                            <FinderPreview path={preview.targetPath} loading={preview.loading} onClose={closePreview} />
                        </>
                    )}

                    {/* Inspector Panel - 移动端不显示 */}
                    {!isMobile && inspector.isOpen && (
                        <FinderInspector
                            path={inspector.targetPath}
                            tab={inspector.tab}
                            onClose={closeInspector}
                            onTabChange={(tab) => useFinderStore.getState().setInspectorTab(tab)}
                        />
                    )}
                </div>
            </div>

            {/* Status Bar */}
            {viewOptions.showStatusBar && (
                <FinderStatusBar currentPath={currentPath} items={items} selection={selection} loading={loading} />
            )}

            {/* Context Menu */}
            {contextMenu.isOpen && (
                <FinderContextMenu
                    position={contextMenu.position}
                    targetPath={contextMenu.targetPath}
                    targetPaths={contextMenu.targetPaths}
                    targetType={contextMenu.targetType}
                    onClose={closeContextMenu}
                />
            )}

            {/* Dialogs */}
            <FinderDialogs
                dialog={dialog}
                currentPath={currentPath}
                onClose={closeDialog}
                onSuccess={() => loadDirectory(currentPath)}
            />
        </div>
    );
};

export default FinderView;
