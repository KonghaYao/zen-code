/**
 * ConfigDrawer - 配置抽屉组件
 *
 * 功能：
 * - 懒加载：open=false 时不渲染 DOM，不加载数据
 * - 右侧抽屉滑入/滑出动画（w-0 ↔ w-72）
 * - 5个分区：Agents, Models, MCP, Prompts, API Keys
 * - 手风琴布局，支持 initialSection 自动展开
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Brain, Link2, FileText, Key, ChevronRight, X, Check, Settings } from 'lucide-react';
import { IconButton } from './ui/IconButton.js';
import { useAgentsStore, useModelsStore, useMcpStore, usePromptsStore } from '../stores/index.js';
import type { Agent, Model, MCPServer, Prompt } from '../types/index.js';

// ========================================
// Types
// ========================================

export type ConfigDrawerSection = 'agents' | 'models' | 'mcp' | 'prompts' | 'apikeys';

interface ConfigDrawerProps {
    open: boolean;
    onClose: () => void;
    initialSection?: ConfigDrawerSection;
    /** 当前选中的 Agent ID */
    selectedAgentId?: string;
    /** Agent 切换回调 */
    onAgentChange?: (agentId: string) => void;
    /** 当前使用的 Model ID */
    selectedModelId?: string;
    /** Model 切换回调 */
    onModelChange?: (modelId: string) => void;
}

interface AccordionItemProps {
    id: ConfigDrawerSection;
    icon: React.ReactNode;
    label: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    badge?: number;
}

// ========================================
// Accordion Item Component
// ========================================

const AccordionItem: React.FC<AccordionItemProps> = ({ icon, label, expanded, onToggle, children, badge }) => {
    return (
        <div className="border-b border-border-subtle last:border-b-0">
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-bg-secondary transition-colors text-left"
            >
                <span className="text-text-secondary w-4 h-4 flex items-center justify-center">{icon}</span>
                <span className="flex-1 text-sm font-medium text-text-primary">{label}</span>
                {badge !== undefined && badge > 0 && (
                    <span className="text-xs px-1.5 py-0.5 bg-bg-tertiary text-text-muted rounded-full">{badge}</span>
                )}
                <motion.span
                    animate={{ rotate: expanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-text-muted"
                >
                    <ChevronRight className="w-3 h-3" />
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ========================================
// Section Components
// ========================================

interface AgentListProps {
    agents: Agent[];
    selectedId?: string;
    onSelect: (id: string) => void;
}

const AgentList: React.FC<AgentListProps> = ({ agents, selectedId, onSelect }) => {
    if (agents.length === 0) {
        return <div className="text-xs text-text-muted py-2">No agents available</div>;
    }

    return (
        <div className="space-y-1 max-h-48 overflow-y-auto">
            {agents.map((agent) => (
                <button
                    key={agent.id}
                    onClick={() => onSelect(agent.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                        selectedId === agent.id
                            ? 'bg-primary/10 text-primary border border-primary/30'
                            : 'hover:bg-bg-secondary text-text-primary'
                    }`}
                >
                    <span className="truncate flex-1">{agent.name}</span>
                    {selectedId === agent.id && <Check className="w-3 h-3 text-primary" />}
                </button>
            ))}
        </div>
    );
};

interface ModelListProps {
    models: Model[];
    selectedId?: string;
    onSelect: (id: string) => void;
}

const ModelList: React.FC<ModelListProps> = ({ models, selectedId, onSelect }) => {
    if (models.length === 0) {
        return <div className="text-xs text-text-muted py-2">No models available</div>;
    }

    return (
        <div className="space-y-1 max-h-48 overflow-y-auto">
            {models.map((model) => (
                <button
                    key={model.id}
                    onClick={() => onSelect(model.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                        selectedId === model.id
                            ? 'bg-primary/10 text-primary border border-primary/30'
                            : 'hover:bg-bg-secondary text-text-primary'
                    }`}
                >
                    <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{model.model_name}</div>
                        <div className="text-[10px] text-text-muted truncate">{(model as any).model_provider}</div>
                    </div>
                    {selectedId === model.id && <Check className="w-3 h-3 text-primary" />}
                </button>
            ))}
        </div>
    );
};

interface MCPListProps {
    servers: MCPServer[];
    onToggle: (id: string, enabled: boolean) => void;
}

const MCPList: React.FC<MCPListProps> = ({ servers, onToggle }) => {
    if (servers.length === 0) {
        return <div className="text-xs text-text-muted py-2">No MCP servers configured</div>;
    }

    return (
        <div className="space-y-1 max-h-48 overflow-y-auto">
            {servers.map((server) => (
                <div
                    key={server.id}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-bg-secondary transition-colors"
                >
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-text-primary truncate">{server.name}</div>
                        <div className="text-[10px] text-text-muted">{server.config?.type || 'stdio'}</div>
                    </div>
                    <button
                        onClick={() => onToggle(server.id, !server.enabled)}
                        className={`relative w-8 h-4 rounded-full transition-colors ${
                            server.enabled ? 'bg-primary' : 'bg-bg-tertiary'
                        }`}
                    >
                        <motion.div
                            animate={{ x: server.enabled ? 16 : 2 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"
                        />
                    </button>
                </div>
            ))}
        </div>
    );
};

interface PromptListProps {
    prompts: Prompt[];
    currentPromptId?: string;
}

const PromptList: React.FC<PromptListProps> = ({ prompts, currentPromptId }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (prompts.length === 0) {
        return <div className="text-xs text-text-muted py-2">No prompts available</div>;
    }

    return (
        <div className="space-y-1 max-h-64 overflow-y-auto">
            {prompts.map((prompt) => (
                <div key={prompt.id} className="border border-border-subtle rounded overflow-hidden">
                    <button
                        onClick={() => setExpandedId(expandedId === prompt.id ? null : prompt.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors ${
                            currentPromptId === prompt.id
                                ? 'bg-primary/5 text-primary'
                                : 'hover:bg-bg-secondary text-text-primary'
                        }`}
                    >
                        <span className="truncate flex-1 font-medium">{prompt.name}</span>
                        {currentPromptId === prompt.id && (
                            <span className="text-[10px] px-1 py-0.5 bg-primary/10 rounded">active</span>
                        )}
                        <motion.span
                            animate={{ rotate: expandedId === prompt.id ? 90 : 0 }}
                            className="text-text-muted"
                        >
                            <ChevronRight className="w-3 h-3" />
                        </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                        {expandedId === prompt.id && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden"
                            >
                                <div className="px-2 py-2 bg-bg-secondary text-[10px] text-text-muted whitespace-pre-wrap max-h-32 overflow-y-auto border-t border-border-subtle">
                                    {prompt.content?.slice(0, 500)}
                                    {prompt.content?.length > 500 && '...'}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    );
};

// ========================================
// ConfigDrawer Component
// ========================================

export const ConfigDrawer: React.FC<ConfigDrawerProps> = ({
    open,
    onClose,
    initialSection,
    selectedAgentId,
    onAgentChange,
    selectedModelId,
    onModelChange,
}) => {
    // 手风琴展开状态
    const [expandedSection, setExpandedSection] = useState<ConfigDrawerSection | null>(initialSection || null);

    // Stores - 只在 open 时加载数据
    const { agents, agentsLoading, loadAgents } = useAgentsStore();
    const { models, modelsLoading, loadModels } = useModelsStore();
    const { mcpServers, mcpLoading, loadMcpServers, updateMcpServer } = useMcpStore();
    const { prompts, promptsLoading, loadPrompts } = usePromptsStore();

    // 数据加载标记
    const hasLoaded = useRef(false);

    // 懒加载：open=true 时加载数据
    useEffect(() => {
        if (open && !hasLoaded.current) {
            hasLoaded.current = true;
            loadAgents();
            loadModels();
            loadMcpServers();
            loadPrompts();
        }
    }, [open, loadAgents, loadModels, loadMcpServers, loadPrompts]);

    // initialSection 变化时自动展开
    useEffect(() => {
        if (initialSection) {
            setExpandedSection(initialSection);
        }
    }, [initialSection]);

    // 切换分区
    const handleToggle = useCallback((section: ConfigDrawerSection) => {
        setExpandedSection((prev) => (prev === section ? null : section));
    }, []);

    // MCP 切换
    const handleMcpToggle = useCallback(
        async (id: string, enabled: boolean) => {
            // 找到完整的 server 信息
            const server = mcpServers.find((s) => s.id === id);
            if (!server) return;

            // 传递完整数据给 update
            await updateMcpServer({
                id: server.id,
                name: server.name,
                config: server.config,
                enabled,
            });
        },
        [mcpServers, updateMcpServer],
    );

    // 获取当前 Agent 的 prompt ID
    const currentPromptId = useMemo(() => {
        const agent = agents.find((a) => a.id === selectedAgentId);
        return agent?.system_prompt;
    }, [agents, selectedAgentId]);

    // 懒加载：open=false 时不渲染
    if (!open) return null;

    return (
        <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-shrink-0 border-l border-border-subtle bg-white overflow-hidden"
        >
            <div className="h-full flex flex-col w-72">
                {/* Header */}
                <header className="flex-shrink-0 px-3 py-2.5 border-b border-border-subtle flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-text-primary">Configuration</h2>
                    <IconButton onClick={onClose} title="Close">
                        <X className="w-4 h-4" />
                    </IconButton>
                </header>

                {/* Content - Accordion */}
                <div className="flex-1 overflow-y-auto">
                    {/* Agents */}
                    <AccordionItem
                        id="agents"
                        icon={<Bot className="w-4 h-4" />}
                        label="Agents"
                        expanded={expandedSection === 'agents'}
                        onToggle={() => handleToggle('agents')}
                        badge={agents.length}
                    >
                        {agentsLoading ? (
                            <div className="text-xs text-text-muted py-2">Loading...</div>
                        ) : (
                            <AgentList
                                agents={agents}
                                selectedId={selectedAgentId}
                                onSelect={(id) => onAgentChange?.(id)}
                            />
                        )}
                    </AccordionItem>

                    {/* Models */}
                    <AccordionItem
                        id="models"
                        icon={<Brain className="w-4 h-4" />}
                        label="Models"
                        expanded={expandedSection === 'models'}
                        onToggle={() => handleToggle('models')}
                        badge={models.length}
                    >
                        {modelsLoading ? (
                            <div className="text-xs text-text-muted py-2">Loading...</div>
                        ) : (
                            <ModelList
                                models={models}
                                selectedId={selectedModelId}
                                onSelect={(id) => onModelChange?.(id)}
                            />
                        )}
                    </AccordionItem>

                    {/* MCP Servers */}
                    <AccordionItem
                        id="mcp"
                        icon={<Link2 className="w-4 h-4" />}
                        label="MCP Servers"
                        expanded={expandedSection === 'mcp'}
                        onToggle={() => handleToggle('mcp')}
                        badge={mcpServers.filter((s) => s.enabled).length}
                    >
                        {mcpLoading ? (
                            <div className="text-xs text-text-muted py-2">Loading...</div>
                        ) : (
                            <MCPList servers={mcpServers} onToggle={handleMcpToggle} />
                        )}
                    </AccordionItem>

                    {/* Prompts */}
                    <AccordionItem
                        id="prompts"
                        icon={<FileText className="w-4 h-4" />}
                        label="Prompts"
                        expanded={expandedSection === 'prompts'}
                        onToggle={() => handleToggle('prompts')}
                        badge={prompts.length}
                    >
                        {promptsLoading ? (
                            <div className="text-xs text-text-muted py-2">Loading...</div>
                        ) : (
                            <PromptList prompts={prompts} currentPromptId={currentPromptId} />
                        )}
                    </AccordionItem>

                    {/* API Keys */}
                    <AccordionItem
                        id="apikeys"
                        icon={<Key className="w-4 h-4" />}
                        label="API Keys"
                        expanded={expandedSection === 'apikeys'}
                        onToggle={() => handleToggle('apikeys')}
                    >
                        <div className="text-xs text-text-muted py-2">
                            <p className="mb-2">API keys are managed in settings.</p>
                            <button
                                onClick={() => {
                                    // TODO: Navigate to settings or open API key modal
                                    console.log('Navigate to API keys settings');
                                }}
                                className="text-primary hover:underline flex items-center gap-1"
                            >
                                <Settings className="w-3 h-3" />
                                Open Settings
                            </button>
                        </div>
                    </AccordionItem>
                </div>

                {/* Footer */}
                <footer className="flex-shrink-0 px-3 py-2 border-t border-border-subtle text-[10px] text-text-muted">
                    Changes won't affect current conversation
                </footer>
            </div>
        </motion.aside>
    );
};

export default ConfigDrawer;
