/**
 * tRPC 路由层兼容工具
 * 重新导出 zen-core 的 tRPC 基础工具，并提供与 zen-swarm 路由兼容的辅助函数
 */

export { router, procedure as publicProcedure } from '../trpc.js';
import { TRPCError } from '@trpc/server';

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
