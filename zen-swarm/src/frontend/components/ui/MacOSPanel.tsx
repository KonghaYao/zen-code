/**
 * MacOSPanel 组件
 * macOS 风格的 Panel 包装组件，带有红绿灯按钮
 *
 * 布局结构：
 * ┌─────────────────────────────────┐
 * │ 🔴 🟡 🟢    [Title]             │  <- 透明背景 Header
 * ├─────────────────────────────────┤
 * │                                 │
 * │         Content Area            │
 * │                                 │
 * └─────────────────────────────────┘
 */

import { ReactNode, memo } from 'react';
import { TrafficLights } from './TrafficLights.js';

interface MacOSPanelProps {
    /** Panel 标题 */
    title?: string;
    /** 关闭回调 */
    onClose?: () => void;
    /** 子组件 */
    children: ReactNode;
    /** 自定义 className */
    className?: string;
    /** Header 右侧额外内容 */
    headerRight?: ReactNode;
    /** 是否禁用红绿灯 */
    disableTrafficLights?: boolean;
    /** 是否显示红绿灯（默认 true） */
    showTrafficLights?: boolean;
}

export const MacOSPanel = memo(function MacOSPanel({
    title,
    onClose,
    children,
    className = '',
    headerRight,
    disableTrafficLights = false,
    showTrafficLights = true,
}: MacOSPanelProps) {
    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* macOS Style Header - 透明背景 */}
            {showTrafficLights && (
                <header className="flex-shrink-0 bg-transparent px-4 py-3 flex items-center justify-between border-b border-border-subtle">
                    <div className="flex items-center gap-3">
                        <TrafficLights onClose={onClose} disabled={disableTrafficLights} />
                        {title && <h2 className="text-lg font-medium text-text-primary ml-2">{title}</h2>}
                    </div>
                    {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
                </header>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-auto min-h-0">{children}</div>
        </div>
    );
});

/**
 * MacOSPanelHeader - 可单独使用的 Header 组件
 * 用于自定义布局场景
 */
interface MacOSPanelHeaderProps {
    title?: string;
    onClose?: () => void;
    headerRight?: ReactNode;
    disableTrafficLights?: boolean;
    showTrafficLights?: boolean;
}

export const MacOSPanelHeader = memo(function MacOSPanelHeader({
    title,
    onClose,
    headerRight,
    disableTrafficLights = false,
    showTrafficLights = true,
}: MacOSPanelHeaderProps) {
    if (!showTrafficLights) {
        return null;
    }

    return (
        <header className="flex-shrink-0 bg-transparent px-4 py-3 flex items-center justify-between border-b border-border-subtle">
            <div className="flex items-center gap-3">
                <TrafficLights onClose={onClose} disabled={disableTrafficLights} />
                {title && <h2 className="text-lg font-medium text-text-primary ml-2">{title}</h2>}
            </div>
            {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </header>
    );
});
