/**
 * App 主组件
 *
 * 路由结构：
 * - /login      → 登录页（已注册，输入密码）
 * - /register   → 注册页（首次使用，设置密码）
 * - /setup      → 初始化向导（已有逻辑，保留）
 * - /unauthorized → 401 错误页（保留兼容）
 * - /*          → 主应用（AuthGuard 保护）
 *
 * AuthGuard 会在渲染主应用前检查：
 * 1. 服务端是否已注册（未注册 → /register）
 * 2. localStorage 是否有 token（无 → /login）
 */

import { HashRouter, Routes, Route } from 'react-router-dom';
import { DockLayout } from './layouts/DockLayout.js';
import { SetupWizard } from './views/SetupWizard/index.js';
import { Unauthorized } from './views/Unauthorized.js';
import { LoginView } from './views/LoginView.js';
import { RegisterView } from './views/RegisterView.js';
import { AuthGuard } from './components/AuthGuard.js';

export function App() {
    return (
        <HashRouter>
            <Routes>
                {/* 登录页 */}
                <Route path="/login" element={<LoginView />} />
                {/* 首次注册页 */}
                <Route path="/register" element={<RegisterView />} />
                {/* 新用户初始化向导路由（保留） */}
                <Route path="/setup" element={<SetupWizard />} />
                {/* 401 未授权错误页（保留兼容） */}
                <Route path="/unauthorized" element={<Unauthorized />} />
                {/* 主应用路由 - AuthGuard 保护 */}
                <Route
                    path="*"
                    element={
                        <AuthGuard>
                            <DockLayout />
                        </AuthGuard>
                    }
                />
            </Routes>
        </HashRouter>
    );
}
