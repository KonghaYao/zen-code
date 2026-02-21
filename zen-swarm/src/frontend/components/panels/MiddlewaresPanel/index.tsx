/**
 * MiddlewaresPanel 主组件 - 只读模式
 */

import type { Middleware } from '../../../types/index.js';
import { trpc } from '../../../api.js';
import { MiddlewareCard } from './MiddlewareCard.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';

export function MiddlewaresPanel() {
    const { data: middlewares = [], isLoading, error } = trpc.middlewares.list.useQuery();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Middlewares ({middlewares.length})</h2>
            </div>

            {error && <ErrorDisplay error={error.message} onRetry={() => {}} />}

            {!isLoading && !error && middlewares.length === 0 && <EmptyState message="No middlewares available." />}

            {!isLoading && !error && middlewares.length > 0 && (
                <div className="grid gap-4">
                    {middlewares
                        .sort((a, b) => a.priority - b.priority)
                        .map((middleware) => (
                            <MiddlewareCard key={middleware.id} middleware={middleware} />
                        ))}
                </div>
            )}
        </div>
    );
}
