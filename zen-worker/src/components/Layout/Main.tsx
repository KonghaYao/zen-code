/**
 * Main 组件
 * 主内容区域
 */

import React from 'react';

export interface MainProps {
  className?: string;
  children: React.ReactNode;
}

export const Main: React.FC<MainProps> = ({ className = '', children }) => {
  return (
    <main className={`flex-1 overflow-auto bg-gray-50 ${className}`}>
      {children}
    </main>
  );
};
