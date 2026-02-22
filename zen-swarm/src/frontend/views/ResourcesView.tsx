/**
 * ResourcesView 组件
 *
 * 资源管理视图，使用左右两列布局：
 * - 左侧：导航列，选择 Skills / MCP Servers / Tools / Middlewares
 * - 右侧：显示选中类型的详细内容
 * - Skills 和 MCP 支持编辑，Tools 和 Middlewares 为只读
 */

import { useToolsStore } from '../stores/index.js';
import { useMiddlewaresStore } from '../stores/index.js';
import { useMcpStore } from '../stores/index.js';
import { CardGrid } from '../components/CardGrid.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { MCPServerForm } from '../components/panels/MCPPanel/MCPServerForm.js';
import { Modal } from '../components/Modal.js';
import { ConfirmModal } from '../components/ui/ConfirmModal.js';
import type { MCPServer } from '../types/index.js';
import { useState, useEffect, useRef, useCallback } from 'react';

type ResourcesTab = 'skills' | 'mcp' | 'tools' | 'middlewares';

interface TabConfig {
    id: ResourcesTab;
    label: string;
    icon: string;
    description: string;
    actionLabel: string;
    editable: boolean;
}

const TABS: TabConfig[] = [
    {
        id: 'skills',
        label: 'Skills',
        icon: '✨',
        description: 'Reusable skill templates',
        actionLabel: '+ Add Skill',
        editable: true,
    },
    {
        id: 'mcp',
        label: 'MCP Servers',
        icon: '🔗',
        description: 'Model Context Protocol server connections',
        actionLabel: '+ Add MCP Server',
        editable: true,
    },
    {
        id: 'tools',
        label: 'Tools',
        icon: '🔧',
        description: 'Executable tools and commands (read-only)',
        actionLabel: 'View Tools',
        editable: false,
    },
    {
        id: 'middlewares',
        label: 'Middlewares',
        icon: '🔌',
        description: 'Middleware for request/response handling (read-only)',
        actionLabel: 'View Middlewares',
        editable: false,
    },
];

export function ResourcesView() {
    // 使用本地状态管理 tab，不修改 URL 避免影响路由
    const [activeTab, setActiveTab] = useState<ResourcesTab>('skills');

    // 处理 Tab 切换
    const handleTabChange = useCallback((tabId: ResourcesTab) => {
        setActiveTab(tabId);
    }, []);

    // Modal states for MCP
    const [showMcpModal, setShowMcpModal] = useState(false);
    const [editingMcpServer, setEditingMcpServer] = useState<MCPServer | null>(null);
    const [showDeleteMcpModal, setShowDeleteMcpModal] = useState(false);
    const [deletingMcpId, setDeletingMcpId] = useState<string | null>(null);

    const { tools, toolsLoading, loadTools } = useToolsStore();
    const { middlewares, middlewaresLoading, loadMiddlewares } = useMiddlewaresStore();
    const { mcpServers, mcpLoading, loadMcpServers, createMcpServer, updateMcpServer, deleteMcpServer } = useMcpStore();

    // 使用 ref 跟踪是否已加载，避免多次调用
    const hasLoadedTools = useRef(false);
    const hasLoadedMiddlewares = useRef(false);
    const hasLoadedMcp = useRef(false);

    // 分别加载各个资源
    useEffect(() => {
        if (!hasLoadedTools.current) {
            loadTools();
            hasLoadedTools.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!hasLoadedMiddlewares.current) {
            loadMiddlewares();
            hasLoadedMiddlewares.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!hasLoadedMcp.current) {
            loadMcpServers();
            hasLoadedMcp.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const renderContent = () => {
        switch (activeTab) {
            case 'skills':
                return (
                    <CardGrid
                        items={[]} // TODO: 加载 skills 数据
                        loading={false}
                        emptyMessage="Skills are loaded from your project and user directories."
                        renderCard={() => <div />}
                    />
                );
            case 'mcp':
                return (
                    <CardGrid
                        items={mcpServers}
                        loading={mcpLoading}
                        emptyMessage="No MCP servers configured yet."
                        renderCard={(server) => (
                            <div
                                key={server.id}
                                className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-4 hover:shadow-md transition-shadow cursor-pointer group overflow-hidden"
                            >
                                <div className="flex items-start justify-between min-w-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center text-xl flex-shrink-0">
                                            🔗
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3
                                                className="font-semibold text-[var(--color-text-primary)] truncate"
                                                title={server.name}
                                            >
                                                {server.name}
                                            </h3>
                                            <p className="text-sm text-[var(--color-text-muted)] truncate">
                                                {server.config.type || 'stdio'}
                                            </p>
                                            {server.config.command && (
                                                <p
                                                    className="text-xs text-[var(--color-text-muted)] mt-1 truncate"
                                                    title={server.config.command}
                                                >
                                                    {server.config.command}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <StatusBadge status={server.enabled ? 'active' : 'inactive'} />
                                </div>
                                <div className="mt-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleMcpEdit(server);
                                        }}
                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleMcpDelete(server.id);
                                        }}
                                        className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        )}
                    />
                );
            case 'tools':
                return (
                    <CardGrid
                        items={tools}
                        loading={toolsLoading}
                        emptyMessage="No tools yet."
                        renderCard={(tool) => (
                            <div
                                key={tool.id}
                                className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-4 hover:shadow-md transition-shadow overflow-hidden"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center text-xl flex-shrink-0">
                                        🔧
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3
                                            className="font-semibold text-[var(--color-text-primary)] truncate"
                                            title={tool.name}
                                        >
                                            {tool.name}
                                        </h3>
                                        <p className="text-sm text-[var(--color-text-muted)] line-clamp-2">
                                            {tool.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    />
                );
            case 'middlewares':
                return (
                    <CardGrid
                        items={middlewares}
                        loading={middlewaresLoading}
                        emptyMessage="No middlewares yet."
                        renderCard={(middleware) => (
                            <div
                                key={middleware.id}
                                className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-4 hover:shadow-md transition-shadow overflow-hidden"
                            >
                                <div className="flex items-start justify-between min-w-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center text-xl flex-shrink-0">
                                            🔌
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3
                                                className="font-semibold text-[var(--color-text-primary)] truncate"
                                                title={middleware.name}
                                            >
                                                {middleware.name}
                                            </h3>
                                            <p className="text-sm text-[var(--color-text-muted)] line-clamp-2">
                                                {middleware.description}
                                            </p>
                                        </div>
                                    </div>
                                    <StatusBadge status="active" />
                                </div>
                                <div className="mt-3 text-xs text-[var(--color-text-muted)] flex-shrink-0">
                                    Priority: {middleware.priority}
                                </div>
                            </div>
                        )}
                    />
                );
            default:
                return null;
        }
    };

    const getTabCount = (tab: ResourcesTab) => {
        switch (tab) {
            case 'skills':
                return 0;
            case 'mcp':
                return mcpServers.length;
            case 'tools':
                return tools.length;
            case 'middlewares':
                return middlewares.length;
        }
    };

    const getActionLabel = () => {
        return TABS.find((t) => t.id === activeTab)?.actionLabel || 'View';
    };

    // MCP modal handlers
    const handleMcpCreate = useCallback(() => {
        setEditingMcpServer(null);
        setShowMcpModal(true);
    }, []);

    const handleMcpEdit = useCallback((server: MCPServer) => {
        setEditingMcpServer(server);
        setShowMcpModal(true);
    }, []);

    const handleMcpDelete = useCallback((id: string) => {
        setDeletingMcpId(id);
        setShowDeleteMcpModal(true);
    }, []);

    const handleMcpDeleteConfirm = useCallback(() => {
        if (deletingMcpId) {
            deleteMcpServer(deletingMcpId);
        }
        setShowDeleteMcpModal(false);
        setDeletingMcpId(null);
    }, [deletingMcpId, deleteMcpServer]);

    const handleMcpModalClose = useCallback(() => {
        setShowMcpModal(false);
        setEditingMcpServer(null);
    }, []);

    const handleMcpSave = useCallback(
        async (formData: any) => {
            if (editingMcpServer) {
                await updateMcpServer(formData);
            } else {
                await createMcpServer(formData);
            }
            handleMcpModalClose();
        },
        [editingMcpServer, createMcpServer, updateMcpServer, handleMcpModalClose],
    );

    const handleCreateClick = useCallback(() => {
        if (activeTab === 'mcp') {
            handleMcpCreate();
        } else if (activeTab === 'skills') {
            // TODO: Implement skill creation
            console.log('Skill creation not implemented yet');
        }
    }, [activeTab, handleMcpCreate]);

    return (
        <div className="flex gap-6 h-[calc(100vh-8rem)] overflow-hidden">
            {/* 左侧导航列 */}
            <aside className="w-64 flex-shrink-0">
                <nav className="h-full bg-white rounded-lg border border-[var(--color-border-subtle)] p-2 flex flex-col">
                    <h2 className="px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                        Resources
                    </h2>
                    <ul className="mt-2 space-y-1 overflow-y-auto flex-1">
                        {TABS.map((tab) => (
                            <li key={tab.id}>
                                <button
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                                        activeTab === tab.id
                                            ? 'bg-[var(--color-primary)] text-white'
                                            : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]'
                                    }`}
                                >
                                    <span className="text-xl">{tab.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{tab.label}</p>
                                        <p
                                            className={`text-xs truncate ${activeTab === tab.id ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}
                                        >
                                            {tab.description}
                                        </p>
                                    </div>
                                    <span
                                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                            activeTab === tab.id
                                                ? 'bg-white/20 text-white'
                                                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
                                        }`}
                                    >
                                        {getTabCount(tab.id)}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>

            {/* 右侧内容区 */}
            <main className="flex-1 min-w-0 overflow-y-auto">
                <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                                {TABS.find((t) => t.id === activeTab)?.label}
                            </h1>
                            <p className="text-sm text-[var(--color-text-muted)] mt-1">
                                {TABS.find((t) => t.id === activeTab)?.description}
                            </p>
                        </div>
                        <button
                            onClick={handleCreateClick}
                            className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!TABS.find((t) => t.id === activeTab)?.editable}
                        >
                            {getActionLabel()}
                        </button>
                    </div>
                    {renderContent()}
                </div>
            </main>

            {/* MCP Create/Edit Modal */}
            <Modal
                open={showMcpModal}
                onClose={handleMcpModalClose}
                title={editingMcpServer ? 'Edit MCP Server' : 'Add MCP Server'}
            >
                <MCPServerForm server={editingMcpServer} onSave={handleMcpSave} onCancel={handleMcpModalClose} />
            </Modal>

            {/* MCP Delete Confirmation Modal */}
            <ConfirmModal
                open={showDeleteMcpModal}
                title="Delete MCP Server"
                message="Are you sure you want to delete this MCP server? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={handleMcpDeleteConfirm}
                onCancel={() => setShowDeleteMcpModal(false)}
            />
        </div>
    );
}
