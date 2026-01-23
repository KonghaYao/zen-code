/**
 * Layout 组件
 * 统一的页面布局
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Main } from './Main';

export interface LayoutProps {
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({ className = '' }) => {
  return (
    <div className={`flex h-screen bg-gray-50 ${className}`}>
      <Sidebar />
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
