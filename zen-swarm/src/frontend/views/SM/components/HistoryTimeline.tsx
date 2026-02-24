/**
 * History Timeline Component
 *
 * Displays transition history with rollback capability
 */

import { useState } from 'react';
import { Clock, ArrowRight, RotateCcw, AlertCircle } from '../../../components/ui/Icons.js';
import { useSMHistory, useSMRollback } from '../../../hooks/useSM.js';

interface HistoryTimelineProps {
    stateId: string;
}

interface Transition {
    id: number;
    from_state: string;
    to_state: string;
    event_name: string;
    event_payload: Record<string, unknown> | null;
    timestamp: string;
    error: string | null;
}

interface TimelineItemProps {
    transition: Transition;
    isLatest: boolean;
    onRollback: () => void;
    isRollingBack: boolean;
}

export function HistoryTimeline({ stateId }: HistoryTimelineProps) {
    const { data: history, isLoading, error } = useSMHistory(stateId);
    const rollbackMutation = useSMRollback();

    if (isLoading) {
        return <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-32 text-red-600">
                <p>Failed to load history</p>
                <p className="text-xs mt-1 text-gray-400">{String(error)}</p>
            </div>
        );
    }

    const transitions: Transition[] = history?.transitions || [];

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold flex items-center gap-2">
                    <Clock size={16} />
                    Transition History
                </h3>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-4">
                {transitions.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-gray-400">No transitions yet</div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />

                        {/* Transitions */}
                        <div className="space-y-4">
                            {transitions.map((transition: Transition, index: number) => (
                                <TimelineItem
                                    key={transition.id}
                                    transition={transition}
                                    isLatest={index === 0}
                                    onRollback={() =>
                                        rollbackMutation.mutate({
                                            state_id: stateId,
                                            transition_id: transition.id,
                                        })
                                    }
                                    isRollingBack={
                                        rollbackMutation.isPending &&
                                        rollbackMutation.variables?.transition_id === transition.id
                                    }
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Load more */}
            {history?.has_more && (
                <div className="p-4 border-t border-gray-200">
                    <button className="w-full text-sm text-blue-600 hover:text-blue-700">Load more</button>
                </div>
            )}
        </div>
    );
}

function TimelineItem({ transition, isLatest, onRollback, isRollingBack }: TimelineItemProps) {
    const [expanded, setExpanded] = useState(false);
    const hasPayload = transition.event_payload && Object.keys(transition.event_payload).length > 0;

    return (
        <div className="relative pl-8">
            {/* Dot */}
            <div
                className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full ${
                    isLatest ? 'bg-green-500' : 'bg-white/30'
                }`}
            />

            {/* Content */}
            <div className={`bg-white/5 rounded-lg p-3 ${isLatest ? 'ring-1 ring-green-500/30' : ''}`}>
                {/* Event name */}
                <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-medium text-yellow-600">{transition.event_name}</span>
                    {!isLatest && (
                        <button
                            onClick={onRollback}
                            disabled={isRollingBack}
                            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 disabled:opacity-50"
                            title="Rollback to this state"
                        >
                            <RotateCcw size={12} />
                            {isRollingBack ? 'Rolling back...' : 'Rollback'}
                        </button>
                    )}
                </div>

                {/* State transition */}
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-blue-600">{transition.from_state}</span>
                    <ArrowRight size={12} className="text-gray-400" />
                    <span className="text-green-600">{transition.to_state}</span>
                </div>

                {/* Timestamp */}
                <div className="text-xs text-gray-500 mt-2">{new Date(transition.timestamp).toLocaleString()}</div>

                {/* Payload */}
                {hasPayload && (
                    <div className="mt-2">
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="text-xs text-gray-400 hover:text-gray-700"
                        >
                            {expanded ? 'Hide' : 'Show'} payload
                        </button>
                        {expanded && (
                            <div className="mt-2 bg-gray-50 rounded p-2 font-mono text-xs text-gray-600 overflow-auto max-h-24">
                                <pre>{JSON.stringify(transition.event_payload, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                )}

                {/* Error */}
                {transition.error && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle size={12} />
                        {transition.error}
                    </div>
                )}

                {/* Latest badge */}
                {isLatest && <div className="mt-2 text-xs text-green-600">Current state</div>}
            </div>
        </div>
    );
}

export default HistoryTimeline;
