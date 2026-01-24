/**
 * Layout 组件
 * 统一的页面布局 - 支持双侧边栏
 */

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { IconNavbar } from './IconNavbar';
import { ChatSidebar } from './ChatSidebar';
import { Header } from './Header';
import { Main } from './Main';

export interface LayoutProps {
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({ className = '' }) => {
  const location = useLocation();
  const isChatPage = location.pathname === '/';

  // 从 URL 参数获取当前会话 ID
  const currentSessionId = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('session') || undefined;
  }, [location.search]);

  const handleSessionChange = (sessionId: string) => {
    // URL 已在 ChatSidebar 中更新，这里可以添加其他逻辑
    console.log('Session changed to:', sessionId);
  };

  return (
    <div className={`flex h-screen bg-gray-50 ${className}`}>
      {/* 左侧图标导航栏 */}
      <IconNavbar />

      {/* 聊天页面 - 显示 ChatSidebar */}
      {isChatPage && (
        <ChatSidebar
          currentSessionId={currentSessionId}
          onSessionChange={handleSessionChange}
        />
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <Main>
          <Outlet />
        </Main>
      </div>
    </div>
  );
};

// 导出所有组件
export { Sidebar } from './Sidebar';
export { Header } from './Header';
export { Main } from './Main';
export { IconNavbar } from './IconNavbar';
export { ChatSidebar } from './ChatSidebar';
