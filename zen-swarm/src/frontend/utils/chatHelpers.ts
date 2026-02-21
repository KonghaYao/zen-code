/**
 * Chat 相关工具函数
 *
 * 规则引用：js-hoist-regexp, js-early-exit
 */

// 提取到组件外部，避免重复创建（规则：rendering-hoist-jsx）
const STATUS_EMOJI_MAP: Record<string, string> = {
    idle: '🟢',
    busy: '🟡',
    interrupted: '🟠',
    error: '🔴',
};

/**
 * 获取状态对应的 emoji
 * 规则引用：js-index-maps (使用对象字面量，类似 Map)
 */
export function getStatusEmoji(status?: string): string {
    return STATUS_EMOJI_MAP[status || ''] || '⚪';
}

/**
 * 格式化日期为相对时间
 * 规则引用：js-early-exit (提前返回)
 */
export function formatDate(dateString?: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return '刚刚';
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffHours < 24 * 7) return `${Math.floor(diffHours / 24)}天前`;
    return date.toLocaleDateString('zh-CN');
}
