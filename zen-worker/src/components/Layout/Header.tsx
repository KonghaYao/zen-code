/**
 * Header 组件
 * 页面头部
 */

import React from 'react';
import { useLocation } from 'react-router-dom';

export interface HeaderProps {
  className?: string;
  title?: string;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  className = '',
  title,
  actions,
}) => {
  const location = useLocation();

  // 默认标题根据路径生成
  const defaultTitle = React.useMemo(() => {
    const path = location.pathname;
    if (path === '/') return '聊天';
    if (path.startsWith('/config')) return '配置';
    if (path.startsWith('/skills')) return 'Skills 管理';
    if (path.startsWith('/plugins')) return '插件管理';
    if (path.startsWith('/history')) return '历史记录';
    return 'Zen Worker';
  }, [location.pathname]);

  const displayTitle = title || defaultTitle;

  return (
    <header className={`bg-white border-b border-gray-200 px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{displayTitle}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {location.pathname === '/' && '与 AI 助手对话'}
            {location.pathname.startsWith('/config') && '管理系统配置'}
            {location.pathname.startsWith('/skills') && '管理 AI Skills'}
            {location.pathname.startsWith('/plugins') && '管理插件'}
            {location.pathname.startsWith('/history') && '查看对话历史'}
          </p>
        </div>

        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};
