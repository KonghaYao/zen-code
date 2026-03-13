/**
 * useZenCoreStatus
 * 轮询 zen-core /health 端点，返回服务状态
 */

import { useState, useEffect } from 'react';

export interface ZenCoreStatus {
    online: boolean;
    version: string | null;
    port: number;
}

const POLL_INTERVAL = 10_000; // 10 秒轮询一次
const PORT = Number(process.env.ZEN_CORE_PORT || 8125);

export function useZenCoreStatus(): ZenCoreStatus {
    const [status, setStatus] = useState<ZenCoreStatus>({
        // 如果已经有 connection（cli.ts 连接成功），初始就认为 online
        online: !!(globalThis as any).__zenCoreConnection,
        version: null,
        port: PORT,
    });

    useEffect(() => {
        let cancelled = false;

        const check = async () => {
            try {
                const res = await fetch(`http://127.0.0.1:${PORT}/health`, {
                    signal: AbortSignal.timeout(2000),
                });
                if (!cancelled && res.ok) {
                    const data = (await res.json()) as any;
                    setStatus({ online: true, version: data.version ?? null, port: data.port ?? PORT });
                }
            } catch {
                if (!cancelled) {
                    setStatus((prev) => ({ ...prev, online: false }));
                }
            }
        };

        check();
        const timer = setInterval(check, POLL_INTERVAL);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    return status;
}
