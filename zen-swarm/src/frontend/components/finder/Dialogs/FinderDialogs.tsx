/**
 * FinderDialogs - 文件操作对话框
 * 包含新建文件夹、新建文件、重命名、删除确认等对话框
 */

import React, { useState, useCallback } from 'react';
import { apiClient } from '../../../api.js';
import type { DialogState } from '../../../types/finder.js';

// ========================================
// Types
// ========================================

interface FinderDialogsProps {
    dialog: DialogState;
    currentPath: string;
    onClose: () => void;
    onSuccess: () => void;
}

// ========================================
// Dialog Wrapper Component
// ========================================

interface DialogWrapperProps {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    width?: string;
}

const DialogWrapper: React.FC<DialogWrapperProps> = ({ title, children, onClose, width = 'w-96' }) => {
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
            onClick={handleBackdropClick}
        >
            <div className={`${width} bg-white rounded-xl shadow-2xl overflow-hidden`}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]">
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
                </div>
                {children}
            </div>
        </div>
    );
};

// ========================================
// New Folder Dialog
// ========================================

interface NewFolderDialogProps {
    currentPath: string;
    onClose: () => void;
    onSuccess: () => void;
}

const NewFolderDialog: React.FC<NewFolderDialogProps> = ({ currentPath, onClose, onSuccess }) => {
    const [name, setName] = useState('Untitled Folder');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        if (!name.trim()) {
            setError('Please enter a folder name');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await apiClient.files.createFolder.mutate({
                path: currentPath,
                name: name.trim(),
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create folder');
        } finally {
            setLoading(false);
        }
    }, [name, currentPath, onSuccess, onClose]);

    return (
        <DialogWrapper title="New Folder" onClose={onClose}>
            <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-4xl">📁</span>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                            Folder name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            autoFocus
                            className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                        />
                    </div>
                </div>

                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !name.trim()}
                        className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
        </DialogWrapper>
    );
};

// ========================================
// New File Dialog
// ========================================

interface NewFileDialogProps {
    currentPath: string;
    onClose: () => void;
    onSuccess: () => void;
}

const NewFileDialog: React.FC<NewFileDialogProps> = ({ currentPath, onClose, onSuccess }) => {
    const [name, setName] = useState('untitled.txt');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        if (!name.trim()) {
            setError('Please enter a file name');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await apiClient.files.createFile.mutate({
                path: currentPath,
                name: name.trim(),
                content: content,
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create file');
        } finally {
            setLoading(false);
        }
    }, [name, content, currentPath, onSuccess, onClose]);

    return (
        <DialogWrapper title="New File" onClose={onClose} width="w-[500px]">
            <div className="p-6">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                        File name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                        className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                        Initial content (optional)
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-mono text-sm resize-none"
                        placeholder="Enter file content..."
                    />
                </div>

                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !name.trim()}
                        className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
        </DialogWrapper>
    );
};

// ========================================
// Rename Dialog
// ========================================

interface RenameDialogProps {
    targetPath: string;
    onClose: () => void;
    onSuccess: () => void;
}

const RenameDialog: React.FC<RenameDialogProps> = ({ targetPath, onClose, onSuccess }) => {
    const oldName = targetPath.split('/').pop() || '';
    const [name, setName] = useState(oldName);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        if (!name.trim()) {
            setError('Please enter a name');
            return;
        }

        if (name === oldName) {
            onClose();
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await apiClient.files.rename.mutate({
                oldPath: targetPath,
                newName: name.trim(),
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to rename');
        } finally {
            setLoading(false);
        }
    }, [name, oldName, targetPath, onSuccess, onClose]);

    return (
        <DialogWrapper title="Rename" onClose={onClose}>
            <div className="p-6">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                        New name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        autoFocus
                        className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                    />
                </div>

                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !name.trim()}
                        className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? 'Renaming...' : 'Rename'}
                    </button>
                </div>
            </div>
        </DialogWrapper>
    );
};

// ========================================
// Delete Confirm Dialog
// ========================================

interface DeleteDialogProps {
    targetPaths: string[];
    onClose: () => void;
    onSuccess: () => void;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ targetPaths, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isMultiple = targetPaths.length > 1;
    const itemName = targetPaths.length === 1 ? targetPaths[0].split('/').pop() : `${targetPaths.length} items`;

    const handleSubmit = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Delete all selected items
            await Promise.all(targetPaths.map((path) => apiClient.files.delete.mutate({ path })));
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to delete');
        } finally {
            setLoading(false);
        }
    }, [targetPaths, onSuccess, onClose]);

    return (
        <DialogWrapper title="Delete" onClose={onClose}>
            <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                    <div className="text-4xl">🗑️</div>
                    <div>
                        <p className="text-[var(--color-text-primary)]">Are you sure you want to delete {itemName}?</p>
                        <p className="text-sm text-[var(--color-text-muted)] mt-2">This action cannot be undone.</p>
                    </div>
                </div>

                {/* Show list of items if multiple */}
                {isMultiple && (
                    <div className="max-h-40 overflow-y-auto border border-[var(--color-border-subtle)] rounded-lg p-2 mb-4">
                        {targetPaths.map((path) => (
                            <div key={path} className="text-sm text-[var(--color-text-secondary)] truncate">
                                {path}
                            </div>
                        ))}
                    </div>
                )}

                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                    >
                        {loading ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </DialogWrapper>
    );
};

// ========================================
// Main Component
// ========================================

export const FinderDialogs: React.FC<FinderDialogsProps> = ({ dialog, currentPath, onClose, onSuccess }) => {
    if (dialog.type === 'none') {
        return null;
    }

    switch (dialog.type) {
        case 'new-folder':
            return <NewFolderDialog currentPath={currentPath} onClose={onClose} onSuccess={onSuccess} />;
        case 'new-file':
            return <NewFileDialog currentPath={currentPath} onClose={onClose} onSuccess={onSuccess} />;
        case 'rename':
            return dialog.targetPath ? (
                <RenameDialog targetPath={dialog.targetPath} onClose={onClose} onSuccess={onSuccess} />
            ) : null;
        case 'delete':
            const paths = dialog.data?.paths || (dialog.targetPath ? [dialog.targetPath] : []);
            return paths.length > 0 ? (
                <DeleteDialog targetPaths={paths} onClose={onClose} onSuccess={onSuccess} />
            ) : null;
        default:
            return null;
    }
};

export default FinderDialogs;
