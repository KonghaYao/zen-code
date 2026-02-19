/**
 * ToolsPanel 主组件 - 只读模式
 */

import { useState, useEffect } from 'react';
import type { Tool } from '../../../types/index.js';
import { apiClient } from '../../../api.js';
import { ToolCard } from './ToolCard.js';
import { LoadingOverlay } from '../../LoadingSpinner.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';

export function ToolsPanel() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tools, setTools] = useState<Tool[]>([]);

    const loadTools = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.tools.list.query();
            setTools(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTools();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Tools ({tools.length})</h2>
            </div>

            {loading && <LoadingOverlay />}

            {error && <ErrorDisplay error={error} onRetry={loadTools} />}

            {!loading && !error && tools.length === 0 && <EmptyState message="No tools available." />}

            {!loading && !error && tools.length > 0 && (
                <div className="grid gap-4">
                    {tools.map((tool) => (
                        <ToolCard key={tool.id} tool={tool} />
                    ))}
                </div>
            )}
        </div>
    );
}
