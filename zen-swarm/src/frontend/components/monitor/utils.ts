/**
 * 监控面板工具函数
 */

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatPercent(value: number): string {
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
