/**
 * Cron 验证工具
 * 统一的前后端验证逻辑
 */

export interface CronValidationResult {
    valid: boolean;
    error?: string;
    description?: string;
}

/**
 * 验证 Cron 表达式格式
 */
export function validateCronExpression(expression: string): CronValidationResult {
    if (!expression || !expression.trim()) {
        return { valid: false, error: 'Cron expression is required' };
    }

    const expr = expression.trim();
    const parts = expr.split(/\s+/);

    // 检查字段数量
    if (parts.length !== 5) {
        return { valid: false, error: 'Cron expression must have exactly 5 fields' };
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // 验证各字段范围
    const validateField = (
        value: string,
        min: number,
        max: number,
        name: string,
    ): { valid: boolean; error?: string } => {
        if (value === '*') return { valid: true };
        if (value.includes('/')) {
            const [base, step] = value.split('/');
            const stepNum = parseInt(step);
            if (isNaN(stepNum) || stepNum < 1) {
                return { valid: false, error: `Invalid ${name} step value` };
            }
            if (base === '*') return { valid: true };
            const baseNum = parseInt(base);
            return !isNaN(baseNum) && baseNum >= min && baseNum <= max
                ? { valid: true }
                : { valid: false, error: `Invalid ${name} base value` };
        }
        if (value.includes('-')) {
            const [start, end] = value.split('-');
            const startNum = parseInt(start);
            const endNum = parseInt(end);
            return !isNaN(startNum) && !isNaN(endNum) && startNum >= min && endNum <= max && startNum <= endNum
                ? { valid: true }
                : { valid: false, error: `Invalid ${name} range` };
        }
        if (value.includes(',')) {
            return value.split(',').every((v) => {
                const num = parseInt(v);
                return !isNaN(num) && num >= min && num <= max;
            })
                ? { valid: true }
                : { valid: false, error: `Invalid ${name} list` };
        }
        const num = parseInt(value);
        return !isNaN(num) && num >= min && num <= max
            ? { valid: true }
            : { valid: false, error: `Invalid ${name} value (range: ${min}-${max})` };
    };

    const minuteResult = validateField(minute, 0, 59, 'minute');
    if (!minuteResult.valid) {
        return { valid: false, error: minuteResult.error };
    }

    const hourResult = validateField(hour, 0, 23, 'hour');
    if (!hourResult.valid) {
        return { valid: false, error: hourResult.error };
    }

    const dayOfMonthResult = validateField(dayOfMonth, 1, 31, 'day of month');
    if (!dayOfMonthResult.valid) {
        return { valid: false, error: dayOfMonthResult.error };
    }

    const monthResult = validateField(month, 1, 12, 'month');
    if (!monthResult.valid) {
        return { valid: false, error: monthResult.error };
    }

    const dayOfWeekResult = validateField(dayOfWeek, 0, 6, 'day of week');
    if (!dayOfWeekResult.valid) {
        return { valid: false, error: dayOfWeekResult.error };
    }

    // 生成人类可读的描述
    const description = parseCronExpression(expr);

    return { valid: true, description };
}

/**
 * 解析 Cron 表达式为人类可读的描述
 */
function parseCronExpression(expression: string): string | null {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
        return null;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
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
