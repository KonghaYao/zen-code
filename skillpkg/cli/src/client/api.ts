import { readConfig, type CliConfig } from '../config.js';

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const config = await readConfig();
    const base = config.registry ?? 'https://registry.skillpkg.dev';
    const url = `${base}${path}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CLI-Version': '1.0.0',
        ...(options.headers as Record<string, string>),
    };

    if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
    }

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            message = (body as { error?: string }).error ?? message;
        } catch {}
        throw new Error(message);
    }

    return res.json();
}

export async function downloadFile(url: string): Promise<ArrayBuffer> {
    const res = await fetch(url, {
        headers: { 'X-CLI-Version': '1.0.0' },
        redirect: 'follow',
    });
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
    return res.arrayBuffer();
}
