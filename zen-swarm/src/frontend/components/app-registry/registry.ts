/**
 * App 注册表
 * 集中管理所有 Dock 应用
 */

import type { AppRegistryItem, AppId } from './types.js';
import React from 'react';

// Direct view imports
import { ChatView } from '../../views/ChatView.js';
import { ConfigView } from '../../views/ConfigView.js';
// import { WorkspaceView } from '../../views/WorkspaceView.js'; // 已废弃
import { FinderView } from '../../views/Finder/index.js';
import { CronView } from '../../views/CronView.js';
import { SMView } from '../../views/SM/index.js';
import { MonitorView } from '../../views/MonitorView.js';
import { TerminalView } from '../../components/terminal/TerminalView.js';

// Lucide icons from Icons.tsx
import {
    MessageSquare,
    Settings,
    FolderOpen,
    Clock,
    GitBranch,
    Activity,
    Terminal as TerminalIcon,
} from '../../components/ui/Icons.js';

// Custom hand-crafted dock icons
import { ChatDockIcon } from '../dock/icons/ChatDockIcon.js';
import { ConfigDockIcon } from '../dock/icons/ConfigDockIcon.js';
import { FinderDockIcon } from '../dock/icons/FinderDockIcon.js';
import { MonitorDockIcon } from '../dock/icons/MonitorDockIcon.js';
import { SMDockIcon } from '../dock/icons/SMDockIcon.js';
import { CronDockIcon } from '../dock/icons/CronDockIcon.js';
import { TerminalDockIcon } from '../dock/icons/TerminalDockIcon.js';

/**
 * 应用注册表
 * 定义所有 Dock 中可用的应用
 */
export const appRegistry: AppRegistryItem[] = [
    {
        id: 'chat',
        name: 'Chat',
        icon: React.createElement(MessageSquare, { size: 24 }),
        iconColor: ['#4F8EF5', '#7B5CF6'],
        fullIcon: React.createElement(ChatDockIcon, { className: 'w-full h-full' }),
        description: 'AI 聊天助手',
        viewComponent: ChatView,
        defaultOpen: true,
        keyboardShortcut: 'Cmd+1',
        contextMenuActions: ['open', 'help'],
    },
    {
        id: 'config',
        name: 'Config',
        icon: React.createElement(Settings, { size: 24 }),
        iconColor: ['#6B7280', '#1F2937'],
        fullIcon: React.createElement(ConfigDockIcon, { className: 'w-full h-full' }),
        description: 'AI 配置与资源管理',
        viewComponent: ConfigView,
        keyboardShortcut: 'Cmd+2',
        contextMenuActions: ['open', 'help'],
    },
    {
        id: 'finder',
        name: 'Finder',
        icon: React.createElement(FolderOpen, { size: 24 }),
        iconColor: ['#4A9AF5', '#2DD4BF'],
        fullIcon: React.createElement(FinderDockIcon, { className: 'w-full h-full' }),
        description: 'macOS 风格文件管理器',
        viewComponent: FinderView,
        keyboardShortcut: 'Cmd+3',
        contextMenuActions: ['open', 'help'],
    },
    {
        id: 'monitor',
        name: 'Monitor',
        icon: React.createElement(Activity, { size: 24 }),
        iconColor: ['#FF6B6B', '#F97316'],
        fullIcon: React.createElement(MonitorDockIcon, { className: 'w-full h-full' }),
        description: '进程监控面板',
        viewComponent: MonitorView,
        keyboardShortcut: 'Cmd+4',
        contextMenuActions: ['open', 'help'],
    },
    {
        id: 'sm',
        name: 'State Machine',
        icon: React.createElement(GitBranch, { size: 24 }),
        iconColor: ['#C084FC', '#7C3AED'],
        fullIcon: React.createElement(SMDockIcon, { className: 'w-full h-full' }),
        description: '状态机管理与可视化',
        viewComponent: SMView,
        keyboardShortcut: 'Cmd+5',
        contextMenuActions: ['open', 'help'],
    },
    {
        id: 'cron',
        name: 'Cron',
        icon: React.createElement(Clock, { size: 24 }),
        iconColor: ['#34D399', '#059669'],
        fullIcon: React.createElement(CronDockIcon, { className: 'w-full h-full' }),
        description: '定时任务管理',
        viewComponent: CronView,
        keyboardShortcut: 'Cmd+6',
        contextMenuActions: ['open', 'help'],
    },
    {
        id: 'terminal',
        name: 'Terminal',
        icon: React.createElement(TerminalIcon, { size: 24 }),
        iconColor: ['#374151', '#111827'],
        fullIcon: React.createElement(TerminalDockIcon, { className: 'w-full h-full' }),
        description: 'Web 终端',
        viewComponent: TerminalView,
        keyboardShortcut: 'Cmd+7',
        contextMenuActions: ['open', 'help'],
    },
];

/**
 * 根据 ID 获取应用信息
 */
export function getAppById(appId: AppId): AppRegistryItem | undefined {
    return appRegistry.find((app) => app.id === appId);
}

/**
 * 获取默认打开的应用 ID
 */
export function getDefaultAppId(): AppId | undefined {
    const defaultApp = appRegistry.find((app) => app.defaultOpen);
    return defaultApp?.id;
}

/**
 * 获取所有应用 ID 列表
 */
export function getAllAppIds(): AppId[] {
    return appRegistry.map((app) => app.id);
}

// 导出类型
export type { AppRegistryItem, AppId, NotificationState, ContextAction, NotificationData } from './types.js';
