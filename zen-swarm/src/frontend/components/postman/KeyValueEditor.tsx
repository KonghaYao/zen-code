/**
 * KeyValueEditor — reusable table editor for headers / params / env vars
 */

import { useCallback } from 'react';
import type { KeyValuePair } from '../../types/postman.js';

interface KeyValueEditorProps {
    pairs: KeyValuePair[];
    onChange: (pairs: KeyValuePair[]) => void;
    keyPlaceholder?: string;
    valuePlaceholder?: string;
    showDescription?: boolean;
    readOnly?: boolean;
}

export function KeyValueEditor({
    pairs,
    onChange,
    keyPlaceholder = 'Key',
    valuePlaceholder = 'Value',
    showDescription = false,
    readOnly = false,
}: KeyValueEditorProps) {
    const addRow = useCallback(() => {
        onChange([...pairs, { key: '', value: '', enabled: true }]);
    }, [pairs, onChange]);

    const updateRow = useCallback(
        (index: number, field: keyof KeyValuePair, value: string | boolean) => {
            const next = pairs.map((p, i) => (i === index ? { ...p, [field]: value } : p));
            onChange(next);
        },
        [pairs, onChange],
    );

    const removeRow = useCallback(
        (index: number) => {
            onChange(pairs.filter((_, i) => i !== index));
        },
        [pairs, onChange],
    );

    return (
        <div className="flex flex-col gap-0.5">
            {/* Header row */}
            <div
                className={`grid gap-1 px-2 py-1 text-xs font-medium text-text-muted ${showDescription ? 'grid-cols-[20px_1fr_1fr_1fr_28px]' : 'grid-cols-[20px_1fr_1fr_28px]'}`}
            >
                <span />
                <span>{keyPlaceholder}</span>
                <span>{valuePlaceholder}</span>
                {showDescription && <span>Description</span>}
                <span />
            </div>

            {/* Rows */}
            {pairs.map((pair, i) => (
                <div
                    key={i}
                    className={`grid gap-1 items-center px-2 py-0.5 rounded hover:bg-bg-hover group ${showDescription ? 'grid-cols-[20px_1fr_1fr_1fr_28px]' : 'grid-cols-[20px_1fr_1fr_28px]'}`}
                >
                    {/* Checkbox */}
                    <input
                        type="checkbox"
                        checked={pair.enabled}
                        onChange={(e) => updateRow(i, 'enabled', e.target.checked)}
                        disabled={readOnly}
                        className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                    />

                    {/* Key */}
                    <input
                        type="text"
                        value={pair.key}
                        onChange={(e) => updateRow(i, 'key', e.target.value)}
                        placeholder={keyPlaceholder}
                        disabled={readOnly}
                        className="w-full px-2 py-1 text-xs border border-transparent rounded focus:outline-none focus:border-border-primary bg-transparent focus:bg-white disabled:cursor-default font-mono"
                    />

                    {/* Value */}
                    <input
                        type="text"
                        value={pair.value}
                        onChange={(e) => updateRow(i, 'value', e.target.value)}
                        placeholder={valuePlaceholder}
                        disabled={readOnly}
                        className="w-full px-2 py-1 text-xs border border-transparent rounded focus:outline-none focus:border-border-primary bg-transparent focus:bg-white disabled:cursor-default font-mono"
                    />

                    {/* Description */}
                    {showDescription && (
                        <input
                            type="text"
                            value={pair.description ?? ''}
                            onChange={(e) => updateRow(i, 'description', e.target.value)}
                            placeholder="Description"
                            disabled={readOnly}
                            className="w-full px-2 py-1 text-xs border border-transparent rounded focus:outline-none focus:border-border-primary bg-transparent focus:bg-white disabled:cursor-default text-text-muted"
                        />
                    )}

                    {/* Remove */}
                    {!readOnly && (
                        <button
                            onClick={() => removeRow(i)}
                            className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-error rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            ×
                        </button>
                    )}
                </div>
            ))}

            {/* Add row button */}
            {!readOnly && (
                <button
                    onClick={addRow}
                    className="mt-1 px-3 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-bg-hover rounded transition-colors text-left"
                >
                    + Add {keyPlaceholder}
                </button>
            )}
        </div>
    );
}
