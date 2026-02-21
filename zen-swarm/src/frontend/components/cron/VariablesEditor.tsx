/**
 * VariablesEditor 组件 - 任务变量编辑器
 */

import { useState } from 'react';

interface VariablesEditorProps {
    value: Record<string, string>;
    onChange: (value: Record<string, string>) => void;
}

interface VariableEntry {
    key: string;
    value: string;
}

export function VariablesEditor(props: VariablesEditorProps) {
    const { value, onChange } = props;
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');

    const entries = Object.entries(value);

    const handleAdd = () => {
        if (!newKey.trim()) return;

        onChange({
            ...value,
            [newKey.trim()]: newValue,
        });
        setNewKey('');
        setNewValue('');
    };

    const handleRemove = (key: string) => {
        const updated = { ...value };
        delete updated[key];
        onChange(updated);
    };

    const handleUpdate = (oldKey: string, newKey: string, newValue: string) => {
        if (oldKey !== newKey) {
            // Key changed, need to remove old key
            const updated = { ...value };
            delete updated[oldKey];
            updated[newKey] = newValue;
            onChange(updated);
        } else {
            // Only value changed
            onChange({
                ...value,
                [oldKey]: newValue,
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div className="space-y-3">
            {/* 现有变量 */}
            {entries.length > 0 && (
                <div className="space-y-2">
                    {entries.map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={key}
                                onChange={(e) => handleUpdate(key, e.target.value, val)}
                                placeholder="Variable name"
                                className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-gray-400">=</span>
                            <input
                                type="text"
                                value={val}
                                onChange={(e) => handleUpdate(key, key, e.target.value)}
                                placeholder="Value"
                                className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemove(key)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* 添加新变量 */}
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="New variable name"
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-gray-400">=</span>
                <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Value"
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!newKey.trim()}
                    className={`px-3 py-1 text-sm rounded ${
                        newKey.trim()
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    Add
                </button>
            </div>

            {/* 使用提示 */}
            <p className="text-xs text-gray-400">
                Use variables in prompt with {'{{variable_name}}'} syntax, e.g., {'{{project_name}}'}
            </p>
        </div>
    );
}
