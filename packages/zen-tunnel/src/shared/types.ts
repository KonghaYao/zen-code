export interface TunnelEntry {
    clientId: string;
    remotePort: number;
    localPort: number;
    sshUser: string;
    connectedAt: Date;
    lastHeartbeat: Date;
    status: 'active' | 'disconnected';
}

export interface RegisterRequest {
    clientId: string;
    remotePort: number;
    localPort: number;
    sshUser: string;
}

export interface RegisterResponse {
    ok: boolean;
    assignedPort: number;
    error?: string;
}

export interface HeartbeatRequest {
    clientId: string;
}

export interface HeartbeatResponse {
    ok: boolean;
}

export interface UnregisterRequest {
    clientId: string;
}

export interface StatusResponse {
    tunnels: TunnelEntry[];
}
