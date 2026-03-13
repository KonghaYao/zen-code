/**
 * /health 端点处理
 */

import type { Context } from 'hono';
import type { ZenCoreServices } from './bootstrap.js';

const VERSION = '1.0.0';

export function healthHandler(services: ZenCoreServices) {
    return (c: Context) =>
        c.json({
            status: 'ok',
            version: VERSION,
            service: 'zen-core',
            port: Number(process.env.ZEN_CORE_PORT || 8125),
            graphs: ['code'],
            timestamp: Date.now(),
        });
}
