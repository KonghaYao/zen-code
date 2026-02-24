/**
 * State Machine Editor Component
 *
 * Tree-based editor for state machine definitions
 */

import { useState } from 'react';
import { useSMStore, type StateMachineDefinition } from '../../../stores/smStore.js';
import { useSMDefinition, useUpdateSMDefinition, useCreateSMDefinition } from '../../../hooks/useSM.js';
import { TreeView } from './TreeView.js';
import { PropertyEditor } from './PropertyEditor.js';
import { Play, Save, Plus, GitBranch, Settings } from '../../../components/ui/Icons.js';

interface StateMachineEditorProps {
    machineId: string;
}

export function StateMachineEditor({ machineId }: StateMachineEditorProps) {
    const { isEditing, isCreating, setIsEditing } = useSMStore();

    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [showPropertyPanel, setShowPropertyPanel] = useState(true);
    const [localDefinition, setLocalDefinition] = useState<StateMachineDefinition | null>(null);

    const { data: definition, isLoading, error } = useSMDefinition(machineId);
    const updateMutation = useUpdateSMDefinition();
    const createMutation = useCreateSMDefinition();

    // Use local definition when editing, server definition otherwise
    const currentDefinition = isEditing && localDefinition ? localDefinition : definition;

    const handleSave = () => {
        if (!localDefinition) return;

        if (isCreating) {
            createMutation.mutate(localDefinition, {
                onSuccess: () => {
                    setIsEditing(false);
                    setLocalDefinition(null);
                },
            });
        } else {
            updateMutation.mutate(
                { machineId, definition: localDefinition },
                {
                    onSuccess: () => {
                        setIsEditing(false);
                        setLocalDefinition(null);
                    },
                },
            );
        }
    };

    const handleStartEdit = () => {
        if (definition) {
            setLocalDefinition(JSON.parse(JSON.stringify(definition)) as StateMachineDefinition);
        }
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setLocalDefinition(null);
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-red-600">
                <p>Failed to load definition</p>
                <p className="text-xs mt-1 text-gray-400">{String(error)}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{currentDefinition?.name || 'New Machine'}</h2>
                    <span className="text-xs text-gray-500 px-2 py-0.5 rounded bg-gray-100">
                        {currentDefinition?.id}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Edit mode toggle */}
                    {!isEditing ? (
                        <button
                            onClick={handleStartEdit}
                            className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                            Edit
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                title="Add State"
                            >
                                <Plus size={14} />
                                Add State
                            </button>
                            <button
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                title="Add Transition"
                            >
                                <GitBranch size={14} />
                                Add Transition
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={updateMutation.isPending || createMutation.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                                <Save size={14} />
                                {updateMutation.isPending || createMutation.isPending ? 'Saving...' : 'Save'}
                            </button>
                        </>
                    )}

                    {/* Property panel toggle */}
                    <button
                        onClick={() => setShowPropertyPanel(!showPropertyPanel)}
                        className={`p-1.5 rounded-md transition-colors ${
                            showPropertyPanel ? 'bg-blue-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title="Toggle property panel"
                    >
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Tree View */}
                <div className="flex-1 overflow-auto p-4">
                    {currentDefinition && (
                        <TreeView
                            definition={currentDefinition}
                            selectedNode={selectedNode}
                            onSelectNode={setSelectedNode}
                            isEditing={isEditing}
                        />
                    )}
                </div>

                {/* Property Panel */}
                {showPropertyPanel && selectedNode && (
                    <div className="w-72 border-l border-gray-200 bg-white overflow-auto">
                        <PropertyEditor
                            definition={currentDefinition}
                            selectedNode={selectedNode}
                            isEditing={isEditing}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default StateMachineEditor;
