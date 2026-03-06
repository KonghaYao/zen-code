/**
 * 监控面板工具函数
 */

export function formatBytes(bytes: number | null | undefined): string {
    if (bytes == null || isNaN(bytes) || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatPercent(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '0.0%';
    return `${value.toFixed(1)}%`;
}

export function formatUptime(date: Date | string): string {
    const now = new Date();
    const startTime = typeof date === 'string' ? new Date(date) : date;
    const diff = now.getTime() - startTime.getTime();
    const seconds = Math.floor(diff / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}
