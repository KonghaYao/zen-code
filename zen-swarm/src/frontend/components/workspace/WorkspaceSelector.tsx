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
import { Settings } from '../ui/Icons.js';

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
                <Settings className="w-5 h-5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" />
            </button>
        </div>
    );
};
