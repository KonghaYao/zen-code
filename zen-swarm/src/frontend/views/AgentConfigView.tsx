/**
 * AgentConfigView 组件
 *
 * Agent 配置视图，使用左右两列布局：
 * - 左侧：导航列，选择 Agents / Models / Prompts
 * - 右侧：显示选中类型的详细内容
 */

import { useAgentsStore } from '../stores/index.js';
import { useModelsStore } from '../stores/index.js';
import { usePromptsStore } from '../stores/index.js';
import { CardGrid } from '../components/CardGrid.js';
import { AgentForm } from '../components/panels/AgentPanel/AgentForm.js';
import { ModelForm } from '../components/panels/ModelsPanel/ModelForm.js';
import { PromptForm } from '../components/panels/PromptsPanel/PromptForm.js';
import { Modal } from '../components/Modal.js';
import { ConfirmModal } from '../components/ui/ConfirmModal.js';
import type { Agent, Model, Prompt } from '../types/index.js';
import { useState, useEffect, useRef, useCallback } from 'react';

type AgentConfigTab = 'agents' | 'models' | 'prompts';

interface TabConfig {
    id: AgentConfigTab;
    label: string;
    icon: string;
    description: string;
}

const TABS: TabConfig[] = [
    { id: 'agents', label: 'Agents', icon: '🤖', description: 'AI agents and their configurations' },
    { id: 'models', label: 'Models', icon: '🧠', description: 'LLM models and parameters' },
    { id: 'prompts', label: 'Prompts', icon: '📝', description: 'Prompt templates and versions' },
];

export function AgentConfigView() {
    const [activeTab, setActiveTab] = useState<AgentConfigTab>('agents');

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Agent | Model | Prompt | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { agents, agentsLoading, loadAgents, createAgent, updateAgent, deleteAgent } = useAgentsStore();
    const { models, modelsLoading, loadModels, createModel, updateModel, deleteModel } = useModelsStore();
    const { prompts, promptsLoading, loadPrompts, createPrompt, updatePrompt, deletePrompt } = usePromptsStore();

    // 使用 ref 跟踪是否已加载，避免多次调用
    const hasLoadedAgents = useRef(false);
    const hasLoadedModels = useRef(false);
    const hasLoadedPrompts = useRef(false);

    // 分别加载各个资源
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

    const renderContent = () => {
        switch (activeTab) {
            case 'agents':
                return (
                    <CardGrid
                        items={agents}
                        loading={agentsLoading}
                        emptyMessage="No agents yet. Create your first agent!"
                        renderCard={(agent) => (
                            <div
                                key={agent.id}
                                className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-4 hover:shadow-md transition-shadow cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center text-xl">
                                        🤖
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-[var(--color-text-primary)] truncate">
                                            {agent.name}
                                        </h3>
                                        <p className="text-sm text-[var(--color-text-muted)] truncate">
                                            {agent.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                                    <span>{Object.keys(agent.tools || {}).length} tools</span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditClick(agent);
                                            }}
                                            className="text-blue-600 hover:text-blue-700"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClick(agent.id);
                                            }}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    />
                );
            case 'models':
                return (
                    <CardGrid
                        items={models}
                        loading={modelsLoading}
                        emptyMessage="No models yet. Create your first model!"
                        renderCard={(model) => (
                            <div
                                key={model.id}
                                className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-4 hover:shadow-md transition-shadow cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center text-xl">
                                        🧠
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-[var(--color-text-primary)] truncate">
                                            {model.model_name}
                                        </h3>
                                        <p className="text-sm text-[var(--color-text-muted)]">{model.model_provider}</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                                    <span>Temp: {model.temperature}</span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditClick(model);
                                            }}
                                            className="text-blue-600 hover:text-blue-700"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClick(model.id);
                                            }}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    />
                );
            case 'prompts':
                return (
                    <CardGrid
                        items={prompts}
                        loading={promptsLoading}
                        emptyMessage="No prompts yet. Create your first prompt!"
                        renderCard={(prompt) => (
                            <div
                                key={prompt.id}
                                className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-4 hover:shadow-md transition-shadow cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center text-xl">
                                        📝
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-[var(--color-text-primary)] truncate">
                                            {prompt.name}
                                        </h3>
                                        {prompt.description && (
                                            <p className="text-sm text-[var(--color-text-muted)] truncate">
                                                {prompt.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                                    <span>Version: {prompt.current_version}</span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditClick(prompt);
                                            }}
                                            className="text-blue-600 hover:text-blue-700"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClick(prompt.id);
                                            }}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    />
                );
            default:
                return null;
        }
    };

    const getTabCount = (tab: AgentConfigTab) => {
        switch (tab) {
            case 'agents':
                return agents.length;
            case 'models':
                return models.length;
            case 'prompts':
                return prompts.length;
        }
    };

    // Modal handlers
    const handleCreateClick = useCallback(() => {
        setEditingItem(null);
        setShowCreateModal(true);
    }, []);

    const handleEditClick = useCallback((item: Agent | Model | Prompt) => {
        setEditingItem(item);
        setShowCreateModal(true);
    }, []);

    const handleDeleteClick = useCallback((id: string) => {
        setDeletingId(id);
        setShowDeleteModal(true);
    }, []);

    const handleDeleteConfirm = useCallback(() => {
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
        }
        setShowDeleteModal(false);
        setDeletingId(null);
    }, [activeTab, deletingId, deleteAgent, deleteModel, deletePrompt]);

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
            handleModalClose,
        ],
    );

    const renderModalContent = () => {
        switch (activeTab) {
            case 'agents':
                return (
                    <AgentForm agent={editingItem as Agent | null} onSave={handleSave} onCancel={handleModalClose} />
                );
            case 'models':
                return (
                    <ModelForm model={editingItem as Model | null} onSave={handleSave} onCancel={handleModalClose} />
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
            default:
                return null;
        }
    };

    return (
        <div className="flex gap-6 h-[calc(100vh-8rem)] overflow-hidden">
            {/* 左侧导航列 */}
            <aside className="w-64 flex-shrink-0">
                <nav className="h-full bg-white rounded-lg border border-[var(--color-border-subtle)] p-2 flex flex-col">
                    <h2 className="px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                        Configuration
                    </h2>
                    <ul className="mt-2 space-y-1 overflow-y-auto flex-1">
                        {TABS.map((tab) => (
                            <li key={tab.id}>
                                <button
                                    onClick={() => setActiveTab(tab.id)}
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
                            className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            + Create {TABS.find((t) => t.id === activeTab)?.label?.slice(0, -1)}
                        </button>
                    </div>
                    {renderContent()}
                </div>
            </main>

            {/* Create/Edit Modal */}
            <Modal
                open={showCreateModal}
                onClose={handleModalClose}
                title={
                    editingItem
                        ? `Edit ${TABS.find((t) => t.id === activeTab)?.label?.slice(0, -1)}`
                        : `Create ${TABS.find((t) => t.id === activeTab)?.label?.slice(0, -1)}`
                }
            >
                {renderModalContent()}
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                open={showDeleteModal}
                title={`Delete ${TABS.find((t) => t.id === activeTab)?.label?.slice(0, -1)}`}
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
