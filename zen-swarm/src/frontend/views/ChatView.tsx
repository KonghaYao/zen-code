/**
 * ChatView - 单一 Chat 窗口
 *
 * 功能：
 * - 单个核心 Chat 界面（Chat + History sidebar + Config Drawer）
 * - 三栏布局：History Sidebar | ChatPanel | Config Drawer
 * - 右侧 Config Drawer 可折叠，懒加载
 * - 窗口模式（而非 full-screen）
 * - 支持多个 workspace 的聊天历史
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChatProvider } from '@langgraph-js/sdk/react';
import { AnimatePresence } from 'motion/react';
import { HistoryGroupedSidebar } from '../components/HistoryGroupedSidebar.js';
import { ChatPanel } from '../components/ChatPanel.js';
import { ConfigDrawer, type ConfigDrawerSection } from '../components/ConfigDrawer.js';
import { WorkspaceManageDialog } from '../components/workspace-dialogs/index.js';
import { useCurrentWorkspace, useWorkspaces, useWorkspaceStore } from '../stores/workspace.js';
import { useAgentsStore, useModelsStore } from '../stores/index.js';

export function ChatViewInternal() {
    const currentWorkspace = useCurrentWorkspace();
    const workspaces = useWorkspaces();
    const { loadWorkspaces, getWorkspaceByPath } = useWorkspaceStore();

    // Config Drawer 状态
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerSection, setDrawerSection] = useState<ConfigDrawerSection | undefined>(undefined);

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
                {/* 主内容区域 - 三栏布局 */}
                <div className="flex-1 flex min-h-0 overflow-hidden">
                    {/* History Sidebar */}
                    <HistoryGroupedSidebar
                        onManageWorkspace={handleManageWorkspace}
                        onAddWorkspace={handleAddWorkspace}
                    />

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
                        />
                    </div>

                    {/* Config Drawer */}
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
            apiUrl="http://127.0.0.1:8124/api/langgraph"
            defaultAgent="swarm"
            defaultHeaders={{}}
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
