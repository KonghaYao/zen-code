/**
 * 前端入口文件
 */

import { createRoot } from 'react-dom/client';
import { App } from './App.js';

// 挂载应用
const root = document.getElementById('app');
if (root) {
    createRoot(root).render(<App />);
}
