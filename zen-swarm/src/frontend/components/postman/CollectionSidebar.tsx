/**
 * CollectionSidebar — Collections tree with folders and requests
 * Supports: expand/collapse, right-click context menu, folder CRUD
 */

import { useState, useCallback, useRef } from 'react';
import {
    useCollections,
    useCreateCollection,
    useDeleteCollection,
    useFolders,
    useCreateFolder,
    useUpdateFolder,
    useDeleteFolder,
    useRequests,
    useCreateRequest,
    useDeleteRequest,
    useMoveRequest,
} from '../../hooks/usePostman.js';
import { ContextMenu } from './ContextMenu.js';
import type { ContextMenuItem } from './ContextMenu.js';
import type { Collection, Folder, SavedRequest, ActiveRequest } from '../../types/postman.js';
import { METHOD_COLORS } from '../../types/postman.js';
import { exportToCurl } from '../../utils/curlExporter.js';
import { exportToHttpFile } from '../../utils/httpFileExporter.js';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CollectionSidebarProps {
    onSelectRequest: (req: ActiveRequest) => void;
    activeRequestId?: string;
}

interface ContextMenuState {
    x: number;
    y: number;
    items: ContextMenuItem[];
}

// ── Request Row ───────────────────────────────────────────────────────────────

interface RequestRowProps {
    req: SavedRequest;
    depth: number;
    isActive: boolean;
    onSelect: (req: SavedRequest) => void;
    onContextMenu: (e: React.MouseEvent, req: SavedRequest) => void;
}

function RequestRow({ req, depth, isActive, onSelect, onContextMenu }: RequestRowProps) {
    return (
        <div
            onClick={() => onSelect(req)}
            onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(e, req);
            }}
            className={`group flex items-center gap-2 py-1.5 rounded cursor-pointer transition-colors ${
                isActive ? 'bg-primary-light text-primary' : 'hover:bg-bg-hover'
            }`}
            style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '8px' }}
        >
            <span
                className={`text-xs font-bold uppercase w-12 text-right flex-shrink-0 px-1 rounded ${
                    METHOD_COLORS[req.method as keyof typeof METHOD_COLORS] ?? ''
                }`}
            >
                {req.method}
            </span>
            <span className="text-xs truncate flex-1">{req.name}</span>
        </div>
    );
}

// ── Folder Node ───────────────────────────────────────────────────────────────

interface FolderNodeProps {
    folder: Folder;
    allFolders: Folder[];
    allRequests: SavedRequest[];
    depth: number;
    activeRequestId?: string;
    onSelectRequest: (req: SavedRequest) => void;
    onFolderContextMenu: (e: React.MouseEvent, folder: Folder) => void;
    onRequestContextMenu: (e: React.MouseEvent, req: SavedRequest) => void;
}

function FolderNode({
    folder,
    allFolders,
    allRequests,
    depth,
    activeRequestId,
    onSelectRequest,
    onFolderContextMenu,
    onRequestContextMenu,
}: FolderNodeProps) {
    const [expanded, setExpanded] = useState(true);

    const childFolders = allFolders.filter((f) => f.parent_folder_id === folder.id);
    const folderRequests = allRequests.filter((r) => r.folder_id === folder.id);

    return (
        <div>
            {/* Folder header */}
            <div
                className="group flex items-center gap-1 py-1 rounded hover:bg-bg-hover cursor-pointer select-none"
                style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '8px' }}
                onClick={() => setExpanded((v) => !v)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    onFolderContextMenu(e, folder);
                }}
            >
                <span className="text-xs text-text-muted w-3 flex-shrink-0">{expanded ? '▾' : '▸'}</span>
                <span className="text-xs text-text-muted mr-1">📁</span>
                <span className="text-xs font-medium text-text-primary truncate flex-1">{folder.name}</span>
            </div>

            {/* Children */}
            {expanded && (
                <div>
                    {childFolders.map((child) => (
                        <FolderNode
                            key={child.id}
                            folder={child}
                            allFolders={allFolders}
                            allRequests={allRequests}
                            depth={depth + 1}
                            activeRequestId={activeRequestId}
                            onSelectRequest={onSelectRequest}
                            onFolderContextMenu={onFolderContextMenu}
                            onRequestContextMenu={onRequestContextMenu}
                        />
                    ))}
                    {folderRequests.map((req) => (
                        <RequestRow
                            key={req.id}
                            req={req}
                            depth={depth + 1}
                            isActive={activeRequestId === req.id}
                            onSelect={onSelectRequest}
                            onContextMenu={onRequestContextMenu}
                        />
                    ))}
                    {childFolders.length === 0 && folderRequests.length === 0 && (
                        <div
                            className="text-xs text-text-muted italic py-1"
                            style={{ paddingLeft: `${8 + (depth + 1) * 16}px` }}
                        >
                            Empty
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── CollectionItem ────────────────────────────────────────────────────────────

interface CollectionItemProps {
    collection: Collection;
    onSelectRequest: (req: ActiveRequest) => void;
    activeRequestId?: string;
    onDeleteCollection: (id: string) => void;
}

function CollectionItem({ collection, onSelectRequest, activeRequestId, onDeleteCollection }: CollectionItemProps) {
    const [expanded, setExpanded] = useState(true);
    const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    const foldersQuery = useFolders(collection.id);
    const requestsQuery = useRequests(collection.id);
    const createFolderMutation = useCreateFolder();
    const updateFolderMutation = useUpdateFolder();
    const deleteFolderMutation = useDeleteFolder();
    const deleteRequestMutation = useDeleteRequest();
    const moveRequestMutation = useMoveRequest();

    const allFolders: Folder[] = (foldersQuery.data as Folder[] | undefined) ?? [];
    // listRequests returns { folders, requests }
    const allRequests: SavedRequest[] =
        (requestsQuery.data as { requests?: SavedRequest[] } | undefined)?.requests ?? [];

    const handleSelectRequest = useCallback(
        (req: SavedRequest) => {
            onSelectRequest({
                id: req.id,
                collection_id: req.collection_id,
                folder_id: req.folder_id,
                name: req.name,
                method: req.method,
                url: req.url,
                headers: req.headers,
                query_params: req.query_params,
                auth: req.auth,
                body: req.body,
                isDirty: false,
            });
        },
        [onSelectRequest],
    );

    const handleNewFolder = useCallback(
        (parentFolderId: string | null = null) => {
            const name = prompt('Folder name:');
            if (!name?.trim()) return;
            createFolderMutation.mutate({
                id: crypto.randomUUID(),
                collection_id: collection.id,
                parent_folder_id: parentFolderId,
                name: name.trim(),
            });
        },
        [collection.id, createFolderMutation],
    );

    const handleRenameFolder = useCallback((folder: Folder) => {
        setRenamingFolderId(folder.id);
        setRenameValue(folder.name);
        setContextMenu(null);
    }, []);

    const commitRename = useCallback(() => {
        if (!renamingFolderId || !renameValue.trim()) {
            setRenamingFolderId(null);
            return;
        }
        updateFolderMutation.mutate({ id: renamingFolderId, name: renameValue.trim() });
        setRenamingFolderId(null);
    }, [renamingFolderId, renameValue, updateFolderMutation]);

    const handleFolderContextMenu = useCallback(
        (e: React.MouseEvent, folder: Folder) => {
            const requests = allRequests.filter((r) => r.folder_id === folder.id);
            setContextMenu({
                x: e.clientX,
                y: e.clientY,
                items: [
                    {
                        label: 'New Subfolder',
                        onClick: () => handleNewFolder(folder.id),
                    },
                    { label: '', onClick: () => {}, separator: true },
                    {
                        label: 'Rename',
                        onClick: () => handleRenameFolder(folder),
                    },
                    { label: '', onClick: () => {}, separator: true },
                    {
                        label: 'Export as .http',
                        onClick: () => {
                            const content = exportToHttpFile(collection, requests, allFolders);
                            const blob = new Blob([content], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${folder.name}.http`;
                            a.click();
                            URL.revokeObjectURL(url);
                        },
                    },
                    { label: '', onClick: () => {}, separator: true },
                    {
                        label: 'Delete',
                        danger: true,
                        onClick: () => {
                            if (confirm(`Delete folder "${folder.name}" and all its contents?`)) {
                                deleteFolderMutation.mutate({ id: folder.id });
                            }
                        },
                    },
                ],
            });
        },
        [allRequests, allFolders, collection, handleNewFolder, handleRenameFolder, deleteFolderMutation],
    );

    const handleRequestContextMenu = useCallback(
        (e: React.MouseEvent, req: SavedRequest) => {
            setContextMenu({
                x: e.clientX,
                y: e.clientY,
                items: [
                    {
                        label: 'Open',
                        onClick: () => handleSelectRequest(req),
                    },
                    { label: '', onClick: () => {}, separator: true },
                    {
                        label: 'Move to root',
                        onClick: () => moveRequestMutation.mutate({ request_id: req.id, folder_id: null }),
                        disabled: req.folder_id === null,
                    },
                    {
                        label: 'Copy as cURL',
                        onClick: () => {
                            const curl = exportToCurl(req as unknown as import('../../types/postman.js').SavedRequest);
                            navigator.clipboard.writeText(curl).catch(() => {});
                        },
                    },
                    { label: '', onClick: () => {}, separator: true },
                    {
                        label: 'Delete',
                        danger: true,
                        onClick: () => {
                            if (confirm(`Delete request "${req.name}"?`)) {
                                deleteRequestMutation.mutate({ id: req.id });
                            }
                        },
                    },
                ],
            });
        },
        [handleSelectRequest, moveRequestMutation, deleteRequestMutation],
    );

    // Root-level folders (no parent)
    const rootFolders = allFolders.filter((f) => f.parent_folder_id === null);
    // Root-level requests (no folder)
    const rootRequests = allRequests.filter((r) => r.folder_id === null);

    return (
        <div className="mb-0.5">
            {/* Rename overlay if active */}
            {renamingFolderId && <div className="fixed inset-0 z-40" onClick={commitRename} />}

            {/* Collection header */}
            <div className="group flex items-center gap-1 px-2 py-1.5 rounded hover:bg-bg-hover cursor-pointer select-none">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                >
                    <span className="text-xs text-text-muted">{expanded ? '▾' : '▸'}</span>
                    <span className="text-xs font-medium text-text-primary truncate">{collection.name}</span>
                </button>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNewFolder(null);
                        }}
                        title="New folder"
                        className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-primary rounded text-xs"
                    >
                        📁
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCollection(collection.id);
                        }}
                        title="Delete collection"
                        className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-error rounded text-xs"
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* Expanded tree */}
            {expanded && (
                <div>
                    {/* Root folders */}
                    {rootFolders.map((folder) =>
                        renamingFolderId === folder.id ? (
                            <div key={folder.id} className="flex items-center gap-1 pl-4 pr-2 py-0.5">
                                <input
                                    autoFocus
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitRename();
                                        if (e.key === 'Escape') setRenamingFolderId(null);
                                    }}
                                    className="flex-1 px-2 py-0.5 text-xs border border-primary rounded focus:outline-none bg-white"
                                />
                            </div>
                        ) : (
                            <FolderNode
                                key={folder.id}
                                folder={folder}
                                allFolders={allFolders}
                                allRequests={allRequests}
                                depth={1}
                                activeRequestId={activeRequestId}
                                onSelectRequest={handleSelectRequest}
                                onFolderContextMenu={handleFolderContextMenu}
                                onRequestContextMenu={handleRequestContextMenu}
                            />
                        ),
                    )}

                    {/* Root requests */}
                    {rootRequests.map((req) => (
                        <RequestRow
                            key={req.id}
                            req={req}
                            depth={1}
                            isActive={activeRequestId === req.id}
                            onSelect={handleSelectRequest}
                            onContextMenu={handleRequestContextMenu}
                        />
                    ))}

                    {rootFolders.length === 0 && rootRequests.length === 0 && (
                        <div className="px-4 py-1 text-xs text-text-muted italic">No requests yet</div>
                    )}
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenu.items}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
}

// ── CollectionSidebar ─────────────────────────────────────────────────────────

export function CollectionSidebar({ onSelectRequest, activeRequestId }: CollectionSidebarProps) {
    const [showAddCollection, setShowAddCollection] = useState(false);
    const [newColName, setNewColName] = useState('');

    const collectionsQuery = useCollections();
    const createCollectionMutation = useCreateCollection();
    const deleteCollectionMutation = useDeleteCollection();

    const handleAddCollection = useCallback(() => {
        if (!newColName.trim()) return;
        createCollectionMutation.mutate(
            { id: crypto.randomUUID(), name: newColName.trim() },
            {
                onSuccess: () => {
                    setShowAddCollection(false);
                    setNewColName('');
                },
            },
        );
    }, [newColName, createCollectionMutation]);

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border-subtle">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Collections</span>
                <button
                    onClick={() => setShowAddCollection(!showAddCollection)}
                    className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-primary rounded text-sm"
                    title="New collection"
                >
                    +
                </button>
            </div>

            {/* Add collection form */}
            {showAddCollection && (
                <div className="flex-shrink-0 px-2 py-1.5 border-b border-border-subtle flex gap-1">
                    <input
                        autoFocus
                        type="text"
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddCollection();
                            if (e.key === 'Escape') setShowAddCollection(false);
                        }}
                        placeholder="Collection name"
                        className="flex-1 px-2 py-1 text-xs border border-border-primary rounded focus:outline-none bg-white"
                    />
                    <button
                        onClick={handleAddCollection}
                        disabled={createCollectionMutation.isPending}
                        className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50"
                    >
                        Add
                    </button>
                </div>
            )}

            {/* Collections list */}
            <div className="flex-1 overflow-y-auto p-1">
                {collectionsQuery.isLoading && <div className="text-xs text-text-muted p-2">Loading...</div>}
                {(collectionsQuery.data as Collection[] | undefined)?.map((col) => (
                    <CollectionItem
                        key={col.id}
                        collection={col}
                        onSelectRequest={onSelectRequest}
                        activeRequestId={activeRequestId}
                        onDeleteCollection={(id) => {
                            if (confirm(`Delete collection "${col.name}" and all its contents?`)) {
                                deleteCollectionMutation.mutate({ id });
                            }
                        }}
                    />
                ))}
                {collectionsQuery.data?.length === 0 && (
                    <div className="text-xs text-text-muted italic p-2 text-center">
                        <p>No collections yet.</p>
                        <p className="mt-1">Click + to create one.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
