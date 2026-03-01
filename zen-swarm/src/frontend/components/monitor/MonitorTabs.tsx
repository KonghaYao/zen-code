/**
 * 监控面板标签页组件
 */

import type { MonitorTab } from './types.js';

interface MonitorTabsProps {
    activeTab: MonitorTab;
    onTabChange: (tab: MonitorTab) => void;
}

export function MonitorTabs({ activeTab, onTabChange }: MonitorTabsProps) {
    const tabs: { id: MonitorTab; label: string; icon: string }[] = [
        { id: 'cpu', label: 'CPU', icon: '🔲' },
        { id: 'memory', label: 'Memory', icon: '💾' },
        { id: 'energy', label: 'Energy', icon: '⚡' },
        { id: 'disk', label: 'Disk', icon: '💿' },
        { id: 'network', label: 'Network', icon: '🌐' },
        { id: 'agents', label: 'Agents', icon: '🤖' },
    ];

    return (
        <div className="flex items-center gap-1 border-b border-border-subtle">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                        activeTab === tab.id
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-text-muted hover:text-text-primary'
                    }`}
                >
                    <span>{tab.icon}</span>
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
