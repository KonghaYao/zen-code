/**
 * LoginView - 密码登录页
 *
 * 流程：
 * 1. 用户输入密码
 * 2. 前端 SHA-256(password) → token
 * 3. 存入 localStorage
 * 4. 发送 POST /api/auth/verify 验证
 * 5. 成功 → 跳转主页 /
 * 6. 失败（401）→ 显示错误提示
 */

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { hashPassword, setToken, clearToken } from '../utils/auth.js';

export function LoginView() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!password) return;

        setLoading(true);
        setError(null);

        try {
            // 前端派生 token，密码不发送到服务端
            const token = await hashPassword(password);

            // 先存入 localStorage，再发请求验证
            setToken(token);

            const res = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            if (res.ok) {
                navigate('/', { replace: true });
            } else {
                // 验证失败，清除 token
                clearToken();
                setError('密码错误，请重试');
            }
        } catch {
            setError('网络错误，请检查服务是否正在运行');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-bg-primary">
            <div className="w-full max-w-sm mx-4">
                {/* Logo / 标题区域 */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                            <span className="text-2xl">🐝</span>
                        </div>
                    </div>
                    <h1 className="text-2xl font-semibold text-text-primary">Zen Swarm</h1>
                    <p className="text-sm text-text-muted mt-1">输入密码以继续</p>
                </div>

                {/* 登录表单 */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1.5">
                            密码
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="输入你的密码"
                            autoFocus
                            autoComplete="current-password"
                            className="w-full px-3 py-2.5 rounded-lg border border-border-default bg-bg-secondary text-text-primary placeholder:text-text-muted text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                        />
                    </div>

                    {/* 错误提示 */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-error-light text-error text-sm">
                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* 登录按钮 */}
                    <button
                        type="submit"
                        disabled={loading || !password}
                        className="w-full py-2.5 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                验证中...
                            </>
                        ) : (
                            '登录'
                        )}
                    </button>
                </form>

                {/* 底部提示 */}
                <p className="mt-6 text-center text-xs text-text-muted">密码在本地加密处理，不会明文传输</p>
            </div>
        </div>
    );
}
