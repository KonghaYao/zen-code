/**
 * Definition List Component
 *
 * Displays list of state machine definitions
 */

import { useState } from 'react';
import { Plus, MoreVertical, Trash2, Edit2, Copy } from '../../../components/ui/Icons.js';
import { useSMStore, type StateMachineDefinition } from '../../../stores/smStore.js';
import { useSMDefinitions, useDeleteSMDefinition } from '../../../hooks/useSM.js';

interface DefinitionListProps {}

export function DefinitionList({}: DefinitionListProps) {
    const { selectedMachineId, selectMachine, setIsCreating, isCreating } = useSMStore();

    const { data: definitions, isLoading, error } = useSMDefinitions();
    const deleteMutation = useDeleteSMDefinition();

    const handleCreate = () => {
        selectMachine(null); // Clear selection first
        setIsCreating(true);
    };

    const handleSelect = (machineId: string) => {
        selectMachine(machineId);
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-32 text-red-600">
                <p>Failed to load definitions</p>
                <p className="text-xs mt-1 text-gray-400">{String(error)}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">{definitions?.length || 0} definitions</span>
                <button
                    onClick={handleCreate}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                    title="Create new definition"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {definitions?.map((def: StateMachineDefinition) => (
                    <DefinitionItem
                        key={def.id}
                        definition={def as StateMachineDefinition}
                        isSelected={selectedMachineId === def.id}
                        onSelect={() => handleSelect(def.id)}
                        onDelete={() => deleteMutation.mutate(def.id)}
                    />
                ))}

                {(!definitions || definitions.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                        <p>No definitions yet</p>
                        <button onClick={handleCreate} className="mt-2 text-sm text-blue-600 hover:text-blue-700">
                            Create your first state machine
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

interface DefinitionItemProps {
    definition: StateMachineDefinition;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
}

function DefinitionItem({ definition, isSelected, onSelect, onDelete }: DefinitionItemProps) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div
            onClick={onSelect}
            className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-50 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
            }`}
        >
            {/* Icon */}
            <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-blue-100' : 'bg-gray-100'
                }`}
            >
                <span className="text-sm">🔄</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{definition.name}</div>
                <div className="text-xs text-gray-500 truncate">{definition.description || definition.id}</div>
            </div>

            {/* State count */}
            <div className="text-xs text-gray-500">{Object.keys(definition.states || {}).length} states</div>

            {/* Menu */}
            <div className="relative">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all"
                >
                    <MoreVertical size={14} />
                </button>

                {showMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(false);
                                    // TODO: Edit
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <Edit2 size={14} />
                                Edit
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(false);
                                    // TODO: Duplicate
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <Copy size={14} />
                                Duplicate
                            </button>
                            <div className="border-t border-gray-200 my-1" />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(false);
                                    onDelete();
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                                <Trash2 size={14} />
                                Delete
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default DefinitionList;
