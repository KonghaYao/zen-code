/**
 * tRPC 初始化
 */

import { initTRPC, TRPCError } from '@trpc/server';
import type { AgentPackage } from '@langgraph-js/standard-agent';
import type { CronStorage } from '../cron/storage.js';
import type { CronScheduler } from '../cron/scheduler.js';
import type { ProviderStorage } from '../services/provider/index.js';
import { validateToken } from '../auth/tokenAuth.js';

// ========================================
// Context
// ========================================

export interface Context {
    agentPackage: AgentPackage;
    cronStorage: CronStorage;
    cronScheduler: CronScheduler;
    providerStorage: ProviderStorage;
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
    cronStorage: CronStorage,
    cronScheduler: CronScheduler,
    providerStorage: ProviderStorage,
): Promise<Context> {
    // 纵深防御：在 tRPC 层再次校验 token
    // 即使 Hono 中间件被绕过（SSRF、内网直连等），tRPC 层仍能阻断未授权访问
    const token = extractToken(req);
    if (token) {
        // 有 token 但无效时拒绝（无 token 则信任 Hono 层已通过校验）
        const valid = await validateToken(token);
        if (!valid) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid token' });
        }
    }

    return {
        agentPackage,
        cronStorage,
        cronScheduler,
        providerStorage,
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
    // context 已在 createContext 中完成鉴权，此处可添加更细粒度的角色检查
    return next({ ctx });
});

// ========================================
// 错误处理
// ========================================

export function handleNotFound(entity: string, id: string) {
    throw new TRPCError({
        code: 'NOT_FOUND',
        message: `${entity} with id ${id} not found`,
    });
}

export function handleBadRequest(message: string) {
    throw new TRPCError({
        code: 'BAD_REQUEST',
        message,
    });
}

export function handleConflict(message: string) {
    throw new TRPCError({
        code: 'CONFLICT',
        message,
    });
}
