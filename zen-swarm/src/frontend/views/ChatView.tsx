/**
 * ChatView - 单一 Chat 窗口
 *
 * 功能：
 * - 单个核心 Chat 界面（Chat + History sidebar + Config Drawer）
 * - 桌面端三栏布局：History Sidebar | ChatPanel | Config Drawer
 * - 移动端：全屏 ChatPanel，侧栏通过底部抽屉/浮层访问
 * - 右侧 Config Drawer 可折叠，懒加载
 * - 窗口模式（而非 full-screen）
 * - 支持多个 workspace 的聊天历史
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChatProvider } from '@langgraph-js/sdk/react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { IconButton } from '../components/ui/IconButton.js';
import { HistoryGroupedSidebar } from '../components/HistoryGroupedSidebar.js';
import { ChatPanel } from '../components/ChatPanel.js';
import { ConfigDrawer, type ConfigDrawerSection } from '../components/ConfigDrawer.js';
import { WorkspaceManageDialog } from '../components/workspace-dialogs/index.js';
import { useCurrentWorkspace, useWorkspaces, useWorkspaceStore } from '../stores/workspace.js';
import { useAgentsStore, useModelsStore } from '../stores/index.js';
import { getAuthHeaders } from '../utils/auth.js';
import { useIsMobile } from '../hooks/useIsMobile.js';

export function ChatViewInternal() {
    const currentWorkspace = useCurrentWorkspace();
    const workspaces = useWorkspaces();
    const { loadWorkspaces, getWorkspaceByPath } = useWorkspaceStore();
    const isMobile = useIsMobile();

    // Config Drawer 状态
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerSection, setDrawerSection] = useState<ConfigDrawerSection | undefined>(undefined);

    // 移动端历史记录抽屉状态
    const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

    // Agent/Model 状态（由 ChatView 管理）
    const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);
    const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);

    // Stores - 加载 agents 和 models 列表
    const { agents, loadAgents } = useAgentsStore();
    const { models, loadModels } = useModelsStore();

    // 用于控制 workspace 管理对话框
    const [showWorkspaceManage, setShowWorkspaceManage] = useState(false);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | undefined>(undefined);

    // 初始化加载 Workspaces
    useEffect(() => {
        loadWorkspaces();
    }, [loadWorkspaces]);

    // 初始化加载 Agents 和 Models
    useEffect(() => {
        loadAgents();
        loadModels();
    }, [loadAgents, loadModels]);

    // 自动选择第一个 Agent 和 Model
    useEffect(() => {
        if (!selectedAgentId && agents.length > 0) {
            setSelectedAgentId(agents[0].id);
        }
    }, [agents, selectedAgentId]);

    useEffect(() => {
        if (!selectedModelId && models.length > 0) {
            setSelectedModelId(models[0].id);
        }
    }, [models, selectedModelId]);

    // 初始化当前 workspace（如果没有，自动选择第一个）
    useEffect(() => {
        if (!currentWorkspace && workspaces.length > 0) {
            useWorkspaceStore.getState().setCurrentWorkspace(workspaces[0].id);
        }
    }, [currentWorkspace, workspaces]);

    const handleManageWorkspace = (rootPath: string) => {
        // 根据 rootPath 找到 workspace id
        const workspace = getWorkspaceByPath(rootPath);
        if (workspace) {
            setSelectedWorkspaceId(workspace.id);
            setShowWorkspaceManage(true);
        }
    };

    const handleAddWorkspace = () => {
        setSelectedWorkspaceId(undefined);
        setShowWorkspaceManage(true);
    };

    const handleCloseManageDialog = () => {
        setShowWorkspaceManage(false);
        setSelectedWorkspaceId(undefined);
    };

    // 打开 Config Drawer
    const handleOpenConfig = useCallback((section?: ConfigDrawerSection) => {
        setDrawerSection(section);
        setDrawerOpen(true);
    }, []);

    // 关闭 Config Drawer
    const handleCloseDrawer = useCallback(() => {
        setDrawerOpen(false);
        setDrawerSection(undefined);
    }, []);

    // Agent 切换
    const handleAgentChange = useCallback((agentId: string) => {
        setSelectedAgentId(agentId);
    }, []);

    // Model 切换
    const handleModelChange = useCallback((modelId: string) => {
        setSelectedModelId(modelId);
    }, []);

    // 获取当前 Agent 和 Model 名称
    const currentAgentName = agents.find((a) => a.id === selectedAgentId)?.name ?? '—';
    const currentModelName = models.find((m) => m.id === selectedModelId)?.model_name ?? '—';

    // 如果没有当前 workspace，显示欢迎屏幕
    if (!currentWorkspace || workspaces.length === 0) {
        return (
            <>
                <div className="flex flex-col h-full bg-white">
                    {/* 欢迎屏幕 */}
                    <div className="flex-1 flex flex-col items-center justify-center text-text-primary">
                        <div className="text-center space-y-4">
                            <div className="text-6xl mb-4 flex justify-center">💬</div>
                            <h1 className="text-2xl font-semibold">Welcome to Chat</h1>
                            <p className="text-text-secondary max-w-md">
                                Create a workspace to start chatting with AI. A workspace links to a folder on your
                                computer.
                            </p>
                            <button
                                onClick={handleAddWorkspace}
                                className="mt-4 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                            >
                                Create Workspace
                            </button>
                        </div>
                    </div>
                </div>

                {/* 管理对话框 */}
                <WorkspaceManageDialog open={showWorkspaceManage} onClose={handleCloseManageDialog} />
            </>
        );
    }

    return (
        <>
            <div className="flex flex-col h-full bg-white">
                {/* 主内容区域 */}
                <div className="flex-1 flex min-h-0 overflow-hidden">
                    {/* History Sidebar - 桌面端显示，移动端隐藏 */}
                    <div className="hidden md:flex">
                        <HistoryGroupedSidebar
                            onManageWorkspace={handleManageWorkspace}
                            onAddWorkspace={handleAddWorkspace}
                        />
                    </div>

                    {/* Chat Panel */}
                    <div className="flex-1 min-w-0">
                        <ChatPanel
                            modelName="AI"
                            rootPath={currentWorkspace.rootPath}
                            selectedAgentId={selectedAgentId}
                            currentAgentName={currentAgentName}
                            currentModelName={currentModelName}
                            onOpenConfig={handleOpenConfig}
                            configDrawerOpen={drawerOpen}
                            onOpenMobileHistory={isMobile ? () => setMobileHistoryOpen(true) : undefined}
                        />
                    </div>

                    {/* Config Drawer - 桌面端内联，移动端浮层 */}
                    <AnimatePresence>
                        {drawerOpen && (
                            <ConfigDrawer
                                open={drawerOpen}
                                onClose={handleCloseDrawer}
                                initialSection={drawerSection}
                                selectedAgentId={selectedAgentId}
                                onAgentChange={handleAgentChange}
                                selectedModelId={selectedModelId}
                                onModelChange={handleModelChange}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* 移动端历史记录抽屉 */}
            <AnimatePresence>
                {isMobile && mobileHistoryOpen && (
                    <>
                        {/* 遮罩层 */}
                        <motion.div
                            className="fixed inset-0 z-40 bg-black/40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileHistoryOpen(false)}
                        />
                        {/* 抽屉 */}
                        <motion.div
                            className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[340px] bg-white shadow-xl flex flex-col"
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                        >
                            {/* 抽屉标题栏 */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                                <span className="text-sm font-semibold text-neutral-900">历史记录</span>
                                <IconButton onClick={() => setMobileHistoryOpen(false)} aria-label="关闭">
                                    <X className="w-4 h-4" />
                                </IconButton>
                            </div>
                            {/* 侧栏内容 */}
                            <div className="flex-1 overflow-hidden">
                                <HistoryGroupedSidebar
                                    onManageWorkspace={(path) => {
                                        setMobileHistoryOpen(false);
                                        handleManageWorkspace(path);
                                    }}
                                    onAddWorkspace={() => {
                                        setMobileHistoryOpen(false);
                                        handleAddWorkspace();
                                    }}
                                    onSwitchToChat={() => setMobileHistoryOpen(false)}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* 管理对话框 */}
            <WorkspaceManageDialog
                open={showWorkspaceManage}
                onClose={handleCloseManageDialog}
                initialWorkspaceId={selectedWorkspaceId}
            />
        </>
    );
}

export function ChatView() {
    return (
        <ChatProvider
            apiUrl={new URL('/api/langgraph', location.href).toString()}
            defaultAgent="swarm"
            defaultHeaders={getAuthHeaders()}
            withCredentials={false}
            showHistory={false}
            showGraph={false}
            onInitError={(error, currentAgent) => {
                console.error('Chat init error:', error, currentAgent);
            }}
            autoRestoreLastSession
        >
            <ChatViewInternal></ChatViewInternal>
        </ChatProvider>
    );
}
