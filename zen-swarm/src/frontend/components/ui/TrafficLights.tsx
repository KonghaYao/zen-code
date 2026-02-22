/**
 * TrafficLights 组件
 * macOS 风格红绿灯按钮（简化版）
 *
 * 功能：
 * - 显示三个彩色圆点（红、黄、绿）
 * - 红色按钮可点击关闭面板
 * - 简化版：始终显示彩色圆点，无 hover 图标变化
 */

import { memo } from 'react';

interface TrafficLightsProps {
    /** 关闭回调 */
    onClose?: () => void;
    /** 是否禁用 */
    disabled?: boolean;
    /** 是否显示最小化按钮功能（视觉保留，实际不生效） */
    showMinimize?: boolean;
    /** 是否显示最大化按钮功能（视觉保留，实际不生效） */
    showMaximize?: boolean;
}

export const TrafficLights = memo(function TrafficLights({
    onClose,
    disabled = false,
    showMinimize = true,
    showMaximize = true,
}: TrafficLightsProps) {
    const handleClose = () => {
        if (!disabled && onClose) {
            onClose();
        }
    };

    return (
        <div className="traffic-lights">
            {/* 关闭按钮 - 红色 */}
            <button
                type="button"
                className={`traffic-light traffic-light-close ${disabled ? 'disabled' : ''}`}
                onClick={handleClose}
                disabled={disabled}
                aria-label="Close"
                title="Close"
            />

            {/* 最小化按钮 - 黄色（视觉保留） */}
            {showMinimize && (
                <button
                    type="button"
                    className="traffic-light traffic-light-minimize disabled"
                    disabled
                    aria-label="Minimize"
                    title="Minimize"
                />
            )}

            {/* 最大化按钮 - 绿色（视觉保留） */}
            {showMaximize && (
                <button
                    type="button"
                    className="traffic-light traffic-light-maximize disabled"
                    disabled
                    aria-label="Maximize"
                    title="Maximize"
                />
            )}
        </div>
    );
});
