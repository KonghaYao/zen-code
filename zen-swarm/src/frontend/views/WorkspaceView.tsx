/**
 * WorkspaceView - Workspace 主视图
 *
 * 布局结构：
 * - 第一栏（左）：Chat History - 聊天历史记录
 * - 第二栏：Chat - 聊天界面（输入+对话）
 * - 第三栏：Preview Panel - 文件预览区域（支持多个文件预览）
 * - 第四栏（右）：File Tree - 文件树面板
 *
 * 功能：
 * - Workspace 切换和管理
 * - 四栏独立调整宽度
 * - 集成聊天功能
 * - 文件树浏览
 * - 文件内容预览（支持标签页切换多个文件）
 * - **KeepAlive**: 每个 workspace 的状态保持（展开、搜索、选中、聊天状态）
 */

import React, { useEffect } from 'react';
import { KeepAlive, AliveScope } from 'react-activation';
import { WorkspaceSelector, WorkspaceManageDialog } from '../components/workspace/index.js';
import { useCurrentWorkspace, useWorkspaces, useShowManageDialog, useWorkspaceStore } from '../stores/workspace.js';
import { WorkspaceChat } from './WorkspaceChat.js';

// ========================================
// Welcome Screen - 首次启动或无 Workspace
// ========================================

interface WelcomeScreenProps {
    onCreateWorkspace: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onCreateWorkspace }) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-primary)]">
            <div className="text-center space-y-4">
                <div className="text-6xl mb-4">📁</div>
                <h1 className="text-2xl font-semibold">Welcome to Workspace</h1>
                <p className="text-[var(--color-text-secondary)] max-w-md">
                    Create a workspace to start exploring your projects. A workspace links to a folder on your computer.
                </p>
                <button
                    onClick={onCreateWorkspace}
                    className="mt-4 px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg transition-colors"
                >
                    Create Workspace
                </button>
            </div>
        </div>
    );
};

// ========================================
// Main Component
// ========================================

export function WorkspaceView() {
    // ========================================
    // Workspace State
    // ========================================
    const currentWorkspace = useCurrentWorkspace();
    const workspaces = useWorkspaces();
    const showManageDialog = useShowManageDialog();
    const { openManageDialog, closeManageDialog, loadWorkspaces } = useWorkspaceStore();

    console.log('WorkspaceView rendered:', { currentWorkspace, workspaces });

    // ========================================
    // Effect - 初始化加载 Workspaces
    // ========================================
    useEffect(() => {
        loadWorkspaces();
    }, [loadWorkspaces]);

    // ========================================
    // 首次启动或无 Workspace
    // ========================================

    if (!currentWorkspace || workspaces.length === 0) {
        console.log('Showing welcome screen (no currentWorkspace or no workspaces)');
        return (
            <div className="flex flex-col h-full overflow-hidden">
                {/* 顶部工具栏 */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-[var(--color-bg-secondary)]">
                    <WorkspaceSelector onOpenManage={openManageDialog} />
                </div>

                {/* 欢迎屏幕 */}
                <WelcomeScreen onCreateWorkspace={openManageDialog} />

                {/* 管理对话框 */}
                <WorkspaceManageDialog open={showManageDialog} onClose={closeManageDialog} />
            </div>
        );
    }

    // ========================================
    // 主界面
    // ========================================

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* 顶部工具栏 */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-[var(--color-bg-secondary)]">
                <WorkspaceSelector onOpenManage={openManageDialog} />
            </div>

            {/* 使用 KeepAlive 缓存每个 workspace 的内容（包括所有子组件状态） */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <AliveScope>
                    {/* <KeepAlive
                        cacheKey={currentWorkspace.id}
                        wrapperProps={{ className: 'h-full' }}
                        contentProps={{ className: 'h-full' }}
                    > */}
                    <WorkspaceChat workspaceId={currentWorkspace.id} rootPath={currentWorkspace.rootPath} />
                    {/* </KeepAlive> */}
                </AliveScope>
            </div>

            {/* 管理对话框 */}
            <WorkspaceManageDialog open={showManageDialog} onClose={closeManageDialog} />
        </div>
    );
}
