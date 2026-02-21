/**
 * CardGrid 组件
 *
 * 通用卡片网格布局组件
 */

import type { ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner.js';
import { EmptyState } from './ErrorDisplay.js';

export type EmptyAction = { label: string; onClick: () => void };

export interface CardGridProps<T> {
    items: T[];
    renderCard: (item: T, index: number) => ReactNode;
    loading?: boolean;
    emptyMessage?: string;
    emptyAction?: EmptyAction;
}

export function CardGrid<T>({ items, renderCard, loading, emptyMessage, emptyAction }: CardGridProps<T>) {
    if (loading) {
        return <LoadingSpinner />;
    }

    if (items.length === 0) {
        return <EmptyState message={emptyMessage || 'No items found'} action={emptyAction} />;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item, index) => renderCard(item, index))}
        </div>
    );
}
