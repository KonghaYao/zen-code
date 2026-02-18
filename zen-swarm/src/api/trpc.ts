/**
 * tRPC 初始化
 */

import { initTRPC, TRPCError } from '@trpc/server';
import type { AgentPackage } from '@langgraph-js/standard-agent';

// ========================================
// Context
// ========================================

export interface Context {
    agentPackage: AgentPackage;
}

export async function createContext(agentPackage: AgentPackage): Promise<Context> {
    return {
        agentPackage,
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
    // 这里可以添加认证逻辑
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
