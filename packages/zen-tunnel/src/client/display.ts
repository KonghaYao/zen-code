import type { TunnelStatus } from './sshTunnel.js';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';
const BOLD = '\x1b[1m';

const STATUS_LABELS: Record<TunnelStatus, string> = {
    connecting: `${YELLOW}connecting${RESET}`,
    connected: `${GREEN}connected${RESET}`,
    disconnected: `${GRAY}disconnected${RESET}`,
    error: `${RED}error${RESET}`,
};

export function printClientHeader(opts: {
    server: string;
    user: string;
    localPort: number;
    remotePort: number;
    controlPort: number;
}): void {
    process.stdout.write(`${BOLD}${CYAN}zen-tunnel client${RESET}\n`);
    process.stdout.write(`  server:       ${opts.server}\n`);
    process.stdout.write(`  user:         ${BOLD}${opts.user}${RESET}\n`);
    process.stdout.write(`  local:        localhost:${opts.localPort}\n`);
    process.stdout.write(`  remote:       ${opts.server}:${opts.remotePort}\n`);
    process.stdout.write(`  control:      :${opts.controlPort}\n`);
    process.stdout.write(`${GRAY}Press Ctrl+C to disconnect${RESET}\n\n`);
}

export function printClientEvent(msg: string): void {
    process.stdout.write(`  ${msg}\n`);
}

export function printTunnelStatus(status: TunnelStatus, error?: string): void {
    const label = STATUS_LABELS[status];
    process.stdout.write(`  [tunnel] ${label}${error ? ` — ${RED}${error}${RESET}` : ''}\n`);
}
