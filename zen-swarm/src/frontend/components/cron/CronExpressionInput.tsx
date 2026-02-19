/**
 * CronExpressionInput 组件 - Cron 表达式输入与解析
 */

import { useState, useMemo } from 'react';

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

// 简单的 cron 表达式解析器（不依赖 cronstrue 库）
function parseCronExpression(expression: string): string | null {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
        return null;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // 构建人类可读的描述
    const descriptions: string[] = [];

    // 分钟
    if (minute === '*') {
        descriptions.push('every minute');
    } else if (minute.includes('/')) {
        const [, step] = minute.split('/');
        descriptions.push(`every ${step} minutes`);
    } else {
        descriptions.push(`at minute ${minute}`);
    }

    // 小时
    if (hour !== '*') {
        if (minute === '0') {
            descriptions.pop();
            descriptions.push(`at ${hour}:00`);
        } else {
            descriptions.push(`past hour ${hour}`);
        }
    }

    // 日期
    if (dayOfMonth !== '*') {
        descriptions.push(`on day ${dayOfMonth} of the month`);
    }

    // 月份
    if (month !== '*') {
        const monthNames = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
        ];
        const monthNum = parseInt(month);
        if (monthNum >= 1 && monthNum <= 12) {
            descriptions.push(`in ${monthNames[monthNum - 1]}`);
        }
    }

    // 星期
    if (dayOfWeek !== '*') {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayNum = parseInt(dayOfWeek);
        if (dayNum >= 0 && dayNum <= 6) {
            descriptions.push(`on ${dayNames[dayNum]}`);
        }
    }

    return descriptions.join(' ');
}

// 验证 cron 表达式格式
function validateCronExpression(expression: string): { valid: boolean; error?: string } {
    const parts = expression.trim().split(/\s+/);

    if (parts.length !== 5) {
        return { valid: false, error: 'Cron expression must have exactly 5 fields' };
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // 验证各字段范围
    const validateField = (value: string, min: number, max: number, name: string): boolean => {
        if (value === '*') return true;
        if (value.includes('/')) {
            const [base, step] = value.split('/');
            const stepNum = parseInt(step);
            if (isNaN(stepNum) || stepNum < 1) return false;
            if (base === '*') return true;
            const baseNum = parseInt(base);
            return !isNaN(baseNum) && baseNum >= min && baseNum <= max;
        }
        if (value.includes('-')) {
            const [start, end] = value.split('-');
            const startNum = parseInt(start);
            const endNum = parseInt(end);
            return !isNaN(startNum) && !isNaN(endNum) && startNum >= min && endNum <= max && startNum <= endNum;
        }
        if (value.includes(',')) {
            return value.split(',').every((v) => {
                const num = parseInt(v);
                return !isNaN(num) && num >= min && num <= max;
            });
        }
        const num = parseInt(value);
        return !isNaN(num) && num >= min && num <= max;
    };

    if (!validateField(minute, 0, 59, 'minute')) {
        return { valid: false, error: 'Invalid minute field (0-59)' };
    }
    if (!validateField(hour, 0, 23, 'hour')) {
        return { valid: false, error: 'Invalid hour field (0-23)' };
    }
    if (!validateField(dayOfMonth, 1, 31, 'day of month')) {
        return { valid: false, error: 'Invalid day of month field (1-31)' };
    }
    if (!validateField(month, 1, 12, 'month')) {
        return { valid: false, error: 'Invalid month field (1-12)' };
    }
    if (!validateField(dayOfWeek, 0, 6, 'day of week')) {
        return { valid: false, error: 'Invalid day of week field (0-6, 0=Sunday)' };
    }

    return { valid: true };
}

export function CronExpressionInput(props: CronExpressionInputProps) {
    const { value, onChange, error: externalError } = props;
    const [showPresets, setShowPresets] = useState(false);

    // 验证表达式
    const validation = useMemo(() => {
        if (!value) return { valid: true, error: undefined };
        return validateCronExpression(value);
    }, [value]);

    // 解析表达式
    const description = useMemo(() => {
        if (!value || !validation.valid) return null;
        return parseCronExpression(value);
    }, [value, validation.valid]);

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
            {description && !error && <p className="text-sm text-green-600">Runs {description}</p>}

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
