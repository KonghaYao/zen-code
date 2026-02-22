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

    // 选择 Workspace
    const handleSelect = useCallback(async (workspace: Workspace) => {
        const { setCurrentWorkspace } = useWorkspaceStore.getState();
        await setCurrentWorkspace(workspace.id);
    }, []);

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Workspace 列表 */}
            <div className="flex items-center gap-1 bg-[var(--color-bg-secondary)] rounded p-1">
                {workspaces.length === 0 ? (
                    <span className="px-3 py-1.5 text-sm text-[var(--color-text-secondary)]">No workspaces</span>
                ) : (
                    workspaces.map((workspace) => (
                        <button
                            key={workspace.id}
                            onClick={() => handleSelect(workspace)}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors duration-150 min-w-0 max-w-[300px]
                                ${
                                    currentWorkspace?.id === workspace.id
                                        ? 'bg-[var(--color-primary)] text-white'
                                        : 'hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]'
                                }
                            `}
                        >
                            <span className="shrink-0">📁</span>
                            <span className="font-medium truncate">{workspace.name}</span>
                            {workspace.description && (
                                <>
                                    <span className="shrink-0 text-[var(--color-text-tertiary)]/70">—</span>
                                    <span className="text-[var(--color-text-secondary)]/80 truncate">
                                        {workspace.description}
                                    </span>
                                </>
                            )}
                        </button>
                    ))
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
