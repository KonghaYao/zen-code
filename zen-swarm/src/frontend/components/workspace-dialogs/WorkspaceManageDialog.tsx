/**
 * WorkspaceManageDialog - Workspace 管理对话框
 *
 * 功能：
 * - 显示所有 Workspace 列表
 * - 创建新 Workspace
 * - 编辑 Workspace（名称、描述）
 * - 删除 Workspace
 */

import React, { useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.js';
import { useWorkspaces, useCurrentWorkspace } from '../../stores/workspace.js';
import type { Workspace } from '../../stores/workspace.js';
import { X, Plus, Edit, Trash2, Folder } from '../ui/Icons.js';
import { IconButton } from '../ui/IconButton.js';

// ========================================
// Props
// ========================================

interface WorkspaceManageDialogProps {
    open: boolean;
    onClose: () => void;
    initialWorkspaceId?: string; // 如果提供，直接进入编辑模式
}

// ========================================
// 子组件：CreateWorkspaceForm
// ========================================

interface CreateWorkspaceFormProps {
    onClose: () => void;
}

const CreateWorkspaceForm: React.FC<CreateWorkspaceFormProps> = ({ onClose }) => {
    const [name, setName] = useState('');
    const [rootPath, setRootPath] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');

    const { createWorkspace } = useWorkspaceStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            await createWorkspace({ name, rootPath, description: description || undefined });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create workspace');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">{error}</div>
            )}

            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                    Name <span className="text-red-400">*</span>
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., zen-swarm"
                    required
                    className="w-full px-3 py-2 bg-bg-secondary border border-gray-200 rounded text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                    Root Path <span className="text-red-400">*</span>
                </label>
                <input
                    type="text"
                    value={rootPath}
                    onChange={(e) => setRootPath(e.target.value)}
                    placeholder="e.g., /Users/xxx/projects/zen-swarm"
                    required
                    className="w-full px-3 py-2 bg-bg-secondary border border-gray-200 rounded text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-text-secondary mt-1">Path to the project directory</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                    Description <span className="text-text-secondary">(optional)</span>
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Main project workspace"
                    rows={3}
                    className="w-full px-3 py-2 bg-bg-secondary border border-gray-200 rounded text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary resize-none"
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded transition-colors"
                >
                    Create
                </button>
            </div>
        </form>
    );
};

// ========================================
// 子组件：EditWorkspaceForm
// ========================================

interface EditWorkspaceFormProps {
    workspace: Workspace;
    onClose: () => void;
}

const EditWorkspaceForm: React.FC<EditWorkspaceFormProps> = ({ workspace, onClose }) => {
    const [name, setName] = useState(workspace.name);
    const [description, setDescription] = useState(workspace.description || '');
    const [error, setError] = useState('');

    const { updateWorkspace } = useWorkspaceStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            await updateWorkspace({ id: workspace.id, name, description: description || undefined });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update workspace');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">{error}</div>
            )}

            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                    Name <span className="text-red-400">*</span>
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-bg-secondary border border-gray-200 rounded text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                    Root Path <span className="text-text-secondary">(read-only)</span>
                </label>
                <input
                    type="text"
                    value={workspace.rootPath}
                    readOnly
                    className="w-full px-3 py-2 bg-bg-tertiary border border-gray-200 rounded text-text-secondary cursor-not-allowed"
                />
                <p className="text-xs text-text-secondary mt-1">Path cannot be changed after creation</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                    Description <span className="text-text-secondary">(optional)</span>
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-bg-secondary border border-gray-200 rounded text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary resize-none"
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded transition-colors"
                >
                    Save
                </button>
            </div>
        </form>
    );
};

// ========================================
// 子组件：DeleteConfirmDialog
// ========================================

interface DeleteConfirmDialogProps {
    workspace: Workspace;
    onConfirm: () => void;
    onCancel: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({ workspace, onConfirm, onCancel }) => {
    return (
        <div>
            <p className="text-text-primary mb-4">
                Are you sure you want to delete <span className="font-medium">{workspace.name}</span>?
            </p>
            <p className="text-sm text-text-secondary mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                >
                    Delete
                </button>
            </div>
        </div>
    );
};

// ========================================
// 主组件
// ========================================

export const WorkspaceManageDialog: React.FC<WorkspaceManageDialogProps> = ({ open, onClose, initialWorkspaceId }) => {
    const workspaces = useWorkspaces();
    const currentWorkspace = useCurrentWorkspace();

    const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'delete'>('list');
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

    // 如果提供了 initialWorkspaceId，直接进入编辑模式
    React.useEffect(() => {
        if (open && initialWorkspaceId) {
            const workspace = workspaces.find((w) => w.id === initialWorkspaceId);
            if (workspace) {
                setSelectedWorkspace(workspace);
                setMode('edit');
            }
        }
    }, [open, initialWorkspaceId, workspaces]);

    // 重置模式当对话框关闭时
    React.useEffect(() => {
        if (!open) {
            setMode('list');
            setSelectedWorkspace(null);
        }
    }, [open]);

    // 格式化时间
    const formatTime = (dateString?: string): string => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) {
            return `${diffMins} minutes ago`;
        }
        const diffHours = Math.floor(diffMins / 3600);
        if (diffHours < 24) {
            return `${diffHours} hours ago`;
        }
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffDays < 7) {
            return `${diffDays} days ago`;
        }
        return date.toLocaleDateString();
    };

    // 删除 Workspace
    const handleDelete = async () => {
        if (!selectedWorkspace) return;

        try {
            await useWorkspaceStore.getState().deleteWorkspace(selectedWorkspace.id);
            setSelectedWorkspace(null);
            setMode('list');
        } catch (err) {
            console.error('Failed to delete workspace:', err);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 背景遮罩 */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* 对话框 */}
            <div className="relative bg-bg-primary border border-gray-200 rounded-lg shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                {/* 标题栏 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-text-primary">
                        {mode === 'list' && 'Workspace Management'}
                        {mode === 'create' && 'Create Workspace'}
                        {mode === 'edit' && 'Edit Workspace'}
                        {mode === 'delete' && 'Delete Workspace'}
                    </h2>
                    <IconButton onClick={onClose} variant="default" title="Close">
                        <X className="w-5 h-5" />
                    </IconButton>
                </div>

                {/* 内容区域 */}
                <div className="px-6 py-4 overflow-y-auto flex-1">
                    {mode === 'list' && (
                        <div className="space-y-4">
                            {/* 新建按钮 */}
                            <button
                                onClick={() => setMode('create')}
                                className="w-full px-4 py-3 bg-bg-secondary hover:bg-bg-hover border border-gray-200 rounded text-text-primary text-left transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-primary" />
                                    <span className="font-medium">Create New Workspace</span>
                                </div>
                            </button>

                            {/* Workspace 列表 */}
                            {workspaces.length === 0 ? (
                                <div className="text-center py-8 text-text-secondary">
                                    <p className="text-sm">No workspaces yet</p>
                                    <p className="text-xs mt-1">Create one to get started</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {workspaces.map((workspace) => (
                                        <div
                                            key={workspace.id}
                                            className={`
                                                p-4 bg-bg-secondary border rounded transition-colors
                                                ${
                                                    currentWorkspace?.id === workspace.id
                                                        ? 'border-primary bg-primary-light/10'
                                                        : 'border-gray-200 hover:border-border-hover'
                                                }
                                            `}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Folder className="w-5 h-5 text-text-secondary shrink-0" />
                                                        <h3 className="font-medium text-text-primary truncate">
                                                            {workspace.name}
                                                        </h3>
                                                        {currentWorkspace?.id === workspace.id && (
                                                            <span className="px-2 py-0.5 text-xs bg-primary text-white rounded">
                                                                Current
                                                            </span>
                                                        )}
                                                    </div>
                                                    {workspace.description && (
                                                        <p className="text-sm text-text-secondary mt-1 truncate">
                                                            {workspace.description}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-text-secondary mt-1">
                                                        Last accessed: {formatTime(workspace.lastAccessedAt)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <IconButton
                                                        onClick={() => {
                                                            setSelectedWorkspace(workspace);
                                                            setMode('edit');
                                                        }}
                                                        variant="primary"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </IconButton>
                                                    <IconButton
                                                        onClick={() => {
                                                            setSelectedWorkspace(workspace);
                                                            setMode('delete');
                                                        }}
                                                        variant="danger"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </IconButton>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {mode === 'create' && <CreateWorkspaceForm onClose={() => setMode('list')} />}

                    {mode === 'edit' && selectedWorkspace && (
                        <EditWorkspaceForm workspace={selectedWorkspace} onClose={() => setMode('list')} />
                    )}

                    {mode === 'delete' && selectedWorkspace && (
                        <DeleteConfirmDialog
                            workspace={selectedWorkspace}
                            onConfirm={handleDelete}
                            onCancel={() => setMode('list')}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
