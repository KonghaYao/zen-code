/**
 * Finder 类型定义
 * macOS 风格文件管理器的类型系统
 */

// ========================================
// 基础文件类型
// ========================================

export interface FinderFileItem {
    id: string;
    name: string;
    path: string;
    type: 'file' | 'directory' | 'symlink';
    size: number;
    modifiedAt: Date;
    createdAt: Date;
    accessedAt?: Date;
    isHidden: boolean;
    extension?: string;
    mimeType?: string;
    icon: string;
    permissions?: FilePermissions;
    owner?: string;
    group?: string;
}

export interface FilePermissions {
    read: boolean;
    write: boolean;
    execute: boolean;
}

// ========================================
// 视图类型
// ========================================

export type FinderViewMode = 'icons' | 'list' | 'columns' | 'gallery';

export type SortBy = 'name' | 'size' | 'modifiedAt' | 'createdAt' | 'kind' | 'extension';

export type SortOrder = 'asc' | 'desc';

export interface ViewOptions {
    viewMode: FinderViewMode;
    sortBy: SortBy;
    sortOrder: SortOrder;
    showHiddenFiles: boolean;
    showPathBar: boolean;
    showStatusBar: boolean;
    showPreview: boolean;
    showInspector: boolean;
    iconSize: 'sm' | 'md' | 'lg' | 'xl';
    gridSize: number;
    listColumns: ListColumn[];
}

export interface ListColumn {
    id: string;
    label: string;
    width: number;
    visible: boolean;
    sortable: boolean;
}

// ========================================
// 侧边栏类型
// ========================================

export interface SidebarSection {
    id: string;
    title: string;
    items: SidebarItem[];
    collapsible?: boolean;
    collapsed?: boolean;
}

export interface SidebarItem {
    id: string;
    name: string;
    path: string;
    icon: string;
    type: 'folder' | 'favorite' | 'tag' | 'device' | 'network';
    badge?: number;
    color?: string;
    isRemovable?: boolean;
}

export type SidebarSectionId =
    | 'favorites'
    | 'airdrop'
    | 'recents'
    | 'applications'
    | 'desktop'
    | 'documents'
    | 'downloads'
    | 'icloud'
    | 'tags'
    | 'locations';

// ========================================
// 选择和导航
// ========================================

export interface SelectionState {
    selectedPaths: Set<string>;
    anchorPath: string | null;
    focusPath: string | null;
    isRangeSelect: boolean;
}

export interface NavigationState {
    currentPath: string;
    history: string[];
    historyIndex: number;
    forwardHistory: string[];
}

// ========================================
// 分栏视图（Column View）专用
// ========================================

export interface ColumnViewState {
    columns: ColumnData[];
    scrollPositions: Map<string, number>;
    activeColumnIndex: number;
}

export interface ColumnData {
    path: string;
    items: FinderFileItem[];
    selectedPath: string | null;
    loading?: boolean;
    error?: string;
}

// ========================================
// 拖拽类型
// ========================================

export interface DragState {
    isDragging: boolean;
    draggedPaths: string[];
    dragType: 'move' | 'copy' | 'link';
    startPosition: { x: number; y: number };
    currentPosition: { x: number; y: number };
    dropTarget: string | null;
}

export type DropEffect = 'copy' | 'move' | 'link' | 'none';

// ========================================
// 右键菜单类型
// ========================================

export interface ContextMenuState {
    isOpen: boolean;
    position: { x: number; y: number };
    targetPath: string | null;
    targetPaths: string[];
    targetType: 'file' | 'directory' | 'multiple' | 'empty-space';
}

export interface ContextMenuItem {
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    disabled?: boolean;
    separator?: boolean;
    submenu?: ContextMenuItem[];
    action?: () => void;
}

// ========================================
// 搜索类型
// ========================================

export interface SearchState {
    query: string;
    isSearching: boolean;
    results: FinderFileItem[];
    searchScope: 'current-folder' | 'this-mac' | 'selected-folders';
    filters: SearchFilter[];
}

export interface SearchFilter {
    type: 'kind' | 'date' | 'name' | 'size' | 'extension';
    operator: 'is' | 'is-not' | 'contains' | 'starts-with' | 'ends-with' | 'greater-than' | 'less-than';
    value: string | number | Date;
}

// ========================================
// 对话框类型
// ========================================

export type DialogType =
    | 'none'
    | 'new-folder'
    | 'new-file'
    | 'rename'
    | 'delete'
    | 'copy'
    | 'move'
    | 'info'
    | 'compress'
    | 'share';

export interface DialogState {
    type: DialogType;
    targetPath?: string;
    targetPaths?: string[];
    data?: Record<string, any>;
}

// ========================================
// 预览类型
// ========================================

export interface PreviewState {
    isOpen: boolean;
    targetPath: string | null;
    loading: boolean;
    error?: string;
    content?: PreviewContent;
}

export interface PreviewContent {
    type: 'text' | 'image' | 'video' | 'audio' | 'pdf' | 'markdown' | 'code' | 'binary';
    content?: string;
    url?: string;
    language?: string;
    size: number;
}

// ========================================
// Inspector（属性面板）类型
// ========================================

export interface InspectorState {
    isOpen: boolean;
    targetPath: string | null;
    tab: 'general' | 'preview' | 'metadata';
}

export interface FileMetadata {
    name: string;
    path: string;
    type: string;
    size: number;
    created: Date;
    modified: Date;
    accessed?: Date;
    owner?: string;
    permissions?: string;
    extension?: string;
    mimeType?: string;
    encoding?: string;
    lineCount?: number;
    wordCount?: number;
    imageWidth?: number;
    imageHeight?: number;
    duration?: number;
}

// ========================================
// 收藏和标签
// ========================================

export interface FavoriteItem {
    id: string;
    name: string;
    path: string;
    icon: string;
    order: number;
    addedAt: Date;
}

export interface TagItem {
    id: string;
    name: string;
    color: string;
    paths: string[];
}

// ========================================
// Store 状态
// ========================================

export interface FinderState {
    // 文件数据
    rootPath: string;
    currentPath: string;
    items: FinderFileItem[];
    loading: boolean;
    error?: string;

    // 视图选项
    viewOptions: ViewOptions;

    // 选择状态
    selection: SelectionState;

    // 导航状态
    navigation: NavigationState;

    // 分栏视图（仅 columns 模式）
    columnView: ColumnViewState;

    // 侧边栏
    sidebarCollapsed: boolean;
    sidebarWidth: number;
    sidebarSections: SidebarSection[];

    // 预览
    preview: PreviewState;

    // Inspector
    inspector: InspectorState;

    // 对话框
    dialog: DialogState;

    // 右键菜单
    contextMenu: ContextMenuState;

    // 拖拽
    drag: DragState;

    // 搜索
    search: SearchState;

    // 收藏和标签
    favorites: FavoriteItem[];
    tags: TagItem[];

    // UI 状态
    sidebarResizing: boolean;
    isFullScreen: boolean;
    clipboardPaths: string[];
    clipboardOperation: 'copy' | 'cut';
}

// ========================================
// API 响应类型（与后端对应）
// ========================================

export interface FileListResponse {
    path: string;
    items: FinderFileItem[];
    total: number;
}

export interface FileTreeResponse {
    path: string;
    tree: TreeNode[];
}

export interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    extension?: string;
    icon: string;
    children?: TreeNode[];
}

// ========================================
// Action 类型
// ========================================

export type FinderAction =
    | { type: 'SET_ROOT_PATH'; payload: string }
    | { type: 'SET_CURRENT_PATH'; payload: string }
    | { type: 'SET_ITEMS'; payload: FinderFileItem[] }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | undefined }
    | { type: 'SET_VIEW_MODE'; payload: FinderViewMode }
    | { type: 'SET_SORT'; payload: { sortBy: SortBy; sortOrder: SortOrder } }
    | { type: 'SET_SELECTION'; payload: { paths: string[]; anchor?: string; focus?: string } }
    | { type: 'CLEAR_SELECTION' }
    | { type: 'TOGGLE_SELECTION'; payload: string }
    | { type: 'SELECT_RANGE'; payload: { from: string; to: string } }
    | { type: 'SELECT_ALL' }
    | { type: 'NAVIGATE_BACK' }
    | { type: 'NAVIGATE_FORWARD' }
    | { type: 'NAVIGATE_TO'; payload: string }
    | { type: 'SET_DIALOG'; payload: DialogState }
    | { type: 'SET_CONTEXT_MENU'; payload: ContextMenuState }
    | { type: 'SET_PREVIEW'; payload: PreviewState }
    | { type: 'SET_INSPECTOR'; payload: InspectorState }
    | { type: 'TOGGLE_SIDEBAR' }
    | { type: 'SET_SIDEBAR_WIDTH'; payload: number }
    | { type: 'SET_COLUMN_DATA'; payload: { index: number; data: ColumnData } }
    | { type: 'ADD_FAVORITE'; payload: FavoriteItem }
    | { type: 'REMOVE_FAVORITE'; payload: string }
    | { type: 'ADD_TAG'; payload: TagItem }
    | { type: 'REMOVE_TAG'; payload: string }
    | { type: 'TAG_FILE'; payload: { tagId: string; path: string } }
    | { type: 'UNTAG_FILE'; payload: { tagId: string; path: string } }
    | { type: 'SET_CLIPBOARD'; payload: { paths: string[]; operation: 'copy' | 'cut' } }
    | { type: 'CLEAR_CLIPBOARD' }
    | { type: 'SET_SEARCH'; payload: Partial<SearchState> }
    | { type: 'RESET' };
