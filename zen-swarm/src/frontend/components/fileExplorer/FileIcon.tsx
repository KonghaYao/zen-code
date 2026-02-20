/**
 * FileIcon 组件 - 根据文件类型显示图标
 */

import React from 'react';

interface FileIconProps {
    icon?: string;
    extension?: string;
    isDirectory?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const DEFAULT_ICONS: Record<string, string> = {
    // 文档
    '.md': '📝',
    '.txt': '📄',
    '.pdf': '📕',
    '.doc': '📘',
    '.docx': '📘',
    // 代码
    '.ts': '🔷',
    '.tsx': '⚛️',
    '.js': '🟨',
    '.jsx': '⚛️',
    '.py': '🐍',
    '.go': '🐹',
    '.rs': '🦀',
    '.java': '☕',
    // 配置
    '.json': '📋',
    '.yaml': '⚙️',
    '.yml': '⚙️',
    '.toml': '⚙️',
    '.env': '🔐',
    // 图片
    '.png': '🖼️',
    '.jpg': '🖼️',
    '.jpeg': '🖼️',
    '.gif': '🎞️',
    '.svg': '🎨',
    '.webp': '🖼️',
    // 媒体
    '.mp3': '🎵',
    '.mp4': '🎬',
    '.wav': '🔊',
    // 压缩
    '.zip': '📦',
    '.tar': '📦',
    '.gz': '📦',
    // 数据库
    '.db': '🗄️',
    '.sqlite': '🗄️',
    '.sql': '🗃️',
};

const SIZE_CLASSES = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
};

export const FileIcon: React.FC<FileIconProps> = ({
    icon,
    extension,
    isDirectory = false,
    size = 'md',
    className = '',
}) => {
    // 如果已有图标，直接显示
    if (icon) {
        return <span className={`${SIZE_CLASSES[size]} ${className}`}>{icon}</span>;
    }

    // 目录图标
    if (isDirectory) {
        return <span className={`${SIZE_CLASSES[size]} ${className}`}>📁</span>;
    }

    // 根据扩展名查找图标
    const ext = extension?.toLowerCase();
    const emoji = DEFAULT_ICONS[ext || ''] || '📄';

    return (
        <span className={`${SIZE_CLASSES[size]} ${className}`} title={ext}>
            {emoji}
        </span>
    );
};
