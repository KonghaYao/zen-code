/**
 * RegisterView - 首次注册页（设置密码）
 *
 * 只在服务端没有 token 文件时显示（未注册状态）。
 *
 * 流程：
 * 1. 用户输入密码和确认密码
 * 2. 前端 SHA-256(password) → token
 * 3. POST /api/auth/register { token }
 * 4. 服务端保存 token 到 ~/.zen-swarm/token
 * 5. 前端存入 localStorage → 跳转主页 /
 */

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { hashPassword, setToken } from '../utils/auth.js';

export function RegisterView() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    function validate(): string | null {
        if (password.length < 8) {
            return '密码至少需要 8 个字符';
        }
        if (password !== confirmPassword) {
            return '两次输入的密码不一致';
        }
        return null;
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 前端派生 token
            const token = await hashPassword(password);

            // 注册：发送 token hash 到服务端保存
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            if (res.ok) {
                // 注册成功，存入 localStorage 并跳转
                setToken(token);
                navigate('/', { replace: true });
            } else {
                const data = (await res.json()) as { error?: string };
                setError(data.error ?? '注册失败，请重试');
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
                    <h1 className="text-2xl font-semibold text-text-primary">欢迎使用 Zen Swarm</h1>
                    <p className="text-sm text-text-muted mt-1">设置密码以保护你的服务</p>
                </div>

                {/* 注册表单 */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1.5">
                            设置密码
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="至少 8 个字符"
                            autoFocus
                            autoComplete="new-password"
                            className="w-full px-3 py-2.5 rounded-lg border border-border-default bg-bg-secondary text-text-primary placeholder:text-text-muted text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="confirmPassword"
                            className="block text-sm font-medium text-text-secondary mb-1.5"
                        >
                            确认密码
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="再次输入密码"
                            autoComplete="new-password"
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

                    {/* 注册按钮 */}
                    <button
                        type="submit"
                        disabled={loading || !password || !confirmPassword}
                        className="w-full py-2.5 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                注册中...
                            </>
                        ) : (
                            '设置密码并开始使用'
                        )}
                    </button>
                </form>

                {/* 安全说明 */}
                <div className="mt-6 p-3 rounded-lg bg-bg-tertiary border border-border-subtle">
                    <p className="text-xs text-text-muted leading-relaxed">
                        <span className="font-medium text-text-secondary">🔒 安全说明</span>
                        <br />
                        密码在浏览器本地加密后存储，不会明文发送到服务器。若忘记密码，需删除{' '}
                        <code className="font-mono bg-bg-hover px-1 rounded">~/.zen-swarm/token</code> 文件后重新设置。
                    </p>
                </div>
            </div>
        </div>
    );
}
