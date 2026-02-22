/**
 * App 主组件
 *
 * 使用 macOS 风格的 Dock 导航系统
 * - 底部 Dock 提供清晰的应用切换
 * - 单应用模式，同一时间只打开一个应用
 */

import { DockLayout } from './layouts/DockLayout.js';

export function App() {
    return <DockLayout />;
}
