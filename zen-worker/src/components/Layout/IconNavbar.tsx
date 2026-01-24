/**
 * IconNavbar 组件
 * 左侧窄条图标导航栏
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  Settings,
  Target,
  Puzzle,
  History,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Separator } from '../ui/separator';

export interface IconNavbarProps {
  className?: string;
}

export const IconNavbar: React.FC<IconNavbarProps> = ({ className = '' }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navigation = [
    { name: '聊天', href: '/', icon: MessageSquare },
    { name: '配置', href: '/config', icon: Settings },
    { name: 'Skills', href: '/skills', icon: Target },
    { name: '插件', href: '/plugins', icon: Puzzle },
    { name: '历史', href: '/history', icon: History },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={`w-16 bg-gray-900 text-white flex flex-col items-center py-4 ${className}`}
      >
        {/* Logo */}
        <div className="mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
            Z
          </div>
        </div>

        <Separator className="w-10 bg-gray-800 mb-4" />

        {/* Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    className={({ isActive: navLinkActive }) =>
                      `w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                        navLinkActive || isActive(item.href)
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.name}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <Separator className="w-10 bg-gray-800 my-4" />

        {/* Theme Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
              title={theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}
            >
              {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{theme === 'light' ? '亮色模式' : '暗色模式'}</p>
          </TooltipContent>
        </Tooltip>
      </aside>
    </TooltipProvider>
  );
};
