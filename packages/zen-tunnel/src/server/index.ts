import { serve } from '@hono/node-server';
import { TunnelRegistry } from './tunnelRegistry.js';
import { createControlServer } from './controlServer.js';
import { printServerHeader, printTunnelEvent, printServerEvent } from './display.js';

export interface ServerOptions {
    port: number;
    user?: string;
}

export async function startServer(options: ServerOptions): Promise<void> {
    const { port, user } = options;
    const registry = new TunnelRegistry();
    const app = createControlServer(registry);

    registry.onEvent = (event, entry) => {
        printTunnelEvent(event, entry);
    };

    serve({ fetch: app.fetch, port });

    printServerHeader(port, user);
    printServerEvent(`Listening on port ${port}`);

    const shutdown = () => {
        registry.destroy();
        process.stdout.write('\nServer stopped.\n');
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
