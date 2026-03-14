/**
 * CollectionSidebar — left panel with collections and saved requests tree
 */

import { useState, useCallback } from 'react';
import {
    useCollections,
    useCreateCollection,
    useDeleteCollection,
    useRequests,
    useCreateRequest,
    useDeleteRequest,
} from '../../hooks/usePostman.js';
import type { Collection, SavedRequest, ActiveRequest } from '../../types/postman.js';
import { METHOD_COLORS } from '../../types/postman.js';

interface CollectionSidebarProps {
    onSelectRequest: (req: ActiveRequest) => void;
    activeRequestId?: string;
}

interface CollectionItemProps {
    collection: Collection;
    onSelectRequest: (req: ActiveRequest) => void;
    activeRequestId?: string;
    onDeleteCollection: (id: string) => void;
}

function CollectionItem({ collection, onSelectRequest, activeRequestId, onDeleteCollection }: CollectionItemProps) {
    const [expanded, setExpanded] = useState(true);
    const [showAddRequest, setShowAddRequest] = useState(false);
    const [newReqName, setNewReqName] = useState('');

    const requestsQuery = useRequests(collection.id);
    const createRequestMutation = useCreateRequest();
    const deleteRequestMutation = useDeleteRequest();

    const handleAddRequest = useCallback(() => {
        if (!newReqName.trim()) return;
        createRequestMutation.mutate(
            {
                id: crypto.randomUUID(),
                collection_id: collection.id,
                name: newReqName.trim(),
                method: 'GET',
                url: '',
            },
            {
                onSuccess: () => {
                    setShowAddRequest(false);
                    setNewReqName('');
                },
            },
        );
    }, [newReqName, collection.id, createRequestMutation]);

    const handleSelectRequest = useCallback(
        (req: SavedRequest) => {
            onSelectRequest({
                id: req.id,
                collection_id: req.collection_id,
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

    return (
        <div className="mb-0.5">
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
                            setShowAddRequest(!showAddRequest);
                        }}
                        title="Add request"
                        className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-primary rounded text-xs"
                    >
                        +
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

            {/* Add request inline form */}
            {showAddRequest && (
                <div className="mx-2 mb-1 flex gap-1">
                    <input
                        autoFocus
                        type="text"
                        value={newReqName}
                        onChange={(e) => setNewReqName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddRequest();
                            if (e.key === 'Escape') setShowAddRequest(false);
                        }}
                        placeholder="Request name"
                        className="flex-1 px-2 py-1 text-xs border border-border-primary rounded focus:outline-none bg-white"
                    />
                    <button
                        onClick={handleAddRequest}
                        disabled={createRequestMutation.isPending}
                        className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50"
                    >
                        Add
                    </button>
                </div>
            )}

            {/* Request list */}
            {expanded && (
                <div className="pl-3">
                    {requestsQuery.isLoading && <div className="px-2 py-1 text-xs text-text-muted">Loading...</div>}
                    {(requestsQuery.data as SavedRequest[] | undefined)?.map((req) => (
                        <div
                            key={req.id}
                            onClick={() => handleSelectRequest(req)}
                            className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                                activeRequestId === req.id ? 'bg-primary-light text-primary' : 'hover:bg-bg-hover'
                            }`}
                        >
                            <span
                                className={`text-xs font-bold uppercase w-12 text-right flex-shrink-0 px-1 rounded ${METHOD_COLORS[req.method as keyof typeof METHOD_COLORS] ?? ''}`}
                            >
                                {req.method}
                            </span>
                            <span className="text-xs truncate flex-1">{req.name}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteRequestMutation.mutate({ id: req.id });
                                }}
                                className="w-4 h-4 flex items-center justify-center text-text-muted hover:text-error rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    {requestsQuery.data?.length === 0 && !showAddRequest && (
                        <div className="px-2 py-1 text-xs text-text-muted italic">No requests yet</div>
                    )}
                </div>
            )}
        </div>
    );
}

export function CollectionSidebar({ onSelectRequest, activeRequestId }: CollectionSidebarProps) {
    const [showAddCollection, setShowAddCollection] = useState(false);
    const [newColName, setNewColName] = useState('');

    const collectionsQuery = useCollections();
    const createCollectionMutation = useCreateCollection();
    const deleteCollectionMutation = useDeleteCollection();

    const handleAddCollection = useCallback(() => {
        if (!newColName.trim()) return;
        createCollectionMutation.mutate(
            {
                id: crypto.randomUUID(),
                name: newColName.trim(),
            },
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
            <div className="flex-1 overflow-y-auto p-2">
                {collectionsQuery.isLoading && <div className="text-xs text-text-muted p-2">Loading...</div>}
                {(collectionsQuery.data as Collection[] | undefined)?.map((col) => (
                    <CollectionItem
                        key={col.id}
                        collection={col}
                        onSelectRequest={onSelectRequest}
                        activeRequestId={activeRequestId}
                        onDeleteCollection={(id) => deleteCollectionMutation.mutate({ id })}
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
