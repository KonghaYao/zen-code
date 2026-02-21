/**
 * 右侧面板类型定义
 * 用于 FileExplorerView 的可切换面板系统
 */

// ========================================
// Types
// ========================================

/**
 * 右侧面板类型
 */
export type RightPanelType = 'search' | 'chat';

/**
 * 面板配置
 */
export interface RightPanelConfig {
    id: RightPanelType;
    label: string;
    icon: React.ReactNode;
    shortcut?: string;
}

/**
 * 面板状态（用于持久化）
 */
export interface RightPanelState {
    activePanel: RightPanelType;
    isVisible: boolean;
    width: number;
}

// ========================================
// Constants
// ========================================

/**
 * 面板状态 LocalStorage key
 */
export const RIGHT_PANEL_STATE_KEY = 'zen-swarm:file-explorer:right-panel';

/**
 * 默认面板状态
 */
export const DEFAULT_PANEL_STATE: RightPanelState = {
    activePanel: 'search',
    isVisible: true,
    width: 280,
};

/**
 * 面板最小/最大宽度
 */
export const PANEL_CONSTRAINTS = {
    minWidth: 200,
    maxWidthPercent: 40,
} as const;
