/**
 * DockAppItem 组件
 * macOS 风格 Dock 图标，使用 CSS 类名
 */

import type { AppId, NotificationState } from '../app-registry/index.js';

interface DockAppItemProps {
    appId: AppId;
    icon: string;
    label: string;
    isActive: boolean;
    notification?: NotificationState;
    onClick: () => void;
    onContextMenu?: (e: React.MouseEvent, appId: AppId) => void;
}

export function DockAppItem({ appId, icon, label, isActive, notification, onClick, onContextMenu }: DockAppItemProps) {
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
                className="dock-icon-btn"
                onClick={onClick}
                onContextMenu={handleContextMenu}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
            >
                <span className="dock-icon">{icon}</span>

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
