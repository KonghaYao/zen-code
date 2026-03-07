/**
 * 远程仓库基类
 * 提供通用 HTTP fetch 工具，子类继承后实现具体平台逻辑
 */

export interface BaseRemoteStoreConfig {
    baseUrl: string;
    apiKey?: string;
    headers?: Record<string, string>;
    /** 请求超时（毫秒），默认 10000 */
    timeout?: number;
}

export abstract class BaseRemoteStore {
    protected readonly baseUrl: string;
    protected readonly headers: Record<string, string>;
    protected readonly timeout: number;

    constructor(config: BaseRemoteStoreConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.timeout = config.timeout ?? 10000;
        this.headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
            ...config.headers,
        };
    }

    protected async get<T>(path: string, params?: Record<string, string>): Promise<T> {
        const url = new URL(path, this.baseUrl + '/');
        if (params) {
            Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);

        try {
            const res = await fetch(url.toString(), {
                headers: this.headers,
                signal: controller.signal,
            });

            if (!res.ok) {
                throw new Error(`Remote store request failed: ${res.status} ${res.statusText} (${url})`);
            }

            return res.json() as Promise<T>;
        } finally {
            clearTimeout(timer);
        }
    }
}
