/**
 * FileList 组件 - 列表视图
 */

import React from 'react';
import type { FileItem } from '../../types/files.js';
import { FileIcon } from './FileIcon.js';

interface FileListProps {
    items: FileItem[];
    onNavigate: (path: string) => void;
    onSelect: (item: FileItem) => void;
    onRename: (item: FileItem) => void;
    onDelete: (item: FileItem) => void;
    onDownload: (item: FileItem) => void;
    selectedPath?: string;
}

/**
 * 格式化文件大小
 */
function formatSize(bytes: number): string {
    if (bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * 格式化日期
 */
function formatDate(date: Date): string {
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
        return (
            d.toLocaleDateString('en-US', { weekday: 'short' }) +
            ' ' +
            d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        );
    }
    // 今年
    if (d.getFullYear() === now.getFullYear()) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    // 更早
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const FileList: React.FC<FileListProps> = ({
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
        <div className="bg-white rounded-xl border border-[var(--color-border-subtle)] overflow-hidden">
            {/* 表头 */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border-subtle)] text-sm font-medium text-[var(--color-text-muted)]">
                <div className="col-span-6">Name</div>
                <div className="col-span-2">Size</div>
                <div className="col-span-3">Modified</div>
                <div className="col-span-1"></div>
            </div>

            {/* 文件列表 */}
            <div className="divide-y divide-[var(--color-border-subtle)]">
                {items.map((item) => (
                    <div
                        key={item.path}
                        className={`
                            grid grid-cols-12 gap-4 px-4 py-3 items-center
                            cursor-pointer transition-colors duration-150 group
                            ${
                                selectedPath === item.path
                                    ? 'bg-[var(--color-primary-light)]'
                                    : 'hover:bg-[var(--color-bg-secondary)]'
                            }
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
                        {/* 名称 */}
                        <div className="col-span-6 flex items-center gap-3 min-w-0">
                            <FileIcon
                                icon={item.icon}
                                extension={item.extension}
                                isDirectory={item.type === 'directory'}
                                size="md"
                            />
                            <span className="truncate font-medium text-[var(--color-text-primary)]">{item.name}</span>
                            {item.isHidden && <span className="text-xs text-[var(--color-text-muted)]">(hidden)</span>}
                        </div>

                        {/* 大小 */}
                        <div className="col-span-2 text-sm text-[var(--color-text-secondary)]">
                            {formatSize(item.size)}
                        </div>

                        {/* 修改时间 */}
                        <div className="col-span-3 text-sm text-[var(--color-text-secondary)]">
                            {formatDate(item.modifiedAt)}
                        </div>

                        {/* 操作按钮 */}
                        <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.type === 'file' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDownload(item);
                                    }}
                                    className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors"
                                    title="Download"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors"
                                title="Rename"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </div>
    );
};
