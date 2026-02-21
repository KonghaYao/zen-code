/**
 * StatusBadge 组件
 *
 * 显示资源状态（active、inactive、loading）
 */

import type { ReactNode } from 'react';

export type Status = 'active' | 'inactive' | 'loading';

interface StatusBadgeProps {
    status: Status;
    label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
    const styles = {
        active: {
            bg: 'bg-green-100',
            text: 'text-green-700',
            dot: 'bg-green-500',
            defaultLabel: 'Active',
        },
        inactive: {
            bg: 'bg-gray-100',
            text: 'text-gray-700',
            dot: 'bg-gray-400',
            defaultLabel: 'Inactive',
        },
        loading: {
            bg: 'bg-blue-100',
            text: 'text-blue-700',
            dot: 'bg-blue-500 animate-pulse',
            defaultLabel: 'Loading',
        },
    };

    const style = styles[status];
    const displayLabel = label || style.defaultLabel;

    return (
        <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {displayLabel}
        </div>
    );
}
