/**
 * App 主组件
 *
 * 使用 react-router-dom 实现 SPA 路由系统
 * - 支持 URL 导航和浏览器前进/后退按钮
 * - 使用 HashRouter 避免服务器配置问题
 * - DockLayout 作为主要应用的共享布局
 * - Chat 作为独立路由，全屏显示
 */

import { HashRouter, Routes, Route } from 'react-router-dom';
import { DockLayout } from './layouts/DockLayout.js';
import { ChatRoute } from './routes/ChatRoute.js';
import { NotFound } from './routes/NotFound.js';

export function App() {
    return (
        <HashRouter>
            <Routes>
                {/* Chat 独立路由 - 全屏模式 */}
                <Route path="/chat" element={<ChatRoute />} />

                {/* 主要应用路由 - 使用 DockLayout 布局 */}
                <Route path="*" element={<DockLayout />} />
            </Routes>
        </HashRouter>
    );
}
