/**
 * AuthGuard - 路由守卫组件
 *
 * 在渲染受保护路由之前执行三个检查：
 * 1. 服务端是否已注册（GET /api/auth/status）
 *    - 未注册 → 跳转 /register
 * 2. localStorage 是否有 token
 *    - 无 token → 跳转 /login
 * 3. token 是否有效（当 API 返回 401 时，TRPCProvider 会处理跳转）
 */

import { useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, clearToken, getAuthHeaders } from '../utils/auth.js';

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

                // 2. 检查前端是否有 token
                const token = getToken();
                if (!token) {
                    navigate('/login', { replace: true });
                    setStatus('redirect');
                    return;
                }

                // 3. 验证 token 是否有效（如密码已被重置，旧 token 需清除）
                const verifyRes = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ token }),
                });
                if (!verifyRes.ok) {
                    clearToken();
                    navigate('/login', { replace: true });
                    setStatus('redirect');
                    return;
                }

                setStatus('ok');
            } catch {
                // 网络错误时也跳转登录页
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
