/**
 * FileGrid 组件 - 网格视图
 */

import React from 'react';
import type { FileItem } from '../../types/files.js';
import { FileIcon } from './FileIcon.js';

interface FileGridProps {
    items: FileItem[];
    onNavigate: (path: string) => void;
    onSelect: (item: FileItem) => void;
    onRename: (item: FileItem) => void;
    onDelete: (item: FileItem) => void;
    onDownload: (item: FileItem) => void;
    selectedPath?: string;
}

export const FileGrid: React.FC<FileGridProps> = ({
    items,
    onNavigate,
    onSelect,
    onRename,
    onDelete,
    onDownload,
    selectedPath,
}) => {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
                <span className="text-4xl mb-4">📂</span>
                <p className="text-lg">This folder is empty</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => (
                <div
                    key={item.path}
                    className={`
                        relative group p-4 rounded-xl border border-[var(--color-border-subtle)]
                        cursor-pointer transition-all duration-200 hover:shadow-md
                        ${selectedPath === item.path ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'bg-white hover:border-[var(--color-border-strong)]'}
                    `}
                    onClick={() => onSelect(item)}
                    onDoubleClick={() => {
                        if (item.type === 'directory') {
                            onNavigate(item.path);
                        } else {
                            onDownload(item);
                        }
                    }}
                >
                    {/* 图标 */}
                    <div className="flex items-center justify-center mb-3">
                        <FileIcon
                            icon={item.icon}
                            extension={item.extension}
                            isDirectory={item.type === 'directory'}
                            size="lg"
                        />
                    </div>

                    {/* 文件名 */}
                    <div className="text-center">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate" title={item.name}>
                            {item.name}
                        </p>
                        {item.isHidden && <p className="text-xs text-[var(--color-text-muted)] mt-1">(hidden)</p>}
                    </div>

                    {/* 操作菜单 */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.type === 'file' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDownload(item);
                                }}
                                className="p-1.5 bg-white shadow-sm rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                                title="Download"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                    />
                                </svg>
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRename(item);
                            }}
                            className="p-1.5 bg-white shadow-sm rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                            title="Rename"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                            </svg>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(item);
                            }}
                            className="p-1.5 bg-white shadow-sm rounded-lg text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                            title="Delete"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
