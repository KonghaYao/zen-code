/**
 * 格式化工具函数
 *
 * 规则引用：js-early-exit, js-cache-property-access
 */

/**
 * 获取 JSON 内容的预览
 * 规则引用：js-early-exit (提前返回空值)
 */
export function getJsonPreview(jsonValue: string | object | null, maxLength?: number): string {
    if (!jsonValue) return 'No data';

    try {
        const parsed = typeof jsonValue === 'string' ? JSON.parse(jsonValue) : jsonValue;
        const formatted = JSON.stringify(parsed, null, 2);

        if (maxLength && formatted.length > maxLength) {
            return formatted.substring(0, maxLength) + '...';
        }

        return formatted;
    } catch {
        return typeof jsonValue === 'string' ? jsonValue : 'Invalid JSON';
    }
}

/**
 * 获取内容预览
 * 规则引用：js-early-exit
 */
export function getContentPreview(content: string, maxLength = 200): string {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
}

/**
 * 获取优先级颜色类名
 */
export function getPriorityColor(priority: number): string {
    if (priority < 10) return 'bg-green-100 text-green-700';
    if (priority < 50) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
}
