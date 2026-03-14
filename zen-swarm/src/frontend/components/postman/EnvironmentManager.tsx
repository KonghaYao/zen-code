/**
 * EnvironmentManager — create, edit, switch environments and their variables
 */

import { useState, useCallback } from 'react';
import {
    useEnvironments,
    useCreateEnvironment,
    useUpdateEnvironment,
    useDeleteEnvironment,
    useSetActiveEnvironment,
} from '../../hooks/usePostman.js';
import { KeyValueEditor } from './KeyValueEditor.js';
import type { Environment, KeyValuePair } from '../../types/postman.js';

interface EnvironmentManagerProps {
    onClose: () => void;
}

export function EnvironmentManager({ onClose }: EnvironmentManagerProps) {
    const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
    const [editing, setEditing] = useState<{ name: string; variables: KeyValuePair[] } | null>(null);
    const [newEnvName, setNewEnvName] = useState('');

    const envsQuery = useEnvironments();
    const createMutation = useCreateEnvironment();
    const updateMutation = useUpdateEnvironment();
    const deleteMutation = useDeleteEnvironment();
    const setActiveMutation = useSetActiveEnvironment();

    const selectedEnv = (envsQuery.data as Environment[] | undefined)?.find((e) => e.id === selectedEnvId);

    const handleSelect = useCallback((env: Environment) => {
        setSelectedEnvId(env.id);
        setEditing({ name: env.name, variables: [...env.variables] });
    }, []);

    const handleSave = useCallback(() => {
        if (!selectedEnvId || !editing) return;
        updateMutation.mutate({
            id: selectedEnvId,
            name: editing.name,
            variables: editing.variables,
        });
    }, [selectedEnvId, editing, updateMutation]);

    const handleCreate = useCallback(() => {
        if (!newEnvName.trim()) return;
        createMutation.mutate(
            {
                id: crypto.randomUUID(),
                name: newEnvName.trim(),
                variables: [],
            },
            {
                onSuccess: () => setNewEnvName(''),
            },
        );
    }, [newEnvName, createMutation]);

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex h-full min-h-0 gap-4">
                {/* Left: environment list */}
                <div className="w-56 flex-shrink-0 flex flex-col border-r border-border-subtle pr-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                            Environments
                        </span>
                    </div>

                    {/* New env */}
                    <div className="flex gap-1 mb-3">
                        <input
                            type="text"
                            value={newEnvName}
                            onChange={(e) => setNewEnvName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            placeholder="New environment"
                            className="flex-1 px-2 py-1 text-xs border border-border-subtle rounded focus:outline-none focus:border-primary bg-white"
                        />
                        <button
                            onClick={handleCreate}
                            disabled={createMutation.isPending || !newEnvName.trim()}
                            className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50"
                        >
                            +
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto space-y-0.5">
                        {(envsQuery.data as Environment[] | undefined)?.map((env) => (
                            <div
                                key={env.id}
                                onClick={() => handleSelect(env)}
                                className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                                    selectedEnvId === env.id ? 'bg-primary-light' : 'hover:bg-bg-hover'
                                }`}
                            >
                                <div
                                    className={`w-2 h-2 rounded-full flex-shrink-0 ${env.is_active ? 'bg-success' : 'bg-neutral-300'}`}
                                />
                                <span className="text-xs truncate flex-1">{env.name}</span>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!env.is_active && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMutation.mutate({ id: env.id });
                                            }}
                                            title="Set as active"
                                            className="text-xs text-text-muted hover:text-success"
                                        >
                                            ✓
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteMutation.mutate({ id: env.id });
                                        }}
                                        title="Delete"
                                        className="text-xs text-text-muted hover:text-error"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                        {envsQuery.data?.length === 0 && (
                            <p className="text-xs text-text-muted italic p-1">No environments</p>
                        )}
                    </div>
                </div>

                {/* Right: variable editor */}
                <div className="flex-1 flex flex-col min-w-0">
                    {editing && selectedEnv ? (
                        <>
                            <div className="flex items-center gap-2 mb-3">
                                <input
                                    type="text"
                                    value={editing.name}
                                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                                    className="flex-1 px-2.5 py-1.5 text-sm font-medium border border-border-subtle rounded-lg focus:outline-none focus:border-primary bg-white"
                                />
                                {selectedEnv.is_active && (
                                    <span className="px-2 py-0.5 text-xs bg-success-light text-success rounded-full font-medium">
                                        Active
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto border border-border-subtle rounded-lg p-2 bg-bg-tertiary">
                                <KeyValueEditor
                                    pairs={editing.variables}
                                    onChange={(vars) => setEditing({ ...editing, variables: vars })}
                                    keyPlaceholder="Variable"
                                    valuePlaceholder="Value"
                                    showDescription
                                />
                            </div>

                            <div className="flex justify-between items-center mt-3">
                                <p className="text-xs text-text-muted">
                                    Use <code className="bg-neutral-100 px-1 rounded font-mono">{`{{VAR_NAME}}`}</code>{' '}
                                    in requests to interpolate variables.
                                </p>
                                <button
                                    onClick={handleSave}
                                    disabled={updateMutation.isPending}
                                    className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
                                >
                                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-text-muted">
                            <p className="text-sm italic">Select an environment to edit its variables</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
