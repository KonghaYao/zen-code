/**
 * tRPC React 客户端
 */

import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { FullAppRouter } from '../api/index.js';

// 创建 tRPC React hook
export const trpc = createTRPCReact<FullAppRouter>();

// 创建 tRPC 客户端实例（供 stores 使用）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiClient = createTRPCClient<FullAppRouter>({
    links: [
        httpBatchLink({
            url: '/api/trpc',
        }),
    ],
});

// 导出类型供使用
export type { FullAppRouter };
