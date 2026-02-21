/**
 * tRPC React 客户端
 */

import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../api/index.js';

// 创建 tRPC React hook
export const trpc = createTRPCReact<AppRouter>();

// 创建 tRPC 客户端实例（供 stores 使用）
export const apiClient = createTRPCClient<AppRouter>({
    links: [
        httpBatchLink({
            url: '/api/trpc',
        }),
    ],
});

// 导出类型供使用
export type { AppRouter };
