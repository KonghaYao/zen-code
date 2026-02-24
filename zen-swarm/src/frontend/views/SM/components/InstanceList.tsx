/**
 * Instance List Component
 *
 * Displays list of state instances
 */

import React from 'react';
import { useSMStore, type StateInstance } from '../../../stores/smStore.js';
import { useSMInstances } from '../../../hooks/useSM.js';

interface InstanceListProps {}

const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    completed: 'bg-blue-500',
    failed: 'bg-red-500',
    paused: 'bg-yellow-500',
};

export function InstanceList({}: InstanceListProps) {
    const { selectedStateId, selectState, selectedMachineId } = useSMStore();

    const { data: instances, isLoading, error } = useSMInstances(selectedMachineId || undefined);

    if (isLoading) {
        return <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-32 text-red-600">
                <p>Failed to load instances</p>
                <p className="text-xs mt-1 text-gray-400">{String(error)}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">{instances?.length || 0} instances</span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {instances?.map((instance: StateInstance) => (
                    <InstanceItem
                        key={instance.state_id}
                        instance={instance as StateInstance}
                        isSelected={selectedStateId === instance.state_id}
                        onSelect={() => selectState(instance.state_id)}
                    />
                ))}

                {(!instances || instances.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                        <p>No instances yet</p>
                        <p className="text-xs mt-1">Create an instance from a definition</p>
                    </div>
                )}
            </div>
        </div>
    );
}

interface InstanceItemProps {
    instance: StateInstance;
    isSelected: boolean;
    onSelect: () => void;
}

function InstanceItem({ instance, isSelected, onSelect }: InstanceItemProps) {
    return (
        <div
            onClick={onSelect}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-50 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
            }`}
        >
            {/* Status indicator */}
            <div className={`w-2 h-2 rounded-full ${statusColors[instance.status] || 'bg-gray-400'}`} />

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{instance.state_id}</div>
                <div className="text-xs text-gray-500">
                    {instance.machine_id} → {instance.current_state}
                </div>
            </div>

            {/* Status */}
            <div className="text-xs text-gray-500 capitalize">{instance.status}</div>
        </div>
    );
}

export default InstanceList;
