/**
 * 主布局组件
 *
 * 使用卡片网格布局，包含 6 个主要视图：
 * - Dashboard: 概览仪表盘
 * - Agent Config: Agent 配置（Agents + Models + Prompts）
 * - Resources: 资源管理（Tools + Middlewares + MCP + Skills）
 * - Files: 文件浏览器
 * - Cron: 定时任务管理
 * - Chat: 聊天界面（全屏模式）
 */

import { useState, ReactElement } from 'react';
import type { PanelType, Tab } from '../types/index.js';

const tabs: Tab[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'agent-config', label: 'Agent Config', icon: '🤖' },
    { id: 'resources', label: 'Resources', icon: '📦' },
    { id: 'files', label: 'Files', icon: '📁' },
    { id: 'cron', label: 'Cron', icon: '⏰' },
    { id: 'chat', label: 'Chat', icon: '💬' },
];

interface MainLayoutProps {
    children: (tab: PanelType) => ReactElement;
}

export function MainLayout(props: MainLayoutProps) {
    const [activeTab, setActiveTab] = useState<PanelType>('chat');

    // Chat panel is full-screen, no padding/scroll wrapper
    const isChat = activeTab === 'chat';

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-[var(--color-bg-primary)]">
            {/* Header */}
            <header className="flex-shrink-0 bg-white border-b border-[var(--color-border-subtle)] px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
                            <span className="text-lg font-bold text-white">Z</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Zen Swarm</h1>
                            <p className="text-xs text-[var(--color-text-muted)]">Multi-Agent Dashboard</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tab Navigation */}
            <nav className="flex-shrink-0 bg-white border-b border-[var(--color-border-subtle)] px-6">
                <div className="max-w-7xl mx-auto flex space-x-1">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as PanelType)}
                                className={`
                                    relative px-4 py-3 text-sm font-medium transition-colors duration-150 border-b-2
                                    ${
                                        isActive
                                            ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                                            : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                                    }
                                `}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                {isChat ? (
                    // Chat panel: full height, no wrapper
                    <div className="h-full">{props.children(activeTab)}</div>
                ) : (
                    // Other panels: scrollable content
                    <div className="h-full overflow-y-auto px-6 py-8">
                        <div className="max-w-7xl mx-auto">{props.children(activeTab)}</div>
                    </div>
                )}
            </main>
        </div>
    );
}
