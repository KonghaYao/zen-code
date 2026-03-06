/**
 * 前端入口文件
 */

import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { TRPCProvider } from './components/TRPCProvider.js';

// 挂载应用（认证检查由 AuthGuard 组件负责）
const root = document.getElementById('app');
if (root) {
    createRoot(root).render(
        <TRPCProvider>
            <App />
        </TRPCProvider>,
    );
}
