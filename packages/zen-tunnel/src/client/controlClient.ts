import type { RegisterRequest, RegisterResponse, HeartbeatResponse } from '../shared/types.js';

export interface ControlClientOptions {
    serverHost: string;
    controlPort: number;
    clientId: string;
    remotePort: number;
    localPort: number;
    sshUser: string;
}

export class ControlClient {
    private baseUrl: string;
    private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    private readonly HEARTBEAT_INTERVAL = 30_000;

    constructor(private opts: ControlClientOptions) {
        // Extract hostname only (strip ssh user@ prefix if present)
        const host = opts.serverHost.includes('@') ? opts.serverHost.split('@')[1] : opts.serverHost;
        this.baseUrl = `http://${host}:${opts.controlPort}`;
    }

    async register(): Promise<RegisterResponse> {
        const body: RegisterRequest = {
            clientId: this.opts.clientId,
            remotePort: this.opts.remotePort,
            localPort: this.opts.localPort,
            sshUser: this.opts.sshUser,
        };
        const res = await fetch(`${this.baseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return res.json() as Promise<RegisterResponse>;
    }

    async sendHeartbeat(): Promise<HeartbeatResponse> {
        const res = await fetch(`${this.baseUrl}/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: this.opts.clientId }),
        });
        return res.json() as Promise<HeartbeatResponse>;
    }

    async unregister(): Promise<void> {
        await fetch(`${this.baseUrl}/unregister`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: this.opts.clientId }),
        }).catch(() => {});
    }

    startHeartbeat(onError?: (err: Error) => void): void {
        this.heartbeatTimer = setInterval(async () => {
            try {
                await this.sendHeartbeat();
            } catch (err) {
                onError?.(err as Error);
            }
        }, this.HEARTBEAT_INTERVAL);
    }

    stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
}
