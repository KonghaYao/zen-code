/**
 * BreadcrumbNav 组件 - 面包屑导航
 */

import React from 'react';

interface BreadcrumbNavProps {
    path: string;
    rootName?: string;
    fullPath?: string; // 完整的服务器路径
    onNavigate: (path: string) => void;
}

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ path, rootName = 'root', fullPath, onNavigate }) => {
    // 将路径拆分为段
    const segments = path.split('/').filter(Boolean);

    // 构建面包屑项目
    const items: { name: string; path: string }[] = [{ name: rootName, path: '/' }];

    let currentPath = '';
    for (const segment of segments) {
        currentPath += '/' + segment;
        items.push({
            name: segment,
            path: currentPath,
        });
    }

    // 计算完整路径显示
    const displayFullPath = fullPath || path;

    return (
        <div className="flex flex-col gap-2">
            {/* 完整路径显示 */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-tertiary)] rounded-lg">
                <svg
                    className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                </svg>
                <span className="text-sm text-[var(--color-text-secondary)] font-mono truncate" title={displayFullPath}>
                    {displayFullPath}
                </span>
            </div>

            {/* 面包屑导航 */}
            <nav className="flex items-center gap-1 px-3 py-2 bg-white/50 rounded-xl border border-[var(--color-border-subtle)] overflow-x-auto">
                {items.map((item, index) => (
                    <React.Fragment key={item.path}>
                        {index > 0 && (
                            <svg
                                className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        )}
                        <button
                            onClick={() => onNavigate(item.path)}
                            className={`
                                px-2 py-1 rounded-lg text-sm font-medium transition-all duration-150
                                flex-shrink-0 whitespace-nowrap
                                ${
                                    index === items.length - 1
                                        ? 'bg-[var(--color-primary)] text-white'
                                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                                }
                            `}
                            title={item.path}
                        >
                            {item.name}
                        </button>
                    </React.Fragment>
                ))}
            </nav>
        </div>
    );
};
