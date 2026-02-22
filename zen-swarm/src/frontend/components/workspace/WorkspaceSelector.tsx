/**
 * WorkspaceSelector - 顶部 Workspace 切换器
 *
 * 功能：
 * - 显示当前 Workspace 名称
 * - 下拉选择其他 Workspace
 * - 打开管理对话框
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.js';
import { useCurrentWorkspace, useWorkspaces } from '../../stores/workspace.js';
import type { Workspace } from '../../stores/workspace.js';

// ========================================
// Props
// ========================================

interface WorkspaceSelectorProps {
    onOpenManage: () => void;
}

// ========================================
// Component
// ========================================

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({ onOpenManage }) => {
    const currentWorkspace = useCurrentWorkspace();
    const workspaces = useWorkspaces();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 选择 Workspace
    const handleSelect = useCallback(async (workspace: Workspace) => {
        const { setCurrentWorkspace } = useWorkspaceStore.getState();
        setIsOpen(false);
        await setCurrentWorkspace(workspace.id);
    }, []);

    return (
        <div className="flex items-center gap-2" ref={dropdownRef}>
            {/* Workspace 切换器 */}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] rounded text-sm transition-colors duration-150"
                >
                    {/* 图标 */}
                    <span className="text-base">📁</span>

                    {/* 名称 */}
                    <span className="font-medium text-[var(--color-text-primary)]">
                        {currentWorkspace?.name || 'No Workspace'}
                    </span>

                    {/* 下拉箭头 */}
                    <svg
                        className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {/* 下拉菜单 */}
                {isOpen && (
                    <div className="absolute top-full left-0 mt-1 w-64 max-h-96 overflow-y-auto bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-xl z-50">
                        {workspaces.length === 0 ? (
                            <div className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                                <p className="text-sm">No workspaces yet</p>
                                <p className="text-xs mt-1">Create one to get started</p>
                            </div>
                        ) : (
                            <ul className="py-1">
                                {workspaces.map((workspace) => (
                                    <li key={workspace.id}>
                                        <button
                                            onClick={() => handleSelect(workspace)}
                                            className={`
                                                w-full px-4 py-2 text-left text-sm transition-colors duration-150
                                                ${
                                                    currentWorkspace?.id === workspace.id
                                                        ? 'bg-[var(--color-primary-light)] text-[var(--color-text-primary)]'
                                                        : 'hover:bg-[var(--color-bg-hover)]'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>📁</span>
                                                <span className="font-medium">{workspace.name}</span>
                                            </div>
                                            {workspace.description && (
                                                <p className="text-xs text-[var(--color-text-secondary)] ml-6 mt-0.5 truncate">
                                                    {workspace.description}
                                                </p>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {/* 管理按钮 */}
            <button
                onClick={onOpenManage}
                className="p-1.5 hover:bg-[var(--color-bg-hover)] rounded transition-colors duration-150"
                title="Manage Workspaces"
            >
                <svg
                    className="w-5 h-5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                </svg>
            </button>
        </div>
    );
};
