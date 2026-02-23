/**
 * App 注册表
 * 集中管理所有 Dock 应用
 */

import type { AppRegistryItem, AppId } from './types.js';

// 直接导入视图组件（不支持懒加载，因为没有 default export）
import { DashboardView } from '../../views/DashboardView.js';
import { ConfigView } from '../../views/ConfigView.js';
import { WorkspaceView } from '../../views/WorkspaceView.js';
import { FinderView } from '../../views/Finder/index.js';
import { CronView } from '../../views/CronView.js';

/**
 * 应用注册表
 * 定义所有 Dock 中可用的应用
 */
export const appRegistry: AppRegistryItem[] = [
    {
        id: 'dashboard',
        name: 'Dashboard',
        icon: '📊',
        description: '概览仪表盘',
        viewComponent: DashboardView,
        defaultOpen: true,
        keyboardShortcut: 'Cmd+1',
        contextMenuActions: ['open', 'help'],
    },
    {
        id: 'config',
        name: 'Config',
        icon: '⚙️',
        description: 'AI 配置与资源管理',
        viewComponent: ConfigView,
        keyboardShortcut: 'Cmd+2',
        contextMenuActions: ['open', 'help'],
    },
    {
        id: 'finder',
        name: 'Finder',
        icon: '🗂️',
        description: 'macOS 风格文件管理器',
        viewComponent: FinderView,
        keyboardShortcut: 'Cmd+3',
        contextMenuActions: ['open', 'help'],
    },
    {
        id: 'workspaces',
        name: 'Workspace',
        icon: '📁',
        description: 'VSCode 风格工作空间',
        viewComponent: WorkspaceView,
        keyboardShortcut: 'Cmd+4',
        contextMenuActions: ['open', 'help'],
    },
    {
        id: 'cron',
        name: 'Cron',
        icon: '⏰',
        description: '定时任务管理',
        viewComponent: CronView,
        keyboardShortcut: 'Cmd+5',
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
