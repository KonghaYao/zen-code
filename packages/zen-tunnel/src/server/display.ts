import { networkInterfaces } from 'os';
import type { TunnelEntry } from '../shared/types.js';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const GRAY = '\x1b[90m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';

function getLocalIP(): string {
    for (const ifaces of Object.values(networkInterfaces())) {
        for (const iface of ifaces ?? []) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return '<server-ip>';
}

function formatAge(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
}

function padEnd(str: string, len: number): string {
    return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

export function printServerHeader(controlPort: number, user?: string): void {
    process.stdout.write(`${BOLD}${CYAN}zen-tunnel server${RESET}  ${GRAY}(control port: ${controlPort})${RESET}\n`);
    if (user) {
        const ip = getLocalIP();
        process.stdout.write(`  SSH login:    ${BOLD}${user}@${ip}${RESET}\n`);
        process.stdout.write(
            `  Client cmd:   ${GRAY}zen-tunnel client -s ${user}@${ip} -l <local-port> -r <remote-port>${RESET}\n`,
        );
    }
    process.stdout.write(
        `${BOLD}${padEnd('CLIENT ID', 14)}${padEnd('REMOTE PORT', 13)}${padEnd('LOCAL PORT', 12)}${padEnd('CONNECTED', 13)}STATUS${RESET}\n`,
    );
}

export function printTunnelEvent(event: 'registered' | 'disconnected', entry: TunnelEntry): void {
    const divider = '─'.repeat(64);
    const status = event === 'registered' ? `${GREEN}● active${RESET}` : `${YELLOW}○ disconnected${RESET}`;
    process.stdout.write(divider + '\n');
    process.stdout.write(
        `${padEnd(entry.clientId.slice(0, 12), 14)}${padEnd(String(entry.remotePort), 13)}${padEnd(String(entry.localPort), 12)}${padEnd(formatAge(entry.connectedAt), 13)}${status}\n`,
    );
}

export function printServerEvent(msg: string): void {
    process.stdout.write(`  ${GRAY}${msg}${RESET}\n`);
}
