/**
 * DashboardView 组件
 *
 * 概览仪表盘，显示核心指标和快速访问卡片
 */

import { useAgentsStore } from '../stores/index.js';
import { useModelsStore } from '../stores/index.js';
import { usePromptsStore } from '../stores/index.js';
import { useMcpStore } from '../stores/index.js';
import { useEffect, useRef } from 'react';

export function DashboardView() {
    const { agents, agentsLoading, loadAgents } = useAgentsStore();
    const { models, modelsLoading, loadModels } = useModelsStore();
    const { prompts, promptsLoading, loadPrompts } = usePromptsStore();
    const { mcpServers, mcpLoading, loadMcpServers } = useMcpStore();

    // 使用 ref 跟踪是否已加载，避免多次调用
    const hasLoadedAgents = useRef(false);
    const hasLoadedModels = useRef(false);
    const hasLoadedPrompts = useRef(false);
    const hasLoadedMcp = useRef(false);

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

    useEffect(() => {
        if (!hasLoadedMcp.current) {
            loadMcpServers();
            hasLoadedMcp.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeMcpCount = mcpServers.filter((s) => s.enabled).length;

    return (
        <div className="space-y-8">
            {/* 核心指标卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon="🤖"
                    title="Agents"
                    value={agents.length}
                    loading={agentsLoading}
                    description="Active agents"
                />
                <StatCard
                    icon="🧠"
                    title="Models"
                    value={models.length}
                    loading={modelsLoading}
                    description="Available models"
                />
                <StatCard
                    icon="📝"
                    title="Prompts"
                    value={prompts.length}
                    loading={promptsLoading}
                    description="Total prompts"
                />
                <StatCard
                    icon="🔗"
                    title="MCP Connections"
                    value={activeMcpCount}
                    subtitle={`of ${mcpServers.length} total`}
                    loading={mcpLoading}
                    description="Active connections"
                />
            </div>

            {/* 快速访问 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <QuickAccessSection title="Recent Agents" items={agents.slice(0, 4)} />
                <QuickAccessSection title="Recent Prompts" items={prompts.slice(0, 4)} />
            </div>
        </div>
    );
}

interface StatCardProps {
    icon: string;
    title: string;
    value: number;
    subtitle?: string;
    loading?: boolean;
    description?: string;
}

function StatCard({ icon, title, value, subtitle, loading, description }: StatCardProps) {
    return (
        <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-6 shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-[var(--color-text-muted)]">{title}</p>
                    <p className="text-3xl font-semibold text-[var(--color-text-primary)] mt-2">
                        {loading ? '...' : value}
                        {subtitle && (
                            <span className="text-lg font-normal text-[var(--color-text-muted)] ml-1">
                                / {subtitle}
                            </span>
                        )}
                    </p>
                    {description && <p className="text-xs text-[var(--color-text-muted)] mt-1">{description}</p>}
                </div>
                <div className="w-12 h-12 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center text-2xl">
                    {icon}
                </div>
            </div>
        </div>
    );
}

interface QuickAccessSectionProps {
    title: string;
    items: Array<{ id: string; name: string; description?: string }>;
}

function QuickAccessSection({ title, items }: QuickAccessSectionProps) {
    return (
        <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{title}</h3>
            {items.length === 0 ? (
                <p className="text-[var(--color-text-muted)] text-sm">No items yet</p>
            ) : (
                <ul className="space-y-3">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className="flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)] last:border-0"
                        >
                            <div>
                                <p className="font-medium text-[var(--color-text-primary)]">{item.name}</p>
                                {item.description && (
                                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-1">
                                        {item.description}
                                    </p>
                                )}
                            </div>
                            <button className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">
                                Open
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
