/**
 * Property Editor Component
 *
 * Edit properties of selected node
 */

import { useState, useEffect } from 'react';
import { Save, RotateCcw } from '../../../components/ui/Icons.js';

interface PropertyEditorProps {
    definition: any;
    selectedNode: string | null;
    isEditing: boolean;
}

export function PropertyEditor({ definition, selectedNode, isEditing }: PropertyEditorProps) {
    if (!selectedNode) {
        return (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 p-4 text-center">
                <p>Select a node to view properties</p>
            </div>
        );
    }

    // Parse node type and name
    const [nodeType, ...parts] = selectedNode.split('-');
    const nodeName = parts.join('-');

    // Render based on node type
    if (nodeType === 'root') {
        return <MachinePropertyEditor definition={definition} isEditing={isEditing} />;
    }

    if (nodeType === 'state') {
        const stateDef = definition?.states?.[nodeName];
        return (
            <StatePropertyEditor
                stateName={nodeName}
                stateDef={stateDef}
                isInitial={definition?.initial === nodeName}
                isEditing={isEditing}
            />
        );
    }

    if (nodeType === 'transition') {
        const [stateName, eventName] = parts;
        const transition = definition?.states?.[stateName]?.on?.[eventName];
        return (
            <TransitionPropertyEditor
                stateName={stateName}
                eventName={eventName}
                transition={transition}
                isEditing={isEditing}
            />
        );
    }

    return null;
}

interface MachinePropertyEditorProps {
    definition: any;
    isEditing: boolean;
}

function MachinePropertyEditor({ definition, isEditing }: MachinePropertyEditorProps) {
    return (
        <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-purple-600">◆</span>
                Machine Properties
            </h3>

            <div className="space-y-3">
                <PropertyField label="ID" value={definition?.id} editable={false} />
                <PropertyField label="Name" value={definition?.name} editable={isEditing} />
                <PropertyField label="Description" value={definition?.description} editable={isEditing} multiline />
                <PropertyField label="Initial State" value={definition?.initial} editable={isEditing} />
            </div>

            {/* Context */}
            <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Context Schema</h4>
                <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-700 overflow-auto max-h-48">
                    <pre>{JSON.stringify(definition?.context || {}, null, 2)}</pre>
                </div>
            </div>
        </div>
    );
}

interface StatePropertyEditorProps {
    stateName: string;
    stateDef: any;
    isInitial: boolean;
    isEditing: boolean;
}

function StatePropertyEditor({ stateName, stateDef, isInitial, isEditing }: StatePropertyEditorProps) {
    return (
        <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-blue-600">●</span>
                State Properties
            </h3>

            <div className="space-y-3">
                <PropertyField label="Name" value={stateName} editable={isEditing} />
                <PropertyField
                    label="Type"
                    value={stateDef?.type || 'atomic'}
                    editable={isEditing}
                    options={['atomic', 'compound', 'parallel', 'final', 'history']}
                />
                {isInitial && (
                    <div className="text-xs text-green-600 flex items-center gap-1">
                        <span>▶</span> Initial State
                    </div>
                )}
            </div>

            {/* Transitions */}
            {stateDef?.on && Object.keys(stateDef.on).length > 0 && (
                <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                        Transitions ({Object.keys(stateDef.on).length})
                    </h4>
                    <div className="space-y-1">
                        {Object.entries(stateDef.on).map(([event, trans]) => (
                            <div key={event} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1.5">
                                <span className="text-yellow-600">{event}</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-blue-600">{(trans as any)?.target}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

interface TransitionPropertyEditorProps {
    stateName: string;
    eventName: string;
    transition: any;
    isEditing: boolean;
}

function TransitionPropertyEditor({ stateName, eventName, transition, isEditing }: TransitionPropertyEditorProps) {
    return (
        <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-yellow-600">⎇</span>
                Transition Properties
            </h3>

            <div className="space-y-3">
                <PropertyField label="Event" value={eventName} editable={isEditing} />
                <PropertyField label="From State" value={stateName} editable={false} />
                <PropertyField label="Target" value={transition?.target} editable={isEditing} />
            </div>

            {/* Actions */}
            <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Actions</h4>
                <div className="text-xs text-gray-400">
                    {transition?.actions ? (
                        <pre>{JSON.stringify(transition.actions, null, 2)}</pre>
                    ) : (
                        'No actions defined'
                    )}
                </div>
            </div>
        </div>
    );
}

interface PropertyFieldProps {
    label: string;
    value: string | undefined;
    editable: boolean;
    multiline?: boolean;
    options?: string[];
    onChange?: (value: string) => void;
}

function PropertyField({ label, value, editable, multiline, options, onChange }: PropertyFieldProps) {
    const [localValue, setLocalValue] = useState(value || '');

    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    const handleChange = (newValue: string) => {
        setLocalValue(newValue);
        onChange?.(newValue);
    };

    return (
        <div className="space-y-1">
            <label className="text-xs text-gray-500 uppercase">{label}</label>

            {options && editable ? (
                <select
                    value={localValue}
                    onChange={(e) => handleChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                >
                    {options.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
            ) : multiline ? (
                editable ? (
                    <textarea
                        value={localValue}
                        onChange={(e) => handleChange(e.target.value)}
                        rows={3}
                        className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 resize-none focus:outline-none focus:border-blue-500"
                    />
                ) : (
                    <div className="bg-gray-50 rounded px-2 py-1.5 text-sm text-gray-700 min-h-[3rem]">
                        {localValue || <span className="text-gray-400">—</span>}
                    </div>
                )
            ) : editable ? (
                <input
                    type="text"
                    value={localValue}
                    onChange={(e) => handleChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                />
            ) : (
                <div className="bg-gray-50 rounded px-2 py-1.5 text-sm text-gray-700">
                    {localValue || <span className="text-gray-400">—</span>}
                </div>
            )}
        </div>
    );
}

export default PropertyEditor;
