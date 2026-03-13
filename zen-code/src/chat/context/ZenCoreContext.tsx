/**
 * ZenCore Context
 * 提供 zen-core 连接（tRPC client + apiUrl）给子组件
 */

import { createContext, useContext } from 'react';
import type { ZenCoreConnection } from '@codegraph/union-client';

const ZenCoreContext = createContext<ZenCoreConnection | null>(null);

export const ZenCoreProvider = ZenCoreContext.Provider;

export function useTrpc() {
    const ctx = useContext(ZenCoreContext);
    if (!ctx) throw new Error('useTrpc must be used within ZenCoreProvider');
    return ctx.trpc;
}

export function useZenCore() {
    const ctx = useContext(ZenCoreContext);
    if (!ctx) throw new Error('useZenCore must be used within ZenCoreProvider');
    return ctx;
}
