/**
 * CronExpressionInput 组件 - Cron 表达式输入与解析
 */

import { useState, useMemo } from 'react';
import { validateCronExpression } from '../../../cron/validation.js';

interface CronExpressionInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
}

// 常用预设
const presets = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Hourly', value: '0 * * * *' },
    { label: 'Daily 9AM', value: '0 9 * * *' },
    { label: 'Daily midnight', value: '0 0 * * *' },
    { label: 'Weekly Monday', value: '0 9 * * 1' },
    { label: 'Monthly 1st', value: '0 9 1 * *' },
];

export function CronExpressionInput(props: CronExpressionInputProps) {
    const { value, onChange, error: externalError } = props;
    const [showPresets, setShowPresets] = useState(false);

    // 验证表达式
    const validation = useMemo(() => {
        if (!value) return { valid: true, error: undefined };
        return validateCronExpression(value);
    }, [value]);

    const error = externalError || (!validation.valid ? validation.error : undefined);

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="0 9 * * * (minute hour day month weekday)"
                    className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                        error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    } focus:outline-none focus:ring-2`}
                />
                <button
                    type="button"
                    onClick={() => setShowPresets(!showPresets)}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                >
                    Presets
                </button>
            </div>

            {/* 错误提示 */}
            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* 描述 */}
            {validation.description && !error && (
                <p className="text-sm text-green-600">Runs {validation.description}</p>
            )}

            {/* 预设列表 */}
            {showPresets && (
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                    {presets.map((preset) => (
                        <button
                            key={preset.value}
                            type="button"
                            onClick={() => {
                                onChange(preset.value);
                                setShowPresets(false);
                            }}
                            className={`px-3 py-1 text-xs rounded ${
                                value === preset.value
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                            }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            )}

            {/* 字段说明 */}
            <p className="text-xs text-gray-400">
                Format: minute (0-59) | hour (0-23) | day (1-31) | month (1-12) | weekday (0-6, 0=Sunday)
            </p>
        </div>
    );
}
