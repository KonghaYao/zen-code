/**
 * All Instances List Component
 *
 * Displays all state instances across all machines
 */

import React from 'react';
import { useSMInstances } from '../../../hooks/useSM.js';
import { useSMStore, type StateInstance } from '../../../stores/smStore.js';
import { Activity, Layers } from '../../../components/ui/Icons.js';

const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    completed: 'bg-blue-500',
    failed: 'bg-red-500',
    paused: 'bg-yellow-500',
};

export function AllInstancesList() {
    const { selectedStateId, selectState, selectMachine, sidebarTab } = useSMStore();

    // Get all instances (no machine filter)
    const { data: instances, isLoading, error } = useSMInstances(undefined);

    // Only render if we're on the instances tab
    if (sidebarTab !== 'instances') {
        return null;
    }

    if (isLoading) {
        return <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-red-600">
                <p>Failed to load instances</p>
                <p className="text-xs mt-1 text-gray-400">{String(error)}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">All Instances</h2>
                <span className="text-sm text-gray-500">
                    {instances?.length || 0} instance{instances?.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {instances?.map((instance: StateInstance) => (
                    <InstanceItem
                        key={instance.state_id}
                        instance={instance as StateInstance}
                        isSelected={selectedStateId === instance.state_id}
                        onSelect={() => {
                            selectState(instance.state_id);
                            selectMachine(instance.machine_id);
                        }}
                    />
                ))}

                {(!instances || instances.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Activity size={48} className="mb-4 opacity-50" />
                        <p className="text-lg">No instances yet</p>
                        <p className="text-sm mt-2">Create a definition first, then create instances</p>
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
            className={`flex items-center gap-3 px-4 py-4 border-b border-gray-100 cursor-pointer transition-colors ${
                isSelected
                    ? 'bg-blue-50 border-l-4 border-l-blue-500'
                    : 'text-gray-700 hover:bg-gray-50 border-l-4 border-l-transparent'
            }`}
        >
            {/* Status indicator */}
            <div className={`w-2 h-2 rounded-full ${statusColors[instance.status] || 'bg-gray-400'}`} />

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-gray-400 flex-shrink-0" />
                    <div className="font-medium truncate">{instance.state_id}</div>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <span>Machine: {instance.machine_id}</span>
                    <span>•</span>
                    <span className="font-mono">{instance.current_state}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{new Date(instance.created_at).toLocaleString()}</div>
            </div>

            {/* Status */}
            <div className="text-xs px-2 py-1 rounded-full capitalize">
                <span
                    className={`${
                        instance.status === 'active'
                            ? 'text-green-600'
                            : instance.status === 'completed'
                              ? 'text-blue-600'
                              : instance.status === 'failed'
                                ? 'text-red-600'
                                : 'text-yellow-600'
                    }`}
                >
                    {instance.status}
                </span>
            </div>
        </div>
    );
}

export default AllInstancesList;
