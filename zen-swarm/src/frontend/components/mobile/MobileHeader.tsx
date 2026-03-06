/**
 * MobileHeader 组件
 * 移动端顶部导航栏，类 Claude.ai 风格
 * 简洁磨砂玻璃效果，支持动态操作按钮注入
 */

import React from 'react';
import { motion } from 'motion/react';

export interface MobileHeaderAction {
    id: string;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    active?: boolean;
}

interface MobileHeaderProps {
    /** 当前页面标题 */
    title: string;
    /** 右侧操作按钮列表 */
    actions?: MobileHeaderAction[];
    /** 左侧内容（可选，默认显示标题） */
    leftContent?: React.ReactNode;
}

/**
 * Zen Swarm Logo
 */
function ZenSwarmLogo() {
    return (
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <polyline
                points="3,3.5 13,3.5 3,12.5 13,12.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function MobileHeader({ title, actions = [], leftContent }: MobileHeaderProps) {
    return (
        <motion.header
            className="
                fixed top-0 left-0 right-0 z-50
                h-[52px] flex items-center justify-between
                px-4
                bg-white/90 dark:bg-neutral-900/90
                backdrop-blur-xl
                border-b border-neutral-200/60 dark:border-neutral-700/60
                select-none
            "
            initial={{ y: -52, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
            {/* 左侧：Logo + 标题 */}
            <div className="flex items-center gap-2.5">
                {leftContent ?? (
                    <>
                        <span className="text-neutral-700 dark:text-neutral-300">
                            <ZenSwarmLogo />
                        </span>
                        <span className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                            {title}
                        </span>
                    </>
                )}
            </div>

            {/* 右侧：操作按钮 */}
            {actions.length > 0 && (
                <div className="flex items-center gap-1">
                    {actions.map((action) => (
                        <button
                            key={action.id}
                            onClick={action.onClick}
                            aria-label={action.label}
                            className={`
                                w-9 h-9 flex items-center justify-center rounded-full
                                transition-colors duration-150
                                ${
                                    action.active
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                }
                            `}
                        >
                            {action.icon}
                        </button>
                    ))}
                </div>
            )}
        </motion.header>
    );
}
