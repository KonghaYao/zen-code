/**
 * ConfigView 组件
 *
 * 统一配置视图，合并 AgentConfigView 和 ResourcesView 的所有功能：
 * - Agents / Models / Prompts - AI 配置管理
 * - Skills / MCP Servers / Tools / Middlewares - 资源管理
 *
 * 使用左右两列布局：
 * - 左侧：导航列，选择不同配置类型
 * - 右侧：显示选中类型的详细内容（使用表格布局）
 */

import { useAgentsStore } from '../stores/index.js';
import { useModelsStore } from '../stores/index.js';
import { usePromptsStore } from '../stores/index.js';
import { useToolsStore } from '../stores/index.js';
import { useMiddlewaresStore } from '../stores/index.js';
import { useMcpStore } from '../stores/index.js';
import {
    useProviders,
    useCreateProvider,
    useUpdateProvider,
    useDeleteProvider,
    useSetActiveProvider,
} from '../hooks/useProviders.js';
import type { Provider, ProviderUpdateInput } from '../hooks/useProviders.js';
import { DataTable } from '../components/ui/index.js';
import { StatusBadge } from '../components/index.js';
import { AgentForm } from '../components/panels/AgentPanel/AgentForm.js';
import { ModelForm } from '../components/panels/ModelsPanel/ModelForm.js';
import { PromptForm } from '../components/panels/PromptsPanel/PromptForm.js';
import { MCPServerForm } from '../components/panels/MCPPanel/MCPServerForm.js';
import { ProviderForm } from '../components/provider-panel/ProviderForm.js';
import { Modal } from '../components/Modal.js';
import { ConfirmModal } from '../components/ui/ConfirmModal.js';
import type { Agent, Model, Prompt, MCPServer } from '../types/index.js';
import { tableConfigs } from './config/table-configs.js';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

type ConfigTab = 'agents' | 'models' | 'prompts' | 'providers' | 'skills' | 'mcp' | 'tools' | 'middlewares';

interface TabConfig {
    id: ConfigTab;
    label: string;
    icon: string;
    description: string;
    category: 'ai' | 'resources';
    editable: boolean;
    actionLabel: string;
}

const TABS: TabConfig[] = [
    // AI 配置
    {
        id: 'agents',
        label: 'Agents',
        icon: '🤖',
        description: 'AI agents and their configurations',
        category: 'ai',
        editable: true,
        actionLabel: '+ Create Agent',
    },
    {
        id: 'models',
        label: 'Models',
        icon: '🧠',
        description: 'LLM models and parameters',
        category: 'ai',
        editable: true,
        actionLabel: '+ Create Model',
    },
    {
        id: 'prompts',
        label: 'Prompts',
        icon: '📝',
        description: 'Prompt templates and versions',
        category: 'ai',
        editable: true,
        actionLabel: '+ Create Prompt',
    },
    {
        id: 'providers',
        label: 'Providers',
        icon: '🔑',
        description: 'AI provider API keys and endpoints',
        category: 'ai',
        editable: true,
        actionLabel: '+ Add Provider',
    },
    // 资源管理
    {
        id: 'skills',
        label: 'Skills',
        icon: '✨',
        description: 'Reusable skill templates',
        category: 'resources',
        editable: true,
        actionLabel: '+ Add Skill',
    },
    {
        id: 'mcp',
        label: 'MCP Servers',
        icon: '🔗',
        description: 'Model Context Protocol server connections',
        category: 'resources',
        editable: true,
        actionLabel: '+ Add MCP Server',
    },
    {
        id: 'tools',
        label: 'Tools',
        icon: '🔧',
        description: 'Executable tools and commands (read-only)',
        category: 'resources',
        editable: false,
        actionLabel: 'View Tools',
    },
    {
        id: 'middlewares',
        label: 'Middlewares',
        icon: '🔌',
        description: 'Middleware for request/response handling (read-only)',
        category: 'resources',
        editable: false,
        actionLabel: 'View Middlewares',
    },
];

export function ConfigView() {
    const [activeTab, setActiveTab] = useState<ConfigTab>('agents');

    const handleTabChange = useCallback((tabId: ConfigTab) => {
        setActiveTab(tabId);
    }, []);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Agent | Model | Prompt | MCPServer | Provider | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Stores
    const { agents, agentsLoading, loadAgents, createAgent, updateAgent, deleteAgent } = useAgentsStore();
    const { models, modelsLoading, loadModels, createModel, updateModel, deleteModel } = useModelsStore();
    const { prompts, promptsLoading, loadPrompts, createPrompt, updatePrompt, deletePrompt } = usePromptsStore();
    const { tools, toolsLoading, loadTools } = useToolsStore();
    const { middlewares, middlewaresLoading, loadMiddlewares } = useMiddlewaresStore();
    const { mcpServers, mcpLoading, loadMcpServers, createMcpServer, updateMcpServer, deleteMcpServer } = useMcpStore();

    // Providers hooks
    const { data: providers = [], isLoading: providersLoading } = useProviders();
    const createProviderMutation = useCreateProvider();
    const updateProviderMutation = useUpdateProvider();
    const deleteProviderMutation = useDeleteProvider();
    const setActiveProviderMutation = useSetActiveProvider();

    // Load flags
    const hasLoadedAgents = useRef(false);
    const hasLoadedModels = useRef(false);
    const hasLoadedPrompts = useRef(false);
    const hasLoadedTools = useRef(false);
    const hasLoadedMiddlewares = useRef(false);
    const hasLoadedMcp = useRef(false);

    // Load effects
    useEffect(() => {
        if (!hasLoadedAgents.current) {
            loadAgents();
            hasLoadedAgents.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!hasLoadedModels.current) {
            loadModels();
            hasLoadedModels.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!hasLoadedPrompts.current) {
            loadPrompts();
            hasLoadedPrompts.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    // Get current tab data source and loading state
    const currentData = useMemo(() => {
        switch (activeTab) {
            case 'agents':
                return { dataSource: agents, loading: agentsLoading };
            case 'models':
                return { dataSource: models, loading: modelsLoading };
            case 'prompts':
                return { dataSource: prompts, loading: promptsLoading };
            case 'providers':
                return { dataSource: providers, loading: providersLoading };
            case 'skills':
                return { dataSource: [], loading: false };
            case 'mcp':
                return { dataSource: mcpServers, loading: mcpLoading };
            case 'tools':
                return { dataSource: tools, loading: toolsLoading };
            case 'middlewares':
                return { dataSource: middlewares, loading: middlewaresLoading };
        }
    }, [
        activeTab,
        agents,
        agentsLoading,
        models,
        modelsLoading,
        prompts,
        promptsLoading,
        providers,
        providersLoading,
        mcpServers,
        mcpLoading,
        tools,
        toolsLoading,
        middlewares,
        middlewaresLoading,
    ]);

    // Get current tab config
    const currentTableConfig = useMemo(() => tableConfigs[activeTab], [activeTab]);

    // Get tab count
    const getTabCount = useCallback(
        (tab: ConfigTab) => {
            switch (tab) {
                case 'agents':
                    return agents.length;
                case 'models':
                    return models.length;
                case 'prompts':
                    return prompts.length;
                case 'providers':
                    return providers.length;
                case 'skills':
                    return 0;
                case 'mcp':
                    return mcpServers.length;
                case 'tools':
                    return tools.length;
                case 'middlewares':
                    return middlewares.length;
            }
        },
        [
            agents.length,
            models.length,
            prompts.length,
            providers.length,
            mcpServers.length,
            tools.length,
            middlewares.length,
        ],
    );

    const getActionLabel = () => {
        return TABS.find((t) => t.id === activeTab)?.actionLabel || 'View';
    };

    const handleCreateClick = useCallback(() => {
        if (activeTab === 'skills') {
            console.log('Skill creation not implemented yet');
        } else {
            setEditingItem(null);
            setShowCreateModal(true);
        }
    }, [activeTab]);

    const handleEditClick = useCallback((item: Agent | Model | Prompt | MCPServer | Provider) => {
        setEditingItem(item);
        setShowCreateModal(true);
    }, []);

    const handleDeleteClick = useCallback((id: string) => {
        setDeletingId(id);
        setShowDeleteModal(true);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deletingId) return;

        switch (activeTab) {
            case 'agents':
                deleteAgent(deletingId);
                break;
            case 'models':
                deleteModel(deletingId);
                break;
            case 'prompts':
                deletePrompt(deletingId);
                break;
            case 'mcp':
                deleteMcpServer(deletingId);
                break;
            case 'providers':
                await deleteProviderMutation.mutateAsync(deletingId);
                break;
        }
        setShowDeleteModal(false);
        setDeletingId(null);
    }, [activeTab, deletingId, deleteAgent, deleteModel, deletePrompt, deleteMcpServer, deleteProviderMutation]);

    const handleModalClose = useCallback(() => {
        setShowCreateModal(false);
        setEditingItem(null);
    }, []);

    const handleSave = useCallback(
        async (formData: any) => {
            switch (activeTab) {
                case 'agents':
                    if (editingItem) {
                        await updateAgent(formData);
                    } else {
                        await createAgent(formData);
                    }
                    break;
                case 'models':
                    if (editingItem) {
                        await updateModel(formData);
                    } else {
                        await createModel(formData);
                    }
                    break;
                case 'prompts':
                    if (editingItem) {
                        await updatePrompt(formData);
                    } else {
                        await createPrompt(formData);
                    }
                    break;
                case 'mcp':
                    if (editingItem) {
                        await updateMcpServer(formData);
                    } else {
                        await createMcpServer(formData);
                    }
                    break;
                case 'providers':
                    if (editingItem) {
                        const updateData: ProviderUpdateInput = {
                            id: editingItem.id,
                            name: formData.name,
                            type: formData.type,
                            baseUrl: formData.baseUrl,
                            isActive: formData.isActive,
                            ...(formData.apiKey ? { apiKey: formData.apiKey } : {}),
                        };
                        await updateProviderMutation.mutateAsync(updateData);
                    } else {
                        await createProviderMutation.mutateAsync(formData);
                    }
                    break;
            }
            handleModalClose();
        },
        [
            activeTab,
            editingItem,
            createAgent,
            updateAgent,
            createModel,
            updateModel,
            createPrompt,
            updatePrompt,
            createMcpServer,
            updateMcpServer,
            createProviderMutation,
            updateProviderMutation,
            handleModalClose,
        ],
    );

    const renderModalContent = () => {
        switch (activeTab) {
            case 'agents':
                return (
                    <AgentForm
                        agent={editingItem as Agent | null}
                        models={models}
                        prompts={prompts}
                        tools={tools}
                        middlewares={middlewares}
                        onSave={handleSave}
                        onCancel={handleModalClose}
                    />
                );
            case 'models':
                return (
                    <ModelForm
                        model={editingItem as Model | null}
                        providers={providers}
                        onSave={handleSave}
                        onCancel={handleModalClose}
                    />
                );
            case 'prompts':
                return (
                    <PromptForm
                        prompt={editingItem as Prompt | null}
                        mode={editingItem ? 'edit' : 'create'}
                        onSave={handleSave}
                        onCancel={handleModalClose}
                    />
                );
            case 'mcp':
                return (
                    <MCPServerForm
                        server={editingItem as MCPServer | null}
                        onSave={handleSave}
                        onCancel={handleModalClose}
                    />
                );
            case 'providers':
                return (
                    <ProviderForm
                        provider={editingItem as Provider | null}
                        onSubmit={handleSave}
                        onCancel={handleModalClose}
                        isSaving={createProviderMutation.isPending || updateProviderMutation.isPending}
                    />
                );
            default:
                return null;
        }
    };

    const activeTabConfig = TABS.find((t) => t.id === activeTab);

    // Build actions from config
    const actions = useMemo(() => {
        if (!currentTableConfig.actions) return undefined;
        return currentTableConfig.actions.map((action) => ({
            ...action,
            onClick: (record: any) => {
                if (action.key === 'edit') {
                    handleEditClick(record);
                } else if (action.key === 'delete') {
                    handleDeleteClick(record.id);
                }
            },
        }));
    }, [currentTableConfig.actions, handleEditClick, handleDeleteClick]);

    return (
        <div className="flex gap-6 h-full overflow-hidden">
            {/* 左侧导航列 */}
            <aside className="w-64 flex-shrink-0">
                <nav className="h-full bg-white rounded-lg border border-border-subtle p-2 flex flex-col">
                    <h2 className="px-3 py-2 text-sm font-semibold text-text-muted uppercase tracking-wider">
                        AI Configuration
                    </h2>
                    <ul className="mt-2 space-y-1 overflow-y-auto flex-1">
                        {TABS.filter((tab) => tab.category === 'ai').map((tab) => (
                            <li key={tab.id}>
                                <button
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                                        activeTab === tab.id
                                            ? 'bg-primary text-white'
                                            : 'text-text-primary hover:bg-bg-secondary'
                                    }`}
                                >
                                    <span className="text-xl">{tab.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{tab.label}</p>
                                        <p
                                            className={`text-xs truncate ${activeTab === tab.id ? 'text-white/80' : 'text-text-muted'}`}
                                        >
                                            {tab.description}
                                        </p>
                                    </div>
                                    <span
                                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                            activeTab === tab.id
                                                ? 'bg-white/20 text-white'
                                                : 'bg-bg-tertiary text-text-muted'
                                        }`}
                                    >
                                        {getTabCount(tab.id)}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    <h2 className="px-3 py-2 mt-4 text-sm font-semibold text-text-muted uppercase tracking-wider">
                        Resources
                    </h2>
                    <ul className="mt-2 space-y-1 overflow-y-auto">
                        {TABS.filter((tab) => tab.category === 'resources').map((tab) => (
                            <li key={tab.id}>
                                <button
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                                        activeTab === tab.id
                                            ? 'bg-primary text-white'
                                            : 'text-text-primary hover:bg-bg-secondary'
                                    }`}
                                >
                                    <span className="text-xl">{tab.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{tab.label}</p>
                                        <p
                                            className={`text-xs truncate ${activeTab === tab.id ? 'text-white/80' : 'text-text-muted'}`}
                                        >
                                            {tab.description}
                                        </p>
                                    </div>
                                    <span
                                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                            activeTab === tab.id
                                                ? 'bg-white/20 text-white'
                                                : 'bg-bg-tertiary text-text-muted'
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
            <main className="flex-1 min-w-0 flex flex-col">
                <div className="bg-white rounded-lg border border-border-subtle flex flex-col min-h-0">
                    <div className="p-6 flex-shrink-0">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-2xl font-semibold text-text-primary">{activeTabConfig?.label}</h1>
                                <p className="text-sm text-text-muted mt-1">{activeTabConfig?.description}</p>
                            </div>
                            <button
                                onClick={handleCreateClick}
                                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!activeTabConfig?.editable}
                            >
                                {getActionLabel()}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
                        <DataTable
                            columns={currentTableConfig.columns}
                            dataSource={currentData.dataSource}
                            loading={currentData.loading}
                            emptyMessage={currentTableConfig.emptyMessage}
                            actions={actions}
                        />
                    </div>
                </div>
            </main>

            {/* Create/Edit Modal */}
            <Modal
                open={showCreateModal}
                onClose={handleModalClose}
                title={
                    editingItem
                        ? `Edit ${activeTabConfig?.label?.slice(0, -1)}`
                        : `Create ${activeTabConfig?.label?.slice(0, -1)}`
                }
            >
                {renderModalContent()}
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                open={showDeleteModal}
                title={`Delete ${activeTabConfig?.label?.slice(0, -1)}`}
                message="Are you sure you want to delete this item? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setShowDeleteModal(false)}
            />
        </div>
    );
}
