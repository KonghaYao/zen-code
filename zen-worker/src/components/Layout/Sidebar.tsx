/**
 * Sidebar 组件
 * 侧边栏导航
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

export interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navigation = [
    { name: '聊天', href: '/', icon: '💬' },
    { name: '配置', href: '/config', icon: '⚙️' },
    { name: 'Skills', href: '/skills', icon: '🎯' },
    { name: '插件', href: '/plugins', icon: '🧩' },
    { name: '历史', href: '/history', icon: '📜' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={`w-64 bg-gray-900 text-white flex flex-col ${className}`}>
      {/* Logo */}
      <div className="p-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <span>Zen Worker</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">Code Graph Web UI</p>
      </div>

      <Separator className="bg-gray-800" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive: navLinkActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  navLinkActive || isActive(item.href)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      <Separator className="bg-gray-800" />

      {/* Footer */}
      <div className="p-4">
        <div className="text-xs text-gray-400 space-y-2">
          <div className="flex items-center justify-between">
            <span>状态</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              在线
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>主题</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1 hover:text-white transition-colors"
              title={theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}
            >
              {theme === 'light' ? '☀️' : '🌙'}
              <span className="ml-1">{theme === 'light' ? '亮色' : '暗色'}</span>
            </button>
          </div>
          <Separator className="my-2 bg-gray-800" />
          <div className="text-gray-500">
            v1.0.0
          </div>
        </div>
      </div>
    </aside>
  );
};
