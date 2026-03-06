/**
 * AuthGuard - 路由守卫组件
 *
 * 在渲染受保护路由之前执行两个检查：
 * 1. 服务端是否已注册（GET /api/auth/status）
 *    - 未注册 → 跳转 /register
 * 2. Cookie 是否有效（POST /api/auth/verify，credentials: include）
 *    - 无效或已过期 → 跳转 /login
 *
 * Cookie 模式：不再依赖 localStorage，HttpOnly Cookie 由服务端管理
 */

import { useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { migrateLegacyToken } from '../utils/auth.js';

type AuthStatus = 'loading' | 'ok' | 'redirect';

interface AuthGuardProps {
    children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const navigate = useNavigate();
    const [status, setStatus] = useState<AuthStatus>('loading');

    useEffect(() => {
        async function checkAuth() {
            try {
                // 1. 检查服务端注册状态
                const res = await fetch('/api/auth/status');
                const data = (await res.json()) as { registered: boolean };

                if (!data.registered) {
                    navigate('/register', { replace: true });
                    setStatus('redirect');
                    return;
                }

                // 2. 尝试迁移旧版 localStorage token（向后兼容，仅执行一次）
                await migrateLegacyToken();

                // 3. 通过 Cookie 验证身份（credentials: include 自动携带 HttpOnly Cookie）
                const verifyRes = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    // Cookie 模式下 verify 端点仅需检查 Cookie，body 中 token 留空
                    // 服务端优先读取 Cookie，body 可选
                    body: JSON.stringify({ token: '' }),
                });

                if (!verifyRes.ok) {
                    navigate('/login', { replace: true });
                    setStatus('redirect');
                    return;
                }

                setStatus('ok');
            } catch {
                navigate('/login', { replace: true });
                setStatus('redirect');
            }
        }

        checkAuth();
    }, [navigate]);

    if (status === 'loading') {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-bg-primary">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-text-muted">正在验证身份...</span>
                </div>
            </div>
        );
    }

    if (status === 'redirect') {
        return null;
    }

    return <>{children}</>;
}
