/**
 * tRPC Provider 组件
 *
 * 负责：
 * 1. 为所有 tRPC 请求注入 Authorization header
 * 2. 全局监听 401 响应，自动跳转到 /unauthorized 页面
 */

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { TRPCClientError, httpBatchLink } from '@trpc/client';
import { useState, ReactNode } from 'react';
import { trpc } from '../api.js';
import { getAuthHeaders, clearToken } from '../utils/auth.js';
import type { FullAppRouter } from '../../api/index.js';

interface TRPCProviderProps {
    children: ReactNode;
}

/**
 * 判断是否为 401 未授权错误
 */
function isUnauthorizedError(error: unknown): boolean {
    if (error instanceof TRPCClientError<FullAppRouter>) {
        return error.data?.httpStatus === 401;
    }
    return false;
}

/**
 * 跳转到登录页（清除无效 token）
 */
function redirectToLogin(): void {
    clearToken();
    window.location.hash = '/login';
}

export function TRPCProvider(props: TRPCProviderProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                    },
                },
                queryCache: new QueryCache({
                    onError(error) {
                        if (isUnauthorizedError(error)) {
                            redirectToLogin();
                        }
                    },
                }),
                mutationCache: new MutationCache({
                    onError(error) {
                        if (isUnauthorizedError(error)) {
                            redirectToLogin();
                        }
                    },
                }),
            }),
    );

    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: '/api/trpc',
                    headers() {
                        return getAuthHeaders();
                    },
                }),
            ],
        }),
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
        </trpc.Provider>
    );
}
