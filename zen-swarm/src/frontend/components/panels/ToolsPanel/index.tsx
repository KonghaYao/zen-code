/**
 * ToolsPanel 主组件 - 只读模式
 */

import type { Tool } from '../../../types/index.js';
import { trpc } from '../../../api.js';
import { ToolCard } from './ToolCard.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';

export function ToolsPanel() {
    const { data: tools = [], isLoading, error } = trpc.tools.list.useQuery();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Tools ({tools.length})</h2>
            </div>

            {error && <ErrorDisplay error={error.message} onRetry={() => {}} />}

            {!isLoading && !error && tools.length === 0 && <EmptyState message="No tools available." />}

            {!isLoading && !error && tools.length > 0 && (
                <div className="grid gap-4">
                    {tools.map((tool) => (
                        <ToolCard key={tool.id} tool={tool} />
                    ))}
                </div>
            )}
        </div>
    );
}
