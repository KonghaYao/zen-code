/**
 * IconButton 组件 - 统一的图标按钮
 *
 * 用途：
 * - 替代各处零散的 icon button 写法
 * - 统一 padding-0（通过固定尺寸实现）、hover 效果、圆角、过渡动画
 */

import { forwardRef, type ReactNode } from 'react';

type IconButtonVariant = 'default' | 'danger' | 'success' | 'warning' | 'primary';

interface IconButtonProps {
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    title?: string;
    children: ReactNode;
    variant?: IconButtonVariant;
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
    'aria-label'?: string;
    'aria-expanded'?: boolean;
}

const variantClasses: Record<IconButtonVariant, string> = {
    default: 'text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary',
    danger: 'text-text-tertiary hover:text-error hover:bg-error-light',
    success: 'text-text-tertiary hover:text-success hover:bg-success-light',
    warning: 'text-text-tertiary hover:text-warning hover:bg-warning-light',
    primary: 'text-text-tertiary hover:text-primary hover:bg-primary-light',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    {
        onClick,
        title,
        children,
        variant = 'default',
        disabled,
        className = '',
        type = 'button',
        'aria-label': ariaLabel,
        'aria-expanded': ariaExpanded,
    },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            onClick={onClick}
            title={title}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-expanded={ariaExpanded}
            style={{ padding: 0 }}
            className={`
                inline-flex items-center justify-center
                w-7 h-7 rounded-md
                transition-colors
                ${variantClasses[variant]}
                ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
                ${className}
            `}
        >
            {children}
        </button>
    );
});
