/**
 * Instance Detail Component
 *
 * Shows details of a state instance
 */

import { useState } from 'react';
import { Clock, Activity, ChevronRight, History } from '../../../components/ui/Icons.js';
import { useSMStore } from '../../../stores/smStore.js';
import { useSMInstance, useSMTransition } from '../../../hooks/useSM.js';
import { HistoryTimeline } from './HistoryTimeline.js';

interface InstanceDetailProps {
    stateId: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: 'bg-green-100', text: 'text-green-700' },
    completed: { bg: 'bg-blue-100', text: 'text-blue-700' },
    failed: { bg: 'bg-red-100', text: 'text-red-700' },
    paused: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
};

export function InstanceDetail({ stateId }: InstanceDetailProps) {
    const { selectedMachineId } = useSMStore();
    const { data: instance, isLoading, error } = useSMInstance(stateId, selectedMachineId);
    const transitionMutation = useSMTransition();
    const [showHistory, setShowHistory] = useState(false);

    const handleTransition = (targetState: string) => {
        if (selectedMachineId) {
            transitionMutation.mutate({
                state_id: stateId,
                machine_id: selectedMachineId,
                target_state: targetState,
            });
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-32 text-red-600">
                <p>Failed to load instance</p>
                <p className="text-xs mt-1 text-gray-400">{String(error)}</p>
            </div>
        );
    }

    if (!instance) {
        return <div className="flex items-center justify-center h-32 text-gray-400">Instance not found</div>;
    }

    const statusStyle = statusColors[instance.status] || statusColors.active;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{instance.state_id}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                            {instance.status}
                        </span>
                    </div>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-1.5 rounded-md transition-colors ${
                            showHistory ? 'bg-blue-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title="Toggle history"
                    >
                        <History size={16} />
                    </button>
                </div>
                <div className="text-xs text-gray-500">{instance.machine_id}</div>
            </div>

            {/* History Timeline */}
            {showHistory ? (
                <HistoryTimeline stateId={stateId} />
            ) : (
                <>
                    {/* Current State */}
                    <div className="p-4 border-b border-gray-200">
                        <h4 className="text-xs text-gray-500 uppercase mb-2">Current State</h4>
                        <div className="flex items-center gap-2">
                            <Activity size={16} className="text-blue-600" />
                            <span className="font-mono text-lg text-blue-600">{instance.current_state}</span>
                        </div>
                    </div>

                    {/* Available Transitions */}
                    <div className="p-4 border-b border-gray-200">
                        <h4 className="text-xs text-gray-500 uppercase mb-2">Available Transitions</h4>
                        <div className="flex flex-wrap gap-2">
                            {instance.available_transitions?.map((target: string) => (
                                <button
                                    key={target}
                                    onClick={() => handleTransition(target)}
                                    disabled={transitionMutation.isPending}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm transition-colors disabled:opacity-50"
                                >
                                    <ChevronRight size={12} />
                                    {target}
                                </button>
                            ))}
                            {(!instance.available_transitions || instance.available_transitions.length === 0) && (
                                <span className="text-xs text-gray-400">No transitions available</span>
                            )}
                        </div>
                    </div>

                    {/* Context */}
                    <div className="p-4 border-b border-gray-200">
                        <h4 className="text-xs text-gray-500 uppercase mb-2">Context</h4>
                        <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-700 overflow-auto max-h-48">
                            <pre>{JSON.stringify(instance.context, null, 2)}</pre>
                        </div>
                    </div>

                    {/* Timestamps */}
                    <div className="p-4 space-y-2 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                            <Clock size={12} />
                            <span>Created: {new Date(instance.created_at).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock size={12} />
                            <span>Updated: {new Date(instance.updated_at).toLocaleString()}</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default InstanceDetail;
