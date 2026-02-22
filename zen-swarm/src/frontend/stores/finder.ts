/**
 * Finder Store - 使用 Zustand 进行状态管理
 * macOS 风格文件管理器的核心状态
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
    FinderState,
    FinderFileItem,
    ViewOptions,
    FinderViewMode,
    SortBy,
    SortOrder,
    SidebarSection,
    FavoriteItem,
    TagItem,
    ColumnData,
    DialogState,
    ContextMenuState,
    PreviewState,
    InspectorState,
    SearchState,
} from '../types/finder.js';

// ========================================
// 默认值
// ========================================

const DEFAULT_VIEW_OPTIONS: ViewOptions = {
    viewMode: 'icons',
    sortBy: 'name',
    sortOrder: 'asc',
    showHiddenFiles: false,
    showPathBar: true,
    showStatusBar: true,
    showPreview: false,
    showInspector: false,
    iconSize: 'md',
    gridSize: 100,
    listColumns: [
        { id: 'name', label: 'Name', width: 300, visible: true, sortable: true },
        { id: 'size', label: 'Size', width: 100, visible: true, sortable: true },
        { id: 'modifiedAt', label: 'Date Modified', width: 180, visible: true, sortable: true },
        { id: 'createdAt', label: 'Date Created', width: 180, visible: false, sortable: true },
        { id: 'kind', label: 'Kind', width: 120, visible: true, sortable: true },
    ],
};

const DEFAULT_SIDEBAR_SECTIONS: SidebarSection[] = [
    {
        id: 'favorites',
        title: 'Favorites',
        collapsible: true,
        collapsed: false,
        items: [
            { id: 'airdrop', name: 'AirDrop', path: 'airdrop://', icon: '📡', type: 'folder' },
            { id: 'recents', name: 'Recents', path: 'recents://', icon: '🕐', type: 'folder' },
            { id: 'applications', name: 'Applications', path: '/Applications', icon: '📱', type: 'folder' },
            { id: 'desktop', name: 'Desktop', path: '~/Desktop', icon: '🖥️', type: 'folder' },
            { id: 'documents', name: 'Documents', path: '~/Documents', icon: '📄', type: 'folder' },
            { id: 'downloads', name: 'Downloads', path: '~/Downloads', icon: '📥', type: 'folder' },
        ],
    },
    {
        id: 'icloud',
        title: 'iCloud',
        collapsible: true,
        collapsed: false,
        items: [{ id: 'icloud-drive', name: 'iCloud Drive', path: 'icloud://', icon: '☁️', type: 'folder' }],
    },
    {
        id: 'locations',
        title: 'Locations',
        collapsible: true,
        collapsed: false,
        items: [{ id: 'network', name: 'Network', path: 'network://', icon: '🌐', type: 'network' }],
    },
    {
        id: 'tags',
        title: 'Tags',
        collapsible: true,
        collapsed: false,
        items: [],
    },
];

// ========================================
// Store 定义
// ========================================

interface FinderStore extends FinderState {
    // 导航操作
    setRootPath: (path: string) => void;
    setCurrentPath: (path: string) => void;
    navigateBack: () => void;
    navigateForward: () => void;
    navigateUp: () => void;
    navigateHome: () => void;

    // 文件操作
    setItems: (items: FinderFileItem[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | undefined) => void;
    refreshItems: () => Promise<void>;

    // 视图操作
    setViewMode: (mode: FinderViewMode) => void;
    setSort: (sortBy: SortBy, sortOrder: SortOrder) => void;
    toggleSort: (sortBy: SortBy) => void;
    setIconSize: (size: ViewOptions['iconSize']) => void;
    toggleHiddenFiles: () => void;
    togglePathBar: () => void;
    toggleStatusBar: () => void;
    togglePreview: () => void;
    toggleInspector: () => void;

    // 选择操作
    setSelection: (paths: string[], anchor?: string, focus?: string) => void;
    addToSelection: (path: string) => void;
    removeFromSelection: (path: string) => void;
    toggleSelection: (path: string) => void;
    selectAll: () => void;
    clearSelection: () => void;
    selectRange: (from: string, to: string) => void;

    // 侧边栏操作
    toggleSidebar: () => void;
    setSidebarWidth: (width: number) => void;
    toggleSidebarSection: (sectionId: string) => void;

    // 分栏视图操作
    setColumnData: (index: number, data: ColumnData) => void;
    addColumn: (data: ColumnData) => void;
    removeColumn: (index: number) => void;
    setActiveColumn: (index: number) => void;

    // 对话框操作
    openDialog: (type: DialogState['type'], targetPath?: string, data?: Record<string, any>) => void;
    closeDialog: () => void;

    // 右键菜单操作
    openContextMenu: (x: number, y: number, targetPath?: string, targetPaths?: string[]) => void;
    closeContextMenu: () => void;

    // 预览操作
    openPreview: (path: string) => void;
    closePreview: () => void;
    setPreviewLoading: (loading: boolean) => void;
    setPreviewContent: (content: any) => void;

    // Inspector 操作
    openInspector: (path: string) => void;
    closeInspector: () => void;
    setInspectorTab: (tab: 'general' | 'preview' | 'metadata') => void;

    // 收藏操作
    addFavorite: (item: FavoriteItem) => void;
    removeFavorite: (id: string) => void;
    reorderFavorites: (fromIndex: number, toIndex: number) => void;

    // 标签操作
    addTag: (tag: TagItem) => void;
    removeTag: (id: string) => void;
    tagFile: (tagId: string, path: string) => void;
    untagFile: (tagId: string, path: string) => void;

    // 剪贴板操作
    copyToClipboard: (paths: string[]) => void;
    cutToClipboard: (paths: string[]) => void;
    clearClipboard: () => void;

    // 搜索操作
    setSearchQuery: (query: string) => void;
    setSearchResults: (results: FinderFileItem[]) => void;
    setSearchLoading: (loading: boolean) => void;
    clearSearch: () => void;

    // 重置
    reset: () => void;
}

// ========================================
// 初始状态
// ========================================

const initialState: FinderState = {
    // 文件数据
    rootPath: '/',
    currentPath: '/',
    items: [],
    loading: false,
    error: undefined,

    // 视图选项
    viewOptions: DEFAULT_VIEW_OPTIONS,

    // 选择状态
    selection: {
        selectedPaths: new Set(),
        anchorPath: null,
        focusPath: null,
        isRangeSelect: false,
    },

    // 导航状态
    navigation: {
        currentPath: '/',
        history: ['/'],
        historyIndex: 0,
        forwardHistory: [],
    },

    // 分栏视图
    columnView: {
        columns: [],
        scrollPositions: new Map(),
        activeColumnIndex: 0,
    },

    // 侧边栏
    sidebarCollapsed: false,
    sidebarWidth: 200,
    sidebarSections: DEFAULT_SIDEBAR_SECTIONS,

    // 预览
    preview: {
        isOpen: false,
        targetPath: null,
        loading: false,
    },

    // Inspector
    inspector: {
        isOpen: false,
        targetPath: null,
        tab: 'general',
    },

    // 对话框
    dialog: {
        type: 'none',
    },

    // 右键菜单
    contextMenu: {
        isOpen: false,
        position: { x: 0, y: 0 },
        targetPath: null,
        targetPaths: [],
        targetType: 'empty-space',
    },

    // 拖拽
    drag: {
        isDragging: false,
        draggedPaths: [],
        dragType: 'move',
        startPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        dropTarget: null,
    },

    // 搜索
    search: {
        query: '',
        isSearching: false,
        results: [],
        searchScope: 'current-folder',
        filters: [],
    },

    // 收藏和标签
    favorites: [],
    tags: [],

    // UI 状态
    sidebarResizing: false,
    isFullScreen: false,
    clipboardPaths: [],
    clipboardOperation: 'copy',
};

// ========================================
// Store 实现
// ========================================

export const useFinderStore = create<FinderStore>()(
    subscribeWithSelector(
        persist(
            (set, get) => ({
                ...initialState,

                // ========================================
                // 导航操作
                // ========================================

                setRootPath: (path) => set({ rootPath: path }),

                setCurrentPath: (path) => {
                    const { navigation } = get();
                    const newHistory = [...navigation.history.slice(0, navigation.historyIndex + 1), path];
                    set({
                        currentPath: path,
                        navigation: {
                            ...navigation,
                            currentPath: path,
                            history: newHistory,
                            historyIndex: newHistory.length - 1,
                            forwardHistory: [],
                        },
                    });
                },

                navigateBack: () => {
                    const { navigation } = get();
                    if (navigation.historyIndex > 0) {
                        const newIndex = navigation.historyIndex - 1;
                        const newPath = navigation.history[newIndex];
                        const currentPath = navigation.history[navigation.historyIndex];
                        set({
                            currentPath: newPath,
                            navigation: {
                                ...navigation,
                                currentPath: newPath,
                                historyIndex: newIndex,
                                forwardHistory: [currentPath, ...navigation.forwardHistory],
                            },
                        });
                    }
                },

                navigateForward: () => {
                    const { navigation } = get();
                    if (navigation.forwardHistory.length > 0) {
                        const newPath = navigation.forwardHistory[0];
                        const newForwardHistory = navigation.forwardHistory.slice(1);
                        const newHistory = [...navigation.history, newPath];
                        set({
                            currentPath: newPath,
                            navigation: {
                                ...navigation,
                                currentPath: newPath,
                                history: newHistory,
                                historyIndex: newHistory.length - 1,
                                forwardHistory: newForwardHistory,
                            },
                        });
                    }
                },

                navigateUp: () => {
                    const { currentPath } = get();
                    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                    if (parentPath !== currentPath) {
                        get().setCurrentPath(parentPath);
                    }
                },

                navigateHome: () => {
                    get().setCurrentPath('/');
                },

                // ========================================
                // 文件操作
                // ========================================

                setItems: (items) => set({ items }),
                setLoading: (loading) => set({ loading }),
                setError: (error) => set({ error }),

                refreshItems: async () => {
                    // 这个方法将在组件中被实际调用
                    // 这里只是一个占位符，实际数据获取由组件处理
                    set({ loading: true });
                },

                // ========================================
                // 视图操作
                // ========================================

                setViewMode: (mode) =>
                    set((state) => ({
                        viewOptions: { ...state.viewOptions, viewMode: mode },
                    })),

                setSort: (sortBy, sortOrder) =>
                    set((state) => ({
                        viewOptions: { ...state.viewOptions, sortBy, sortOrder },
                    })),

                toggleSort: (sortBy) =>
                    set((state) => {
                        const { sortBy: currentSortBy, sortOrder } = state.viewOptions;
                        if (currentSortBy === sortBy) {
                            return {
                                viewOptions: {
                                    ...state.viewOptions,
                                    sortOrder: sortOrder === 'asc' ? 'desc' : 'asc',
                                },
                            };
                        }
                        return {
                            viewOptions: { ...state.viewOptions, sortBy, sortOrder: 'asc' },
                        };
                    }),

                setIconSize: (size) =>
                    set((state) => ({
                        viewOptions: { ...state.viewOptions, iconSize: size },
                    })),

                toggleHiddenFiles: () =>
                    set((state) => ({
                        viewOptions: { ...state.viewOptions, showHiddenFiles: !state.viewOptions.showHiddenFiles },
                    })),

                togglePathBar: () =>
                    set((state) => ({
                        viewOptions: { ...state.viewOptions, showPathBar: !state.viewOptions.showPathBar },
                    })),

                toggleStatusBar: () =>
                    set((state) => ({
                        viewOptions: { ...state.viewOptions, showStatusBar: !state.viewOptions.showStatusBar },
                    })),

                togglePreview: () =>
                    set((state) => ({
                        viewOptions: { ...state.viewOptions, showPreview: !state.viewOptions.showPreview },
                    })),

                toggleInspector: () =>
                    set((state) => ({
                        viewOptions: { ...state.viewOptions, showInspector: !state.viewOptions.showInspector },
                    })),

                // ========================================
                // 选择操作
                // ========================================

                setSelection: (paths, anchor, focus) =>
                    set((state) => ({
                        selection: {
                            selectedPaths: new Set(paths),
                            anchorPath: anchor ?? (paths.length > 0 ? paths[paths.length - 1] : null),
                            focusPath: focus ?? (paths.length > 0 ? paths[paths.length - 1] : null),
                            isRangeSelect: false,
                        },
                    })),

                addToSelection: (path) =>
                    set((state) => {
                        const newSet = new Set(state.selection.selectedPaths);
                        newSet.add(path);
                        return {
                            selection: {
                                ...state.selection,
                                selectedPaths: newSet,
                                focusPath: path,
                            },
                        };
                    }),

                removeFromSelection: (path) =>
                    set((state) => {
                        const newSet = new Set(state.selection.selectedPaths);
                        newSet.delete(path);
                        return {
                            selection: {
                                ...state.selection,
                                selectedPaths: newSet,
                            },
                        };
                    }),

                toggleSelection: (path) =>
                    set((state) => {
                        const newSet = new Set(state.selection.selectedPaths);
                        if (newSet.has(path)) {
                            newSet.delete(path);
                        } else {
                            newSet.add(path);
                        }
                        return {
                            selection: {
                                ...state.selection,
                                selectedPaths: newSet,
                                anchorPath: state.selection.anchorPath || path,
                                focusPath: path,
                            },
                        };
                    }),

                selectAll: () =>
                    set((state) => ({
                        selection: {
                            selectedPaths: new Set(state.items.map((item) => item.path)),
                            anchorPath: state.items[0]?.path || null,
                            focusPath: state.items[state.items.length - 1]?.path || null,
                            isRangeSelect: false,
                        },
                    })),

                clearSelection: () =>
                    set({
                        selection: {
                            selectedPaths: new Set(),
                            anchorPath: null,
                            focusPath: null,
                            isRangeSelect: false,
                        },
                    }),

                selectRange: (from, to) =>
                    set((state) => {
                        const { items } = state;
                        const fromIndex = items.findIndex((item) => item.path === from);
                        const toIndex = items.findIndex((item) => item.path === to);

                        if (fromIndex === -1 || toIndex === -1) return state;

                        const startIndex = Math.min(fromIndex, toIndex);
                        const endIndex = Math.max(fromIndex, toIndex);
                        const newSet = new Set(state.selection.selectedPaths);

                        for (let i = startIndex; i <= endIndex; i++) {
                            newSet.add(items[i].path);
                        }

                        return {
                            selection: {
                                ...state.selection,
                                selectedPaths: newSet,
                                anchorPath: from,
                                focusPath: to,
                                isRangeSelect: true,
                            },
                        };
                    }),

                // ========================================
                // 侧边栏操作
                // ========================================

                toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

                setSidebarWidth: (width) => set({ sidebarWidth: width }),

                toggleSidebarSection: (sectionId) =>
                    set((state) => ({
                        sidebarSections: state.sidebarSections.map((section) =>
                            section.id === sectionId ? { ...section, collapsed: !section.collapsed } : section,
                        ),
                    })),

                // ========================================
                // 分栏视图操作
                // ========================================

                setColumnData: (index, data) =>
                    set((state) => {
                        const columns = [...state.columnView.columns];
                        columns[index] = data;
                        // 移除后续列
                        columns.splice(index + 1);
                        return {
                            columnView: {
                                ...state.columnView,
                                columns,
                                activeColumnIndex: index,
                            },
                        };
                    }),

                addColumn: (data) =>
                    set((state) => ({
                        columnView: {
                            ...state.columnView,
                            columns: [...state.columnView.columns, data],
                            activeColumnIndex: state.columnView.columns.length,
                        },
                    })),

                removeColumn: (index) =>
                    set((state) => ({
                        columnView: {
                            ...state.columnView,
                            columns: state.columnView.columns.slice(0, index),
                            activeColumnIndex: Math.max(0, index - 1),
                        },
                    })),

                setActiveColumn: (index) =>
                    set((state) => ({
                        columnView: {
                            ...state.columnView,
                            activeColumnIndex: index,
                        },
                    })),

                // ========================================
                // 对话框操作
                // ========================================

                openDialog: (type, targetPath, data) =>
                    set({
                        dialog: { type, targetPath, data },
                    }),

                closeDialog: () =>
                    set({
                        dialog: { type: 'none' },
                    }),

                // ========================================
                // 右键菜单操作
                // ========================================

                openContextMenu: (x, y, targetPath, targetPaths) =>
                    set((state) => {
                        let targetType: 'file' | 'directory' | 'multiple' | 'empty-space' = 'empty-space';

                        if (targetPaths && targetPaths.length > 1) {
                            targetType = 'multiple';
                        } else if (targetPath) {
                            const item = state.items.find((i) => i.path === targetPath);
                            targetType = item?.type === 'directory' ? 'directory' : 'file';
                        }

                        return {
                            contextMenu: {
                                isOpen: true,
                                position: { x, y },
                                targetPath: targetPath || null,
                                targetPaths: targetPaths || (targetPath ? [targetPath] : []),
                                targetType,
                            },
                        };
                    }),

                closeContextMenu: () =>
                    set({
                        contextMenu: {
                            isOpen: false,
                            position: { x: 0, y: 0 },
                            targetPath: null,
                            targetPaths: [],
                            targetType: 'empty-space',
                        },
                    }),

                // ========================================
                // 预览操作
                // ========================================

                openPreview: (path) =>
                    set({
                        preview: {
                            isOpen: true,
                            targetPath: path,
                            loading: true,
                        },
                    }),

                closePreview: () =>
                    set({
                        preview: {
                            isOpen: false,
                            targetPath: null,
                            loading: false,
                        },
                    }),

                setPreviewLoading: (loading) =>
                    set((state) => ({
                        preview: { ...state.preview, loading },
                    })),

                setPreviewContent: (content) =>
                    set((state) => ({
                        preview: { ...state.preview, content, loading: false },
                    })),

                // ========================================
                // Inspector 操作
                // ========================================

                openInspector: (path) =>
                    set({
                        inspector: {
                            isOpen: true,
                            targetPath: path,
                            tab: 'general',
                        },
                    }),

                closeInspector: () =>
                    set({
                        inspector: {
                            isOpen: false,
                            targetPath: null,
                            tab: 'general',
                        },
                    }),

                setInspectorTab: (tab) =>
                    set((state) => ({
                        inspector: { ...state.inspector, tab },
                    })),

                // ========================================
                // 收藏操作
                // ========================================

                addFavorite: (item) =>
                    set((state) => ({
                        favorites: [...state.favorites, item],
                    })),

                removeFavorite: (id) =>
                    set((state) => ({
                        favorites: state.favorites.filter((f) => f.id !== id),
                    })),

                reorderFavorites: (fromIndex, toIndex) =>
                    set((state) => {
                        const newFavorites = [...state.favorites];
                        const [removed] = newFavorites.splice(fromIndex, 1);
                        newFavorites.splice(toIndex, 0, removed);
                        return { favorites: newFavorites };
                    }),

                // ========================================
                // 标签操作
                // ========================================

                addTag: (tag) =>
                    set((state) => ({
                        tags: [...state.tags, tag],
                    })),

                removeTag: (id) =>
                    set((state) => ({
                        tags: state.tags.filter((t) => t.id !== id),
                    })),

                tagFile: (tagId, path) =>
                    set((state) => ({
                        tags: state.tags.map((tag) =>
                            tag.id === tagId ? { ...tag, paths: [...tag.paths, path] } : tag,
                        ),
                    })),

                untagFile: (tagId, path) =>
                    set((state) => ({
                        tags: state.tags.map((tag) =>
                            tag.id === tagId ? { ...tag, paths: tag.paths.filter((p) => p !== path) } : tag,
                        ),
                    })),

                // ========================================
                // 剪贴板操作
                // ========================================

                copyToClipboard: (paths) =>
                    set({
                        clipboardPaths: paths,
                        clipboardOperation: 'copy',
                    }),

                cutToClipboard: (paths) =>
                    set({
                        clipboardPaths: paths,
                        clipboardOperation: 'cut',
                    }),

                clearClipboard: () =>
                    set({
                        clipboardPaths: [],
                        clipboardOperation: 'copy',
                    }),

                // ========================================
                // 搜索操作
                // ========================================

                setSearchQuery: (query) =>
                    set((state) => ({
                        search: { ...state.search, query },
                    })),

                setSearchResults: (results) =>
                    set((state) => ({
                        search: { ...state.search, results, isSearching: false },
                    })),

                setSearchLoading: (loading) =>
                    set((state) => ({
                        search: { ...state.search, isSearching: loading },
                    })),

                clearSearch: () =>
                    set({
                        search: {
                            query: '',
                            isSearching: false,
                            results: [],
                            searchScope: 'current-folder',
                            filters: [],
                        },
                    }),

                // ========================================
                // 重置
                // ========================================

                reset: () => set(initialState),
            }),
            {
                name: 'finder-storage',
                // 只持久化部分状态
                partialize: (state) => ({
                    viewOptions: state.viewOptions,
                    sidebarCollapsed: state.sidebarCollapsed,
                    sidebarWidth: state.sidebarWidth,
                    favorites: state.favorites,
                    tags: state.tags,
                }),
            },
        ),
    ),
);

// ========================================
// 选择器 Hooks
// ========================================

export const useCurrentPath = () => useFinderStore((state) => state.currentPath);
export const useItems = () => useFinderStore((state) => state.items);
export const useViewOptions = () => useFinderStore((state) => state.viewOptions);
export const useSelection = () => useFinderStore((state) => state.selection);
export const useIsLoading = () => useFinderStore((state) => state.loading);
export const useSidebarCollapsed = () => useFinderStore((state) => state.sidebarCollapsed);
export const useSidebarWidth = () => useFinderStore((state) => state.sidebarWidth);
export const useDialog = () => useFinderStore((state) => state.dialog);
export const useContextMenu = () => useFinderStore((state) => state.contextMenu);
export const usePreview = () => useFinderStore((state) => state.preview);
export const useInspector = () => useFinderStore((state) => state.inspector);
export const useSearch = () => useFinderStore((state) => state.search);
export const useFavorites = () => useFinderStore((state) => state.favorites);
export const useTags = () => useFinderStore((state) => state.tags);
export const useClipboard = () =>
    useFinderStore((state) => ({
        paths: state.clipboardPaths,
        operation: state.clipboardOperation,
    }));
export const useNavigation = () =>
    useFinderStore((state) => ({
        canGoBack: state.navigation.historyIndex > 0,
        canGoForward: state.navigation.forwardHistory.length > 0,
        canGoUp: state.currentPath !== '/',
        currentPath: state.currentPath,
    }));

// ========================================
// 排序工具函数
// ========================================

export function sortItems(items: FinderFileItem[], sortBy: SortBy, sortOrder: SortOrder): FinderFileItem[] {
    const sorted = [...items].sort((a, b) => {
        // 目录始终在前
        if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
        }

        let comparison = 0;
        switch (sortBy) {
            case 'name':
                comparison = a.name.localeCompare(b.name, undefined, { numeric: true });
                break;
            case 'size':
                comparison = a.size - b.size;
                break;
            case 'modifiedAt':
                comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
                break;
            case 'createdAt':
                comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                break;
            case 'kind':
                comparison = (a.extension || '').localeCompare(b.extension || '');
                break;
            case 'extension':
                comparison = (a.extension || '').localeCompare(b.extension || '');
                break;
            default:
                comparison = 0;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
}

// ========================================
// 格式化工具函数
// ========================================

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatDate(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // 今天
    if (diffDays === 0) {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    // 一周内
    if (diffDays < 7) {
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    // 今年
    if (d.getFullYear() === now.getFullYear()) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    // 更早
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function getFileKind(extension?: string): string {
    if (!extension) return 'Document';

    const kindMap: Record<string, string> = {
        '.ts': 'TypeScript Source',
        '.tsx': 'TypeScript JSX',
        '.js': 'JavaScript Source',
        '.jsx': 'JavaScript JSX',
        '.py': 'Python Source',
        '.go': 'Go Source',
        '.rs': 'Rust Source',
        '.java': 'Java Source',
        '.json': 'JSON Document',
        '.yaml': 'YAML Document',
        '.yml': 'YAML Document',
        '.md': 'Markdown Document',
        '.txt': 'Plain Text',
        '.html': 'HTML Document',
        '.css': 'CSS Stylesheet',
        '.scss': 'SCSS Stylesheet',
        '.png': 'PNG Image',
        '.jpg': 'JPEG Image',
        '.jpeg': 'JPEG Image',
        '.gif': 'GIF Image',
        '.svg': 'SVG Image',
        '.webp': 'WebP Image',
        '.mp3': 'MP3 Audio',
        '.mp4': 'MP4 Video',
        '.pdf': 'PDF Document',
        '.zip': 'ZIP Archive',
        '.tar': 'TAR Archive',
        '.gz': 'GZIP Archive',
    };

    return kindMap[extension.toLowerCase()] || `${extension.slice(1).toUpperCase()} File`;
}
