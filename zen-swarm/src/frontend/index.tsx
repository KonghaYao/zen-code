/**
 * 前端入口文件
 */

import './global.css';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { TRPCProvider } from './components/TRPCProvider.js';

// 挂载应用
const root = document.getElementById('app');
if (root) {
    createRoot(root).render(
        <TRPCProvider>
            <App />
        </TRPCProvider>,
    );
}
