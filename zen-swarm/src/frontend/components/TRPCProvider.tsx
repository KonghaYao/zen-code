/**
 * tRPC Provider 组件
 *
 * 负责：
 * 1. 为所有 tRPC 请求添加 credentials: 'include'（携带 HttpOnly Cookie）
 * 2. 全局监听 401 响应，自动跳转到登录页
 */

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { TRPCClientError, httpBatchLink } from '@trpc/client';
import { useState, ReactNode } from 'react';
import { trpc } from '../api.js';
import { logout } from '../utils/auth.js';
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
 * 登出并跳转到登录页
 */
async function redirectToLogin(): Promise<void> {
    await logout(); // 清除服务端 Cookie
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
                    // Cookie 模式：使用 credentials: include，浏览器自动携带 HttpOnly Cookie
                    fetch(url, options) {
                        return fetch(url, {
                            ...options,
                            credentials: 'include',
                        });
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
