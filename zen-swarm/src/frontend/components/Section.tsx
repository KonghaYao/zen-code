/**
 * Section 组件
 *
 * 视图中的分组容器，包含标题和内容区域
 */

import type { ReactNode } from 'react';

interface SectionProps {
    title: string;
    actions?: ReactNode;
    children: ReactNode;
}

export function Section({ title, actions, children }: SectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
                {actions}
            </div>
            {children}
        </div>
    );
}
