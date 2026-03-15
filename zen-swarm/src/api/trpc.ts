/**
 * tRPC 初始化
 */

import { initTRPC, TRPCError } from '@trpc/server';
import type { AgentPackage } from '@langgraph-js/standard-agent';
import type { MergedStorage } from '@langgraph-js/standard-agent/storage/merged';
import type { CronStorage } from '../cron/storage.js';
import type { CronScheduler } from '../cron/scheduler.js';
import type { ProviderStorage } from '../services/provider/index.js';
import type { RemoteStoreStorage } from '../services/remote-store/index.js';
import type { PostmanStorage } from '../postman/storage.js';
import type { ZenSwarmMcpStorage } from '../config/storage.js';
import type { WorkspaceStorage } from '../config/workspace-storage.js';
import { validateToken } from '../auth/tokenAuth.js';

// ========================================
// Context
// ========================================

export interface Context {
    agentPackage: AgentPackage;
    mergedStorage: MergedStorage;
    mcpStorage: ZenSwarmMcpStorage;
    workspaceStorage: WorkspaceStorage;
    cronStorage: CronStorage;
    cronScheduler: CronScheduler;
    providerStorage: ProviderStorage;
    remoteStoreStorage: RemoteStoreStorage;
    postmanStorage: PostmanStorage;
}

/**
 * 从请求中提取 token（支持 Authorization header 和 Cookie 两种方式）
 */
function extractToken(req: Request): string | null {
    // 优先从 Authorization: Bearer <token> header 提取
    const authorization = req.headers.get('Authorization');
    if (authorization?.startsWith('Bearer ')) {
        return authorization.slice(7);
    }

    // 其次从 Cookie 提取（HttpOnly cookie 模式）
    const cookie = req.headers.get('Cookie');
    if (cookie) {
        const match = cookie.match(/(?:^|;\s*)zen_token=([^;]+)/);
        if (match) return decodeURIComponent(match[1]);
    }

    return null;
}

export async function createContext(
    req: Request,
    agentPackage: AgentPackage,
    mergedStorage: MergedStorage,
    mcpStorage: ZenSwarmMcpStorage,
    workspaceStorage: WorkspaceStorage,
    cronStorage: CronStorage,
    cronScheduler: CronScheduler,
    providerStorage: ProviderStorage,
    remoteStoreStorage: RemoteStoreStorage,
    postmanStorage: PostmanStorage,
): Promise<Context> {
    // 纵深防御：在 tRPC 层再次校验 token
    const token = extractToken(req);
    if (token) {
        const valid = await validateToken(token);
        if (!valid) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid token' });
        }
    }

    return {
        agentPackage,
        mergedStorage,
        mcpStorage,
        workspaceStorage,
        cronStorage,
        cronScheduler,
        providerStorage,
        remoteStoreStorage,
        postmanStorage,
    };
}

type ContextType = Awaited<ReturnType<typeof createContext>>;

// ========================================
// tRPC 初始化
// ========================================

const t = initTRPC.context<ContextType>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ next, ctx }) => {
    return next({ ctx });
});

// ========================================
// 错误处理
// ========================================

export function handleNotFound(entity: string, id: string): never {
    throw new TRPCError({
        code: 'NOT_FOUND',
        message: `${entity} with id ${id} not found`,
    });
}

export function handleBadRequest(message: string): never {
    throw new TRPCError({
        code: 'BAD_REQUEST',
        message,
    });
}

export function handleConflict(message: string): never {
    throw new TRPCError({
        code: 'CONFLICT',
        message,
    });
}
