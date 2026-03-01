/**
 * ToolsPanel 主组件 - 只读模式
 * 支持 macOS 风格红绿灯按钮
 */

import type { Tool } from '../../../types/index.js';
import { trpc } from '../../../api.js';
import { ToolCard } from './ToolCard.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';
import { TrafficLights } from '../../ui/TrafficLights.js';

interface ToolsPanelProps {
    onClose?: () => void;
}

export function ToolsPanel({ onClose }: ToolsPanelProps) {
    const { data: tools = [], isLoading, error } = trpc.tools.list.useQuery();

    return (
        <div className="flex flex-col h-full">
            {/* macOS Style Header with Traffic Lights */}
            <header className="flex-shrink-0 bg-transparent px-4 py-3 flex items-center border-b border-border-subtle">
                <div className="flex items-center gap-3">
                    <TrafficLights onClose={onClose} />
                    <h2 className="text-xl font-semibold text-text-primary ml-2">
                        Tools
                        <span className="badge badge-primary ml-3">{tools.length}</span>
                    </h2>
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
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
        </div>
    );
}
