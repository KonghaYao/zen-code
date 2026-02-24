/**
 * New Machine Editor Component
 *
 * Editor for creating new state machine definitions
 */

import { useState } from 'react';
import { useSMStore, type StateMachineDefinition } from '../../../stores/smStore.js';
import { useCreateSMDefinition } from '../../../hooks/useSM.js';
import { TreeView } from './TreeView.js';
import { PropertyEditor } from './PropertyEditor.js';
import { Save, XClose, Plus, GitBranch, Settings } from '../../../components/ui/Icons.js';

const defaultDefinition: StateMachineDefinition = {
    id: '',
    name: 'New Machine',
    description: '',
    initial: 'idle',
    states: {
        idle: {
            type: 'atomic',
            on: {
                START: { target: 'running' },
            },
        },
        running: {
            type: 'atomic',
            on: {
                STOP: { target: 'idle' },
                COMPLETE: { target: 'completed' },
            },
        },
        completed: {
            type: 'final',
        },
    },
};

export function NewMachineEditor() {
    const { setIsCreating } = useSMStore();
    const [selectedNode, setSelectedNode] = useState<string | null>('root');
    const [showPropertyPanel, setShowPropertyPanel] = useState(true);
    const [localDefinition, setLocalDefinition] = useState<StateMachineDefinition>(defaultDefinition);
    const [validationError, setValidationError] = useState<string | null>(null);

    const createMutation = useCreateSMDefinition();
    const { selectMachine } = useSMStore();

    const handleFieldChange = (field: keyof StateMachineDefinition, value: string) => {
        setLocalDefinition((prev) => ({
            ...prev,
            [field]: value,
        }));
        setValidationError(null);
    };

    const validate = (): boolean => {
        if (!localDefinition.id.trim()) {
            setValidationError('Machine ID is required');
            return false;
        }
        if (!localDefinition.id.match(/^[a-zA-Z][a-zA-Z0-9_-]*$/)) {
            setValidationError(
                'Machine ID must start with a letter and contain only letters, numbers, underscores, or hyphens',
            );
            return false;
        }
        if (!localDefinition.name.trim()) {
            setValidationError('Machine name is required');
            return false;
        }
        if (!localDefinition.initial.trim()) {
            setValidationError('Initial state is required');
            return false;
        }
        if (!localDefinition.states[localDefinition.initial]) {
            setValidationError(`Initial state "${localDefinition.initial}" does not exist in states`);
            return false;
        }
        if (Object.keys(localDefinition.states).length === 0) {
            setValidationError('At least one state is required');
            return false;
        }
        return true;
    };

    const handleSave = () => {
        if (!validate()) return;

        createMutation.mutate(localDefinition, {
            onSuccess: () => {
                // Select the newly created machine and exit creating mode
                selectMachine(localDefinition.id);
                setIsCreating(false);
            },
            onError: (error) => {
                setValidationError(`Failed to create: ${String(error)}`);
            },
        });
    };

    const handleCancel = () => {
        setIsCreating(false);
    };

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <span className="text-2xl">⚙️</span>
                            Create New State Machine
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Define your state machine structure and behavior</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={createMutation.isPending}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            <Save size={16} />
                            {createMutation.isPending ? 'Creating...' : 'Create Machine'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Validation Error */}
            {validationError && (
                <div className="mx-6 mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.atan414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                        />
                    </svg>
                    {validationError}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 flex overflow-hidden p-6 pt-2">
                {/* Left Panel - Form */}
                <div className="w-96 flex flex-col gap-4 flex-shrink-0">
                    {/* Basic Info Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 bg-blue-600 rounded"></span>
                            Machine Information
                        </h3>

                        <div className="space-y-4">
                            {/* Machine ID */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Machine ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={localDefinition.id}
                                    onChange={(e) => handleFieldChange('id', e.target.value)}
                                    placeholder="my-state-machine"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                                <p className="text-xs text-gray-500">
                                    Must start with a letter, use only: letters, numbers, _, -
                                </p>
                            </div>

                            {/* Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Display Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={localDefinition.name}
                                    onChange={(e) => handleFieldChange('name', e.target.value)}
                                    placeholder="My State Machine"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {/* Initial State */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Initial State <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={localDefinition.initial}
                                    onChange={(e) => handleFieldChange('initial', e.target.value)}
                                    placeholder="idle"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Description Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 bg-purple-600 rounded"></span>
                            Description
                        </h3>
                        <textarea
                            value={localDefinition.description || ''}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
                            placeholder="Describe what this state machine does and how it works..."
                            rows={5}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* States Overview Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex-1 min-h-0">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <span className="w-1 h-4 bg-green-600 rounded"></span>
                                States Overview
                            </h3>
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                                {Object.keys(localDefinition.states).length} states
                            </span>
                        </div>
                        <div className="space-y-2 overflow-auto max-h-40">
                            {Object.keys(localDefinition.states).map((stateName) => {
                                const state = localDefinition.states[stateName];
                                return (
                                    <div
                                        key={stateName}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                                            stateName === localDefinition.initial
                                                ? 'bg-blue-50 border-blue-200'
                                                : 'bg-gray-50 border-gray-200'
                                        }`}
                                    >
                                        <div
                                            className={`flex-shrink-0 w-2 h-2 rounded-full ${
                                                state.type === 'final'
                                                    ? 'bg-red-500'
                                                    : stateName === localDefinition.initial
                                                      ? 'bg-green-500'
                                                      : 'bg-blue-500'
                                            }`}
                                        ></div>
                                        <span className="flex-1 font-mono text-sm font-medium text-gray-700">
                                            {stateName}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {stateName === localDefinition.initial && (
                                                <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                                                    initial
                                                </span>
                                            )}
                                            {state.type === 'final' && (
                                                <span className="text-[10px] font-semibold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                                    final
                                                </span>
                                            )}
                                            {state.on && (
                                                <span className="text-[10px] font-medium text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded">
                                                    {Object.keys(state.on).length} transitions
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Tree View */}
                <div className="flex-1 flex flex-col ml-6 gap-4 min-w-0">
                    {/* Tree View Card */}
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <span className="text-lg">🌳</span>
                                State Machine Tree
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
                                    title="Add State"
                                >
                                    <Plus size={16} />
                                </button>
                                <button
                                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
                                    title="Add Transition"
                                >
                                    <GitBranch size={16} />
                                </button>
                                <div className="w-px h-5 bg-gray-300"></div>
                                <button
                                    onClick={() => setShowPropertyPanel(!showPropertyPanel)}
                                    className={`p-2 rounded-lg transition-colors ${
                                        showPropertyPanel
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'hover:bg-gray-200 text-gray-600'
                                    }`}
                                    title="Toggle properties"
                                >
                                    <Settings size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 overflow-auto">
                            <TreeView
                                definition={localDefinition}
                                selectedNode={selectedNode}
                                onSelectNode={setSelectedNode}
                                isEditing={true}
                            />
                        </div>
                    </div>
                </div>

                {/* Property Panel */}
                {showPropertyPanel && selectedNode && (
                    <div className="w-80 ml-4 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
                        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <span className="text-lg">📋</span>
                                Properties
                            </h3>
                        </div>
                        <PropertyEditor definition={localDefinition} selectedNode={selectedNode} isEditing={true} />
                    </div>
                )}
            </div>
        </div>
    );
}

export default NewMachineEditor;
