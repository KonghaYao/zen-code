/**
 * 主布局组件
 */

import { useState, ReactElement } from 'react';
import type { PanelType, Tab } from '../types/index.js';

const tabs: Tab[] = [
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'agents', label: 'Agents', icon: '🤖' },
    { id: 'models', label: 'Models', icon: '🧠' },
    { id: 'prompts', label: 'Prompts', icon: '📝' },
    { id: 'tools', label: 'Tools', icon: '🔧' },
    { id: 'middlewares', label: 'Middlewares', icon: '🔌' },
    { id: 'mcp', label: 'MCP', icon: '🔗' },
];

interface MainLayoutProps {
    children: (tab: PanelType) => ReactElement;
}

export function MainLayout(props: MainLayoutProps) {
    const [activeTab, setActiveTab] = useState<PanelType>('chat');

    // Chat panel is full-screen, no padding/scroll wrapper
    const isChat = activeTab === 'chat';

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            {/* Header */}
            <header className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">Zen Swarm</h1>
                    <span className="text-sm text-gray-400">Multi-Agent Dashboard</span>
                </div>
            </header>

            {/* Tab Navigation */}
            <nav className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-6">
                <div className="max-w-7xl mx-auto flex space-x-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as PanelType)}
                            className={`px-4 py-3 text-sm font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'tab-active text-white border-b-2 border-blue-500'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                            }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                {isChat ? (
                    // Chat panel: full height, no wrapper
                    <div className="h-full">{props.children(activeTab)}</div>
                ) : (
                    // Other panels: scrollable content
                    <div className="h-full overflow-y-auto px-6 py-8">{props.children(activeTab)}</div>
                )}
            </main>
        </div>
    );
}
