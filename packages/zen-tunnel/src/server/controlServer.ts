import { Hono } from 'hono';
import type { TunnelRegistry } from './tunnelRegistry.js';
import type { RegisterRequest, HeartbeatRequest, UnregisterRequest } from '../shared/types.js';

export function createControlServer(registry: TunnelRegistry): Hono {
    const app = new Hono();

    app.post('/register', async (c) => {
        const body = await c.req.json<RegisterRequest>();
        if (!body.clientId || !body.remotePort || !body.localPort) {
            return c.json({ ok: false, error: 'Missing required fields' }, 400);
        }
        const result = registry.register(body);
        return c.json(result, result.ok ? 200 : 409);
    });

    app.post('/heartbeat', async (c) => {
        const body = await c.req.json<HeartbeatRequest>();
        const ok = registry.heartbeat(body.clientId);
        return c.json({ ok });
    });

    app.delete('/unregister', async (c) => {
        const body = await c.req.json<UnregisterRequest>();
        const ok = registry.unregister(body.clientId);
        return c.json({ ok });
    });

    app.get('/status', (c) => {
        const tunnels = registry.list();
        return c.json({ tunnels });
    });

    return app;
}
