/**
 * 前端入口文件
 */

import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { TRPCProvider } from './components/TRPCProvider.js';
import { setToken, getToken } from './utils/auth.js';

// 解析 URL query 中的 token，存入 sessionStorage
// 示例 URL：http://localhost:8124/ui?token=abc123
const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get('token');
if (urlToken) {
    setToken(urlToken);
}

// 若无 token（URL 中没有 & sessionStorage 中也没有），跳转到未授权页
if (!urlToken && !getToken()) {
    window.location.hash = '/unauthorized';
}

// 挂载应用
const root = document.getElementById('app');
if (root) {
    createRoot(root).render(
        <TRPCProvider>
            <App />
        </TRPCProvider>,
    );
}
