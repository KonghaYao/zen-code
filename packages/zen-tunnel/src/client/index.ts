import { randomUUID } from 'crypto';
import { ControlClient } from './controlClient.js';
import { SshTunnel } from './sshTunnel.js';
import { printClientHeader, printClientEvent, printTunnelStatus } from './display.js';

export interface ClientOptions {
    server: string;
    user?: string;
    localPort: number;
    remotePort: number;
    controlPort: number;
    sshPort?: number;
    identityFile?: string;
}

export async function startClient(opts: ClientOptions): Promise<void> {
    const clientId = randomUUID().slice(0, 8);

    // Resolve user: explicit --user > embedded user@host > OS user
    const sshUser =
        opts.user ?? (opts.server.includes('@') ? opts.server.split('@')[0] : null) ?? process.env.USER ?? 'unknown';

    // Normalise server to plain host (strip any embedded user@)
    const host = opts.server.includes('@') ? opts.server.split('@')[1] : opts.server;
    const sshTarget = `${sshUser}@${host}`;

    printClientHeader({ ...opts, server: host, user: sshUser });

    // Step 1: Register with control server
    const controlClient = new ControlClient({
        serverHost: host,
        controlPort: opts.controlPort,
        clientId,
        remotePort: opts.remotePort,
        localPort: opts.localPort,
        sshUser,
    });

    try {
        const result = await controlClient.register();
        if (!result.ok) {
            printClientEvent(`[error] Registration failed: ${result.error}`);
            process.exit(1);
        }
        printClientEvent('[✓] Registered with control server');
    } catch (err) {
        printClientEvent(`[error] Cannot reach control server: ${(err as Error).message}`);
        process.exit(1);
    }

    // Step 2: Start SSH tunnel (stdio: inherit — SSH password prompts go straight to terminal)
    const tunnel = new SshTunnel({
        serverTarget: sshTarget,
        remotePort: opts.remotePort,
        localPort: opts.localPort,
        sshPort: opts.sshPort,
        identityFile: opts.identityFile,
    });

    tunnel.onStateChange = (s) => {
        printTunnelStatus(s.status, s.error);
    };

    tunnel.start();

    // Step 3: Start heartbeat
    controlClient.startHeartbeat((err) => {
        printClientEvent(`[heartbeat error] ${err.message}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
        controlClient.stopHeartbeat();
        tunnel.stop();
        await controlClient.unregister();
        process.stdout.write('\nDisconnected.\n');
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
