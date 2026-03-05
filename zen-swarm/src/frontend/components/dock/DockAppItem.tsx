/**
 * DockAppItem 组件
 * macOS 风格 Dock 图标，使用精绘 SVG fullIcon。
 */

import type { ReactNode } from 'react';
import type { AppId, NotificationState } from '../app-registry/index.js';

interface DockAppItemProps {
    appId: AppId;
    fullIcon: ReactNode;
    label: string;
    isActive: boolean;
    notification?: NotificationState;
    onClick: () => void;
    onContextMenu?: (e: React.MouseEvent, appId: AppId) => void;
}

export function DockAppItem({
    appId,
    fullIcon,
    label,
    isActive,
    notification,
    onClick,
    onContextMenu,
}: DockAppItemProps) {
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        onContextMenu?.(e, appId);
    };

    const hasNotification = notification && notification.count > 0;
    const showBadge = hasNotification && notification.count > 9;
    const showDot = hasNotification && notification.count <= 9;

    return (
        <div className="dock-item">
            <button
                className={`dock-icon-btn${isActive ? ' dock-icon-btn--active' : ''}`}
                onClick={onClick}
                onContextMenu={handleContextMenu}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
            >
                <div className="dock-full-icon">{fullIcon}</div>
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
