/**
 * tRPC Context 定义
 */

import type { ZenCoreServices } from './bootstrap.js';

export interface ZenCoreContext extends ZenCoreServices {
    // 未来可加 userId、workspaceId 等
}

export function createContext(services: ZenCoreServices): ZenCoreContext {
    return { ...services };
}
