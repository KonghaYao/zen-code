/**
 * MiddlewaresPanel 主组件 - 只读模式
 */

import { useState, useEffect } from 'react';
import type { Middleware } from '../../../types/index.js';
import { apiClient } from '../../../api.js';
import { MiddlewareCard } from './MiddlewareCard.js';
import { LoadingOverlay } from '../../LoadingSpinner.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';

export function MiddlewaresPanel() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [middlewares, setMiddlewares] = useState<Middleware[]>([]);

    const loadMiddlewares = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.middlewares.list.query();
            setMiddlewares(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMiddlewares();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Middlewares ({middlewares.length})</h2>
            </div>

            {loading && <LoadingOverlay />}

            {error && <ErrorDisplay error={error} onRetry={loadMiddlewares} />}

            {!loading && !error && middlewares.length === 0 && <EmptyState message="No middlewares available." />}

            {!loading && !error && middlewares.length > 0 && (
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
