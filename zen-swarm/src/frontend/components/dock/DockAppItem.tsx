/**
 * DockAppItem 组件
 * macOS 风格 Dock 图标，支持 emoji 和 Lucide 图标
 */

import type { AppId, NotificationState } from '../app-registry/index.js';
import type { ReactNode } from 'react';
import { BarChart3, Settings2, FolderOpen, Folder, Clock, LucideIcon } from 'lucide-react';

interface DockAppItemProps {
    appId: AppId;
    icon: string | ReactNode;
    label: string;
    isActive: boolean;
    notification?: NotificationState;
    onClick: () => void;
    onContextMenu?: (e: React.MouseEvent, appId: AppId) => void;
}

/**
 * Lucide 图标映射表
 * 将图标名称字符串映射到对应的图标组件
 */
const iconMap: Record<string, LucideIcon> = {
    'bar-chart-3': BarChart3,
    'settings-2': Settings2,
    'folder-open': FolderOpen,
    folder: Folder,
    clock: Clock,
};

export function DockAppItem({ appId, icon, label, isActive, notification, onClick, onContextMenu }: DockAppItemProps) {
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        onContextMenu?.(e, appId);
    };

    const hasNotification = notification && notification.count > 0;
    const showBadge = hasNotification && notification.count > 9;
    const showDot = hasNotification && notification.count <= 9;

    const isReactElement = typeof icon !== 'string';

    // 如果是字符串且在图标映射表中，使用 Lucide 图标组件
    const IconComponent = typeof icon === 'string' ? iconMap[icon] : null;

    return (
        <div className="dock-item">
            <button
                className="dock-icon-btn"
                onClick={onClick}
                onContextMenu={handleContextMenu}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
            >
                {isReactElement ? (
                    <div className="dock-icon dock-icon-react">{icon}</div>
                ) : IconComponent ? (
                    <div className="dock-icon dock-icon-react">
                        <IconComponent size={24} />
                    </div>
                ) : (
                    <span className="dock-icon">{icon}</span>
                )}

                {/* Active background highlight */}
                {isActive && (
                    <span
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(59, 130, 246, 0.15)',
                            borderRadius: '12px',
                            pointerEvents: 'none',
                        }}
                    />
                )}
            </button>

            {/* Tooltip */}
            <span className="dock-tooltip">{label}</span>

            {/* Active Indicator */}
            {isActive && <span className="dock-indicator" />}

            {/* Notification Badge (count > 9) */}
            {showBadge && <span className="dock-badge">{notification!.count > 99 ? '99+' : notification!.count}</span>}

            {/* Notification Dot (count <= 9) */}
            {showDot && <span className="dock-dot" />}
        </div>
    );
}
