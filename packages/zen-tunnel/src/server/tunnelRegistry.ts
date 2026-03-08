import type { TunnelEntry, RegisterRequest, RegisterResponse } from '../shared/types.js';

const HEARTBEAT_TIMEOUT_MS = 60_000;

export type RegistryEvent = 'registered' | 'disconnected';

export class TunnelRegistry {
    private tunnels = new Map<string, TunnelEntry>();
    private cleanupTimer: ReturnType<typeof setInterval> | null = null;
    public onEvent?: (event: RegistryEvent, entry: TunnelEntry) => void;

    constructor() {
        this.cleanupTimer = setInterval(() => this.cleanup(), 15_000);
    }

    register(req: RegisterRequest): RegisterResponse {
        const existing = this.getByPort(req.remotePort);
        if (existing && existing.clientId !== req.clientId && existing.status === 'active') {
            return {
                ok: false,
                assignedPort: req.remotePort,
                error: `Port ${req.remotePort} is already in use by client ${existing.clientId}`,
            };
        }

        const entry: TunnelEntry = {
            clientId: req.clientId,
            remotePort: req.remotePort,
            localPort: req.localPort,
            sshUser: req.sshUser,
            connectedAt: new Date(),
            lastHeartbeat: new Date(),
            status: 'active',
        };
        this.tunnels.set(req.clientId, entry);
        this.onEvent?.('registered', entry);
        return { ok: true, assignedPort: req.remotePort };
    }

    heartbeat(clientId: string): boolean {
        const entry = this.tunnels.get(clientId);
        if (!entry) return false;
        entry.lastHeartbeat = new Date();
        entry.status = 'active';
        return true;
    }

    unregister(clientId: string): boolean {
        const entry = this.tunnels.get(clientId);
        if (!entry) return false;
        entry.status = 'disconnected';
        this.tunnels.delete(clientId);
        this.onEvent?.('disconnected', entry);
        return true;
    }

    list(): TunnelEntry[] {
        return Array.from(this.tunnels.values());
    }

    private getByPort(port: number): TunnelEntry | undefined {
        for (const entry of this.tunnels.values()) {
            if (entry.remotePort === port) return entry;
        }
        return undefined;
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [clientId, entry] of this.tunnels.entries()) {
            if (now - entry.lastHeartbeat.getTime() > HEARTBEAT_TIMEOUT_MS) {
                entry.status = 'disconnected';
                this.tunnels.delete(clientId);
                this.onEvent?.('disconnected', entry);
            }
        }
    }

    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
}
