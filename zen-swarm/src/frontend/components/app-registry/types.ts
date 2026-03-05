/**
 * App Registry 类型定义
 * 用于 Dock 系统的应用注册
 */

import type { ComponentType, ReactNode } from 'react';

/**
 * 应用 ID 类型
 */
export type AppId = 'chat' | 'config' | 'finder' | 'sm' | 'cron' | 'monitor' | 'terminal';

/**
 * 通知状态
 */
export interface NotificationState {
    count: number;
    hasUpdate: boolean;
    lastUpdateTime: number;
}

/**
 * 右键菜单动作类型
 */
export type ContextAction = 'open' | 'close' | 'notifications' | 'settings' | 'help';

/**
 * 应用注册表项
 */
export interface AppRegistryItem {
    id: AppId;
    name: string;
    /** 完整自定义 Dock 图标（SVG 组件） */
    fullIcon: ReactNode;
    description: string;
    viewComponent: ComponentType;
    defaultOpen?: boolean;
    notificationKey?: string;
    contextMenuActions?: ContextAction[];
    keyboardShortcut?: string;
}

/**
 * 通知数据映射
 */
export type NotificationData = Partial<Record<AppId, NotificationState>>;
