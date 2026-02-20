/**
 * FileExplorerView - 文件浏览器主视图
 *
 * 类似 Windows 文件管理器的界面，支持：
 * - 浏览文件夹/子文件夹
 * - 创建/删除/重命名文件
 * - 拖拽上传/点击下载
 * - 列表/网格视图切换
 */

import React, { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../api.js';
import type { FileItem, ViewMode, SortBy, SortOrder } from '../types/files.js';
import {
    BreadcrumbNav,
    Toolbar,
    FileList,
    FileGrid,
    DropZone,
    CreateFolderDialog,
    CreateFileDialog,
    RenameDialog,
    DeleteConfirmDialog,
} from '../components/fileExplorer/index.js';

export function FileExplorerView() {
    // 文件列表状态
    const [currentPath, setCurrentPath] = useState('/');
    const [rootPath, setRootPath] = useState(''); // 完整的服务器根路径
    const [rootName, setRootName] = useState('root');
    const [items, setItems] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 视图状态
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [sortBy, setSortBy] = useState<SortBy>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [showHidden, setShowHidden] = useState(false);
    const [selectedPath, setSelectedPath] = useState<string | undefined>();

    // 对话框状态
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [showCreateFile, setShowCreateFile] = useState(false);
    const [renameItem, setRenameItem] = useState<FileItem | null>(null);
    const [deleteItem, setDeleteItem] = useState<FileItem | null>(null);

    // 获取根目录名称
    useEffect(() => {
        apiClient.files.getAllowedRoots.query().then((result) => {
            if (result.roots.length > 0) {
                setRootName(result.roots[0].name || 'root');
                setRootPath(result.roots[0].path);
            }
        });
    }, []);

    // 计算完整路径
    const getFullPath = () => {
        if (!rootPath) return currentPath;
        if (currentPath === '/') return rootPath;
        return rootPath + currentPath;
    };

    // 加载文件列表
    const loadFiles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiClient.files.list.query({
                path: currentPath,
                showHidden,
                sortBy,
                sortOrder,
            });
            // 转换日期字符串为 Date 对象
            const items = result.items.map((item) => ({
                ...item,
                modifiedAt: new Date(item.modifiedAt),
                createdAt: new Date(item.createdAt),
            }));
            setItems(items as FileItem[]);
        } catch (err: any) {
            setError(err.message || 'Failed to load files');
        } finally {
            setLoading(false);
        }
    }, [currentPath, showHidden, sortBy, sortOrder]);

    // 初始加载和路径变化时重新加载
    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    // 导航到路径
    const handleNavigate = useCallback((path: string) => {
        setCurrentPath(path);
        setSelectedPath(undefined);
    }, []);

    // 选择文件
    const handleSelect = useCallback((item: FileItem) => {
        setSelectedPath(item.path);
    }, []);

    // 创建文件夹
    const handleCreateFolder = useCallback(
        async (name: string) => {
            await apiClient.files.createFolder.mutate({
                path: currentPath,
                name,
            });
            await loadFiles();
        },
        [currentPath, loadFiles],
    );

    // 创建文件
    const handleCreateFile = useCallback(
        async (name: string, content?: string) => {
            await apiClient.files.createFile.mutate({
                path: currentPath,
                name,
                content,
            });
            await loadFiles();
        },
        [currentPath, loadFiles],
    );

    // 重命名
    const handleRename = useCallback(
        async (newName: string) => {
            if (!renameItem) return;
            await apiClient.files.rename.mutate({
                oldPath: renameItem.path,
                newName,
            });
            setRenameItem(null);
            await loadFiles();
        },
        [renameItem, loadFiles],
    );

    // 删除
    const handleDelete = useCallback(async () => {
        if (!deleteItem) return;
        await apiClient.files.delete.mutate({
            path: deleteItem.path,
        });
        setDeleteItem(null);
        setSelectedPath(undefined);
        await loadFiles();
    }, [deleteItem, loadFiles]);

    // 下载文件
    const handleDownload = useCallback(async (item: FileItem) => {
        if (item.type !== 'file') return;

        try {
            const result = await apiClient.files.download.query({
                path: item.path,
            });

            // 创建 Blob 并下载
            const byteCharacters = atob(result.content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: result.mimeType });

            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error('Download failed:', err);
        }
    }, []);

    // 上传文件
    const handleUpload = useCallback(
        async (files: File[]) => {
            for (const file of files) {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const base64 = btoa(
                        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
                    );

                    await apiClient.files.upload.mutate({
                        path: currentPath,
                        name: file.name,
                        content: base64,
                        encoding: 'base64',
                    });
                } catch (err: any) {
                    console.error(`Upload failed for ${file.name}:`, err);
                }
            }
            await loadFiles();
        },
        [currentPath, loadFiles],
    );

    // 刷新
    const handleRefresh = useCallback(() => {
        loadFiles();
    }, [loadFiles]);

    return (
        <DropZone onUpload={handleUpload}>
            <div className="flex flex-col gap-4 h-full">
                {/* 面包屑导航 */}
                <BreadcrumbNav
                    path={currentPath}
                    rootName={rootName}
                    fullPath={getFullPath()}
                    onNavigate={handleNavigate}
                />

                {/* 工具栏 */}
                <Toolbar
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    sortOrder={sortOrder}
                    onSortOrderChange={setSortOrder}
                    showHidden={showHidden}
                    onShowHiddenChange={setShowHidden}
                    onCreateFolder={() => setShowCreateFolder(true)}
                    onCreateFile={() => setShowCreateFile(true)}
                    onRefresh={handleRefresh}
                />

                {/* 错误提示 */}
                {error && (
                    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                        <p className="font-medium">Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* 文件列表 */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full"></div>
                        </div>
                    ) : viewMode === 'list' ? (
                        <FileList
                            items={items}
                            onNavigate={handleNavigate}
                            onSelect={handleSelect}
                            onRename={setRenameItem}
                            onDelete={setDeleteItem}
                            onDownload={handleDownload}
                            selectedPath={selectedPath}
                        />
                    ) : (
                        <FileGrid
                            items={items}
                            onNavigate={handleNavigate}
                            onSelect={handleSelect}
                            onRename={setRenameItem}
                            onDelete={setDeleteItem}
                            onDownload={handleDownload}
                            selectedPath={selectedPath}
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
            </div>
        </DropZone>
    );
}
