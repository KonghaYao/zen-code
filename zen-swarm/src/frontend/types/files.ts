/**
 * File Explorer 类型定义
 */

// ========================================
// File Types
// ========================================

export interface FileItem {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size: number;
    modifiedAt: Date;
    createdAt: Date;
    isHidden: boolean;
    extension?: string;
    icon: string;
}

export interface FileListResult {
    path: string;
    items: FileItem[];
    total: number;
}

export interface FileInfo {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size: number;
    modifiedAt: Date;
    createdAt: Date;
    extension?: string;
    mimeType?: string;
    icon: string;
}

// ========================================
// View Types
// ========================================

export type ViewMode = 'list' | 'grid';

export type SortBy = 'name' | 'size' | 'modifiedAt' | 'type';

export type SortOrder = 'asc' | 'desc';

// ========================================
// Dialog Types
// ========================================

export type DialogType = 'none' | 'createFolder' | 'createFile' | 'rename' | 'delete';

export interface DialogState {
    type: DialogType;
    targetPath?: string;
    targetName?: string;
}
