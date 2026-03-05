/**
 * App 主组件
 *
 * 使用 react-router-dom 实现 SPA 路由系统
 * - 支持 URL 导航和浏览器前进/后退按钮
 * - 使用 HashRouter 避免服务器配置问题
 * - DockLayout 作为主要应用的共享布局
 */

import { HashRouter, Routes, Route } from 'react-router-dom';
import { DockLayout } from './layouts/DockLayout.js';
import { SetupWizard } from './views/SetupWizard/index.js';
import { Unauthorized } from './views/Unauthorized.js';

export function App() {
    return (
        <HashRouter>
            <Routes>
                {/* 新用户初始化向导路由（优先匹配） */}
                <Route path="/setup" element={<SetupWizard />} />
                {/* 401 未授权错误页 */}
                <Route path="/unauthorized" element={<Unauthorized />} />
                {/* 主要应用路由 - 使用 DockLayout 布局 */}
                <Route path="*" element={<DockLayout />} />
            </Routes>
        </HashRouter>
    );
}
