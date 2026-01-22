/**
 * notify 工具函数
 * 跨平台桌面通知
 */

import notifier from 'node-notifier';

export interface NotifyOptions {
    title?: string;
    message: string;
    icon?: string;
    sound?: boolean;
}

/**
 * 发送桌面通知
 */
export function notify(options: NotifyOptions | string): void {
    if (typeof options === 'string') {
        notifier.notify({
            title: options
        });

    } else {

        notifier.notify({
            title: options.title || 'Notification',
            message: options.message,
            icon: options.icon,
            sound: options.sound ?? true,
        });
    }
}

/**
 * 快捷通知函数（默认标题）
 */
export function notifyWithDefaultTitle(message: string, title?: string): void {
    notify({ title, message });
}
