/**
 * FileDialogs 组件 - 文件操作对话框集合
 */

import React, { useState, useEffect } from 'react';
import type { FileItem, DialogType } from '../../types/files.js';

interface CreateFolderDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string) => Promise<void>;
}

export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({ open, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setName('');
            setError('');
            setLoading(false);
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Folder name is required');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await onSubmit(name.trim());
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create folder');
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border-subtle)]">
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Create New Folder</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            Folder Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter folder name"
                            className="w-full px-4 py-2 border border-[var(--color-border-default)] rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                            autoFocus
                        />
                        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-xl transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-xl transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface CreateFileDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string, content?: string) => Promise<void>;
}

export const CreateFileDialog: React.FC<CreateFileDialogProps> = ({ open, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setName('');
            setContent('');
            setError('');
            setLoading(false);
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('File name is required');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await onSubmit(name.trim(), content || undefined);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create file');
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border-subtle)]">
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Create New File</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            File Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter file name (e.g., README.md)"
                            className="w-full px-4 py-2 border border-[var(--color-border-default)] rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                            autoFocus
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            Content (Optional)
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Enter file content..."
                            rows={6}
                            className="w-full px-4 py-2 border border-[var(--color-border-default)] rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none font-mono text-sm"
                        />
                    </div>
                    {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-xl transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-xl transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface RenameDialogProps {
    open: boolean;
    item: FileItem | null;
    onClose: () => void;
    onSubmit: (newName: string) => Promise<void>;
}

export const RenameDialog: React.FC<RenameDialogProps> = ({ open, item, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open && item) {
            setName(item.name);
            setError('');
            setLoading(false);
        }
    }, [open, item]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Name is required');
            return;
        }
        if (name === item?.name) {
            onClose();
            return;
        }
        setLoading(true);
        setError('');
        try {
            await onSubmit(name.trim());
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to rename');
        } finally {
            setLoading(false);
        }
    };

    if (!open || !item) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border-subtle)]">
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        Rename {item.type === 'directory' ? 'Folder' : 'File'}
                    </h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            New Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter new name"
                            className="w-full px-4 py-2 border border-[var(--color-border-default)] rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                            autoFocus
                        />
                        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-xl transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-xl transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Renaming...' : 'Rename'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface DeleteConfirmDialogProps {
    open: boolean;
    item: FileItem | null;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({ open, item, onClose, onConfirm }) => {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
            onClose();
        } finally {
            setLoading(false);
        }
    };

    if (!open || !item) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border-subtle)]">
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        Delete {item.type === 'directory' ? 'Folder' : 'File'}
                    </h3>
                </div>
                <div className="p-6">
                    <p className="text-[var(--color-text-secondary)] mb-2">
                        Are you sure you want to delete{' '}
                        <strong className="text-[var(--color-text-primary)]">{item.name}</strong>?
                    </p>
                    {item.type === 'directory' && (
                        <p className="text-sm text-red-500 mb-4">This will also delete all files and folders inside.</p>
                    )}
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-xl transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
